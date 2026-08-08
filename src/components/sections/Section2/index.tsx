import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollManager } from '../../../utils/ScrollManager';
import { flatProjects, SCROLL_GROUP_SPACING } from '../../../data/projects';
import Transparents from './Transparents';

// Shared texture for marquee — renders the repeating text strip
const useMarqueeTexture = () => {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const TEXT_STRING = "MY PROJECTS";
    const GAP_SIZE = 150; // Dynamic gap size in pixels between repeating texts
    
    let textWidth = 4096;
    
    // First pass to measure text
    if (ctx) {
      ctx.font = 'italic 150px "RobotoFlex Baked 800", sans-serif';
      const metrics = ctx.measureText(TEXT_STRING);
      textWidth = Math.ceil(metrics.width);
    }

    // Set canvas width to exactly the text width plus the gap
    canvas.width = textWidth + GAP_SIZE;
    canvas.height = 200;

    if (ctx) {
      // Clear background to transparent (crucial for matching Junni's texture.w alpha)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.font = 'italic 150px "RobotoFlex Baked 800", sans-serif';

      // Draw text once. Texture wrapping will seamlessly tile it with the exact GAP_SIZE
      ctx.fillText(TEXT_STRING, 0, canvas.height / 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;

    return { tex, aspect: textWidth / 200 };
  }, []);
};

const textureCache = new Map<string, THREE.CanvasTexture>();
const sharedPlaneGeometry = new THREE.PlaneGeometry(1, 1);

const InstancedProjectsBackground = ({ scrollValue }: { scrollValue: number }) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  const width = 5500;
  const height = 1300;
  const font = 'italic 400 780px "Impact", sans-serif';
  const color = "#ffffff"; // Changed to white so we can tint it dynamically

  useEffect(() => {
    document.fonts.load(font).then(() => setFontsLoaded(true));
  }, [font]);
  const scaleX = 0.77 * (width / 100);
  const scaleY = 0.77 * (height / 100);

  const filledTex = useMemo(() => {
    const cacheKey = `PROJECTS-${font}-${color}-false-${width}-${height}-center-0-1.2`;
    if (textureCache.has(cacheKey) && fontsLoaded) return textureCache.get(cacheKey)!;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText("PROJECTS", width / 2, height / 2);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    textureCache.set(cacheKey, tex);
    return tex;
  }, [fontsLoaded]);

  const outlineTex = useMemo(() => {
    const cacheKey = `PROJECTS-${font}-${color}-true-${width}-${height}-center-0-1.2`;
    if (textureCache.has(cacheKey) && fontsLoaded) return textureCache.get(cacheKey)!;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText("PROJECTS", width / 2, height / 2);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    textureCache.set(cacheKey, tex);
    return tex;
  }, [fontsLoaded]);

  const filledRef = useRef<THREE.InstancedMesh>(null);
  const outlineRef = useRef<THREE.InstancedMesh>(null);
  const matFilledRef = useRef<THREE.MeshBasicMaterial>(null);
  const matOutlineRef = useRef<THREE.MeshBasicMaterial>(null);

  // Black and white colors for transitioning
  const colorBlack = useMemo(() => new THREE.Color(0x000000), []);
  const colorWhite = useMemo(() => new THREE.Color(0xffffff), []);

  useEffect(() => {
    const dummyGroup = new THREE.Object3D();
    const dummyChild = new THREE.Object3D();
    
    const rows = [
      { y: 11.0, z: 2, isFilled: true },
      { y: 5.2, z: 1, isFilled: false },
      { y: -0.5, z: 2, isFilled: true },
      { y: -6.2, z: 1, isFilled: false },
      { y: -12.0, z: 2, isFilled: true },
    ];
    let filledIdx = 0;
    let outlineIdx = 0;
    
    rows.forEach(row => {
      dummyGroup.position.set(-0.7, row.y, row.z);
      dummyGroup.rotation.set(0, 0, 0.19);
      dummyGroup.updateMatrix();

      [-23.2, 23.2, 0].forEach(offsetX => {
        const isOutline = offsetX === 0 ? !row.isFilled : true;
        
        dummyChild.position.set(offsetX, 0, offsetX === 0 ? 0.01 : 0);
        dummyChild.scale.set(scaleX, scaleY, 1);
        dummyChild.rotation.set(0, 0, 0);
        dummyChild.updateMatrix();

        const finalMatrix = dummyGroup.matrix.clone().multiply(dummyChild.matrix);
        
        if (isOutline && outlineRef.current) {
          outlineRef.current.setMatrixAt(outlineIdx++, finalMatrix);
        } else if (!isOutline && filledRef.current) {
          filledRef.current.setMatrixAt(filledIdx++, finalMatrix);
        }
      });
    });
    
    if (filledRef.current) filledRef.current.instanceMatrix.needsUpdate = true;
    if (outlineRef.current) outlineRef.current.instanceMatrix.needsUpdate = true;
  }, [scaleX, scaleY]);

  useFrame(() => {
    let progress = scrollValue;
    if (scrollValue >= 0 && scrollValue <= 1.0) {
      progress = Math.max(0, (scrollValue - 0.3) / 0.7);
    }
    
    let targetOpacity = 1.0;
    let colorTransition = 0.0;

    if (progress <= 1.0) {
      targetOpacity = Math.max(0, Math.min(progress * 1.5, 1.0));
    } else if (progress > 2.0) {
      const outroProgress = Math.min(1.0, (progress - 2.0) / 1.0);
      const fadePhase = Math.max(0, (outroProgress - 0.80) / 0.20);
      targetOpacity = 1.0 - fadePhase;
      // Fade color to white as we transition to Scene 4 (progress > 2.0)
      colorTransition = outroProgress;
    }

    if (matFilledRef.current) {
      matFilledRef.current.opacity = targetOpacity;
      matFilledRef.current.color.lerpColors(colorBlack, colorWhite, colorTransition);
    }
    if (matOutlineRef.current) {
      matOutlineRef.current.opacity = targetOpacity;
      matOutlineRef.current.color.lerpColors(colorBlack, colorWhite, colorTransition);
    }
  });

  return (
    <group>
      <instancedMesh ref={filledRef} args={[sharedPlaneGeometry, undefined, 3]} frustumCulled={false}>
        <meshBasicMaterial ref={matFilledRef} map={filledTex} transparent depthWrite={false} toneMapped={false} opacity={0} color={colorBlack} />
      </instancedMesh>
      <instancedMesh ref={outlineRef} args={[sharedPlaneGeometry, undefined, 12]} frustumCulled={false}>
        <meshBasicMaterial ref={matOutlineRef} map={outlineTex} transparent depthWrite={false} toneMapped={false} opacity={0} color={colorBlack} />
      </instancedMesh>
    </group>
  );
};

