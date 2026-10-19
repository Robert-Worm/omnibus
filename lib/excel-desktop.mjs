// Fixed desktop export: embeds our reviewed standard VBA module, never executes it.
import { desktopVbaBase64 } from './desktop-vba-data.mjs';

const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const relationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
const officeRelationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const drawingNs = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const drawingMain = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const escapeXml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const emu = points => Math.round(points * 12700);

function relationshipId(xml, preferred) {
  let id = preferred, n = 1;
  while (xml.includes(`Id="${id}"`)) id = preferred + ++n;
  return id;
}
function appendRelationship(files, path, preferred, type, target) {
  const original = files[path] || `${head}<Relationships xmlns="${relationships}"></Relationships>`;
  const id = relationshipId(original, preferred);
  files[path] = original.replace('</Relationships>', `<Relationship Id="${id}" Type="${type}" Target="${target}"/></Relationships>`);
  return id;
}
function contentType(files, part, type) {
  if (files['[Content_Types].xml'].includes(`PartName="${part}"`)) return;
  files['[Content_Types].xml'] = files['[Content_Types].xml'].replace('</Types>', `<Override PartName="${part}" ContentType="${type}"/></Types>`);
}
function toolbar(buttons) {
  let left = 8;
  const shapes = buttons.map((button, index) => {
    const x = left, width = button.width;
    left += width + 10;
    // [0] refers to this workbook, never the filename of the development seed.
    const macro = `[0]!OmnibusDesktop.${button.action}`;
    return `<xdr:absoluteAnchor><xdr:pos x="${emu(x)}" y="${emu(4)}"/><xdr:ext cx="${emu(width)}" cy="${emu(24)}"/><xdr:sp macro="${macro}"><xdr:nvSpPr><xdr:cNvPr id="${index + 1}" name="Omnibus_${({RegistreerVersie:'Versie',ToonVraag:'Vraag',NieuwToetspunt:'Punt'})[button.action]}" descr="${escapeXml(button.label)}"/><xdr:cNvSpPr><a:spLocks noChangeAspect="1"/></xdr:cNvSpPr></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(4)}"/><a:ext cx="${emu(width)}" cy="${emu(24)}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="234F7C"/></a:solidFill><a:ln><a:noFill/></a:ln></xdr:spPr><xdr:txBody><a:bodyPr wrap="none" lIns="${emu(6)}" tIns="0" rIns="${emu(6)}" bIns="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="nl-NL" sz="1000"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${escapeXml(button.label)}</a:t></a:r><a:endParaRPr lang="nl-NL" sz="1000"/></a:p></xdr:txBody></xdr:sp><xdr:clientData fLocksWithSheet="0" fPrintsWithSheet="0"/></xdr:absoluteAnchor>`;
  }).join('');
  return `${head}<xdr:wsDr xmlns:xdr="${drawingNs}" xmlns:a="${drawingMain}">${shapes}</xdr:wsDr>`;
}
function giveRowOneSpace(xml) {
  return xml.replace(/<row\b([^>]*\br="1"[^>]*)>/, (_, attrs) => {
    const clean = attrs.replace(/\sht="[^"]*"/g, '').replace(/\scustomHeight="[^"]*"/g, '');
    return `<row${clean} ht="32" customHeight="1">`;
  });
}

/** Mutates a fresh workbook package and its presentation metadata; returns that package. */
export function attachDesktopVba(files, model) {
  if (!files['[Content_Types].xml'] || !files['xl/workbook.xml']) throw new Error('Excel-pakket ontbreekt.');
  if (files['xl/vbaProject.bin']) return files;
  files['xl/vbaProject.bin'] = Uint8Array.from(atob(desktopVbaBase64), character => character.charCodeAt(0));
  files['[Content_Types].xml'] = files['[Content_Types].xml'].replace('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml', 'application/vnd.ms-excel.sheet.macroEnabled.main+xml');
  contentType(files, '/xl/vbaProject.bin', 'application/vnd.ms-office.vbaProject');
  appendRelationship(files, 'xl/_rels/workbook.xml.rels', 'omnibusVba', 'http://schemas.microsoft.com/office/2006/relationships/vbaProject', 'vbaProject.bin');

  // The native seed contains ThisWorkbook and one empty Sheet1 document module.
  // Bind those codenames without copying seed paths, UI state, or workbook metadata.
  if (/<workbookPr\b/.test(files['xl/workbook.xml'])) {
    files['xl/workbook.xml'] = files['xl/workbook.xml'].replace(/<workbookPr\b([^>]*?)(\/?)>/, (_, attrs, slash) => `<workbookPr${attrs.replace(/\scodeName="[^"]*"/g, '')} codeName="ThisWorkbook"${slash}>`);
  } else {
    files['xl/workbook.xml'] = files['xl/workbook.xml'].replace('<bookViews>', '<workbookPr codeName="ThisWorkbook"/><bookViews>');
  }
  if (files['xl/worksheets/sheet1.xml']) {
    files['xl/worksheets/sheet1.xml'] = files['xl/worksheets/sheet1.xml'].replace(/<sheetPr\b([^>]*?)(\/?)>/, (_, attrs, slash) => `<sheetPr${attrs.replace(/\scodeName="[^"]*"/g, '')} codeName="Sheet1"${slash}>`);
  }

  const hasPoints = model.sheets.some(sheet => sheet.tables?.some(table => table.name === 'Toetspunten'));
  for (const [index, sheet] of model.sheets.entries()) {
    const isVersion = sheet.tables?.some(table => table.name === 'Versies');
    const isQuestions = Boolean(sheet.questionEntries);
    const buttons = [];
    if (isVersion) buttons.push({ action: 'RegistreerVersie', label: 'Versie registreren', width: 152 });
    if (hasPoints && isQuestions) buttons.push({ action: 'ToonVraag', label: 'Toetspunten bij vraag', width: 170 });
    if (hasPoints && (isVersion || isQuestions)) buttons.push({ action: 'NieuwToetspunt', label: 'Nieuw toetspunt', width: 145 });
    if (!buttons.length) continue;
    // Only the reserved blank first row may host a toolbar. Never cover content.
    if (sheet.rows[0]?.some(value => value !== '' && value !== null && value !== undefined)) continue;
    const sheetPath = `xl/worksheets/sheet${index + 1}.xml`;
    let xml = files[sheetPath];
    if (!xml || /<drawing\b/.test(xml)) continue;
    const drawingName = `omnibusToolbar${index + 1}.xml`;
    files[`xl/drawings/${drawingName}`] = toolbar(buttons);
    contentType(files, `/xl/drawings/${drawingName}`, 'application/vnd.openxmlformats-officedocument.drawing+xml');
    const id = appendRelationship(files, `xl/worksheets/_rels/sheet${index + 1}.xml.rels`, 'omnibusToolbar', `${officeRelationships}/drawing`, `../drawings/${drawingName}`);
    const drawing = `<drawing r:id="${id}"/>`;
    // Worksheet schema requires DrawingML before legacy notes and tableParts.
    if (/<legacyDrawing\b/.test(xml)) xml = xml.replace(/<legacyDrawing\b/, drawing + '<legacyDrawing');
    else if (/<tableParts\b/.test(xml)) xml = xml.replace(/<tableParts\b/, drawing + '<tableParts');
    else xml = xml.replace('</worksheet>', drawing + '</worksheet>');
    sheet.heights[1] = 32;
    files[sheetPath] = giveRowOneSpace(xml);
  }
  return files;
}
