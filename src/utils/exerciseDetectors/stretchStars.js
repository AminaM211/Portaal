export default function createStretchStarsDetector(config = {}) {
  const cfg = { eyeGap: 0.015, belowGap: 0.03, visibility: 0.35, ...config };

  const isVisible = (landmark) => {
    if (!landmark) return false;
    return typeof landmark.visibility === 'number' ? landmark.visibility >= cfg.visibility : true;
  };

  return {
    init: () => ({ stretchStarsPhase: 'below' }),
    update: (landmarks, state = {}) => {
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftEye = landmarks[2];
      const rightEye = landmarks[5];

      if (!isVisible(leftEye) || !isVisible(rightEye)) {
        return {
          progressDelta: 0,
          feedback: {
            tone: 'info',
            title: 'Kijk naar de camera',
            message: 'Ik moet je gezicht goed kunnen zien om te weten hoe hoog je armen zijn.',
          },
          newState: state,
        };
      }

      const leftArmVisible = isVisible(leftElbow) || isVisible(leftWrist);
      const rightArmVisible = isVisible(rightElbow) || isVisible(rightWrist);

      if (!leftArmVisible || !rightArmVisible) {
        return {
          progressDelta: 0,
          feedback: {
            tone: 'info',
            title: 'Kom iets verder in beeld',
            message: 'Ik moet je armen goed kunnen zien. Zet een stapje achteruit en probeer opnieuw.',
          },
          newState: state,
        };
      }

      const eyeLine = [leftEye, rightEye].filter(Boolean).reduce((highest, eye) => Math.min(highest, eye.y), 1);
      const leftArmHigh =
        (isVisible(leftElbow) && leftElbow.y < eyeLine - cfg.eyeGap) ||
        (isVisible(leftWrist) && leftWrist.y < eyeLine - cfg.eyeGap);
      const rightArmHigh =
        (isVisible(rightElbow) && rightElbow.y < eyeLine - cfg.eyeGap) ||
        (isVisible(rightWrist) && rightWrist.y < eyeLine - cfg.eyeGap);
      const armsAboveEyes = leftArmHigh && rightArmHigh;
      const armsBelowEyes =
        isVisible(leftElbow) &&
        isVisible(rightElbow) &&
        leftElbow.y > eyeLine + cfg.belowGap &&
        rightElbow.y > eyeLine + cfg.belowGap;
      const armsRestingLow =
        isVisible(leftWrist) &&
        isVisible(rightWrist) &&
        isVisible(leftShoulder) &&
        isVisible(rightShoulder) &&
        leftWrist.y > leftShoulder.y &&
        rightWrist.y > rightShoulder.y;

      const curr = state.stretchStarsPhase || 'below';
      let newPhase = curr;
      let progressDelta = 0;
      let feedback = null;

      if (armsAboveEyes && curr === 'below') {
        newPhase = 'above';
        progressDelta = 1;
        feedback = { tone: 'good', title: 'Goed hoog!', message: 'Je armen zijn hoog genoeg. Laat ze nu rustig terug zakken.' };
      } else if (armsAboveEyes) {
        newPhase = 'above';
        feedback = { tone: 'good', title: 'Mooi zo!', message: 'Hou je armen even hoog en laat ze daarna rustig zakken.' };
      } else if (armsBelowEyes || armsRestingLow) {
        newPhase = 'below';
        feedback = { tone: 'info', title: 'Nu omhoog', message: 'Goed, je armen zijn beneden. Breng ze nu allebei boven je ogen.' };
      } else if (leftArmHigh !== rightArmHigh) {
        feedback = { tone: 'info', title: 'Maak ze gelijk', message: 'Een arm is al hoog genoeg. Breng je andere arm even hoog.' };
      } else {
        feedback = { tone: 'info', title: 'Armen hoger', message: 'Breng je ellebogen hoger, tot boven je ogen.' };
      }

      return { progressDelta, feedback, newState: { ...state, stretchStarsPhase: newPhase } };
    },
  };
}
