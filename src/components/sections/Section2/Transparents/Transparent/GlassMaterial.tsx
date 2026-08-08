import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const GlassMaterialImpl = shaderMaterial(
  {
    time: 0,
    winResolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    uSceneTex: null,
    uVisibility: 0.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec3 vWorldPos;

    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vec4 mvPosition = viewMatrix * worldPos;
      gl_Position = projectionMatrix * mvPosition;

      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vViewPos = -mvPosition.xyz;
      vWorldPos = worldPos.xyz;
    }
  `,
  // Fragment Shader
  `
    uniform float time;
    uniform vec2 winResolution;
    uniform sampler2D uSceneTex;
    uniform float uVisibility;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec3 vWorldPos;

    // Random function for noise grain
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // HSV to RGB for the rainbow fresnel
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    // GGX for specular highlight
    float ggx(float dNH, float roughness) {
        float a2 = roughness * roughness;
        a2 = a2 * a2;
        float dNH2 = dNH * dNH;
        if(dNH2 <= 0.0) return 0.0;
        return a2 / (3.14159 * pow(dNH2 * (a2 - 1.0) + 1.0, 2.0));
    }

    float fresnel(float d) {
        float f0 = 0.15;
        return f0 + (1.0 - f0) * pow(1.0 - d, 5.0);
    }

    void main() {
        float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
        
        vec3 viewDir = normalize(vViewPos);
        vec3 viewDirWorld = normalize(vWorldPos - cameraPosition);
        vec3 normal = normalize(vNormal) * faceDirection;
        
        // -------------------------------
        // 1. Refraction (Background Blur + Chromatic Aberration)
        // -------------------------------
        vec3 refractCol = vec3(0.0);
        vec2 screenUv = gl_FragCoord.xy / winResolution.xy;
        vec2 refractUv = screenUv;
        float slide;
        vec2 refractUvR;
        vec2 refractUvG;
        vec2 refractUvB;
        float refractPower = 0.02; // Base distortion
        
        // Distort UVs based on normal (facing away from camera distorts more)
        vec2 refractNormal = normal.xy * (1.0 - normal.z * 0.7);

        // 16-sample loop for heavy chromatic blur
        for (int i = 0; i < 16; i++) {
            slide = float(i) / 16.0 * 0.03 + random(screenUv) * 0.007;

            // Extreme chromatic splitting (B is pulled 3x further than R)
            refractUvR = refractUv - refractNormal * (refractPower + slide * 1.0);
            refractUvG = refractUv - refractNormal * (refractPower + slide * 2.0);
            refractUvB = refractUv - refractNormal * (refractPower + slide * 3.0);

            refractCol.r += texture2D(uSceneTex, refractUvR).r;
            refractCol.g += texture2D(uSceneTex, refractUvG).g;
            refractCol.b += texture2D(uSceneTex, refractUvB).b;
        }
        refractCol /= 16.0;

        vec3 outColor = refractCol;

        // -------------------------------
        // 2. Specular Highlight
        // -------------------------------
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        vec3 halfVec = normalize(viewDir + lightDir);
        float dNH = clamp(dot(normal, halfVec), 0.0, 1.0);
        outColor += ggx(dNH, 0.1);

        // -------------------------------
        // 3. Rainbow Fresnel Edge (Envmap Simulation)
        // -------------------------------
        float dNV = clamp(dot(normal, viewDir), 0.0, 1.0);
        float EF = fresnel(dNV);
        
        // Use a bright white color to simulate reflecting the environment lights
        vec3 envMapColor = vec3(2.0); 

        // Apply Junni's magic HSV rainbow blend
        outColor = mix(outColor, envMapColor * hsv2rgb(vec3(dNV * 2.0 + sin(time) * 0.1 + 0.2, 1.0, 1.0)), EF * 0.3);

        gl_FragColor = vec4(outColor, uVisibility);
    }
  `
);

extend({ GlassMaterial: GlassMaterialImpl });

export default GlassMaterialImpl;
