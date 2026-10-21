import {ensureCatalogue} from '@/lib/catalogue-runtime.mjs';
import {projectCatalogueKeys} from '@/lib/application-catalogue.mjs';
import {calculatePreview} from './calculate-preview';
import type {PreviewContext,PreviewMessage} from './preview-calculator';

let context:PreviewContext|undefined;
// The client serializes jobs. Only the current project's pinned catalogue parts
// are requested through the existing read-only, hash-validated transport.
self.onmessage=async(event:MessageEvent<PreviewMessage>)=>{
  const {id,config}=event.data;
  try{
    if(event.data.context)context=event.data.context;
    if(!context)throw Error('De onderzoeksopzet ontbreekt.');
    await ensureCatalogue(projectCatalogueKeys({draft:context.draft,modelLibrary:{models:context.models}}));
    self.postMessage({id,result:calculatePreview({...context,config})});
  }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Het exportvoorbeeld kon niet worden gemaakt.'});}
};
