// Fast structure checks complement the browser checks; these do not prove layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const editor = read('framework-editor.tsx');
const header = editor.slice(editor.indexOf('<header className="brand-bar">'), editor.indexOf('</header>'));
const group = label => {
  const start = header.indexOf(`aria-label="${label}"`);
  assert(start >= 0, `Missing group: ${label}`);
  return header.slice(start, header.indexOf('</fieldset>', start));
};

test('Omnibus branding keeps one header wordmark and the version in the footer', () => {
  assert.match(header, /aria-label="Omnibus — kies onderzoeksroute"/);
  assert.match(header, /<BookOpen[^>]*aria-hidden="true"/);
  assert.match(header, /<strong>Omnibus<\/strong>/);
  assert.doesNotMatch(header, /product-identity|PRODUCT_VERSION|PRODUCT_NAME|Rijksmap/);
  const footer = read('product-footer.tsx');
  assert.match(footer, /className="product-footer-wordmark" href="#begin">Omnibus<\/a>/);
  assert.match(footer, /Versie \{PRODUCT_VERSION\}/);
  assert.doesNotMatch(footer, /Onderdeel van Rijksmap|Deze lokale versie|databaseproef|geen online productieomgeving/);
  assert.match(footer, /ook bij online gebruik/);
  assert.match(footer, /niet automatisch in de online database opgeslagen/);
  assert.match(footer, /Sliplane/);
  assert.match(footer, /herstelkopieën en oude projectgegevens niet/);
  assert.match(read('../database.html'), /<title>Omnibus<\/title>/);
});

test('project controls keep lifecycle and native keyboard order', () => {
  const labels = ['Project starten en openen', 'Project bewaren en delen', 'Project herstellen', 'AI, hulp en weergave'];
  const offsets = labels.map(label => header.indexOf(`aria-label="${label}"`));
  assert(offsets.every(offset => offset >= 0));
  assert.deepEqual(offsets, [...offsets].sort((a,b)=>a-b));
  const start = group(labels[0]);
  assert(start.indexOf('Nieuw project') < start.indexOf('Open project'));
  assert.match(start, /initialFocus=\{cancelNewProjectRef\}/);
  assert.match(start, /onClick=\{startNewProject\}/);
  const save = group(labels[1]);
  assert(save.indexOf('Bewaar project') < save.indexOf('<ShareProject'));
  assert(save.indexOf('<ShareProject') < save.indexOf('project-save-indicator'));
  assert.match(save, /onClick=\{openStorageHelp\}/);
  assert.match(header, /recovery\.length>0 && <fieldset/);
  assert.doesNotMatch(header, /role="toolbar"|tabIndex=\{?[1-9]/);
});

test('AI has a visible label and appearance follows help', () => {
  const utilities = group('AI, hulp en weergave');
  assert(utilities.indexOf('<AiConnection') < utilities.indexOf('<WorkflowHelp'));
  assert(utilities.indexOf('<WorkflowHelp') < utilities.indexOf('<AppearanceToggle'));
  assert.doesNotMatch(utilities, /project-save-indicator/);
  const ai = read('ai-connection.tsx');
  assert.match(ai, /<\/?Bot\b[^>]*\/>AI koppelen<\/DialogTrigger>/);
  assert.doesNotMatch(ai, /className="appearance-toggle/);
});

test('storage state retains text announcements and all three states', () => {
  const save = group('Project bewaren en delen');
  for (const text of ['unsaved', 'saved', 'loading', 'Niet automatisch opgeslagen',
    'Lokaal opgeslagen', 'Projectopslag wordt geladen', '<output className="sr-only">'])
    assert(save.includes(text), text);
  assert.match(save, /disabled=\{!loaded \|\| !modelsReady\}/);
});

test('destructive recovery actions wait for an explicit backup download to finish',()=>{
  assert.match(editor,/disabled=\{fileDownload\.busy\} onClick=\{startNewProject\}/);
  assert.match(editor,/disabled=\{fileDownload\.busy\} onClick=\{\(\)=>window\.location\.reload\(\)\}/);
  assert.match(editor,/disabled=\{fileDownload\.busy \|\| !backupConfirmed \|\| !resumeStoreRef\.current\}/);
});
