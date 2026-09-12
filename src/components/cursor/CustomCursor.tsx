import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'framer-motion';
import { useCursor } from '../../context/CursorContext';
import type { CursorVariant } from '../../context/CursorContext';
import { useMousePosition } from '../../hooks/useMousePosition';
import './CustomCursor.css';

// Exact 8-segment cubic bezier paths for seamless mathematical morphing:
// All paths share the identical command structure (M ... C ... C ... C ... C ... C ... C ... C ... C ... Z)
const CIRCLE_PATH =
  'M 24 0 C 30.37 0, 36.47 2.53, 40.97 7.03 C 45.47 11.53, 48 17.63, 48 24 C 48 30.37, 45.47 36.47, 40.97 40.97 C 36.47 45.47, 30.37 48, 24 48 C 17.63 48, 11.53 45.47, 7.03 40.97 C 2.53 36.47, 0 30.37, 0 24 C 0 17.63, 2.53 11.53, 7.03 7.03 C 11.53 2.53, 17.63 0, 24 0 Z';

const STAR_REST_PATH =
  'M 24 8 C 28 8, 27.83 14.63, 30.6 17.4 C 33.37 20.17, 40 20, 40 24 C 40 28, 33.37 27.83, 30.6 30.6 C 27.83 33.37, 28 40, 24 40 C 20 40, 20.17 33.37, 17.4 30.6 C 14.63 27.83, 8 28, 8 24 C 8 20, 14.63 20.17, 17.4 17.4 C 20.17 14.63, 20 8, 24 8 Z';

const STAR_STRETCH_PATH =
  'M 24 4.5 C 27.6 4.5, 27.25 16.05, 29.6 18.4 C 31.95 20.75, 43.5 20.4, 43.5 24 C 43.5 27.6, 31.95 27.25, 29.6 29.6 C 27.25 31.95, 27.6 43.5, 24 43.5 C 20.4 43.5, 20.75 31.95, 18.4 29.6 C 16.05 27.25, 4.5 27.6, 4.5 24 C 4.5 20.4, 16.05 20.75, 18.4 18.4 C 20.75 16.05, 20.4 4.5, 24 4.5 Z';

interface TargetInfo {
  isInteractive: boolean;
  variant: CursorVariant;
  element: HTMLElement | null;
}

function getInteractiveTarget(target: HTMLElement | null): TargetInfo {
  if (!target || target === document.body || target === document.documentElement) {
    return { isInteractive: false, variant: 'default', element: null };
  }

  // 1. Check explicit data-cursor on target or ancestor
  const explicit = target.closest('[data-cursor]') as HTMLElement | null;
  if (explicit) {
    const attr = explicit.getAttribute('data-cursor') as CursorVariant;
    if (attr === 'expand' || attr === 'pointer') {
      return { isInteractive: true, variant: 'pointer', element: explicit };
    }
  }

  // 2. Check standard interactive elements and attributes
  const clickable = target.closest(
    'button, a[href], input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="link"], [data-clickable="true"], .clickable'
  ) as HTMLElement | null;

  if (clickable) {
    if (clickable.getAttribute('data-cursor') === 'default') {
      return { isInteractive: false, variant: 'default', element: clickable };
    }
    return { isInteractive: true, variant: 'pointer', element: clickable };
  }

  // 3. Check computed style for cursor: pointer
  try {
    let curr: HTMLElement | null = target;
    let depth = 0;
    while (curr && depth < 4 && curr !== document.body) {
      const style = window.getComputedStyle(curr);
      if (style.cursor === 'pointer') {
        return { isInteractive: true, variant: 'pointer', element: curr };
      }
      curr = curr.parentElement;
      depth++;
    }
  } catch {
    // Ignore cross-origin / iframe errors
  }

  // 4. Non-interactive explicit containers (like scroll-y, scroll-x, default)
  if (explicit) {
    const attr = explicit.getAttribute('data-cursor') as CursorVariant;
    if (attr) {
      return { isInteractive: false, variant: attr, element: explicit };
    }
  }

  return { isInteractive: false, variant: 'default', element: null };
}

