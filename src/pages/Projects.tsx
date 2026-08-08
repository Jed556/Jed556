import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGitHubRepos } from '../data/github';
import type { GitHubRepo } from '../data/github';
import HUDOverlay from '../components/hud/HUDOverlay';
import GlitchText from '../components/hud/GlitchText';
import ProjectGrid from '../components/projects/ProjectGrid';
import ProjectModal from '../components/projects/ProjectModal';
import './Projects.css';

export default function Projects() {
  const { repos, loading, error } = useGitHubRepos('Jed556');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  return (
    <div className="projects-container" data-cursor="scroll-y">
      <HUDOverlay>
        <div className="projects-content">
          <div className="section-index">[02] PROJECTS</div>
          
          <div className="projects-header">
            <GlitchText text="ARCHIVE" as="h1" className="projects-title" />
          </div>

          {loading && (
            <div className="loading-state">
              <GlitchText text="LOADING PROJECTS..." as="p" />
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>SYSTEM ERROR: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className={`projects-grid-wrapper ${selectedRepo ? 'faded' : ''}`}>
              <ProjectGrid 
                repos={repos} 
                onSelectProject={setSelectedRepo}
              />
            </div>
          )}
        </div>
      </HUDOverlay>

      <AnimatePresence>
        {selectedRepo && (
          <ProjectModal 
            repo={selectedRepo} 
            onClose={() => setSelectedRepo(null)} 
            layoutId={`project-${selectedRepo.id}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
