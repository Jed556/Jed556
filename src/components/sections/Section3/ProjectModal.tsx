import React, { useEffect, useState, useRef } from 'react';
import type { FlatProject } from '../../../data/projects';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { CustomYouTubePlayer } from './CustomYouTubePlayer';

import './ProjectModal.css';

interface ProjectModalProps {
  project: FlatProject;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const previews = project.fullResPreviews || project.previews || [];
  
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % previews.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + previews.length) % previews.length);
  };

  const currentMedia = previews[currentIndex];
  const isVideo = currentMedia?.match(/\.(mp4|webm|ogg)$/i);
  const isYouTube = currentMedia?.includes('youtube.com') || currentMedia?.includes('youtu.be') || currentMedia?.includes('img.youtube.com');

  // Convert YouTube thumbnail previews back to embedded video URLs if needed.
  let youtubeVideoId = '';
  if (isYouTube) {
    const match = currentMedia.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
    if (match && match[1]) {
      youtubeVideoId = match[1];
    }
  }

  let currentSkills: string[] = [];
  if (project.skills && project.skills.length > 0) {
    if (Array.isArray(project.skills[0])) {
      currentSkills = (project.skills as string[][])[currentIndex] || [];
    } else {
      currentSkills = project.skills as string[];
    }
  }

  const isYouTubeLink = project.link?.includes('youtube.com') || project.link?.includes('youtu.be');
  const isGithubLink = project.link?.includes('github.com');

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 2
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95,
      zIndex: 0
    })
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.4 }}
        className="modal-backdrop"
        onClick={onClose}
      />

      <div className="modal-container">
        
        {/* Left Column (1/3) - Details */}
        <motion.div 
          initial={{ x: '-50%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="modal-details"
        >
          <div className="modal-details-scroll custom-scrollbar">
            <h2 className="modal-title">
              {project.name}
            </h2>
            <p className="modal-date">{project.date || "01.12.2026"}</p>
            
            <p className="modal-desc">
              {project.description.split(/(\[.*?\]\(.*?\))/g).map((part, i) => {
                const match = part.match(/\[(.*?)\]\((.*?)\)/);
                if (match) {
                  return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="modal-desc-link">{match[1]}</a>;
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
              })}
            </p>

            {currentSkills.length > 0 && (
              <div>
                <h3 className="modal-skills-title">Technologies & Tools</h3>
                <div className="modal-skills-list">
                  {currentSkills.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="modal-skill-tag"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`modal-external-btn ${isYouTubeLink ? 'youtube' : isGithubLink ? 'github' : ''}`}
              title={isYouTubeLink ? 'Watch on YouTube' : isGithubLink ? 'View on GitHub' : 'Open Link'}
            >
              {isYouTubeLink ? (
                <img src="/icons/youtube.svg" width={24} height={24} alt="YouTube" />
              ) : isGithubLink ? (
                <img src="/icons/github.svg" width={24} height={24} alt="GitHub" />
              ) : (
                <ExternalLink size={24} />
              )}
            </a>
          )}

          <button 
            onClick={onClose}
            className="modal-close-btn"
          >
            <X size={24} />
          </button>
        </motion.div>

        {/* Right Column (2/3) - Media */}
        <motion.div 
          initial={{ x: '50%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '50%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="modal-media"
        >
          {/* Ambient Glow Background */}
          {!youtubeVideoId && !isVideo && currentMedia && (
             <img src={currentMedia} className="modal-ambient-glow" alt="" />
          )}

          {previews.length > 0 && (
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.3 }
                }}
                className="modal-media-inner"
              >
                {youtubeVideoId ? (
                  <CustomYouTubePlayer videoId={youtubeVideoId} />
                ) : isVideo ? (
                  <video 
                    src={currentMedia} 
                    className="modal-media-content"
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                  />
                ) : (
                  <img 
                    src={currentMedia} 
                    alt={project.name} 
                    className="modal-media-content"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Navigation Controls */}
          {previews.length > 1 && (
            <>
              <button 
                onClick={prevSlide}
                className="modal-nav-btn modal-nav-prev"
              >
                <ChevronLeft size={24} />
              </button>
              
              <button 
                onClick={nextSlide}
                className="modal-nav-btn modal-nav-next"
              >
                <ChevronRight size={24} />
              </button>

              {/* Dots */}
              <div className="modal-dots">
                {previews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`modal-dot ${idx === currentIndex ? 'active' : ''}`}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
