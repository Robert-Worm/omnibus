// Shared, bounded design choices for every export route.
export const exportFonts = ['Arial', 'Calibri'];
export const exportFontSizes = [10, 11, 12];
export const exportPalettes = {
  'audit-vaandel': {label:'Vaandelblauw',dark:'154273',light:'DDEFF8',stripe:'F3F3F3',panel:'DDEFF8',audit:true},
  'audit-donkerblauw': {label:'Donkerblauw',dark:'01689B',light:'DDEFF8',stripe:'F3F3F3',panel:'DDEFF8',audit:true},
  'audit-hemelblauw': {label:'Hemelblauw',dark:'007BC7',light:'DDEFF8',stripe:'F3F3F3',panel:'DDEFF8',ink:'154273',audit:true},
  'audit-lichtblauw': {label:'Lichtblauw',dark:'8FCAE7',light:'DDEFF8',stripe:'F3F3F3',panel:'DDEFF8',ink:'154273',audit:true},
  'audit-robijnrood': {label:'Robijnrood',dark:'CA005D',light:'F9E6EF',stripe:'F3F3F3',panel:'F9E6EF',audit:true},
  'audit-paars': {label:'Paars',dark:'42145F',light:'EFE7F3',stripe:'F3F3F3',panel:'EFE7F3',audit:true},
  'audit-oranje': {label:'Oranje',dark:'E17000',light:'FBECDD',stripe:'F3F3F3',panel:'FBECDD',ink:'24364B',audit:true},
  'audit-lichterblauw': {label:'Lichter blauw',dark:'DDEFF8',light:'F3F3F3',stripe:'F3F3F3',panel:'DDEFF8',ink:'154273',audit:true},
  'audit-achtergrond': {label:'Achtergrondkleur',dark:'F3F3F3',light:'FFFFFF',stripe:'F3F3F3',panel:'F3F3F3',ink:'535353',audit:true},
  'audit-donkergrijs': {label:'Donkergrijs',dark:'535353',light:'F3F3F3',stripe:'F3F3F3',panel:'F3F3F3',audit:true},
  'audit-middengrijs': {label:'Middengrijs',dark:'999999',light:'F3F3F3',stripe:'F3F3F3',panel:'F3F3F3',ink:'24364B',audit:true},
  'audit-lichtgrijs': {label:'Lichtgrijs',dark:'CCCCCC',light:'F3F3F3',stripe:'F3F3F3',panel:'F3F3F3',ink:'535353',audit:true},
  blue: {label:'Blauw', dark:'234F7C', light:'DCE8F2', stripe:'EAF0F6', panel:'EDF3F9'},
  green: {label:'Groen', dark:'286257', light:'E2EFE8', stripe:'EDF5F1', panel:'E8F2ED'},
  slate: {label:'Grijsblauw', dark:'46566A', light:'E9EDF0', stripe:'EFF2F5', panel:'E8EDF2'},
  ocean: {label:'Oceaan', dark:'176B9A', light:'D9EDF7', stripe:'EFF7FB', panel:'E8F4FA'},
  teal: {label:'Petrol', dark:'087B76', light:'D6EFEB', stripe:'EDF8F6', panel:'E3F4F0'},
  plum: {label:'Paars', dark:'7656A4', light:'E9DFF5', stripe:'F5F0FA', panel:'EEE7F7'},
};
export function paletteTextColor(fill) {
  const rgb=fill.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return 1.05/(rgb.reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)+.05)>=4.5 ? 'FFFFFF' : '000000';
}
export function mixColor(base, companion, amount) {
  return base.match(/../g).map((v,i)=>Math.round(parseInt(v,16)*(1-amount)+parseInt(companion.slice(i*2,i*2+2),16)*amount).toString(16).padStart(2,'0')).join('').toUpperCase();
}
// One coherent workbook palette: exact chosen accent plus restrained companion hues.
// Phase labels remain the primary distinction; colours are never the only identifier.
export function exportPhasePalette(accent) {
  const base = Object.hasOwn(exportPalettes,accent) ? exportPalettes[accent] : exportPalettes.blue;
  return [{dark:base.dark,light:base.light},...[0,1,2,3].map(i=>{
    // Related shades, not competing hues (especially red/green combinations).
    const dark=mixColor(base.dark,i%2?'202832':'FFFFFF',i%2?.22:.18);
    return {dark,light:mixColor(dark,'FFFFFF',.90)};
  })];
}
export function exportTypography(meta = {}) {
  return {fontFamily:exportFonts.includes(meta.fontFamily) ? meta.fontFamily : 'Arial',
    fontSize:exportFontSizes.includes(meta.fontSize) ? meta.fontSize : 11};
}
// Keep a chosen base name independent of version and workform; strip unsafe path characters.
export function exportFilename(base, profile, version, extension = 'xlsx') {
  const name = String(base ?? '').replace(/\.(xlsx|xlsm|md)$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().replace(/[. ]+$/g, '').slice(0, 100) || 'Referentiekader';
  const safeVersion = String(version ?? '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40) || '0.1';
  return `${name}-${['testing','risk','interview'].includes(profile) ? profile : 'testing'}-v${safeVersion}.${extension === 'md' ? 'md' : 'xlsx'}`;
}
export function fitExportTypography(model) {
  const {fontSize}=exportTypography(model.meta);
  // Widths are Excel character units. Reserve extra vertical space at larger sizes
  // for both the line height and less favourable font/wrap metrics.
  const factor=fontSize > 11 ? (fontSize/11)**2 : 1;
  if(factor!==1)for(const sheet of model.sheets)for(const [r,height] of Object.entries(sheet.heights))
    sheet.heights[r]=Math.min(409,Math.ceil(height*factor));
  return model;
}
