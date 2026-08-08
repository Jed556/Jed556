import type { GitHubRepo } from '../../data/github';
import ProjectCard from './ProjectCard';
import './ProjectGrid.css';

interface ProjectGridProps {
  repos: GitHubRepo[];
  onSelectProject: (repo: GitHubRepo) => void;
}

export default function ProjectGrid({ repos, onSelectProject }: ProjectGridProps) {
  return (
    <div className="project-grid">
      {repos.map((repo, idx) => (
        <ProjectCard 
          key={repo.id} 
          repo={repo} 
          onClick={() => onSelectProject(repo)} 
          layoutId={`project-${repo.id}`} 
          className={idx % 5 === 0 ? 'span-2' : ''}
        />
      ))}
    </div>
  );
}
