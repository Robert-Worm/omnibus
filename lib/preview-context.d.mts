import type {PreviewContext} from '../app/preview-calculator';
export type PackedPreviewContext = {context: PreviewContext; sharedMaterials?: true};
export function packPreviewContext(context: PreviewContext): PackedPreviewContext;
export function unpackPreviewContext(message: PackedPreviewContext): PreviewContext;
