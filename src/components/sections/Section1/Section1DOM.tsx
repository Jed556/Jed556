import React, { useEffect, useState } from 'react';
import ScrambleText from '../../ui/ScrambleText';
import { useScrollState } from '../../../utils/useScrollState';

interface Section1DOMProps {
  startAnimation?: boolean;
}

const LiveDimensions: React.FC<{ startAnimation: boolean }> = ({ startAnimation }) => {
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [scrambleDone, setScrambleDone] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);

    if (!startAnimation) return;

    const timeout = setTimeout(() => {
      setScrambleDone(true);
    }, 3100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [startAnimation]);

  const dimStr = `${dimensions.w} X ${dimensions.h}`;

  if (!scrambleDone) {
    return <ScrambleText text={dimStr} delay={2000} duration={1000} start={startAnimation} />;
  }

  return <span style={{ whiteSpace: 'pre-wrap', opacity: 1 }}>{dimStr}</span>;
};

const LiveTime: React.FC<{ startAnimation: boolean }> = ({ startAnimation }) => {
  const [timeStr, setTimeStr] = useState('');
  const [scrambleDone, setScrambleDone] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const h = String(phTime.getHours()).padStart(2, '0');
      const m = String(phTime.getMinutes()).padStart(2, '0');
      const s = String(phTime.getSeconds()).padStart(2, '0');
      setTimeStr(`GMT+8 PH ${h}:${m}:${s}`);
    };

    updateTime();

    if (!startAnimation) return;

    let interval: number;
    const timeout = setTimeout(() => {
      setScrambleDone(true);
      interval = window.setInterval(updateTime, 1000);
    }, 2900);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [startAnimation]);

  if (!scrambleDone) {
    return <ScrambleText text={timeStr || 'GMT+8 PH 00:00:00'} delay={1800} duration={1000} start={startAnimation} />;
  }

  return <span style={{ whiteSpace: 'pre-wrap', opacity: 1 }}>{timeStr}</span>;
};

const Section1DOM: React.FC<Section1DOMProps> = ({ startAnimation = true }) => {
  const { currentSection, scrollValue } = useScrollState();
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate mouse position as percentage for CSS gradient
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Delay opacity fade to match the 3D text
  const opacity = Math.max(0, Math.min(1, 1 - (scrollValue - 0.2) * 2.0));
  const isVisible = opacity > 0;

  if (!isVisible) return null;

  // Scale down slowly as we scroll to create a 'move back' parallax effect
  const scale = 1 - scrollValue * 0.15;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      pointerEvents: 'none', // let clicks pass through to 3D/borders
      zIndex: 10,
      opacity: opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center center',
      fontFamily: "'Space Mono', monospace",
      color: '#111111',
      transition: 'opacity 0.1s linear',
      textTransform: 'none' // Override global uppercase
    }}>
      {/* Oversized background container prevents the grid edges from becoming visible when scaled down */}
      <div style={{
        position: 'absolute',
        top: '-15vh',
        left: '-15vw',
        width: '130vw',
        height: '130vh',
        backgroundImage: `
          radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0, 0, 0, 0.05) 0%, rgba(255, 255, 255, 0) 50%),
          linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100px 100px, 100px 100px',
        backgroundPosition: '0 0, -1px -1px, -1px -1px',
      }} />

      <div style={{ position: 'relative', width: '100%', height: '100%', padding: 'clamp(50px, 4vw + 20px, 70px) 4vw' }}>

        {/* Top Left: Subtitle */}
        <div style={{ position: 'absolute', top: '15vh', left: '6vw', fontSize: 'clamp(1rem, 1.5vw + 0.5vh, 1.5rem)', lineHeight: '1.4', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
          <ScrambleText text={"Creative &\nDeveloper"} delay={600} duration={1200} start={startAnimation} />
        </div>

        {/* Top Center: Tagline */}
        <div style={{ position: 'absolute', top: '15vh', left: '50%', transform: 'translateX(-50%)', fontSize: 'clamp(0.75rem, 1vw + 0.3vh, 1.1rem)', opacity: 0.7, textAlign: 'center' }}>
          <ScrambleText text={"Code that scales.\nDesign that speaks."} delay={800} duration={1500} start={startAnimation} />
        </div>

        {/* Top Right: Intro paragraph */}
        <div style={{ position: 'absolute', top: '15vh', right: '6vw', width: 'clamp(200px, 20vw, 350px)', fontSize: 'clamp(0.75rem, 1vw + 0.3vh, 1.1rem)', lineHeight: '1.6', opacity: 0.9 }}>
          <ScrambleText
            text="I'm Jerrald Guiriba, a 2026 Bachelor of Science in Computer Science graduate blending engineering with creativity. I specialize in web and software development, alongside graphic design and video editing to craft compelling digital experiences."
            delay={1000} duration={2000} start={startAnimation}
          />
        </div>

        {/* Bottom Left: Giant Text */}
        <div style={{
          position: 'absolute',
          bottom: '15vh',
          left: '6vw',
          fontSize: 'clamp(3rem, 7vw, 6rem)',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          lineHeight: '1.05',
          letterSpacing: '-0.04em',
          textTransform: 'uppercase'
        }}>
          <ScrambleText text={"MERGING LOGIC\n& CREATIVITY"} delay={1200} duration={1800} start={startAnimation} />
        </div>

        {/* Bottom Left Edge: Time */}
        <div style={{ position: 'absolute', bottom: '8vh', left: '6vw', fontSize: 'clamp(8px, 0.8vw + 0.2vh, 12px)', opacity: 0.5, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase' }}>
          <LiveTime startAnimation={startAnimation} />
        </div>

        {/* Bottom Center Edge: Res */}
        <div style={{ position: 'absolute', bottom: '8vh', left: '50%', transform: 'translateX(-50%)', fontSize: 'clamp(8px, 0.8vw + 0.2vh, 12px)', opacity: 0.5, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase' }}>
          <LiveDimensions startAnimation={startAnimation} />
        </div>
      </div>
    </div>
  );
};

export default Section1DOM;
