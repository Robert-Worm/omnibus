export function reportDateLabel(report) {
  const value = report?.date || '';
  if (/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) {
    const full = value.length === 10;
    const iso = full ? value : value + '-01';
    const date = new Date(iso + 'T12:00:00Z');
    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso)) {
      return 'Rapportdatum · ' + date.toLocaleDateString('nl-NL', {
        ...(full ? {day:'numeric'} : {}), month:'long', year:'numeric', timeZone:'UTC',
      });
    }
  }
  return report?.year ? 'Rapportjaar · ' + report.year : '';
}
