export function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) {
    return 'N/A';
  }

  return `$${numeric.toFixed(2)}`;
}

export function formatDate(value?: string) {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleString();
}

export function severityTone(severity?: string) {
  switch (severity) {
    case 'CRITICAL':
      return '#9F1D1D';
    case 'HIGH':
      return '#C05621';
    case 'MEDIUM':
      return '#B7791F';
    case 'LOW':
      return '#2F855A';
    default:
      return '#6B7280';
  }
}
