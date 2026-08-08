import { useState, useEffect } from 'react';
import { CursorProvider } from './context/CursorContext';
import { AnimatePresence } from 'framer-motion';
import CustomCursor from './components/cursor/CustomCursor';
// import FloatingMenu from './components/menu/FloatingMenu';
import WebGLBackground from './components/background/WebGLBackground';
import CinematicBorders from './components/layout/CinematicBorders';
import CameraBorders from './components/layout/CameraBorders';
import Section1DOM from './components/sections/Section1/Section1DOM';
import Section4DOM from './components/sections/Section4/Section4DOM';
import Section5DOM from './components/sections/Section5/Section5DOM';
import LoadingScreen from './components/loading/LoadingScreen';
import { scrollManager } from './utils/ScrollManager';
import './index.css';

function UrlUpdater() {
  useEffect(() => {
    const handleScrollUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const section = customEvent.detail.currentSection + 1;
      const currentHash = window.location.hash;
      if (currentHash !== `#${section}`) {
        window.history.replaceState(null, '', `#${section}`);
      }
    };

    // Set initial hash
    const initialSection = scrollManager.currentSection + 1;
    if (window.location.hash !== `#${initialSection}`) {
      window.history.replaceState(null, '', `#${initialSection}`);
    }

    scrollManager.addEventListener('scrollUpdate', handleScrollUpdate);
    return () => {
      scrollManager.removeEventListener('scrollUpdate', handleScrollUpdate);
    };
  }, []);

  return null;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [animationReady, setAnimationReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Cinematic borders take 0.2s delay + 0.8s transition = 1.0s to fully open
      const timer = setTimeout(() => {
        setAnimationReady(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <CursorProvider>
      <UrlUpdater />
      <AnimatePresence>
        {isLoading && <LoadingScreen key="loading" onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>
      <CinematicBorders isLoading={isLoading} />
      <CameraBorders />
      <Section1DOM startAnimation={animationReady} />
      <Section4DOM />
      <Section5DOM />
      <WebGLBackground />
      <CustomCursor />
      {/* <FloatingMenu /> */}
    </CursorProvider>
  );
}

export default App;
