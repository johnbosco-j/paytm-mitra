"use client";

import { useGLTF } from "@react-three/drei";
import { Overlay as Html } from "./Overlay";
import { useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { reached, stepIndex, useStory, type StepId } from "@/lib/story";
import { ANCHOR } from "./Kirana";

const useStep = (id: StepId) => {
  const s = useStory((x) => x.step);
  return s === stepIndex(id);
};

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

/** Realistic people: the team's Character Creator models, posed with their own skeletons in assets/blender/build_people_v2.py. */
function useHuman(src: string) {
  const { scene } = useGLTF(src, "/draco/");
  return useMemo(() => {
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
}

function Human({ src, position, rotation = 0, scale = 1, breathe = 0 }: { src: string; position: [number, number, number]; rotation?: number; scale?: number; breathe?: number }) {
  const model = useHuman(src);
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    // subtle idle breathing so nobody looks frozen
    if (g.current && breathe) g.current.scale.y = scale * (1 + Math.sin(state.clock.elapsedTime * 1.6 + breathe) * 0.004);
  });
  return (
    <group ref={g} position={position} rotation-y={rotation} scale={scale}>
      <primitive object={model} />
    </group>
  );
}

type Pose = "Idle" | "Ask";
type Waypoint = { at: THREE.Vector3; face: number; pose?: Pose };
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const STRIDE_SPEED = 1.19; // m/s covered by one baked gait cycle (assets/blender/build_walkers.py: 32 frames @ 30 fps)

/**
 * A skinned person with baked clips (Walk, Idle, Ask) from build_walkers.py. Walks between story positions with
 * the Walk clip at a playback rate matched to the ground speed (no foot skating), turns toward where they're
 * heading, then cross-fades into the scene pose.
 */
function Person({ src, where, spawn, tint, speed = 1.15 }: { src: string; where: (step: number, t: number) => Waypoint; spawn?: THREE.Vector3; tint?: string; speed?: number }) {
  const gltf = useGLTF(src, "/draco/");
  const rig = useMemo(() => {
    const model = cloneSkinned(gltf.scene);
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false; // skinned bounds don't follow the animation
      const mat = m.material as THREE.MeshStandardMaterial;
      if (tint && /shirt/i.test(mat.name)) {
        const c = mat.clone();
        c.color.set(tint);
        m.material = c;
      }
    });
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
    return { model, mixer, actions };
  }, [gltf, tint]);
  const g = useRef<THREE.Group>(null);
  const placed = useRef(false);
  const clip = useRef<string | null>(null);
  const play = (name: string) => {
    if (clip.current === name || !rig.actions[name]) return;
    const next = rig.actions[name];
    next.reset().setEffectiveWeight(1).fadeIn(clip.current ? 0.35 : 0).play();
    if (clip.current) rig.actions[clip.current]?.fadeOut(0.35);
    clip.current = name;
  };
  useFrame((state, dt) => {
    const st = useStory.getState();
    const target = where(st.step, state.clock.elapsedTime);
    const grp = g.current;
    if (!grp) return;
    const snap = st.reduced || new URLSearchParams(window.location.search).has("shot");
    if (!placed.current || snap) {
      placed.current = true;
      grp.position.copy(!snap && spawn ? spawn : target.at);
      grp.rotation.y = target.face;
    }
    const p = grp.position;
    const to = target.at;
    const dist = Math.hypot(to.x - p.x, to.z - p.z);
    const moving = !snap && dist > 0.06;
    if (moving) {
      const step = Math.min(dist, speed * Math.min(dt, 0.05));
      p.x += ((to.x - p.x) / dist) * step;
      p.z += ((to.z - p.z) / dist) * step;
      const heading = Math.atan2(to.x - p.x, to.z - p.z);
      let d = heading - grp.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      grp.rotation.y += d * Math.min(1, dt * 5);
      play("Walk");
      rig.actions.Walk?.setEffectiveTimeScale(speed / STRIDE_SPEED);
    } else {
      let d = target.face - grp.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      grp.rotation.y += d * Math.min(1, dt * 3);
      play(target.pose ?? "Idle");
    }
    p.y = to.y;
    rig.mixer.update(Math.min(dt, 0.05));
  });
  return (
    <group ref={g}>
      <primitive object={rig.model} />
    </group>
  );
}

/**
 * Priya and her husband, together all story: they stroll up, she asks, hears "illa", they walk on to City Café &
 * Mart; the morning the stock arrives they come back for the pre-order she paid for.
 */
