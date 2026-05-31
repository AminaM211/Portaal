import { getPlankSide, isVisible } from './utils';

export default function createPlankDetector(config = {}) {
  const cfg = { visThreshold: 0.55, bodyFlatAngle: 140, bodyWidthSpread: 0.14, ...config };
  return {
    init: () => ({ plankHoldSeconds: 0, plankLastAwardedSecond: 0, lastTimestamp: null }),
    update: (landmarks, state = {}) => {
      const plankSide = getPlankSide(landmarks, cfg.visThreshold);
      if (!plankSide) {
        return { progressDelta: 0, feedback: { tone: 'info', title: 'Iets verder achteruit', message: 'Ik moet je schouders, heupen en voeten kunnen zien. Draai ook een beetje zijwaarts voor de plank.' }, newState: state };
      }

      const useLeftSide = plankSide === 'left';
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];

      const shoulder = useLeftSide ? leftShoulder : rightShoulder;
      const hip = useLeftSide ? leftHip : rightHip;
      const ankle = useLeftSide ? leftAnkle : rightAnkle;
      const elbow = useLeftSide ? leftElbow : rightElbow;

      if (!shoulder || !hip || !ankle || !elbow) {
        return { progressDelta: 0, feedback: { tone: 'info', title: 'Kom helemaal in beeld', message: 'Ik moet je hele lijf zien: schouders, heupen, ellebogen en voeten.' }, newState: state };
      }

      const bodyHeightSpread = Math.max(shoulder.y, hip.y, ankle.y) - Math.min(shoulder.y, hip.y, ankle.y);
      const bodyWidthSpread = Math.abs(shoulder.x - ankle.x);
      const bodyLineAngle = (function getAngle(a, b, c) {
        const ab = { x: a.x - b.x, y: a.y - b.y };
        const cb = { x: c.x - b.x, y: c.y - b.y };
        const dot = ab.x * cb.x + ab.y * cb.y;
        const abMag = Math.hypot(ab.x, ab.y);
        const cbMag = Math.hypot(cb.x, cb.y);
        if (!abMag || !cbMag) return 0;
        const cosine = Math.min(1, Math.max(-1, dot / (abMag * cbMag)));
        return (Math.acos(cosine) * 180) / Math.PI;
      })(shoulder, hip, ankle);

      const bodyFlat = bodyHeightSpread < 0.1 && bodyWidthSpread > cfg.bodyWidthSpread && bodyLineAngle > cfg.bodyFlatAngle;
      const elbowBelowShoulder = elbow.y > shoulder.y;
      const feetVisibleLow = ankle.y > hip.y - 0.1;
      const elbowSupport = isVisible(elbow, 0.35);

      const now = Date.now();
      const last = state.lastTimestamp || now;

      if (bodyFlat && elbowBelowShoulder && feetVisibleLow && elbowSupport) {
        const deltaSeconds = Math.min((now - last) / 1000, 0.2);
        state.plankHoldSeconds = (state.plankHoldSeconds || 0) + deltaSeconds;
        const wholeSeconds = Math.floor(state.plankHoldSeconds);
        const holdProgress = (wholeSeconds / (state.target || 30)) * 100;
        const progress = Math.min(holdProgress, 100);
        state.plankLastAwardedSecond = wholeSeconds > (state.plankLastAwardedSecond || 0) ? wholeSeconds : (state.plankLastAwardedSecond || 0);
        state.lastTimestamp = now;
        return { progressDelta: 0, feedback: { tone: 'good', title: 'Sterk!', message: 'Blijf stil hangen met een rechte rug en kijk naar de vloer.' }, newState: state, setProgress: progress };
      } else {
        state.plankHoldSeconds = 0;
        state.lastTimestamp = now;
        return { progressDelta: 0, feedback: { tone: 'info', title: 'Nog even goed zetten', message: 'Steun op je ellebogen en voeten en hou je lichaam als een rechte plank.' }, newState: state };
      }
    },
  };
}
