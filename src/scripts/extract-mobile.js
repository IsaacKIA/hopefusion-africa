import fs from 'fs';
import path from 'path';
import mobileData from '../../mobile/mobile-source.js';

const mobileDir = path.resolve('mobile');

const fileMap = {
  'App.js': mobileData.AppJs,
  'app.json': mobileData.AppJson,
  'package.json': mobileData.MobilePackageJson,
  'src/context/AuthContext.js': mobileData.AuthContextJs,
  'src/services/api.js': mobileData.ApiServiceJs,
  'src/services/notifications.js': mobileData.NotificationsServiceJs,
  'src/screens/dashboard/DashboardScreen.js': mobileData.DashboardScreenJs,
  'src/screens/matches/MatchesScreen.js': mobileData.MatchesScreenJs,
};

console.log('Extracting HopeFusion mobile files...');

for (const [relPath, content] of Object.entries(fileMap)) {
  if (!content) {
    console.error(`Error: Content for ${relPath} is undefined.`);
    continue;
  }
  const fullPath = path.join(mobileDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[✔] Extracted: mobile/${relPath}`);
}

console.log('Mobile extraction complete.');