// =============================================================================
// CURVED INSTANCED MARQUEE
// =============================================================================
// Instead of flat planes with manual rotation hacks, this creates a curved
// cylindrical strip that wraps around the viewer. Each instance is a row of
// text stacked vertically with random scale. The vertex shader applies skew
// (pos.y += pos.x * skewFactor) to create the diagonal slant naturally.
// UV scrolling per-instance gives each row its own speed.
// =============================================================================

// --- Configuration ---
const NUM_INSTANCES = 55;    // Number of text rows
const STRIP_HEIGHT = 1.6;    // Height of each strip before scaling (taller = appears closer)
const SKEW_FACTOR = 0.25;    // Mathematical Y-shear to create a parallelogram front face without tilting vertical edges

// --- Text Size Configuration ---
// Probabilities for picking each size (must sum to <= 1.0)
const PROB_SMALL = 0.20;  // 20% chance of small text
const PROB_REGULAR = 0.45; // 45% chance of regular text
// (Remaining 35% becomes BIG)

// Scale ranges for each size tier [min, max]
// Base sizes increased significantly, with huge gaps between tiers for massive variation!
const SCALE_SMALL = [0.5, 0.7];
const SCALE_REGULAR = [1.0, 1.6];
const SCALE_BIG = [2.2, 3.2];

// --- Scroll Speed Configuration ---
const SCROLL_SPEED_MIN = 0.3; // Minimum speed multiplier for a text row
const SCROLL_SPEED_MAX = 7.0; // Maximum speed multiplier for a text row


