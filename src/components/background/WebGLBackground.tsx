import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import Section2 from '../sections/Section2';
import { Section3 } from '../sections/Section3';
import { Section4 } from '../sections/Section4';
import { Section5 } from '../sections/Section5';
import Section13D from '../sections/Section1/Section13D';
import { useScrollState } from '../../utils/useScrollState';
import { scrollManager } from '../../utils/ScrollManager';
import { RefractionManager } from '../../utils/GlobalRefraction';
import { GlobalStars } from './GlobalStars';

// Camera Rig to handle mouse tracking, parallax, and scroll shake
const CameraRig = () => {
  const { camera } = useThree();
  const vec = new THREE.Vector3();
  
  // State to hold the current intensity and the delay timer
  const shakeIntensity = useRef(0);
  const shakeTimer = useRef(0);

  // ==========================================
  // TWEAK VARIABLES TO ADJUST SHAKE ADJUSTMENTS
  // ==========================================
  const SHAKE_INTENSITY = 9;     // The overall speed of the drift/shake (frequency)
  const SHAKE_MAGNITUDE = 0.007; // How far the camera rotates (distance)
  const SHAKE_DURATION = 1.0;    // How long (in seconds) the shake stays at MAX before fading
  const ATTACK_SPEED = 3.0;      // How fast the shake/FOV eases IN when you start scrolling (lower is slower)
  const DECAY_SPEED = 3.0;       // How fast the shake fades out to zero after the duration ends
  const FOV_BOOST = 5;           // How much the FOV increases during the shake (e.g. zooms out)
  const BASE_FOV = 40;           // Base camera FOV
  // ==========================================

  useFrame(({ clock, pointer }, delta) => {
    // Clamp delta to prevent huge jumps when alt-tabbing (inactive tab)
    const dt = Math.min(delta, 0.1);

    const targetX = pointer.x * 1.2;
    const targetY = pointer.y * 1.2;
    
    // Smooth lerp to mouse position
    camera.position.lerp(vec.set(targetX, targetY, 15), dt * 4);
    camera.lookAt(0, 0, 0);
    
    // Trigger shake camera aggressively ONLY when scrolling down (forward) in Section 5
    if (scrollManager.scrollValue >= 3.99 && scrollManager.rawScrollDelta > 0.001) {
      shakeTimer.current = SHAKE_DURATION; // Reset the delay timer
    }
    
    let targetShake = 0;
    if (shakeTimer.current > 0) {
      shakeTimer.current -= dt;
      targetShake = 1.0; // Stay at max while timer is active
    }
    
    // Attack (ease in) and Decay (ease out) speeds
    const lerpSpeed = targetShake > shakeIntensity.current ? ATTACK_SPEED : DECAY_SPEED;
    shakeIntensity.current += (targetShake - shakeIntensity.current) * dt * lerpSpeed;
    
    // Dynamically adjust FOV based on shake intensity
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    perspectiveCamera.fov = BASE_FOV + (FOV_BOOST * shakeIntensity.current);
    perspectiveCamera.updateProjectionMatrix();

    if (shakeIntensity.current > 0.0001) {
      const timeScale = SHAKE_INTENSITY;
      const t = clock.elapsedTime * timeScale; 
      
      // Slower, smoother sine waves for a "drifting" feel rather than a fast jitter
      const pitchShake = Math.sin(t * 1.5) * Math.sin(t * 0.8) * SHAKE_MAGNITUDE * shakeIntensity.current;
      const yawShake = Math.sin(t * 1.1) * Math.sin(t * 1.3) * SHAKE_MAGNITUDE * shakeIntensity.current;
      
      // Apply rotational shake on top of the base lookAt rotation
      camera.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitchShake, yawShake, 0)));
    }
  });

  return null;
};

