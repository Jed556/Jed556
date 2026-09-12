import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { scrollManager } from '../../utils/ScrollManager';
import { projectModalState } from '../../utils/projectModalState';
import './ScrollIndicator.css';

const LETTERS = ['S', 'C', 'R', 'O', 'L', 'L'];

interface ScrollIndicatorProps {
  animationReady?: boolean;
}

const LetterRoulette: React.FC<{ isUp: boolean }> = ({ isUp }) => {
  return (
    <div className="global-scroll-text">
      {LETTERS.map((char, index) => (
        <div
          key={index}
          style={{
            position: 'relative',
            display: 'inline-block',
            height: '1.15em',
            overflow: 'hidden',
            verticalAlign: 'middle',
          }}
        >
          {/* Invisible placeholder for natural monospace width */}
          <span style={{ visibility: 'hidden', pointerEvents: 'none' }}>{char}</span>

          {/* Moving strip containing two identical copies of the letter */}
          <motion.div
            initial={false}
            animate={{ y: isUp ? '-50%' : '0%' }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
              delay: index * 0.045,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          >
            <div
              style={{
                height: '1.15em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {char}
            </div>
            <div
              style={{
                height: '1.15em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {char}
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
};

const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ animationReady = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [cycle, setCycle] = useState(0);
  const timerRef = useRef<number | null>(null);
  const hasShownInitialRef = useRef(false);
  const isModalOpenRef = useRef(projectModalState.isOpen);

  // 1. Initial page load reveal (after cinematic borders open)
  useEffect(() => {
    if (animationReady && !hasShownInitialRef.current) {
      hasShownInitialRef.current = true;
      if (!isModalOpenRef.current) {
        setIsVisible(true);
      }
    }
  }, [animationReady]);

  // 2. Project card modal state tracking:
  // Strictly do not show when a card is open; start 10s countdown after the card is closed
  useEffect(() => {
    const handleModalChange = (e: Event) => {
      const isOpen = (e as CustomEvent<{ isOpen: boolean }>).detail.isOpen;
      isModalOpenRef.current = isOpen;

      if (isOpen) {
        setIsVisible(false);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        // Start countdown after card is closed
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
          if (!isModalOpenRef.current) {
            setIsVisible(true);
          }
        }, 10000);
      }
    };

    projectModalState.addEventListener('change', handleModalChange);
    return () => {
      projectModalState.removeEventListener('change', handleModalChange);
    };
  }, []);

  // 3. Scroll tracking & 10-second idle timer
  useEffect(() => {
    const handleScroll = () => {
      if (isModalOpenRef.current) {
        setIsVisible(false);
        return;
      }

      setIsVisible(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        if (!isModalOpenRef.current) {
          setIsVisible(true);
        }
      }, 10000);
    };

    scrollManager.addEventListener('scrollUpdate', handleScroll);
    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      scrollManager.removeEventListener('scrollUpdate', handleScroll);
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 4. Synchronized 3-second cycle loop for both circle and text roulette
  useEffect(() => {
    if (!isVisible) {
      setCycle(0);
      return;
    }

    const interval = window.setInterval(() => {
      setCycle((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleClick = () => {
    const next =
      scrollManager.currentSection < scrollManager.totalSections - 1
        ? scrollManager.currentSection + 1
        : 0;
    scrollManager.setSection(next);
  };

  const isUp = cycle % 2 === 1;

  return (
    <div
      className="global-scroll-indicator"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      data-cursor="pointer"
      aria-label="Scroll to navigate"
      style={{
        pointerEvents: isVisible ? 'auto' : 'none',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {/* Track & moving circle illustration */}
      <div className="global-scroll-track">
        {/* Vertical Line */}
        <div className="global-scroll-line" />

        {/* Moving Circle synchronized with SCROLL text */}
        {cycle > 0 && (
          <motion.div
            key={cycle}
            className="global-scroll-circle"
            initial={{
              x: '-50%',
              y: isUp ? 17 : 5,
              scale: 1.6,
              opacity: 0,
            }}
            animate={{
              x: '-50%',
              y: isUp ? 5 : 17,
              scale: [1.6, 1.0, 1.0, 1.6],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              y: {
                duration: 0.78,
                ease: [0.22, 1, 0.36, 1],
              },
              opacity: {
                duration: 0.78,
                times: [0, 0.22, 0.78, 1],
                ease: ['easeOut', 'linear', 'easeIn'],
              },
              scale: {
                duration: 0.78,
                times: [0, 0.22, 0.78, 1],
                ease: ['easeOut', 'linear', 'easeIn'],
              },
            }}
          />
        )}
      </div>

      {/* Letter roulette animation */}
      <LetterRoulette isUp={isUp} />
    </div>
  );
};

export default ScrollIndicator;
