import React from 'react';
import {createRoot} from 'react-dom/client';
import './app/styles';
import FrameworkEditor from './app/framework-editor';
import {trustStableInputs} from './lib/stable-inputs.mjs';
try {
  const saved = localStorage.getItem('omnibus-appearance');
  document.documentElement.dataset.appearance = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
} catch { document.documentElement.dataset.appearance = 'light'; }
const container = document.getElementById('root')!;
// The packaged HTML paints a static loading shell before this bundle runs.
// Remove it explicitly so the editor never mounts alongside it.
container.querySelector('#startup-shell')?.remove();
// De webapp vervangt projectgegevens altijd door nieuwe objecten; daarom mogen controles per object onthouden worden.
trustStableInputs();
createRoot(container).render(<React.StrictMode><FrameworkEditor/></React.StrictMode>);
