import { getDetector } from './index.js';

let detector = null;
let state = {};

self.onmessage = (e) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'init') {
    const preset = msg.preset;
    const cfg = msg.cfg || {};
    detector = getDetector(preset, cfg);
    state = detector && detector.init ? detector.init() : {};
    if (msg.target) state.target = msg.target;
    // log init for debugging
    try { postMessage({ type: 'log', message: `worker init preset=${preset}` }); } catch (e) {}
    return;
  }

  if (msg.type === 'landmarks') {
    if (!detector || !detector.update) {
      postMessage({ error: 'no-detector' });
      return;
    }

    try {
      // run update and capture result
      const res = detector.update(msg.landmarks, state || {});
      if (res && res.newState) {
        state = { ...state, ...res.newState };
      }
      // send result back
      postMessage({ type: 'result', result: res || null });
    } catch (err) {
      postMessage({ type: 'error', error: String(err) });
    }
  }
};
