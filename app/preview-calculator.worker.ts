import {ensureCatalogue} from '@/lib/catalogue-runtime.mjs';
import {projectCatalogueKeys} from '@/lib/application-catalogue.mjs';
import {calculatePreview} from './calculate-preview';
import type {PreviewContext,PreviewMessage} from './preview-calculator';
import {databaseSourceClient} from '@/lib/database-source-client.mjs';
import {unpackPreviewContext} from '../lib/preview-context.mjs';
import {packPreviewReply,type PreviewReceipt} from './preview-result.mjs';

let context:PreviewContext|undefined;
let previous:PreviewReceipt|null=null;
// The client serializes jobs. Only the current project's pinned catalogue parts
// are read through the same hash-validated transport. Transferred bytes from the
// document avoid duplicate downloads, but do not replace source validation.
self.onmessage=async(event:MessageEvent<PreviewMessage>)=>{
  const {id,config}=event.data;
  try{
    if(event.data.context){
      context=undefined;
      context=unpackPreviewContext({...event.data,context:event.data.context});
    }
    if(!context)throw Error('De onderzoeksopzet ontbreekt.');
    databaseSourceClient.stageContentTransfers(event.data.sources??[]);
    await ensureCatalogue(projectCatalogueKeys({draft:context.draft,modelLibrary:{models:context.models}}));
    const result=calculatePreview({...context,config});
    self.postMessage(packPreviewReply(id,result,previous));
    previous={id,result};
  }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Het exportvoorbeeld kon niet worden gemaakt.'});}
  finally{databaseSourceClient.stageContentTransfers([]);}
};
