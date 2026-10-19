import type { Draft, Framework } from './framework-types.js';
import type { WorkbookPreview } from './workbook-preview-types.js';
// Options are validated by the generator, including restored project settings.
export function creatorWorkbookModel(framework: Framework, draft: Draft, options?: Record<string, unknown>): WorkbookPreview;
