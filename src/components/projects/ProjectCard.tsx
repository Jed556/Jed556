import { motion } from 'framer-motion';
import type { GitHubRepo } from '../../data/github';
import './ProjectCard.css';

interface ProjectCardProps {
  repo: GitHubRepo;
  onClick: () => void;
  layoutId: string;
  className?: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  Rust: '#dea584'
};

export default function ProjectCard({ repo, onClick, layoutId, className = '' }: ProjectCardProps) {
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] || '#ccc' : '#ccc';

  return (
    <motion.div 
      className={`project-card-wrapper ${className}`}
      layoutId={layoutId}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      data-cursor="expand"
    >
      <div className="project-card">
        <h3 className="project-title">{repo.name}</h3>
        <p className="project-desc">{repo.description || 'No description available.'}</p>
        
        <div className="project-meta">
          {repo.language && (
            <div className="lang-badge">
              <span className="lang-dot" style={{ backgroundColor: langColor }}></span>
              {repo.language}
            </div>
          )}
          <div className="star-count">
            ★ {repo.stargazers_count}
          </div>
        </div>

        {repo.topics && repo.topics.length > 0 && (
          <div className="project-topics">
            {repo.topics.slice(0, 3).map(topic => (
              <span key={topic} className="topic-tag">{topic}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
