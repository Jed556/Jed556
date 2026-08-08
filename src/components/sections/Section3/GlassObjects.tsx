import React, { useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useFBO, Torus, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three-stdlib';
import { scrollManager } from '../../../utils/ScrollManager';
import { MAX_SCROLL } from '../../../data/projects';
import '../Section2/Transparents/Transparent/GlassMaterial'; // Ensure shader is loaded
import { globalGlassObjects, globalRefraction } from '../../../utils/GlobalRefraction';

const CARD_SPACING = 6.5;
// The total vertical distance we scroll through
const TOTAL_SCROLL_DIST = MAX_SCROLL * CARD_SPACING;
// Desired density: roughly 1 object per 5 units of scroll distance
const OBJECT_COUNT = Math.floor(TOTAL_SCROLL_DIST / 5);

// Reusable geometries
const pillGeometry = (() => {
  const geo = new THREE.CapsuleGeometry(0.8, 1.5, 16, 32);
  return geo;
})();

const roundedCylinderGeometry = (() => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.7, 0, Math.PI * 2, false);
  
  let geometry: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.15,
    bevelSegments: 16,
    curveSegments: 64
  });
  geometry.center(); 
  geometry.rotateX(Math.PI / 2);
  geometry = mergeVertices(geometry, 1e-4);
  geometry.computeVertexNormals();
  return geometry;
})();

import { RoundedBoxGeometry } from 'three-stdlib';

const boxGeometry = (() => {
  // Use higher smoothness (16) for a much higher quality rounded edge
  const geo = new RoundedBoxGeometry(1.5, 1.5, 1.5, 16, 0.2);
  return geo;
})();

const donutGeometry = (() => {
  const geo = new THREE.TorusGeometry(1.0, 0.4, 32, 64);
  return geo;
})();

interface GlassObjectProps {
  type: 'donut' | 'box' | 'pill' | 'cylinder';
  baseX: number;
  baseY: number;
  baseZ: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export interface GlassObjectRef {
  materialRef: React.MutableRefObject<any>;
}

const SingleGlassObject = forwardRef<GlassObjectRef, GlassObjectProps>(
  ({ type, baseX, baseY, baseZ, scale, rotX, rotY, rotZ }, ref) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);
    const velocity = useRef(new THREE.Vector3());

    useImperativeHandle(ref, () => ({
      materialRef,
    }));

    useEffect(() => {
      if (meshRef.current) {
        meshRef.current.rotation.set(rotX, rotY, rotZ);
      }
    }, [rotX, rotY, rotZ]);

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const movementX = e.movementX || e.nativeEvent?.movementX || 0;
      const movementY = e.movementY || e.nativeEvent?.movementY || 0;
      
      // Normalize movement by screen size so a swipe of X% of the screen imparts the same spin everywhere
      const normalizedX = movementX / window.innerWidth;
      const normalizedY = movementY / window.innerHeight;
      
      const forceX = Math.max(-0.05, Math.min(0.05, normalizedX * 0.5));
      const forceY = Math.max(-0.05, Math.min(0.05, normalizedY * 0.5));
      
