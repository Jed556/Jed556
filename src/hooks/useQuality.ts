import { useState, useEffect } from 'react';
import { qualityManager, type QualityConfig, type QualityMode } from '../utils/QualityManager';

export const useQuality = () => {
  const [qualityConfig, setQualityConfig] = useState<QualityConfig>(qualityManager.getConfig());

  useEffect(() => {
    const handleQualityUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<QualityConfig>;
      setQualityConfig(customEvent.detail);
    };

    qualityManager.addEventListener('qualityUpdate', handleQualityUpdate);
    return () => {
      qualityManager.removeEventListener('qualityUpdate', handleQualityUpdate);
    };
  }, []);

  const setMode = (mode: QualityMode) => {
    qualityManager.setMode(mode);
  };

  return {
    ...qualityConfig,
    setMode,
  };
};
