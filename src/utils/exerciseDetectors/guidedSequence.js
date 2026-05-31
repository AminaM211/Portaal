// Simple guided-sequence detector: steps defined as small detectors in sequence
export default function createGuidedSequenceDetector(config = {}) {
  const sequence = config.sequence || [];
  return {
    init: () => ({ index: 0 }),
    update: (landmarks, state = {}) => {
      // This is a thin wrapper: if provided with `sequence` of detectors, call current
      const idx = state.index || 0;
      const current = sequence[idx];
      if (!current) return null;
      const res = current.update(landmarks, state);
      if (!res) return null;
      const nextState = { ...state, ...(res.newState || {}) };
      if (res.progressDelta && res.progressDelta > 0) {
        // advance to next sub-exercise
        nextState.index = Math.min(sequence.length - 1, idx + 1);
      }
      return { progressDelta: res.progressDelta, feedback: res.feedback, newState: nextState };
    },
  };
}
