// Transport-only sharing of two equal material snapshots. Never omit a field or
// trust identity alone: changed, nested or unusual records keep the full path.
function scalarRecord(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return null;
  const keys = Reflect.ownKeys(value), fields = Object.getOwnPropertyDescriptors(value);
  for (const key of keys) {
    const field = fields[key];
    if (typeof key !== 'string' || !field.enumerable || !Object.hasOwn(field, 'value') ||
        (field.value !== null && !['string', 'number', 'boolean', 'undefined'].includes(typeof field.value))) return null;
  }
  return {keys, fields};
}
function plainList(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let i = 0; i < value.length; i++) {
    const field = Object.getOwnPropertyDescriptor(value, i);
    if (!field?.enumerable || !Object.hasOwn(field, 'value')) return false;
  }
  return true;
}
function sameMaterials(a, b) {
  if (!plainList(a) || !plainList(b) || !a.length || a.length !== b.length) return false;
  return a.every((value, i) => {
    const left = scalarRecord(value), right = scalarRecord(b[i]);
    return left && right && left.keys.length === right.keys.length && left.keys.every((key, j) =>
      key === right.keys[j] && Object.is(left.fields[key].value, right.fields[key].value));
  });
}

export function packPreviewContext(context) {
  const before = context.framework.workbenchMaterials, materials = context.draft.investigation?.materials;
  if (before === materials || !sameMaterials(before, materials)) return {context};
  // structuredClone/postMessage transfers this array once by shared identity.
  // The caller's objects are never changed, and fallback still uses the original.
  return {context: {...context, framework: {...context.framework, workbenchMaterials: materials}}, sharedMaterials: true};
}

export function unpackPreviewContext({context, sharedMaterials}) {
  if (!sharedMaterials) return context;
  const materials = context?.draft.investigation?.materials;
  if (!plainList(materials) || context.framework.workbenchMaterials !== materials || !materials.every(scalarRecord))
    throw Error('Ongeldige onderzoekscontext voor het exportvoorbeeld.');
  // Restore independent mutable records on the worker, where this cheap shallow
  // copy cannot block input. Strings are immutable; their exact values are kept.
  return {...context, framework: {...context.framework, workbenchMaterials: materials.map(m => ({...m}))}};
}
