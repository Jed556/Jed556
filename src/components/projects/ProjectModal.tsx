import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GitHubRepo } from '../../data/github';
import GlitchText from '../hud/GlitchText';
import './ProjectModal.css';

interface ProjectModalProps {
  repo: GitHubRepo | null;
  onClose: () => void;
  layoutId: string;
}

export default function ProjectModal({ repo, onClose, layoutId }: ProjectModalProps) {
  useEffect(() => {
    if (repo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [repo]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!repo) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="project-modal-overlay">
      <motion.div 
        className="project-modal-content"
        layoutId={layoutId}
      >
        <motion.div 
          className="project-modal-inner"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="modal-header">
            <GlitchText text={repo.name} className="modal-title" as="h2" />
          </motion.div>
          
          <motion.div variants={itemVariants} className="modal-meta">
            {repo.language && (
              <span className="modal-lang">[{repo.language}]</span>
            )}
            <span className="modal-stat">★ {repo.stargazers_count} STARS</span>
            <span className="modal-stat">⑂ {repo.forks_count} FORKS</span>
          </motion.div>

          <motion.div variants={itemVariants} className="modal-desc">
            <p>{repo.description || 'No detailed description provided.'}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="modal-topics">
            {repo.topics && repo.topics.map(topic => (
              <span key={topic} className="modal-topic-tag">{topic}</span>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="modal-links">
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="pill-link">
              GITHUB REPO
            </a>
            {repo.homepage && (
              <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="pill-link">
                LIVE DEMO
              </a>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.button 
        className="modal-close-btn"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onClose}
        data-cursor="expand"
      >
        CLOSE [X]
      </motion.button>
    </div>
  );
}
