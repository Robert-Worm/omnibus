// Public export entry points share one catalogue-independent OOXML writer.
import {creatorWorkbookModel} from "./creator-model.mjs";
import {attachDesktopVba} from "./excel-desktop.mjs";
import {workbookPackage,zipStored} from "./excel-package.mjs";
export {workbookPackage,zipStored} from "./excel-package.mjs";
export function exportAuditXlsx(framework, draft, options = {}) {
  return zipStored(workbookPackage(creatorWorkbookModel(framework, draft, options)));
}
export const excelDesktopMime='application/vnd.ms-excel.sheet.macroEnabled.12';
export function exportAuditDesktop(framework, draft, options = {}) {
  const model=creatorWorkbookModel(framework,draft,options);
  return zipStored(attachDesktopVba(workbookPackage(model),model));
}
export async function draftFingerprint(draft) {
  const stable = (v) =>
    Array.isArray(v)
      ? v.map(stable)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, stable(v[k])]),
          )
        : v;
  const bytes = new TextEncoder().encode(JSON.stringify(stable(draft)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
