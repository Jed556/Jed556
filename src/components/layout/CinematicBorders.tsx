import React from 'react';
import { scrollManager } from '../../utils/ScrollManager';
import { useScrollState } from '../../utils/useScrollState';
import { motion } from 'framer-motion';

interface CinematicBordersProps {
  isLoading: boolean;
}

const SectionIndicator = () => {
  const { scrollValue, internalScrollValue } = useScrollState();

  return (
    <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
      {Array.from({ length: scrollManager.totalSections }).map((_, i) => {
        const dist = Math.abs(scrollValue - i);
        const isPast = scrollValue >= i;
        const standardOpacity = isPast ? 1.0 : Math.max(0.3, 1.0 - dist * 0.7);
        const size = Math.max(0.4, 0.7 - dist * 0.3);

        let bgWidth = size;
        let fgWidth = size;
        let bgOpacity = 0;
        let fgOpacity = standardOpacity;

        const limit = scrollManager.internalScrollLimits[i];
        if (limit && limit > 0) {
          const maxBgWidth = 3.5;
          if (dist < 0.5) {
            const bgT = 1.0 - (dist / 0.5);
            bgWidth = size + bgT * (maxBgWidth - size);
            bgOpacity = 0.3 * bgT;
            if (dist < 0.01) {
              const progress = Math.max(0, Math.min(internalScrollValue / limit, 1.0));
              fgWidth = size + progress * (maxBgWidth - size);
            } else if (scrollValue > i) {
              fgWidth = bgWidth;
            } else {
              fgWidth = size;
            }
          }
        }

        return (
          <div
            key={i}
            onClick={() => scrollManager.setSection(i)}
            style={{
              padding: '15px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: `${bgWidth}rem`,
                height: `${size}rem`,
                borderRadius: '1rem',
                backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${fgWidth}rem`,
                  backgroundColor: `rgba(255, 255, 255, ${fgOpacity})`,
                  borderRadius: '1rem',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CinematicBorders: React.FC<CinematicBordersProps> = ({ isLoading }) => {
  return (
    <>
      <style>{`
        .cinematic-bg-top {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: ${isLoading ? '50vh' : 'clamp(50px, 4vw + 20px, 70px)'};
          background-color: #0A0A0B;
          z-index: 999;
          transition: height 0.8s cubic-bezier(0.76, 0, 0.24, 1) ${isLoading ? '0s' : '0.2s'};
        }
        .cinematic-bg-bottom {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: ${isLoading ? '50vh' : 'clamp(50px, 2vw + 35px, 60px)'};
          background-color: #0A0A0B;
          z-index: 999;
          transition: height 0.8s cubic-bezier(0.76, 0, 0.24, 1) ${isLoading ? '0s' : '0.2s'};
        }
        .cinematic-content-top {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: clamp(50px, 4vw + 20px, 70px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .cinematic-content-bottom {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: clamp(50px, 2vw + 35px, 60px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
          pointer-events: none;
          font-family: sans-serif;
        }
        .cinematic-content-top > *, .cinematic-content-bottom > * {
          pointer-events: auto;
        }
      `}</style>

      {/* Cinematic Backgrounds */}
      <div className="cinematic-bg-top" />
      <div className="cinematic-bg-bottom" />

      {/* Cinematic Header Content */}
      <header className="cinematic-content-top">
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {!isLoading && (
            <motion.div
              layoutId="logo-container"
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 'clamp(18px, 1.5vw + 10px, 24px)',
                aspectRatio: '716.7 / 506.34'
              }}
              transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            >
              <svg viewBox="0 0 716.7 506.34" style={{ width: '100%', height: '100%' }}>
                <g fill="#fff">
                  <path d="m626.99,335.85l-41.45-72.13h-132.02l-65.01,242.62h192.79l45.68-170.49Zm-86.15,117.74h-83.58l36.75-137.13h61.09l15.36,26.61-29.62,110.53Z" />
                  <polygon points="702.57 52.74 716.7 0 524.19 0 473.31 189.88 459.18 242.62 651.69 242.62 665.82 189.88 527.91 189.88 538.09 151.9 676 151.9 690.13 99.16 552.22 99.16 564.66 52.74 702.57 52.74" />
                  <polygon points="360.81 0 253.4 400.85 137.47 400.85 179.87 242.62 70.66 242.62 0 506.34 334.34 506.34 470.02 0 360.81 0" />
                </g>
              </svg>
            </motion.div>
          )}
        </div>
      </header>

      {/* Cinematic Footer Content */}
      <footer className="cinematic-content-bottom">
        <motion.div
          style={{ width: '20%', maxWidth: '200px', height: '100%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.8, delay: isLoading ? 0 : 0.4 }}
        >
          <SectionIndicator />
        </motion.div>
        <div style={{ color: '#777', fontSize: '8px', letterSpacing: '0.2em', textAlign: 'right' }}>
          JERRALD J. GUIRIBA © 2026
        </div>
      </footer>
    </>
  );
};

export default CinematicBorders;
