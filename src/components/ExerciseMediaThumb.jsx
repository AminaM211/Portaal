import { useState } from "react";
import { getExerciseImageSrc, isVideoFileUrl } from "../utils/helpers";

function getMediaSrc(value) {
  if (!value) return "";

  // If it's an object from storage, try common fields
  if (typeof value === "object") {
    const candidate =
      value.url || value.publicURL || value.public_url || value.path || value.image_url || value.media_url || value.thumbnail_url || (Array.isArray(value) && value[0]) || null;
    if (candidate && typeof candidate === "string") value = candidate;
    else if (candidate && typeof candidate === "object") {
      // nested object
      value = candidate.url || candidate.publicURL || candidate.path || "";
    } else {
      return "";
    }
  }

  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  return `/images/${trimmed.replace(/^\.?\/*/, "")}`;
}

export default function ExerciseMediaThumb({ src, className = "", alt = "" }) {
  const mediaSrc = getMediaSrc(src);
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed || !mediaSrc) {
    return <img className={className} src="/images/exercise-1.png" alt={alt} />;
  }

  if (!isVideoFileUrl(mediaSrc)) {
    return (
      <img
        className={className}
        src={getExerciseImageSrc(mediaSrc)}
        alt={alt}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <video
      className={className}
      src={mediaSrc}
      muted
      playsInline
      preload="metadata"
      aria-label={alt}
      onError={() => setLoadFailed(true)}
    />
  );
}
