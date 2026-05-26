import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

console.log('Starting i18n script and switcher injection across HTML files...');

for (const file of files) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip files that don't need translation (e.g. offline fallback, redirect template files)
  if (file === 'offline.html' || file === 'index.html') {
    continue;
  }

  let modified = false;

  // 1. Inject i18n script tag in <head>
  if (!content.includes('hopefusion-i18n.js')) {
    content = content.replace('</head>', '<script src="/hopefusion-i18n.js" type="module"></script>\n</head>');
    modified = true;
  }

  // 2. Inject language switcher div
  if (!content.includes('id="lang-switcher"')) {
    if (file === 'hopefusion-homepage.html') {
      content = content.replace(
        '<div class="nav-right">',
        '<div class="nav-right">\n    <div id="lang-switcher" style="margin-right:12px"></div>'
      );
      modified = true;
    } else if (file === 'hopefusion-register.html') {
      content = content.replace(
        '<a class="nav-back"',
        '<div id="lang-switcher" style="margin-right:16px; margin-left:auto"></div>\n  <a class="nav-back"'
      );
      modified = true;
    } else {
      // For all dashboard files containing .topbar-right
      if (content.includes('class="topbar-right"')) {
        content = content.replace(
          '<div class="topbar-right">',
          '<div class="topbar-right">\n      <div id="lang-switcher" style="margin-right:12px"></div>'
        );
        modified = true;
      }
    }
  }

  // 3. Inject bootstrapper call before </body>
  if (!content.includes("hfai18n.createSwitcher('lang-switcher')")) {
    const loaderCode = `
<script>
  window.addEventListener('load', () => {
    if (window.hfai18n) {
      window.hfai18n.createSwitcher('lang-switcher');
    }
  });
</script>
`;
    content = content.replace('</body>', `${loaderCode}</body>`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[✔] Injected i18n switcher & scripts into: public/${file}`);
  } else {
    console.log(`[-] Already configured: public/${file}`);
  }
}

console.log('i18n switcher injection completed.');
