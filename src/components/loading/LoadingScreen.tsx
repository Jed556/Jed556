import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCursor } from '../../context/CursorContext';
import { useProgress } from '@react-three/drei';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const { setVariant } = useCursor();
  const [isLoaded, setIsLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const { active, progress, total } = useProgress();

  useEffect(() => {
    setVariant('loading');
    
    if (document.readyState === 'complete') {
      setIsLoaded(true);
    } else {
      const handleLoad = () => setIsLoaded(true);
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [setVariant]);

  // Enforce a minimum 1.5s loading screen time
  useEffect(() => {
    const start = Date.now();
    const duration = 1500;
    const interval = setInterval(() => {
      if (Date.now() - start >= duration) {
        clearInterval(interval);
        setMinTimePassed(true);
      }
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Determine the target progress (minimum 30% to avoid it looking stuck at 0)
  const targetProgress = total === 0 && minTimePassed ? 100 : Math.max(30, progress);
  const [maxProgress, setMaxProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const smoothProgressRef = useRef(0);
  
  // Track the highest target we've seen so it never goes backwards
  useEffect(() => {
    setMaxProgress(prev => Math.max(prev, targetProgress));
  }, [targetProgress]);

  // Smoothly animate the liquid level towards maxProgress
  useEffect(() => {
    let frameId: number;
    const lerp = () => {
      const diff = maxProgress - smoothProgressRef.current;
      // Lerp by 5% each frame. Provides a buttery smooth glide to the target.
      let next = smoothProgressRef.current + diff * 0.05; 
      
      // Snap to 100 at the very end to ensure it perfectly completes
      if (maxProgress === 100 && next > 99.5) {
        next = 100;
      }
      
      smoothProgressRef.current = next;
      setDisplayProgress(next);
      
      frameId = requestAnimationFrame(lerp);
    };
    frameId = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(frameId);
  }, [maxProgress]);

  useEffect(() => {
    // Wait for window load, minimum 1.5s time, Three.js loading to finish, 
    // AND wait for the liquid animation to physically reach 100% on screen.
    if (isLoaded && minTimePassed && !active && (progress === 100 || total === 0) && displayProgress === 100) {
      onComplete();
      // Delay cursor appearance so it scales in just before the split finishes, avoiding unmount skips
      setTimeout(() => setVariant('default'), 700);
    }
  }, [isLoaded, minTimePassed, active, progress, total, displayProgress, onComplete, setVariant]);

  const targetY = 506.34 * (1 - (displayProgress / 100));

  return (
    <motion.div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2000,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      exit={{ opacity: 1 }}
    >
      <motion.div 
        layoutId="logo-container"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '150px',
          aspectRatio: '716.7 / 506.34'
        }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      >
        <svg viewBox="0 0 716.7 506.34" style={{ width: '100%', height: '100%' }}>
          <defs>
            <clipPath id="liquid-clip">
              <motion.rect 
                x="0" 
                y="0" 
                width="716.7" 
                height="506.34"
                initial={{ y: 506.34 }}
                animate={{ y: targetY }}
                transition={{ type: "tween", ease: "easeOut", duration: 0.1 }}
              />
            </clipPath>
          </defs>
          <g opacity={0.2} fill="#fff">
            <path d="m626.99,335.85l-41.45-72.13h-132.02l-65.01,242.62h192.79l45.68-170.49Zm-86.15,117.74h-83.58l36.75-137.13h61.09l15.36,26.61-29.62,110.53Z"/>
            <polygon points="702.57 52.74 716.7 0 524.19 0 473.31 189.88 459.18 242.62 651.69 242.62 665.82 189.88 527.91 189.88 538.09 151.9 676 151.9 690.13 99.16 552.22 99.16 564.66 52.74 702.57 52.74"/>
            <polygon points="360.81 0 253.4 400.85 137.47 400.85 179.87 242.62 70.66 242.62 0 506.34 334.34 506.34 470.02 0 360.81 0"/>
          </g>
          <g clipPath="url(#liquid-clip)" fill="#fff">
            <path d="m626.99,335.85l-41.45-72.13h-132.02l-65.01,242.62h192.79l45.68-170.49Zm-86.15,117.74h-83.58l36.75-137.13h61.09l15.36,26.61-29.62,110.53Z"/>
            <polygon points="702.57 52.74 716.7 0 524.19 0 473.31 189.88 459.18 242.62 651.69 242.62 665.82 189.88 527.91 189.88 538.09 151.9 676 151.9 690.13 99.16 552.22 99.16 564.66 52.74 702.57 52.74"/>
            <polygon points="360.81 0 253.4 400.85 137.47 400.85 179.87 242.62 70.66 242.62 0 506.34 334.34 506.34 470.02 0 360.81 0"/>
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
