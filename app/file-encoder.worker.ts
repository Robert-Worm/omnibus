import {encodeFile} from './encode-file';
import type {FileRequest} from './file-encoder';

// No catalogue, network or storage access: only encode this explicit snapshot.
self.onmessage=(event:MessageEvent<FileRequest>)=>{
  try{
    const content=encodeFile(event.data);
    self.postMessage({content},content instanceof ArrayBuffer?{transfer:[content]}:{});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:'Het bestand kon niet worden gemaakt.'});}
};
