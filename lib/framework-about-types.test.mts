// Compile-only contracts; never load the private publication or emit these fixtures.
import type {CioContextReview,CioContextSourceKey} from './cio-source-context.mjs';
import type {WwkeAboutSector,wwkeRelatedContext} from './wwke-about-view.mjs';
import type {WwkeDisplayContext} from './wwke-law-data.mjs';

export function sourceKeys(review:CioContextReview):string[] {
  return [...review.holds,...review.findings].flatMap(item =>
    item.sourceKeys.map(key => review.sources[key].url));
}
export function displayText(context:WwkeDisplayContext,sector:WwkeAboutSector):string[] {
  return [context.dates.selected_consolidation,context.quality.source_differences,
    sector.authority,...context.limitations];
}
export function optionalContext(related:typeof wwkeRelatedContext):string[] {
  return related['synthetic-norm'] ?? [];
}
export const sourceKey:CioContextSourceKey='publication';
// @ts-expect-error An unknown source must not become a clickable reference.
export const invalidKey:CioContextSourceKey='synthetic-unknown-source';
// @ts-expect-error A finding's details must remain readable text, not arbitrary JSON.
export const invalidDetails:CioContextReview['findings'][number]['details']=[{text:'synthetic'}];
// @ts-expect-error The displayed consolidation date is text, not a nullable audit period.
export const invalidDate:WwkeDisplayContext['dates']['selected_consolidation']=null;
// @ts-expect-error Unknown context mappings may be absent.
export function missingContext(related:typeof wwkeRelatedContext):string[]{return related['missing'];}
