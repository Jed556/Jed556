import { getGPUTier, type TierResult } from 'detect-gpu';

export type QualityTier = 'low' | 'medium' | 'high';
export type QualityMode = 'auto' | 'low' | 'medium' | 'high';

export interface QualityConfig {
  tier: number;
  isMobile: boolean;
  gpu: string;
  fps?: number;
  type: string;
  mode: QualityMode;
  quality: QualityTier;
  // Adaptive 3D settings
  dpr: number;
  starCount: number;
  textCurveSegments: number;
  textBevelSegments: number;
  circleSegments: number;
  isLoaded: boolean;
}

class QualityManager extends EventTarget {
  private config: QualityConfig = {
    tier: 2,
    isMobile: false,
    gpu: 'detecting...',
    fps: undefined,
    type: 'INITIALIZING',
    mode: 'auto',
    quality: 'high',
    dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2.0),
    starCount: 2000,
    textCurveSegments: 64,
    textBevelSegments: 32,
    circleSegments: 64,
    isLoaded: false,
  };

  private rawTierResult: TierResult | null = null;

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public getConfig(): QualityConfig {
    return { ...this.config };
  }

  public async init() {
    try {
      const result: TierResult = await getGPUTier();
      this.rawTierResult = result;

      const isMobile = !!result.isMobile;
      const tier = result.tier;

      // Tier logic:
      // Tier 0 or 1: Low-end phone or old integrated GPU -> Low
      // Tier 2: Mid-tier phone or standard laptop/integrated GPU -> Medium
      // Tier 3: High-end desktop GPU or flagship phone -> High
      let detectedQuality: QualityTier = 'high';
      if (tier <= 1 || (isMobile && tier < 2)) {
        detectedQuality = 'low';
      } else if (tier === 2 || isMobile) {
        detectedQuality = 'medium';
      } else {
        detectedQuality = 'high';
      }

      this.config.tier = tier;
      this.config.isMobile = isMobile;
      this.config.gpu = result.gpu || result.device || 'Generic GPU';
      this.config.fps = result.fps;
      this.config.type = result.type;
      this.config.isLoaded = true;

      this.applyQuality(this.config.mode === 'auto' ? detectedQuality : this.config.mode);

      console.log('[QualityManager] GPU detected:', {
        tier: result.tier,
        type: result.type,
        isMobile: result.isMobile,
        gpu: result.gpu,
        fps: result.fps,
        effectiveQuality: this.config.quality,
      });
    } catch (err) {
      console.warn('[QualityManager] Failed to detect GPU, defaulting to medium:', err);
      this.config.tier = 1;
      this.config.gpu = 'Detection fallback';
      this.config.type = 'FALLBACK';
      this.config.isLoaded = true;
      this.applyQuality('medium');
    }
  }

  public setMode(mode: QualityMode) {
    this.config.mode = mode;
    if (mode === 'auto') {
      const tier = this.config.tier;
      const isMobile = this.config.isMobile;
      let detectedQuality: QualityTier = 'high';
      if (tier <= 1 || (isMobile && tier < 2)) {
        detectedQuality = 'low';
      } else if (tier === 2 || isMobile) {
        detectedQuality = 'medium';
      } else {
        detectedQuality = 'high';
      }
      this.applyQuality(detectedQuality);
    } else {
      this.applyQuality(mode);
    }
  }

  private applyQuality(quality: QualityTier) {
    const dprCap = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.config.quality = quality;

    if (quality === 'low') {
      this.config.dpr = Math.min(dprCap, 1.0);
      this.config.starCount = 800;
      this.config.textCurveSegments = 14;
      this.config.textBevelSegments = 8;
      this.config.circleSegments = 24;
    } else if (quality === 'medium') {
      this.config.dpr = Math.min(dprCap, 1.35);
      this.config.starCount = 1400;
      this.config.textCurveSegments = 22;
      this.config.textBevelSegments = 12;
      this.config.circleSegments = 32;
    } else {
      // High (T3): Full original polygon fidelity (64 curve segments, 32 bevel segments, 64 circle segments)
      this.config.dpr = Math.min(dprCap, 2.0);
      this.config.starCount = 2000;
      this.config.textCurveSegments = 64;
      this.config.textBevelSegments = 32;
      this.config.circleSegments = 64;
    }

    this.dispatchEvent(new CustomEvent('qualityUpdate', { detail: this.getConfig() }));
  }
}

export const qualityManager = new QualityManager();
