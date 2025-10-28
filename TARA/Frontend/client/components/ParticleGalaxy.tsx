import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

extend({ OrbitControls });

const ParticleSystem = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const clockRef = useRef(new THREE.Clock());

  const { geometry, sizes, shift } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const sizes: number[] = [];
    const shift: number[] = [];

    const pushShift = () => {
      shift.push(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
        Math.random() * 0.9 + 0.1,
      );
    };

    // Create initial sphere points
    for (let i = 0; i < 50000; i++) {
      sizes.push(Math.random() * 1.5 + 0.5);
      pushShift();
      pts.push(
        new THREE.Vector3()
          .randomDirection()
          .multiplyScalar(Math.random() * 0.5 + 9.5),
      );
    }

    // Create galaxy disk points
    for (let i = 0; i < 100000; i++) {
      const r = 10;
      const R = 40;
      const rand = Math.pow(Math.random(), 1.5);
      const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
      pts.push(
        new THREE.Vector3().setFromCylindricalCoords(
          radius,
          Math.random() * 2 * Math.PI,
          (Math.random() - 0.5) * 2,
        ),
      );
      sizes.push(Math.random() * 1.5 + 0.5);
      pushShift();
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    geometry.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

    return { geometry, sizes, shift };
  }, []);

  const material = useMemo(() => {
    const material = new THREE.PointsMaterial({
      size: 0.125,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };

      shader.vertexShader = `
        uniform float time;
        attribute float sizes;
        attribute vec4 shift;
        varying vec3 vColor;
        ${shader.vertexShader}
      `
        .replace(`gl_PointSize = size;`, `gl_PointSize = size * sizes;`)
        .replace(
          `#include <color_vertex>`,
          `#include <color_vertex>
          float d = length(abs(position) / vec3(40., 10., 40));
          d = clamp(d, 0., 1.);
          
          // Base greyish-white color
          vec3 baseColor = mix(vec3(200., 200., 200.), vec3(255., 255., 255.), d);
          
          // Add golden/yellow light effect
          float goldenEffect = sin(position.x * 0.1 + position.y * 0.1) * 0.15;
          vec3 goldenLight = vec3(255., 255., 200.) * goldenEffect;
          
          // Add pure white light effect
          float whiteEffect = cos(position.z * 0.1) * 0.12;
          vec3 whiteLight = vec3(255., 255., 255.) * whiteEffect;
          
          // Combine all effects
          vColor = (baseColor + goldenLight + whiteLight) / 255.;
        `,
        )
        .replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
          float t = time;
          float moveT = mod(shift.x + shift.z * t, PI2);
          float moveS = mod(shift.y + shift.z * t, PI2);
          transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
        `,
        );

      shader.fragmentShader = `
        varying vec3 vColor;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `float d = length(gl_PointCoord.xy - 0.5);
         vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d) );`,
      );

      materialRef.current = material;
    };

    return material;
  }, []);

  useFrame(() => {
    if (pointsRef.current && materialRef.current) {
      const t = clockRef.current.getElapsedTime() * 0.5;

      // Update time uniform
      if (materialRef.current.userData.shader) {
        materialRef.current.userData.shader.uniforms.time.value = t * Math.PI;
      }

      // Rotate the entire system
      pointsRef.current.rotation.y = t * 0.05;
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      rotation={[0, 0, 0.2]}
    />
  );
};

export default function ParticleGalaxy() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 4, 21], fov: 60 }}
        gl={{ antialias: true }}
        style={{ background: "#000000" }}
      >
        <ParticleSystem />
        <OrbitControls
          enableDamping={true}
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>
    </div>
  );
}