      velocity.current.x += forceX;
      velocity.current.y -= forceY; // Invert Y so pushing up moves it up
    };

    const currentSection3ScaleRef = useRef(1.0);

    useFrame((state, delta) => {
        const dt = Math.min(delta, 0.1);
      const time = state.clock.getElapsedTime();
      if (meshRef.current) {
        // Calculate the exact same smooth scale used by Section3/index.tsx
        const targetSection3Scale = Math.max(0.35, Math.min(1.0, state.viewport.width / 16.0));
        // Initialize instantly on first frame if needed, otherwise lerp smoothly during resize
        if (currentSection3ScaleRef.current === 1.0 && time < 0.5) currentSection3ScaleRef.current = targetSection3Scale;
        currentSection3ScaleRef.current = THREE.MathUtils.lerp(currentSection3ScaleRef.current, targetSection3Scale, 10 * dt);
        const section3Scale = currentSection3ScaleRef.current;
        
        // Don't compress X spread or shrink scale as aggressively as the main cards.
        // We lerp between 1.0 and the section3Scale to dampen the effect.
        const positionCompression = THREE.MathUtils.lerp(1.0, section3Scale, 0.6); // 60% of the squeeze
        const sizeCompression = THREE.MathUtils.lerp(1.0, section3Scale, 0.4);     // 40% of the shrink
        
        // Compress the X spread smoothly 
        const compressedX = baseX * positionCompression;
        // Shrink the glass objects proportionally
        const compressedScale = scale * sizeCompression;

        // Slow random bobbing
        const bob = Math.sin(time * 0.5 + baseY) * 0.5;
        meshRef.current.position.set(compressedX, baseY + bob, baseZ);

        // Slow constant spin + interaction spin
        velocity.current.multiplyScalar(0.98); // friction
        
        const deltaRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            velocity.current.y * 3.0 + 0.002,
            velocity.current.x * 3.0 + 0.004,
            dt * 0.2,
            'XYZ'
          )
        );
        meshRef.current.applyQuaternion(deltaRotation);
        
        meshRef.current.scale.setScalar(compressedScale);
      }
    });

    const mat = <glassMaterial ref={materialRef} transparent />;

    switch (type) {
      case 'box':
        return (
          <mesh ref={meshRef as any} geometry={boxGeometry} onPointerMove={handlePointerMove}>
            {mat}
          </mesh>
        );
      case 'donut':
        return (
          <mesh ref={meshRef as any} geometry={donutGeometry} onPointerMove={handlePointerMove}>
            {mat}
          </mesh>
        );
      case 'pill':
        return (
          <mesh ref={meshRef as any} geometry={pillGeometry} onPointerMove={handlePointerMove}>
            {mat}
          </mesh>
        );
      case 'cylinder':
      default:
        return (
          <mesh ref={meshRef as any} geometry={roundedCylinderGeometry} onPointerMove={handlePointerMove}>
            {mat}
          </mesh>
        );
    }
  }
);

