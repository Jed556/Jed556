import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollManager } from '../../../utils/ScrollManager';

const vertexShader = `
  uniform float uTime;
  uniform float uScrollOffset;
  
  varying vec2 vUv;
  varying float vElevation;

  // Simplex 3D Noise
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  // Fractional Brownian Motion for organic terrain
  float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 3; ++i) {
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
  }

  void main() {
    vUv = uv;
    
    vec3 pos = position;
    
    // Stretch the X axis slightly to create sweeping ridges instead of uniform circular bumps
    float noiseFreqX = 0.03;
    float noiseFreqY = 0.05; 
    float noiseAmp = 8.0; // Higher amplitude since FBM is inherently smoother
    
    // Add uScrollOffset instead of subtracting it to make the terrain move towards the camera,
    // which gives the illusion of the camera moving forward.
    vec3 noisePos = vec3(pos.x * noiseFreqX, (pos.y + uScrollOffset) * noiseFreqY, uTime * 0.03);
    
    // Using FBM instead of a single noise layer makes it look like real terrain
    float elevation = fbm(noisePos) * noiseAmp;
    
    // Flatten out the deep valleys so the hills look like they emerge from a floor
    // This removes the "bump bump bump" repetition of negative/positive extremes
    elevation = smoothstep(-0.2, 1.0, elevation / noiseAmp) * noiseAmp;
    
    pos.z += elevation;
    vElevation = elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    // Topography lines effect
    float contourSpacing = 0.8;
    float contourThickness = 0.05;
    
    // Use fract to get repeating lines based on elevation
    float contour = fract(vElevation / contourSpacing);
    
    // Smooth the lines to make them glowy and anti-aliased
    // We create a peak at 0.5 (or 0.0/1.0), let's center it at 0.5 for glow
    float line = smoothstep(0.5 - contourThickness, 0.5, contour) - 
                 smoothstep(0.5, 0.5 + contourThickness, contour);
                 
    // Add a slight base grid or noise if we want, but the user wanted white glowy lines on black.
    // So base is black (0.0), line is white (1.0)
    
    vec3 baseColor = vec3(0.0); // Black background
    vec3 lineColor = uColor; // White / Glowing
    
    vec3 finalColor = mix(baseColor, lineColor, line);
    
    // Fade out in the distance to blend with the sky/horizon (distance fog)
    // Distance from camera (assuming camera is at z=15, plane is at z=0, but we can just use vUv.y if the plane is flat)
    // vUv.y goes from 0 (bottom) to 1 (top). The horizon is near the top (vUv.y = 1)
    float distanceFade = smoothstep(0.9, 0.4, vUv.y); 
    
    // Fade out the left and right edges so we never see a hard cut when looking sideways
    // Reduced fade width to prevent edges from looking 'blurry' or washed out over a large area
    float edgeFade = smoothstep(0.0, 0.02, vUv.x) * smoothstep(1.0, 0.98, vUv.x);
    
    finalColor *= distanceFade * edgeFade; // Fade lines as they go further away and at the sides
    
    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;

interface TerrainProps {
  opacityRef: React.MutableRefObject<number>;
  swoopRef: React.MutableRefObject<number>;
}

export const Terrain: React.FC<TerrainProps> = ({ opacityRef, swoopRef }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScrollOffset: { value: 0 },
      uColor: { value: new THREE.Color('#ffffff') }, // White lines
      uOpacity: { value: 1.0 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Moving forward based on internal scroll (matched to the text fly-through speed of 12.0)
      materialRef.current.uniforms.uScrollOffset.value = scrollManager.internalScrollValue * 12.0; 
      materialRef.current.uniforms.uOpacity.value = opacityRef.current * (1.0 - swoopRef.current);
    }
  });

  return (
    <group position={[0, -16, -20]} rotation={[-Math.PI / 2.2, 0, 0]}>
      {/* 
        A massive plane rotated to lie flat, stretching far into the distance and super wide laterally.
        This ensures no matter how far the camera looks left or right, it never sees the edge.
      */}
      <mesh>
        {/* Expanded width from 150 to 500, increased segments heavily to maintain crisp details at the edges */}
        <planeGeometry args={[500, 150, 1000, 256]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          wireframe={false}
          transparent={true}
        />
      </mesh>
    </group>
  );
};
