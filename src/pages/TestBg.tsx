import React from 'react';

const TestBg: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-screen overflow-hidden font-sans z-20 pointer-events-none flex flex-col justify-between">
      
      {/* White Vignette Overlay (fades out the left and right edges into the white background) */}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(255,255,255,0.85)_100%)] mix-blend-normal"></div>

      
    </div>
  );
};

export default TestBg;
