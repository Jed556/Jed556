import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, MotionValue } from 'framer-motion';

export interface MouseMotionValues {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rawX: MotionValue<number>;
  rawY: MotionValue<number>;
  velocity: MotionValue<number>;
  angle: MotionValue<number>;
}

export function useMousePosition(springConfig = { damping: 25, stiffness: 400, mass: 0.5 }): MouseMotionValues {
  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);
  
  const velocity = useMotionValue(0);
  const angle = useMotionValue(0);
  
  const lastX = useRef(-100);
  const lastY = useRef(-100);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
      
      // Snap springs immediately without animation
      if (typeof x.jump === 'function') {
        x.jump(e.clientX);
        y.jump(e.clientY);
      } else {
        x.set(e.clientX);
        y.set(e.clientY);
      }
      
      // Reset velocity trackers so it doesn't leave a trail
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      velocity.set(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);

    const updateVelocity = () => {
      const currentX = x.get();
      const currentY = y.get();
      
      const dx = currentX - lastX.current;
      const dy = currentY - lastY.current;
      
      const vel = Math.sqrt(dx * dx + dy * dy);
      velocity.set(vel);
      
      if (vel > 0.1) {
        angle.set(Math.atan2(dy, dx) * (180 / Math.PI));
      }
      
      lastX.current = currentX;
      lastY.current = currentY;
      
      requestRef.current = requestAnimationFrame(updateVelocity);
    };

    requestRef.current = requestAnimationFrame(updateVelocity);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [rawX, rawY, x, y, velocity, angle]);

  return { x, y, rawX, rawY, velocity, angle };
}
