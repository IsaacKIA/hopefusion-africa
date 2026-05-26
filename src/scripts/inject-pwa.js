import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

console.log('Starting PWA tags & Service Worker registration injection...');

for (const file of files) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip index.html router file
  if (file === 'index.html') {
    continue;
  }

  let modified = false;

  // 1. Inject manifest & mobile-capable metadata in <head>
  if (!content.includes('href="/manifest.json"')) {
    const pwaTags = `
<link rel="manifest" href="/manifest.json"/>
<meta name="theme-color" content="#2DB562"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-title" content="HopeFusion"/>
<link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
`;
    content = content.replace('</head>', `${pwaTags}</head>`);
    modified = true;
  }

  // 2. Register Service Worker on the homepage
  if (file === 'hopefusion-homepage.html' && !content.includes("navigator.serviceWorker.register('/sw.js')")) {
    const swRegistration = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(r => console.log('[HFA] Service worker registered:', r.scope))
      .catch(e => console.error('[HFA] SW registration failed:', e));
  });
}
</script>
`;
    content = content.replace('</body>', `${swRegistration}</body>`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[✔] Injected PWA tags into: public/${file}`);
  } else {
    console.log(`[-] Already PWA configured: public/${file}`);
  }
}

console.log('PWA injection complete.');
