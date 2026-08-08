import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useScrollState } from '../../../utils/useScrollState';
import { scrollManager } from '../../../utils/ScrollManager';
import { experiences, EXPERIENCE_SPACING } from '../../../data/experience';

const BrightPoint = ({ opacityRef }: { opacityRef: React.MutableRefObject<number> }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uOpacity: { value: 0 },
    uTime: { value: 0 },
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uOpacity.value = opacityRef.current;
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(100, 32, 32);
    return geo;
  }, []);

  return (
    // Instead of baking rotation into geometry, apply it to the mesh so it can be transformed by parents
    <mesh ref={meshRef} position={[0, 0, 0]} geometry={geometry} renderOrder={999} rotation={new THREE.Euler(-1.50, 0.48, 0, 'YXZ')}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uOpacity;
          uniform float uTime;
          varying vec2 vUv;

          #define linearstep(edge0, edge1, x) min(max(((x) - (edge0)) / ((edge1) - (edge0)), 0.0), 1.0)

          void main() {
            // Atmospheric sky glow with per-channel chromatic aberration
            // Reduced multiplier from 10.0 to 8.0 to make it appear larger/closer to the camera
            vec3 sky = vec3(
              exp(-linearstep(1.0, 0.5, vUv.y + 0.00) * 12.0) * 0.6,
              exp(-linearstep(1.0, 0.5, vUv.y + 0.015) * 12.0) * 0.6,
              exp(-linearstep(1.0, 0.5, vUv.y + 0.03) * 12.0) * 0.6
            );

            // Intense bright point at the pole (vUv.y ≈ 1.0)
            // Increased to 8.0 to make the core much smaller
            sky += vec3(
              exp(-linearstep(1.0, 0.99, vUv.y) * 8.0)
            );

            // Animated atmospheric waves / shimmer
            sky += vec3(
              sin(vUv.y * 15.0 - 1.0 + uTime) * 0.1,
              sin(vUv.y * 15.0 - 0.5 + uTime) * 0.1,
              sin(vUv.y * 15.0 - 0.0 + uTime) * 0.1
            );

            sky = max(sky, 0.0);
            gl_FragColor = vec4(sky, uOpacity);
          }
        `}
      />
    </mesh>
  );
};

// A majestic swerving trail of light that swoops from the Bright Point down across the screen
const SwervingTrail = ({ opacityRef, mobileFactorRef }: { opacityRef: React.MutableRefObject<number>, mobileFactorRef?: React.MutableRefObject<number> }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry } = useMemo(() => {
    // Define the path of the trail to aggressively swoop towards the camera
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-46.06, 6.8, -88.47), // Lowered slightly from 7.07 so it attaches to the bottom edge of the core
      new THREE.Vector3(-12, -6, -40),      // Drop down and forward
      new THREE.Vector3(5, -12, -10),       // Swoop under center text, slightly right
      new THREE.Vector3(22, -15, 10),       // Passing close to camera on the right
      new THREE.Vector3(45, -20, 30)        // Exit past camera
    ], false, 'catmullrom', 0.5);

    // Create a tube geometry along the curve. Increase base radius slightly.
    const geo = new THREE.TubeGeometry(curve, 128, 0.4, 16, false);
    return { geometry: geo };
  }, []);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uOpacity.value = opacityRef.current;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    if (mobileFactorRef) {
      materialRef.current.uniforms.uMobileFactor.value = mobileFactorRef.current;
    }
  });

  return (
    <mesh frustumCulled={false} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        uniforms={{
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uMobileFactor: { value: 0 }
        }}
        vertexShader={`
          uniform float uTime;
          uniform float uMobileFactor;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            
            // Reconstruct the exact center point of the curve by moving inwards along the normal by the base radius (0.4)
            vec3 center = position - normal * 0.4;
            
            // Swaying effect: amplitude increases with a gentle gamma curve so we can see the bends at the start,
            // but the very tip (vUv.x = 0) stays completely still.
            // We strictly use X for sway to keep it moving left and right like a snake, instead of corkscrewing.
            float swayX = sin(vUv.x * 4.0 - uTime * 1.5) * pow(vUv.x, 0.6) * 8.0;
            float swayY = 0.0;
            
            center.x += swayX;
            center.y += swayY;
            
            // Tapering: we map the curve so that exactly 50% of the widening happens at the 0.30 threshold.
            // By wrapping a Photoshop-style midpoint power curve INSIDE a C2 'smootherstep',
            // we guarantee a perfectly sharp needle tip, exactly 50% width at 0.30, and a perfectly smooth plateau at the end.
            float midpoint = 0.30;
            float gamma = log(0.5) / log(midpoint);
            float u = pow(vUv.x, gamma);
            
            // Smootherstep (quintic) applied to the warped coordinate
            float expansion = u * u * u * (u * (u * 6.0 - 15.0) + 10.0);
            float newRadius = 0.05 + expansion * 4.5;
            
            vec3 finalPos = center + normal * newRadius;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uOpacity;
          uniform float uTime;
          uniform float uMobileFactor;
          varying vec2 vUv;
          
          void main() {
            // Because it is perfectly pointy at the head, we don't need a head fade.
            // On mobile, keep the normal length but use a slightly steeper power curve
            float p = mix(2.5, 3.5, uMobileFactor);
            float tailFade = pow(smoothstep(0.9, 0.0, vUv.x), p);
            
            // Soft glow on the outside, bright core on the inside of the tube
            float core = pow(sin(vUv.y * 3.14159), 3.0);
            
            // Pure, smooth beam without any fluid/pulsing effects
            // For mobile: start at 100% brightness at the head to connect smoothly, 
            // but aggressively dim down to 10% brightness VERY early (by 15% down the trail) 
            // because the text is actually located near the start of the curve!
            float mobileDimmer = mix(1.0, mix(1.0, 0.10, smoothstep(0.0, 0.15, vUv.x)), uMobileFactor);
            float alpha = tailFade * (core * 0.9 + 0.1) * mobileDimmer;
            
            // Pure white/blue beam
            vec3 color = vec3(0.9, 0.95, 1.0);
            
            // Add a white-hot core
            color += vec3(core * 0.8);
            
            gl_FragColor = vec4(color * alpha * uOpacity, 1.0);
          }
        `}
      />
    </mesh>
  );
};

// ==========================================
// TWEAK VARIABLES TO ADJUST WARP SPEED
// ==========================================
// This is the extra speed added to the particles when you scroll (triggering the shake/FOV effect)
export const WARP_MAX_SPEED = 200; 
// ==========================================

const BackgroundParticles = ({ opacityRef }: { opacityRef: React.MutableRefObject<number> }) => {
  const lineCount = 12; 
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { lines, centralDir, waveParams } = useMemo(() => {
    const temp = [];
    const waveArr = new Float32Array(lineCount * 3);
    
    const cDir = new THREE.Vector3(46, -7.07, 88).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(cDir, up).normalize();
    
    for (let i = 0; i < lineCount; i++) {
      const spreadAngle = (Math.random() * 0.4) + 0.05; 
      const spinAngle = Math.random() * Math.PI * 2;
      
      const dir = cDir.clone()
        .applyAxisAngle(right, spreadAngle)
        .applyAxisAngle(cDir, spinAngle)
        .normalize();
        
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      
      temp.push({
        dir,
        quat,
        baseSpeed: Math.random() * 40 + 20,
        currentDist: Math.random() * 250, // Start at a random position along the track
        length: Math.random() * 10 + 10, 
        thickness: Math.random() * 0.03 + 0.015
      });
      
      waveArr[i * 3 + 0] = Math.random() * 0.07 + 0.08;  
      waveArr[i * 3 + 1] = Math.random() * 0.5 + 0.6;     
      waveArr[i * 3 + 2] = Math.random() * Math.PI * 2;   
    }
    return { lines: temp, centralDir: cDir, waveParams: waveArr };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const origin = useMemo(() => new THREE.Vector3(-46, 7.07, -88), []);
  
  const warpIntensity = useRef(0);
  const warpTimer = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!meshRef.current || !materialRef.current) return;
    
    // Synchronize warp intensity with the global camera shake logic
    if (scrollManager.scrollValue >= 3.99 && scrollManager.rawScrollDelta > 0.001) {
      warpTimer.current = 1.0; // Matches SHAKE_DURATION
    }
    
    let targetWarp = 0;
    if (warpTimer.current > 0) {
      warpTimer.current -= dt;
      targetWarp = 1.0;
    }
    
    const lerpSpeed = 3.0; // Matches ATTACK_SPEED / DECAY_SPEED
    warpIntensity.current += (targetWarp - warpIntensity.current) * dt * lerpSpeed;
    
    lines.forEach((p, i) => {
      // Dynamically accelerate the particle!
      const currentSpeed = p.baseSpeed + warpIntensity.current * WARP_MAX_SPEED;
      
      // Integrate distance mathematically so it doesn't teleport when speed changes
      p.currentDist += currentSpeed * dt;
      if (p.currentDist > 250) {
        p.currentDist %= 250; // Loop back to the start
      }
      
      // Optimize allocation:
      dummy.position.copy(origin).addScaledVector(p.dir, p.currentDist);
      dummy.quaternion.copy(p.quat);
      
      // Normalize progress from 0 to 1 based on the 250 unit track
      const t = p.currentDist / 250.0;
      const fade = t < 0.1 ? 0.0 : t < 0.25 ? (t - 0.1) / 0.15 : t > 0.7 ? (1.0 - t) / 0.3 : 1.0;
      
      // Elongate the lines based on warp intensity (motion blur effect!)
      const currentLength = p.length + (warpIntensity.current * p.length * 2.0);
      dummy.scale.set(p.thickness, currentLength * fade, p.thickness); 
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    materialRef.current.uniforms.uOpacity.value = opacityRef.current;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, lineCount]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 1, 16, 64]}>
        <instancedBufferAttribute attach="attributes-waveParam" args={[waveParams, 3]} />
      </cylinderGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ 
          uOpacity: { value: 0 },
          uOrigin: { value: new THREE.Vector3(-46, 7.07, -88) },
          uDirection: { value: centralDir }
        }}
        vertexShader={`
          attribute vec3 waveParam;
          varying vec2 vUv;
          uniform vec3 uOrigin;
          uniform vec3 uDirection;
          
          void main() {
            vUv = uv;
            vec4 worldPos = instanceMatrix * vec4(position, 1.0);
            
            float freq = waveParam.x;
            float amp = waveParam.y;
            float phase = waveParam.z;
            
            float d = dot(worldPos.xyz - uOrigin, uDirection);
            float wave = sin(d * freq + phase) * amp;
            
            worldPos.y += wave;
            gl_Position = projectionMatrix * modelViewMatrix * worldPos;
          }
        `}
        fragmentShader={`
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float head = smoothstep(1.0, 0.98, vUv.y);
            float tail = smoothstep(0.0, 0.3, vUv.y);
            
            float alpha = head * tail;
            vec3 color = vec3(0.9, 0.95, 1.0);
            
            gl_FragColor = vec4(color * alpha * uOpacity * 0.6, 1.0);
          }
        `}
      />
    </instancedMesh>
  );
};



export const Section5 = () => {
  const groupRef = useRef<THREE.Group>(null);
  const innerGroupRef = useRef<THREE.Group>(null);
  
  const swoopProgress = useRef(0);
  const opacityRef = useRef(0);
  const mobileFactorRef = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const currentSection = scrollManager.currentSection;
    const internalScrollValue = scrollManager.internalScrollValue;
    const scrollValue = scrollManager.scrollValue;
    
    let swoopEase = 0;
    if (scrollValue >= 3.99) {
      swoopEase = 1.0;
    } else if (scrollValue > 2.5) {
      // Sync exactly with Section 4's swoop timing
      const lastNodeTrigger = (experiences.length - 1) * EXPERIENCE_SPACING; 
      const swoopStart = lastNodeTrigger + 8.0; 
      const swoopEnd = swoopStart + 10.0;
      
      const curveProgress = Math.max(0, Math.min(1, (internalScrollValue - swoopStart) / (swoopEnd - swoopStart)));
      swoopEase = curveProgress * curveProgress * (3 - 2 * curveProgress);
      
      // Match Section 4's reset glitch prevention
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
    } else {
      // If we are before Section 4, completely reset swoop
      swoopEase = 0;
    }
    
    swoopProgress.current = swoopEase;
    // Fade in entirely driven by the camera pitch, so it's impossible to see before looking up
    opacityRef.current = Math.max(0, (swoopEase - 0.2) * 1.25);
    
    groupRef.current.visible = opacityRef.current > 0;
    
    // Apply the rotation to the entire Section 5 group so both BrightPoint and SwervingTrail
    // rotate down synchronously into view.
    groupRef.current.rotation.x = (1.0 - swoopEase) * (Math.PI / 3);

    // Smooth responsive easing for inner group (translating and rotating to frame properly on mobile)
    const targetMobileFactor = THREE.MathUtils.clamp((15 - state.viewport.width) / 8, 0, 1);
    mobileFactorRef.current = THREE.MathUtils.lerp(mobileFactorRef.current, targetMobileFactor, 0.05);

    if (innerGroupRef.current) {
      innerGroupRef.current.position.x = THREE.MathUtils.lerp(0, -2, mobileFactorRef.current);
      innerGroupRef.current.rotation.y = THREE.MathUtils.lerp(0, -0.4, mobileFactorRef.current);
    }
  });

  return (
    // We pivot around the camera's Z position (15) so the rotation feels like looking up
    <group ref={groupRef} position={[0, 0, 15]}>
      {/* Offset the children back by -15 to place them in true world space */}
      {/* Smoothly lerped inner group for mobile framing */}
      <group 
        ref={innerGroupRef}
        position={[0, 0, -15]} 
        rotation={[0, 0, 0]}
      >
        <BrightPoint opacityRef={opacityRef} />
        <SwervingTrail opacityRef={opacityRef} mobileFactorRef={mobileFactorRef} />
        <BackgroundParticles opacityRef={opacityRef} />
      </group>
    </group>
  );
};