export const GlassObjects: React.FC<{ scrollValue: number }> = ({ scrollValue }) => {
  const groupRef = useRef<THREE.Group>(null);
  const objectsRef = useRef<(GlassObjectRef | null)[]>([]);
  const lastInternalScrollValue = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    if (groupRef.current) {
      globalGlassObjects.add(groupRef.current);
      return () => {
        globalGlassObjects.delete(groupRef.current!);
      };
    }
  }, []);

  // Procedurally generate objects layout
  const shapes = useMemo(() => {
    const types: ('donut' | 'box' | 'pill' | 'cylinder')[] = ['donut', 'box', 'pill', 'cylinder'];
    const generated = [];
    let lastType = '';
    
    // We want objects to spawn across the Y axis from 0 down to -TOTAL_SCROLL_DIST
    for (let i = 0; i < OBJECT_COUNT; i++) {
      // Pick a random type, strictly avoiding the last chosen type to prevent duplicates
      const availableTypes = types.filter(t => t !== lastType);
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      lastType = type;
      
      // Depth (z): To prevent the 3D volume of the glass shapes from intersecting the 2D cards (at local Z=0),
      // we need to push their center point forward. 
      // A baseZ of 1.5 to 2.5 ensures their back edges remain safely in front of the cards.
      const baseZ = 1.5 + Math.random() * 1.0;
      
      // Strictly alternate sides (left/right) to prevent clustering
      const side = (i % 2 === 0) ? 1 : -1;
      
      // Cards take up the center (X: -4 to +4). 
      // We allow them to spawn anywhere from slightly overlapping the cards (X: 3.2)
      // all the way out to the far edges of the visible screen (X: ~5.7).
      // On mobile, the useFrame logic automatically squeezes this entire range inward so they stay visible!
      const baseClearance = 3.2 + Math.random() * 2.5; 
      const baseX = side * baseClearance;
      
      // Spread them evenly with constrained jitter to guarantee minimum vertical spacing
      const segmentHeight = TOTAL_SCROLL_DIST / OBJECT_COUNT;
      const jitter = (Math.random() - 0.5) * (segmentHeight * 0.4);
      // Add an initial gap of -10.0 to prevent them from crowding the initial shapes, 
      // but still spawn soon enough as you scroll down.
      const baseY = -((i + 0.5) * segmentHeight + jitter) - 10.0;
      
      // Random scale
      const scale = 0.6 + Math.random() * 0.7;

      generated.push({
        id: i,
        type,
        baseX,
        baseY,
        baseZ,
        scale,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
      });
    }
    return generated;
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    // Determine internal scroll to offset the whole group
    const currentInternalScroll = scrollManager.internalScrollValue;
    let effectiveInternalScroll = currentInternalScroll;
    if (scrollManager.currentSection > 2) {
      effectiveInternalScroll = MAX_SCROLL;
    } else if (scrollManager.currentSection < 2) {
      effectiveInternalScroll = 0;
    }

    // Velocity tracking for global squeeze/opacity
    const velocity = (currentInternalScroll - lastInternalScrollValue.current) / (dt || 0.016);
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, velocity, 0.3);
    lastInternalScrollValue.current = currentInternalScroll;

    // Entrance animation matching Section 3
    let globalOpacity = 1.0;
    let globalYOffset = 0;
    let globalXOffset = 0;
    if (scrollValue <= 2.0) {
      const f = Math.max(0, Math.min((scrollValue - 1.0), 1.0));
      globalOpacity = f;
      globalYOffset = -15.0 * (1.0 - f);
    } else if (scrollValue > 2.0) {
      const outroProgress = Math.min(1.0, (scrollValue - 2.0) / 1.0);
      
      const pullPhase = Math.min(1.0, Math.max(0, outroProgress) / 1.0);
      let pullEased = 0;
      if (pullPhase < 0.25) pullEased = (8 / 3) * pullPhase * pullPhase;
      else if (pullPhase < 0.75) pullEased = (1 / 6) + (4 / 3) * (pullPhase - 0.25);
      else {
        const t = pullPhase - 0.75;
        pullEased = (5 / 6) + (4 / 3) * t - (8 / 3) * t * t;
      }
      globalYOffset = pullEased * 13.0; 
      
      const slidePhase = Math.min(1.0, Math.max(0, (outroProgress - 0.75) / 0.25));
      const slideEased = slidePhase * slidePhase * (3.0 - 2.0 * slidePhase); 
      globalXOffset = -slideEased * 3.5;
      
      // Fade out starts earlier (0.80) 
      const fadePhase = Math.max(0, (outroProgress - 0.80) / 0.20);
      globalOpacity = 1.0 - fadePhase;
    }

    if (groupRef.current) {
      // Move the group upwards as we scroll
      groupRef.current.position.y = (effectiveInternalScroll * CARD_SPACING) + globalYOffset;
      groupRef.current.position.x = globalXOffset;
      
      groupRef.current.visible = globalOpacity > 0.001;

      const time = state.clock.getElapsedTime();
      
      // Feed FBO texture and opacity into materials
      objectsRef.current.forEach((ref) => {
        if (ref?.materialRef.current) {
          const mat = ref.materialRef.current;
          mat.uSceneTex = globalRefraction.texture;
          mat.time = time;
          mat.winResolution.set(state.size.width * state.viewport.dpr, state.size.height * state.viewport.dpr);
          if (mat.type === 'ShaderMaterial' && mat.uniforms.uVisibility) {
            mat.uniforms.uVisibility.value = globalOpacity;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {shapes.map((shape, idx) => (
        <SingleGlassObject
          key={shape.id}
          ref={(el) => { objectsRef.current[idx] = el; }}
          {...shape}
        />
      ))}
    </group>
  );
};
