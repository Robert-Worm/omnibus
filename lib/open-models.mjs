// Opening a model is navigation state, independent of chosen questions or adoption.
export function normalizeOpenModelIds(ids, models = []) {
  const known = new Set(models.map(model => model.id));
  return [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && known.has(id)))];
}

export function addOpenModel(ids, id, models) {
  return normalizeOpenModelIds([...(Array.isArray(ids) ? ids : []), id], models);
}

export function removeOpenModel(ids, id, models) {
  return normalizeOpenModelIds(ids, models).filter(openId => openId !== id);
}

export function resolveOpenModel(ids, activeId, models) {
  const openIds = normalizeOpenModelIds(ids, models);
  const id = openIds.includes(activeId) ? activeId : openIds[0];
  return models.find(model => model.id === id);
}
