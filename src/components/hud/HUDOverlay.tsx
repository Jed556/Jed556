import React, { useEffect, useState } from 'react';
import './HUDOverlay.css';

interface HUDOverlayProps {
  children: React.ReactNode;
}

export default function HUDOverlay({ children }: HUDOverlayProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const formatCoord = (val: number) => val.toString().padStart(4, '0');

  return (
    <div className="hud-wrapper">
      <div className="hud-overlay" data-cursor="default">
        <div className="hud-corner top-left"></div>
        <div className="hud-corner top-right"></div>
        <div className="hud-corner bottom-left"></div>
        <div className="hud-corner bottom-right"></div>

        <div className="hud-status">
          <div className="hud-status-text">SYSTEM://PORTFOLIO</div>
          <div className="hud-status-indicator">
            <span className="blinking-dot"></span>
            STATUS: ONLINE
          </div>
        </div>

        <div className="hud-coordinates">
          X: {formatCoord(mousePos.x)} Y: {formatCoord(mousePos.y)}
        </div>
      </div>
      <div className="hud-content">
        {children}
      </div>
    </div>
  );
}