const CurvedMarquee = (props: any & { active?: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { tex: baseTexture } = useMarqueeTexture();
  const { viewport } = useThree();
  const targetScale = Math.min(1.0, viewport.width / 24.0);
  const currentScaleRef = useRef(targetScale);

  // Build the instanced geometry + shader material
  const { geometry, material } = useMemo(() => {
    // --- 1. Build the curved strip geometry (like a cylinder section) ---
    const W_FRONT = 15.0; // Front face (behind camera). Large enough to project off-screen.
    const W_BACK = 28.0;  // Visible back face. Reduced slightly from 35 to find the sweet spot.
    const Z_DIST = 15.0;  // Increased depth so the side walls reach past the camera to avoid cutoffs!
    const SKEW_AMOUNT = W_BACK * SKEW_FACTOR;

    // Explicitly define the 4 corners of the trapezoid
    const points = [
      { x: W_FRONT, z: Z_DIST, skew: SKEW_AMOUNT },    // Front Right
      { x: -W_FRONT, z: Z_DIST, skew: -SKEW_AMOUNT },  // Front Left
      { x: -W_BACK, z: -Z_DIST, skew: -SKEW_AMOUNT },  // Back Left (Start of visible background)
      { x: W_BACK, z: -Z_DIST, skew: SKEW_AMOUNT },    // Back Right (End of visible background)
      { x: W_FRONT, z: Z_DIST, skew: SKEW_AMOUNT }     // Wrap to Front Right
    ];

    // Calculate physical distances to prevent UV stretching across unequal faces
    const distances = [0];
    let totalDist = 0;
    for (let i = 1; i <= 4; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dz = points[i].z - points[i - 1].z;
      totalDist += Math.sqrt(dx * dx + dz * dz);
      distances.push(totalDist);
    }

    const posArray = [];
    const uvArray = [];
    const skewArray = [];

    // Generate geometry vertices
    for (let i = 0; i <= 4; i++) {
      const pt = points[i];
      const u = distances[i] / totalDist;

      // Top vertex
      posArray.push(pt.x, STRIP_HEIGHT / 2, pt.z);
      uvArray.push(u, 1);
      skewArray.push(pt.skew);

      // Bottom vertex
      posArray.push(pt.x, -STRIP_HEIGHT / 2, pt.z);
      uvArray.push(u, 0);
      skewArray.push(pt.skew);
    }

    // (Geometry attributes collected in arrays, will be applied to the InstancedBufferGeometry later)
    // --- 2. Build per-instance attributes ---
    const offsetPosArray: number[] = [];
    const scaleArray: number[] = [];
    const rndArray: number[] = [];

    let posY = 0.0;

    // Use a seeded random for deterministic layout
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let i = 0; i < NUM_INSTANCES; i++) {
      let scale = 1.0;
      const r = seededRandom(i); // Deterministic random between 0 and 1

      if (r < PROB_SMALL) {
        const norm = r / PROB_SMALL;
        scale = SCALE_SMALL[0] + norm * (SCALE_SMALL[1] - SCALE_SMALL[0]);
      } else if (r < PROB_SMALL + PROB_REGULAR) {
        const norm = (r - PROB_SMALL) / PROB_REGULAR;
        scale = SCALE_REGULAR[0] + norm * (SCALE_REGULAR[1] - SCALE_REGULAR[0]);
      } else {
        const probBig = 1.0 - (PROB_SMALL + PROB_REGULAR);
        const norm = (r - (PROB_SMALL + PROB_REGULAR)) / probBig;
        scale = SCALE_BIG[0] + norm * (SCALE_BIG[1] - SCALE_BIG[0]);
      }

      const scaleH = scale / 2;
      const h = STRIP_HEIGHT * 0.80;

      // Stack downward: half-height above, position, half-height below
      posY -= scaleH * h;
      offsetPosArray.push(0.0, posY, 0.0);
      posY -= scaleH * h;

      scaleArray.push(scale);

      // Calculate speed between MIN and MAX
      const speedRandom = seededRandom(i * 2 + 1);
      const rowSpeed = SCROLL_SPEED_MIN + speedRandom * (SCROLL_SPEED_MAX - SCROLL_SPEED_MIN);
      rndArray.push(rowSpeed);   // speed variation

      rndArray.push(seededRandom(i * 2 + 100));  // phase offset
    }

    // Center the entire stack at Y=0
    for (let i = 0; i < NUM_INSTANCES; i++) {
      offsetPosArray[i * 3 + 1] -= posY / 2;
    }

    // --- 3. Assemble InstancedBufferGeometry ---
    const indexArray = [];
    for (let i = 0; i < 4; i++) {
      indexArray.push(i * 2 + 0, i * 2 + 1, (i + 1) * 2);
      indexArray.push(i * 2 + 1, (i + 1) * 2 + 1, (i + 1) * 2);
    }

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posArray), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvArray), 2));
geo.setAttribute('aSkew', new THREE.BufferAttribute(new Float32Array(skewArray), 1));
    geo.setAttribute('offsetPos', new THREE.InstancedBufferAttribute(new Float32Array(offsetPosArray), 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(new Float32Array(scaleArray), 1));
    geo.setAttribute('rnd', new THREE.InstancedBufferAttribute(new Float32Array(rndArray), 2));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indexArray), 1));
    geo.instanceCount = NUM_INSTANCES;

    // --- 4. Create ShaderMaterial (adapted from Junni's slide shaders) ---
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        tex: { value: baseTexture },
        time: { value: 0 },
        speed: { value: 0.5 + seededRandom(999) * 0.5 },
        uVisibility: { value: 0.0 }, // Start hidden
        uSlide: { value: 1.0 },      // Start slid out
        skewFactor: { value: SKEW_FACTOR },
        uMaskY: { value: -50.0 },
        uTransitionProgress: { value: 0.0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 offsetPos;
        attribute float aScale;
        attribute float aSkew;
        attribute vec2 rnd;

        uniform float time;
        uniform float speed;
        uniform float uVisibility;
        uniform float uSlide;
        uniform float skewFactor;

        varying vec2 vUv;
        varying float vAlpha;
        varying vec3 vWorldPos;

        void main() {
          vec3 pos = position;

          // Scale each instance's height
          pos.y *= aScale;

          // Shear: shift Y based on custom aSkew attribute to turn the back face into a parallelogram 
          // while strictly keeping the side faces perfectly horizontal and all corners perfectly vertical!
          pos.y += aSkew;

          // Apply instance offset (vertical stacking)
          pos += offsetPos;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;

          vec4 mvPosition = viewMatrix * worldPos;
          gl_Position = projectionMatrix * mvPosition;

          vAlpha = uVisibility;

          // UV: tile the texture across the curved strip
          vUv = uv;
          vUv.x *= 22.0;  // Repeat text horizontally across the total perimeter
          // Adding the slide offset makes UVs increase during outro,
          // meaning the text visually slides from RIGHT to LEFT on screen to match everything else!
          vUv.x += time * 0.1 * speed * rnd.x + rnd.y + uSlide * rnd.x * 3.5;
          vUv.x /= aScale;  // Larger instances = larger text
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tex;
        uniform float uVisibility;
        uniform float uMaskY;
        uniform float uTransitionProgress;

        varying vec2 vUv;
        varying float vAlpha;
        varying vec3 vWorldPos;

        void main() {
          // The background text remains light gray (0.9) so it is visible against the black sky
          vec4 col = vec4(vec3(0.9), 1.0);

          vec2 uv = vUv;
          vec4 text = texture2D(tex, uv);

          // We use the alpha channel of the texture (text.a / text.w)
          if (text.a < 0.2) discard;

          // Apply visibility fading and text mask exactly as Junni does
          col.a *= vAlpha * text.a;

          // World space Y mask to gracefully hide the text behind the terrain in Scene 4
          // The gradient now spans 20.0 world units for a very soft, atmospheric fade
          float bottomFade = smoothstep(uMaskY, uMaskY + 20.0, vWorldPos.y);
          col.a *= bottomFade;

          gl_FragColor = col;
        }
      `,
    });

    return { geometry: geo, material: mat };
  }, [baseTexture]);

  // Animate time uniform for scrolling
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    if (material) {
      material.uniforms.time.value = state.clock.elapsedTime;
      
      let progress = props.scrollValue;
      if (props.scrollValue >= 0 && props.scrollValue <= 1.0) {
        progress = Math.max(0, (props.scrollValue - 0.2) / 0.8);
      }
      
      let targetVisibility = 1.0;
      let targetSlide = 0.0;
      let targetY = 0.0;
      if (progress <= 1.0) {
        targetVisibility = Math.max(0, Math.min(progress * 1.5, 1.0));
        targetSlide = 1.0 - targetVisibility;
      } else if (progress > 2.0) {
        const outroProgress = Math.min(1.0, (progress - 2.0) / 1.0);
        
        // Upward pull (Quad In -> Slow Linear -> Quad Out)
        const pullPhase = Math.min(1.0, Math.max(0, outroProgress) / 1.0);
        let pullEased = 0;
        if (pullPhase < 0.25) pullEased = (8 / 3) * pullPhase * pullPhase;
        else if (pullPhase < 0.75) pullEased = (1 / 6) + (4 / 3) * (pullPhase - 0.25);
        else {
          const t = pullPhase - 0.75;
          pullEased = (5 / 6) + (4 / 3) * t - (8 / 3) * t * t;
        }
        targetY = pullEased * 13.0;
        
        // Slide left starts later (0.75) to prevent diagonal arching
        const slidePhase = Math.min(1.0, Math.max(0, (outroProgress - 0.75) / 0.25));
        const slideEased = slidePhase * slidePhase * (3.0 - 2.0 * slidePhase); 
        // Allow the bg grey text to move more to the left
        targetSlide = slideEased * 1.8;
        
        // Fade out starts earlier (0.80)
        const fadePhase = Math.max(0, (outroProgress - 0.80) / 0.20);
        targetVisibility = 1.0 - fadePhase;
      }
      
      material.uniforms.uVisibility.value = targetVisibility;
      material.uniforms.uSlide.value = targetSlide;
      
      // Mask out the bottom of the wall as we enter Scene 4 (scrollValue > 2.0)
      let maskY = -50.0; // Way below the screen, effectively disabled
      let transitionProgress = 0.0;
      if (props.scrollValue > 2.0) {
        // Transition into Scene 4 (scrollValue 2.0 -> 3.0)
        const scene4Progress = Math.min(1.0, props.scrollValue - 2.0);
        transitionProgress = scene4Progress;
        // Move the mask from -30 up to -10.0 (which is safely above the terrain but leaves the text visible)
        maskY = -30.0 + (scene4Progress * 20.0);
      }
      material.uniforms.uMaskY.value = maskY;
      material.uniforms.uTransitionProgress.value = transitionProgress;

      if (meshRef.current) {
        currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, 10 * dt);
        meshRef.current.scale.setScalar(currentScaleRef.current);
        
        // Multiply by the scale so its world translation shrinks on smaller screens, 
        // perfectly matching the foreground text which is scaled by its parent group!
        meshRef.current.position.y = targetY * currentScaleRef.current;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]} geometry={geometry} material={material} frustumCulled={false} />
  );
};

// Global cache and shared geometry are declared at the top of the file

// Generates an image texture from text to prevent WebGL font loading crashes
const CanvasText = ({
  text,
  font = '900 200px Arial',
  color = '#111111',
  outline = false,
  width = 1024,
  height = 512,
  viewingState = 'ready', // 'ready' | 'viewing' | 'passed'
  animationType = 'fade-up', // 'fade-up' | 'slide' | 'main-title'
  scrollValue = 0,
  textAlign = 'center', // 'center' | 'left' | 'right' | 'staggered'
  maxWidth,
  lineHeight = 1.0,
  extraOpacity = 1.0,
  velocityRef,
  ...meshProps
}: any) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    document.fonts.load(font).then(() => setFontsLoaded(true));
  }, [font]);

  const texture = useMemo(() => {
    const cacheKey = `${text}-${font}-${color}-${outline}-${width}-${height}-${textAlign}-${maxWidth}-${lineHeight}`;
    // Bypass the cache to redraw if fonts were just loaded
    if (textureCache.has(cacheKey) && fontsLoaded) {
      return textureCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      if (outline) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      } else {
        ctx.fillStyle = color;
      }
      ctx.font = font;
      ctx.textBaseline = 'middle';

      const drawLine = (t: string, x: number, y: number) => {
        if (outline) ctx.strokeText(t, x, y);
        else ctx.fillText(t, x, y);
      };

      if (maxWidth) {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());

        // Determine actual block width
        let actualMaxWidth = 0;
        lines.forEach(l => {
          const w = ctx.measureText(l).width;
          if (w > actualMaxWidth) actualMaxWidth = w;
        });

        const blockStartX = (width - actualMaxWidth) / 2;

        const fontSizeMatch = font.match(/(\d+)px/);
        const pxSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : height / 2;
        const totalHeight = lines.length * (pxSize * lineHeight);
        let startY = (height - totalHeight) / 2 + (pxSize / 2);

        for (let i = 0; i < lines.length; i++) {
          if (textAlign === 'staggered') {
            if (i === 0) {
              ctx.textAlign = 'left';
              drawLine(lines[i], blockStartX, startY + (i * pxSize * lineHeight));
            } else {
              ctx.textAlign = 'right';
              // Shift the second row slightly to the right for a more dynamic look
              drawLine(lines[i], blockStartX + actualMaxWidth + 60, startY + (i * pxSize * lineHeight));
            }
          } else if (textAlign === 'left') {
            ctx.textAlign = 'left';
            drawLine(lines[i], blockStartX, startY + (i * pxSize * lineHeight));
          } else if (textAlign === 'right') {
            ctx.textAlign = 'right';
            drawLine(lines[i], blockStartX + actualMaxWidth, startY + (i * pxSize * lineHeight));
          } else {
            ctx.textAlign = 'center';
            drawLine(lines[i], width / 2, startY + (i * pxSize * lineHeight));
          }
        }
      } else {
        let startX = width / 2;
        if (textAlign === 'left') {
          ctx.textAlign = 'left';
          startX = 20;
        } else if (textAlign === 'right') {
          ctx.textAlign = 'right';
          startX = width - 40;
        } else {
          ctx.textAlign = 'center';
        }
        drawLine(text, startX, height / 2);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    textureCache.set(cacheKey, tex);
    return tex;
  }, [text, font, color, outline, width, height, textAlign, maxWidth, lineHeight, fontsLoaded]);

  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  const smearUniforms = useMemo(() => ({
    map: { value: null as THREE.Texture | null },
    opacity: { value: 0 },
    uVelocity: { value: 0.0 },
  }), []);

  const targetX = meshProps.position?.[0] || 0;
  const targetY = meshProps.position?.[1] || 0;
  const targetZ = meshProps.position?.[2] || 0;
  
  const baseScaleX = meshProps.scale?.[0] || 1;
  const baseScaleY = meshProps.scale?.[1] || 1;
  const baseScaleZ = meshProps.scale?.[2] || 1;

  // Slide offset matches (-1.0 + uSectionViewing) * vec2(3.0, 0.6)
  const offsetVec = new THREE.Vector2(3.0, 0.6);

  const baseRotX = meshProps.rotation?.[0] || 0;

  const widthScale = width / 100;
  const heightScale = height / 100;

  const sectionViewing = useRef(0);
  const visibilityScale = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (materialRef.current && meshRef.current) {
      // sectionViewing: 0 (ready), 1 (viewing), 2 (passed)
      const targetViewing = viewingState === 'ready' ? 0 : viewingState === 'viewing' ? 1 : 2;
      sectionViewing.current = THREE.MathUtils.lerp(
        sectionViewing.current,
        targetViewing,
        delta * 3
      );

      if (animationType === 'main-title') {
        let progress = scrollValue;
        if (scrollValue >= 0 && scrollValue <= 1.0) {
          progress = Math.max(0, (scrollValue - 0.3) / 0.7); // 0.3 is PULL_THRESHOLD
        }
        
        let targetOpacity = 1.0;
        if (progress <= 1.0) {
          targetOpacity = Math.max(0, Math.min(progress * 1.5, 1.0));
        } else if (progress > 2.0) {
          const outroProgress = Math.min(1.0, (progress - 2.0) / 1.0);
          // Fade out starts earlier (0.80) to stay visible longer
          const fadePhase = Math.max(0, (outroProgress - 0.80) / 0.20);
          targetOpacity = 1.0 - fadePhase;
        }

        visibilityScale.current = targetOpacity;
      } else {
        visibilityScale.current = THREE.MathUtils.lerp(
          visibilityScale.current,
          viewingState === 'viewing' ? 1.0 : 0.0,
          delta * 3
        );
      }

      meshRef.current.scale.set(baseScaleX, baseScaleY, baseScaleZ);

      const finalOpacity = visibilityScale.current * extraOpacity;

      if (velocityRef && materialRef.current.uniforms) {
        // ShaderMaterial path
        materialRef.current.uniforms.opacity.value = finalOpacity;
        materialRef.current.uniforms.map.value = texture;
        const targetVel = velocityRef.current;
        const currentVel = materialRef.current.uniforms.uVelocity.value;
        // Asymmetric: fast decay when decelerating, slower ramp when accelerating
        const rate = Math.abs(targetVel) < Math.abs(currentVel) ? dt * 12.0 : dt * 4.0;
        materialRef.current.uniforms.uVelocity.value = THREE.MathUtils.lerp(
          currentVel,
          targetVel,
          rate
        );
      } else {
        // MeshBasicMaterial path
        materialRef.current.opacity = finalOpacity;
      }
      
      const viewingOffsetMultiplier = -1.0 + sectionViewing.current;
      
      if (animationType === 'slide') {
        meshRef.current.position.x = targetX - viewingOffsetMultiplier * offsetVec.x;
        meshRef.current.position.y = targetY - viewingOffsetMultiplier * offsetVec.y;
        meshRef.current.rotation.x = baseRotX;
        meshRef.current.scale.set(baseScaleX * widthScale, baseScaleY * heightScale, baseScaleZ);
      } else if (animationType === 'main-title') {
        meshRef.current.position.x = targetX;
        meshRef.current.position.y = targetY;
        meshRef.current.rotation.x = baseRotX;
        meshRef.current.scale.set(baseScaleX * widthScale, baseScaleY * heightScale, baseScaleZ);
      } else {
        const initialY = targetY - 2;
        meshRef.current.position.y = THREE.MathUtils.lerp(
          meshRef.current.position.y,
          viewingState === 'viewing' ? targetY : initialY,
          delta * 3
        );
        meshRef.current.rotation.x = baseRotX;
        meshRef.current.scale.set(baseScaleX * widthScale, baseScaleY * heightScale, baseScaleZ);
      }
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      {...meshProps} 
      position={[targetX, targetY, targetZ]}
      rotation={[baseRotX, meshProps.rotation?.[1] || 0, meshProps.rotation?.[2] || 0]}
      frustumCulled={false}
    >
      <primitive object={sharedPlaneGeometry} attach="geometry" />
      {velocityRef ? (
        <shaderMaterial
          ref={materialRef}
          transparent={true}
          depthWrite={false}
          uniforms={smearUniforms}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform sampler2D map;
            uniform float opacity;
            uniform float uVelocity;
            varying vec2 vUv;
            void main() {
              vec2 uv = vUv;
              float vel = uVelocity;
              if (abs(vel) > 0.01) {
                float wave1 = sin(uv.y * 15.0) * 0.5;
                float wave2 = sin(uv.y * 40.0 + 1.5) * 0.3;
                float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 0.2;
                uv.x += (wave1 + wave2 + noise) * vel * 0.004;
              }
              vec4 color = texture2D(map, uv);
              color.a *= opacity;
              if (color.a < 0.01) discard;
              gl_FragColor = color;
            }
          `}
        />
      ) : (
        <meshBasicMaterial 
          ref={materialRef} 
          map={texture} 
          transparent={true} 
          depthWrite={false} 
          toneMapped={false} 
          opacity={0} 
        />
      )}
    </mesh>
  );
};

