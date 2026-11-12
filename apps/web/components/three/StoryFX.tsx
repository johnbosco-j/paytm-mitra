"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { reached, stepIndex, useStory, type StepId } from "@/lib/story";
import { ANCHOR } from "./Kirana";
import { AutoRickshaw } from "./Street";

const useStep = (id: StepId) => {
  const s = useStory((x) => x.step);
  return s === stepIndex(id);
};

/** A grounded, adult human figure built from lathe/capsule forms (no cartoon features). */
function Person({ position, rotation = 0, shirt, lower, skin = "#7a4b32", scale = 1, sari = false }: {
  position: [number, number, number]; rotation?: number; shirt: string; lower: string; skin?: string; scale?: number; sari?: boolean;
}) {
  const torso = useMemo(() => {
    const pts = [[0.0, 0], [0.17, 0.02], [0.19, 0.25], [0.21, 0.5], [0.2, 0.58], [0.08, 0.66], [0, 0.66]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 20);
  }, []);
  const skirt = useMemo(() => {
    const pts = [[0.0, 0], [0.26, 0], [0.22, 0.4], [0.18, 0.86], [0, 0.86]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 20);
  }, []);
  return (
    <group position={position} rotation-y={rotation} scale={scale}>
      {sari ? (
        <mesh geometry={skirt} castShadow>
          <meshStandardMaterial color={lower} roughness={0.85} />
        </mesh>
      ) : (
        [-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.43, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.72, 4, 10]} />
            <meshStandardMaterial color={lower} roughness={0.85} />
          </mesh>
        ))
      )}
      <mesh geometry={torso} position={[0, 0.86, 0]} castShadow>
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      {sari && (
        <mesh position={[0.05, 1.2, 0.02]} rotation-z={-0.6} castShadow>
          <boxGeometry args={[0.1, 0.62, 0.3]} />
          <meshStandardMaterial color={lower} roughness={0.8} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, 1.17, 0]} rotation-z={s * 0.12} castShadow>
          <capsuleGeometry args={[0.05, 0.5, 4, 8]} />
          <meshStandardMaterial color={s > 0 ? skin : shirt} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.58, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.1, 10]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.72, 0]} scale={[0.92, 1.12, 0.98]} castShadow>
        <sphereGeometry args={[0.105, 20, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.79, -0.015]} scale={[1, 0.72, 1.05]}>
        <sphereGeometry args={[0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        <meshStandardMaterial color="#120c0a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Bubble({ children, tone = "light", visible }: { children: React.ReactNode; tone?: "light" | "red" | "blue" | "green"; visible: boolean }) {
  const cls = {
    light: "bg-white text-[#0b1f3a]",
    red: "bg-[#fff1f1] text-[#b4161b] border border-[#ffb3b3]",
    blue: "bg-[#002e6e] text-white",
    green: "bg-[#e7f9ef] text-[#0a6b3c] border border-[#9be3bd]",
  }[tone];
  return (
    <div
      className={`pointer-events-none whitespace-nowrap rounded-2xl px-4 py-2 text-[15px] font-semibold shadow-2xl transition-all duration-500 ${cls}`}
      style={{ opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : 12}px) scale(${visible ? 1 : 0.92})` }}
    >
      {children}
    </div>
  );
}

export function People() {
  const step = useStory((s) => s.step);
  return (
    <group>
      {/* customer on the footpath */}
      <Person position={[ANCHOR.customer.x, ANCHOR.customer.y, ANCHOR.customer.z]} rotation={Math.PI + 0.5} shirt="#2f6f73" lower="#7b2d43" skin="#8a5a3c" sari />
      {/* Murugan behind the counter */}
      <Person position={[-0.2, 0, -1.25]} shirt="#f4f1ea" lower="#f4f1ea" skin="#6e432c" />
      {/* passers-by */}
      <Person position={[-6.5, 0.16, 1.1]} rotation={1.4} shirt="#3a3a6a" lower="#2b2b2b" />
      <Person position={[8.2, 0.16, 12.2]} rotation={-1.2} shirt="#a23b2a" lower="#30343f" scale={0.98} />
      <Html position={[ANCHOR.customer.x, 2.2, ANCHOR.customer.z]} center zIndexRange={[20, 0]}>
        <Bubble visible={step === stepIndex("ask")}>“Anna, mango lassi irukka?”</Bubble>
      </Html>
      <Html position={[-0.2, 2.15, -1.25]} center zIndexRange={[20, 0]}>
        <Bubble tone="red" visible={step === stepIndex("illa")}>“Illa…” 😔</Bubble>
      </Html>
    </group>
  );
}

/** Missed asks accumulate over the week: glowing chat orbs fly in from the street and stack by the counter. */
function AskPile() {
  const N = 24;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const starts = useMemo(() => Array.from({ length: N }, (_, i) => new THREE.Vector3(-14 + ((i * 37) % 28), 1.2 + (i % 4) * 0.4, 3 + ((i * 17) % 9))), []);
  const ends = useMemo(() => Array.from({ length: N }, (_, i) => new THREE.Vector3(1.95 + (i % 3) * 0.17, 1.15 + Math.floor(i / 3) * 0.17, -0.45 + ((i % 2) - 0.5) * 0.05)), []);
  const t = useRef(0);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const st = useStory.getState();
    const on = st.step >= stepIndex("pile") && st.step <= stepIndex("listen");
    t.current = THREE.MathUtils.clamp(t.current + (on ? dt * 0.55 : -dt * 1.2), 0, 1.6);
    if (!mesh.current) return;
    for (let i = 0; i < N; i++) {
      const k = THREE.MathUtils.clamp((t.current - i * 0.025) * 1.6, 0, 1);
      const e = k * k * (3 - 2 * k);
      o.position.lerpVectors(starts[i], ends[i], e);
      o.position.y += Math.sin(e * Math.PI) * 1.6;
      o.scale.setScalar(k > 0 ? 0.07 : 0.0001);
      o.updateMatrix();
      mesh.current.setMatrixAt(i, o.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  const show = useStep("pile");
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, N]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#ffb703" emissive="#ffb703" emissiveIntensity={2.2} />
      </instancedMesh>
      <Html position={[2.1, 2.7, -0.45]} center zIndexRange={[20, 0]}>
        <Bubble tone="blue" visible={show}>24 asks · 7 days · ₹0 recorded</Bubble>
      </Html>
    </group>
  );
}

function ListenRings() {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    const on = useStory.getState().step === stepIndex("listen");
    g.current?.children.forEach((c, i) => {
      const m = c as THREE.Mesh;
      const p = ((state.clock.elapsedTime * 0.7 + i / 3) % 1);
      m.scale.setScalar(0.1 + p * 1.2);
      (m.material as THREE.MeshBasicMaterial).opacity = on ? (1 - p) * 0.7 : 0;
    });
  });
  return (
    <group ref={g} position={[ANCHOR.soundbox.x, ANCHOR.soundbox.y + 0.1, ANCHOR.soundbox.z]} rotation-x={-Math.PI / 2}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color="#00baf2" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

const BARS = [
  { sold: 8, gp: 104, label: "8 sold" },
  { sold: 12, gp: 156, label: "12 sold" },
  { sold: 16, gp: 208, label: "16 sold" },
];

function HoloBars() {
  const g = useRef<THREE.Group>(null);
  const show = useStep("evaluate");
  useFrame((_, dt) => {
    const on = useStory.getState().step === stepIndex("evaluate");
    g.current?.children.forEach((c, i) => {
      const target = on ? BARS[i].gp / 208 : 0.0001;
      c.scale.y = THREE.MathUtils.damp(c.scale.y, target, 4 - i * 0.6, dt);
    });
  });
  return (
    <group position={[-0.25, 1.05, -0.35]}>
      <group ref={g}>
        {BARS.map((b, i) => (
          <mesh key={i} position={[i * 0.22 - 0.22, 0.25, 0]} scale={[1, 0.0001, 1]}>
            <boxGeometry args={[0.13, 0.5, 0.13]} />
            <meshStandardMaterial color="#00baf2" emissive="#00baf2" emissiveIntensity={1.4} transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
      {BARS.map((b, i) => (
        <Html key={i} position={[i * 0.22 - 0.22, 0.5 * (b.gp / 208) + 0.08, 0]} center zIndexRange={[20, 0]}>
          <Bubble tone="blue" visible={show}>
            ₹{b.gp} <span className="font-normal opacity-80">if {b.label}</span>
          </Bubble>
        </Html>
      ))}
      <Html position={[0, -0.08, 0.3]} center zIndexRange={[20, 0]}>
        <Bubble visible={show}>Try 16, not 24 · outlay ₹352</Bubble>
      </Html>
    </group>
  );
}

function ApproveMessage() {
  const m = useRef<THREE.Group>(null);
  const show = useStep("approve");
  const t = useRef(0);
  useFrame((_, dt) => {
    const on = useStory.getState().step === stepIndex("approve");
    t.current = on ? Math.min(t.current + dt * 0.45, 1) : 0;
    if (!m.current) return;
    const k = t.current;
    m.current.position.set(-0.35 + k * 9, 1.15 + Math.sin(k * Math.PI) * 2.5 + k * 2, -0.45 + k * 4);
    m.current.scale.setScalar(on ? 0.6 + k * 0.6 : 0.0001);
  });
  return (
    <group>
      <group ref={m}>
        <mesh>
          <boxGeometry args={[0.5, 0.3, 0.04]} />
          <meshStandardMaterial color="#25d366" emissive="#25d366" emissiveIntensity={1.2} />
        </mesh>
      </group>
      <Html position={[-0.35, 1.7, -0.45]} center zIndexRange={[20, 0]}>
        <Bubble tone="green" visible={show}>✓ Owner approved · supplier message ready</Bubble>
      </Html>
    </group>
  );
}

function Delivery() {
  const auto = useRef<THREE.Group>(null);
  const crates = useRef<THREE.Group>(null);
  const x = useRef(-40);
  useFrame((_, dt) => {
    const st = useStory.getState();
    const go = st.step >= stepIndex("deliver");
    const target = go ? 2.6 : -40;
    x.current = go ? THREE.MathUtils.damp(x.current, target, 0.9, dt) : -40;
    if (auto.current) {
      auto.current.position.set(x.current, 0, 4.4);
      auto.current.children[0].position.y = Math.sin(st.stepT * 30) * 0.008 * (Math.abs(target - x.current) > 0.5 ? 1 : 0);
    }
    if (crates.current) {
      const arrived = go && Math.abs(target - x.current) < 0.6;
      crates.current.children.forEach((c, i) => {
        const s = THREE.MathUtils.damp(c.scale.x, arrived ? 1 : 0.0001, 4 + i, dt);
        c.scale.setScalar(s);
      });
    }
  });
  return (
    <group>
      <group ref={auto}>
        <AutoRickshaw />
      </group>
      <group ref={crates}>
        {[[1.1, 0.33, 1.6], [1.6, 0.33, 1.75], [1.35, 0.63, 1.68]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} scale={0.0001} castShadow>
            <boxGeometry args={[0.45, 0.3, 0.35]} />
            <meshStandardMaterial color={i === 2 ? "#ffb703" : "#d62828"} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Coins() {
  const N = 40;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2, r: 0.2 + (i % 5) * 0.08, s: 0.6 + (i % 7) * 0.12 })), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const t = useRef(0);
  const show = useStep("prove");
  useLayoutEffect(() => {
    if (!mesh.current) return;
    for (let i = 0; i < N; i++) {
      o.scale.setScalar(0.0001);
      o.updateMatrix();
      mesh.current.setMatrixAt(i, o.matrix);
    }
  }, [o]);
  useFrame((_, dt) => {
    const on = useStory.getState().step === stepIndex("prove");
    t.current = on ? t.current + dt : 0;
    if (!mesh.current) return;
    seeds.forEach((sd, i) => {
      const k = (t.current * sd.s + i * 0.05) % 2.2;
      o.position.set(Math.cos(sd.a + k) * sd.r, 1.1 + k * 0.9, -0.5 + Math.sin(sd.a + k) * sd.r);
      o.rotation.set(Math.PI / 2, k * 4, 0);
      o.scale.setScalar(on ? 0.05 : 0.0001);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, N]}>
        <cylinderGeometry args={[1, 1, 0.18, 20]} />
        <meshStandardMaterial color="#ffd166" metalness={0.55} roughness={0.3} emissive="#ffb703" emissiveIntensity={0.9} />
      </instancedMesh>
      <Html position={[0, 2.5, -0.5]} center zIndexRange={[20, 0]}>
        <Bubble tone="green" visible={show}>14 of 16 sold · +₹182 gross profit</Bubble>
      </Html>
    </group>
  );
}

function BlindQR() {
  const show = useStep("blind");
  const x = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const on = useStory.getState().step === stepIndex("blind");
    if (x.current) x.current.scale.setScalar(THREE.MathUtils.damp(x.current.scale.x, on ? 1 : 0.0001, 6, dt));
  });
  return (
    <group position={[ANCHOR.qr.x, ANCHOR.qr.y + 0.02, ANCHOR.qr.z + 0.06]} rotation-y={-0.25}>
      <group ref={x} scale={0.0001}>
        {[1, -1].map((s) => (
          <mesh key={s} rotation-z={s * Math.PI / 4}>
            <boxGeometry args={[0.34, 0.035, 0.01]} />
            <meshStandardMaterial color="#ff3b3b" emissive="#ff2a2a" emissiveIntensity={2} />
          </mesh>
        ))}
      </group>
      <Html position={[0, 0.2, 0]} center zIndexRange={[20, 0]}>
        <Bubble tone="red" visible={show}>No payment → no record → no signal</Bubble>
      </Html>
    </group>
  );
}

function Transcript() {
  const show = useStep("listen");
  return (
    <Html position={[ANCHOR.soundbox.x - 0.25, ANCHOR.soundbox.y + 0.32, ANCHOR.soundbox.z]} center zIndexRange={[20, 0]}>
      <div className="pointer-events-none w-[300px] rounded-2xl bg-white p-3 text-left shadow-2xl transition-all duration-500" style={{ opacity: show ? 1 : 0, transform: `translateY(${show ? 0 : 12}px)` }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#00baf2]">MITRA heard · Tamil</p>
        <p className="mt-1 text-[14px] text-[#0b1f3a]">“இன்னைக்கு எட்டு பேர் மாம்பழ லஸ்ஸி கேட்டாங்க”</p>
        <div className="mt-2 flex gap-1.5 text-[12px]">
          <span className="rounded-md bg-[#e8f7fd] px-2 py-0.5 text-[#002e6e]">mango lassi</span>
          <span className="rounded-md bg-[#e8f7fd] px-2 py-0.5 text-[#002e6e]">× 8 asks</span>
          <span className="rounded-md bg-[#fff4e5] px-2 py-0.5 text-[#8a4b00]">not stocked</span>
        </div>
      </div>
    </Html>
  );
}

export function StoryFX() {
  return (
    <group>
      <People />
      <BlindQR />
      <AskPile />
      <ListenRings />
      <Transcript />
      <HoloBars />
      <ApproveMessage />
      <Delivery />
      <Coins />
    </group>
  );
}

export { reached };
