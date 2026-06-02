export default function createPlankDetector(config = {}) {
  const cfg = {
    bodyAngle: 148,
    maxHipLineDistance: 0.12,
    minHorizontalSpan: 0.22,
    minHorizontalRatio: 1.05,
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

  const distanceToLine = (point, lineStart, lineEnd) => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.hypot(dx, dy);
    if (!length) return 1;
    return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / length;
  };

  return {
    init: () => ({ plankHoldSeconds: 0, plankLastAwardedSecond: 0, lastTimestamp: null }),
    update: (landmarks, state = {}) => {
      const sides = [
        {
          shoulder: landmarks[11],
          elbow: landmarks[13],
          hip: landmarks[23],
          ankle: landmarks[27],
        },
        {
          shoulder: landmarks[12],
          elbow: landmarks[14],
          hip: landmarks[24],
          ankle: landmarks[28],
        },
      ].filter((side) => [side.shoulder, side.elbow, side.hip, side.ankle].every(hasPoint));

      if (!sides.length) {
        return {
          progressDelta: 0,
          feedback: {
            tone: 'info',
            title: 'Kom helemaal in beeld',
            message: 'Ik moet je schouder, elleboog, heup en voet kunnen zien voor de plank.',
          },
          newState: { ...state, plankHoldSeconds: 0, lastTimestamp: Date.now() },
          setProgress: 0,
        };
      }

      const plankSides = sides.map((side) => {
        const horizontalSpan = Math.abs(side.shoulder.x - side.ankle.x);
        const verticalSpan = Math.abs(side.shoulder.y - side.ankle.y);
        const horizontalBody =
          horizontalSpan >= cfg.minHorizontalSpan &&
          horizontalSpan >= verticalSpan * cfg.minHorizontalRatio;
        const bodyAngle = getAngle(side.shoulder, side.hip, side.ankle);
        const hipLineDistance = distanceToLine(side.hip, side.shoulder, side.ankle);
        const elbowUnderShoulder = side.elbow.y >= side.shoulder.y - 0.04;

        return {
          ...side,
          bodyAngle,
          hipLineDistance,
          horizontalBody,
          elbowUnderShoulder,
          score: bodyAngle - hipLineDistance * 250 + (horizontalBody ? 20 : 0) + (elbowUnderShoulder ? 10 : 0),
        };
      });

      const bestSide = plankSides.sort((a, b) => b.score - a.score)[0];

      if (!bestSide.horizontalBody) {
        return {
          progressDelta: 0,
          feedback: {
            tone: 'info',
            title: 'Draai zijwaarts',
            message: 'Voor de plank moet ik je lichaam van schouder tot voet zijwaarts kunnen zien.',
          },
          newState: { ...state, plankHoldSeconds: 0, lastTimestamp: Date.now() },
          setProgress: 0,
        };
      }

      const bodyStraight = bestSide.bodyAngle >= cfg.bodyAngle && bestSide.hipLineDistance <= cfg.maxHipLineDistance;

      if (!bodyStraight) {
        return {
          progressDelta: 0,
          feedback: {
            tone: 'info',
            title: 'Maak je lichaam recht',
            message: 'Hou schouders, heupen en voeten op één rechte lijn.',
          },
          newState: { ...state, plankHoldSeconds: 0, lastTimestamp: Date.now() },
          setProgress: 0,
        };
      }

      if (!bestSide.elbowUnderShoulder) {
        return {
          progressDelta: 0,
          feedback: {
            tone: 'info',
            title: 'Steun op je ellebogen',
            message: 'Plaats je elleboog onder je schouder en hou je lichaam recht.',
          },
          newState: { ...state, plankHoldSeconds: 0, lastTimestamp: Date.now() },
          setProgress: 0,
        };
      }

      const now = Date.now();
      const last = state.lastTimestamp || now;
      const deltaSeconds = Math.min((now - last) / 1000, 0.2);
      const plankHoldSeconds = (state.plankHoldSeconds || 0) + deltaSeconds;
      const target = state.target || 30;
      const progress = Math.min((plankHoldSeconds / target) * 100, 100);

      return {
        progressDelta: 0,
        feedback: {
          tone: 'good',
          title: 'Sterk!',
          message: 'Blijf zo recht en rustig hangen.',
        },
        newState: {
          ...state,
          plankHoldSeconds,
          plankLastAwardedSecond: Math.max(state.plankLastAwardedSecond || 0, Math.floor(plankHoldSeconds)),
          lastTimestamp: now,
        },
        setProgress: progress,
      };
    },
  };
}
