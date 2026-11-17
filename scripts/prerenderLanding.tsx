import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFile, writeFile } from 'node:fs/promises';
import HowItWorks from '../src/components/landing/HowItWorks';

const path = new URL('../dist/index.html', import.meta.url);
const html = await readFile(path, 'utf8');
const marker = '<!--prerender:landing-->';
if (!html.includes(marker)) throw new Error('Missing landing prerender marker');
// Match LandingContent's initial wrapper exactly for React hydration.
const content = renderToString(<div><HowItWorks /></div>);
await writeFile(path, html.replace(marker, content));
console.log('Prerendered homepage explanation, FAQ, and footer.');
