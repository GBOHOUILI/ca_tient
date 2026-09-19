"use client";

// External store (useSyncExternalStore) plutôt que useEffect+setState : la
// disponibilité WebGL/mouvement ne se lit jamais pendant le render (impur côté
// SSR), et on reste réactif si l'utilisateur change prefers-reduced-motion.
function getSnapshot(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false; // pas de rendu 3D côté serveur, chargé dynamiquement après le montage client
}

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export const sceneSupport = { getSnapshot, getServerSnapshot, subscribe };
