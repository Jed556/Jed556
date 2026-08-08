
import HUDOverlay from '../components/hud/HUDOverlay';
import GlitchText from '../components/hud/GlitchText';
import { motion } from 'framer-motion';
import './Home.css';

export default function Home() {
  return (
    <div className="home-container" data-cursor="scroll-y">
      {/* 3D Scene Background placeholder if actual component doesn't exist yet */}
      <div className="scene-background" />

      <HUDOverlay>
        <div className="home-content">
          <div className="hero-section">
            <GlitchText text="JED CRUZ" className="hero-title" as="h1" speed={80} />
            <GlitchText text="SOFTWARE DEVELOPER" className="hero-subtitle" as="h2" delay={800} speed={40} />
            
            <motion.p 
              className="hero-bio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
            >
              Building digital experiences with code and creativity.
            </motion.p>
            
            <div className="hazard-stripe"></div>
          </div>

          <div className="scroll-indicator">
            <div className="chevron"></div>
            <span>SCROLL TO EXPLORE</span>
          </div>

          <div className="section-index">[01] HOME</div>
        </div>
      </HUDOverlay>
    </div>
  );
}
