import {serializeProject} from '@/lib/project-codec.mjs';
import {workbookPackage,zipStored} from '@/lib/excel-package.mjs';
import type {FileRequest,FileContent} from './file-encoder';

export function encodeFile(request:FileRequest):FileContent {
  if(request.kind==='project')return serializeProject(request.project);
  if(request.kind==='xlsx')return new Uint8Array(zipStored(workbookPackage(request.model))).buffer;
  throw Error('Onbekend bestandstype.');
}
