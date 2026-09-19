"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function particleCount() {
  if (typeof window === "undefined") return 600;
  const small = window.innerWidth < 640;
  const lowPower = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false;
  return small || lowPower ? 350 : 900;
}

// PRNG déterministe (mulberry32) : une distribution de particules stable et
// reproductible plutôt que Math.random(), qui est un appel impur pendant le render.
function createRng(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const smoothedPointer = useRef({ x: 0, y: 0 });

  const { positions, colors } = useMemo(() => {
    const count = particleCount();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const emerald = new THREE.Color("#059669");
    const cyan = new THREE.Color("#22e5c9");
    const rng = createRng(1337);

    for (let i = 0; i < count; i++) {
      const radius = 3.2 + rng() * 1.2;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = emerald.clone().lerp(cyan, rng());
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    // Parallax doux : la scène suit la souris avec un temps de retard, jamais un suivi direct.
    smoothedPointer.current.x += (state.pointer.x - smoothedPointer.current.x) * 0.02;
    smoothedPointer.current.y += (state.pointer.y - smoothedPointer.current.y) * 0.02;

    pointsRef.current.rotation.y += delta * 0.03;
    pointsRef.current.rotation.x = smoothedPointer.current.y * 0.15;
    pointsRef.current.rotation.z = smoothedPointer.current.x * 0.05;
  });

  return (
    <Points ref={pointsRef} positions={positions} colors={colors} stride={3}>
      <PointMaterial transparent vertexColors size={0.045} sizeAttenuation depthWrite={false} opacity={0.85} />
    </Points>
  );
}

export function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.5]}>
        <ParticleField />
      </Canvas>
    </div>
  );
}
