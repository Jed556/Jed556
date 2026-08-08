import { useEffect, useState } from 'react';
import { scrollManager } from './ScrollManager';

export const useScrollState = () => {
  const [scrollState, setScrollState] = useState({ 
    currentSection: scrollManager.currentSection, 
    scrollValue: scrollManager.scrollValue, 
    internalScrollValue: scrollManager.internalScrollValue, 
    scrollVelocity: scrollManager.scrollVelocity 
  });

  useEffect(() => {
    const handleScrollUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setScrollState({
        currentSection: customEvent.detail.currentSection,
        scrollValue: customEvent.detail.scrollValue,
        internalScrollValue: customEvent.detail.internalScrollValue || 0,
        scrollVelocity: customEvent.detail.scrollVelocity || 0,
      });
    };

    scrollManager.addEventListener('scrollUpdate', handleScrollUpdate);
    return () => {
      scrollManager.removeEventListener('scrollUpdate', handleScrollUpdate);
    };
  }, []);

  return scrollState;
};
