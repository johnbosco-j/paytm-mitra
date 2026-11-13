"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStory } from "@/lib/story";
import { asphalt, concrete, leafCard, plaster, storeSign, wallAd } from "./textures";

const PASTELS = ["#e8b4b8", "#a7c7e7", "#f3d28b", "#b8d8be", "#d9c3e8", "#f2b880", "#cfd8dc"];

/** Dusk → night sky dome driven by time-of-day (0 dusk, 1 night). */
export function Sky() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTod: { value: 0.2 } }), []);
  useFrame(() => {
    if (mat.current) mat.current.uniforms.uTod.value = useStory.getState().tod;
  });
  return (
    <mesh scale={400}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        ref={mat}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={`
          varying vec3 vP; uniform float uTod;
          void main(){
            float h = clamp(vP.y*1.2+0.15, 0.0, 1.0);
            vec3 duskLow = vec3(1.0,0.55,0.28), duskHigh = vec3(0.24,0.33,0.62);
            vec3 nightLow = vec3(0.10,0.10,0.22), nightHigh = vec3(0.01,0.02,0.07);
            vec3 low = mix(duskLow, nightLow, uTod), high = mix(duskHigh, nightHigh, uTod);
            vec3 c = mix(low, high, pow(h, 0.7));
            // sun glow toward -x horizon
            float sun = pow(max(dot(normalize(vP), normalize(vec3(-1.0,0.08,-0.35))),0.0), 64.0);
            c += vec3(1.0,0.6,0.3) * sun * (1.0-uTod) * 1.6;
            // stars at night
            float st = step(0.9985, fract(sin(dot(floor(vP.xz*420.0), vec2(12.9898,78.233)))*43758.5453));
            c += st * uTod * h * 0.9;
            gl_FragColor = vec4(c, 1.0);
          }`}
      />
    </mesh>
  );
}

/** Sun + ambient + hemisphere lights that follow time of day. */
export function Lighting() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  useFrame(() => {
    const tod = useStory.getState().tod;
    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.lerp(2.0, 0.04, tod);
      sun.current.color.setRGB(1, THREE.MathUtils.lerp(0.55, 0.7, tod), THREE.MathUtils.lerp(0.3, 0.9, tod));
    }
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(0.7, 0.16, tod);
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#9db7ff", "#3a2a20", 0.8]} />
      <directionalLight
        ref={sun}
        position={[-30, 6, 4]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={14}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
    </>
  );
}

function Ground() {
  const road = useMemo(() => asphalt([12, 2]), []);
  const walk = useMemo(() => concrete([24, 2]), []);
  return (
    <group>
      {/* road */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 7]} receiveShadow>
        <planeGeometry args={[120, 9]} />
        <meshStandardMaterial map={road} roughness={0.92} metalness={0} color="#9a9a9a" />
      </mesh>
      {/* lane dashes */}
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[-58 + i * 4, 0.005, 7]}>
          <planeGeometry args={[2, 0.14]} />
          <meshStandardMaterial color="#e9e3c8" roughness={0.8} />
        </mesh>
      ))}
      {/* footpath, raised */}
      <mesh position={[0, 0.08, 1.25]} receiveShadow>
        <boxGeometry args={[120, 0.16, 2.5]} />
        <meshStandardMaterial map={walk} roughness={0.95} />
      </mesh>
      {/* black-and-yellow painted curb stones, as on Chennai roads */}
      {Array.from({ length: 120 }, (_, i) => (
        <mesh key={i} position={[-59.5 + i, 0.1, 2.52]} castShadow receiveShadow>
          <boxGeometry args={[1, 0.22, 0.12]} />
          <meshStandardMaterial color={i % 2 ? "#e6c229" : "#1b1b1b"} roughness={0.7} />
        </mesh>
      ))}
      {/* far side footpath */}
      <mesh position={[0, 0.08, 12.75]} receiveShadow>
        <boxGeometry args={[120, 0.16, 2.5]} />
        <meshStandardMaterial map={walk} roughness={0.95} />
      </mesh>
    </group>
  );
}

