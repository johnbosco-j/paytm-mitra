"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { reached, stepIndex, useStory } from "@/lib/story";
import { lassiLabel, plaster, productAtlas, qrStandee, shutter, signboard, wood } from "./textures";

// Store frame (metres): Naren Stores is the team's downloaded café model, cut in front of its counter
// (assets/blender/build_store.py). Street-facing opening at z = 0, floor at y = 0.16, counter x ∈ [-3.03, 3.03],
// z ∈ [-1.38, -0.35], top at y = 1.08; back wall at z = -2.47; building x ∈ [-5, 5], walls 6.55 m, gable apex 9.25 m.
export const SHOP = { w: 10, d: 5, h: 6.55, floor: 0.16, counterTop: 1.08 };
// Anchors used by the camera rig and FX layer.
export const ANCHOR = {
  fridgeSlot: new THREE.Vector3(-2.7, 1.54, -1.8),
  counterTop: new THREE.Vector3(0, 1.08, -0.6),
  qr: new THREE.Vector3(0.75, 1.28, -0.5),
  soundbox: new THREE.Vector3(0.18, 1.15, -0.5),
  customer: new THREE.Vector3(1.6, 0.16, 1.4),
};

/** A shelving unit stocked with packets (instanced, 12 product looks from a procedural atlas). */
function Shelves({ x, w, z = -2.22, seed = 0, sacks = false }: { x: number; w: number; z?: number; seed?: number; sacks?: boolean }) {
  const atlas = useMemo(() => productAtlas(), []);
  const mats = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const t = atlas.clone();
        t.needsUpdate = true;
        t.repeat.set(1 / 4, 1 / 3);
        t.offset.set((i % 4) / 4, 1 - (Math.floor(i / 4) + 1) / 3);
        return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
      }),
    [atlas],
  );
  const boxGeo = useMemo(() => new THREE.BoxGeometry(0.16, 0.22, 0.12), []);
  const groups = useRef<(THREE.InstancedMesh | null)[]>([]);
  const levels = [0.5, 1.0, 1.5, 2.0, 2.5];
  const slots = useMemo(() => {
    const out: { p: [number, number, number]; s: number }[][] = Array.from({ length: 12 }, () => []);
    let k = seed;
    for (const y of levels)
      for (let px = -w / 2 + 0.12; px <= w / 2 - 0.12; px += 0.18) {
        const m = (k * 7 + Math.floor(y * 10)) % 12;
        out[m].push({ p: [px, y + 0.11, (k % 2) * 0.02], s: 0.85 + ((k * 13) % 5) * 0.06 });
        k++;
      }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, seed]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    slots.forEach((list, m) => {
      const im = groups.current[m];
      if (!im) return;
      list.forEach((sl, i) => {
        o.position.set(...sl.p);
        o.scale.set(1, sl.s, 1);
        o.rotation.y = (i % 3 - 1) * 0.04;
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }, [slots]);
  const wd = useMemo(() => wood([2, 1]), []);
  return (
    <group position={[x, SHOP.floor, z]}>
      {levels.map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.04, 0.42]} />
          <meshStandardMaterial map={wd} roughness={0.7} />
        </mesh>
      ))}
      {[-w / 2, w / 2].map((px) => (
        <mesh key={px} position={[px, 1.4, 0]} castShadow>
          <boxGeometry args={[0.05, 2.8, 0.42]} />
          <meshStandardMaterial map={wd} roughness={0.7} />
        </mesh>
      ))}
      {slots.map((list, m) => (
        <instancedMesh key={m} ref={(r) => { groups.current[m] = r; }} args={[boxGeo, mats[m], list.length]} castShadow />
      ))}
      {sacks &&
        [[-0.45, 0.62], [0.05, 0.7], [0.5, 0.6]].map(([sx, sz], i) => (
          <mesh key={i} position={[sx, 0.31, sz]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.6, 12]} />
            <meshStandardMaterial color={["#d8c9a3", "#cdbb8f", "#e0d3b0"][i]} roughness={1} />
          </mesh>
        ))}
    </group>
  );
}

