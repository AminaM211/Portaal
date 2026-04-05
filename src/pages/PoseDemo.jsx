import { useEffect, useRef, useState } from "react"
import * as posedetection from "@tensorflow-models/pose-detection"
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgl"

export default function PoseDemo() {
  const videoRef = useRef(null)
  const [status, setStatus] = useState("Camera starten…")
  const [feedback, setFeedback] = useState("Steek je rechterarm omhoog")

  useEffect(() => {
    const init = async () => {
      await tf.setBackend("webgl")
      await tf.ready()
      await startCamera()
      await loadModel()
    }

    init()
  }, [])

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.current.srcObject = stream
  }

  const loadModel = async () => {
    const detector = await posedetection.createDetector(
      posedetection.SupportedModels.MoveNet,
      {
        modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING
      }
    )

    setStatus("Model geladen – oefening actief")
    detectPose(detector)
  }

  const detectPose = async (detector) => {
    if (!videoRef.current) return

    const poses = await detector.estimatePoses(videoRef.current)

    if (poses.length > 0) {
      checkArmUp(poses[0])
    }

    requestAnimationFrame(() => detectPose(detector))
  }

  const checkArmUp = (pose) => {
    const keypoints = pose.keypoints

    const rightWrist = keypoints.find(k => k.name === "right_wrist")
    const rightShoulder = keypoints.find(k => k.name === "right_shoulder")

    if (!rightWrist || !rightShoulder) return

    // confidence check (optioneel maar slim)
    if (rightWrist.score < 0.4 || rightShoulder.score < 0.4) {
      setFeedback("Zorg dat je volledig in beeld bent")
      return
    }

    if (rightWrist.y < rightShoulder.y) {
      setFeedback("✅ Goed zo! Arm is hoog genoeg")
    } else {
      setFeedback("❌ Steek je arm hoger")
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Oefening: Arm omhoog</h2>
      <p><strong>Status:</strong> {status}</p>
      <p style={{ fontSize: 18 }}>{feedback}</p>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        width="400"
        height="300"
        style={{ borderRadius: 12 }}
      />
    </div>
  )
}