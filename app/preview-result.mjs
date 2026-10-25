/** @typedef {import('./preview-calculator').PreviewResult} PreviewResult */
/** @typedef {NonNullable<PreviewResult['preview']>} Preview */
/** @typedef {{id:number,result?:PreviewResult,error?:string,reuse?:{baseId:number,fields:string[],sheets:number[]}}} PreviewReply */
/** @typedef {{id:number,result:PreviewResult}} PreviewReceipt */

// Transport equality, not source admission. Calculation and validation have
// already run. Preserve property/array order, dates and explicit empty values.
/** @param {unknown} a @param {unknown} b @returns {boolean} */
function exact(a,b) {
  if(Object.is(a,b))return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
  if(a instanceof Date||b instanceof Date)
    return a instanceof Date&&b instanceof Date&&Object.is(a.getTime(),b.getTime());
  if(Object.getPrototypeOf(a)!==Object.getPrototypeOf(b)||
    ![Object.prototype,Array.prototype].includes(Object.getPrototypeOf(a)))return false;
  const keys=Reflect.ownKeys(a),other=Reflect.ownKeys(b);
  return keys.length===other.length&&keys.every((key,i)=>{
    if(typeof key!=='string'||key!==other[i])return false;
    const left=Object.getOwnPropertyDescriptor(a,key),right=Object.getOwnPropertyDescriptor(b,key);
    return !!left&&!!right&&Object.hasOwn(left,'value')&&Object.hasOwn(right,'value')&&
      left.enumerable===right.enumerable&&exact(left.value,right.value);
  });
}

/** One previous reply only. Never skip calculation, evidence or changed fields.
 * @param {number} id @param {PreviewResult} result @param {PreviewReceipt|null} previous @returns {PreviewReply} */
export function packPreviewReply(id,result,previous) {
  const before=previous?.result.preview,current=result.preview;
  if(!before||!current)return {id,result};
  const fields=Object.keys(current).filter(key=>key!=='sheets'&&Object.hasOwn(before,key)&&
    exact(Reflect.get(current,key),Reflect.get(before,key)));
  const sheets=current.sheets.flatMap((sheet,i)=>exact(sheet,before.sheets[i])?[i]:[]);
  if(!fields.length&&!sheets.length)return {id,result};
  const preview={...current,sheets:current.sheets.map((sheet,i)=>sheets.includes(i)?null:sheet)};
  for(const key of fields)Reflect.deleteProperty(preview,key);
  return {id,result:{...result,preview:/** @type {Preview} */(preview)},reuse:{baseId:previous.id,fields,sheets}};
}

/** Rebuild the complete validated workbook, including all downloadable evidence.
 * @param {PreviewReply} reply @param {PreviewReceipt|null} previous @returns {PreviewReply} */
export function unpackPreviewReply(reply,previous) {
  if(!reply.reuse)return reply;
  const {baseId,fields,sheets}=reply.reuse,before=previous?.result.preview,partial=reply.result?.preview;
  if(baseId!==previous?.id||!before||!partial||!Array.isArray(fields)||!Array.isArray(sheets)||
    new Set(fields).size!==fields.length||new Set(sheets).size!==sheets.length)
    throw Error('Het exportvoorbeeld mist zijn vorige overdracht.');
  const preview={...partial,sheets:[...partial.sheets]};
  for(const key of fields){
    if(key==='sheets'||!Object.hasOwn(before,key)||Object.hasOwn(partial,key))
      throw Error('Ongeldige gedeelde voorbeeldgegevens.');
    Object.defineProperty(preview,key,{value:Reflect.get(before,key),enumerable:true,writable:true,configurable:true});
  }
  for(const i of sheets){
    if(!Number.isSafeInteger(i)||i<0||i>=preview.sheets.length||!before.sheets[i]||preview.sheets[i]!==null)
      throw Error('Ongeldig gedeeld werkblad.');
    preview.sheets[i]=before.sheets[i];
  }
  if(preview.sheets.some(sheet=>!sheet))throw Error('Het exportvoorbeeld mist een werkblad.');
  return {id:reply.id,result:{validation:reply.result.validation,preview}};
}
