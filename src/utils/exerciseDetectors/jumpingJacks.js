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
      const legsOpen = ankleWidth > shoulderWidth * cfg.ankleRatioOpen;
      const legsClosed = ankleWidth < shoulderWidth * cfg.ankleRatioClose;

      const openPose = legsOpen && wristsHigh;
      const closePose = legsClosed && wristsDown;

      const currPhase = state.phase || 'closed';
      let newPhase = currPhase;
      let progressDelta = 0;
      let feedback = null;

      if (openPose && currPhase === 'closed') {
        newPhase = 'open';
        feedback = { tone: 'good', title: 'Goed open!', message: 'Je armen en benen zijn open. Spring nu terug dicht.' };
      } else if (closePose && currPhase === 'open') {
        newPhase = 'closed';
        progressDelta = 1;
        feedback = { tone: 'good', title: 'Super!', message: 'Goed gedaan. Sluit rustig weer en doe nog eentje.' };
      } else if (currPhase === 'closed' && legsOpen && !wristsHigh) {
        feedback = { tone: 'info', title: 'Armen hoger', message: 'Je benen zijn open. Breng ook je armen boven je hoofd.' };
      } else if (currPhase === 'closed' && wristsHigh && !legsOpen) {
        feedback = { tone: 'info', title: 'Benen wijder', message: 'Je armen zijn hoog. Spring met je voeten wat verder open.' };
      } else if (currPhase === 'closed') {
        feedback = { tone: 'info', title: 'Spring open', message: 'Spring met je voeten wijd en breng je armen boven je hoofd.' };
      } else if (!legsClosed && wristsDown) {
        feedback = { tone: 'info', title: 'Voeten dicht', message: 'Je armen zijn al beneden. Breng ook je voeten terug bij elkaar.' };
      } else if (legsClosed && !wristsDown) {
        feedback = { tone: 'info', title: 'Armen omlaag', message: 'Je voeten zijn al dicht. Laat ook je armen rustig zakken.' };
      } else {
        feedback = { tone: 'info', title: 'Spring terug dicht', message: 'Breng je armen omlaag en je voeten terug bij elkaar.' };
      }

      return { progressDelta, feedback, newState: { ...state, phase: newPhase } };
    },
  };
}
