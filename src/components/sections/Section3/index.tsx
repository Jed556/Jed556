import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollManager } from '../../../utils/ScrollManager';
import { Text, Html } from '@react-three/drei';
import { flatProjects, MAX_SCROLL } from '../../../data/projects';
import { DEBUG_GUIDES } from '../../../utils/debug';
import { GlassObjects } from './GlassObjects';
import { ProjectModal } from './ProjectModal';
import { AnimatePresence } from 'framer-motion';
import { formatDate } from '../../../utils/dateFormatter';

// --- Global Preload ---
// Preloading at the module level ensures THREE.DefaultLoadingManager
// registers these immediately, so the LoadingScreen can accurately track them
// from the very beginning.
const globalTextureLoader = new THREE.TextureLoader();
flatProjects.forEach((item) => {
  item.previews?.forEach((previewStr) => {
    if (!previewStr.match(/\.(mp4|webm|ogg)$/i)) {
      globalTextureLoader.load(previewStr);
    }
  });
});
// ----------------------

// Card layout
const CARD_WIDTH = 8.0;
const Y_SEGMENTS = 32;

// Squeeze effect
const MAX_SQUEEZE = 0.07;
const SQUEEZE_VEL_SCALE = 0.12;

const makeSqueezeShader = (
  globalSqueezeUniform: { value: number }, 
  cardYUniform: { value: number }, 
  pinchHeightUniform: { value: number },
  pinchPowerUniform: { value: number },
  xOffset: number = 0.0,
  yOffset: number = 0.0,
  isRounded: boolean = false,
  width: number = 8.0,
  height: number = 5.0,
  radius: number = 0.4
) => {
  return (shader: any) => {
    shader.uniforms.uSqueeze = globalSqueezeUniform;
    shader.uniforms.uCardY = cardYUniform;
    shader.uniforms.uPinchHeight = pinchHeightUniform;
    shader.uniforms.uPinchPower = pinchPowerUniform;

    shader.uniforms.uSlideProgress = { value: 0.0 };
    shader.uniforms.uTex1 = { value: null };
    shader.uniforms.uTex2 = { value: null };
    
    // Default aspect to 1.0, updated via uniforms dynamically if needed
    shader.uniforms.uAspect = { value: width / height };
    shader.uniforms.uTexAspect1 = { value: 1.0 };
    shader.uniforms.uTexAspect2 = { value: 1.0 };

    if (isRounded) {
      shader.uniforms.uSize = { value: new THREE.Vector2(width, height) };
      shader.uniforms.uRadius = { value: radius };
    }

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uSqueeze;
       uniform float uCardY;
       uniform float uPinchHeight;
       uniform float uPinchPower;
       varying vec2 vUvScale;
       ${isRounded ? 'varying vec2 vMyUv;' : 'varying vec2 vUvLocal;'}
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       ${isRounded ? 'vMyUv = uv;' : 'vUvLocal = uv;'}
       
       float worldY = position.y + (${yOffset.toFixed(5)}) + uCardY;
       float nY = clamp(worldY / uPinchHeight, -1.0, 1.0);
       float sq = clamp(1.0 - nY * nY, 0.0, 1.0);
       float squeezeMask = pow(sq, uPinchPower);          
       
       float scale = 1.0 - uSqueeze * squeezeMask;
       float realX = position.x + (${xOffset.toFixed(5)});
       float scaledX = realX * scale;
       transformed.x = scaledX - (${xOffset.toFixed(5)});
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec2 uSize;
       uniform float uRadius;
       uniform float uSlideProgress;
       uniform sampler2D uTex1;
       uniform sampler2D uTex2;
       uniform float uAspect;
       uniform float uTexAspect1;
       uniform float uTexAspect2;
       ${isRounded ? 'varying vec2 vMyUv;' : 'varying vec2 vUvLocal;'}
       
       float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
           return length(max(abs(CenterPosition)-Size+Radius,0.0))-Radius;
       }

       vec2 getCoverUv(vec2 uv, float quadAspect, float texAspect) {
         vec2 newUv = uv - 0.5;
         if (quadAspect > texAspect) {
           newUv.y *= texAspect / quadAspect;
         } else {
           newUv.x *= quadAspect / texAspect;
         }
         return newUv + 0.5;
       }
      `
    );

    if (isRounded) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         vec2 centerPos = (vMyUv - 0.5) * uSize;
         float d = roundedBoxSDF(centerPos, uSize * 0.5, uRadius);
         float alpha = smoothstep(0.01, -0.01, d);
         gl_FragColor.a *= alpha;
        `
      );
    }
    
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
        // Implement slide and crop logic
        vec2 baseUv = ${isRounded ? 'vMyUv' : 'vUvLocal'};
        
        vec2 uv1 = baseUv;
        uv1.x += uSlideProgress;
        
        vec2 uv2 = baseUv;
        uv2.x += (uSlideProgress - 1.0);
        
        vec4 c1 = texture2D(uTex1, getCoverUv(uv1, uAspect, uTexAspect1));
        vec4 c2 = texture2D(uTex2, getCoverUv(uv2, uAspect, uTexAspect2));
        
        vec4 sampledDiffuseColor;
        if (baseUv.x > 1.01 - uSlideProgress) {
            sampledDiffuseColor = c2;
        } else {
            sampledDiffuseColor = c1;
        }
        
        #ifdef DECODE_VIDEO_TEXTURE
          sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
        #endif
        
        // Add angled black gradient at the bottom
        float gradientHeight = 0.5 + (1.0 - baseUv.x) * 0.35; // Left higher than right
        float gradientAlpha = 1.0 - smoothstep(0.0, gradientHeight, baseUv.y);
        gradientAlpha = pow(gradientAlpha, 1.2); // Smoother falloff
        sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(0.0), gradientAlpha * 0.95);
        
        diffuseColor *= sampledDiffuseColor;
      #endif`
    );

    // Save reference for runtime updates
    shader.userData = shader.userData || {};
    shader.userData.isCustom = true;
  };
};

