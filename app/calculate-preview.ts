import {exportState} from './export-state';
import {workbookPreviewSnapshot} from '@/lib/workbook-preview-snapshot.mjs';
import type {PreviewRequest,PreviewResult} from './preview-calculator';

export function calculatePreview({framework,draft,models,config}:PreviewRequest):PreviewResult {
  const {preview,validation}=exportState(framework,draft,config,models);
  return {preview:workbookPreviewSnapshot(preview),validation};
}
