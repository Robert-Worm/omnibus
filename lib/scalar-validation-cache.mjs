// Cache validation, never trust object identity alone. Only flat scalar records
// qualify; edits, accessors and a changed catalogue revision invalidate a hit.
function snapshot(value) {
  if (!value || typeof value !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).length !== Object.keys(descriptors).length) return null;
  for (const descriptor of Object.values(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
    const item = descriptor.value;
    if (item !== null && !['string', 'number', 'boolean', 'undefined'].includes(typeof item)) return null;
  }
  // A normal data-property copy keeps the engine's fast object shape. Copying
  // a null-prototype dictionary on every cache hit was expensive for projects
  // with hundreds of materials. Use the inspected descriptors, not a second
  // property read, and preserve an own '__proto__' as data rather than a setter.
  return Object.defineProperties({}, descriptors);
}

// Compare a live record with a private scalar snapshot without invoking getters.
export function scalarRecordMatches(value, copy) {
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
    if (hit && scalarRecordMatches(value, hit.input)) {
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
