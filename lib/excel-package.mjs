// Browser-only OOXML transport. Text stays literal; desktop VBA is an explicit package variant.
import { columnName, workbookStyles } from "./excel-workbook-styles.mjs";
import {excelCellTextLimit} from './excel-detail-text.mjs';
const encoder = new TextEncoder();
const xml = (s) =>
  String(s ?? "")
    // XML 1.0 disallows these control characters in text nodes.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const crcTable = Array.from({ length: 256 }, (_, i) => {
  for (let k = 0; k < 8; k++) i = i & 1 ? 0xedb88320 ^ (i >>> 1) : i >>> 1;
  return i >>> 0;
});
function crc(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bytes(size, values) {
  const a = new Uint8Array(size),
    v = new DataView(a.buffer);
  for (const [offset, value, width] of values) {
    if (width === 2) v.setUint16(offset, value, true);
    else v.setUint32(offset, value, true);
  }
  return a;
}
function concat(parts) {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    result.set(p, o);
    o += p.length;
  }
  return result;
}
export function zipStored(files) {
  const local = [],
    central = [];
  let offset = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = encoder.encode(path),
      data = content instanceof Uint8Array ? content : encoder.encode(content),
      check = crc(data);
    const h = bytes(30, [
      [0, 0x04034b50, 4],
      [4, 20, 2],
      [6, 0x800, 2],
      [12, 33, 2],
      [14, check, 4],
      [18, data.length, 4],
      [22, data.length, 4],
      [26, name.length, 2],
    ]);
    local.push(h, name, data);
    central.push(
      bytes(46, [
        [0, 0x02014b50, 4],
        [4, 20, 2],
        [6, 20, 2],
        [8, 0x800, 2],
        [14, 33, 2],
        [16, check, 4],
        [20, data.length, 4],
        [24, data.length, 4],
        [28, name.length, 2],
        [42, offset, 4],
      ]),
      name,
    );
    offset += h.length + name.length + data.length;
  }
  const directory = concat(central),
    n = Object.keys(files).length;
  return concat([
    ...local,
    directory,
    bytes(22, [
      [0, 0x06054b50, 4],
      [8, n, 2],
      [10, n, 2],
      [12, directory.length, 4],
      [16, offset, 4],
    ]),
  ]);
}
const stylesXml = (exportStyles) =>
  head +
  '<styleSheet xmlns="' +
  ns +
  '"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd-mm-yyyy"/></numFmts><fonts count="' +
  exportStyles.length +
  '">' +
  exportStyles
    .map(
      (s) =>
        "<font>" +
        (s.bold ? "<b/>" : "") +
        '<sz val="' +
        (s.size || 11) +
        '"/><color rgb="FF' +
        s.color +
        '"/><name val="' + xml(s.fontFamily || 'Arial') + '"/></font>',
    )
    .join("") +
  '</fonts><fills count="' +
  (exportStyles.length + 2) +
  '"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  exportStyles
    .map(
      (s) =>
        '<fill><patternFill patternType="solid"><fgColor rgb="FF' +
        s.fill +
        '"/><bgColor indexed="64"/></patternFill></fill>',
    )
    .join("") +
  '</fills><borders count="2"><border/><border><bottom style="thin"><color rgb="FFD4DFEA"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' +
  exportStyles.length +
  '">' +
  exportStyles
    .map(
      (s, i) =>
        '<xf numFmtId="' +
        (s.date ? 164 : s.text ? 49 : 0) +
        '" fontId="' +
        i +
        '" fillId="' +
        (i + 2) +
        '" borderId="' +
        (i === 1 || (i >= 7 && i <= 16) ? 1 : 0) +
        '" xfId="0" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>',
    )
    .join("") +
  // Table styling must not override the deliberately different header cell styles.
  // Explicit matching fill colors also avoid an automatic background on inserted rows.
  `</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="1"><dxf><fill><patternFill patternType="solid"><fgColor rgb="FF${exportStyles[17].fill}"/><bgColor rgb="FF${exportStyles[17].fill}"/></patternFill></fill></dxf></dxfs><tableStyles count="1" defaultTableStyle="Omnibus"><tableStyle name="Omnibus" pivot="0" table="1" count="1"><tableStyleElement type="firstRowStripe" size="1" dxfId="0"/></tableStyle></tableStyles></styleSheet>`;
