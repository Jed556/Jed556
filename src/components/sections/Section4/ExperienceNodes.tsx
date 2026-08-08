import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { experiences, EXPERIENCE_SPACING } from '../../../data/experience';
import { scrollManager } from '../../../utils/ScrollManager';

interface ExperienceNodesProps {
  opacityRef: React.MutableRefObject<number>;
  activeNodePosRef: React.MutableRefObject<THREE.Vector3>;
  activeNodeRotRef: React.MutableRefObject<number>;
}


import { formatPeriod } from '../../../utils/dateFormatter';

export const ExperienceNodes: React.FC<ExperienceNodesProps> = ({ opacityRef, activeNodePosRef, activeNodeRotRef }) => {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const progressRefs = useRef<React.MutableRefObject<number>[]>(experiences.map(() => ({ current: 0 })));
  
  // We need refs for the 3 text components per node to animate their opacity and position
  const roleRefs = useRef<(any | null)[]>([]);
  const companyRefs = useRef<(any | null)[]>([]);
  const descRefs = useRef<(any | null)[]>([]);

  // The speed at which nodes move towards the camera per internal scroll unit
  const Z_SPEED = 12.0; 
  // Initial starting depth
  const Z_START = -40.0;

  useFrame(() => {
    // We only process if we are in or near Scene 4
    if (opacityRef.current <= 0) return;

    const scrollVal = scrollManager.internalScrollValue;
    // We STILL use Gaussian weights to map out the physical flight path position
    // We use a clean Gaussian blend of the camera's ideal path!
    let totalWeight = 0; 
    let weightedX = 0;
    let weightedY = 0;
    let weightedRot = 0;

    const TARGET_Z = 15.0; 
    // Tighter spread (800) so the camera quickly snaps to the normal line of the next text
    const SPREAD = 800.0; 

    // Find the next upcoming node to look at
    let activeNodeIndex = 0;
    let minAbsDist = Infinity;
    let activeNodeCurrentZ = 0;

    experiences.forEach((exp, index) => {
      const group = groupRefs.current[index];
      if (!group) return;

      const triggerScroll = index * EXPERIENCE_SPACING;
      const currentZ = Z_START + ((scrollVal - triggerScroll) * Z_SPEED);
      const [xPos, yPos] = exp.position;
      const rotY = exp.rotationY;

      // Update visibility and opacity
      group.position.set(xPos, yPos, currentZ);
      group.rotation.set(0, rotY, 0);

      let localOpacity = 1.0;
      if (currentZ < 5) {
        // Reduced fade distance from 75.0 to 30.0 so the text starts completely invisible at Z=-40
        localOpacity = Math.max(0, 1.0 - ((5 - currentZ) / 30.0));
      } else if (currentZ > 10) {
        localOpacity = Math.max(0, 1.0 - ((currentZ - 10) / 4.0));
      }
      
      progressRefs.current[index].current = localOpacity;
      
      if (currentZ > 20 || localOpacity <= 0.01) {
        group.visible = false;
      } else {
        group.visible = true;
        
        // Premium typographic reveal: Slide up slightly and fade in
        const easeOpacity = Math.pow(localOpacity, 2.0); 
        const slideOffset = (1.0 - easeOpacity) * -0.5;

        // Dynamic top-down layout
        const roleLineHeight = 1.1; 
        const isMultiline = exp.role.length > 20;
        
        // Only check for descenders on the last line of the role
        const roleLastLine = isMultiline ? exp.role.substring(exp.role.lastIndexOf(' ')) : exp.role;
        const roleHasDescender = /[gjpqy,;Q]/.test(roleLastLine);
        
        const formattedPeriod = formatPeriod(exp.periodStart, exp.periodEnd);
        const companyHasDescender = /[gjpqy,;Q]/.test(exp.company + formattedPeriod);

        let currentY = 1.1; // Top starting position

        const roleBaseY = currentY;
        currentY -= isMultiline ? (0.6 * 1.8 * roleLineHeight) : 0.6;
        
        currentY -= 0.15; // Gap below role
        if (roleHasDescender) currentY -= 0.08;

        const companyBaseY = currentY;
        currentY -= 0.25; // Company height
        
        currentY -= 0.15; // Gap below company
        if (companyHasDescender) currentY -= 0.08;

        const descBaseY = currentY;

        // Position slides and fades
        const roleText = roleRefs.current[index];
        if (roleText) {
          roleText.fillOpacity = easeOpacity;
          roleText.position.y = roleBaseY + slideOffset;
        }

        const companyText = companyRefs.current[index];
        if (companyText) {
          companyText.fillOpacity = easeOpacity;
          companyText.position.y = companyBaseY + slideOffset;
        }

        const descText = descRefs.current[index];
        if (descText) {
          descText.fillOpacity = easeOpacity;
          descText.position.y = descBaseY + slideOffset;
        }
      }

      const finalOpacity = localOpacity * opacityRef.current;
      group.children.forEach((child: any) => {
        if (child.material) {
          if (child.fillOpacity !== undefined) {
            child.fillOpacity = finalOpacity;
          } else if (child.type === 'Mesh' && child.material.opacity !== undefined) {
            child.material.opacity = finalOpacity;
          }
        }
      });

      // Find the closest node that hasn't fallen too far behind the camera.
      if (currentZ < 25.0) {
        const distToLens = Math.abs(currentZ - TARGET_Z);
        if (distToLens < minAbsDist) {
          minAbsDist = distToLens;
          activeNodeIndex = index;
          activeNodeCurrentZ = currentZ;
        }
      }

      // The distance from the camera to the text (Positive if text is in front of camera)
      // We clamp it to 0 when it passes the camera so it doesn't shoot sideways to infinity
      const distToCamera = Math.max(0, TARGET_Z - currentZ); 
      const normalX = Math.sin(rotY); 

      // To guarantee we face the text perfectly FLATLY and keep it in the dead center,
      // the camera MUST physically travel exactly along the text's infinite normal vector!
      const idealX = xPos + normalX * distToCamera; 

      // Apply Gaussian weight based on Z distance so the camera smoothly weaves from 
      // one normal line to the next!
      const dist = currentZ - TARGET_Z;
      const weight = Math.exp(-(dist * dist) / SPREAD);

      weightedX += idealX * weight;
      weightedY += yPos * weight;
      weightedRot += rotY * weight;
      totalWeight += weight;
    });

    // Determine the exact physical position target
    const smoothTargetPos = totalWeight > 0 
      ? new THREE.Vector3(weightedX / totalWeight, weightedY / totalWeight, 0)
      : new THREE.Vector3(0, 0, 0);
      
    const smoothTargetRot = totalWeight > 0 ? weightedRot / totalWeight : 0;

    // Smooth, organic lerp that perfectly follows the nodes
    // High lerp speed (0.15) eliminates camera lag so fast scrolls don't push the text off-screen
    activeNodePosRef.current.lerp(smoothTargetPos, 0.15);
    activeNodeRotRef.current = THREE.MathUtils.lerp(activeNodeRotRef.current, smoothTargetRot, 0.15);
  });

  return (
    <group>
      {experiences.map((exp, index) => {
        // Dynamic top-down layout
        const roleLineHeight = 1.1; 
        const isMultiline = exp.role.length > 20;
        
        const roleLastLine = isMultiline ? exp.role.substring(exp.role.lastIndexOf(' ')) : exp.role;
        const roleHasDescender = /[gjpqy,;Q]/.test(roleLastLine);
        
        const formattedPeriod = formatPeriod(exp.periodStart, exp.periodEnd);
        const companyHasDescender = /[gjpqy,;Q]/.test(exp.company + formattedPeriod);

        let currentY = 1.1;

        const roleBaseY = currentY;
        currentY -= isMultiline ? (0.6 * 1.8 * roleLineHeight) : 0.6;
        
        currentY -= 0.15;
        if (roleHasDescender) currentY -= 0.08;

        const companyBaseY = currentY;
        currentY -= 0.25;
        
        currentY -= 0.15;
        if (companyHasDescender) currentY -= 0.08;

        const descBaseY = currentY;

        return (
        <group key={exp.id} ref={(el) => (groupRefs.current[index] = el)}>
          {/* Role */}
          <Text
            ref={(el: any) => roleRefs.current[index] = el}
            position={[0, roleBaseY, 0]}
            fontSize={0.6}
            lineHeight={roleLineHeight}
            color="#ffffff"
            font="/fonts/ScienceGothic-w350-x70-baked.ttf"
            anchorX="center"
            anchorY="top"
            maxWidth={5.5}
            textAlign="center"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {exp.role}
          </Text>
          
          {/* Company & Period */}
          <Text
            ref={(el: any) => companyRefs.current[index] = el}
            position={[0, companyBaseY, 0]}
            fontSize={0.25}
            color="#a0a0a0"
            font="/fonts/ScienceGothic-w350-x70-baked.ttf"
            anchorX="center"
            anchorY="top"
            maxWidth={5.5}
            textAlign="center"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {formattedPeriod ? `${exp.company}  //  ${formattedPeriod}` : exp.company}
          </Text>

          {/* Description */}
          <Text
            ref={(el: any) => descRefs.current[index] = el}
            position={[0, descBaseY, 0]}
            fontSize={0.18}
            color="#777777"
            font="/fonts/ScienceGothic-w350-x70-baked.ttf"
            anchorX="center"
            anchorY="top"
            maxWidth={4.0}
            textAlign="center"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            {exp.description}
          </Text>
        </group>
        );
      })}
    </group>
  );
};
