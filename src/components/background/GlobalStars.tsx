import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollManager } from '../../utils/ScrollManager';
import { section4State } from '../sections/Section4';
import { experiences, EXPERIENCE_SPACING } from '../../data/experience';

export const GlobalStars = () => {
  const count = 2000;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const cDir = useMemo(() => new THREE.Vector3(46, -7.07, 88).normalize(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const isDust = i < 1000; // Half dust, half stars
      
      let x, y, z;
      if (isDust) {
        // Spread massively deep into the Z-axis to merge with background stars and give true 3D depth
        x = (Math.random() - 0.5) * 600;
        y = (Math.random() - 0.5) * 140 - 10;
        z = (Math.random() - 0.5) * 400 - 150;
      } else {
        // Broadly distributed across deep space
        // We shift the start pos in the NEGATIVE cDir direction by 300 units, 
        // so that as they travel 0-600 units along cDir, they remain perfectly centered on screen!
        x = (Math.random() - 0.5) * 1200 - cDir.x * 300;
        y = (Math.random() - 0.5) * 1200 - cDir.y * 300;
        z = (Math.random() - 0.5) * 1000 - 200 - cDir.z * 300; 
      }
      
      temp.push({
        isDust,
        startPos: new THREE.Vector3(x, y, z),
        currentDist: isDust ? 0 : Math.random() * 600, 
        baseSpeed: isDust ? 0 : Math.random() * 5 + 1, 
        // Crisp, slightly larger scale for optimized count
        scale: isDust ? Math.random() * 0.45 + 0.25 : Math.random() * 0.35 + 0.15,
        phase: Math.random() * Math.PI * 2,
        randomHash: Math.random()
      });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  
  const warpIntensity = useRef(0);
  const warpTimer = useRef(0);

  const swoopStart = 18.0; 
  const swoopEnd = 20.0;
  const WARP_MAX_SPEED = 200; 
  const swoopProgress = useRef(0);

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!meshRef.current || !materialRef.current) return;
    
    const time = clock.elapsedTime;
    const scrollValue = scrollManager.scrollValue;
    const internalScrollValue = scrollManager.internalScrollValue;
    
    // Global opacity: Only show particles/stars in Section 4 and 5
    let globalOpacity = 0.0;
    if (scrollValue >= 3.0) {
       globalOpacity = 1.0;
    } else if (scrollValue >= 2.0) {
       // Smoothly fade in during the transition into Section 4
       globalOpacity = scrollValue - 2.0;
    }
    materialRef.current.uniforms.uGlobalOpacity.value = globalOpacity;

    let swoopEase = 0;
    if (scrollValue >= 3.99) {
      swoopEase = 1.0;
    } else if (scrollValue > 2.5) {
      const lastNodeTrigger = (experiences.length - 1) * EXPERIENCE_SPACING;
      const swoopStart = lastNodeTrigger + 8.0; 
      const swoopEnd = swoopStart + 10.0;
      
      const curveProgress = Math.max(0, Math.min(1, (internalScrollValue - swoopStart) / (swoopEnd - swoopStart)));
      swoopEase = curveProgress * curveProgress * (3 - 2 * curveProgress);
      
      // Prevent snapping back to 0 if internalScrollValue resets to 0 while jumping to Section 5
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
    
    if (scrollValue >= 3.99 && scrollManager.rawScrollDelta > 0.001) {
      warpTimer.current = 1.0; 
    }
    
    let targetWarp = 0;
    if (warpTimer.current > 0) {
      warpTimer.current -= dt;
      targetWarp = 1.0;
    }
    
    const lerpSpeed = 3.0; 
    warpIntensity.current += (targetWarp - warpIntensity.current) * dt * lerpSpeed;
    
    particles.forEach((p, i) => {
      tempPos.copy(p.startPos);
      
      if (p.isDust) {
        // Expand the vertical spread by 5x so it fills the screen perfectly from top to bottom.
        // We do this BEFORE adding the cDir movement so we don't accidentally multiply its vertical speed!
        tempPos.y = (tempPos.y - 10.0) * (1.0 + 4.0 * swoopEase) + 10.0;
        
        // Section 4 forward movement (parallax)
        // Matched the scroll multiplier to 12.0 to perfectly sync with the text and terrain
        const forwardMove = (scrollManager.internalScrollValue * 12.0 + time * 5.0) * (1.0 - swoopEase);
        let rawZ = p.startPos.z + forwardMove;
        // Wrap Z continuously within a 400 unit depth (-350 to +50)
        let wrappedZ = ((rawZ + 350.0) % 400.0) - 350.0;
        tempPos.z += (wrappedZ - p.startPos.z);
        
        // Sine wave hovering for dust
        tempPos.x += Math.sin(time * 0.2 + p.phase) * 1.5;
        tempPos.y += Math.cos(time * 0.15 + p.phase) * 1.5;
        tempPos.z += Math.sin(time * 0.1 + p.phase) * 1.5;
      }
      
      const transitionSpeedBoost = swoopEase * (p.isDust ? 150.0 : 40.0);
      const shakeBoost = warpIntensity.current * WARP_MAX_SPEED;
      
      const currentSpeed = p.baseSpeed + transitionSpeedBoost + shakeBoost;
      p.currentDist += currentSpeed * dt;
      
      // Expand the clump of dust into a continuous stream over 600 units based on swoopEase
      const streamOffset = p.isDust ? p.randomHash * 600.0 * swoopEase : 0;
      let totalDist = p.currentDist + streamOffset;
      
      if (totalDist > 600) {
        totalDist = totalDist % 600; 
      }
      
      // When going back to Section 4 (swoopEase -> 0), pull everything back to the origin
      const actualDist = p.isDust ? (totalDist * swoopEase) : totalDist;
      
      tempPos.addScaledVector(cDir, actualDist);
      
      // CRITICAL FIX: The actualDist pushes all particles massively in the +cDir direction (forward/right).
      // For stars, we compensated by shifting their startPos back by 300.
      // For dust, we can't shift startPos because it ruins Section 4.
      // Instead, we dynamically pull the dust stream back by 300 units based on swoopEase!
      // This perfectly centers the stream horizontally on the screen in Section 5.
      if (p.isDust) {
        tempPos.addScaledVector(cDir, -300.0 * swoopEase);
        
        // Also center the stream vertically (cancel out the original Y=10 terrain position)
        tempPos.y -= 10.0 * swoopEase;
      }
      
      // Tracking Section 4 drone sweep
      const trackingFactor = p.isDust ? THREE.MathUtils.lerp(1.0, 0.15, swoopEase) : 0.15;
      tempPos.x += section4State.droneOffsetX * trackingFactor;
      tempPos.y += section4State.droneOffsetY * trackingFactor;
      
      // Vertical scroll parallax (Disable completely for dust to prevent it from shifting off the top of the screen)
      const scrollParallaxFactor = p.isDust ? 0.0 : 1.0;
      tempPos.y += scrollValue * 10.0 * scrollParallaxFactor;
      
      dummy.position.copy(tempPos);
      
      // Simple billboard: ALWAYS face the camera perfectly so they look like solid 3D spheres
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.set(p.scale, p.scale, p.scale);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Update Shader Uniforms
    materialRef.current.uniforms.uTime.value = time;
    
    // Global opacity: Only show particles/stars in Section 4 and 5
    let globalOpacityAtEnd = 0.0;
    if (scrollValue >= 3.0) {
       globalOpacityAtEnd = 1.0;
    } else if (scrollValue >= 2.0) {
       // Smoothly fade in during the transition into Section 4
       globalOpacityAtEnd = scrollValue - 2.0;
    }
    materialRef.current.uniforms.uGlobalOpacity.value = globalOpacityAtEnd;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ 
          uTime: { value: 0 },
          uGlobalOpacity: { value: 1.0 }
        }}
        vertexShader={`
          varying vec3 vWorldPos;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
            vWorldPos = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uGlobalOpacity;
          varying vec3 vWorldPos;
          varying vec2 vUv;
          
          void main() {
            // Replicate the soft circle shape using UVs
            float d = distance(vUv, vec2(0.5));
            // Sharpened the edge to prevent excessive blurriness
            float alpha = smoothstep(0.5, 0.45, d);
            
            // Volumetric spotlight lighting (simulated from [0, 20, 20])
            vec3 lightPos = vec3(0.0, 20.0, 20.0);
            float distToLight = length(lightPos - vWorldPos);
            float lightAtten = 1.0 / (1.0 + 0.02 * distToLight * distToLight);
            
            vec3 baseColor = vec3(0.5, 0.6, 0.7);
            vec3 litColor = vec3(1.0, 1.0, 1.0);
            vec3 finalColor = mix(baseColor, litColor, lightAtten * 2.0);
            
            // Passive pulsing / twinkling effect
            float pulse = sin(uTime * 2.0 + vWorldPos.x * 0.1) * 0.5 + 0.5;
            
            // Just use a tiny near-plane fade to prevent ugly clipping, otherwise keep them fully visible
            float distToCam = distance(vWorldPos, cameraPosition);
            float nearClipFade = smoothstep(0.5, 2.0, distToCam);
            
            float finalAlpha = alpha * uGlobalOpacity * nearClipFade * (0.3 + pulse * 0.7);
            gl_FragColor = vec4(finalColor, finalAlpha);
          }
        `}
      />
    </instancedMesh>
  );
};
