import original from './wwke-reviewed/catalogue.json' with {type:'json'};
import {applyWwkeCatalogueText} from './wwke-text-revisions.mjs';

// Content boundary also used by the lazy database build.
export default applyWwkeCatalogueText(original);
