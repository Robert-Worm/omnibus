// Identity tombstones prevent removed pilots from reappearing in new collections.
// The report payloads and their application-level project support are removed.
import {removedReportIds} from './removed-report-content.mjs';
export const retiredThemeIds = ['beleidsevaluatie','informatiebeheer','subsidiebeheer'];
export const retiredReportIds = removedReportIds;
export const activeThemes = themes => themes.filter(t=>!retiredThemeIds.includes(t.id));
export const activeReportFrameworks = frameworks => frameworks.filter(f=>!retiredReportIds.includes(f.report.id));