function WaterTank({ position }: { position: [number, number, number] }) {
  // the black ribbed rooftop tank seen on almost every Indian building
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.1, 20]} />
        <meshStandardMaterial color="#141414" roughness={0.55} />
      </mesh>
      {[0.25, 0.55, 0.85].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.56, 0.025, 6, 24]} />
          <meshStandardMaterial color="#222" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.1, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function Building({ x, w, h, d = 6, color, seed }: { x: number; w: number; h: number; d?: number; color: string; seed: number }) {
  const tex = useMemo(() => plaster(color, [w / 3, h / 3]), [color, w, h]);
  const windows = useRef<THREE.MeshStandardMaterial[]>([]);
  const rnd = useMemo(() => {
    let s = seed;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  }, [seed]);
  const wins = useMemo(() => {
    const out: { p: [number, number, number]; lit: number }[] = [];
    const floors = Math.floor((h - 3.6) / 3);
    const cols = Math.max(1, Math.floor(w / 2.2));
    for (let f = 0; f < floors; f++)
      for (let c = 0; c < cols; c++) out.push({ p: [-w / 2 + (c + 0.5) * (w / cols), 4.6 + f * 3, 0.02], lit: rnd() });
    return out;
  }, [w, h, rnd]);
  useFrame(() => {
    const tod = useStory.getState().tod;
    windows.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = wins[i].lit < 0.65 ? THREE.MathUtils.smoothstep(tod, 0.3, 0.8) * (1.2 + wins[i].lit) : 0;
    });
  });
  return (
    <group position={[x, 0, -d / 2]}>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {/* ground-floor shop band */}
      <mesh position={[0, 1.6, d / 2 + 0.01]}>
        <planeGeometry args={[w - 0.6, 3]} />
        <meshStandardMaterial color="#2a2522" roughness={0.9} />
      </mesh>
      {/* sunshade slab */}
      <mesh castShadow position={[0, 3.35, d / 2 + 0.35]}>
        <boxGeometry args={[w, 0.12, 0.8]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.9} />
      </mesh>
      {wins.map((wd, i) => (
        <group key={i} position={[wd.p[0], wd.p[1], d / 2 + 0.01]}>
          <mesh>
            <planeGeometry args={[1.1, 1.3]} />
            <meshStandardMaterial ref={(m) => { if (m) windows.current[i] = m; }} color="#1d2733" emissive="#ffcf8a" emissiveIntensity={0} roughness={0.25} metalness={0.3} />
          </mesh>
          {/* window grill */}
          {[-0.3, 0, 0.3].map((gx) => (
            <mesh key={gx} position={[gx, 0, 0.02]}>
              <boxGeometry args={[0.03, 1.3, 0.03]} />
              <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
          {/* small balcony on some windows */}
          {wd.lit > 0.7 && (
            <mesh position={[0, -0.75, 0.35]} castShadow>
              <boxGeometry args={[1.5, 0.08, 0.7]} />
              <meshStandardMaterial color="#cfc8b8" roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}
      <WaterTank position={[w / 2 - 1.2, h, -d / 2 + 1.5]} />
      {seed % 3 === 0 && (
        <mesh position={[-w / 2 + 1, h + 0.5, 0]} rotation-y={0.6}>
          <cylinderGeometry args={[0.35, 0.05, 0.25, 16, 1, true]} />
          <meshStandardMaterial color="#d9d9d9" side={THREE.DoubleSide} metalness={0.4} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}

function StreetLamp({ x }: { x: number }) {
  const light = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const on = THREE.MathUtils.smoothstep(useStory.getState().tod, 0.25, 0.6);
    if (light.current) light.current.intensity = on * 26;
    if (bulb.current) bulb.current.emissiveIntensity = 0.2 + on * 8;
  });
  return (
    <group position={[x, 0, 2.2]}>
      <mesh castShadow position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 7, 10]} />
        <meshStandardMaterial color="#5d6166" metalness={0.7} roughness={0.45} />
      </mesh>
      <mesh position={[0, 6.9, 0.7]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 8]} />
        <meshStandardMaterial color="#5d6166" metalness={0.7} roughness={0.45} />
      </mesh>
      <mesh position={[0, 6.82, 1.35]}>
        <boxGeometry args={[0.35, 0.12, 0.6]} />
        <meshStandardMaterial ref={bulb} color="#333" emissive="#ffa14a" emissiveIntensity={0.2} />
      </mesh>
      <pointLight ref={light} position={[0, 6.4, 1.4]} color="#ffa04a" distance={16} decay={1.6} intensity={0} />
    </group>
  );
}

function PowerLines() {
  const geo = useMemo(() => {
    const curves: THREE.TubeGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const x = -60 + i * 2;
        const t = ((x + 60) % 20) / 20;
        pts.push(new THREE.Vector3(x, 7.6 + k * 0.18 - Math.sin(t * Math.PI) * 0.7, 2.25 + k * 0.05));
      }
      curves.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.012, 4));
    }
    return curves;
  }, []);
  return (
    <group>
      {geo.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#121212" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function NeemTree({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  // ~900 alpha-tested leaf cards scattered in an ellipsoid canopy around a branching trunk.
  const leaves = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => leafCard(), []);
  const N = 900;
  const branches = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ rz: Math.sin(i * 2.3) * 0.7, ry: i * 1.05, len: 1.6 + (i % 3) * 0.4 })),
    [],
  );
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const color = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = rnd() * Math.PI * 2;
      const v = Math.acos(2 * rnd() - 1);
      const r = Math.cbrt(rnd());
      o.position.set(Math.sin(v) * Math.cos(u) * 2.1 * r, 4.4 + Math.cos(v) * 1.25 * r, Math.sin(v) * Math.sin(u) * 1.9 * r);
      o.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
      o.scale.setScalar(0.55 + rnd() * 0.5);
      o.updateMatrix();
      leaves.current?.setMatrixAt(i, o.matrix);
      color.setHSL(0.26 + rnd() * 0.05, 0.45, 0.32 + r * 0.12);
      leaves.current?.setColorAt(i, color);
    }
    if (leaves.current) {
      leaves.current.instanceMatrix.needsUpdate = true;
      if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true;
    }
  }, []);
  return (
    <group position={position} scale={s}>
      <mesh castShadow position={[0, 1.8, 0]} rotation-z={0.06}>
        <cylinderGeometry args={[0.14, 0.24, 3.6, 10]} />
        <meshStandardMaterial color="#4a3b2c" roughness={1} />
      </mesh>
      {branches.map((b, i) => (
        <group key={i} position={[0, 3.3, 0]} rotation-y={b.ry}>
          <mesh castShadow rotation-z={b.rz} position={[Math.sin(b.rz) * -b.len * 0.5, b.len * 0.45, 0]}>
            <cylinderGeometry args={[0.04, 0.09, b.len, 6]} />
            <meshStandardMaterial color="#4a3b2c" roughness={1} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={leaves} args={[undefined, undefined, N]} castShadow>
        <planeGeometry args={[0.7, 0.7]} />
        <meshStandardMaterial map={tex} alphaTest={0.45} side={THREE.DoubleSide} roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

/** Chennai auto-rickshaw, modelled in Blender (assets/blender/build_auto_rickshaw.py) and loaded as GLB. */
export function AutoRickshaw({ groupRef }: { groupRef?: React.Ref<THREE.Group> }) {
  const { scene } = useGLTF("/models/auto_rickshaw.glb");
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
  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}
useGLTF.preload("/models/auto_rickshaw.glb");

function ParkedScooter({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position} rotation-y={0.4}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.3, 0.45, 0.32]} />
        <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} />
      </mesh>
      <mesh castShadow position={[0.55, 0.95, 0]}>
        <boxGeometry args={[0.12, 0.5, 0.5]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {[-0.5, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.16, 0.06, 8, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
}

/** The big modern café-store down the road (team asset, cut down in assets/blender/build_cafe.py).
 * It's where Priya buys her drink after "illa": the sale Murugan never sees. */
function BigStore() {
  const { scene } = useGLTF("/models/cafe.glb", "/draco/");
  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      // same building as Murugan's store, so dress it as a dark, glossy chain store: charcoal walls, untouched glass
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat?.color && !mat.transparent && mat.color.getHSL({ h: 0, s: 0, l: 0 }).l > 0.55) {
        const dark = mat.clone();
        dark.color.set("#2b3038");
        dark.map = null;
        dark.roughness = 0.35;
        dark.metalness = 0.2;
        m.material = dark;
      }
    });
    return c;
  }, [scene]);
  const sign = useMemo(() => storeSign("CITY CAFÉ & MART", "COFFEE · LASSI · GROCERIES"), []);
  return (
    <group position={[-27.5, 0.08, 0]}>
      <primitive object={model} />
      <mesh position={[0, 5.0, 0.06]}>
        <planeGeometry args={[6.2, 1.16]} />
        <meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.55} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 2.2, -3]} color="#ffe2b8" intensity={6} distance={9} />
    </group>
  );
}
useGLTF.preload("/models/cafe.glb", "/draco/");

