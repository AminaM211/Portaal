export default function createStretchStarsDetector(config = {}) {
  const cfg = { eyeGap: 0.02, belowGap: 0.03, ...config };
  return {
    init: () => ({ phase: 'below' }),
    update: (landmarks, state = {}) => {
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      const leftEye = landmarks[2];
      const rightEye = landmarks[5];

      if (!leftElbow || !rightElbow || !leftEye || !rightEye) return null;

      const eyeLine = [leftEye, rightEye].filter(Boolean).reduce((highest, eye) => Math.min(highest, eye.y), 1);
      const elbowsAboveEyes = leftElbow.y < eyeLine - cfg.eyeGap && rightElbow.y < eyeLine - cfg.eyeGap;
      const elbowsBelowEyes = leftElbow.y > eyeLine + cfg.belowGap && rightElbow.y > eyeLine + cfg.belowGap;

      const curr = state.stretchStarsPhase || 'below';
      let newPhase = curr;
      let progressDelta = 0;
      let feedback = null;

      if (elbowsBelowEyes) {
        newPhase = 'below';
        feedback = { tone: 'info', title: 'Armen omlaag', message: 'Laat je ellebogen weer zakken tot onder je ogen en breng ze daarna opnieuw omhoog.' };
      } else if (elbowsAboveEyes && curr === 'below') {
        newPhase = 'above';
        progressDelta = 1;
        feedback = { tone: 'good', title: 'Goed zo!', message: 'Je ellebogen zijn boven je ogen. Laat ze nu terug zakken voor de volgende herhaling.' };
      } else if (!elbowsAboveEyes && curr === 'above') {
        feedback = { tone: 'info', title: 'Nog even terug', message: 'Zak eerst omlaag en kom daarna weer boven je ogen.' };
      } else {
        feedback = { tone: 'info', title: 'Til je ellebogen', message: 'Breng je ellebogen omhoog tot boven je ogen.' };
      }

      return { progressDelta, feedback, newState: { ...state, stretchStarsPhase: newPhase } };
    },
  };
}
