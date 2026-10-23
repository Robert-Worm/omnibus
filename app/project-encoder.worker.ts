import {serializeProject} from '@/lib/project-codec.mjs';
import {unpackProjectSave} from '@/lib/project-save-transfer.mjs';
import type {Project} from '@/lib/project-session.mjs';

// Project data stays in this browser. No catalogue or network access is needed.
let materials:NonNullable<Project['draft']['investigation']>['materials']=[];
self.onmessage=(event:MessageEvent)=>{
 const {id}=event.data;
 try{
  const project=unpackProjectSave(event.data,materials),text=serializeProject(project);
  materials=project?.draft?.investigation?.materials??[];
  self.postMessage({id,text});
 }
 catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Project kon niet worden bewaard.'});}
};