export function Street() {
  const adA = useMemo(() => wallAd("மாபெரும் தள்ளுபடி", "#1d4e89"), []);
  const adB = useMemo(() => wallAd("டீ · காபி", "#8c1c13"), []);
  const blocks = useMemo(
    () => [
      { x: -17, w: 8, h: 10.5, c: PASTELS[0] }, { x: -9.2, w: 7, h: 7.5, c: PASTELS[1] },
      { x: 9.2, w: 7, h: 9, c: PASTELS[2] }, { x: 17, w: 8, h: 12, c: PASTELS[3] },
      { x: 26, w: 9, h: 7, c: PASTELS[5] },
    ],
    [],
  );
  return (
    <group>
      <Ground />
      {blocks.map((b, i) => (
        <Building key={i} x={b.x} w={b.w} h={b.h} color={b.c} seed={i + 3} />
      ))}
      {/* buildings across the road (silhouettes) */}
      {[-24, -12, 0, 12, 24].map((x, i) => (
        <group key={x} position={[x, 0, 24]} rotation-y={Math.PI}>
          <mesh castShadow position={[0, (8 + (i % 3) * 3) / 2, 0]}>
            <boxGeometry args={[11, 8 + (i % 3) * 3, 6]} />
            <meshStandardMaterial map={plaster(PASTELS[(i + 3) % PASTELS.length], [3, 3])} roughness={0.95} />
          </mesh>
        </group>
      ))}
      <mesh position={[-9.2, 5.2, 0.03]}>
        <planeGeometry args={[4.5, 2.2]} />
        <meshStandardMaterial map={adA} roughness={0.9} />
      </mesh>
      <mesh position={[9.2, 5.6, 0.03]}>
        <planeGeometry args={[4, 2]} />
        <meshStandardMaterial map={adB} roughness={0.9} />
      </mesh>
      {[-14, -2.8, 6, 20].map((x) => (
        <StreetLamp key={x} x={x} />
      ))}
      <Suspense fallback={null}>
        <BigStore />
      </Suspense>
      <PowerLines />
      <NeemTree position={[-5.2, 0.16, 1.4]} s={1.05} />
      <NeemTree position={[13.5, 0.16, 1.5]} s={0.9} />
      <NeemTree position={[-21, 0.16, 13.4]} s={1.2} />
      <ParkedScooter position={[-3.6, 0.16, 1.6]} color="#c1121f" />
      <ParkedScooter position={[4.4, 0.16, 1.8]} color="#1d3557" />
      <group position={[-12, 0, 5.2]} rotation-y={0.08}>
        <Suspense fallback={null}>
          <AutoRickshaw />
        </Suspense>
      </group>
      <fog attach="fog" args={["#3a3550", 22, 90]} />
    </group>
  );
}
