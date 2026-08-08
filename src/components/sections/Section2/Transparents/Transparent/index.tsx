import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scrollManager } from '../../../../../utils/ScrollManager';
import './GlassMaterial';

export interface TransparentProps {
  type: 'cube' | 'cylinder';
  baseX: number;
  baseY: number;
  scale: number;
  geometry?: THREE.BufferGeometry;
  scrollValue?: number;
}

export interface TransparentRef {
  materialRef: React.MutableRefObject<any>;
}

const Transparent = forwardRef<TransparentRef, TransparentProps>(({ type, baseX, baseY, scale, geometry, scrollValue = 0 }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const velocity = useRef(new THREE.Vector3());
  const lastViewingSpin = useRef(0);
  const currentSection3ScaleRef = useRef(1.0);

  useImperativeHandle(ref, () => ({
    materialRef
  }));

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
    velocity.current.y += forceY;
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      
      // Calculate progress exactly in sync with Section2 scroll physics
      let progress = scrollValue;
      if (scrollValue >= 0 && scrollValue <= 1.0) {
        progress = Math.max(0, (scrollValue - 0.2) / 0.8);
      }

      let slideMultiplier = 0;
      let section3UpwardOffset = 0;

      if (progress >= 0 && progress <= 1) { 
        slideMultiplier = 1.0 - progress; 
      } else if (progress > 1 && progress <= 2) {
        slideMultiplier = 0;
      } else if (progress > 2) { 
        slideMultiplier = 0; 
      }

      // If we are in Section 3, internalScrollValue increases from 0 to MAX_SCROLL
      // The CARD_SPACING in Section 3 is 6.5. 
      // Section 3 also dynamically scales down on mobile, which slows its vertical movement on screen.
      // We must apply the exact same scale factor here so they don't get 'left behind' by moving too fast!
      if (scrollManager.currentSection >= 2) {
        // Calculate the exact same smooth scale used by Section3/index.tsx
        const targetSection3Scale = Math.max(0.35, Math.min(1.0, state.viewport.width / 16.0));
        // Initialize instantly on first frame, otherwise lerp
        if (currentSection3ScaleRef.current === 1.0 && time < 0.5) currentSection3ScaleRef.current = targetSection3Scale;
        currentSection3ScaleRef.current = THREE.MathUtils.lerp(currentSection3ScaleRef.current, targetSection3Scale, 10 * dt);
        
        let effectiveInternalScroll = scrollManager.internalScrollValue;
        if (scrollManager.currentSection > 2) {
          // Keep them locked at the final scroll position of Section 3 instead of resetting
          effectiveInternalScroll = scrollManager.internalScrollLimits[2] || 7;
        }
        
        section3UpwardOffset = effectiveInternalScroll * 6.5 * currentSection3ScaleRef.current;
      }

      // Fast fade-in scale synced to progress
      let visibilityScale = 1.0;
      if (progress <= 1.0) {
        visibilityScale = Math.max(0, Math.min(progress * 1.5, 1.0));
      } 
      // Removed the shrink out so they stay visible as they move up
      meshRef.current.scale.setScalar(scale * visibilityScale);  

      // Calculate absolute spin tied to slide progress (increased from 5.0 to 10.0 for more rotation)
      const currentViewingSpin = slideMultiplier * 10.0;
      // Convert to a per-frame delta so we don't spin violently
      const viewingSpinDelta = currentViewingSpin - lastViewingSpin.current;
      lastViewingSpin.current = currentViewingSpin;

      // Calculate slide offsets based on object type for customized trajectories
      // Reduced travelDist so they don't start from too far away, naturally slowing down the visual speed and extending the "easing" feel
      const travelDist = 6.0; 
      let offsetX = 0;
      let offsetY = 0;
      
      if (type === 'cube') {
        // "more to the left than up"
        offsetX = -travelDist * slideMultiplier;
        offsetY = (travelDist * 0.3) * slideMultiplier;
      } else if (type === 'cylinder') {
        // "more to the bottom than the corner"
        offsetX = (travelDist * 0.3) * slideMultiplier;
        offsetY = -travelDist * slideMultiplier;
      }

      const offset = type === 'cylinder' ? 2 : 0;
      const speed = type === 'cylinder' ? 0.4 : 0.5;
      
      meshRef.current.position.set(
        baseX + offsetX, 
        baseY + offsetY + section3UpwardOffset + Math.sin(time * speed + offset) * 0.5, 
        6
      );
      
      velocity.current.multiplyScalar(0.98);
      
      const deltaRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          velocity.current.y * 3.0,
          velocity.current.x * 3.0 + 0.004,
          dt * 0.2 + viewingSpinDelta, // Add the *delta*!
          'XYZ'
        )
      );
      meshRef.current.applyQuaternion(deltaRotation);
    }
  });

  if (type === 'cube') {
    return (
      <RoundedBox 
        ref={meshRef as any}
        scale={scale}
        args={[1.5, 1.5, 1.5]} 
        radius={0.2} 
        smoothness={4}
        onPointerMove={handlePointerMove}
      >
        <glassMaterial ref={materialRef} transparent />
      </RoundedBox>
    );
  }

  return (
    <mesh
      ref={meshRef as any}
      scale={scale}
      geometry={geometry}
      onPointerMove={handlePointerMove}
    >
      <glassMaterial ref={materialRef} transparent />
    </mesh>
  );
});

export default Transparent;
