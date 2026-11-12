"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type BloomEffect } from "postprocessing";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useStory } from "@/lib/story";
import { CameraRig } from "./CameraRig";
import { Kirana } from "./Kirana";
import { Lighting, Sky, Street } from "./Street";
import { StoryFX } from "./StoryFX";

function Effects({ tier }: { tier: number }) {
  const bloom = useRef<BloomEffect>(null);
  useFrame(() => {
    const tod = useStory.getState().tod;
    if (bloom.current) bloom.current.intensity = 0.35 + tod * 0.9;
  });
  if (tier === 0) return null;
  return (
    <EffectComposer multisampling={0}>
      {tier >= 2 ? <N8AO aoRadius={0.6} intensity={2.2} distanceFalloff={0.6} quality="medium" /> : <></>}
      <Bloom ref={bloom} luminanceThreshold={0.92} luminanceSmoothing={0.2} mipmapBlur intensity={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.5} />
      {tier >= 2 ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

function Ready({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0);
  const { gl } = useThree();
  useFrame(() => {
    frames.current++;
    if (frames.current === 8) {
      useStory.getState().set({ ready: true });
      onReady?.();
    }
  });
  useEffect(() => {
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

/** One fixed, decorative full-viewport canvas behind the story copy. */
export default function StoryCanvas({ onReady }: { onReady?: () => void }) {
  const [q, setQ] = useState(3);
  const tier = q >= 2 ? 2 : q;
  return (
    <div aria-hidden className="fixed inset-0 z-0">
      <Canvas
        dpr={q === 3 ? [1, 1.6] : q === 2 ? 1.25 : 1}
        shadows={q > 0}
        gl={{ antialias: false, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
        camera={{ fov: 42, near: 0.05, far: 900, position: [11, 6, 17] }}
      >
        <PerformanceMonitor onDecline={() => setQ((v) => Math.max(0, v - 1))} flipflops={2} />
        <AdaptiveDpr pixelated={false} />
        <color attach="background" args={["#1b1a2e"]} />
        <Suspense fallback={null}>
          <Sky />
          <Lighting />
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={1.6} color="#ffb27a" position={[-8, 3, -2]} scale={[10, 4, 1]} />
            <Lightformer intensity={0.8} color="#9fb6ff" position={[6, 6, 8]} scale={[8, 8, 1]} />
            <Lightformer intensity={0.6} color="#ffffff" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
          </Environment>
          <Street />
          <Kirana />
          <StoryFX />
          <CameraRig />
          <Effects tier={tier} />
          <Ready onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