const MainTitleGroup: React.FC<{ scrollValue: number; children: React.ReactNode }> = ({ scrollValue, children }) => {
  const groupRef = useRef<THREE.Group>(null);

  const offsetVec = new THREE.Vector2(5.0, 1.0);

  useFrame(() => {
    if (groupRef.current) {
      // Map scrollValue 0.3 -> 1.0 into progress 0.0 -> 1.0.
      // This creates a "deadzone" from 0.0 to 0.3 (matching PULL_THRESHOLD), satisfying:
      // "When scrubbing into scene 2 nothing should be affected."
      let progress = scrollValue;
      if (scrollValue >= 0 && scrollValue <= 1.0) {
        progress = Math.max(0, (scrollValue - 0.3) / 0.7);
      }
      
      let slideMultiplier = 0;
      let scaleBoost = 0;

      if (progress >= 0 && progress <= 1) { 
        // INTRO / OUTRO SEQUENCE (0.0 to 1.0)
        // Perfectly continuous and reversible.
        
        // 1. SLIDE (progress 0.0 to 0.9)
        const slideT = Math.min(Math.max(progress / 0.9, 0.0), 1.0);
        const slideProgress = 1.0 - Math.pow(1.0 - slideT, 3.0);
        slideMultiplier = -1.0 * (1.0 - slideProgress); // goes from -1.0 to 0.0
        
        // 2. SCALE (progress 0.2 to 1.0)
        const scaleT = Math.min(Math.max((progress - 0.2) / 0.8, 0.0), 1.0);
        const scaleProgressCurve = 1.0 - (scaleT * scaleT * (3.0 - 2.0 * scaleT));
        scaleBoost = 0.2 * scaleProgressCurve;
      } else if (progress > 1 && progress <= 2) {
        // HOLD in Scene 3 (1.0 to 2.0)
        slideMultiplier = 0;
        scaleBoost = 0;
      } else if (progress > 2) {
        const outroProgress = Math.min(1.0, (progress - 2.0) / 1.0);
        
        // Phase 1: Upward pull (Quad In -> Slow Linear -> Quad Out)
        const pullPhase = Math.min(1.0, Math.max(0, outroProgress) / 1.0);
        let pullEased = 0;
        if (pullPhase < 0.25) pullEased = (8 / 3) * pullPhase * pullPhase;
        else if (pullPhase < 0.75) pullEased = (1 / 6) + (4 / 3) * (pullPhase - 0.25);
        else {
          const t = pullPhase - 0.75;
          pullEased = (5 / 6) + (4 / 3) * t - (8 / 3) * t * t;
        }
        
        // Phase 2: Slide left starts later (0.75) to prevent diagonal arching
        const slidePhase = Math.min(1.0, Math.max(0, (outroProgress - 0.75) / 0.25));
        const slideEased = slidePhase * slidePhase * (3.0 - 2.0 * slidePhase);
        
        // Apply exact same offsets as Section 3
        groupRef.current.position.y = pullEased * 13.0;
        groupRef.current.position.x = -slideEased * 3.5;
        groupRef.current.scale.setScalar(1.0);
        return; // Early return to bypass the default position/scale logic below
      }

      // Apply slide (for intro sequence)
      groupRef.current.position.x = -slideMultiplier * offsetVec.x;
      groupRef.current.position.y = -slideMultiplier * offsetVec.y;

      // Apply scale (for intro sequence)
      groupRef.current.scale.setScalar(1.0 + scaleBoost);
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

const ResponsiveTextGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  // Assume a base viewport width of ~24 for a standard desktop.
  // Scale down smoothly on smaller screens (like mobile) to prevent elements from going off-canvas.
  const targetScale = Math.min(1.0, viewport.width / 24.0);
  const currentScaleRef = useRef(targetScale);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    if (groupRef.current) {
      currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, 10 * dt);
      groupRef.current.scale.set(currentScaleRef.current, currentScaleRef.current, 1);
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};

const DynamicTypeItem = ({ text, isCurrent, viewingState, scrollValue }: any) => {
  const words = text.split(' ');
  let splitIndex = Math.ceil(words.length / 2);

  if (words.length > 2) {
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const topLen = words.slice(0, i).join(' ').length;
      const botLen = words.slice(i).join(' ').length;
      const diff = Math.abs(topLen - botLen);
      if (diff <= bestDiff) {
        bestDiff = diff;
        splitIndex = i;
      }
    }
  }
  const topText = words.slice(0, splitIndex).join(' ');
  const bottomText = words.slice(splitIndex).join(' ');

  const progressRef = useRef(isCurrent ? 0 : 1);
  const topRef = useRef<THREE.Group>(null);
  const bottomRef = useRef<THREE.Group>(null);
  
  const topVelocityRef = useRef(0);
  const bottomVelocityRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const targetProgress = isCurrent ? 1 : 0;
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetProgress, dt * 7);

    if (topRef.current) {
      const targetX = (1 - progressRef.current) * 8.0;
      topRef.current.position.x = targetX;
    }
    if (bottomRef.current) {
      const targetX = (1 - progressRef.current) * -8.0;
      bottomRef.current.position.x = targetX;
    }

    // Progress-based distortion: strong at start, fades to zero before slow zone
    // progressRef goes 0 -> 1 when sliding in. Distortion lives in the 0 to ~0.5 range.
    if (isCurrent) {
      const remaining = 1 - progressRef.current; // 1 at start, 0 when settled
      // Strong above 0.5 remaining, fades to zero by 0.15 remaining
      const intensity = Math.min(1.0, Math.max(0, (remaining - 0.15) / 0.35));
      // Direction: positive for top (slides from right), negative for bottom (slides from left)
      topVelocityRef.current = intensity * 12.0;
      bottomVelocityRef.current = intensity * -12.0;
    } else {
      topVelocityRef.current = 0;
      bottomVelocityRef.current = 0;
    }
  });

  return (
    <group position={[4.0, -3.8, 2.0]} rotation={[0, 0, 0.19]}>
      {/* Top Word */}
      <group ref={topRef}>
        <CanvasText
          viewingState={viewingState}
          scrollValue={scrollValue}
          animationType="main-title"
          text={topText}
          font='italic bold 120px "Arial", sans-serif'
          color="#111111"
          width={1200}
          height={200}
          position={[0, 0.7, 0]}
          textAlign="right"
          extraOpacity={progressRef.current}
          velocityRef={topVelocityRef}
        />
      </group>
      {/* Bottom Words */}
      <group ref={bottomRef}>
        <CanvasText
          viewingState={viewingState}
          scrollValue={scrollValue}
          animationType="main-title"
          text={bottomText}
          font='italic bold 120px "Arial", sans-serif'
          color="#111111"
          width={1200}
          height={200}
          position={[0.3, -0.5, 0]}
          textAlign="right"
          extraOpacity={progressRef.current}
          velocityRef={bottomVelocityRef}
        />
      </group>
    </group>
  );
};

