import React, { useState } from 'react';
import { useQuality } from '../../hooks/useQuality';
import type { QualityMode } from '../../utils/QualityManager';

interface QualityBadgeProps {
  isLoading?: boolean;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({ isLoading = false }) => {
  const {
    tier,
    isMobile,
    gpu,
    fps,
    type,
    quality,
    mode,
    dpr,
    starCount,
    setMode,
    isLoaded
  } = useQuality();

  const [expanded, setExpanded] = useState(false);

  // Hide when not in development (debug) mode
  const isDebug =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug'));

  if (!isDebug || isLoading) return null;

  const modes: QualityMode[] = ['auto', 'low', 'medium', 'high'];

  const getTierColor = (t: number) => {
    if (t >= 3) return '#4ade80'; // green
    if (t === 2) return '#60a5fa'; // blue
    if (t === 1) return '#facc15'; // yellow
    return '#f87171'; // red
  };

  return (
    <div
      style={{
        position: 'fixed',
        // Positioned cleanly above the bottom cinematic border (which is clamp(50px, 2vw + 35px, 60px))
        bottom: 'calc(clamp(50px, 2vw + 35px, 60px) + 16px)',
        left: '24px',
        zIndex: 9999,
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '11px',
        letterSpacing: '0.5px',
        userSelect: 'none',
      }}
    >
      {/* Expanded Details & Mode Selector (Floats upward) */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            background: 'rgba(10, 10, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: '#e2e8f0',
            width: '270px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
            DETECT-GPU BENCHMARK
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Renderer:</span>
            <span style={{ maxWidth: '170px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={gpu}>
              {gpu}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Device Type:</span>
            <span>{isMobile ? 'Mobile' : 'Desktop'} ({type})</span>
          </div>

          {fps !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Estimated FPS:</span>
              <span>~{fps} fps</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Active DPR:</span>
            <span>{dpr.toFixed(2)}x</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Star Count:</span>
            <span>{starCount}</span>
          </div>

          {/* Controls */}
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>
              TEST QUALITY OVERRIDE:
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '9px',
                    fontFamily: 'inherit',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: mode === m ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
                    background: mode === m ? 'rgba(96, 165, 250, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: mode === m ? '#93c5fd' : 'rgba(255,255,255,0.7)',
                    textTransform: 'uppercase',
                    transition: 'all 0.15s',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pill Toggle Button */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '6px 12px',
          color: '#ffffff',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'all 0.2s ease',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: isLoaded ? getTierColor(tier) : '#9ca3af',
            display: 'inline-block',
            boxShadow: isLoaded ? `0 0 8px ${getTierColor(tier)}` : 'none',
          }}
        />
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>GPU:</span>
        <span style={{ fontWeight: 600, color: getTierColor(tier) }}>
          {isLoaded ? `T${tier} (${quality.toUpperCase()})` : 'DETECTING...'}
        </span>
        <span style={{ fontSize: '9px', opacity: 0.5 }}>{expanded ? '▼' : '▲'}</span>
      </div>
    </div>
  );
};
