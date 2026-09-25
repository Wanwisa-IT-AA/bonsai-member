const fs = require('fs');
const path = require('path');

/**
 * update-images.js
 * สแกนโฟลเดอร์ bangkokimage/1, bangkokimage/2, bangkokimage/3
 * แล้วสร้างไฟล์ bangkokimage/manifest.json อัตโนมัติ
 * รองรับโหมด Watch: node update-images.js --watch
 */

const baseDir = path.join(__dirname, 'bangkokimage');
const batches = ['1', '2', '3'];

function updateManifest() {
  const manifest = {};
  let totalCount = 0;

  batches.forEach((batch) => {
    const batchDir = path.join(baseDir, batch);
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true });
    }
    const files = fs
      .readdirSync(batchDir)
      .filter((file) => /\.(jpe?g|png|webp|gif|jfif)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    manifest[batch] = files;
    totalCount += files.length;
  });

  const manifestPath = path.join(baseDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[${new Date().toLocaleTimeString()}] ✅ Updated manifest.json - รวม ${totalCount} รูปภาพ (รุ่น 1: ${manifest['1'].length}, รุ่น 2: ${manifest['2'].length}, รุ่น 3: ${manifest['3'].length})`);
  return manifest;
}

// อัปเดตทันทีหนึ่งรอบ
updateManifest();

// หากสั่งด้วย --watch ให้คอยเฝ้าดูโฟลเดอร์แบบ Real-time
if (process.argv.includes('--watch')) {
  console.log('👀 กำลังเฝ้าดูการเพิ่ม/ลบรูปภาพในโฟลเดอร์ bangkokimage/ (กด Ctrl+C เพื่อหยุด)...');
  let debounceTimer = null;

  batches.forEach((batch) => {
    const batchDir = path.join(baseDir, batch);
    if (fs.existsSync(batchDir)) {
      try {
        fs.watch(batchDir, (eventType, filename) => {
          if (filename && /\.(jpe?g|png|webp|gif|jfif)$/i.test(filename)) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              console.log(`[Watch] ตรวจพบการเปลี่ยนแปลงในรุ่น ${batch}: ${filename} (${eventType})`);
              updateManifest();
            }, 300);
          }
        });
      } catch (err) {
        console.error(`ไม่สามารถ Watch โฟลเดอร์รุ่น ${batch}:`, err.message);
      }
    }
  });
}
