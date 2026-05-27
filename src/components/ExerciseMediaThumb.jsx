import { isVideoFileUrl } from "../utils/helpers";

function getMediaSrc(value) {
  if (!value || typeof value !== "string") return "";

  const trimmed = value.trim();
  if (trimmed.startsWith("http") || trimmed.startsWith("/")) return trimmed;
  return `/images/${trimmed}`;
}

export default function ExerciseMediaThumb({ src, className = "", alt = "" }) {
  const mediaSrc = getMediaSrc(src);

  return (
    <video
      className={className}
      src={mediaSrc}
      muted
      playsInline
      preload="metadata"
      aria-label={alt}
    />
  );
}
