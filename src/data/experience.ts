export interface Experience {
  id: string;
  role: string;
  company: string;
  periodStart?: string; // MM/YYYY format. Use '00/YYYY' for year only.
  periodEnd?: string;   // MM/YYYY format. Use '00/YYYY' for year only, or 'Present'
  description: string;
  position: [number, number]; // [x, y] stagger offset
  rotationY: number;          // Y-axis rotation in radians (banking/yaw)
}

const rawExperiences: Omit<Experience, 'position' | 'rotationY'>[] = [
  {
    id: 'exp-1',
    role: 'Freelance Multimedia Editor',
    company: 'Self-Employed',
    periodStart: '00/2020',
    periodEnd: '00/2024',
    description: 'Specialized in graphic design and video editing to craft compelling digital experiences for clients.',
  },
  {
    id: 'exp-2',
    role: 'Internship',
    company: 'DOST CALABARZON',
    periodStart: '03/2026',
    periodEnd: '05/2026',
    description: 'Contributed to the development of the SERVE System. Assisted in computer hardware, software, and printer troubleshooting, providing technical support.',
  },
  {
    id: 'exp-3',
    role: 'BS Computer Science Graduate',
    company: 'Colegio de San Juan de Letran Calamba',
    periodStart: '00/0000',
    periodEnd: '06/2026',
    description: 'Graduated with a Bachelor of Science in Computer Science from Colegio de San Juan de Letran Calamba. Awarded best research paper in the field of computer science.',
  }
];

const parseDateForSort = (dateStr?: string): number => {
  if (!dateStr) return 0;
  if (dateStr.toLowerCase() === 'present') return Infinity;
  const parts = dateStr.split('/');
  if (parts.length === 2) {
    const mm = parseInt(parts[0]) || 1; // '00' treated as January
    const yyyy = parseInt(parts[1]);
    return new Date(yyyy, mm - 1).getTime();
  }
  return 0;
};

// Sort oldest first (chronological order)
const sortedExperiences = [...rawExperiences].sort((a, b) => {
  const timeA = Math.max(parseDateForSort(a.periodEnd), parseDateForSort(a.periodStart));
  const timeB = Math.max(parseDateForSort(b.periodEnd), parseDateForSort(b.periodStart));
  return timeA - timeB;
});

// Dynamically assign alternating positions (left, right, left, right)
export const experiences: Experience[] = sortedExperiences.map((exp, index) => {
  const isEven = index % 2 === 0;
  return {
    ...exp,
    position: isEven ? [-3.0, 1.0] : [3.0, 0.0],
    rotationY: isEven ? 0.15 : -0.15,
  };
});

export const EXPERIENCE_SPACING = 6.0; // Reduced spacing to prevent scroll fatigue
