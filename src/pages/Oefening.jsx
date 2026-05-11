import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Webcam from "react-webcam";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { supabase } from "../lib/supabase";
import WeekStreak from "../components/WeekStreak";
import "../assets/css/Oefening.css"; 

export default function ExerciseScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialExerciseData = location.state?.exercise?.exercises || location.state?.exercise || { 
    title: "Vrije Oefening", 
    duration_minutes: 5,
    xp_reward: 50
  };

  const [exerciseData, setExerciseData] = useState(initialExerciseData);

  const stats = location.state?.stats || { trophies: 0, totalCompleted: 0, streak: 0 };
  const scheduledExercises = location.state?.scheduledExercises || [];
  const patientExerciseId = location.state?.patientExerciseId || null;
  const [markedComplete, setMarkedComplete] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!patientExerciseId) return undefined;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("patient_exercises")
          .select(`
            id,
            exercise:exercises (
              id,
              title,
              description,
              category,
              repetitions,
              duration_minutes,
              xp_reward,
              difficulty,
              image_url,
              space_needed,
              materials,
              stance
            )
          `)
          .eq("id", patientExerciseId)
          .single();

        if (error) throw error;

        const loadedExercise = data?.exercise || null;
        if (mounted && loadedExercise) {
          setExerciseData(loadedExercise);
        }
      } catch (err) {
        console.error("Failed to load exercise details:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [patientExerciseId]);

  const normalizedExerciseText = `${exerciseData.title || ""} ${exerciseData.description || ""}`.toLowerCase();

  const exercisePreset = (() => {
    if (/jumping jacks?|sterrensprong|spring open/.test(normalizedExerciseText)) return "jumping-jacks";
    if (/knie|high knees?|afwisselend.*lucht|ter plaatse.*knie/.test(normalizedExerciseText)) return "high-knees";
    if (/plank|planken|ellebogen.*voeten|steun op.*ellebogen/.test(normalizedExerciseText)) return "plank";
    if (/arm omhoog|vrije oefening/.test(normalizedExerciseText)) return "guided-sequence";
    return "custom";
  })();

  const isDefaultExercise = exercisePreset === "guided-sequence";

  const guidedExercises = [
    {
      key: "jumping-jacks",
      title: "Jumping Jacks",
      instruction:
        "Spring open met benen wijd en breng tegelijk je armen boven je hoofd. Spring daarna terug naar gesloten houding.",
      mode: "reps",
      target: 10,
    },
    {
      key: "high-knees",
      title: "Knieen afwisselend in de lucht",
      instruction:
        "Loop ter plaatse en hef je knieën om de beurt richting heuphoogte. Wissel links en rechts duidelijk af.",
      mode: "reps",
      target: 20,
    },
    {
      key: "plank",
      title: "Planken (ellebogen en voeten)",
      instruction:
        "Steun op je ellebogen en tenen, houd je lichaam in een rechte lijn van schouders tot enkels.",
      mode: "hold",
      target: 30,
    },
  ];

  const exercisePlan = isDefaultExercise
    ? guidedExercises
    : [
        {
          key: exercisePreset === "jumping-jacks"
            ? "jumping-jacks"
            : exercisePreset === "high-knees"
            ? "high-knees"
            : exercisePreset === "plank"
            ? "plank"
            : "arm-raise",
          title: exerciseData.title || "Oefening",
          instruction:
            exercisePreset === "jumping-jacks"
              ? "Spring open met benen wijd en breng tegelijk je armen boven je hoofd. Spring daarna terug naar gesloten houding."
              : exercisePreset === "high-knees"
              ? "Loop ter plaatse en hef je knieën om de beurt richting heuphoogte. Wissel links en rechts duidelijk af."
              : exercisePreset === "plank"
              ? "Steun op je ellebogen en tenen, houd je lichaam in een rechte lijn van schouders tot enkels."
              : exerciseData.description ||
                "Hef je linkerarm boven schouderhoogte en laat gecontroleerd zakken.",
          mode: exercisePreset === "plank" ? "hold" : "reps",
          target: exercisePreset === "plank" ? 30 : exercisePreset === "high-knees" ? 20 : 10,
        },
      ];

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const currentExercise = exercisePlan[currentExerciseIndex];
  const motionRef = useRef({
    jjPhase: "closed",
    highKneePhase: "neutral",
    plankHoldSeconds: 0,
    plankLastAwardedSecond: 0,
    lastTimestamp: null,
  });

  const [liveFeedback, setLiveFeedback] = useState({
    tone: "info",
    title: "Kijk goed naar het scherm",
    message: "Volg de opdracht en probeer je beweging rustig te maken.",
  });

  // Flow statussen: 'detail' -> 'active' -> 'success' -> 'streak'
  const [step, setStep] = useState('detail');
  
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const trackingActiveRef = useRef(false);
  const trackingReadyRef = useRef(false);
  const [progress, setProgress] = useState(0);
  
  // Timer gebaseerd op database duration
  const [timeLeft, setTimeLeft] = useState((exerciseData.duration_minutes || 5) * 60);
  const [isPaused, setIsPaused] = useState(false);

  // Timer logica (gaat na 0 seconden automatisch naar 'success')
  useEffect(() => {
    if (step === 'active' && !isPaused && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timerId);
    }
  }, [step, isPaused, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Progressie logica (gaat na 100% automatisch naar 'success')
  useEffect(() => {
    if (progress < 100 || step !== 'active') return;

    const timeoutId = setTimeout(() => {
      const hasNextExercise = currentExerciseIndex < exercisePlan.length - 1;

      if (hasNextExercise) {
        setCurrentExerciseIndex((prev) => prev + 1);
        setProgress(0);
        motionRef.current = {
          jjPhase: "closed",
          highKneePhase: "neutral",
          plankHoldSeconds: 0,
          plankLastAwardedSecond: 0,
          lastTimestamp: null,
        };
      } else {
        setStep('success');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [progress, step, currentExerciseIndex, exercisePlan.length]);

  // When exercise becomes 'success', mark the patient_exercises record completed
  useEffect(() => {
    if (step !== 'success') return;
    if (!patientExerciseId || markedComplete) return;

    let mounted = true;
    (async () => {
      try {
        await supabase
          .from('patient_exercises')
          .update({ is_completed: true })
          .eq('id', patientExerciseId);

        if (mounted) setMarkedComplete(true);
      } catch (err) {
        console.error('Failed to mark exercise complete:', err);
      }
    })();

    return () => { mounted = false; };
  }, [step, patientExerciseId, markedComplete]);

  const updateRepProgress = (increment = 1) => {
    const target = currentExercise.target || 1;
    const stepSize = 100 / target;
    setProgress((prev) => Math.min(prev + stepSize * increment, 100));
  };

  const setFeedback = (tone, title, message) => {
    setLiveFeedback({ tone, title, message });
  };

  const getExerciseProgressLabel = () => {
    if (!currentExercise) return "";

    if (currentExercise.mode === "hold") {
      return `${Math.max(0, Math.ceil((currentExercise.target || 0) * (1 - progress / 100)))}`; 
    }

    return `${Math.round(((currentExercise?.target || 1) * progress) / 100)}/${currentExercise?.target || 1}`;
  };

  const getCircularProgress = () => {
    if (!currentExercise) return 0;

    if (currentExercise.mode === "hold") {
      return progress;
    }

    return progress;
  };

  const getStepLabel = () => {
    if (!currentExercise) return "Klaar om te starten";

    if (currentExercise.mode === "hold") {
      return "oefening revalidatie";
    }
  };

  const getVisibility = (landmark) => landmark?.visibility ?? 0;

  const isVisible = (landmark, threshold = 0.6) => {
    return !!landmark && getVisibility(landmark) >= threshold;
  };

  const getAngle = (a, b, c) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const abMag = Math.hypot(ab.x, ab.y);
    const cbMag = Math.hypot(cb.x, cb.y);

    if (!abMag || !cbMag) return 0;

    const cosine = Math.min(1, Math.max(-1, dot / (abMag * cbMag)));
    return (Math.acos(cosine) * 180) / Math.PI;
  };

  const getPlankSide = (landmarks) => {
    const leftSide = [landmarks[11], landmarks[23], landmarks[27]].every((lm) => isVisible(lm, 0.55));
    const rightSide = [landmarks[12], landmarks[24], landmarks[28]].every((lm) => isVisible(lm, 0.55));

    if (leftSide && rightSide) {
      const leftScore = (getVisibility(landmarks[11]) + getVisibility(landmarks[23]) + getVisibility(landmarks[27])) / 3;
      const rightScore = (getVisibility(landmarks[12]) + getVisibility(landmarks[24]) + getVisibility(landmarks[28])) / 3;
      return leftScore >= rightScore ? "left" : "right";
    }

    if (leftSide) return "left";
    if (rightSide) return "right";
    return null;
  };

  const resetProgressTracking = () => {
    motionRef.current.plankHoldSeconds = 0;
    motionRef.current.plankLastAwardedSecond = 0;
  };

  useEffect(() => {
    if (step !== 'active' || !currentExercise) return;

    setFeedback(
      'info',
      'Klaar?',
      currentExercise.mode === 'hold'
        ? 'Kijk naar jezelf en houd je lichaam rustig recht.'
        : 'Kijk naar jezelf en doe de beweging rustig na.'
    );
  }, [step, currentExerciseIndex]);

  function checkMovement(landmarks) {
    if (!currentExercise) return;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

    if (currentExercise.key === "jumping-jacks") {
      if (!leftAnkle || !rightAnkle || !leftWrist || !rightWrist) return;

      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);
      const handsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;

      const openPose = ankleWidth > shoulderWidth * 1.5 && handsUp;
      const closePose = ankleWidth < shoulderWidth * 1.15;

      if (openPose && motionRef.current.jjPhase === "closed") {
        motionRef.current.jjPhase = "open";
        setFeedback("info", "Armen open", "Spring nu breed open met armen boven je hoofd.");
      } else if (closePose && motionRef.current.jjPhase === "open") {
        motionRef.current.jjPhase = "closed";
        updateRepProgress(1);
        setFeedback("good", "Super!", "Goed gedaan. Sluit rustig weer en doe nog eentje.");
      } else if (motionRef.current.jjPhase === "closed") {
        setFeedback("info", "Probeer het zo", "Spring open met benen en armen tegelijk.");
      }
      return;
    }

    if (currentExercise.key === "high-knees") {
      if (!leftKnee || !rightKnee) return;

      const leftKneeUp = leftKnee.y < leftHip.y - 0.08;
      const rightKneeUp = rightKnee.y < rightHip.y - 0.08;
      const neutralPose = leftKnee.y > leftHip.y - 0.03 && rightKnee.y > rightHip.y - 0.03;

      let currentSide = null;
      if (leftKneeUp && !rightKneeUp) currentSide = "left";
      if (rightKneeUp && !leftKneeUp) currentSide = "right";

      if (neutralPose) {
        motionRef.current.highKneePhase = "neutral";
        setFeedback("info", "Til nu één knie", "Breng links of rechts één knie duidelijk omhoog.");
        return;
      }

      if (currentSide && motionRef.current.highKneePhase === "neutral") {
        motionRef.current.highKneePhase = currentSide;
        setFeedback(
          "info",
          "Goed!",
          currentSide === "left"
            ? "Hou even vast en laat die knie weer rustig zakken."
            : "Hou even vast en laat die knie weer rustig zakken."
        );
        return;
      }

      if (!currentSide && motionRef.current.highKneePhase !== "neutral") {
        updateRepProgress(1);
        motionRef.current.highKneePhase = "neutral";
        setFeedback("good", "Mooi zo!", "Nu de andere knie omhoog.");
        return;
      }

      setFeedback("info", "Til je knie op", "Breng één knie omhoog tot ongeveer heuphoogte.");
      return;
    }

    if (currentExercise.key === "plank") {
      const plankSide = getPlankSide(landmarks);

      if (!plankSide) {
        setFeedback(
          "info",
          "Iets verder achteruit",
          "Ik moet je schouders, heupen en voeten kunnen zien. Draai ook een beetje zijwaarts voor de plank."
        );
        return;
      }

      const useLeftSide = plankSide === "left";
      const shoulder = useLeftSide ? leftShoulder : rightShoulder;
      const hip = useLeftSide ? leftHip : rightHip;
      const ankle = useLeftSide ? leftAnkle : rightAnkle;
      const elbow = useLeftSide ? leftElbow : rightElbow;

      if (!shoulder || !hip || !ankle || !elbow) {
        setFeedback(
          "info",
          "Kom helemaal in beeld",
          "Ik moet je hele lijf zien: schouders, heupen, ellebogen en voeten."
        );
        return;
      }

      const bodyHeightSpread = Math.max(shoulder.y, hip.y, ankle.y) - Math.min(shoulder.y, hip.y, ankle.y);
      const bodyWidthSpread = Math.abs(shoulder.x - ankle.x);
      const bodyLineAngle = getAngle(shoulder, hip, ankle);
      const bodyFlat = bodyHeightSpread < 0.06 && bodyWidthSpread > 0.18 && bodyLineAngle > 160;
      const elbowBelowShoulder = elbow.y > shoulder.y + 0.03;
      const feetVisibleLow = ankle.y > hip.y - 0.04;
      const elbowSupport = isVisible(elbow, 0.5);

      const now = Date.now();
      const last = motionRef.current.lastTimestamp || now;
      motionRef.current.lastTimestamp = now;

      if (bodyFlat && elbowBelowShoulder && feetVisibleLow && elbowSupport) {
        const deltaSeconds = Math.min((now - last) / 1000, 0.2);
        motionRef.current.plankHoldSeconds += deltaSeconds;
        const wholeSeconds = Math.floor(motionRef.current.plankHoldSeconds);
        const holdProgress = (wholeSeconds / currentExercise.target) * 100;
        setProgress(Math.min(holdProgress, 100));
        if (wholeSeconds > motionRef.current.plankLastAwardedSecond) {
          motionRef.current.plankLastAwardedSecond = wholeSeconds;
        }
        setFeedback("good", "Sterk!", "Blijf stil hangen met een rechte rug en kijk naar de vloer.");
      } else {
        resetProgressTracking();
        setFeedback("info", "Nog even goed zetten", "Steun op je ellebogen en voeten en hou je lichaam als een rechte plank.");
      }
      return;
    }

    // Fallback voor bestaande custom oefening
    if (leftWrist && leftShoulder && leftWrist.y < leftShoulder.y) {
      updateRepProgress(1);
      setFeedback("good", "Goed bezig!", "Houd dezelfde beweging rustig vol.");
    } else {
      setFeedback("info", "Kijk naar de opdracht", "Probeer de beweging na te doen op het scherm.");
    }
  }

  function onResults(results) {
    if (!trackingActiveRef.current) return;
    if (!canvasRef.current || !webcamRef.current) return;
    const canvasCtx = canvasRef.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.poseLandmarks) {
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
      drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
      checkMovement(results.poseLandmarks);
    }
    canvasCtx.restore();
  }

  // MediaPipe AI Logica
  useEffect(() => {
    trackingActiveRef.current = step === 'active';

    if (step !== 'active') return undefined;

    let cancelled = false;

    const startTracking = async () => {
      if (trackingReadyRef.current || poseRef.current || cameraRef.current) return;

      const video = webcamRef.current?.video;
      if (!video) return;

      if (video.readyState < 2) {
        await new Promise((resolve) => {
          const onLoaded = () => {
            video.removeEventListener('loadeddata', onLoaded);
            resolve();
          };
          video.addEventListener('loadeddata', onLoaded, { once: true });
        });
      }

      if (cancelled || !trackingActiveRef.current) return;

      trackingReadyRef.current = true;

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onResults);
      poseRef.current = pose;

      const camera = new Camera(video, {
        onFrame: async () => {
          if (cancelled || !trackingActiveRef.current || !webcamRef.current?.video || !poseRef.current) return;
          await poseRef.current.send({ image: webcamRef.current.video });
        },
        width: 1280,
        height: 720,
      });

      cameraRef.current = camera;
      await camera.start();
    };

    startTracking().catch((error) => {
      console.error('Failed to start pose tracking:', error);
      trackingReadyRef.current = false;
      trackingActiveRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    return () => {
      trackingActiveRef.current = false;
      trackingReadyRef.current = false;

      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }

      const video = webcamRef.current?.video;
      const stream = video?.srcObject;
      if (stream?.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (video) {
        video.srcObject = null;
      }
    };
  }, []);

  // --- UI Gedeeltes ---

  const renderHeader = () => (
    <header className="header">
      <button onClick={() => navigate(-1)} className="back-button">
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
      </button>
      <div className="stats-container">
        <div className="stat-item"><img src="/images/wins-stat.png" alt="" className="stat-icon" /> {stats.trophies}</div>
        <div className="stat-item"><img src="/images/xp-stat.png" alt="" className="stat-icon" /> {stats.totalCompleted}</div>
        <div className="stat-item"><img src="/images/streak-stat.png" alt="" className="stat-icon" /> {stats.streak}</div>
      </div>
    </header>
  );

  return (
    <div className="page-container">
      {renderHeader()}

      {/* STAP 1: DETAIL SCHERM */}
      {step === 'detail' && (
        <div className="detail-container">
          <div className="detail-flex">
            <div className="main-column">
              <div className="image-placeholder">
                 {/* Veilig inladen image from public/images/, met fallback bij error */}
                 <img 
                   src={
                     exerciseData.image_url 
                       ? (exerciseData.image_url.startsWith('/') 
                           ? exerciseData.image_url 
                           : `/images/${exerciseData.image_url}`) 
                       : "/images/exercise-placeholder.jpg"
                   } 
                   alt={exerciseData.title || "Exercise"} 
                   className="exercise-image"
                   onError={(e) => { e.target.src = "/images/exercise-placeholder.jpg"; }}
                 />
              </div>
              
              <div className="tags-container">
                <div className="tags-flex">
                      <img
                      src={
                        exerciseData.difficulty === "Makkelijk"
                          ? "/images/difficulty-easy.svg"
                          : exerciseData.difficulty === "Gemiddeld"
                          ? "/images/difficulty-medium.svg"
                          : exerciseData.difficulty === "Moeilijk"
                          ? "/images/difficulty-hard.svg"
                          : "/images/difficulty-easy.svg"
                      }
                      alt={exerciseData.difficulty || "Makkelijk"}
                    />
                  <span>{exerciseData.difficulty || "Makkelijk"}</span>
                </div>
                <div className="tags-flex">
                  <img src="/images/clock.svg" alt="" />
                  <span>{exerciseData.duration_minutes || 5} min</span>
                </div>
                <div className="tags-flex">
                  <img src="/images/repeat.svg" alt="" />
                  <span>{exerciseData.repetitions || 10}x herhalen</span>
                </div>
                <span className="tag-highlight">{exerciseData.category || "Mobiliteit"}</span>
              </div>

              <h1 className="exercise-title">{exerciseData.title}</h1>
              <p className="exercise-subtitle">Hoe doe je deze oefening?</p>
              <p className="exercise-description">
                {exerciseData.description || "Geen beschrijving beschikbaar voor deze oefening."}
              </p>
              {exercisePreset === "guided-sequence" && (
                <div className="exercise-description">
                  <p>1. Jumping jacks: open en sluit in een vloeiende sprong.</p>
                  <p>2. Knieen afwisselend in de lucht: links en rechts om de beurt.</p>
                  <p>3. Planken: steun op ellebogen en voeten, houd je romp stabiel.</p>
                </div>
              )}
              
              <div className="action-container">
                <button onClick={() => setStep('active')} className="primary-button">
                  Start oefening
                </button>
                <div className="earnings">
                  <img src="/images/star-blue.svg" alt="XP" className="xp-icon" />
                  <span className="xp-text">+ {exerciseData.xp_reward || 50} XP</span>
                </div>
              </div>
            </div>

            <div className="side-column">
              <div className="info-box">
                <div className="info-box-one">
                  <img src="/images/ruimte-icon.svg" alt="" />
                  <span>Ruimte</span> 
                </div>
                <span>{exerciseData.space_needed || "1m²"}</span>
              </div>
              <div className="info-box">
                <div className="info-box-one">
                  <img src="/images/materiaal-icon.svg" alt="" /><span>Materiaal</span>
                </div>
                <span>{exerciseData.materials || "Geen"}</span>
              </div>
              <div className="info-box">
                <div className="info-box-one">
                  <img src="/images/houding-icon.svg" alt="" /><span>Houding</span>                
                </div>
                <span>{exerciseData.stance || "Staand"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAP 2: ACTIVE SCHERM (AI + WEBCAM) */}
      {step === 'active' && (
        <div className="active-shell">
          <div className="active-card">
            <div className="video-container">
              <div className={`feedback-badge feedback-badge--${liveFeedback.tone}`}>
                <span>{liveFeedback.title}</span>
                <p>{liveFeedback.message}</p>
              </div>

              <div className="active-progress-badge">
                <div className="progress-ring" style={{ ["--progress"]: `${getCircularProgress()}%` }}>
                  <div className="progress-ring-inner">
                    <strong>{getExerciseProgressLabel()}</strong>
                    <span>{currentExercise?.mode === "hold" ? "seconden" : "herhalingen"}</span>
                  </div>
                </div>
              </div>

              <div className="mirror-stage">
                <Webcam
                  ref={webcamRef}
                  className="webcam-view mirror-view"
                  videoConstraints={{
                    facingMode: { ideal: "user" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  }}
                />
                <canvas ref={canvasRef} width={1280} height={720} className="canvas-overlay mirror-view" />
              </div>

              <div className="video-hint-strip">
                <span>Kijk naar jezelf</span>
                <span>Houd je hele lichaam in beeld</span>
              </div>
            </div>

            <div className="active-body">
              <div className="active-copy">
                <p className="active-kicker">{getStepLabel()}</p>
                <h1 className="active-title">{currentExercise?.title}</h1>
                <p className="active-description">{currentExercise?.instruction}</p>
                <div className="active-meta-row">
                  <span className="active-meta-chip">{exerciseData.category || "Mobiliteit"}</span>
                  <span className="active-meta-chip">{exerciseData.difficulty || "Makkelijk"}</span>
                  <span className="active-meta-chip">{exerciseData.duration_minutes || 5} min</span>
                </div>
              </div>

                <button className="pause-button pause-button--wide" onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? "Doorgaan" : "Pauze"}
                </button>
            </div>
          </div>
        </div>      
      )}

      {/* STAP 3: SUCCESS SCHERM */}
      {step === 'success' && (
        <div className="success-container">
          <img src="/images/monkey-cheer.png" alt="Cheer" className="cheer-img" />
          <h2 className="success-title">Fantastisch werk!</h2>
          <div className="xp-earned-container">
            <div className="xp-first">
              <img src="/images/xp-stat.png" alt="XP" className="xp-icon" /> 
              XP verdiend 
            </div>
            <span className="xp-highlight">+ {exerciseData.xp_reward || 50} XP</span>
          </div>
          <div className="stickynav">
            <span className="xp-fullwidth-line"></span>
            <button onClick={() => setStep('streak')} className="primary-button">
              Doorgaan
            </button>
          </div>
        </div>
      )}
      
      {/* STAP 4: STREAK SCHERM */}
      {step === 'streak' && (
        <div className="success-container">
          <h2 className="success-title">Streak activated! Keep it up!</h2>
          <img src="/images/monkey-streak.png" alt="Streak" className="streak-img" />
          <div className="streak-score">
            <img src="/images/streak.svg" alt="" />
            <h3>{stats.streak > 0 ? stats.streak : 1}</h3>
          </div>

          {/* <div className="streakWeekWrapper">
            <WeekStreak scheduledExercises={scheduledExercises} />
          </div> */}

          <div className="stickynav">
          <span className="xp-fullwidth-line"></span>
          <button onClick={() => navigate('/kind/oefeningen')} className="primary-button">
            Naar dashboard
          </button>
          </div>
        </div>
      )}

    </div>
  );
}