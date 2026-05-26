import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load variables from .env
dotenv.config();

const publicDir = path.resolve('public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

console.log('Starting production HFA_CONFIG injection across HTML files...');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AI_URL = process.env.AI_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';
const ENV = process.env.NODE_ENV || 'production';

const configBlock = `<!-- HFA_CONFIG_START -->
<script>
  window.HFA_CONFIG = {
    API_URL: "${API_URL}",
    AI_URL: "${AI_URL}",
    WS_URL: "${WS_URL}",
    ENV: "${ENV}"
  };
</script>
<!-- HFA_CONFIG_END -->`;

for (const file of files) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip redirect container index.html if it doesn't need API config, but let's check
  if (file === 'index.html') {
    continue;
  }

  let modified = false;
  const startTag = '<!-- HFA_CONFIG_START -->';
  const endTag = '<!-- HFA_CONFIG_END -->';

  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag);

  if (startIndex !== -1 && endIndex !== -1) {
    // Already has config block, replace it
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex + endTag.length);
    content = before + configBlock + after;
    modified = true;
    console.log(`[✔] Updated HFA_CONFIG in: public/${file}`);
  } else {
    // Inject at the top of <head>
    if (content.includes('<head>')) {
      content = content.replace('<head>', `<head>\n${configBlock}`);
      modified = true;
      console.log(`[✔] Injected HFA_CONFIG into: public/${file}`);
    } else {
      console.warn(`[!] Skipping public/${file}: <head> tag not found`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log('Production HFA_CONFIG injection completed successfully.');
