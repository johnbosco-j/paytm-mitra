"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { reached, stepIndex, useStory } from "@/lib/story";
import { lassiLabel, plaster, productAtlas, qrStandee, shutter, signboard, wood } from "./textures";

// Shop frame (metres): facade on z = 0 facing +z; interior x ∈ [-2.5, 2.5], z ∈ [-4.5, 0], ceiling 3.2.
export const SHOP = { w: 5, d: 4.5, h: 3.2 };
// Anchors used by the camera rig and FX layer.
export const ANCHOR = {
  fridgeSlot: new THREE.Vector3(-1.55, 1.38, -2.35),
  counterTop: new THREE.Vector3(0, 1.05, -0.55),
  qr: new THREE.Vector3(0.75, 1.25, -0.5),
  soundbox: new THREE.Vector3(0.18, 1.12, -0.5),
  customer: new THREE.Vector3(1.6, 0.16, 1.4),
};

function Shelves() {
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
  const slots = useMemo(() => {
    const out: { p: [number, number, number]; s: number }[][] = Array.from({ length: 12 }, () => []);
    let k = 0;
    for (const y of [0.52, 1.02, 1.52, 2.02, 2.52])
      for (let x = -1.05; x <= 2.25; x += 0.18) {
        const m = (k * 7 + Math.floor(y * 10)) % 12;
        out[m].push({ p: [x, y + 0.11, -4.25 + (k % 2) * 0.02], s: 0.85 + ((k * 13) % 5) * 0.06 });
        k++;
      }
    return out;
  }, []);
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
  const w = useMemo(() => wood([2, 1]), []);
  return (
    <group>
      {/* back shelving unit */}
      {[0.5, 1.0, 1.5, 2.0, 2.5].map((y) => (
        <mesh key={y} position={[0.6, y, -4.22]} castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.04, 0.42]} />
          <meshStandardMaterial map={w} roughness={0.7} />
        </mesh>
      ))}
      {[-1.2, 2.4].map((x) => (
        <mesh key={x} position={[x, 1.4, -4.22]} castShadow>
          <boxGeometry args={[0.05, 2.8, 0.42]} />
          <meshStandardMaterial map={w} roughness={0.7} />
        </mesh>
      ))}
      {slots.map((list, m) => (
        <instancedMesh key={m} ref={(r) => { groups.current[m] = r; }} args={[boxGeo, mats[m], list.length]} castShadow />
      ))}
      {/* rice / grain sacks on the floor */}
      {[[-0.6, -3.5], [-0.05, -3.6], [0.5, -3.45]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.32, z]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 0.62, 12]} />
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
    <group position={[-1.55, 0, -2.35]}>
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
  const w = useMemo(() => wood([3, 1]), []);
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
    <group>
      {/* counter body + top */}
      <mesh position={[0, 0.5, -0.55]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.0, 0.6]} />
        <meshStandardMaterial map={w} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.02, -0.55]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.05, 0.7]} />
        <meshStandardMaterial color="#3b2a20" roughness={0.35} />
      </mesh>
      {/* glass candy jars */}
      {[-1.4, -1.1, -0.8].map((x, i) => (
        <group key={x} position={[x, 1.2, -0.6]}>
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
      [-2.1, -1.75, 1.75, 2.1].map((x, k) => ({
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
        <group key={s.x} position={[s.x, 2.95, 0.12]}>
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
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? "#f7f7f2" : "#1f4e8c";
      g.fillRect(i * 32, 0, 32, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh position={[0, 3.12, 0.55]} rotation-x={0.45} castShadow>
      <planeGeometry args={[5.2, 1.2, 1, 1]} />
      <meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Kirana() {
  const wall = useMemo(() => plaster("#f1e3c6", [2, 1]), []);
  const upper = useMemo(() => plaster("#9cc5a1", [2, 2]), []);
  const sign = useMemo(() => signboard("முருகன் ஸ்டோர்ஸ்", "MURUGAN STORES"), []);
  const shut = useMemo(() => shutter(), []);
  const tube = useRef<THREE.MeshStandardMaterial>(null);
  const tubeLight = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const tod = useStory.getState().tod;
    if (tube.current) tube.current.emissiveIntensity = 2 + tod * 4;
    if (tubeLight.current) tubeLight.current.intensity = 6 + tod * 10;
  });
  return (
    <group>
      {/* shell */}
      <mesh position={[0, SHOP.h / 2, -SHOP.d]} receiveShadow>
        <planeGeometry args={[SHOP.w, SHOP.h]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * SHOP.w) / 2, SHOP.h / 2, -SHOP.d / 2]} rotation-y={-s * Math.PI / 2} receiveShadow>
          <planeGeometry args={[SHOP.d, SHOP.h]} />
          <meshStandardMaterial map={wall} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.005, -SHOP.d / 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[SHOP.w, SHOP.d]} />
        <meshStandardMaterial color="#8f8478" roughness={0.6} />
      </mesh>
      <mesh position={[0, SHOP.h, -SHOP.d / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[SHOP.w, SHOP.d]} />
        <meshStandardMaterial color="#d8d0c0" roughness={1} />
      </mesh>
      {/* building above the shop: two floors, pillars, sunshade, tank */}
      <mesh position={[0, 3.2 + 3.4, -2.6]} castShadow receiveShadow>
        <boxGeometry args={[5.4, 6.8, 5.6]} />
        <meshStandardMaterial map={upper} roughness={0.95} />
      </mesh>
      {[-2.55, 2.55].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]} castShadow>
          <boxGeometry args={[0.3, 3.2, 0.3]} />
          <meshStandardMaterial map={wall} roughness={0.9} />
        </mesh>
      ))}
      {/* signboard + lights */}
      <mesh position={[0, 3.62, 0.18]} castShadow>
        <boxGeometry args={[4.8, 0.95, 0.08]} />
        <meshStandardMaterial color="#c9a227" />
      </mesh>
      <mesh position={[0, 3.62, 0.225]}>
        <planeGeometry args={[4.7, 0.88]} />
        <meshStandardMaterial map={sign} roughness={0.6} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.18} />
      </mesh>
      {/* rolled-up shutter box and the bottom edge of the shutter */}
      <mesh position={[0, 3.08, 0.05]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, 5, 16]} />
        <meshStandardMaterial map={shut} metalness={0.6} roughness={0.5} />
      </mesh>
      <Awning />
      <Sachets />
      {/* tube light */}
      <mesh position={[0, 3.05, -2.2]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
        <meshStandardMaterial ref={tube} color="#fff" emissive="#f4fbff" emissiveIntensity={3} />
      </mesh>
      <pointLight ref={tubeLight} position={[0, 2.8, -1.8]} color="#f2f7ff" intensity={8} distance={8} decay={1.4} castShadow shadow-mapSize={[512, 512]} />
      <Shelves />
      <Fridge />
      <Counter />
      {/* step at the entrance */}
      <mesh position={[0, 0.08, 0.15]} receiveShadow>
        <boxGeometry args={[5, 0.16, 0.3]} />
        <meshStandardMaterial color="#6d6a64" roughness={0.9} />
      </mesh>
    </group>
  );
}
