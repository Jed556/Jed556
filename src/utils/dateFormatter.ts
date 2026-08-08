export const formatDate = (ts?: string) => {
  if (!ts) return '';
  if (ts.toLowerCase() === 'present') return 'Present';
  
  // Format MM/YYYY
  const parts = ts.split('/');
  if (parts.length === 2) {
    const [mm, yyyy] = parts;
    if (mm === '00') return yyyy;
    const date = new Date(parseInt(yyyy), parseInt(mm) - 1);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  // Format DD.MM.YYYY or MM.DD.YYYY
  const dotParts = ts.split('.');
  if (dotParts.length === 3) {
    // We assume DD.MM.YYYY by default
    const part1 = parseInt(dotParts[0]);
    const part2 = parseInt(dotParts[1]);
    const year = parseInt(dotParts[2]);
    
    // If the middle part is > 12, it must be MM.DD.YYYY
    let monthIndex = 0;
    if (part2 > 12) {
      monthIndex = part1 - 1;
    } else {
      // Default to DD.MM.YYYY
      monthIndex = part2 - 1;
    }

    const date = new Date(year, monthIndex);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  // Fallback (e.g. "January 2026")
  return ts;
};

export const formatPeriod = (start?: string, end?: string) => {
  if (!start && !end) return '';
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
  return formatDate(start || end || '');
};
