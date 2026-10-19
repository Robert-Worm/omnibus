import template from './excel-template-assets.json' with {type:'json'};
import {exportPalettes,exportPhasePalette,exportTypography,paletteTextColor,mixColor} from './export-design.mjs';

const readingNames=['body','linked','question','norm','section','admin','date',...['opzet','bestaan','werking'].flatMap(a=>[a+'Header',a+'Plan',a+'Evidence',a+'Input']),...['risk','control','source','input'].flatMap(g=>[g+'Header',g+'Body'])];
export const readingStyles=Object.fromEntries(readingNames.map((name,i)=>[name,template.previewStyles.length+i]));

// Keep the reference's borders, input cues and native formats; change only the
// requested palette and typography. Preview and Excel share the same mapping.
export function templateDesign(meta={}) {
 const p=exportPalettes[meta.accent]||exportPalettes.blue,phases=exportPhasePalette(meta.accent),type=exportTypography(meta);
 const colors={'49677D':p.dark,'E7EEF2':p.light,'F4F7F8':p.panel,'245F80':p.ink||p.dark,
  '52788E':phases[0].dark,'527D73':meta.colorMode==='uniform'?p.dark:phases[1].dark,
  '627582':mixColor(p.dark,'414B55',.45),'FBF7EA':mixColor(p.dark,'FFFFFF',.96),
  '86A1B3':mixColor(p.dark,'FFFFFF',.40),'D6E0E6':mixColor(p.dark,'FFFFFF',.70)};
 const map=c=>colors[c]||c;
 let stylesXml=template.stylesXml.replace(/rgb="FF([A-F0-9]{6})"/g,(_,c)=>`rgb="FF${map(c)}"`)
  .replace(/<fonts\b[^>]*>[\s\S]*?<\/fonts>/,block=>block.replace(/<name val="[^"]*"\/>/g,`<name val="${type.fontFamily}"/>`).replace(/<sz val="(\d+)"\/>/g,(_,size)=>`<sz val="${Number(size)+type.fontSize-11}"/>`));
 const fonts=stylesXml.match(/<fonts\b[^>]*>([\s\S]*?)<\/fonts>/)[1].match(/<font>[\s\S]*?<\/font>/g);
 const fills=stylesXml.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/)[1].match(/<fill>[\s\S]*?<\/fill>/g);
 stylesXml=stylesXml.replace(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/,block=>block.replace(/<xf\b[^>]*>[\s\S]*?<\/xf>|<xf\b[^>]*\/>/g,xf=>{
  const fontId=Number(xf.match(/fontId="(\d+)"/)[1]),fillId=Number(xf.match(/fillId="(\d+)"/)[1]),fill=fills[fillId]?.match(/fgColor rgb="FF([A-F0-9]{6})"/)?.[1];
  if(fill&&fonts[fontId].includes('FFFFFFFF')&&paletteTextColor(fill)!=='FFFFFF'){
   const font=fonts[fontId].replace('FFFFFFFF','FF'+paletteTextColor(fill));let id=fonts.indexOf(font);if(id<0){id=fonts.length;fonts.push(font);}return xf.replace(/fontId="\d+"/,`fontId="${id}"`);
  }return xf;
 }));
 stylesXml=stylesXml.replace(/<fonts\b[^>]*>[\s\S]*?<\/fonts>/,`<fonts count="${fonts.length}">${fonts.join('')}</fonts>`);
 const previewStyles=template.previewStyles.map(s=>({...s,fill:map(s.fill),color:s.color==='FFFFFF'?paletteTextColor(map(s.fill)):map(s.color),fontFamily:type.fontFamily}));
 // Shared readable cells: visible borders and restrained, matching phase tints.
 const append=(tag,items)=>{let start;stylesXml=stylesXml.replace(new RegExp(`<${tag} count="(\\d+)">([\\s\\S]*?)<\\/${tag}>`),(_,n,body)=>{start=Number(n);return `<${tag} count="${Number(n)+items.length}">${body}${items.join('')}</${tag}>`;});return start;};
 // Even near-white palettes need a visible grid; keep a muted accent in it.
 const border=mixColor(mixColor(p.dark,'414B55',.65),'FFFFFF',.40);
 const borderId=append('borders',[`<border>${['left','right','top','bottom'].map(edge=>`<${edge} style="thin"><color rgb="FF${border}"/></${edge}>`).join('')}<diagonal/></border>`]);
 const xfs=[];
 for(const name of readingNames){
  const phase=['opzet','bestaan','werking'].find(a=>name.startsWith(a)),index=['opzet','bestaan','werking'].indexOf(phase),group=['risk','control','source','input'].find(g=>name.startsWith(g));
  const groupColor=group&&meta.colorMode!=='uniform'?mixColor(p.dark,group==='control'||group==='input'?'202832':'FFFFFF',group==='source'?.18:.10):p.dark;
  const color=phase?(meta.colorMode==='uniform'?p.dark:phases[index].dark):groupColor;
  const isHeader=name.endsWith('Header')||name==='section';
  const fill=isHeader?color:group?mixColor(mixColor(color,'414B55',.20),'FFFFFF',group==='input'?.975:group==='source'?.97:.94):name==='norm'||name==='question'?mixColor(p.dark,'FFFFFF',.89):name.endsWith('Plan')?mixColor(color,'FFFFFF',.91):name.endsWith('Evidence')?mixColor(color,'FFFFFF',.96):name.endsWith('Input')||name==='admin'||name==='date'?mixColor(color,'FFFFFF',.975):'FFFFFF';
  const ink=isHeader?paletteTextColor(fill):name==='linked'?(p.ink||mixColor(p.dark,'202832',.4)):'243640';
  const fontId=append('fonts',[`<font><sz val="${type.fontSize}"/><color rgb="FF${ink}"/><name val="${type.fontFamily}"/>${isHeader||name==='norm'?'<b/>':''}</font>`]);
  const fillId=append('fills',[`<fill><patternFill patternType="solid"><fgColor rgb="FF${fill}"/><bgColor indexed="64"/></patternFill></fill>`]);
  xfs.push(`<xf numFmtId="${name==='date'?14:0}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment vertical="top" wrapText="1"/></xf>`);
  previewStyles.push({fill,color:ink,fontFamily:type.fontFamily,border});
 }
 append('cellXfs',xfs);
 return {stylesXml,previewStyles};
}
