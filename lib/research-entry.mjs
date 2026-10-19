export function validateRiskIntake(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ongeldige risicoverkenning.');
 const result={context:'',signals:''};for(const k of ['context','signals']){if(value[k]!==undefined&&(typeof value[k]!=='string'||value[k].length>5000))throw Error('Ongeldige risicoverkenning.');result[k]=value[k]||'';}return result;
}
