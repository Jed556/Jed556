import { useEffect, useState } from 'react';
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useCursor } from '../../context/CursorContext';
import type { CursorVariant } from '../../context/CursorContext';
import { useMousePosition } from '../../hooks/useMousePosition';
import './CustomCursor.css';

export default function CustomCursor() {
  const { variant, setVariant } = useCursor();
  const { x, y, rawX, rawY, velocity, angle } = useMousePosition();
  
  const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
  const [isOffscreen, setIsOffscreen] = useState(false);

  // Derived motion values for the wrapper to bypass React renders
  const wrapperX = useMotionValue(-100);
  const wrapperY = useMotionValue(-100);
  const wrapperAngle = useMotionValue(0);
  const innerX = useMotionValue(0);
  const innerY = useMotionValue(0);

  useAnimationFrame(() => {
    if (variant === 'expand' && hoveredEl) {
      const rect = hoveredEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      wrapperX.set(centerX + (rawX.get() - centerX) * 0.15);
      wrapperY.set(centerY + (rawY.get() - centerY) * 0.15);
      wrapperAngle.set(0);

      const maxInnerOffset = 8;
      let ix = (rawX.get() - centerX) * 0.25;
      let iy = (rawY.get() - centerY) * 0.25;
      
      innerX.set(Math.max(-maxInnerOffset, Math.min(maxInnerOffset, ix)));
      innerY.set(Math.max(-maxInnerOffset, Math.min(maxInnerOffset, iy)));
    } else {
      wrapperX.set(x.get());
      wrapperY.set(y.get());
      wrapperAngle.set(angle.get());
      innerX.set(0);
      innerY.set(0);
    }
  });

  useEffect(() => {
    const handleMouseLeave = () => setIsOffscreen(true);
    const handleMouseEnter = () => setIsOffscreen(false);

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      if (variant === 'loading') return;

      const target = e.target as HTMLElement;
      const cursorTarget = target.closest('[data-cursor]') as HTMLElement;
      
      if (cursorTarget) {
        const customVariant = cursorTarget.getAttribute('data-cursor') as CursorVariant;
        setVariant(customVariant);
        if (customVariant === 'expand') {
          setHoveredEl(cursorTarget);
        }
      } else {
        setVariant('default');
        setHoveredEl(null);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [setVariant, variant]);

  const variants = {
    default: {
      width: 12,
      height: 12,
      backgroundColor: '#ffffff',
      border: '0px solid #ffffff',
      opacity: 1,
    },
    'scroll-y': {
      width: 32,
      height: 32,
      backgroundColor: 'transparent',
      border: '1.5px solid #ffffff',
      opacity: 1,
    },
    'scroll-x': {
      width: 32,
      height: 32,
      backgroundColor: 'transparent',
      border: '1.5px solid #ffffff',
      opacity: 1,
    },
    expand: {
      width: 48,
      height: 48,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      border: '1px solid #ffffff',
      opacity: 1,
    },
    hidden: {
      width: 12,
      height: 12,
      backgroundColor: '#ffffff',
      opacity: 0,
    },
    loading: {
      width: 0,
      height: 0,
      backgroundColor: '#ffffff',
      border: '0px solid #ffffff',
      opacity: 0,
    },
    offscreen: {
      width: 0,
      height: 0,
      opacity: 0,
    }
  };

  const scaleY = useTransform(velocity, (v) => variant === 'expand' ? 1 : 1 - Math.min(v * 0.02, 0.3));
  const tailWidth = useTransform(velocity, (v) => variant === 'expand' ? '0px' : `${Math.min(v * 2.5, 80)}px`);

  return (
    <motion.div
      className="cursor-wrapper"
      style={{
        x: wrapperX,
        y: wrapperY,
        rotate: wrapperAngle,
        transformOrigin: '0 0',
      }}
    >
      <motion.div
        className="custom-cursor"
        initial={variant}
        animate={isOffscreen ? 'offscreen' : variant}
        variants={variants}
        style={{
          x: '-50%',
          y: '-50%',
          borderRadius: '999px',
          scaleY: scaleY,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: variant === 'expand' ? 150 : 500, 
          damping: variant === 'expand' ? 15 : 14, 
          mass: 0.5 
        }}
      >
        {/* Pill-shaped Jelly Tail */}
        <motion.div 
          style={{
            position: 'absolute',
            right: '50%',
            top: 0,
            height: '100%',
            width: tailWidth,
            backgroundColor: '#ffffff',
            borderTopLeftRadius: '100% 50%',
            borderBottomLeftRadius: '100% 50%',
            zIndex: -1,
            opacity: variant === 'default' ? 1 : 0,
            pointerEvents: 'none',
          }}
        />

      {variant === 'scroll-y' && (
        <svg viewBox="0 0 24 24" fill="none" className="cursor-icon">
          <path d="M12 4v16m0-16l-4 4m4-4l4 4m-4 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {variant === 'scroll-x' && (
        <svg viewBox="0 0 24 24" fill="none" className="cursor-icon">
          <path d="M4 12h16M4 12l4-4m-4 4l4 4m12-4l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {variant === 'expand' && (
        <motion.div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', x: innerX, y: innerY }}
        >
          <Plus size={20} strokeWidth={1.5} color="#ffffff" />
        </motion.div>
      )}
      </motion.div>
    </motion.div>
  );
}