function cell(value, row, col, style, templateStyles=false, sheetName='') {
  if (style === 0 && !templateStyles) style = 20;
  const ref = columnName(col) + row;
  const text=value && typeof value === 'object' && 'formula' in value ? value.value : value;
  if (typeof text === 'string' && text.length > excelCellTextLimit)
    throw new Error(`Excel-cel ${sheetName}!${ref} bevat meer dan 32.767 tekens. Verdeel deze tekst over meerdere cellen.`);
  if (value instanceof Date)
    return `<c r="${ref}" s="${templateStyles ? style : 6}"><v>${value.getTime() / 86400000 + 25569}</v></c>`;
  if (value && typeof value === "object" && "formula" in value)
    return `<c r="${ref}" s="${style}"${typeof value.value === "number" ? '' : ' t="str"'}><f>${xml(value.formula)}</f><v>${xml(value.value ?? '')}</v></c>`;
  if (typeof value === "number") return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
function sheetXml(sheet) {
  const last = columnName(sheet.widths.length - 1),
    end = sheet.rows.length;
  const rows = sheet.rows.map(
    (values, i) =>
      '<row r="' +
      (i + 1) +
      '" ht="' +
      sheet.heights[i + 1] +
      '" customHeight="1"' + (sheet.hiddenRows?.includes(i+1) ? ' hidden="1"' : '') + (sheet.outlineRows?.[i+1] ? ' outlineLevel="'+sheet.outlineRows[i+1]+'"' : '') + '>' +
      values
        .map((v, j) =>
          cell(v, i + 1, j, sheet.cellStyles?.[i + 1]?.[j] ?? sheet.rowStyles[i + 1] ?? 0, sheet.templateStyles, sheet.name),
        )
        .join("") +
      "</row>",
  );
  const pane = sheet.freeze
    ? '<pane ySplit="' +
      sheet.freeze +
      '" ' +
      (sheet.freezeColumns ? 'xSplit="' + sheet.freezeColumns + '" ' : "") +
      'topLeftCell="' +
      columnName(sheet.freezeColumns ?? 0) +
      (sheet.freeze + 1) +
      '" activePane="' +
      (sheet.freezeColumns ? "bottomRight" : "bottomLeft") +
      '" state="frozen"/>'
    : "";
  const validation = (sheet.validations ?? []).length
    ? '<dataValidations count="' +
      sheet.validations.length +
      '">' +
      sheet.validations
        .map(
          (v) =>
            '<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Kies een waarde" error="Gebruik een waarde uit de keuzelijst." sqref="' +
            v.range +
            '"><formula1>' +
            xml(v.formula) +
            "</formula1></dataValidation>",
        )
        .join("") +
      "</dataValidations>"
    : "";
  return (
    head +
    '<worksheet xmlns="' +
    ns +
    '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr>' + (sheet.tabColor ? '<tabColor rgb="FF'+sheet.tabColor+'"/>' : '') + (sheet.outlineSummaryBelow===false ? '<outlinePr summaryBelow="0" summaryRight="1"/>' : '') + '<pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:' +
    last +
    end +
    '"/><sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="' + (sheet.zoom || 100) + '">' +
    pane +
    '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"'+(sheet.outlineRows ? ' outlineLevelRow="2"' : '')+'/><cols>' +
    sheet.widths
      .map(
        (w, i) =>
          '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"' + (sheet.hiddenColumns?.includes(i) ? ' hidden="1"' : '') + '/>',
      )
      .join("") +
    "</cols><sheetData>" +
    rows.join("") +
    "</sheetData>" +
    (sheet.filter ? '<autoFilter ref="' + sheet.filter + '"/>' : "") +
    (sheet.merges.length
      ? '<mergeCells count="' +
        sheet.merges.length +
        '">' +
        sheet.merges.map((ref) => '<mergeCell ref="' + ref + '"/>').join("") +
        "</mergeCells>"
      : "") +
    (sheet.conditionalFormats||[]).map((cf,i)=>`<conditionalFormatting sqref="${cf.range}">${cf.rules.map((r,j)=>`<cfRule type="expression" dxfId="${r.dxfId}" priority="${i*10+j+1}"><formula>${xml(r.formula)}</formula></cfRule>`).join('')}</conditionalFormatting>`).join('') +
    validation +
    (sheet.hyperlinks?.length ? '<hyperlinks>' + sheet.hyperlinks.map((h,i) =>
      h.target ? (/^https?:\/\//i.test(h.target) ? `<hyperlink ref="${xml(h.ref)}" r:id="link${i+1}" tooltip="${xml(h.tooltip)}"/>` : '') :
      `<hyperlink ref="${xml(h.ref)}" location="${xml(h.location)}" tooltip="${xml(h.tooltip)}"/>`).join('') + '</hyperlinks>' : '') +
    '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="8" orientation="landscape" scale="100" fitToWidth="0" fitToHeight="0"/>' +
    (sheet.notes?.length ? '<legacyDrawing r:id="notesDrawing"/>' : '') +
    (sheet.tables?.length ? `<tableParts count="${sheet.tables.length}">${sheet.tables.map((_,i)=>`<tablePart r:id="table${i+1}"/>`).join('')}</tableParts>` : '') + '</worksheet>'
  );
}
export function workbookPackage(model) {
  // Native calculated table column: labels follow renames, sorting and new rows.
  // Keep this technical column out of the application preview and visible layout.
  model={...model,sheets:model.sheets.map(s=>{
    if(!s.lookupChoices) return s;
    const c=s.widths.length, config=s.lookupChoices;
    const calc=`IF([[#This Row],[${config.idHeader}]]="","",[[#This Row],[${config.idHeader}]]&" · "&[[#This Row],[${config.titleHeader}]])`;
    const end=Number(s.tables[0].ref.match(/\d+$/)[0]);
    return {...s,widths:[...s.widths,75],hiddenColumns:[...(s.hiddenColumns||[]),c],
      rows:s.rows.map((r,i)=>[...r,i===4?'Keuzenaam':i>=5&&i<end?{formula:calc.replaceAll(`[[#This Row],[${config.idHeader}]]`,`A${i+1}`).replaceAll(`[[#This Row],[${config.titleHeader}]]`,`${config.titleColumn}${i+1}`),value:r[0]?`${r[0]} · ${r[config.titleIndex]}`:''}:'']),
      tables:s.tables.map((t,i)=>i? t:{...t,ref:t.ref.replace(/:[A-Z]+/,':'+columnName(c)),calculatedColumns:{...t.calculatedColumns,[c]:calc}})};
  })};
  const files = {};
  files["[Content_Types].xml"] =
    head +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${model.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  files["_rels/.rels"] =
    head +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  files["xl/workbook.xml"] =
    head +
    `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${model.sheets.map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${model.sheets.map((s, i) => `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${s.name}'!$1:${s.headerRow || 5}</definedName>`).join("")}${model.sheets.map((s,i)=>s.printArea?`<definedName name="_xlnm.Print_Area" localSheetId="${i}">\'${xml(s.name)}\'!${s.printArea}</definedName>`:"").join("")}${(model.definedNames ?? []).map((n) => `<definedName name="${xml(n.name)}">${xml(n.formula)}</definedName>`).join("")}</definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  files["xl/_rels/workbook.xml.rels"] =
    head +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${model.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  files["xl/styles.xml"] = model.stylesXml || stylesXml(workbookStyles(model.meta));
  if(model.evidence){
    files['customXml/item1.xml']=head+`<evidence xmlns="urn:project-omnibus:source-evidence:v1">${xml(JSON.stringify(model.evidence))}</evidence>`;
    files['xl/_rels/workbook.xml.rels']=files['xl/_rels/workbook.xml.rels'].replace('</Relationships>','<Relationship Id="sourceEvidence" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/></Relationships>');
  }
  if(model.applicability?.length){
    files['customXml/item2.xml']=head+`<applicability xmlns="urn:project-omnibus:applicability:v1">${xml(JSON.stringify(model.applicability))}</applicability>`;
    files['xl/_rels/workbook.xml.rels']=files['xl/_rels/workbook.xml.rels'].replace('</Relationships>','<Relationship Id="savedApplicability" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item2.xml"/></Relationships>');
  }
  let tableId=0;
  model.sheets.forEach((s,i)=> {
    files[`xl/worksheets/sheet${i+1}.xml`]=sheetXml(s);
    const rels=[];
    for(const [j,h] of (s.hyperlinks??[]).entries())if(/^https?:\/\//i.test(h.target||''))
      rels.push(`<Relationship Id="link${j+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(h.target)}" TargetMode="External"/>`);
    for(const [tIndex,t] of (s.tables??[]).entries()) {
      const id=++tableId, start=t.ref.split(':')[0], headerRow=Number(start.match(/\d+/)[0]), end=t.ref.split(':')[1];
      const endCol=end.match(/[A-Z]+/)[0].split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
      const startCol=start.match(/[A-Z]+/)[0].split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
      const headers=s.rows[headerRow-1].slice(startCol,endCol);
      if(headers.some(h=>!h) || new Set(headers).size!==headers.length) throw new Error('Excel-tabel bevat ongeldige kolomkoppen: '+t.name);
      files[`xl/tables/table${id}.xml`]=head+`<table xmlns="${ns}" id="${id}" name="${xml(t.name)}" displayName="${xml(t.name)}" ref="${t.ref}" totalsRowShown="0"><autoFilter ref="${t.ref}">${t.hideFilters?headers.map((_,c)=>`<filterColumn colId="${c}" hiddenButton="1"/>`).join(''):''}</autoFilter><tableColumns count="${headers.length}">${headers.map((h,c)=>`<tableColumn id="${c+1}" name="${xml(h)}">${t.calculatedColumns?.[c]?`<calculatedColumnFormula>${xml(t.calculatedColumns[c])}</calculatedColumnFormula>`:''}</tableColumn>`).join('')}</tableColumns><tableStyleInfo name="${t.style || 'Omnibus'}" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;
      rels.push(`<Relationship Id="table${tIndex+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${id}.xml"/>`);
      files['[Content_Types].xml']=files['[Content_Types].xml'].replace('</Types>',`<Override PartName="/xl/tables/table${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>`);
    }
    if(s.notes?.length) {
      files[`xl/comments${i+1}.xml`]=head+`<comments xmlns="${ns}"><authors><author>Project Omnibus</author></authors><commentList>${s.notes.map(n=>`<comment ref="${xml(n.ref)}" authorId="0"><text><t xml:space="preserve">${xml(n.text)}</t></text></comment>`).join('')}</commentList></comments>`;
      files[`xl/drawings/notes${i+1}.vml`]=`<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout><v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>${s.notes.map((n,j)=>{const r=Number(n.ref.match(/\d+/)[0])-1,c=n.ref.match(/[A-Z]+/)[0].split('').reduce((a,v)=>a*26+v.charCodeAt(0)-64,0)-1;return `<v:shape id="_x0000_s${1025+j}" type="#_x0000_t202" style="position:absolute;width:340pt;height:180pt;visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto"><v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:left"/></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:AutoFill>False</x:AutoFill><x:Row>${r}</x:Row><x:Column>${c}</x:Column></x:ClientData></v:shape>`;}).join('')}</xml>`;
      rels.push(`<Relationship Id="notes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments${i+1}.xml"/>`,`<Relationship Id="notesDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/notes${i+1}.vml"/>`);
      files['[Content_Types].xml']=files['[Content_Types].xml'].replace('</Types>',`<Override PartName="/xl/comments${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/></Types>`);
      if(!files['[Content_Types].xml'].includes('Extension="vml"')) files['[Content_Types].xml']=files['[Content_Types].xml'].replace('</Types>','<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/></Types>');
    }
    if(rels.length) files[`xl/worksheets/_rels/sheet${i+1}.xml.rels`]=head+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`;
  });
  return files;
}
