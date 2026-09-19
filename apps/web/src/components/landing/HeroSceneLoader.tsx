"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { sceneSupport } from "./scene-support";

const HeroScene = dynamic(() => import("./HeroScene").then((mod) => mod.HeroScene), {
  ssr: false,
});

// Charge la scène 3D seulement après le rendu initial (voir skills/frontend.md :
// elle ne doit jamais faire partie du chemin critique du texte/CTA), et seulement
// si WebGL est disponible et que l'utilisateur n'a pas demandé moins de mouvement.
// Sinon, le dégradé CSS statique de Hero.tsx reste visible en fallback.
export function HeroSceneLoader() {
  const canRender = useSyncExternalStore(sceneSupport.subscribe, sceneSupport.getSnapshot, sceneSupport.getServerSnapshot);

  if (!canRender) return null;

  return <HeroScene />;
}
