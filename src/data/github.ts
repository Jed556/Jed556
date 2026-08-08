import { useState, useEffect } from 'react';

export interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  homepage: string;
  language: string;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  fork: boolean;
}

const CACHE_KEY = 'github-repos';
const TTL = 30 * 60 * 1000; // 30 minutes

export async function fetchGitHubRepos(username: string = 'Jed556'): Promise<GitHubRepo[]> {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < TTL) {
      return data;
    }
  }

  const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=owner`);
  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }

  const data: GitHubRepo[] = await response.json();
  const nonForks = data.filter(repo => !repo.fork);
  
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({
    data: nonForks,
    timestamp: Date.now()
  }));

  return nonForks;
}

export function useGitHubRepos(username: string = 'Jed556') {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchGitHubRepos(username)
      .then(data => {
        if (mounted) {
          setRepos(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [username]);

  return { repos, loading, error };
}
