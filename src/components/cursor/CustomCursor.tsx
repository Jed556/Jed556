import { useEffect, useState, useRef } from 'react';
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

  // Detect mobile / touch environment
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.innerWidth <= 768;
    return (isCoarse && hasTouch) || (isSmallScreen && hasTouch) || isCoarse;
  });

  // Mobile tap animation state: 'hidden' -> 'in' -> 'out' -> 'hidden'
  const [mobileTapState, setMobileTapState] = useState<'hidden' | 'in' | 'out'>('hidden');
  const [tapKey, setTapKey] = useState(0);

  const outTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Keep mobile detection updated on resize or device change
  useEffect(() => {
    const handleResizeOrChange = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile((isCoarse && hasTouch) || (isSmallScreen && hasTouch) || isCoarse);
    };

    window.addEventListener('resize', handleResizeOrChange);
    const mql = window.matchMedia('(pointer: coarse)');
    mql.addEventListener?.('change', handleResizeOrChange);

    return () => {
      window.removeEventListener('resize', handleResizeOrChange);
      mql.removeEventListener?.('change', handleResizeOrChange);
    };
  }, []);

  // Derived motion values for the wrapper to bypass React renders
  const wrapperX = useMotionValue(-100);
  const wrapperY = useMotionValue(-100);
  const wrapperAngle = useMotionValue(0);
  const innerX = useMotionValue(0);
  const innerY = useMotionValue(0);

  const isSwipingRef = useRef(false);

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

  // Touch handlers for mobile: show on tap with in/out animation, follow finger with desktop physics during swipe
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (variant === 'loading') return;
      if (e.touches.length === 0) return;

      const touch = e.touches[0];
      const tapX = touch.clientX;
      const tapY = touch.clientY;

      touchStartPos.current = { x: tapX, y: tapY, time: Date.now() };
      isSwipingRef.current = false;

      if (!isMobile) {
        setIsMobile(true);
      }

      // Snap cursor coordinates immediately to tap position
      wrapperX.set(tapX);
      wrapperY.set(tapY);
      wrapperAngle.set(0);
      innerX.set(0);
      innerY.set(0);
      rawX.set(tapX);
      rawY.set(tapY);
      if (typeof (x as any).jump === 'function') {
        (x as any).jump(tapX);
        (y as any).jump(tapY);
      } else {
        x.set(tapX);
        y.set(tapY);
      }
      velocity.set(0);

      // Check element under tap for cursor variant (e.g. expand for cards/buttons)
      const target = document.elementFromPoint(tapX, tapY) as HTMLElement | null;
      const cursorTarget = target?.closest('[data-cursor]') as HTMLElement | null;
      if (cursorTarget) {
        const customVariant = cursorTarget.getAttribute('data-cursor') as CursorVariant;
        if (customVariant === 'expand') {
          setVariant('expand');
          setHoveredEl(cursorTarget);
        } else {
          setVariant('default');
          setHoveredEl(null);
        }
      } else {
        setVariant('default');
        setHoveredEl(null);
      }

      // Reset any active timers from previous tap
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);

      // Trigger "in" animation
      setTapKey((k) => k + 1);
      setMobileTapState('in');

      // Schedule "out" animation after a while (~550ms) for stationary tap
      outTimerRef.current = setTimeout(() => {
        if (!isSwipingRef.current) {
          setMobileTapState('out');
          hiddenTimerRef.current = setTimeout(() => {
            setMobileTapState('hidden');
            setVariant('default');
            setHoveredEl(null);
          }, 350);
        }
      }, 550);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      const dist = Math.hypot(dx, dy);

      // Finger movement indicates swiping/dragging (just like desktop mouse movement)
      if (dist > 6) {
        isSwipingRef.current = true;
        // Cancel stationary tap out-timer
        if (outTimerRef.current) clearTimeout(outTimerRef.current);
        if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);

        // If previously hidden or animating out, trigger in-animation
        setMobileTapState((prev) => {
          if (prev !== 'in') {
            setTapKey((k) => k + 1);
            return 'in';
          }
          return prev;
        });

        // Check if swiping over interactive elements
        const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
        const cursorTarget = target?.closest('[data-cursor]') as HTMLElement | null;
        if (cursorTarget) {
          const customVariant = cursorTarget.getAttribute('data-cursor') as CursorVariant;
          if (customVariant === 'expand') {
            setVariant('expand');
            setHoveredEl(cursorTarget);
          } else {
            setVariant('default');
            setHoveredEl(null);
          }
        } else {
          setVariant('default');
          setHoveredEl(null);
        }

        // If user pauses their finger mid-swipe for 600ms, gently animate out
        outTimerRef.current = setTimeout(() => {
          setMobileTapState('out');
          hiddenTimerRef.current = setTimeout(() => {
            setMobileTapState('hidden');
          }, 350);
        }, 600);
      }

      rawX.set(touch.clientX);
      rawY.set(touch.clientY);
    };

    const handleTouchEnd = () => {
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);

      if (isSwipingRef.current) {
        // User was swiping: immediately trigger the distinct out animation
        outTimerRef.current = setTimeout(() => {
          setMobileTapState('out');
          hiddenTimerRef.current = setTimeout(() => {
            setMobileTapState('hidden');
            setVariant('default');
            setHoveredEl(null);
            isSwipingRef.current = false;
          }, 350);
        }, 50);
      } else {
        // Stationary tap: preserve the existing tap timing (~550ms total from touchstart)
        const holdDuration = Date.now() - touchStartPos.current.time;
        const remainingTapTime = Math.max(0, 550 - holdDuration);
        outTimerRef.current = setTimeout(() => {
          setMobileTapState('out');
          hiddenTimerRef.current = setTimeout(() => {
            setMobileTapState('hidden');
            setVariant('default');
            setHoveredEl(null);
          }, 350);
        }, remainingTapTime);
      }
    };

    const handleTouchCancel = () => {
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
      setMobileTapState('out');
      hiddenTimerRef.current = setTimeout(() => {
        setMobileTapState('hidden');
        setVariant('default');
        setHoveredEl(null);
        isSwipingRef.current = false;
      }, 350);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
    };
  }, [isMobile, setVariant, variant, x, y, rawX, rawY, velocity, wrapperX, wrapperY, wrapperAngle, innerX, innerY]);

  // Desktop mouse offscreen handling
  useEffect(() => {
    if (isMobile) return;

    const handleMouseLeave = () => setIsOffscreen(true);
    const handleMouseEnter = () => setIsOffscreen(false);

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isMobile]);

  // Desktop mouse hover variants
  useEffect(() => {
    if (isMobile) return;

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
  }, [isMobile, setVariant, variant]);

  const variants = {
    default: {
      width: isMobile ? 18 : 12,
      height: isMobile ? 18 : 12,
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
        key={isMobile ? `mobile-cursor-${tapKey}` : 'desktop-cursor'}
        className="cursor-scale-container"
        animate={isMobile ? mobileTapState : 'desktop'}
        variants={{
          desktop: { scale: 1, opacity: 1 },
          hidden: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
          in: {
            scale: [0, 1.25, 1],
            opacity: [0, 1, 1],
            transition: {
              duration: 0.22,
              times: [0, 0.6, 1],
              ease: [0.16, 1, 0.3, 1],
            },
          },
          out: {
            scale: [1, 1.25, 0],
            opacity: [1, 0.9, 0],
            transition: {
              duration: 0.32,
              times: [0, 0.3, 1],
              ease: 'easeOut',
            },
          },
        }}
      >
        {isMobile && mobileTapState === 'in' && (
          <motion.div
            key={`in-ripple-${tapKey}`}
            className="cursor-tap-ripple"
            initial={{ scale: 0.4, opacity: 0.75 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              x: '-50%',
              y: '-50%',
              width: variant === 'expand' ? 56 : 28,
              height: variant === 'expand' ? 56 : 28,
              borderRadius: '50%',
              border: '1.5px solid #ffffff',
              pointerEvents: 'none',
            }}
          />
        )}
        {isMobile && mobileTapState === 'out' && (
          <motion.div
            key={`exit-ripple-${tapKey}`}
            className="cursor-exit-ripple"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              x: '-50%',
              y: '-50%',
              width: variant === 'expand' ? 56 : 28,
              height: variant === 'expand' ? 56 : 28,
              borderRadius: '50%',
              border: '1.5px solid #ffffff',
              pointerEvents: 'none',
            }}
          />
        )}
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
    </motion.div>
  );
}
