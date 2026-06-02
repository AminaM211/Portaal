import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Webcam from "react-webcam";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { supabase } from "../lib/supabase";
import { getExerciseImageSrc, isVideoFileUrl } from "../utils/helpers";
import WeekStreak from "../components/WeekStreak";
import "../assets/css/Oefening.css"; 
import { getDetector } from "../utils/exerciseDetectors";
import { isVisible, getAngle, getPlankSide } from "../utils/exerciseDetectors/utils";

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
  const patientId = location.state?.patientId || null;
  const isUploadedExercise = exerciseData?.uploaded === true || initialExerciseData?.uploaded === true;
  const supportsPoseDetection = !isUploadedExercise;
  const [markedComplete, setMarkedComplete] = useState(false);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const detailMediaSrc = (() => {
    const mediaUrl = exerciseData?.image_url;
    if (!mediaUrl) return "/images/exercise-1.png";
    if (typeof mediaUrl !== "string") return "/images/exercise-1.png";

    const trimmed = mediaUrl.trim();
    if (trimmed.startsWith("http") || trimmed.startsWith("/")) return trimmed;
    return `/images/${trimmed}`;
  })();

  console.log('Exercise loaded with patientExerciseId:', patientExerciseId);

  // Fetch total XP earned from completed exercises
  useEffect(() => {
    if (!patientId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('patient_exercises')
          .select('exercises(xp_reward)')
          .eq('patient_id', patientId)
          .eq('is_completed', true);

        if (error) throw error;

        const totalXP = data?.reduce((sum, item) => sum + (item.exercises?.xp_reward || 0), 0) || 0;
        setTotalXPEarned(totalXP);
      } catch (err) {
        console.error('Failed to fetch total XP:', err);
      }
    })();
  }, [patientId]);

  useEffect(() => {
    let mounted = true;

    if (!patientExerciseId) return undefined;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("patient_exercises")
          .select(`
            id,
            is_completed,
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
              created_by,
              space_needed,
              materials,
              stance,
              uploaded,
              is_public
            )
          `)
          .eq("id", patientExerciseId)
          .single();

        if (error) throw error;

        const loadedExercise = data?.exercise || null;
        if (mounted && loadedExercise) {
          setExerciseData(loadedExercise);
          // If exercise is already completed, prevent re-doing by going to streak screen
          if (data?.is_completed) {
            setStep('streak');
            setMarkedComplete(true);
          }
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
    if (!supportsPoseDetection) return "custom";
    if (/jumping jacks?|sterrensprong|spring open/.test(normalizedExerciseText)) return "jumping-jacks";
    if (/stretch|sterren|naar de sterren|boven je ogen|ellebogen.*ogen/.test(normalizedExerciseText)) return "stretch-stars";
    if (/plank|planken|ellebogen.*voeten|steun op.*ellebogen/.test(normalizedExerciseText)) return "plank";
    if (/armheffingen|arm heffen|arm til|schouders omhoog|shoulder/.test(normalizedExerciseText)) return "shoulder-raises";
    if (/heuplift|heupliften|glute|heupen omhoog|brug|heupbrug/.test(normalizedExerciseText)) return "glute-bridges";
    if (/lunges?|uitvalspas|uitvalspassen|reuzenstap|reuzenstappen|grote stappen/.test(normalizedExerciseText)) return "lunges";
    if (/balans op één been|balans op een been|één been|eenbeen|proprioceptie|standduur|single leg/.test(normalizedExerciseText)) return "single-leg-stand";
    if (/high knees?|knieën afwisselend|knieen afwisselend|afwisselend.*lucht|ter plaatse.*knie/.test(normalizedExerciseText)) return "high-knees";
    if (/arm omhoog|vrije oefening/.test(normalizedExerciseText)) return "guided-sequence";
    return "custom";
  })();

  const isDefaultExercise = supportsPoseDetection && exercisePreset === "guided-sequence";
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
      key: "stretch-stars",
      title: "Stretch naar de sterren",
      instruction:
        "Breng je ellebogen omhoog tot boven je ogen, laat ze terug zakken en herhaal. Elke keer dat je opnieuw boven je ogen komt telt als 1 herhaling.",
      mode: "reps",
      target: 10,
    },
    {
      key: "plank",
      title: "Planken (ellebogen en voeten)",
      instruction:
        "Steun op je ellebogen en tenen, houd je lichaam in een rechte lijn van schouders tot enkels.",
      mode: "hold",
      target: 30,
    },
    {
      key: "shoulder-raises",
      title: "Armheffingen",
      instruction:
        "Til je armen langzaam op tot schouderhoogte en laat ze weer zakken. Houd je bewegingen rustig en gecontroleerd.",
      mode: "reps",
      target: 12,
    },
    {
      key: "glute-bridges",
      title: "Heupliften",
      instruction:
        "Lig op je rug, til je heupen omhoog en laat ze weer zakken. Houd je lichaam recht en je beweging rustig.",
      mode: "reps",
      target: 15,
    },
    {
      key: "single-leg-stand",
      title: "Balans op één been",
      instruction:
        "Til één knie op naar je borst, zet je voet terug neer en wissel daarna van been.",
      mode: "reps",
      target: 10,
    },
    {
      key: "lunges",
      title: "Reuzenstappen",
      instruction:
        "Maak een grote reuzenstap naar voren, zak rustig een beetje door je knie en kom terug recht. Wissel daarna van been.",
      mode: "reps",
      target: 10,
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
            : exercisePreset === "stretch-stars"
            ? "stretch-stars"
            : exercisePreset === "plank"
            ? "plank"
            : exercisePreset === "shoulder-raises"
            ? "shoulder-raises"
            : exercisePreset === "glute-bridges"
            ? "glute-bridges"
            : exercisePreset === "single-leg-stand"
            ? "single-leg-stand"
            : exercisePreset === "lunges"
            ? "lunges"
            : "arm-raise",
          title: exerciseData.title || "Oefening",
          instruction:
            exercisePreset === "jumping-jacks"
              ? "Spring open met benen wijd en breng tegelijk je armen boven je hoofd. Spring daarna terug naar gesloten houding."
              : exercisePreset === "high-knees"
              ? "Loop ter plaatse en hef je knieën om de beurt richting heuphoogte. Wissel links en rechts duidelijk af."
              : exercisePreset === "stretch-stars"
              ? "Breng je ellebogen omhoog tot boven je ogen, laat ze terug zakken en herhaal. Elke keer dat je opnieuw boven je ogen komt telt als 1 herhaling."
              : exercisePreset === "plank"
              ? "Steun op je ellebogen en tenen, houd je lichaam in een rechte lijn van schouders tot enkels."
              : exercisePreset === "shoulder-raises"
              ? "Til je armen langzaam op tot schouderhoogte en laat ze weer zakken. Houd je bewegingen rustig en gecontroleerd."
              : exercisePreset === "glute-bridges"
              ? "Lig op je rug, til je heupen omhoog en laat ze weer zakken. Houd je lichaam recht en je beweging rustig."
              : exercisePreset === "single-leg-stand"
              ? "Til één knie op naar je borst, zet je voet terug neer en wissel daarna van been."
              : exercisePreset === "lunges"
              ? "Maak een grote reuzenstap naar voren, zak rustig een beetje door je knie en kom terug recht. Wissel daarna van been."
              : exerciseData.description ||
                "Hef je linkerarm boven schouderhoogte en laat gecontroleerd zakken.",
          mode: isUploadedExercise ? "hold" : (exercisePreset === "plank" ? "hold" : "reps"),
          target: isUploadedExercise ? 180 : (exercisePreset === "plank" ? 30 : 10),
        },
      ];

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const currentExercise = exercisePlan[currentExerciseIndex];
  const motionRef = useRef({
    plankHoldSeconds: 0,
    plankLastAwardedSecond: 0,
    lastTimestamp: null,
  });
  const detectorRef = useRef(null);
  const workerRef = useRef(null);

  const [liveFeedback, setLiveFeedback] = useState({
    tone: "info",
    title: "Kijk goed naar het scherm",
    message: "Volg de opdracht en probeer je beweging rustig te maken.",
  });
  const feedbackRef = useRef({
    key: "info|Kijk goed naar het scherm|Volg de opdracht en probeer je beweging rustig te maken.",
    tone: "info",
    updatedAt: 0,
  });

  // Flow statussen: 'detail' -> 'active' -> 'success' -> 'streak'
  const [step, setStep] = useState('detail');
  
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const demoVideoRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const trackingActiveRef = useRef(false);
  const trackingReadyRef = useRef(false);
  const [progress, setProgress] = useState(0);

  const configuredDurationSeconds = isUploadedExercise
    ? 180
    : Math.max(1, (exerciseData.duration_minutes || 5) * 60);
  const activeDurationSeconds = configuredDurationSeconds;
  const hasDemoVideo = isVideoFileUrl(exerciseData?.image_url);
  const activeInstruction = currentExercise?.instruction || exerciseData.description || "Volg de oefening rustig.";
  const showPoseDetectionUI = supportsPoseDetection && exercisePreset === "guided-sequence";
  const activeDetectorPreset = isDefaultExercise ? currentExercise?.key : exercisePreset;
  const isSingleLegStand = activeDetectorPreset === "single-leg-stand";
  
  // Timer gebaseerd op database duration
  const [timeLeft, setTimeLeft] = useState(configuredDurationSeconds);

  // Timer logica (gaat na 0 seconden automatisch naar 'success')
  useEffect(() => {
    if (step === 'active' && !isPaused && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timerId);
    }
  }, [step, isPaused, timeLeft]);

  useEffect(() => {
    const demoVideo = demoVideoRef.current;
    if (!demoVideo) return;

    if (isPaused) {
      demoVideo.pause();
      return;
    }

    if (step === "active" && hasDemoVideo) {
      demoVideo.play().catch(() => {});
    }
  }, [isPaused, step, hasDemoVideo]);

  useEffect(() => {
    trackingActiveRef.current = step === "active" && !isPaused;
  }, [step, isPaused]);

  useEffect(() => {
    setTimeLeft(activeDurationSeconds);
  }, [activeDurationSeconds, currentExerciseIndex]);

  useEffect(() => {
    if (step !== "active") return;

    if (isUploadedExercise) {
      if (timeLeft > 0) return;
      setProgress(100);
      setStep('success');
      return;
    }

    if (timeLeft > 0 || progress >= 100) return;
    setFeedback("info", "Tijd op", "Probeer opnieuw en maak de beweging echt duidelijk.");
  }, [step, timeLeft, progress, isUploadedExercise]);

  useEffect(() => {
    if (step !== "active") return;
    setIsPaused(false);
  }, [step, currentExerciseIndex]);

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
          stretchStarsPhase: "below",
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
        console.log('Marking exercise complete:', patientExerciseId);
        const { data, error } = await supabase
          .from('patient_exercises')
          .update({ is_completed: true })
          .eq('id', patientExerciseId)
          .select();

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }

        console.log('Exercise marked complete:', data);
        if (mounted) {
          setMarkedComplete(true);
          // Re-fetch total XP after completing
          if (patientId) {
            const { data: completedExercises, error: fetchError } = await supabase
              .from('patient_exercises')
              .select('exercises(xp_reward)')
              .eq('patient_id', patientId)
              .eq('is_completed', true);

            if (!fetchError && completedExercises) {
              const totalXP = completedExercises.reduce((sum, item) => sum + (item.exercises?.xp_reward || 0), 0) || 0;
              setTotalXPEarned(totalXP);
            }
          }
        }
      } catch (err) {
        console.error('Failed to mark exercise complete:', err);
      }
    })();

    return () => { mounted = false; };
  }, [step, patientExerciseId, markedComplete, patientId]);

  const updateRepProgress = (increment = 1) => {
    const target = currentExercise.target || 1;
    const stepSize = 100 / target;
    setProgress((prev) => Math.min(prev + stepSize * increment, 100));
  };

  const setFeedback = (tone, title, message) => {
    const now = Date.now();
    const key = `${tone}|${title}|${message}`;
    const last = feedbackRef.current;

    if (last.key === key) return;

    if (now - last.updatedAt < 900) {
      return;
    }

    if (tone !== "good" && last.tone === "good" && now - last.updatedAt < 1500) {
      return;
    }

    feedbackRef.current = { key, tone, updatedAt: now };
    setLiveFeedback({ tone, title, message });
  };

  const getExerciseProgressLabel = () => {
    if (!currentExercise) return "";

    if (isUploadedExercise) {
      return formatTime(Math.max(0, timeLeft));
    }

    if (currentExercise.mode === "hold") {
      const target = currentExercise?.target || 1;
      const heldSeconds = Math.floor((target * progress) / 100);
      return `${heldSeconds}/${target}`;
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

  // Reuse detectors utils: `isVisible`, `getAngle`, `getPlankSide`

  const resetProgressTracking = () => {
    motionRef.current.plankHoldSeconds = 0;
    motionRef.current.plankLastAwardedSecond = 0;
  };

  useEffect(() => {
    if (step !== 'active' || !currentExercise) return;

    feedbackRef.current = {
      key: "",
      tone: "info",
      updatedAt: 0,
    };

    setFeedback(
      'info',
      hasDemoVideo ? 'Kijk en doe mee' : 'Klaar?',
      hasDemoVideo
        ? 'Kijk naar het voorbeeld en vergelijk tegelijk met je eigen beweging.'
        : currentExercise.mode === 'hold'
        ? 'Kijk naar jezelf en houd je lichaam rustig recht.'
        : 'Kijk naar jezelf en doe de beweging rustig na.'
    );
  }, [step, currentExerciseIndex, hasDemoVideo, activeInstruction]);

  // Initialize detector for the current preset if available
  useEffect(() => {
    if (!supportsPoseDetection) return;
    const det = getDetector(activeDetectorPreset);
    detectorRef.current = det;
    if (det && det.init) {
      const initState = det.init();
      // ensure detectors know the target for hold-based exercises
      const target = currentExercise?.target || (exerciseData?.duration_minutes ? exerciseData.duration_minutes * 1 : undefined);
      motionRef.current = { ...initState, target };
    }
    // Try to create a worker for off-thread detection when supported
    try {
      // Vite supports module workers via new URL(..., import.meta.url)
      // Fallback to null if Worker cannot be constructed in this environment
      // eslint-disable-next-line no-undef
      const w = new Worker(new URL('../utils/exerciseDetectors/detectorWorker.js', import.meta.url), { type: 'module' });
      w.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === 'result') {
          const res = msg.result;
          if (!res) return;
          const hasProgressDelta = typeof res.progressDelta === 'number' && res.progressDelta > 0;
          if (hasProgressDelta) updateRepProgress(res.progressDelta);
          if (typeof res.setProgress === 'number') setProgress(res.setProgress);
          if (res.feedback) {
            if (hasProgressDelta) {
              feedbackRef.current = { key: "", tone: res.feedback.tone, updatedAt: 0 };
            }
            setFeedback(res.feedback.tone, res.feedback.title, res.feedback.message);
          }
          if (res.newState) motionRef.current = { ...motionRef.current, ...(res.newState || {}) };
        }
        if (msg.type === 'log') {
          // worker-side log message
          console.debug('Detector worker:', msg.message);
        }
      };
      workerRef.current = w;
      // initialize worker detector
      const cfg = {};
      const target = currentExercise?.target || (exerciseData?.duration_minutes ? exerciseData.duration_minutes * 1 : undefined);
      w.postMessage({ type: 'init', preset: activeDetectorPreset, cfg, target });
    } catch (err) {
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) {
        try { workerRef.current.terminate(); } catch (e) {}
        workerRef.current = null;
      }
    };
  }, [activeDetectorPreset, supportsPoseDetection, currentExercise?.target, exerciseData?.duration_minutes]);

  function checkMovement(landmarks) {
    if (!currentExercise) return;

    // If we have a structured detector for this preset, delegate to it
    if (detectorRef.current && typeof detectorRef.current.update === 'function') {
      try {
        // Prefer worker if available — throttle posts to ~10fps
        if (workerRef.current && !['glute-bridges', 'plank', 'lunges'].includes(activeDetectorPreset)) {
          try {
            const now = Date.now();
            const last = workerRef.current._lastSent || 0;
            const minInterval = 100; // ms
            if (now - last >= minInterval) {
              workerRef.current.postMessage({ type: 'landmarks', landmarks });
              workerRef.current._lastSent = now;
            }
            return;
          } catch (err) {
            // fallback to direct call below
          }
        }
        const res = detectorRef.current.update(landmarks, motionRef.current);
        if (res) {
            const hasProgressDelta = typeof res.progressDelta === 'number' && res.progressDelta > 0;
            if (hasProgressDelta) updateRepProgress(res.progressDelta);
            if (typeof res.setProgress === 'number') setProgress(res.setProgress);
            if (res.feedback) {
              if (hasProgressDelta) {
                feedbackRef.current = { key: "", tone: res.feedback.tone, updatedAt: 0 };
              }
              setFeedback(res.feedback.tone, res.feedback.title, res.feedback.message);
            }
            motionRef.current = { ...motionRef.current, ...(res.newState || {}) };
            return;
          }
      } catch (err) {
        console.error('Detector error:', err);
      }
    }
    // No structured detector available — fallback generic behaviour for `custom` exercises.
    const leftShoulder = landmarks[11];
    const leftWrist = landmarks[15];
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

  useEffect(() => {
    if (step !== 'active') return undefined;
    if (!supportsPoseDetection) return undefined;

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

  const renderHeader = () => {
    // Disable back button if exercise is already marked complete (except on streak screen)
    const canGoBack = step !== 'success' || markedComplete;
    
    return (
      <header className="header">
        <button 
          onClick={() => canGoBack && navigate(-1)} 
          className={`back-button ${!canGoBack ? 'disabled' : ''}`}
          disabled={!canGoBack}
        >
              <img src="/images/back-icon.svg" alt="" />
              <span>Terug</span>
        </button>
      <div className="stats-container">
        <div className="stat-item"><img src="/images/wins-stat.png" alt="" className="stat-icon" /> {stats.trophies}</div>
        <div className="stat-item"><img src="/images/xp-stat.png" alt="" className="stat-icon" /> {totalXPEarned}</div>
        <div className="stat-item"><img src="/images/streak-stat.png" alt="" className="stat-icon" /> {stats.streak}</div>
      </div>
    </header>
    );
  }

  return (
    <div className="page-container">
      {step !== 'active' && renderHeader()}

      {/* STAP 1: DETAIL SCHERM */}
      {step === 'detail' && (
        <div className="detail-container">
          <div className="detail-flex">
            <div className="main-column">
              <div className="image-placeholder">
                {isVideoFileUrl(exerciseData?.image_url) ? (
                  <video
                    src={detailMediaSrc}
                    className="exercise-image"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={getExerciseImageSrc(exerciseData?.image_url)}
                    alt={exerciseData.title || "Exercise"}
                    className="exercise-image"
                    onError={(e) => {
                      e.currentTarget.src = "/images/exercise-1.png";
                    }}
                  />
                )}
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
                  <img src="/images/Clock.svg" alt="" />
                    <span>{isUploadedExercise ? "3 min" : `${exerciseData.repetitions || 10}x herhalen`}</span>
                </div>
                  {isUploadedExercise && <span className="tag-highlight tag-highlight--uploaded">Geüpload</span>}
                <span className="tag-highlight">{exerciseData.category || "Mobiliteit"}</span>
              </div>

              <h1 className="exercise-title">{exerciseData.title}</h1>
              <p className="exercise-subtitle">Hoe doe je deze oefening?</p>
              <p className="exercise-description">
                {exerciseData.description || "Geen beschrijving beschikbaar voor deze oefening."}
              </p>
              {showPoseDetectionUI && exercisePreset === "guided-sequence" && (
                <div className="exercise-description">
                  <p>1. Jumping jacks: open en sluit in een vloeiende sprong.</p>
                  <p>2. Knieen afwisselend in de lucht: links en rechts om de beurt.</p>
                  <p>3. Planken: steun op ellebogen en voeten, houd je romp stabiel.</p>
                </div>
              )}
              
              <div className="action-container">
                <button onClick={() => setStep('active')} className="mobile-btn-start primary-button">
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
              <button onClick={() => setStep('active')} className=" primary-button">
                  Start oefening
                </button>
            </div>
          </div>
        </div>
      )}

      {/* STAP 2: ACTIVE SCHERM */}
      {step === 'active' && (
        <div className="active-shell">
          <div className="active-topbar">
              <h1 className="active-shellTitle">{currentExercise?.title}</h1>
              <div className="active-actionRow">
                <button className="pause-button pause-button--wide" onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? "Doorgaan" : "Pauze"}
                </button>
              </div>
          </div>

          <div className="active-card active-card--coach">
            <div className="active-liveColumn">
              <div className="video-container video-container--coach">
                <div className="active-progress-badge">
                  <div className={`progress-ring ${isUploadedExercise ? 'progress-ring--uploaded' : ''}`} style={{ ["--progress"]: `${getCircularProgress()}%` }}>
                    <div className="progress-ring-inner">
                      <strong>{getExerciseProgressLabel()}</strong>
                      <span>{currentExercise?.mode === "hold" ? "tijd" : "herhalingen"}</span>
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
                  <canvas
                    ref={canvasRef}
                    className="canvas-overlay mirror-view"
                    width={1280}
                    height={720}
                  />
                </div>
              </div>
            </div>

            <aside className="active-coachPanel">
              <div className="active-demoCard">
                <span className="active-demoLabel">Voorbeeld</span>
                <div className="active-demoMedia">
                  {hasDemoVideo ? (
                    <video
                      src={detailMediaSrc}
                      ref={demoVideoRef}
                      className="active-demoVideo"
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls={false}
                    />
                  ) : (
                    <img src={getExerciseImageSrc(exerciseData?.image_url)} alt={exerciseData.title || "Oefening"} className="active-demoImage" />
                  )}
                </div>
              </div>

              <div className={`active-liveFeedback active-liveFeedback--${liveFeedback.tone || "info"}`}>
                {/* <span className="active-liveFeedbackLabel">Live feedback</span> */}
                <strong>{liveFeedback.title}</strong>
                <p>{liveFeedback.message}</p>
              </div>
            </aside>
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