export default function CustomCursor() {
  const { variant, setVariant } = useCursor();
  const { x, y, rawX, rawY, velocity, angle } = useMousePosition();
  
  const [isOffscreen, setIsOffscreen] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

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

  // Whether the cursor is currently representing a clickable interactive element
  const isClickable = variant === 'pointer' || variant === 'expand';

  // Track if cursor has entered clickable state at least once to avoid initial load intro morph
  const hasInteractedRef = useRef(false);
  if (isClickable) {
    hasInteractedRef.current = true;
  }

  const variantRef = useRef(variant);
  variantRef.current = variant;

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

  // Track mousedown / mouseup for tactile press response
  useEffect(() => {
    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Derived motion values for the wrapper to bypass React renders
  const wrapperX = useMotionValue(-100);
  const wrapperY = useMotionValue(-100);
  const wrapperAngle = useMotionValue(0);

  const isSwipingRef = useRef(false);

  useAnimationFrame(() => {
    wrapperX.set(x.get());
    wrapperY.set(y.get());

    // In clickable star form or scroll indicator, keep cursor upright (0 deg)
    // In default circle form, rotate with velocity angle so the jelly tail trails smoothly behind
    if (isClickable || variant === 'scroll-y' || variant === 'scroll-x') {
      wrapperAngle.set(0);
    } else {
      wrapperAngle.set(angle.get());
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

      // Check element under tap for cursor variant (e.g. pointer for buttons/cards)
      const target = document.elementFromPoint(tapX, tapY) as HTMLElement | null;
      const info = getInteractiveTarget(target);
      if (info.isInteractive) {
        setVariant(info.variant);
      } else if (info.variant !== 'default') {
        setVariant(info.variant);
      } else {
        setVariant('default');
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
        const info = getInteractiveTarget(target);
        if (info.isInteractive) {
          setVariant(info.variant);
        } else if (info.variant !== 'default') {
          setVariant(info.variant);
        } else {
          setVariant('default');
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
  }, [isMobile, setVariant, variant, x, y, rawX, rawY, velocity, wrapperX, wrapperY, wrapperAngle]);

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

  // Desktop mouse movement and approaching/hover detection
  const checkElementUnderCursor = useCallback((clientX: number, clientY: number) => {
    if (variantRef.current === 'loading') return;

    const centerEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    let info = getInteractiveTarget(centerEl);

    // Proximity sensing: if center is not yet interactive, check a 16px radius around the cursor.
    // This allows the cursor to begin morphing into the star as it approaches a clickable area.
    if (!info.isInteractive) {
      const prox = 16;
      const testPoints: [number, number][] = [
        [clientX + prox, clientY],
        [clientX - prox, clientY],
        [clientX, clientY + prox],
        [clientX, clientY - prox],
      ];

      for (const [px, py] of testPoints) {
        const nearEl = document.elementFromPoint(px, py) as HTMLElement | null;
        const nearInfo = getInteractiveTarget(nearEl);
        if (nearInfo.isInteractive) {
          info = nearInfo;
          break;
        }
      }
    }

    if (info.isInteractive) {
      setVariant(info.variant);
    } else if (info.variant !== 'default') {
      setVariant(info.variant);
    } else {
      setVariant('default');
    }
  }, [setVariant]);

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      checkElementUnderCursor(e.clientX, e.clientY);
    };

    const handleScrollOrWheel = () => {
      const curX = rawX.get();
      const curY = rawY.get();
      if (curX >= 0 && curY >= 0) {
        checkElementUnderCursor(curX, curY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('wheel', handleScrollOrWheel, { passive: true });
    window.addEventListener('scroll', handleScrollOrWheel, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleScrollOrWheel);
      window.removeEventListener('scroll', handleScrollOrWheel);
    };
  }, [isMobile, checkElementUnderCursor, rawX, rawY]);

  // Allow 3D canvas objects or custom interactions to notify the cursor
  useEffect(() => {
    const handleTargetChange = (e: Event) => {
      const customEvent = e as CustomEvent<CursorVariant>;
      if (customEvent.detail) {
        setVariant(customEvent.detail);
      }
    };

    window.addEventListener('cursor-target-change', handleTargetChange);
    return () => {
      window.removeEventListener('cursor-target-change', handleTargetChange);
    };
  }, [setVariant]);

  const variants = {
    default: {
      width: isMobile ? 18 : 12,
      height: isMobile ? 18 : 12,
      backgroundColor: 'transparent',
      border: '0px solid transparent',
      opacity: 1,
    },
    pointer: {
      width: isMobile ? 42 : 36,
      height: isMobile ? 42 : 36,
      backgroundColor: 'transparent',
      border: '0px solid transparent',
      opacity: 1,
    },
    expand: {
      width: isMobile ? 42 : 36,
      height: isMobile ? 42 : 36,
      backgroundColor: 'transparent',
      border: '0px solid transparent',
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
    hidden: {
      width: 12,
      height: 12,
      backgroundColor: 'transparent',
      opacity: 0,
    },
    loading: {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      border: '0px solid transparent',
      opacity: 0,
    },
    offscreen: {
      width: 0,
      height: 0,
      opacity: 0,
    }
  };

  const scaleY = useTransform(velocity, (v) => isClickable ? 1 : 1 - Math.min(v * 0.02, 0.3));
  // The jelly tail is completely removed (width 0px) when in star form or scroll modes
  const tailWidth = useTransform(velocity, (v) =>
    isClickable || variant !== 'default' ? '0px' : `${Math.min(v * 2.5, 80)}px`
  );

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
              width: isClickable ? 56 : 28,
              height: isClickable ? 56 : 28,
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
              width: isClickable ? 56 : 28,
              height: isClickable ? 56 : 28,
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
            scaleY: scaleY,
            scale: isClickable && isMouseDown ? 0.82 : 1,
          }}
          transition={{ 
            type: 'spring', 
            stiffness: isClickable ? 350 : 500, 
            damping: isClickable ? 22 : 14, 
            mass: 0.5 
          }}
        >
          {/* Pill-shaped Jelly Tail: only visible when in default circle mode */}
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

          {/* Morphing Shape: Circle in default mode -> Cute 4-point star in clickable mode with stretching animation */}
          {(variant === 'default' || isClickable) && (
            <svg
              viewBox="0 0 48 48"
              className="cursor-morph-svg"
            >
              <motion.path
                key={isClickable ? 'star-state' : 'circle-state'}
                inherit={false}
                fill="#ffffff"
                initial={{
                  d: isClickable
                    ? CIRCLE_PATH
                    : (hasInteractedRef.current ? STAR_REST_PATH : CIRCLE_PATH),
                }}
                animate={
                  isClickable
                    ? {
                        d: [STAR_REST_PATH, STAR_STRETCH_PATH, STAR_REST_PATH],
                      }
                    : {
                        d: CIRCLE_PATH,
                      }
                }
                transition={
                  isClickable
                    ? {
                        d: {
                          duration: 1.2,
                          repeat: Infinity,
                          repeatType: 'loop',
                          ease: 'easeInOut',
                        },
                      }
                    : {
                        d: {
                          duration: 0.22,
                          ease: [0.16, 1, 0.3, 1],
                        },
                      }
                }
              />
            </svg>
          )}

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
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
