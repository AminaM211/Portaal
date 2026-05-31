import createJumpingJacksDetector from './jumpingJacks';
import createHighKneesDetector from './highKnees';
import createPlankDetector from './plank';
import createStretchStarsDetector from './stretchStars';
import createShoulderRaisesDetector from './shoulderRaises';
import createGluteBridgesDetector from './gluteBridges';
import createSingleLegStandDetector from './singleLegStand';
import createGuidedSequenceDetector from './guidedSequence';

const registry = {
  'jumping-jacks': (cfg) => createJumpingJacksDetector(cfg),
  'high-knees': (cfg) => createHighKneesDetector(cfg),
  'plank': (cfg) => createPlankDetector(cfg),
  'stretch-stars': (cfg) => createStretchStarsDetector(cfg),
  'shoulder-raises': (cfg) => createShoulderRaisesDetector(cfg),
  'glute-bridges': (cfg) => createGluteBridgesDetector(cfg),
  'single-leg-stand': (cfg) => createSingleLegStandDetector(cfg),
  'guided-sequence': (cfg) => createGuidedSequenceDetector(cfg),
};

export function getDetector(preset, cfg = {}) {
  const factory = registry[preset];
  return factory ? factory(cfg) : null;
}

export default { getDetector };
