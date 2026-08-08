import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ScrambleText from '../../ui/ScrambleText';
import ScrollingNumber from '../../ui/ScrollingNumber';
import { useScrollState } from '../../../utils/useScrollState';
import { experiences, EXPERIENCE_SPACING } from '../../../data/experience';
import type { Experience } from '../../../data/experience';

const getActiveYear = (exp?: Experience) => {
  if (!exp) return '';
  const getYear = (ts?: string) => {
    if (!ts) return '';
    if (ts.toLowerCase() === 'present') return 'PRESENT';
    const parts = ts.split('/');
    return parts.length === 2 ? parts[1] : ts;
  };
  return getYear(exp.periodEnd) || getYear(exp.periodStart);
};

const Section4DOM: React.FC = () => {
  const { scrollValue, internalScrollValue } = useScrollState();
  const [isVisible, setIsVisible] = useState(false);
  const [activeYear, setActiveYear] = useState('');

  useEffect(() => {
    // Section 4 starts fading in around 2.0 and is fully visible at 3.0.
    // It transitions out around 3.8 to 4.0.
    if (scrollValue >= 2.5 && scrollValue < 3.8) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }

    // Determine the currently active experience node
    // Use the actual internalScrollValue from state
    const internalScroll = internalScrollValue;
    
    let activeNodeIndex = experiences.length > 0 ? experiences.length - 1 : 0;
    
    // Lock the active node during transitions to prevent visual glitches 
    // when internalScrollValue resets mid-transition.
    if (scrollValue > 3.01) {
      // Transitioning to/from Scene 5: Lock to the latest experience
      activeNodeIndex = experiences.length > 0 ? experiences.length - 1 : 0;
    } else if (scrollValue < 2.99) {
      // Transitioning to/from Scene 3: Lock to the oldest experience
      activeNodeIndex = 0;
    } else {
      let minAbsDist = Infinity;
      experiences.forEach((exp, index) => {
        const triggerScroll = index * EXPERIENCE_SPACING;
        // Z distance based on the exact same formula in ExperienceNodes
        const currentZ = -40.0 + ((internalScroll - triggerScroll) * 12.0);
        
        // We only consider nodes that haven't shot way past the camera
        if (currentZ < 25.0) {
          const distToLens = Math.abs(currentZ - 15.0);
          if (distToLens < minAbsDist) {
            minAbsDist = distToLens;
            activeNodeIndex = index;
          }
        }
      });
    }

    const activeExp = experiences[activeNodeIndex];
    if (activeExp) {
      const year = getActiveYear(activeExp);
      if (year !== activeYear) setActiveYear(year);
    }
  }, [scrollValue, internalScrollValue, activeYear]);

  // Determine opacity, blur, and scale based on scroll position
  let finalOpacity = 1;
  let blurAmount = 0;
  let currentScale = 1;

  if (scrollValue < 3.0) {
    // Entering from Section 3 (2.5 -> 3.0)
    finalOpacity = Math.max(0, Math.min(1, (scrollValue - 2.5) * 2.0));
    currentScale = 1 - (scrollValue - 2.5) * 0.05; 
  } else {
    // Exiting to Section 5 (3.0 -> 4.0)
    const exitProgress = Math.max(0, Math.min(1, scrollValue - 3.0));
    finalOpacity = Math.max(0, 1 - (exitProgress * 1.5)); // Fades out fully by ~3.66
    blurAmount = exitProgress * 20; // Blurs up to 20px
    currentScale = 0.975 + (exitProgress * 0.1); // Slowly scales up for a cinematic exit
  }

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      pointerEvents: 'none',
      zIndex: 10,
      opacity: finalOpacity,
      filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none',
      transform: `scale(${currentScale})`,
      transformOrigin: 'center center',
      color: '#ffffff',
      transition: 'opacity 0.1s linear, filter 0.1s linear',
      textTransform: 'none'
    }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', padding: 'clamp(50px, 4vw + 20px, 70px) 4vw' }}>
        
        {/* Top Left: Subtitle matching Section 1 style */}
        <div style={{ position: 'absolute', top: '15vh', left: '6vw', fontSize: 'clamp(1rem, 1.5vw + 0.5vh, 1.5rem)', lineHeight: '1.4', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
          <ScrambleText text={"The\nJourney"} delay={300} duration={1200} start={isVisible} />
        </div>

        {/* Bottom Right: Dynamic Year Indicator */}
        {activeYear && (
          <div style={{ position: 'absolute', bottom: '15vh', right: '6vw', fontSize: 'clamp(1.5rem, 3vw + 1vh, 2.5rem)', lineHeight: '1.05', fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'right' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
              transition={{ duration: 0.5 }}
            >
              <ScrollingNumber value={activeYear} />
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Section4DOM;
