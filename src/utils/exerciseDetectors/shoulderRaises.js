export default function createShoulderRaisesDetector(config = {}) {
  const cfg = { upGap: 0.05, downGap: 0.08, ...config };
  return {
    init: () => ({ shoulderRaisePhase: 'down' }),
    update: (landmarks, state = {}) => {
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];

      if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return null;

      const leftArmUp = leftWrist.y < leftShoulder.y - cfg.upGap;
      const rightArmUp = rightWrist.y < rightShoulder.y - cfg.upGap;
      const leftArmDown = leftWrist.y > leftShoulder.y + cfg.downGap;
      const rightArmDown = rightWrist.y > rightShoulder.y + cfg.downGap;

      const armsRaised = leftArmUp && rightArmUp;
      const armsLowered = leftArmDown && rightArmDown;

      const curr = state.shoulderRaisePhase || 'down';
      let newPhase = curr;
      let progressDelta = 0;
      let feedback = null;

      if (armsRaised && curr === 'down') {
        newPhase = 'up';
        feedback = { tone: 'good', title: 'Goed omhoog!', message: 'Je armen zijn op schouderhoogte. Laat ze nu rustig zakken.' };
      } else if (armsLowered && curr === 'up') {
        newPhase = 'down';
        progressDelta = 1;
        feedback = { tone: 'good', title: 'Perfect!', message: 'Goed gedaan. Doe er nog eentje.' };
      } else if (armsRaised) {
        feedback = { tone: 'good', title: 'Mooi hoog', message: 'Hou de beweging rustig en laat je armen daarna zakken.' };
      } else if (leftArmUp !== rightArmUp) {
        feedback = { tone: 'info', title: 'Beide armen gelijk', message: 'Een arm is al hoog genoeg. Breng je andere arm even hoog.' };
      } else if (curr === 'up') {
        feedback = { tone: 'info', title: 'Laat rustig zakken', message: 'Breng beide armen gecontroleerd terug naar beneden.' };
      } else {
        feedback = { tone: 'info', title: 'Til je armen', message: 'Breng je armen langzaam omhoog tot schouderhoogte.' };
      }

      return { progressDelta, feedback, newState: { ...state, shoulderRaisePhase: newPhase } };
    },
  };
}
