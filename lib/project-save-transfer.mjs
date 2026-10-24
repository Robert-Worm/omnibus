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
 if(!a||!b||Object.getPrototypeOf(a)!==Object.prototype)return false;
 const keys=Reflect.ownKeys(a),before=Object.keys(b);
 if(keys.length!==before.length)return false;
 for(let i=0;i<keys.length;i++){
  const key=keys[i];if(key!==before[i])return false;
  const field=Object.getOwnPropertyDescriptor(a,key);
  if(!field?.enumerable||!Object.hasOwn(field,'value')||
   (field.value!==null&&!['string','number','boolean','undefined'].includes(typeof field.value))||
   !Object.is(field.value,b[key]))return false;
 }
 return true;
}

/** Reference only unchanged material records from the last acknowledged save. */
export function packProjectSave(project,previous=[]) {
 const materials=project?.draft?.investigation?.materials;
 if(!plainList(materials))return {message:{project},snapshots:[]};
 const snapshots=[],materialReferences=[];
 const packed=materials.map((material,i)=>{
  // Inspect the live record before reusing its private, acknowledged snapshot.
  // Ordinary edits need no new copy of every unchanged source record.
  if(same(material,previous[i])){
   snapshots.push(previous[i]);materialReferences.push(i);return null;
  }
  snapshots.push(snapshot(material));return material;
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
