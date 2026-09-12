import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Center, useFBO, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { useQuality } from '../../../hooks/useQuality';
import { globalRenderState } from '../../../utils/RenderState';

interface Section13DProps {
  opacity: number;
  scrollValue?: number;
}

const MAX_TRAIL = 40;

const ForcefieldLens: React.FC<{ opacity: number }> = ({ opacity }) => {
  const fbo = useFBO();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();
  
  // Pre-allocate fixed trail objects to eliminate GC allocation churn
  const trailRef = useRef<{ x: number; y: number; age: number }[]>(
    Array.from({ length: MAX_TRAIL }, () => ({ x: 0.5, y: 0.5, age: 0 }))
  );
  const trailDataArray = useRef(new Float32Array(MAX_TRAIL * 3));
  const boundsVec = useRef(new THREE.Vector4(-1.0, -1.0, -1.0, -1.0));
  
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0.5, 0.5));
  const mouseVel = useRef<THREE.Vector2>(new THREE.Vector2(0.0, 0.0));
  const speedEnvelope = useRef<number>(0.0);
  const timeSinceLastPoint = useRef<number>(0.0);
  const initializedRef = useRef(false);

  useEffect(() => {
    return () => {
      globalRenderState.isSection1Active = false;
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const isSectionActive = opacity > 0.01;
    globalRenderState.isSection1Active = isSectionActive;

    if (!isSectionActive || !meshRef.current) {
      // Do NOT call state.gl.render here! RefractionManager handles screen rendering when Section 1 is inactive.
      return;
    }
    
    const targetX = (pointer.x * 0.5 + 0.5);
    const targetY = (pointer.y * 0.5 + 0.5);
    
    if (!initializedRef.current && (targetX !== 0.5 || targetY !== 0.5)) {
       mousePos.current.set(targetX, targetY);
       trailRef.current.forEach(pt => {
         pt.x = targetX;
         pt.y = targetY;
         pt.age = 0;
       });
       initializedRef.current = true;
    }
    
    // Fluid Glide Physics
    const stiffness = 0.06; 
    const damping = 0.65;
    
    mouseVel.current.x += (targetX - mousePos.current.x) * stiffness;
    mouseVel.current.y += (targetY - mousePos.current.y) * stiffness;
    mouseVel.current.x *= damping;
    mouseVel.current.y *= damping;
    mousePos.current.x += mouseVel.current.x;
    mousePos.current.y += mouseVel.current.y;
    
    // Dynamic Time-to-Settle Calculation!
    // Faster movements create a larger disturbance, so they should take longer to slide back to normal.
    const speed = mouseVel.current.length();
    
    // Instant attack, slow release envelope
    if (speed > speedEnvelope.current) {
      speedEnvelope.current = speed;
    } else {
      speedEnvelope.current = THREE.MathUtils.lerp(speedEnvelope.current, 0, dt * 2.0);
    }
    
    // Map the envelope to a decay rate. 
    // Small/slow movements = 3.0 (fades quickly in 0.33s, snappy).
    // Massive, fast movements = approaches 0.6 (takes up to 1.6s to gracefully settle back).
    let decayRate = 3.0 - (speedEnvelope.current * 30.0);
    decayRate = THREE.MathUtils.clamp(decayRate, 0.6, 3.0);
    
    const trail = trailRef.current;
    
    // Fixed history snapshot interval (25ms = 40Hz)
    // 40 points perfectly spans 1.0s of history with smooth segment interpolation
    timeSinceLastPoint.current += dt;
    if (timeSinceLastPoint.current >= 0.025) {
      // Shift history points in-place without array reallocation or splice
      for (let i = MAX_TRAIL - 1; i > 0; i--) {
        trail[i].x = trail[i - 1].x;
        trail[i].y = trail[i - 1].y;
        trail[i].age = trail[i - 1].age;
      }
      trail[0].x = mousePos.current.x;
      trail[0].y = mousePos.current.y;
      trail[0].age = speedEnvelope.current > 0.0005 ? 1.0 : Math.max(0, trail[0].age - dt * decayRate);
      timeSinceLastPoint.current %= 0.025;
    } else {
      trail[0].x = mousePos.current.x;
      trail[0].y = mousePos.current.y;
      if (speedEnvelope.current > 0.0005) {
        trail[0].age = 1.0;
      }
    }
    
    // Apply the dynamic settle time
    for (let i = 1; i < MAX_TRAIL; i++) {
      if (trail[i].age > 0) {
        trail[i].age -= dt * decayRate;
      }
    }
    
    // Compute bounding box in aspect-corrected UV space and populate typed array in-place
    const aspect = state.size.width / state.size.height;
    let activeCount = 0;
    let minAspectX = Infinity;
    let maxAspectX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const uPoints = trailDataArray.current;
    for (let i = 0; i < MAX_TRAIL; i++) {
      const pt = trail[i];
      if (pt.age > 0.001) {
        activeCount = i + 1;
        uPoints[i * 3 + 0] = pt.x;
        uPoints[i * 3 + 1] = pt.y;
        uPoints[i * 3 + 2] = pt.age;

        const ax = pt.x * aspect;
        if (ax < minAspectX) minAspectX = ax;
        if (ax > maxAspectX) maxAspectX = ax;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      } else {
        uPoints[i * 3 + 0] = 0;
        uPoints[i * 3 + 1] = 0;
        uPoints[i * 3 + 2] = 0;
      }
    }

    // Maximum influence radius in aspect UV space (w > 0.001 within radius 0.18)
    const padding = 0.20;
    if (activeCount > 1 && maxAspectX >= minAspectX) {
      boundsVec.current.set(
        minAspectX - padding,
        minY - padding,
        maxAspectX + padding,
        maxY + padding
      );
    } else {
      // Completely off-screen / inactive bounds -> 100% of fragments early exit!
      boundsVec.current.set(-1.0, -1.0, -1.0, -1.0);
    }
    
    // 1. Render clean scene into FBO
    meshRef.current.visible = false;
    state.gl.setRenderTarget(fbo);
    state.gl.render(state.scene, state.camera);
    state.gl.setRenderTarget(null);
    meshRef.current.visible = true;

    // 2. Pass uniforms and render to screen
    if (materialRef.current) {
      materialRef.current.uniforms.tDiffuse.value = fbo.texture;
      materialRef.current.uniforms.opacity.value = opacity;
      materialRef.current.uniforms.resolution.value.set(fbo.width, fbo.height);
      materialRef.current.uniforms.uBounds.value.copy(boundsVec.current);
      materialRef.current.uniforms.uActiveCount.value = activeCount;
      materialRef.current.uniforms.trailData.value = uPoints;
    }

    state.gl.render(state.scene, state.camera);
  }, 2);

  if (opacity <= 0.01) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 14]}>
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={{
          tDiffuse: { value: null },
          opacity: { value: opacity },
          resolution: { value: new THREE.Vector2(1, 1) },
          uBounds: { value: new THREE.Vector4(-1, -1, -1, -1) },
          uActiveCount: { value: 0 },
          trailData: { value: trailDataArray.current }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D tDiffuse;
          uniform float opacity;
          uniform vec2 resolution;
          uniform vec4 uBounds;
          uniform int uActiveCount;
          uniform vec3 trailData[${MAX_TRAIL}];
          varying vec2 vUv;
          
          vec2 sdSegmentWithT( in vec2 p, in vec2 a, in vec2 b ) {
            vec2 pa = p-a, ba = b-a;
            float d = dot(ba, ba);
            float h = d > 0.000001 ? clamp( dot(pa,ba)/d, 0.0, 1.0 ) : 0.0;
            return vec2(length( pa - ba*h ), h);
          }
          
          void main() {
            vec2 screenUv = gl_FragCoord.xy / resolution;
            float aspect = resolution.x / resolution.y;
            vec2 aspectUv = vec2(screenUv.x * aspect, screenUv.y);

            // Bounding box early exit: 90-100% of fragments outside the cursor wake exit instantly in 1 sample!
            if (aspectUv.x < uBounds.x || aspectUv.x > uBounds.z ||
                aspectUv.y < uBounds.y || aspectUv.y > uBounds.w) {
              gl_FragColor = texture2D(tDiffuse, screenUv);
              gl_FragColor.a *= opacity;
              return;
            }
            
            vec2 velSum = vec2(0.0);
            float weightSum = 0.0;
            float maxWeight = 0.0;
            
            for (int i = 0; i < ${MAX_TRAIL} - 1; i++) {
              if (i >= uActiveCount - 1) break;

              vec3 p1 = trailData[i];
              vec3 p2 = trailData[i+1];
              
              if (p1.z <= 0.0) break; 
              
              if (p1.z > 0.0 && p2.z > 0.0) {
                vec2 aP1 = vec2(p1.x * aspect, p1.y);
                vec2 aP2 = vec2(p2.x * aspect, p2.y);
                
                vec2 segInfo = sdSegmentWithT(aspectUv, aP1, aP2);
                float dist = segInfo.x;
                float t = segInfo.y;
                
                float segmentAge = mix(p1.z, p2.z, t);
                float ageEased = smoothstep(0.0, 1.0, segmentAge);
                
                float variance = 0.005; 
                float w = exp(-(dist * dist) / variance) * ageEased;
                
                if (w > 0.001) {
                  vec2 dir = p1.xy - p2.xy;
                  velSum += dir * w;
                  weightSum += w;
                  if (w > maxWeight) { maxWeight = w; }
                }
              }
            }
            
            vec2 avgVel = vec2(0.0);
            if (weightSum > 0.0) {
               avgVel = velSum / weightSum;
            }
            
            float speed = length(avgVel);
            float maxSpeed = 0.025; 
            if (speed > 0.0) {
               float softSpeed = maxSpeed * tanh(speed / maxSpeed);
               avgVel = (avgVel / speed) * softSpeed;
            }
            
            vec2 vel = avgVel * maxWeight;
            
            float mag = length(vel);
            if (mag < 0.0001) {
              gl_FragColor = texture2D(tDiffuse, screenUv);
              gl_FragColor.a *= opacity;
              return;
            }
            
            vec2 offset = vel * 2.5;
            
            // Base layer
            vec3 finalColor = texture2D(tDiffuse, screenUv - offset * 0.2).rgb;
            
            // "SMUDGE" GHOSTS (True motion blur)
            for (float i = 1.0; i <= 3.0; i++) {
                vec2 smudgeOffset = offset * (0.2 + i * 0.8); 
                vec3 sampleCol = texture2D(tDiffuse, screenUv - smudgeOffset).rgb;
                
                float bandOpacity = 0.5 - (i * 0.12);
                finalColor = mix(finalColor, sampleCol, bandOpacity);
            }
            
            gl_FragColor = vec4(finalColor, opacity);
          }
        `}
      />
    </mesh>
  );
};

const InteractiveCircle = ({ initialPos, size, color, floatSpeed, floatOffset, mobilePush = 0 }: { initialPos: [number, number, number], size: number, color: string, floatSpeed: number, floatOffset: number, mobilePush?: number }) => {
  const { circleSegments } = useQuality();
  const meshRef = useRef<THREE.Mesh>(null);
  const target = useRef(new THREE.Vector3(...initialPos));
  const vec = new THREE.Vector3();

  useFrame((state) => {
    if (!meshRef.current) return;

    // Responsive scaling for the individual circle (clamped 0.7 to 1.0)
    const desiredScale = THREE.MathUtils.clamp(state.viewport.width / 18, 0.7, 1.0);
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, desiredScale, 0.05));

    // Slow, lazy floating animation
    const time = state.clock.elapsedTime;
    const driftX = Math.sin(time * floatSpeed + floatOffset) * 2.5;
    const driftY = Math.cos(time * floatSpeed * 0.8 + floatOffset) * 2.5;

    // Get viewport dimensions at the circle's exact depth to correctly map mouse coords
    const viewport = state.viewport.getCurrentViewport(state.camera, vec.set(0, 0, initialPos[2]));

    // Dynamically spread the X position based on the true viewport width at this specific depth.
    // Clamp the spread at 1.2 so they don't fly off the screen on massive ultrawide monitors.
    const xSpread = Math.min(viewport.width / 35, 1.2); 
    let targetX = initialPos[0] * xSpread;
    const targetY = initialPos[1];

    // Push specific circles further towards the edges on mobile/portrait screens without affecting desktop
    if (mobilePush !== 0 && state.viewport.width < 15) {
      const mobileFactor = THREE.MathUtils.clamp((15 - state.viewport.width) / 8, 0, 1);
      targetX += mobilePush * mobileFactor;
    }

    const basePos = new THREE.Vector3(targetX + driftX, targetY + driftY, initialPos[2]);
    
    // Map NDC pointer (-1 to +1) to world coordinates at this specific Z-depth
    const mouseWorldX = (state.pointer.x * viewport.width) / 2;
    const mouseWorldY = (state.pointer.y * viewport.height) / 2;
    const mouseWorld = new THREE.Vector3(mouseWorldX, mouseWorldY, initialPos[2]);

    const dist = meshRef.current.position.distanceTo(mouseWorld);
    const repulsionRadius = 15 + size * 0.5; // Bigger circles have slightly larger repulsion radius
    
    // Default target is the drifting base position
    target.current.copy(basePos);

    if (dist < repulsionRadius) {
      // The closer the mouse, the stronger the push (quadratic falloff for smoother feel)
      const force = Math.pow((repulsionRadius - dist) / repulsionRadius, 2);
      
      // Calculate direction from mouse to circle
      const dir = meshRef.current.position.clone().sub(mouseWorld).normalize();
      
      // Push the target position away
      target.current.add(dir.multiplyScalar(force * 12)); 
    }

    // Spring physics: smoothly interpolate current position toward the target position
    meshRef.current.position.lerp(target.current, 0.08);
  });

  return (
    <mesh ref={meshRef} position={initialPos}>
      <circleGeometry args={[size, circleSegments]} />
      {/* Retain built-in transmission so the glass circles and refracted text never look dull */}
      <meshPhysicalMaterial 
        color={color}
        transmission={1.0}
        roughness={0.4}
        thickness={2.0}
        ior={1.2}
        envMapIntensity={0.0} // Prevents horizon line reflection
        transparent
      />
    </mesh>
  );
};

const InteractiveCircles = () => {
  return (
    <group>
      {/* Added mobilePush to manually adjust X positions on portrait screens without affecting ultrawide/desktop base positions */}
      <InteractiveCircle initialPos={[-12, 10, -20]} size={3} color="#ffffff" floatSpeed={0.3} floatOffset={0} />
      <InteractiveCircle initialPos={[10, -12, -25]} size={6} color="#f8f9fa" floatSpeed={0.2} floatOffset={10} mobilePush={4} />
      <InteractiveCircle initialPos={[15, 14, -30]} size={9} color="#f1f3f5" floatSpeed={0.15} floatOffset={20} />
      <InteractiveCircle initialPos={[-15, -14, -35]} size={12} color="#e9ecef" floatSpeed={0.25} floatOffset={30} mobilePush={-4} />
    </group>
  );
};

const Section13D: React.FC<Section13DProps> = ({ opacity, scrollValue = 0 }) => {
  const { textCurveSegments, textBevelSegments } = useQuality();
  const groupRef = useRef<THREE.Group>(null);
  const targetTextScale = useRef(1);

  useFrame((state) => {
    if (groupRef.current) {
      // Responsive scale for the text (compresses down to 0.4 on small screens)
      const desiredScale = THREE.MathUtils.clamp(state.viewport.width / 18, 0.4, 1.0);
      targetTextScale.current = THREE.MathUtils.lerp(targetTextScale.current, desiredScale, 0.05);

      // Entrance animation
      const t = Math.min(state.clock.elapsedTime * 0.5, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      
      // Scroll animation (move back into the scene)
      const scrollOffsetZ = scrollValue * 30; // Move deep back
      const scrollOffsetY = scrollValue * 5;  // Move slightly up

      groupRef.current.position.z = THREE.MathUtils.lerp(10, 0, easeOut) - scrollOffsetZ;
      groupRef.current.position.y = scrollOffsetY;
      
      // Combine responsive scale with entrance scale
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0.01, targetTextScale.current, easeOut));
    }
  });

  return (
    <>
      <ForcefieldLens opacity={opacity} />
      <group ref={groupRef} visible={opacity > 0}>
        <InteractiveCircles />
        
        <ambientLight intensity={1.0} color="#ffffff" />
        <directionalLight position={[10, 20, 15]} intensity={1.5} color="#e6eeff" />
        <pointLight position={[-10, -10, 10]} intensity={1} color="#b3ccff" />
        
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <Center>
            <Text3D
              font="/fonts/helvetiker_bold.typeface.json"
              size={3.2}
              height={0.1}
              curveSegments={textCurveSegments}
              bevelEnabled
              bevelThickness={0.7}
              bevelSize={0.3}
              bevelOffset={0}
              bevelSegments={textBevelSegments}
            >
              hello
              <meshPhysicalMaterial
                color="#929499"
                thickness={2.5}
                roughness={0.05}
                ior={1.5}
                transmission={1.0}
                attenuationColor="#ffffff"
                attenuationDistance={2}
                clearcoat={1.0}
                clearcoatRoughness={0.05}
                transparent
                opacity={opacity}
                envMapIntensity={1.0}
              />
            </Text3D>
          </Center>
        </Float>
      </group>
    </>
  );
};

export default Section13D;
