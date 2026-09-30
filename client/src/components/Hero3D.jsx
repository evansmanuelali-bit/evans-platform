import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = (e) => setReduced(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function ParticleField({ count = 900 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#8b5cf6" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function CoreObject() {
  const ref = useRef();
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.12;
    ref.current.rotation.y += delta * 0.18;
    const t = state.clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 0.6) * 0.25;
  });
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial color="#151828" metalness={0.85} roughness={0.25} flatShading />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[2.15, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.18} />
      </mesh>
      <pointLight intensity={30} color="#8b5cf6" position={[2, 2, 3]} />
      <pointLight intensity={18} color="#22d3ee" position={[-3, -1, 2]} />
    </group>
  );
}

function Rig({ children }) {
  const group = useRef();
  useFrame((state) => {
    if (!group.current) return;
    const { x, y } = state.pointer;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, x * 0.25, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -y * 0.18, 0.05);
  });
  return <group ref={group}>{children}</group>;
}

export default function Hero3D() {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!webglAvailable()) setFailed(true);
  }, []);

  if (reduced || failed) {
    return (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.22),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.12),transparent_55%)]" />
    );
  }

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onError={() => setFailed(true)}
      >
        <color attach="background" args={['#06070c']} />
        <fog attach="fog" args={['#06070c', 8, 16]} />
        <ambientLight intensity={0.25} />
        <Rig>
          <CoreObject />
          <ParticleField />
        </Rig>
      </Canvas>
    </div>
  );
}
