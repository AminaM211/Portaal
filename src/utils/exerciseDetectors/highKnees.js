export default function createHighKneesDetector(config = {}) {
  const cfg = { visibility: 0.5, liftGap: 0.08, neutralGap: 0.03, ...config };
  return {
    init: () => ({ highKneePhase: 'neutral' }),
    update: (landmarks, state = {}) => {
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      if (!leftKnee || !rightKnee || !leftHip || !rightHip) return null;

      const leftKneeUp = leftKnee.y < leftHip.y - cfg.liftGap;
      const rightKneeUp = rightKnee.y < rightHip.y - cfg.liftGap;
      const neutralPose = leftKnee.y > leftHip.y - cfg.neutralGap && rightKnee.y > rightHip.y - cfg.neutralGap;

      let currentSide = null;
      if (leftKneeUp && !rightKneeUp) currentSide = 'left';
      if (rightKneeUp && !leftKneeUp) currentSide = 'right';

      const currPhase = state.highKneePhase || 'neutral';
      let newPhase = currPhase;
      let progressDelta = 0;
      let feedback = null;

      if (neutralPose) {
        newPhase = 'neutral';
        feedback = { tone: 'info', title: 'Til nu één knie', message: 'Breng links of rechts één knie duidelijk omhoog.' };
      } else if (currentSide && currPhase === 'neutral') {
        newPhase = currentSide;
        feedback = { tone: 'info', title: 'Goed!', message: 'Hou even vast en laat die knie weer rustig zakken.' };
      } else if (!currentSide && currPhase !== 'neutral') {
        progressDelta = 1;
        newPhase = 'neutral';
        feedback = { tone: 'good', title: 'Mooi zo!', message: 'Nu de andere knie omhoog.' };
      } else {
        feedback = { tone: 'info', title: 'Til je knie op', message: 'Breng één knie omhoog tot ongeveer heuphoogte.' };
      }

      return { progressDelta, feedback, newState: { ...state, highKneePhase: newPhase } };
    },
  };
}
