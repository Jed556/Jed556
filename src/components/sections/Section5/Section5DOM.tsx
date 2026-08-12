import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useScrollState } from '../../../utils/useScrollState';
import * as Icons from 'lucide-react';
import contactData from '../../../data/contact.json';

const Section5DOM: React.FC = () => {
  const { scrollValue } = useScrollState();
  const [isVisible, setIsVisible] = useState(false);

  // Show text when scroll passes Section 4.5
  useEffect(() => {
    if (scrollValue > 3.8) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [scrollValue]);

  // Smooth responsive sizing (mimics the 3D space lerping)
  const windowWidth = useMotionValue(window.innerWidth);
  const smoothWidth = useSpring(windowWidth, { stiffness: 40, damping: 15 });

  useEffect(() => {
    const handleResize = () => windowWidth.set(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamically compute pixel values based on the smoothed window width, while keeping the CSS clamp constraints
  const fontSize1 = useTransform(smoothWidth, (w) => `clamp(1.2rem, ${w * 0.03}px, 4rem)`);
  const fontSize2 = useTransform(smoothWidth, (w) => `clamp(0.9rem, ${w * 0.02}px, 3rem)`);
  const gapSize = useTransform(smoothWidth, (w) => `clamp(1.5rem, ${w * 0.025}px, 3rem)`);
  const iconSize = useTransform(smoothWidth, (w) => `clamp(24px, ${w * 0.015}px, 40px)`);

  const text1 = "LET'S WORK TOGETHER".split('');
  const text2 = "CONTACT ME".split('');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none', // Allow clicking through to 3D scene
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontFamily: '"Times New Roman", Times, serif',
            letterSpacing: '0.1em',
            zIndex: 10, // Above canvas, below HUD
            textShadow: '0px 0px 20px rgba(255, 255, 255, 0.5)',
          }}
        >
          <motion.div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', fontSize: fontSize1, marginBottom: '2rem' }}>
            {text1.map((char, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.8,
                  delay: 0.5 + index * 0.05,
                  ease: [0.33, 1, 0.68, 1],
                }}
                style={{
                  display: 'inline-block',
                  marginRight: char === ' ' ? '0.5em' : '0',
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
          
          <motion.div style={{ display: 'flex', fontSize: fontSize2 }}>
            {text2.map((char, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.8,
                  delay: 2.0 + index * 0.1,
                  ease: [0.33, 1, 0.68, 1],
                }}
                style={{
                  display: 'inline-block',
                  marginRight: char === ' ' ? '0.5em' : '0',
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
          
          <style>{`
            .contact-icons-container {
              position: absolute;
              bottom: 10vh;
              display: flex;
              pointer-events: auto;
            }
            @media (max-width: 768px) {
              .contact-icons-container {
                bottom: 16vh;
              }
            }
          `}</style>
          
          <motion.div 
            className="contact-icons-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 3.5, ease: 'easeOut' }}
            style={{ 
              gap: gapSize
            }}
          >
            {contactData.map((contact, index) => {
              if (!contact.url) return null;
              return (
                <a 
                  key={index}
                  href={contact.url}
                  target={contact.url.startsWith('mailto:') ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  style={{ color: 'white', opacity: 0.8, transition: 'opacity 0.2s' }} 
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} 
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                >
                  <motion.img 
                    src={contact.icon} 
                    alt={contact.platform} 
                    style={{ width: iconSize, height: iconSize, filter: 'brightness(0) invert(1)' }} 
                  />
                </a>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Section5DOM;
