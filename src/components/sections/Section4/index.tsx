import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpotLight, Stars } from '@react-three/drei';
import { Terrain } from './Terrain';
import { scrollManager } from '../../../utils/ScrollManager';
import { experiences, EXPERIENCE_SPACING } from '../../../data/experience';

import { ExperienceNodes } from './ExperienceNodes';

const SkyGradient = ({ opacity }: { opacity: number }) => {
// ... existing SkyGradient code
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uColorBottom: { value: new THREE.Color('#333333') }, // Lighter at the horizon
    uColorTop: { value: new THREE.Color('#000000') },    // Black at the top
    uOpacity: { value: opacity }
  }), []);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uOpacity.value = opacity;
    }
  });

  return (
    <mesh position={[0, 0, -120]}>
      <planeGeometry args={[350, 350]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColorBottom;
          uniform vec3 uColorTop;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            // Gradient from bottom (horizon) to top
            // Map vUv.y such that the horizon is around the middle or bottom
            float mixValue = smoothstep(0.2, 0.8, vUv.y);
            vec3 color = mix(uColorBottom, uColorTop, mixValue);
            gl_FragColor = vec4(color, uOpacity);
          }
        `}
      />
    </mesh>
  );
};

export const section4State = {
  droneOffsetX: 0,
  droneOffsetY: 0
};

export const Section4: React.FC<{ scrollValue: number }> = ({ scrollValue }) => {
  const groupRef = useRef<THREE.Group>(null);
  const activeNodePosRef = useRef(new THREE.Vector3(0, 0, 0));
  const activeNodeRotRef = useRef(0.0);
  
  useEffect(() => {
    const lastNodeTrigger = (experiences.length - 1) * EXPERIENCE_SPACING; 
    const swoopStart = lastNodeTrigger + 8.0; 
    const swoopEnd = swoopStart + 10.0;
    // End the section exactly when the swoop finishes so there is no dead space
    const totalScrollLimit = swoopEnd;
    scrollManager.setInternalScrollLimit(3, totalScrollLimit);
  }, []);

  // We need to manage the overall opacity of Section 4 based on scroll
  const currentOpacity = useRef(0);
  const swoopProgress = useRef(0);
  const starsRef = useRef<any>(null);



  useFrame(() => {
    if (!groupRef.current) return;

    let opacity = 0;
    
    // Fade in during transition (2.0 to 3.0)
    if (scrollValue >= 2.0 && scrollValue < 3.0) {
      const progress = scrollValue - 2.0; 
      opacity = progress;
    } 
    // Fully visible from 3.0 onwards
    else if (scrollValue >= 3.0) {
      opacity = 1;
    }

    // Move the entire section up smoothly as we enter
    let yOffset = 0;
    if (scrollValue >= 2.0 && scrollValue < 3.0) {
      const progress = scrollValue - 2.0;
      // Start low (-30 units) and ease up to 0
      yOffset = -30 * (1 - Math.pow(progress, 3)); 
    }
    
    // Hide the entire section if it's completely transparent
    groupRef.current.visible = opacity > 0;

    // Apply the drone camera effect
    // As the drone banks to look at an angled node, the entire scene rotates in the opposite direction
    const droneBank = -activeNodeRotRef.current;
    
    // As the drone flies towards an active node, the entire scene shifts in the opposite direction.
    // Because we rotate the scene around the camera (Z=15), we only need to counteract the X rotation scaling.
    const droneOffsetX = -activeNodePosRef.current.x * Math.cos(droneBank);
    const droneOffsetY = -activeNodePosRef.current.y;

    // Dynamic swoop timing based on experience count
    const lastNodeTrigger = (experiences.length - 1) * EXPERIENCE_SPACING; // e.g. 6.0
    // Node reaches camera at trigger + 4.5. Wait for it to pass (trigger + 8.0)
    const swoopStart = lastNodeTrigger + 8.0; 
    const swoopEnd = swoopStart + 10.0;
    
    // Curve path looking up at the sky near the end of the section
    // MUST use internalScrollValue — scrollValue stays locked at 3.0 while inside Section 4
    const internalScroll = scrollManager.internalScrollValue;
    
    let swoopEase = 0;
    if (scrollValue >= 3.99) {
      swoopEase = 1.0;
    } else {
      const curveProgress = Math.max(0, Math.min(1, (internalScroll - swoopStart) / (swoopEnd - swoopStart)));
      // Smooth easing for the swoop (cubic in-out)
      swoopEase = curveProgress * curveProgress * (3 - 2 * curveProgress);
      
      // Detect section-transition reset if they navigate backwards quickly
      if (scrollManager.currentSection >= 4) {
        swoopEase = Math.max(swoopEase, swoopProgress.current);
      }
      
      // Failsafe for rapid scrolling: If the global scrollValue is actively transitioning to Section 5,
      // guarantee that swoopEase ramps up to 1.0 synchronously, preventing snaps.
      if (scrollValue > 3.0) {
        const globalProgress = Math.max(0, Math.min(1, scrollValue - 3.0));
        const smoothGlobal = globalProgress * globalProgress * (3 - 2 * globalProgress);
        swoopEase = Math.max(swoopEase, smoothGlobal);
      }
    }
    
    swoopProgress.current = swoopEase;
    
    // Pitch the scene down (so camera looks up) - up to 60 degrees
    const pitchAngle = swoopEase * (-Math.PI / 3);
    // Drop the scene down (so camera moves up) for a curved flight path
    const swoopY = swoopEase * -30.0;

    // Smoothly return the drone to center (0,0) as we pitch up for the transition
    const centeringFactor = 1.0 - swoopEase;
    const finalOffsetX = droneOffsetX * centeringFactor;
    const finalOffsetY = (yOffset + droneOffsetY) * centeringFactor + swoopY;
    
    groupRef.current.position.x = finalOffsetX;
    groupRef.current.position.y = finalOffsetY;
    
    // Apply rotations (XYZ order means pitch first, then yaw/bank)
    groupRef.current.rotation.set(pitchAngle, droneBank * centeringFactor, 0, 'XYZ');
    
    section4State.droneOffsetX = finalOffsetX;
    section4State.droneOffsetY = finalOffsetY;
    
    currentOpacity.current = opacity;
    swoopProgress.current = swoopEase;
  });

  return (
    // The outer group acts as a pivot point located exactly at the camera's Z position (15)
    // This ensures that when the scene rotates, items currently hitting the camera do not swing out of view!
    <group position={[0, 0, 15]}>
      {/* Global volumetric spotlight illuminating the entire map from above */}
      <SpotLight
        position={[0, 20, 5]}
        angle={0.6}
        penumbra={1}
        intensity={2.0}
        distance={60}
        color="#ffffff"
        opacity={0.15}
        volumetric
      />
      
      {/* The moving map container */}
      <group ref={groupRef}>
        {/* We offset the contents back by -15 so they render at their correct true depth */}
        <group position={[0, 0, -15]}>
        <SkyGradient opacity={currentOpacity.current} />
        <Terrain opacityRef={currentOpacity} swoopRef={swoopProgress} />
        <ExperienceNodes opacityRef={currentOpacity} activeNodePosRef={activeNodePosRef} activeNodeRotRef={activeNodeRotRef} />
        </group>
      </group>
      
      {/* Removed BrightPoint as it has been moved to Section5 */}
    </group>
  );
};
