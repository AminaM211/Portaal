export default function createGluteBridgesDetector(config = {}) {
  const cfg = { hipUpGap: 0.1, hipDownGap: 0.05, ...config };
  return {
    init: () => ({ phase: 'closed' }),
    update: (landmarks, state = {}) => {
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];

      if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) return null;

      const hipsUp = leftHip.y < leftAnkle.y - cfg.hipUpGap && rightHip.y < rightAnkle.y - cfg.hipUpGap;
      const hipsDown = leftHip.y > leftAnkle.y - cfg.hipDownGap && rightHip.y > rightAnkle.y - cfg.hipDownGap;

      const curr = state.jjPhase || 'closed';
      let newPhase = curr;
      let progressDelta = 0;
      let feedback = null;

      if (hipsUp && curr === 'closed') {
        newPhase = 'open';
        feedback = { tone: 'good', title: 'Heupen hoog!', message: 'Je heupen zijn goed omhoog. Laat ze nu rustig zakken.' };
      } else if (hipsDown && curr === 'open') {
        newPhase = 'closed';
        progressDelta = 1;
        feedback = { tone: 'good', title: 'Supergoed!', message: 'Nog eentje!' };
      } else if (hipsUp) {
        feedback = { tone: 'good', title: 'Goed hoog', message: 'Hou even vast en laat je heupen daarna rustig zakken.' };
      } else if (curr === 'open') {
        feedback = { tone: 'info', title: 'Rustig zakken', message: 'Laat je heupen gecontroleerd terug naar beneden.' };
      } else if (curr === 'closed') {
        feedback = { tone: 'info', title: 'Til je heupen', message: 'Breng je heupen omhoog en span je billen.' };
      }

      return { progressDelta, feedback, newState: { ...state, jjPhase: newPhase } };
    },
  };
}
