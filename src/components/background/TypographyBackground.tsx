import { useEffect } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import './TypographyBackground.css';

export default function TypographyBackground() {
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;

  // Normalize mouse position from -1 (left/top) to 1 (right/bottom)
  const normalizedX = useTransform(mouseX, [0, windowWidth], [-1, 1]);
  const normalizedY = useTransform(mouseY, [0, windowHeight], [-1, 1]);

  // Smooth out the movement with a responsive, snappy spring
  const smoothX = useSpring(normalizedX, { stiffness: 60, damping: 25 });
  const smoothY = useSpring(normalizedY, { stiffness: 60, damping: 25 });

  // Parallax layers based on user spec:
  // "angle the camera against the cursors position" -> Move opposite to cursor
  // "blacks move less and greyscale ones move more"  // True 3D Camera Tilt Parallax
  // smoothX/Y: 0 is Top/Left, 1 is Bottom/Right
  
  // Rotate the entire container to face the mouse (elevate TOWARDS cursor)
  // Cursor Left (0) -> tilt left edge toward camera -> rotateY Positive
  // Cursor Right (1) -> tilt right edge toward camera -> rotateY Negative
  // Shifted to have a default tilt to the right (right edge closer = negative rotateY at center)
  const rotateY = useTransform(smoothX, [0, 1], [6, -10]);
  
  // Cursor Top (0) -> tilt top edge toward camera -> rotateX Negative
  // Cursor Bottom (1) -> tilt bottom edge toward camera -> rotateX Positive
  const rotateX = useTransform(smoothY, [0, 1], [-6, 6]);

  // Translate entire scene opposite to cursor
  const x = useTransform(smoothX, [0, 1], ['2%', '-2%']);
  const y = useTransform(smoothY, [0, 1], ['2%', '-2%']);

  return (
    <div className="typo-bg-container" style={{ perspective: '1200px' }}>
      
      {/* 3D Tilt Wrapper */}
      <motion.div 
        className="typo-3d-wrapper"
        style={{
          x,
          y,
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Layer 5: Background Marquee (Deepest Z) */}
        <motion.div 
          className="typo-layer"
          style={{ z: -2400, zIndex: 1, top: '5%' }}
        >
          <div className="typo-bg-greyscale">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="marquee-row">
                <div className="marquee-content">
                  WE ARE ALWAYS FLEXIBLE IN ORDER TO PURSUE OUR IDEALS WE ARE ALWAYS FLEXIBLE IN ORDER TO PURSUE OUR IDEALS WE ARE ALWAYS FLEXIBLE IN ORDER TO PURSUE OUR IDEALS&nbsp;
                </div>
                <div className="marquee-content">
                  WE ARE ALWAYS FLEXIBLE IN ORDER TO PURSUE OUR IDEALS WE ARE ALWAYS FLEXIBLE IN ORDER TO PURSUE OUR IDEALS WE ARE ALWAYS FLEXIBLE IN ORDER TO PURSUE OUR IDEALS&nbsp;
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Layer 4: Corner Bottom Right (Basic Text) */}
        <motion.div 
          className="typo-layer typo-corner-br"
          style={{ z: 200, rotate: -10, zIndex: 2 }}
        >
          <div>in order to pursue</div>
          <div>our ideals</div>
        </motion.div>

        {/* Layer 3: Center Filled Text (Anchor Plane) */}
        <motion.div 
          className="typo-layer"
          style={{ 
            z: 0, 
            rotate: -10,
            zIndex: 3,
            top: '50%',
            left: 0,
            width: '100%',
            height: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: '-2vw'
          }}
        >
          <div className="typo-center-text">FLEXIBLE</div>
        </motion.div>

        {/* Layer 2: Outline Text (Perfectly overlaps center, slightly in front) */}
        <motion.div 
          className="typo-layer typo-outline"
          style={{ 
            z: 40, 
            rotate: -10, 
            zIndex: 4,
            top: '50%',
            left: 0,
            width: '100%',
            height: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: '-2vw'
          }}
        >
          <div className="typo-center-text">FLEXIBLE</div>
        </motion.div>

        {/* Layer 1: Cursive Upper Left (Furthest in front) */}
        <motion.div 
          className="typo-layer typo-cursive"
          style={{ z: 200, rotate: -15, zIndex: 5 }}
        >
          Always
        </motion.div>
        
      </motion.div>
    </div>
  );
}
