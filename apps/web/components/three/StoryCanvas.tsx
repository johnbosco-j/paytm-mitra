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
import { overlayRoot } from "./Overlay";

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

/** Sharp textures at grazing angles (street, boards, signs): max anisotropic filtering on every map as models load. */
function Anisotropy() {
  const { gl, scene } = useThree();
  const last = useRef(0);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (t - last.current < 2 || t > 40) return;
    last.current = t;
    const max = gl.capabilities.getMaxAnisotropy();
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m) return;
      for (const tex of [m.map, m.normalMap, m.roughnessMap, m.emissiveMap]) {
        if (tex && tex.anisotropy < max) {
          tex.anisotropy = max;
          tex.needsUpdate = true;
        }
      }
    });
  });
  return null;
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
    gl.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap was removed in three r18x
  }, [gl]);
  return null;
}

/** One fixed, decorative full-viewport canvas behind the story copy. */
export default function StoryCanvas({ onReady }: { onReady?: () => void }) {
  const [q, setQ] = useState(3);
  const tier = q >= 2 ? 2 : q;
  return (
    <div aria-hidden className="fixed inset-0 z-0" ref={(el) => { if (el) overlayRoot.current = el; }}>
      <Canvas
        dpr={q === 3 ? [1, 2] : q === 2 ? 1.25 : 1}
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
          <Anisotropy />
          <Ready onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
