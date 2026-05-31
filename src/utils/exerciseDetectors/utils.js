export const getVisibility = (landmark) => (landmark?.visibility ?? 0);

export const isVisible = (landmark, threshold = 0.55) => {
  return !!landmark && getVisibility(landmark) >= threshold;
};

export const getAngle = (a, b, c) => {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const abMag = Math.hypot(ab.x, ab.y);
  const cbMag = Math.hypot(cb.x, cb.y);
  if (!abMag || !cbMag) return 0;
  const cosine = Math.min(1, Math.max(-1, dot / (abMag * cbMag)));
  return (Math.acos(cosine) * 180) / Math.PI;
};

export const getPlankSide = (landmarks, visThreshold = 0.55) => {
  const leftSide = [landmarks[11], landmarks[23], landmarks[27]].every((lm) => isVisible(lm, visThreshold));
  const rightSide = [landmarks[12], landmarks[24], landmarks[28]].every((lm) => isVisible(lm, visThreshold));

  if (leftSide && rightSide) {
    const leftScore = (getVisibility(landmarks[11]) + getVisibility(landmarks[23]) + getVisibility(landmarks[27])) / 3;
    const rightScore = (getVisibility(landmarks[12]) + getVisibility(landmarks[24]) + getVisibility(landmarks[28])) / 3;
    return leftScore >= rightScore ? 'left' : 'right';
  }
  if (leftSide) return 'left';
  if (rightSide) return 'right';
  return null;
};
