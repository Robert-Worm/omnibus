// Call only after an explicit download action. The browser owns the chosen file.
export function download(content, name, mime) {
  const url = URL.createObjectURL(new Blob([content], {type:mime}));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
