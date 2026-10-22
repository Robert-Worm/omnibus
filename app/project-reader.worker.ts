import {parseProjectText} from '@/lib/project-codec.mjs';

// No network, catalogue or storage: preserve the existing decoder and limits.
self.onmessage=(event:MessageEvent<string>)=>{
 try{self.postMessage({value:parseProjectText(event.data)});}
 catch(error){self.postMessage({error:error instanceof Error?error.message:'Project kon niet worden geopend.',errorName:error instanceof SyntaxError?'SyntaxError':'Error'});}
};
