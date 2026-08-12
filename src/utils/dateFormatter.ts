export const formatDate = (ts?: string) => {
  if (!ts) return '';
  if (ts.toLowerCase() === 'present') return 'Present';

  // Format MM/YYYY
  const parts = ts.split('/');
  if (parts.length === 2) {
    const [mm, yyyy] = parts;
    // Hide dates with year 0000
    if (yyyy === '0000') return '';
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

    // Hide dates with year 0000
    if (year === 0) return '';

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

  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);

  // If both are empty, return empty
  if (!formattedStart && !formattedEnd) return '';

  // If only one is populated, return that one
  if (formattedStart && !formattedEnd) return formattedStart;
  if (!formattedStart && formattedEnd) return formattedEnd;

  // Both are populated
  return `${formattedStart} - ${formattedEnd}`;
};
