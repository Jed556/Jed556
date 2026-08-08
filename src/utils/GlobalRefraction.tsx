import React, { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

export const globalGlassObjects = new Set<THREE.Object3D>();

export const globalRefraction = {
  texture: null as THREE.Texture | null,
};

export const RefractionManager = () => {
  const { gl, size, viewport } = useThree();
  const dpr = Math.min(window.devicePixelRatio, 2);
  
  // Use half resolution for the FBO to drastically improve performance (blur covers up low res)
  const fbo = useFBO((size.width * dpr) / 2, (size.height * dpr) / 2);

  useFrame((state) => {
    // 1. Hide ALL glass objects globally
    globalGlassObjects.forEach((obj) => {
      // We store their original visibility so we don't accidentally unhide something 
      // that was hidden by its own section logic (e.g. scrolled out of view)
      obj.userData.wasVisible = obj.visible;
      obj.visible = false;
    });

    // 2. Render the clean background scene (without glass) to the FBO
    state.gl.setRenderTarget(fbo);
    state.gl.render(state.scene, state.camera);
    state.gl.setRenderTarget(null);

    // 3. Restore visibility state
    globalGlassObjects.forEach((obj) => {
      if (obj.userData.wasVisible !== undefined) {
        obj.visible = obj.userData.wasVisible;
      }
    });

    // 4. Update the global texture reference
    globalRefraction.texture = fbo.texture;
    
    // 5. Render final scene to screen
    state.gl.render(state.scene, state.camera);
  }, 1); // Render Priority 1: Execute after all priority 0 updates and take over the render loop

  return null;
};
