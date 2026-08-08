import React from 'react';

const CameraBorders: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      pointerEvents: 'none',
      zIndex: 50,
      fontFamily: 'var(--font-mono)',
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '10px',
      letterSpacing: '1px',
      userSelect: 'none'
    }}>
      {/* Corner Brackets */}
      <div style={{ position: 'absolute', top: '5vh', left: '2vw', fontSize: '20px' }}>⌜</div>
      <div style={{ position: 'absolute', top: '5vh', right: '2vw', fontSize: '20px' }}>⌝</div>
      <div style={{ position: 'absolute', bottom: '5vh', left: '2vw', fontSize: '20px' }}>⌞</div>
      <div style={{ position: 'absolute', bottom: '5vh', right: '2vw', fontSize: '20px' }}>⌟</div>

      {/* Left side details */}
      <div style={{ position: 'absolute', top: '50%', left: '2vw', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
        <span>C</span>
        <span>E</span>
        <span style={{ height: '1px', width: '8px', background: 'rgba(255,255,255,0.4)', margin: '10px 0' }}></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>v</span>
          <span>v</span>
          <span>v</span>
        </div>
        <span>L</span>
      </div>

      {/* Right side details */}
      <div style={{ position: 'absolute', top: '50%', right: '2vw', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
        <span style={{ height: '1px', width: '8px', background: 'rgba(255,255,255,0.4)' }}></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>v</span>
          <span>v</span>
        </div>
        <span style={{ height: '1px', width: '8px', background: 'rgba(255,255,255,0.4)' }}></span>
        <span>_</span>
      </div>
    </div>
  );
};

export default CameraBorders;
