// Cache validation, never trust object identity alone. Only flat scalar records
// qualify; edits, accessors and a changed catalogue revision invalidate a hit.
function snapshot(value) {
  if (!value || typeof value !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value), copy = Object.create(null);
  if (Reflect.ownKeys(value).length !== Object.keys(descriptors).length) return null;
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
    const item = descriptor.value;
    if (item !== null && !['string', 'number', 'boolean', 'undefined'].includes(typeof item)) return null;
    copy[key] = item;
  }
  return copy;
}

function matches(value, copy) {
  if (!value || typeof value !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== Object.keys(copy).length) return false;
  return keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return Object.hasOwn(copy, key) && descriptor.enumerable &&
      Object.hasOwn(descriptor, 'value') && Object.is(descriptor.value, copy[key]);
  });
}

export function createScalarValidationCache(validate, revision = () => 0) {
  let seenRevision = revision(), entries = new WeakMap();
  return value => {
    const current = revision();
    if (current !== seenRevision) { entries = new WeakMap(); seenRevision = current; }
    const hit = value && typeof value === 'object' ? entries.get(value) : null;
    if (hit && matches(value, hit.input)) {
      // A caller may edit its returned object, but cannot poison the cache.
      const result = {...hit.output};
      entries.set(result, {input: hit.output, output: hit.output});
      return result;
    }
    const result = validate(value), input = snapshot(value), output = snapshot(result);
    if (output) {
      if (input) entries.set(value, {input, output});
      entries.set(result, {input: output, output});
    }
    return result;
  };
}
