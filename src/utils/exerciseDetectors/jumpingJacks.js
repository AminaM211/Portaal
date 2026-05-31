export default function createJumpingJacksDetector(config = {}) {
  const cfg = {
    visibility: 0.55,
    ankleRatioOpen: 1.8,
    ankleRatioClose: 1.1,
    wristAboveHeadGap: 0.02,
    wristBelowShoulderGap: 0.08,
    ...config,
  };

  return {
    init: () => ({ phase: 'closed' }),

    update: (landmarks, state = {}) => {
      if (!landmarks) return null;

      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];

      if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist || !leftAnkle || !rightAnkle || !landmarks[0]) {
        return { progressDelta: 0, feedback: { tone: 'info', title: 'Kom helemaal in beeld', message: 'Ik moet je armen en voeten goed kunnen zien.' }, newState: state };
      }

      const visibleEnough = [leftAnkle, rightAnkle, leftWrist, rightWrist, leftShoulder, rightShoulder].every(
        (lm) => (lm?.visibility ?? 0) >= cfg.visibility
      );

      if (!visibleEnough) {
        return { progressDelta: 0, feedback: { tone: 'info', title: 'Kom helemaal in beeld', message: 'Ik moet je armen en voeten goed kunnen zien.' }, newState: state };
      }

      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);
      const wristsHigh = leftWrist.y < landmarks[0].y - cfg.wristAboveHeadGap && rightWrist.y < landmarks[0].y - cfg.wristAboveHeadGap;
      const wristsDown = leftWrist.y > leftShoulder.y + cfg.wristBelowShoulderGap && rightWrist.y > rightShoulder.y + cfg.wristBelowShoulderGap;

      const openPose = ankleWidth > shoulderWidth * cfg.ankleRatioOpen && wristsHigh;
      const closePose = ankleWidth < shoulderWidth * cfg.ankleRatioClose && wristsDown;

      const currPhase = state.phase || 'closed';
      let newPhase = currPhase;
      let progressDelta = 0;
      let feedback = null;

      if (openPose && currPhase === 'closed') {
        newPhase = 'open';
        feedback = { tone: 'info', title: 'Armen open', message: 'Spring nu breed open met armen boven je hoofd.' };
      } else if (closePose && currPhase === 'open') {
        newPhase = 'closed';
        progressDelta = 1;
        feedback = { tone: 'good', title: 'Super!', message: 'Goed gedaan. Sluit rustig weer en doe nog eentje.' };
      } else if (currPhase === 'closed') {
        feedback = { tone: 'info', title: 'Probeer het zo', message: 'Spring open met benen en armen tegelijk.' };
      } else {
        feedback = { tone: 'info', title: 'Volg de beweging', message: 'Maak eerst een duidelijke sprong open en kom dan weer dicht.' };
      }

      return { progressDelta, feedback, newState: { ...state, phase: newPhase } };
    },
  };
}
