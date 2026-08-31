const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk('.');
const iconLink = /<link[^>]*fonts\.googleapis\.com\/icon[^>]*>/;
const css2Link = /<link[^>]*fonts\.googleapis\.com\/css2[^>]*>/;
const preconnect = /<link[^>]*fonts\.gstatic\.com[^>]*>/;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const isRoot = path.dirname(file) === '.';
  const fontPath = isRoot ? 'assets/fonts/material-symbols-rounded.woff2' : '../assets/fonts/material-symbols-rounded.woff2';

  html = html.replace(iconLink, '');
  html = html.replace(css2Link, '');
  html = html.replace(preconnect, '');

  const face = `<style>
@font-face {
  font-family: 'Material Symbols Rounded';
  font-style: normal;
  font-weight: 100 700;
  font-display: swap;
  src: url('${fontPath}') format('woff2');
}
.material-symbols-rounded {
  font-family: 'Material Symbols Rounded';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>`;
  html = html.replace('<head>', `<head>\n${face}`);

  fs.writeFileSync(file, html);
  console.log('OK', file, '=>', fontPath);
}
