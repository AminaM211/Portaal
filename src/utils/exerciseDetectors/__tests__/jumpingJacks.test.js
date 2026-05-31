import createJumpingJacksDetector from '../jumpingJacks';

describe('jumping-jacks detector', () => {
  test('detects open -> close cycle and awards progress', () => {
    const det = createJumpingJacksDetector({ visibility: 0 });
    let state = det.init();

    // Mock landmarks: minimal set with 0..28 indices
    const landmarks = Array(33).fill(null);
    // landmarks[0] nose y
    landmarks[0] = { x: 0.5, y: 0.1, visibility: 1 };
    // shoulders
    landmarks[11] = { x: 0.4, y: 0.5, visibility: 1 };
    landmarks[12] = { x: 0.6, y: 0.5, visibility: 1 };
    // wrists high (above head)
    landmarks[15] = { x: 0.35, y: 0.02, visibility: 1 };
    landmarks[16] = { x: 0.65, y: 0.02, visibility: 1 };
    // ankles wide
    landmarks[27] = { x: 0.1, y: 0.9, visibility: 1 };
    landmarks[28] = { x: 0.9, y: 0.9, visibility: 1 };

    const resOpen = det.update(landmarks, state);
    expect(resOpen).not.toBeNull();
    expect(resOpen.feedback.title).toMatch(/Armen open|Armen/);
    state = resOpen.newState;

    // Close pose: wrists down near shoulders, ankles narrow
    landmarks[15] = { x: 0.48, y: 0.65, visibility: 1 };
    landmarks[16] = { x: 0.52, y: 0.66, visibility: 1 };
    landmarks[27] = { x: 0.46, y: 0.95, visibility: 1 };
    landmarks[28] = { x: 0.54, y: 0.95, visibility: 1 };

    const resClose = det.update(landmarks, state);
    expect(resClose).not.toBeNull();
    expect(resClose.progressDelta).toBeGreaterThanOrEqual(1);
  });
});