const AnimatedDynamicType = ({ activeType, viewingState, scrollValue }: any) => {
  const [items, setItems] = useState<{ id: number; text: string }[]>([{ id: Date.now(), text: activeType }]);

  useEffect(() => {
    setItems((prev) => {
      if (prev[prev.length - 1].text === activeType) return prev;
      return [...prev.slice(-1), { id: Date.now(), text: activeType }];
    });
  }, [activeType]);

  return (
    <>
      {items.map((item, idx) => {
        const isCurrent = idx === items.length - 1;
        return (
          <DynamicTypeItem 
            key={item.id} 
            text={item.text} 
            isCurrent={isCurrent} 
            viewingState={viewingState} 
            scrollValue={scrollValue} 
          />
        );
      })}
    </>
  );
};

const Section2: React.FC<{ viewingState?: 'ready' | 'viewing' | 'passed'; scrollValue?: number }> = ({ viewingState = 'ready', scrollValue = 0 }) => {
  const [activeType, setActiveType] = useState("Check out my works");

  useFrame(() => {
    // Only compute if we are in Section 3 (where internal scroll happens)
    if (scrollValue > 1.5 && scrollValue < 3.5) {
      let currentScroll = scrollManager.internalScrollValue;
      if (scrollManager.currentSection > 2) {
        // Clamp to max scroll of section 3 when scrolling forward into section 4
        currentScroll = scrollManager.internalScrollLimits[2] || 7;
      }
      
      // Add a lookahead offset so the background text switches to the next category earlier
      const lookaheadScroll = currentScroll + 0.45;
      let closest = flatProjects[0];
      let minDiff = Infinity;
      for (const proj of flatProjects) {
        const diff = Math.abs(lookaheadScroll - proj.scrollOffset);
        if (diff < minDiff) {
          minDiff = diff;
          closest = proj;
        }
      }
      
      const lastProject = flatProjects[flatProjects.length - 1];
      let newType = closest ? closest.groupType : "Check out my works";
      
      // Treat the end of the list as a virtual group gap so it transitions out with the exact same timing
      if (lookaheadScroll > lastProject.scrollOffset + SCROLL_GROUP_SPACING / 2) {
        newType = "Check out my works";
      }
      
      if (newType !== activeType) {
        setActiveType(newType);
      }
    } else if (scrollValue <= 1.5 && activeType !== "Check out my works") {
       setActiveType("Check out my works");
    }
  });

  return (
    <>
      <Transparents scrollValue={scrollValue} />

      {/* Sync background perfectly to scroll physics so it holds during Scene 3 and exits at Scene 4 */}
      <CurvedMarquee scrollValue={scrollValue} />

      <ResponsiveTextGroup>
        {/* Center 3D Titles */}
        <MainTitleGroup scrollValue={scrollValue}>
          {/* 15 Instanced Main Titles (5 Rows with Left, Right, and Center copies) */}
          <InstancedProjectsBackground scrollValue={scrollValue} />
          {/* "M" (Cursive) */}
          <CanvasText
            viewingState={viewingState}
            scrollValue={scrollValue}
            animationType="main-title"
            text="M"
            font='normal 450px "The Historia", cursive'
            color="#000000"
            width={800}
            height={900}
            position={[-7.15, 2.1, 2.5]}
            rotation={[0, 0, 0.6]}
          />
          {/* "y" (Cursive) */}
          <CanvasText
            viewingState={viewingState}
            scrollValue={scrollValue}
            animationType="main-title"
            text="y"
            font='normal 350px "The Historia", cursive'
            color="#000000"
            width={600}
            height={800}
            position={[-5.3, 2.1, 2.5]}
            rotation={[0, 0, 0.4]}
          />

          {/* Dynamic Project Type (Bottom Right) */}
          <AnimatedDynamicType
            activeType={activeType}
            viewingState={viewingState}
            scrollValue={scrollValue}
          />
        </MainTitleGroup>
      </ResponsiveTextGroup>
    </>
  );
};

export default Section2;