export const Section3: React.FC<{ scrollValue: number }> = ({ scrollValue }) => {
  const containerRef = useRef<THREE.Group>(null);
  const { viewport: defaultViewport, size, camera, gl } = useThree();
  const viewport = defaultViewport.getCurrentViewport(camera, new THREE.Vector3(0, 0, 5));

  const isMobile = size.width <= 768;
  const headerPx = isMobile ? 50 : 70;
  const footerPx = isMobile ? 50 : 60;
  const borderPx = (headerPx + footerPx) / 2;
  const pxToUnits = viewport.height / size.height;
  const borderUnits = borderPx * pxToUnits;
  const visibleHalfHeight = viewport.height / 2 - borderUnits;

  // We calculate the target scale here
  const targetScale = Math.max(0.35, Math.min(1.0, viewport.width / 16.0));
  const currentScaleRef = useRef(targetScale);
  
  // Calculate max height for cards to remain within cinematic borders with some padding
  const paddingUnits = 0.8;
  const maxCardHeight = ((visibleHalfHeight - paddingUnits) * 2) / targetScale;
  const GAP_SPACING = 2.0;

  const [textures, setTextures] = useState<(THREE.Texture | null)[][]>(flatProjects.map(() => []));
  const [textureAspects, setTextureAspects] = useState<number[][]>(flatProjects.map(() => []));
  
  const cardHeights = useMemo(() => {
    return flatProjects.map((_, index) => {
      const aspect = textureAspects[index]?.[0] || (CARD_WIDTH / maxCardHeight);
      return Math.min(CARD_WIDTH / aspect, maxCardHeight);
    });
  }, [textureAspects, maxCardHeight]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const videos: HTMLVideoElement[] = [];

    const newTextures: (THREE.Texture | null)[][] = flatProjects.map(() => []);
    const newAspects: number[][] = flatProjects.map(() => []);

    const textureUploadQueue: THREE.Texture[] = [];
    let isQueueProcessing = false;

    const processUploadQueue = () => {
      if (textureUploadQueue.length === 0) {
        isQueueProcessing = false;
        return;
      }
      
      const texture = textureUploadQueue.shift();
      if (texture && gl) {
        try {
          gl.initTexture(texture);
        } catch (e) {}
      }

      // Schedule next texture upload
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(processUploadQueue, { timeout: 1000 });
      } else {
        setTimeout(processUploadQueue, 150);
      }
    };

    const enqueueTexture = (texture: THREE.Texture) => {
      textureUploadQueue.push(texture);
      if (!isQueueProcessing) {
        isQueueProcessing = true;
        // Wait 4 seconds for the heavy opening animations to fully complete
        // before starting background GPU uploads
        setTimeout(() => {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(processUploadQueue, { timeout: 1000 });
          } else {
            setTimeout(processUploadQueue, 150);
          }
        }, 4000);
      }
    };

    flatProjects.forEach((item, index) => {
      item.previews?.forEach((previewStr, pIdx) => {
        const isVideo = previewStr.match(/\.(mp4|webm|ogg)$/i);
        
        if (isVideo) {
          const video = document.createElement('video');
          video.src = previewStr;
          video.crossOrigin = 'Anonymous';
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          
          video.onloadedmetadata = () => {
            const aspect = video.videoWidth / video.videoHeight;
            setTextureAspects(prev => {
              const next = [...prev];
              const arr = [...(next[index] || [])];
              arr[pIdx] = aspect;
              next[index] = arr;
              return next;
            });
          };

          video.play().catch(e => console.error("Video play failed:", e));
          videos.push(video);

          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          newTextures[index][pIdx] = texture;
        } else {
          loader.load(previewStr, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            // Proactively upload to GPU to prevent stuttering during slideshow transitions
            // Enqueue it to be processed during idle time to avoid freezing main thread
            enqueueTexture(texture);
            
            if (texture.image) {
              const w = (texture.image as any).width || (texture.image as any).videoWidth;
              const h = (texture.image as any).height || (texture.image as any).videoHeight;
              if (w && h) {
                const aspect = w / h;
                setTextureAspects(prev => {
                  const next = [...prev];
                  const arr = [...(next[index] || [])];
                  arr[pIdx] = aspect;
                  next[index] = arr;
                  return next;
                });
              }
            }

            setTextures(prev => {
              const next = [...prev];
              const arr = [...(next[index] || [])];
              arr[pIdx] = texture;
              next[index] = arr;
              return next;
            });
          });
        }
      });
    });

    setTextures(newTextures);

    return () => {
      videos.forEach(v => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
    };
  }, []);

  // Dynamic Layout Calculation
  const layoutCenters = useMemo(() => {
    const centers = [0];
    let currentCenter = 0;
    for (let i = 1; i < flatProjects.length; i++) {
      const prevH = cardHeights[i-1];
      const currH = cardHeights[i];
      const isGroupBreak = flatProjects[i].isFirstInGroup;
      
      const gap = isGroupBreak ? GAP_SPACING * 3 : GAP_SPACING;
      
      const dist = (prevH / 2) + gap + (currH / 2);
      currentCenter -= dist; 
      centers.push(currentCenter);
    }
    return centers;
  }, [cardHeights]);

  useEffect(() => {
     if (layoutCenters.length > 0) {
        const lastCenter = Math.abs(layoutCenters[layoutCenters.length - 1]);
        const dynamicMaxScroll = lastCenter / 6.5; 
        scrollManager.setInternalScrollLimit(2, dynamicMaxScroll + 1.8);

        // Update the scroll offsets for Section2 synchronization so the background title perfectly tracks the cards
        layoutCenters.forEach((center, i) => {
           if (flatProjects[i]) {
             flatProjects[i].scrollOffset = Math.abs(center) / 6.5;
           }
        });
     }
  }, [layoutCenters]);

  const groupsRef = useRef<(THREE.Group | null)[]>([]);
  const textsRef = useRef<(any | null)[]>([]);
  const dateTextsRef = useRef<(any | null)[]>([]);
  
  const frameMatsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const globalSqueezeUniform = useMemo(() => ({ value: 0 }), []);
  const pinchHeightUniform = useMemo(() => ({ value: 6.5 }), []);
  const pinchPowerUniform = useMemo(() => ({ value: 2.0 }), []);
  
  const cardYUniforms = useMemo(
    () => flatProjects.map(() => ({ value: 0 })),
    []
  );

  const lastInternalScrollValue = useRef(0);
  const velocityRef = useRef(0);

  // Slideshow state
  const slideshowProgress = useRef<number[]>(new Array(flatProjects.length).fill(0));
  const activeSlideIndices = useRef<number[]>(new Array(flatProjects.length).fill(0));
  const lastSlideTimes = useRef<number[]>(new Array(flatProjects.length).fill(0));

  // Modal interaction
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (activeProjectIndex !== null) {
        setActiveProjectIndex(null);
      }
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeProjectIndex]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const time = state.clock.getElapsedTime();
    
    if (!containerRef.current) return;
    
    const currentInternalScroll = scrollManager.internalScrollValue;

    const velocity = (currentInternalScroll - lastInternalScrollValue.current) / (dt || 0.016);
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, velocity, 0.3);
    lastInternalScrollValue.current = currentInternalScroll;

    const absVel = Math.abs(velocityRef.current);
    const targetSqueeze = Math.min(absVel * SQUEEZE_VEL_SCALE, MAX_SQUEEZE);
    const lerpRate = targetSqueeze > globalSqueezeUniform.value ? 0.2 : 0.06;
    globalSqueezeUniform.value = THREE.MathUtils.lerp(globalSqueezeUniform.value, targetSqueeze, lerpRate);

    const progress = scrollValue;
    let globalOpacity = 1.0;
    let globalYOffset = 0;
    let globalXOffset = 0;
    
    // Dynamic pinch height calculation
    // Calculate the absolute world edge where the card exits the screen completely
    const H = (visibleHalfHeight / currentScaleRef.current) + (maxCardHeight / 2);
    pinchHeightUniform.value = H;
    
    // Fixed power of 2.5 provides a smooth bell curve that never flattens out prematurely
    pinchPowerUniform.value = 2.5;
    
    if (progress <= 2.0) {
      const f = Math.max(0, Math.min((progress - 1.0), 1.0));
      globalOpacity = f;
      globalYOffset = -15.0 * (1.0 - f);
    } else if (progress > 2.0) {
      const outroProgress = Math.min(1.0, (progress - 2.0) / 1.0);
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
      
      const fadePhase = Math.max(0, (outroProgress - 0.80) / 0.20);
      globalOpacity = 1.0 - fadePhase;
    }

    // Hide background objects entirely when modal is fully active
    if (activeProjectIndex !== null) {
      globalOpacity = THREE.MathUtils.lerp(globalOpacity, 0.0, 0.1);
    }

    let effectiveInternalScroll = currentInternalScroll;
    
    // Ensure effectiveInternalScroll respects boundaries loosely to avoid breaking physics
    // But since MAX_SCROLL is dynamic, just let it be.
    
    const cameraY = effectiveInternalScroll * 6.5;

    flatProjects.forEach((item, index) => {
      const group = groupsRef.current[index];
      if (!group) return;

      const layoutCenter = layoutCenters[index] || 0;
      const cardY = layoutCenter + cameraY;

      cardYUniforms[index].value = cardY;

      group.position.x = globalXOffset;
      group.position.y = cardY + globalYOffset;
      group.position.z = 0;
      group.scale.setScalar(1);

      const distanceY = Math.abs(cardY);
      let cardOpacity = globalOpacity;
      
      const fadeStart = 3.5;
      const fadeEnd = 15.0;
      
      if (distanceY > fadeEnd) {
        cardOpacity = 0;
      } else if (distanceY > fadeStart) {
        const fadeRatio = (distanceY - fadeStart) / (fadeEnd - fadeStart);
        cardOpacity *= Math.max(0, 1.0 - fadeRatio);
      }

      group.visible = cardOpacity > 0.001;

      // Handle Slideshow Logic per material
      const mat = frameMatsRef.current[index];
      if (mat) {
         mat.opacity = cardOpacity;
         
         // WebGL uniform injection for slideshow
         const shader = mat.userData?.shader;
         const projTextures = textures[index] || [];
         const projAspects = textureAspects[index] || [];
         const numSlides = projTextures.length;
         
         if (shader && numSlides > 0) {
            let slideIdx = activeSlideIndices.current[index];
            
            // Auto slideshow timer if not clicked
            if (activeProjectIndex === null && numSlides > 1) {
               if (time - lastSlideTimes.current[index] > 4.0) {
                  lastSlideTimes.current[index] = time;
                  activeSlideIndices.current[index] = (slideIdx + 1) % numSlides;
                  slideshowProgress.current[index] = 1.0; // trigger transition
               }
            }
            
            slideIdx = activeSlideIndices.current[index];
            let nextSlideIdx = (slideIdx - 1 + numSlides) % numSlides; // The slide that is leaving
            
            if (slideshowProgress.current[index] > 0) {
               slideshowProgress.current[index] = Math.max(0, slideshowProgress.current[index] - dt * 2.0);
            }
            
            shader.uniforms.uTex1.value = projTextures[slideIdx] || null;
            shader.uniforms.uTex2.value = projTextures[nextSlideIdx] || null;
            
            shader.uniforms.uAspect.value = CARD_WIDTH / cardHeights[index];
            shader.uniforms.uTexAspect1.value = projAspects[slideIdx] || 1.0;
            shader.uniforms.uTexAspect2.value = projAspects[nextSlideIdx] || 1.0;
            
            shader.uniforms.uSlideProgress.value = slideshowProgress.current[index];
         }
      }

      const text = textsRef.current[index];
      const bottomY = -cardHeights[index] / 2;
      const titleLocalY = bottomY + 0.8;
      const dateLocalY = bottomY + (/[gjpqy,;Q]/.test(flatProjects[index].name.substring(0, 8)) ? 0.65 : 0.75);

      if (text) {
        text.fillOpacity = cardOpacity;
        const worldY = titleLocalY + cardY;
        const nY = THREE.MathUtils.clamp(worldY / pinchHeightUniform.value, -1.0, 1.0);
        const sq = 1.0 - nY * nY;
        const squeezeMask = sq * sq;
        const squeezeScale = 1.0 - globalSqueezeUniform.value * squeezeMask;
        text.scale.x = squeezeScale;
        text.position.x = (-CARD_WIDTH / 2 + 0.6) * squeezeScale;
      }
      
      const dateText = dateTextsRef.current[index];
      if (dateText) {
        dateText.fillOpacity = cardOpacity;
        const worldY = dateLocalY + cardY;
        const nY = THREE.MathUtils.clamp(worldY / pinchHeightUniform.value, -1.0, 1.0);
        const sq = 1.0 - nY * nY;
        const squeezeMask = sq * sq;
        const squeezeScale = 1.0 - globalSqueezeUniform.value * squeezeMask;
        dateText.scale.x = squeezeScale;
        dateText.position.x = (-CARD_WIDTH / 2 + 0.6) * squeezeScale;
      }
    });
    
    if (containerRef.current) {
      currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, 10 * dt);
      containerRef.current.scale.setScalar(currentScaleRef.current);
    }
  });

  return (
    <>
      <group ref={containerRef} position={[0, 0, 5]}>
        {DEBUG_GUIDES && (
          <>
            <mesh position={[-CARD_WIDTH / 2, 0, 0.2]}>
              <planeGeometry args={[0.02, 40, 1, 64]} />
              <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[CARD_WIDTH / 2, 0, 0.2]}>
              <planeGeometry args={[0.02, 40, 1, 64]} />
              <meshBasicMaterial color="red" />
            </mesh>
          </>
        )}
        <GlassObjects scrollValue={scrollValue} />
        {flatProjects.map((item, i) => (
          <group
            key={i}
            ref={el => groupsRef.current[i] = el}
            position={[0, -20, 0]}
          >
            <mesh onClick={() => setActiveProjectIndex(i)}>
              <planeGeometry args={[CARD_WIDTH, cardHeights[i], 1, 16]} />
              <meshBasicMaterial
                ref={el => frameMatsRef.current[i] = el as any}
                color={0xffffff}
                map={textures[i]?.[0] || null} // placeholder to trigger USE_MAP
                transparent
                depthWrite={false}
                toneMapped={false}
                opacity={0}
                customProgramCacheKey={() => `frame_rounded_${i}`}
                onBeforeCompile={(shader) => {
                  makeSqueezeShader(globalSqueezeUniform, cardYUniforms[i], pinchHeightUniform, pinchPowerUniform, 0, 0, true, CARD_WIDTH, cardHeights[i], 0.4)(shader);
                  if (frameMatsRef.current[i]) {
                    (frameMatsRef.current[i] as any).userData.shader = shader;
                  }
                }}
              />
            </mesh>

            <Text
              ref={el => textsRef.current[i] = el}
              position={[-CARD_WIDTH / 2 + 0.6, -cardHeights[i] / 2 + 0.8, 1.0]}
              renderOrder={10}
              material-depthTest={false}
              fontSize={0.4}
              color="#ffffff"
              font="/fonts/ScienceGothic-w350-x70-baked.ttf"
              anchorX="left"
              anchorY="bottom-baseline"
              textAlign="left"
              maxWidth={CARD_WIDTH - 1.2}
              letterSpacing={0.02}
            >
              {item.name}
            </Text>

            <Text
              ref={el => dateTextsRef.current[i] = el}
              position={[-CARD_WIDTH / 2 + 0.6, -cardHeights[i] / 2 + (/[gjpqy,;Q]/.test(item.name.substring(0, 8)) ? 0.65 : 0.75), 1.0]}
              renderOrder={10}
              material-depthTest={false}
              fontSize={0.18}
              color="#a0a0a0"
              font="/fonts/ScienceGothic-w350-x70-baked.ttf"
              anchorX="left"
              anchorY="top"
              textAlign="left"
              maxWidth={CARD_WIDTH - 1.2}
              letterSpacing={0.05}
            >
              {formatDate(item.date)}
            </Text>
          </group>
        ))}
      </group>
      
      <Html fullscreen style={{ pointerEvents: 'none', zIndex: 100 }}>
        <AnimatePresence>
          {activeProjectIndex !== null && (
            <ProjectModal 
               key="modal"
               project={flatProjects[activeProjectIndex]} 
               onClose={() => setActiveProjectIndex(null)}
            />
          )}
        </AnimatePresence>
      </Html>
    </>
  );
};
