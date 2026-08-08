import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeVertices } from 'three-stdlib';
import Transparent from './Transparent';
import type { TransparentRef } from './Transparent';
import { globalGlassObjects, globalRefraction } from '../../../../utils/GlobalRefraction';

// Add type declaration for the custom shader material
declare module '@react-three/fiber' {
  interface ThreeElements {
    glassMaterial: any;
  }
}

const Transparents: React.FC<{ scrollValue: number }> = ({ scrollValue = 0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const cubeRef = useRef<TransparentRef>(null);
  const cylinderRef = useRef<TransparentRef>(null);

  const { viewport } = useThree();
  
  React.useEffect(() => {
    if (groupRef.current) {
      globalGlassObjects.add(groupRef.current);
      return () => {
        globalGlassObjects.delete(groupRef.current!);
      };
    }
  }, []);

  // Calculate portraitWeight (0 = landscape desktop, 1 = portrait mobile)
  const portraitWeight = Math.max(0, Math.min(1, (20 - viewport.width) / 12));

  // Dynamically blend positions based on portraitWeight
  const boxBaseX = -4 + portraitWeight * 2.8; 
  const boxBaseY = 1 + portraitWeight * 0.5;  
  const boxScale = 0.8 - portraitWeight * 0.3; 

  const cylinderBaseX = 4 - portraitWeight * 2.8; 
  const cylinderBaseY = -1 - portraitWeight * 0.5; 
  const cylinderScale = 0.6 - portraitWeight * 0.2; 

  // Create a rounded cylinder using ExtrudeGeometry (circle with bevel)
  const roundedCylinderGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.7, 0, Math.PI * 2, false);
    
    let geometry: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 1.5,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.15,
      bevelSegments: 32, // Reduced from 16 (huge performance win for mergeVertices)
      curveSegments: 128 // Reduced from 32
    });
    geometry.center(); 
    geometry.rotateX(Math.PI / 2);

    // Merge duplicate vertices to ensure perfectly smooth shading across the seam
    geometry = mergeVertices(geometry, 1e-4);
    geometry.computeVertexNormals();

    return geometry;
  }, []);

  useFrame((state) => {
    // FBO Render Pass is now handled globally
    if (groupRef.current) {
      const isOffscreen = scrollValue > 2.2;
      groupRef.current.visible = !isOffscreen;

      // 5. Update custom shader uniforms on children
      const time = state.clock.getElapsedTime();
      
      [cubeRef, cylinderRef].forEach((childRef) => {
        if (childRef.current?.materialRef.current) {
          const mat = childRef.current.materialRef.current;
          mat.uSceneTex = globalRefraction.texture;
          mat.time = time;
          mat.winResolution.set(state.size.width * state.viewport.dpr, state.size.height * state.viewport.dpr);
          
          if (mat.type === 'ShaderMaterial' && mat.uniforms.uVisibility) {
            // Use scrollValue to determine opacity
            let progress = scrollValue;
            if (scrollValue >= 0 && scrollValue <= 1.0) {
              progress = Math.max(0, (scrollValue - 0.2) / 0.8);
            }
            
            let targetVisibility = 1.0;
            if (progress <= 1.0) {
              targetVisibility = Math.max(0, Math.min(progress * 1.5, 1.0));
            }
            // Removed fade-out for progress > 2.0 so they stay fully visible as they float up into Section 3.
            
            mat.uniforms.uVisibility.value = targetVisibility;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <Transparent 
        ref={cubeRef} 
        type="cube" 
        baseX={boxBaseX} 
        baseY={boxBaseY} 
        scale={boxScale} 
        scrollValue={scrollValue}
      />
      <Transparent 
        ref={cylinderRef} 
        type="cylinder" 
        geometry={roundedCylinderGeometry} 
        baseX={cylinderBaseX} 
        baseY={cylinderBaseY} 
        scale={cylinderScale} 
        scrollValue={scrollValue}
      />
    </group>
  );
};

export default Transparents;