// Custom shader background to create the "Frosted Glass" effect with colorful blobs and grain
const FrostedBackground = () => {
  const { scrollValue } = useScrollState();
  const materialRef = React.useRef<THREE.ShaderMaterial>(null);
  const { viewport, camera } = useThree();
  const vec = React.useRef(new THREE.Vector3());

  // Calculate the exact visible bounds at Z = -50
  const currentViewport = viewport.getCurrentViewport(camera, vec.current.set(0, 0, -50));
  
  // Pad by 1.2x to ensure the camera rig's parallax movement never exposes the edges
  const planeWidth = currentViewport.width * 1.2;
  const planeHeight = currentViewport.height * 1.2;

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      materialRef.current.uniforms.uScroll.value = scrollValue;
    }
  });

  return (
    <mesh position={[0, 0, -50]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <shaderMaterial
        ref={materialRef}
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uScroll: { value: 0 }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uScroll;
          varying vec2 vUv;

          // Simple 2D noise for grain
          float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

          void main() {
            // Base light mode color
            vec3 bgCol = vec3(0.96, 0.97, 0.98);

            // Animated colorful blobs (soft pastel)
            float blob1 = smoothstep(0.6, 0.0, distance(vUv, vec2(0.3 + sin(uTime * 0.2) * 0.1, 0.4 + cos(uTime * 0.3) * 0.1)));
            float blob2 = smoothstep(0.7, 0.0, distance(vUv, vec2(0.7 + cos(uTime * 0.25) * 0.1, 0.6 + sin(uTime * 0.2) * 0.1)));
            float blob3 = smoothstep(0.6, 0.0, distance(vUv, vec2(0.5, 0.2 + sin(uTime * 0.4) * 0.1)));

            bgCol = mix(bgCol, vec3(0.75, 0.85, 1.0), blob1 * 0.5); // Soft blue
            bgCol = mix(bgCol, vec3(1.0, 0.85, 0.9), blob2 * 0.5);  // Soft pink
            bgCol = mix(bgCol, vec3(0.85, 0.95, 0.9), blob3 * 0.5); // Soft mint

            // Add fine noise (grain) to create the "frosted glass" texture
            float grain = hash(vUv * 1000.0 + uTime);
            bgCol -= grain * 0.03;

            // Fade to pure white when scrolling down to section 2/3
            // Also fade to black when scrolling to section 4 (scrollValue > 2)
            float fadeWhite = clamp(uScroll * 2.0, 0.0, 1.0);
            bgCol = mix(bgCol, vec3(1.0), fadeWhite);
            
            float fadeBlack = clamp((uScroll - 2.0), 0.0, 1.0);
            bgCol = mix(bgCol, vec3(0.0), fadeBlack);

            gl_FragColor = vec4(bgCol, 1.0);
          }
        `}
      />
    </mesh>
  );
};

const WebGLBackground: React.FC = () => {
  const { currentSection, scrollValue } = useScrollState();
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, background: '#ffffff' }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 40, near: 0.01 }} dpr={[1, 2]}>
        <FrostedBackground />
        <GlobalStars />

        <CameraRig />
        <Environment preset="city" />
        <RefractionManager />
        
        {/* Render Section 1 (Index 0) */}
        <React.Suspense fallback={null}>
          <Section13D 
            opacity={Math.max(0, Math.min(1, 1 - (scrollValue - 0.2) * 2.0))}
            scrollValue={scrollValue} 
          />
        </React.Suspense>
        
        {/* Render Scene 2 (Index 1) */}
        <Section2 
          viewingState={currentSection === 1 ? 'viewing' : currentSection > 1 ? 'passed' : 'ready'} 
          scrollValue={scrollValue}
        />
        
        {/* Render Scene 3 (Index 2) */}
        <Section3 
          scrollValue={scrollValue}
        />
        
        {/* Render Scene 4 (Index 3) */}
        <Section4 
          scrollValue={scrollValue}
        />
        
        {/* Render Scene 5 (Index 4) */}
        <Section5 />
      </Canvas>
    </div>
  );
};

export default WebGLBackground;
