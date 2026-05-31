export default function createSingleLegStandDetector(config = {}) {
  const cfg = { kneeUpGap: 0.1, kneeDownGap: 0.05, ...config };
  return {
    init: () => ({ phase: 'neutral', holdSeconds: 0, lastTimestamp: null }),
    update: (landmarks, state = {}) => {
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftShoulder = landmarks[11];
      const leftHipPt = landmarks[23];

      if (!leftKnee || !rightKnee || !leftHip || !rightHip || !leftShoulder || !leftHipPt) return null;

      const leftLegUp = leftKnee.y < leftHip.y - cfg.kneeUpGap;
      const rightLegUp = rightKnee.y < rightHip.y - cfg.kneeUpGap;
      const leftLegDown = leftKnee.y > leftHip.y - cfg.kneeDownGap;
      const rightLegDown = rightKnee.y > rightHip.y - cfg.kneeDownGap;

      const oneLegUp = (leftLegUp && leftLegDown) || (rightLegUp && rightLegDown);
      const bothLegsDown = leftLegDown && rightLegDown;
      const shoulderHip = Math.abs(leftShoulder.x - leftHipPt.x) < 0.1;
      const bodyUpright = shoulderHip;

      const curr = state.highKneePhase || 'neutral';
      let newPhase = curr;
      let progressDelta = 0;
      let feedback = null;

      if (oneLegUp && bodyUpright && curr === 'neutral') {
        newPhase = 'holding';
        state.holdSeconds = 0;
        state.lastTimestamp = Date.now();
        feedback = { tone: 'good', title: 'Prima!', message: 'Hou je balans vast!' };
      } else if (bothLegsDown && curr === 'holding') {
        const holdTime = state.holdSeconds || 0;
        if (holdTime >= (state.target || 0) * 0.7) {
          progressDelta = 1;
          feedback = { tone: 'good', title: 'Uitstekend!', message: 'Goed balans gehouden!' };
        } else {
          feedback = { tone: 'info', title: 'Bijna!', message: 'Probeer langer te balanceren.' };
        }
        newPhase = 'neutral';
        state.holdSeconds = 0;
      } else if (oneLegUp && curr === 'holding') {
        const now = Date.now();
        const last = state.lastTimestamp || now;
        const deltaSeconds = Math.min((now - last) / 1000, 0.2);
        state.holdSeconds = (state.holdSeconds || 0) + deltaSeconds;
        state.lastTimestamp = now;
        const timeLeft = Math.max(0, Math.ceil((state.target || 0) - state.holdSeconds));
        feedback = { tone: 'good', title: 'Prima!', message: `Nog ${timeLeft} seconden vasthouden.` };
      } else {
        feedback = { tone: 'info', title: 'Til één been', message: 'Til één been op en hou je balans.' };
      }

      return { progressDelta, feedback, newState: { ...state, highKneePhase: newPhase, holdSeconds: state.holdSeconds, lastTimestamp: state.lastTimestamp } };
    },
  };
}