/** Glass-door beverage cooler with one empty row: the mango lassi the shop doesn't keep. */
function Fridge() {
  const lassiMat = useMemo(() => new THREE.MeshStandardMaterial({ map: lassiLabel(), roughness: 0.3 }), []);
  const bottleGeo = useMemo(() => new THREE.CylinderGeometry(0.045, 0.05, 0.22, 12), []);
  const capGeo = useMemo(() => new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), []);
  const lassi = useRef<THREE.Group>(null);
  const slotGlow = useRef<THREE.MeshStandardMaterial>(null);
  const interior = useRef<THREE.PointLight>(null);
  const rows = [0.62, 1.0, 1.38, 1.76];
  const colors = ["#c1121f", "#2a9d8f", "#e9c46a", "#264653", "#6d597a"];
  useFrame((_, dt) => {
    const st = useStory.getState();
    const full = reached(st.step, "prove");
    const missing = st.step >= stepIndex("illa") && !full;
    if (lassi.current) {
      lassi.current.children.forEach((c, i) => {
        const target = full ? 1 : 0.0001;
        const s = THREE.MathUtils.damp(c.scale.y, target, 4 + i * 0.4, dt);
        c.scale.set(s, s, s);
      });
    }
    if (slotGlow.current) {
      const want = missing ? 1.6 + Math.sin(st.stepT * 4) * 0.6 : full ? 0 : 0;
      slotGlow.current.emissiveIntensity = THREE.MathUtils.damp(slotGlow.current.emissiveIntensity, want, 5, dt);
      slotGlow.current.opacity = THREE.MathUtils.damp(slotGlow.current.opacity, missing ? 0.55 : 0, 5, dt);
    }
    if (interior.current) interior.current.intensity = 2.2 + st.tod * 2;
  });
  return (
    <group position={[ANCHOR.fridgeSlot.x, SHOP.floor, ANCHOR.fridgeSlot.z - 0.2]}>
      <mesh castShadow receiveShadow position={[0, 1.05, -0.05]}>
        <boxGeometry args={[0.85, 2.1, 0.75]} />
        <meshStandardMaterial color="#c8102e" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* lit interior */}
      <mesh position={[0, 1.12, 0.12]}>
        <boxGeometry args={[0.72, 1.62, 0.45]} />
        <meshStandardMaterial color="#f5fbff" emissive="#e8f4ff" emissiveIntensity={0.6} side={THREE.BackSide} />
      </mesh>
      <pointLight ref={interior} position={[0, 1.2, 0.25]} color="#e6f2ff" intensity={2.4} distance={2.2} />
      {rows.map((y, r) => (
        <group key={y}>
          <mesh position={[0, y - 0.13, 0.12]}>
            <boxGeometry args={[0.72, 0.015, 0.44]} />
            <meshStandardMaterial color="#cfd8dc" metalness={0.6} roughness={0.3} />
          </mesh>
          {r !== 2 &&
            Array.from({ length: 6 }, (_, i) => (
              <group key={i} position={[-0.28 + i * 0.112, y, 0.2]}>
                <mesh geometry={bottleGeo} castShadow>
                  <meshPhysicalMaterial color={colors[(i + r) % colors.length]} roughness={0.15} transmission={0.2} thickness={0.1} />
                </mesh>
                <mesh geometry={capGeo} position={[0, 0.125, 0]}>
                  <meshStandardMaterial color="#eee" metalness={0.5} roughness={0.3} />
                </mesh>
              </group>
            ))}
        </group>
      ))}
      {/* the empty row (r = 2): red pulse while missing, lassi bottles appear after the trial */}
      <mesh position={[0, 1.38, 0.2]}>
        <boxGeometry args={[0.7, 0.24, 0.4]} />
        <meshStandardMaterial ref={slotGlow} color="#ff3b3b" emissive="#ff2a2a" emissiveIntensity={0} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={lassi} position={[0, 1.38, 0.2]}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} geometry={bottleGeo} material={lassiMat} position={[-0.28 + i * 0.112, 0, 0]} scale={0.0001} castShadow />
        ))}
      </group>
      {/* glass door */}
      <mesh position={[0, 1.12, 0.33]}>
        <planeGeometry args={[0.74, 1.66]} />
        <meshPhysicalMaterial color="#dff3ff" transmission={0.92} roughness={0.04} thickness={0.02} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 2.02, 0.34]}>
        <planeGeometry args={[0.8, 0.14]} />
        <meshStandardMaterial color="#fff" emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Counter() {
  const qr = useMemo(() => qrStandee(), []);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    const st = useStory.getState();
    if (ring.current) {
      const on = st.step === stepIndex("listen") ? 1 : 0;
      ring.current.emissiveIntensity = on * (1.5 + Math.sin(state.clock.elapsedTime * 6) * 1.2);
    }
  });
  return (
    <group position={[0, SHOP.counterTop - 1.05, 0]}>
      {/* glass candy jars at both ends of the counter */}
      {[2.5, 2.78, -2.75].map((x, i) => (
        <group key={x} position={[x, 1.2, x < 0 ? -0.45 : -0.6]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.3, 18]} />
            <meshPhysicalMaterial color="#ffffff" transmission={0.95} roughness={0.03} thickness={0.05} transparent opacity={0.4} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.18, 14]} />
            <meshStandardMaterial color={["#f94144", "#f9c74f", "#90be6d"][i]} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.04, 18]} />
            <meshStandardMaterial color="#e63946" roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* UPI QR standee */}
      <group position={[0.75, 1.05, -0.5]} rotation-y={-0.25}>
        <mesh position={[0, 0.2, 0]} rotation-x={-0.12} castShadow>
          <boxGeometry args={[0.2, 0.3, 0.01]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <mesh position={[0, 0.2, 0.006]} rotation-x={-0.12}>
          <planeGeometry args={[0.19, 0.285]} />
          <meshStandardMaterial map={qr} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.03, -0.04]}>
          <boxGeometry args={[0.14, 0.04, 0.1]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
      </group>
      {/* payment speaker device (generic, unbranded) */}
      <group position={[0.18, 1.05, -0.5]}>
        <mesh castShadow position={[0, 0.07, 0]}>
          <boxGeometry args={[0.16, 0.14, 0.12]} />
          <meshPhysicalMaterial color="#1c2a3a" roughness={0.35} clearcoat={0.5} />
        </mesh>
        <mesh position={[0, 0.08, 0.062]}>
          <circleGeometry args={[0.045, 24]} />
          <meshStandardMaterial color="#0f1720" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.145, 0]}>
          <torusGeometry args={[0.05, 0.006, 8, 24]} />
          <meshStandardMaterial ref={ring} color="#00baf2" emissive="#00baf2" emissiveIntensity={0} />
        </mesh>
      </group>
      {/* phone lying on the counter */}
      <mesh position={[-0.35, 1.052, -0.45]} rotation-y={0.3}>
        <boxGeometry args={[0.08, 0.008, 0.16]} />
        <meshStandardMaterial color="#111" emissive="#2b6cff" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

