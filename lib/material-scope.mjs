// These legacy adapters put applicability in rationale, not an organizational goal.
const scopeSources = new Set(['WOO', 'WDO', 'WBK', 'ARCHIEF2026', 'WWKE', 'WPG', 'WJSG', 'BVA2021']);

export function isUnchangedScopeRationale(material, original) {
  return Boolean(original && scopeSources.has(material.foundationId) &&
    material.rationale && material.rationale === original.rationale &&
    (material.sourceContext === material.rationale ||
      (material.sourceContext === original.sourceContext &&
        typeof material.sourceContext === 'string' && material.sourceContext.includes(material.rationale))));
}
