"use client";

import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useMemo } from "react";
import * as THREE from "three";
import { STEP_IDS, STEP_TOD, useStory, type StepId } from "@/lib/story";

// One camera shot per chapter (scene metres; shop facade at z = 0, street along x).
const SHOTS: Record<StepId, { pos: [number, number, number]; look: [number, number, number]; fov?: number }> = {
  intro: { pos: [7.2, 4.3, 14.8], look: [-0.6, 3.0, 0], fov: 40 },
  arrive: { pos: [5.8, 1.7, 7.8], look: [0.8, 1.5, 0.2], fov: 40 },
  ask: { pos: [3.4, 1.8, 4.3], look: [0.8, 1.5, 0.3], fov: 38 },
  illa: { pos: [0.7, 1.7, 2.1], look: [-1.55, 1.35, -2.3], fov: 36 },
  blind: { pos: [1.35, 1.45, 1.05], look: [0.72, 1.2, -0.5], fov: 32 },
  pile: { pos: [6.8, 3.8, 8.5], look: [0.8, 1.6, 0] },
  listen: { pos: [0.95, 1.55, 0.95], look: [0.1, 1.25, -0.5], fov: 34 },
  evaluate: { pos: [0.35, 2.05, 2.9], look: [-0.15, 1.45, -0.3], fov: 40 },
  approve: { pos: [2.6, 2.4, 4.6], look: [0.6, 1.8, 0] },
  deliver: { pos: [11, 2.8, 10], look: [0.5, 0.9, 4.2] },
  prove: { pos: [-0.2, 1.6, 0.7], look: [-1.5, 1.35, -2.3], fov: 40 },
  cta: { pos: [-9, 5.5, 15], look: [0, 2.6, 0], fov: 44 },
};

export function CameraRig() {
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), look: new THREE.Vector3(0, 2, 0), target: new THREE.Vector3() }), []);
  useFrame((state, dt) => {
    const st = useStory.getState();
    const id = STEP_IDS[st.step] ?? "intro";
    const shot = SHOTS[id];
    const cam = state.camera as THREE.PerspectiveCamera;
    const t = st.stepT + dt;
    const drift = st.reduced ? 0 : Math.sin(t * 0.25) * 0.035;
    const [px, py, pz] = shot.pos;
    const [lx, , lz] = shot.look;
    const c = Math.cos(drift);
    const s = Math.sin(drift);
    tmp.p.set(lx + (px - lx) * c - (pz - lz) * s, py, lz + (px - lx) * s + (pz - lz) * c);
    if (!st.reduced) {
      const far = tmp.p.distanceTo(tmp.target.set(...shot.look));
      tmp.p.x += state.pointer.x * far * 0.02;
      tmp.p.y += state.pointer.y * far * 0.012;
    }
    tmp.target.set(...shot.look);
    if (st.reduced) {
      cam.position.copy(tmp.p);
      tmp.look.copy(tmp.target);
    } else {
      easing.damp3(cam.position, tmp.p, 0.7, dt);
      easing.damp3(tmp.look, tmp.target, 0.7, dt);
    }
    cam.lookAt(tmp.look);
    const fov = shot.fov ?? 42;
    const wide = state.size.width >= 1024 && id !== "cta";
    const film = wide ? (id === "intro" ? -0.42 : -0.3) * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * cam.aspect * cam.getFilmWidth() : 0;
    const nf = THREE.MathUtils.damp(cam.fov, fov, 2.5, dt);
    const nfo = THREE.MathUtils.damp(cam.filmOffset, film, 3, dt);
    if (Math.abs(nf - cam.fov) > 1e-3 || Math.abs(nfo - cam.filmOffset) > 1e-4) {
      cam.fov = nf;
      cam.filmOffset = nfo;
      cam.updateProjectionMatrix();
    }
    const tod = st.reduced ? STEP_TOD[id] : THREE.MathUtils.damp(st.tod, STEP_TOD[id], 1.2, dt);
    st.set({ stepT: t, tod });
  });
  return null;
}
