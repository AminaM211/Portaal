export default function createShoulderRaisesDetector(config = {}) {
  const cfg = { upGap: 0.05, downGap: 0.08, ...config };
  return {
    init: () => ({ phase: 'closed' }),
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

      const curr = state.jjPhase || 'closed';
      let newPhase = curr;
      let progressDelta = 0;
      let feedback = null;

      if (armsRaised && curr === 'closed') {
        newPhase = 'open';
        feedback = { tone: 'info', title: 'Armen omhoog', message: 'Til je armen naar schouderhoogte.' };
      } else if (armsLowered && curr === 'open') {
        newPhase = 'closed';
        progressDelta = 1;
        feedback = { tone: 'good', title: 'Perfect!', message: 'Goed gedaan. Doe er nog eentje.' };
      } else if (curr === 'closed') {
        feedback = { tone: 'info', title: 'Til je armen', message: 'Breng je armen langzaam omhoog tot schouderhoogte.' };
      }

      return { progressDelta, feedback, newState: { ...state, jjPhase: newPhase } };
    },
  };
}