const AT_COUNTER = { her: v3(ANCHOR.customer.x, ANCHOR.customer.y, ANCHOR.customer.z), him: v3(2.4, 0.16, 1.85) };
function couplePath(who: "her" | "him") {
  const lane = who === "her" ? 1.7 : 2.35; // side by side on the footpath, he walks on the road side
  return (step: number): Waypoint => {
    if (step <= stepIndex("intro")) return { at: v3(4.6, 0.16, lane), face: -Math.PI / 2 };
    if (step <= stepIndex("illa")) {
      return who === "her"
        ? { at: AT_COUNTER.her, face: Math.PI + 0.6, pose: step === stepIndex("ask") ? "Ask" : "Idle" }
        : { at: AT_COUNTER.him, face: Math.PI + 0.25 };
    }
    if (step < stepIndex("deliver")) return { at: v3(-24.2, 0.16, lane), face: Math.PI }; // into City Café & Mart
    return who === "her" ? { at: AT_COUNTER.her, face: Math.PI + 0.6 } : { at: AT_COUNTER.him, face: Math.PI + 0.25 };
  };
}
const herPath = couplePath("her");
const himPath = couplePath("him");
/** A stranger strolling the far footpath, back and forth, independent of the chapters. */
const strollerPath = (_: number, t: number): Waypoint => {
  const leg = Math.floor(t / 38) % 2; // 38 s per crossing at ~1.1 m/s
  return { at: v3(leg ? -21 : 21, 0.16, 12.4), face: leg ? -Math.PI / 2 : Math.PI / 2 };
};

useGLTF.preload("/models/customer_walk.glb", "/draco/");
useGLTF.preload("/models/partner_walk.glb", "/draco/");
useGLTF.preload("/models/naren.glb", "/draco/");

export function People() {
  const step = useStory((s) => s.step);
  return (
    <group>
      {/* each model loads in its own Suspense so the speech bubbles (drei Html) never unmount mid-render */}
      <Suspense fallback={null}>
        <Person src="/models/customer_walk.glb" where={herPath} spawn={v3(11, 0.16, 1.7)} />
        <Person src="/models/partner_walk.glb" where={himPath} spawn={v3(11, 0.16, 2.35)} />
      </Suspense>
      {/* Naren behind the counter, hands resting on it */}
      <Suspense fallback={null}>
        <Human src="/models/naren.glb" position={[-0.2, 0.16, -1.85]} rotation={0.1} breathe={2} />
      </Suspense>
      <Suspense fallback={null}>
        <Person src="/models/partner_walk.glb" where={strollerPath} spawn={v3(-21, 0.16, 12.4)} tint="#e0a15a" speed={1.1} />
      </Suspense>
      <Html position={[ANCHOR.customer.x, 2.2, ANCHOR.customer.z]} center zIndexRange={[20, 0]}>
        <Bubble visible={step === stepIndex("ask")}>“Anna, mango lassi irukka?”</Bubble>
      </Html>
      <Html position={[-0.2, 2.1, -1.85]} center zIndexRange={[20, 0]}>
        <Bubble tone="red" visible={step === stepIndex("illa")}>“Illa-mma…” 😔</Bubble>
      </Html>
      <Html position={[ANCHOR.customer.x, 2.2, ANCHOR.customer.z]} center zIndexRange={[20, 0]}>
        <Bubble tone="green" visible={step === stepIndex("prove")}>“Pre-ordered on Paytm, ready!” 🥭</Bubble>
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

/** The supplier's truck (team asset, rebranded in assets/blender/build_truck.py) drives in, unloads lassi crates. */
function Truck() {
  const { scene } = useGLTF("/models/truck.glb", "/draco/");
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
useGLTF.preload("/models/truck.glb", "/draco/");

function Delivery() {
  const truck = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const crates = useRef<THREE.Group>(null);
  const x = useRef(40);
  useFrame((_, dt) => {
    const st = useStory.getState();
    const go = st.step >= stepIndex("deliver");
    const target = go ? 3.1 : 40;
    x.current = go ? THREE.MathUtils.damp(x.current, target, 0.8, dt) : 40;
    const driving = Math.abs(target - x.current) > 0.4;
    if (truck.current) truck.current.position.set(x.current, 0.02, 4.6);
    if (body.current) {
      body.current.position.y = driving ? Math.sin(st.stepT * 22) * 0.012 : 0;
      body.current.rotation.z = driving ? -0.012 : 0; // squat under braking
    }
    if (crates.current) {
      const arrived = go && !driving;
      crates.current.children.forEach((c, i) => {
        const s = THREE.MathUtils.damp(c.scale.x, arrived ? 1 : 0.0001, 3 + i, dt);
        c.scale.setScalar(s);
      });
    }
  });
  return (
    <group>
      {/* cab faces -x (driving toward the shop from the right); branded side faces the street camera */}
      <group ref={truck} rotation-y={-Math.PI / 2}>
        <group ref={body}>
          <Suspense fallback={null}>
            <Truck />
          </Suspense>
        </group>
      </group>
      <group ref={crates}>
        {[[1.1, 0.33, 1.6], [1.6, 0.33, 1.75], [1.35, 0.63, 1.68]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} scale={0.0001} castShadow>
            <boxGeometry args={[0.45, 0.3, 0.35]} />
            <meshStandardMaterial color={i === 2 ? "#ffb703" : "#0b6b3a"} roughness={0.6} />
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
    <Html position={[ANCHOR.soundbox.x - 0.05, ANCHOR.soundbox.y + 0.32, ANCHOR.soundbox.z]} center zIndexRange={[20, 0]}>
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
