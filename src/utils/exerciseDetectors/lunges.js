export default function createLungesDetector(config = {}) {
  const cfg = {
    downKneeAngle: 155,
    upKneeAngle: 160,
    minFootSpread: 0.18,
    minLegVerticalSpan: 0.18,
    confirmFrames: 4,
    minRepGapMs: 900,
    ...config,
  };

  const hasPoint = (landmark) => {
    return landmark && Number.isFinite(landmark.x) && Number.isFinite(landmark.y);
  };

  const getAngle = (a, b, c) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const abMag = Math.hypot(ab.x, ab.y);
    const cbMag = Math.hypot(cb.x, cb.y);
    if (!abMag || !cbMag) return 0;
    const cosine = Math.min(1, Math.max(-1, dot / (abMag * cbMag)));
    return (Math.acos(cosine) * 180) / Math.PI;
  };

  return {
    init: () => ({ lungePhase: 'up', lungeDownFrames: 0, lungeUpFrames: 0, lungeLastRepAt: 0 }),
    update: (landmarks, state = {}) => {
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];

      if (![leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].every(hasPoint)) {
        return {
          progressDelta: 0,
          feedback: {
            tone: 'info',
            title: 'Kom goed in beeld',
            message: 'Ik moet je heupen, knieën en voeten kunnen zien voor reuzenstappen.',
          },
          newState: state,
        };
      }

      const curr = state.lungePhase || 'up';
      const leftKneeAngle = getAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = getAngle(rightHip, rightKnee, rightAnkle);
      const lowestKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
      const bothLegsStraight = leftKneeAngle >= cfg.upKneeAngle && rightKneeAngle >= cfg.upKneeAngle;
      const footSpread = Math.abs(leftAnkle.x - rightAnkle.x);
      const feetStaggered = footSpread >= cfg.minFootSpread;
      const leftLegInFrame = leftAnkle.y > leftHip.y + cfg.minLegVerticalSpan;
      const rightLegInFrame = rightAnkle.y > rightHip.y + cfg.minLegVerticalSpan;
      const legsVerticalEnough = leftLegInFrame && rightLegInFrame;
      const lungeDown = lowestKneeAngle <= cfg.downKneeAngle && feetStaggered && legsVerticalEnough;
      const lungeUp = bothLegsStraight || !feetStaggered;
      const downFrames = lungeDown ? (state.lungeDownFrames || 0) + 1 : 0;
      const upFrames = lungeUp ? (state.lungeUpFrames || 0) + 1 : 0;
      const confirmedDown = downFrames >= cfg.confirmFrames;
      const confirmedUp = upFrames >= cfg.confirmFrames;
      const now = Date.now();
      const canCount = now - (state.lungeLastRepAt || 0) >= cfg.minRepGapMs;

      let newPhase = curr;
      let progressDelta = 0;
      let feedback = null;
      let lastRepAt = state.lungeLastRepAt || 0;

      if (confirmedDown && curr === 'up' && canCount) {
        newPhase = 'down';
        progressDelta = 1;
        lastRepAt = now;
        feedback = { tone: 'good', title: 'Sterke reuzenstap!', message: 'Goed gezakt. Kom rustig terug recht.' };
      } else if (confirmedUp && curr === 'down') {
        newPhase = 'up';
        feedback = { tone: 'info', title: 'Nog eentje', message: 'Maak opnieuw een grote stap en zak rustig door je knie.' };
      } else if (!legsVerticalEnough) {
        feedback = { tone: 'info', title: 'Kom iets verder in beeld', message: 'Ik moet je voeten en benen goed kunnen zien.' };
      } else if (!feetStaggered) {
        feedback = { tone: 'info', title: 'Draai zijwaarts', message: 'Sta zijwaarts en zet één voet duidelijk voor de andere.' };
      } else if (curr === 'down') {
        feedback = { tone: 'good', title: 'Goed laag', message: 'Hou controle en kom rustig terug recht.' };
      } else {
        feedback = { tone: 'info', title: 'Zak rustig', message: 'Maak je reuzenstap groot en hou je romp mooi recht.' };
      }

      return {
        progressDelta,
        feedback,
        newState: {
          ...state,
          lungePhase: newPhase,
          lungeDownFrames: newPhase === 'down' ? 0 : downFrames,
          lungeUpFrames: newPhase === 'up' ? 0 : upFrames,
          lungeLastRepAt: lastRepAt,
        },
      };
    },
  };
}
