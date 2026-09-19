"use client";

// Petit external store (voir useSyncExternalStore) pour lire/écrire la classe
// `dark` sur <html> sans setState-in-effect : la lecture DOM passe par getSnapshot,
// jamais par un effet.
type Listener = () => void;

let listeners: Listener[] = [];

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return true; // apps/web/src/app/layout.tsx applique `dark` par défaut côté serveur
}

function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function setDark(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  document.cookie = `theme=${next ? "dark" : "light"};path=/;max-age=31536000;samesite=lax`;
  listeners.forEach((listener) => listener());
}

export const themeStore = { getSnapshot, getServerSnapshot, subscribe, setDark };
