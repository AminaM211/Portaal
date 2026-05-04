import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Webcam from "react-webcam";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import "../assets/css/Oefening.css"; 

export default function ExerciseScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Haal data op met fallbacks
  const exerciseData = location.state?.exercise || { 
    title: "Vrije Oefening", 
    duration_minutes: 5,
    xp_reward: 50
  };

  const stats = location.state?.stats || { trophies: 0, totalCompleted: 0, streak: 0 };

  // Flow statussen: 'detail' -> 'active' -> 'success' -> 'streak'
  const [step, setStep] = useState('detail');
  
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isMoving, setIsMoving] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Timer gebaseerd op database duration
  const [timeLeft, setTimeLeft] = useState((exerciseData.duration_minutes || 5) * 60);
  const [isPaused, setIsPaused] = useState(false);

  // Timer logica (gaat na 0 seconden automatisch naar 'success')
  useEffect(() => {
    if (step === 'active' && !isPaused && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timerId);
    } else if (timeLeft === 0 && step === 'active') {
      setStep('success');
    }
  }, [step, isPaused, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Progressie logica (gaat na 100% automatisch naar 'success')
  useEffect(() => {
    if (progress >= 100 && step === 'active') {
      setTimeout(() => setStep('success'), 500);
    }
  }, [progress, step]);

  // MediaPipe AI Logica
  useEffect(() => {
    if (step !== 'active') return;

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

    let camera;
    if (webcamRef.current && webcamRef.current.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video) {
            await pose.send({ image: webcamRef.current.video });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }

    return () => {
      if (camera) camera.stop();
      pose.close();
    };
  }, [step]);

  const onResults = (results) => {
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
  };

  const checkMovement = (landmarks) => {
    // Basis detectie logic
    const leftWrist = landmarks[15];
    const leftShoulder = landmarks[11];
    
    // Check of pols boven schouder is (arm omhoog)
    if (leftWrist && leftShoulder && leftWrist.y < leftShoulder.y) {
      setIsMoving(true);
      setProgress((prev) => Math.min(prev + 0.5, 100)); // Langzaam verhogen
    } else {
      setIsMoving(false);
    }
  };

  // --- UI Gedeeltes ---

  const renderHeader = () => (
    <header className="header">
      <button onClick={() => navigate('/kind/oefeningen')} className="back-button">
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
        <div className="active-container">
          
          <div className="video-container">
            <Webcam ref={webcamRef} className="webcam-view" />
            <canvas ref={canvasRef} width={1280} height={720} className="canvas-overlay" />
            
            {/* Monkey Bubble */}
            {/* <div className="monkey-bubble-container">
              <img src="/images/monkey-happy.png" alt="Monkey" className="monkey-img" />
              <div className="bubble-text">
                {isMoving ? "Geweldig!" : "Beweeg zoals op de tekening!"} <br/> {Math.max(0, Math.ceil((100 - progress) / 10))} meer te gaan
              </div>
            </div> */}
          </div>

          <div className="progress-container">
            <span className="time-text">{formatTime(timeLeft)}</span>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <button className="pause-button" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? "▶️" : "⏸"}
            </button>
          </div>
        </div>      
      )}

      {/* STAP 3: SUCCESS SCHERM */}
      {step === 'success' && (
        <div className="success-container">
          <img src="/images/monkey-cheer.png" alt="Cheer" className="cheer-img" />
          <h2 className="success-title">Fantastisch werk!</h2>
          <div className="xp-earned-container">
            <img src="/images/xp-stat.png" alt="XP" className="xp-icon" /> XP verdiend <span className="xp-highlight">+ {exerciseData.xp_reward || 50} XP</span>
          </div>
          <button onClick={() => setStep('streak')} className="primary-button">
            Doorgaan
          </button>
        </div>
      )}

      {/* STAP 4: STREAK SCHERM */}
      {step === 'streak' && (
        <div className="success-container">
          <h2 className="success-title">Streak van {stats.streak > 0 ? stats.streak : 1} dagen!</h2>
          <img src="/images/monkey-stunned.png" alt="Streak" className="streak-img" />
          <h3 className="streak-score">⚡ {stats.streak > 0 ? stats.streak : 1}</h3>
          
          <div className="days-container">
             {['M', 'D', 'W', 'D', 'V', 'Z', 'Z'].map((day, i) => {
               const isDone = i < 4 && i !== 2;
               return (
                 <div key={i} className="day-item">
                   <div className={`day-circle ${i < 2 || i === 3 ? 'done' : 'pending'}`}>
                     {isDone ? '✓' : ''}
                   </div>
                   <span className={`day-text ${i === 3 ? 'active' : 'inactive'}`}>
                     {day}
                   </span>
                 </div>
               );
             })}
          </div>

          <button onClick={() => navigate('/kind/oefeningen')} className="primary-button">
            Naar dashboard
          </button>
        </div>
      )}

    </div>
  );
}