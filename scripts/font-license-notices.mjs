// CSS minification removes comments; redistribution notices belong in each
// delivered HTML as well as the original font stylesheet.
export function fontLicenseNotices(css) {
  return [...css.matchAll(/\/\*!([\s\S]*?)\*\//g)]
    .map(match => textLicenseNotice('Font license',match[1])).join('\n');
}

// Preserve redistribution notices even when the CSS minifier strips comments.
export function textLicenseNotice(label,text) {
  return '<!-- '+label.replaceAll('--','—')+'\n'+text.replaceAll('--','—')+'\n-->';
}
