import {serializeProject} from '@/lib/project-codec.mjs';

// Project data stays in this browser. No catalogue or network access is needed.
self.onmessage=(event:MessageEvent)=>{
 try{self.postMessage({text:serializeProject(event.data)});}
 catch(error){self.postMessage({error:error instanceof Error?error.message:'Project kon niet worden bewaard.'});}
};
