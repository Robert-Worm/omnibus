// Browser-worker transport only. Stored/downloaded projects keep the existing
// complete format. Compare scalar values, never trust mutable object identity.
function snapshot(value) {
 if(!value||Object.getPrototypeOf(value)!==Object.prototype)return null;
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
 if(keys.some(key=>typeof key!=='string'||!fields[key].enumerable||!Object.hasOwn(fields[key],'value')||
  (fields[key].value!==null&&!['string','number','boolean','undefined'].includes(typeof fields[key].value))))return null;
 return Object.fromEntries(keys.map(key=>[key,fields[key].value]));
}
function plainList(value) {
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)return false;
 for(let i=0;i<value.length;i++){
  const field=Object.getOwnPropertyDescriptor(value,i);
  if(!field?.enumerable||!Object.hasOwn(field,'value'))return false;
 }
 return true;
}
function same(a,b) {
 if(!a||!b)return false;
 const keys=Object.keys(a),before=Object.keys(b);
 return keys.length===before.length&&keys.every((key,i)=>key===before[i]&&Object.is(a[key],b[key]));
}

/** Reference only unchanged material records from the last acknowledged save. */
export function packProjectSave(project,previous=[]) {
 const materials=project?.draft?.investigation?.materials;
 if(!plainList(materials))return {message:{project},snapshots:[]};
 const snapshots=materials.map(snapshot),materialReferences=[];
 const packed=materials.map((material,i)=>{
  if(!same(snapshots[i],previous[i]))return material;
  materialReferences.push(i);return null;
 });
 const message=materialReferences.length?{project:{...project,draft:{...project.draft,
  investigation:{...project.draft.investigation,materials:packed}}},materialReferences}:{project};
 return {message,snapshots};
}

/** Missing/ambiguous references fail closed; the normal codec still checks size. */
export function unpackProjectSave({project,materialReferences},previous=[]) {
 if(materialReferences===undefined)return project;
 const materials=project?.draft?.investigation?.materials;
 if(!plainList(materials)||!plainList(materialReferences))throw Error('Ongeldige projectoverdracht.');
 const restored=[...materials];let last=-1;
 for(const index of materialReferences){
  if(!Number.isSafeInteger(index)||index<=last||index>=materials.length||materials[index]!==null||!snapshot(previous[index]))
   throw Error('Ontbrekende brongegevens bij projectoverdracht.');
  restored[index]={...previous[index]};last=index;
 }
 return {...project,draft:{...project.draft,investigation:{...project.draft.investigation,materials:restored}}};
}
