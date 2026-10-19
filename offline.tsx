import React from 'react';
import {createRoot} from 'react-dom/client';
import FrameworkEditor from './app/framework-editor';
import './app/globals.css';
import './app/workflow-polish.css';
import './app/rijksmap-fonts.css';
import './app/rijksmap-theme.css';
import './app/appearance.css';
import './app/collection-layout.css';
// Last, so phone-only overrides win ties. All rules are inside a max-width query.
import './app/mobile.css';
try {
  const saved = localStorage.getItem('omnibus-appearance');
  document.documentElement.dataset.appearance = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
} catch { document.documentElement.dataset.appearance = 'light'; }
const container = document.getElementById('root')!;
// The packaged HTML paints a static loading shell before this bundle runs.
// Remove it explicitly so the editor never mounts alongside it.
container.querySelector('#startup-shell')?.remove();
createRoot(container).render(<React.StrictMode><FrameworkEditor/></React.StrictMode>);
