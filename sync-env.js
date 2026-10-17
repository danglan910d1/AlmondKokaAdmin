// AlmondKokaAdmin/sync-env.js
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve(__dirname, '../shared/env.js');
  const adminConfigPath = path.resolve(__dirname, './config.js');
  const gameConfigPath = path.resolve(__dirname, '../GamemauAmond/src/config.ts');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');

    // Trích xuất APPS_SCRIPT_URL bằng regex
    const match = envContent.match(/APPS_SCRIPT_URL:\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      const url = match[1];
      const newConfigContent = `// TỰ ĐỘNG ĐỒNG BỘ TỪ shared/env.js - KHÔNG SỬA FILE NÀY TRỰC TIẾP
export const APPS_SCRIPT_URL = '${url}';
`;
      fs.writeFileSync(adminConfigPath, newConfigContent, 'utf8');
      console.log(`[Sync Env] Đã đồng bộ APPS_SCRIPT_URL vào Admin: ${url}`);

      if (fs.existsSync(path.dirname(gameConfigPath))) {
        fs.writeFileSync(gameConfigPath, newConfigContent, 'utf8');
        console.log(`[Sync Env] Đã đồng bộ APPS_SCRIPT_URL vào GamemauAmond: ${url}`);
      }
    } else {
      console.error('[Sync Env] Không tìm thấy APPS_SCRIPT_URL trong shared/env.js');
    }
  } else {
    console.error('[Sync Env] Không tìm thấy file shared/env.js tại: ' + envPath);
  }
} catch (err) {
  console.error('[Sync Env] Lỗi đồng bộ env: ', err.message);
}