/** Strips of shampoo / snack sachets hanging across the shop front: the most recognisable kirana detail. */
function Sachets() {
  const geo = useMemo(() => new THREE.PlaneGeometry(0.09, 0.12), []);
  const strips = useMemo(
    () =>
      [-3.1, -2.75, 2.75, 3.1].map((x, k) => ({
        x,
        colors: Array.from({ length: 9 }, (_, i) => ["#e63946", "#457b9d", "#ffb703", "#2a9d8f", "#9b5de5", "#f15bb5"][(i + k) % 6]),
      })),
    [],
  );
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => (c.rotation.z = Math.sin(state.clock.elapsedTime * 1.3 + i) * 0.03));
  });
  return (
    <group ref={g}>
      {strips.map((s) => (
        <group key={s.x} position={[s.x, 3.12, 0.42]}>
          {s.colors.map((c, i) => (
            <mesh key={i} geometry={geo} position={[0, -i * 0.13, 0]}>
              <meshStandardMaterial color={c} roughness={0.35} metalness={0.3} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Awning() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 64;
    const g = c.getContext("2d")!;
    for (let i = 0; i < 22; i++) {
      g.fillStyle = i % 2 ? "#f7f7f2" : "#1f4e8c";
      g.fillRect(i * 24, 0, 24, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh position={[0, 3.42, 0.82]} rotation-x={0.45} castShadow>
      <planeGeometry args={[7.0, 1.2, 1, 1]} />
      <meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Street facade that closes the cut café: plaster gable wall with the shop opening, upper-floor windows,
 * signboard, awning and the rolled-up shutter. */
function Facade() {
  const wall = useMemo(() => {
    const t = plaster("#efe0bf", [1, 1]);
    t.repeat.set(0.3, 0.3);
    return t;
  }, []);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const W = 5.15, O = 3.35, T = 3.3;
    s.moveTo(-W, 0);
    s.lineTo(-O, 0);
    s.lineTo(-O, T);
    s.lineTo(O, T);
    s.lineTo(O, 0);
    s.lineTo(W, 0);
    s.lineTo(W, 6.65);
    s.lineTo(0, 9.5);
    s.lineTo(-W, 6.65);
    s.closePath();
    for (const [x, y] of [[-2.6, 4.75], [2.6, 4.75], [0, 7.05]] as const) {
      const h = new THREE.Path();
      const hw = x === 0 ? 0.55 : 0.75, hh = x === 0 ? 0.55 : 0.65;
      h.moveTo(x - hw, y - hh);
      h.lineTo(x + hw, y - hh);
      h.lineTo(x + hw, y + hh);
      h.lineTo(x - hw, y + hh);
      h.closePath();
      s.holes.push(h);
    }
    return new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
  }, []);
  const sign = useMemo(() => signboard("நரேன் ஸ்டோர்ஸ்", "NAREN STORES"), []);
  const shut = useMemo(() => shutter(), []);
  return (
    <group position={[0, SHOP.floor - 0.16, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      {/* upper-floor windows: warm lit rooms behind dark grilles, with concrete sunshades */}
      {[[-2.6, 4.75, 1.5, 1.3], [2.6, 4.75, 1.5, 1.3], [0, 7.05, 1.1, 1.1]].map(([x, y, w, h], i) => (
        <group key={i} position={[x, y, 0.06]}>
          <mesh>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color="#3a2f28" emissive="#ffb35c" emissiveIntensity={i === 1 ? 0.55 : 0.25} roughness={0.6} />
          </mesh>
          {Array.from({ length: 5 }, (_, k) => (
            <mesh key={k} position={[-w / 2 + (w / 4) * k, 0, 0.03]}>
              <boxGeometry args={[0.03, h, 0.03]} />
              <meshStandardMaterial color="#1d1d1f" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, h / 2 + 0.08, 0.3]} castShadow>
            <boxGeometry args={[w + 0.3, 0.06, 0.55]} />
            <meshStandardMaterial color="#cfc6b4" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* cornice at the eaves */}
      <mesh position={[0, 6.68, 0.32]} castShadow>
        <boxGeometry args={[10.5, 0.16, 0.35]} />
        <meshStandardMaterial color="#d9cba8" roughness={0.9} />
      </mesh>
      {/* signboard over the opening */}
      <mesh position={[0, 3.95, 0.36]} castShadow>
        <boxGeometry args={[6.2, 1.0, 0.08]} />
        <meshStandardMaterial color="#c9a227" />
      </mesh>
      <mesh position={[0, 3.95, 0.405]}>
        <planeGeometry args={[6.1, 0.93]} />
        <meshStandardMaterial map={sign} roughness={0.6} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.18} />
      </mesh>
      {/* rolled-up shutter at the top of the opening */}
      <mesh position={[0, 3.12, 0.15]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.17, 0.17, 6.7, 16]} />
        <meshStandardMaterial map={shut} metalness={0.6} roughness={0.5} />
      </mesh>
      {/* entrance step */}
      <mesh position={[0, 0.08, 0.25]} receiveShadow>
        <boxGeometry args={[6.9, 0.16, 0.5]} />
        <meshStandardMaterial color="#6d6a64" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** The café model itself (walls, counter, coffee machines, billing PC, rebranded boards, ceiling). */
function StoreShell() {
  const { scene } = useGLTF("/models/store.glb", "/draco/");
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={model} />;
}
useGLTF.preload("/models/store.glb", "/draco/");

export function Kirana() {
  const tubeLight = useRef<THREE.PointLight>(null);
  const counterLight = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const tod = useStory.getState().tod;
    if (tubeLight.current) tubeLight.current.intensity = 7 + tod * 10;
    if (counterLight.current) counterLight.current.intensity = 3 + tod * 5;
  });
  return (
    <group>
      <Suspense fallback={null}>
        <StoreShell />
      </Suspense>
      <Facade />
      <Awning />
      <Sachets />
      {/* ceiling light over the counter + a warm fill on the boards */}
      <pointLight ref={tubeLight} position={[0, 3.3, -1.3]} color="#f2f7ff" intensity={8} distance={9} decay={1.4} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} />
      <pointLight ref={counterLight} position={[0, 2.4, -0.2]} color="#ffe6c4" intensity={4} distance={5} decay={1.6} />
      <Shelves x={3.5} w={2.2} seed={3} />
      <Shelves x={-4.05} w={1.2} seed={7} />
      <Shelves x={-3.95} w={0.01} z={-0.75} seed={1} sacks />
      <Fridge />
      <Counter />
    </group>
  );
}
