/**
 * สคริปต์ซิงค์ข้อมูลผู้ผ่านการอบรมบอนไซทุกรุ่นและอัปโหลดรูปภาพทั้งหมดขึ้น Google Drive & Google Sheets
 * วิธีรัน: node sync_trainees_to_google.js
 */

const fs = require('fs');
const path = require('path');

const GOOGLE_SCRIPT_URL = process.env.BONSAI_API_URL || 
  "https://script.google.com/macros/s/AKfycbyNwpMFNf2Anl_y5uo_Tv-zA3la5bxziW79Cmw2e1goG5g1yn__81bFZQK9wKBzqL-HFQ/exec";

// จุดโฟกัสครอบใบหน้าเริ่มต้น
const FACE_FOCUS_MAP = {
  '78995_0.jpg': { x: 23, y: 13, scale: 1.85 },
  '78996_0.jpg': { x: 34, y: 14, scale: 1.85 },
  '78997_0.jpg': { x: 78, y: 12, scale: 1.85 },
  '78998_0.jpg': { x: 27, y: 14, scale: 1.85 },
  '78999_0.jpg': { x: 80, y: 14, scale: 1.85 },
  '79000_0.jpg': { x: 21, y: 15, scale: 1.85 },
  '79001_0.jpg': { x: 32, y: 16, scale: 1.85 },
  '79002_0.jpg': { x: 28, y: 16, scale: 1.85 },
  '79003_0.jpg': { x: 24, y: 15, scale: 1.85 },
  '79004_0.jpg': { x: 80, y: 15, scale: 1.85 },
  '79005_0.jpg': { x: 77, y: 28, scale: 1.85 },
  '79006_0.jpg': { x: 50, y: 22, scale: 1.75 },
  '79007_0.jpg': { x: 23, y: 24, scale: 1.85 },
  '79009_0.jpg': { x: 82, y: 35, scale: 1.85 },
  '79010_0.jpg': { x: 85, y: 24, scale: 1.85 },
  '79011_0.jpg': { x: 63, y: 33, scale: 1.85 },
  '79012_0.jpg': { x: 50, y: 27, scale: 1.85 },
  '79013_0.jpg': { x: 50, y: 25, scale: 1.85 },
  '79014_0.jpg': { x: 50, y: 25, scale: 1.85 }
};

// รายชื่อผู้ผ่านการอบรมรุ่น 1 ที่ตรงกับภาพถ่ายจริงในโฟลเดอร์ bangkokimage/1
const KNOWN_TRAINEES_MAP = {
  '78995_0.jpg': { name: 'นายพัศณิชภัท ธนาทรัพย์', nickname: 'คุณพัศ', role: 'ประธานรุ่นที่ 1', code: 'A008' },
  '78996_0.jpg': { name: 'นางสาวกัญญ์ชญา โสภณ', nickname: 'คุณกัญ', role: 'สมาชิก', code: 'A015' },
  '78997_0.jpg': { name: 'นายวีระชัย เจริญผล', nickname: 'คุณวีระ', role: 'สมาชิก', code: 'A014' },
  '78998_0.jpg': { name: 'นายนำโชค รุ่งเรือง', nickname: 'คุณโชค', role: 'สมาชิก', code: 'A011' },
  '78999_0.jpg': { name: 'นายธีรศักดิ์ สุขสวัสดิ์', nickname: 'คุณธีร์', role: 'สมาชิก', code: 'A013' },
  '79000_0.jpg': { name: 'นายเอกรัตน์ บวรกุล', nickname: 'คุณบอย', role: 'สมาชิก', code: 'A009' },
  '79001_0.jpg': { name: 'นายธนวัฒน์ มิ่งขวัญ', nickname: 'คุณธน', role: 'สมาชิก', code: 'A010' },
  '79002_0.jpg': { name: 'นายปิยะพงษ์ ทิพย์เนตร', nickname: 'คุณปิยะ', role: 'สมาชิก', code: 'A012' },
  '79003_0.jpg': { name: 'นายกิตติศักดิ์ ศรีจันทร์', nickname: 'คุณกิต', role: 'สมาชิก', code: 'A016' },
  '79004_0.jpg': { name: 'นายชาญชัย มณีพงษ์', nickname: 'คุณชาญ', role: 'สมาชิก', code: 'A017' },
  '79005_0.jpg': { name: 'นายพงศธร เกียรติคุณ', nickname: 'คุณพงษ์', role: 'สมาชิก', code: 'A018' },
  '79006_0.jpg': { name: 'นายณัฐวุฒิ บุญมี', nickname: 'คุณณัฐ', role: 'สมาชิก', code: 'A019' },
  '79007_0.jpg': { name: 'นายอมรเทพ วงศ์สวรรค์', nickname: 'คุณเทพ', role: 'สมาชิก', code: 'A020' },
  '79008_0.jpg': { name: 'นางสาวศิริพร ไชยวงศ์', nickname: 'คุณศิริ', role: 'สมาชิก', code: 'A021' },
  '79009_0.jpg': { name: 'นายนครินทร์ รัตนโชติ', nickname: 'คุณรินทร์', role: 'สมาชิก', code: 'A022' },
  '79010_0.jpg': { name: 'นายสุรเชษฐ์ เจนพาณิชย์', nickname: 'คุณเชษฐ์', role: 'สมาชิก', code: 'A023' },
  '79011_0.jpg': { name: 'นางสาวอนุสรณ์ วิชิตกุล', nickname: 'คุณสรณ์', role: 'สมาชิก', code: 'A024' },
  '79012_0.jpg': { name: 'นายชวลิต ลิขิตพงษ์', nickname: 'คุณชวลิต', role: 'สมาชิก', code: 'A025' },
  '79013_0.jpg': { name: 'นายประวิทย์ อักษรทอง', nickname: 'คุณวิทย์', role: 'สมาชิก', code: 'A026' },
  '79014_0.jpg': { name: 'นายภาณุวัฒน์ เด่นดวง', nickname: 'คุณภาณุ', role: 'สมาชิก', code: 'A027' }
};

function parseTrainee(filename, index, batchId) {
  const clean = filename.replace(/\.[^/.]+$/, '').trim();
  if (KNOWN_TRAINEES_MAP[filename]) {
    const k = KNOWN_TRAINEES_MAP[filename];
    return {
      id: `BKK-0${batchId}-${k.code || String(index + 1).padStart(2, '0')}`,
      batch: batchId,
      name: k.name,
      nickname: k.nickname,
      role: k.role || 'สมาชิก',
      certNo: `TBA-CERT-2026-0${batchId}${String(index + 1).padStart(2, '0')}`,
      status: 'จบหลักสูตร'
    };
  }

  if (clean.includes('_')) {
    const parts = clean.split('_').filter(Boolean);
    if (parts.length >= 2 && isNaN(parts[0])) {
      return {
        id: `BKK-0${batchId}-${String(index + 1).padStart(2, '0')}`,
        batch: batchId,
        name: parts[0].startsWith('นาย') || parts[0].startsWith('นาง') ? parts[0] : `คุณ${parts[0]}`,
        nickname: parts[1].startsWith('คุณ') ? parts[1] : `คุณ${parts[1]}`,
        role: index === 0 ? `ประธานรุ่นที่ ${batchId}` : 'สมาชิก',
        certNo: `TBA-CERT-2026-0${batchId}${String(index + 1).padStart(2, '0')}`,
        status: 'จบหลักสูตร'
      };
    }
  }

  return {
    id: `BKK-0${batchId}-${String(index + 1).padStart(2, '0')}`,
    batch: batchId,
    name: `ผู้ผ่านการอบรมรุ่น ${batchId} ลำดับที่ ${index + 1}`,
    nickname: `คุณผู้เข้าอบรม ${index + 1}`,
    role: index === 0 ? `ประธานรุ่นที่ ${batchId}` : 'สมาชิก',
    certNo: `TBA-CERT-2026-0${batchId}${String(index + 1).padStart(2, '0')}`,
    status: 'จบหลักสูตร'
  };
}

async function collectAllTrainees() {
  const baseDir = path.join(__dirname, 'bangkokimage');
  const batches = [1, 2, 3];
  const allTrainees = [];

  for (const bId of batches) {
    const folder = path.join(baseDir, String(bId));
    if (!fs.existsSync(folder)) continue;

    const files = fs.readdirSync(folder).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (let i = 0; i < files.length; i++) {
      const fname = files[i];
      const filePath = path.join(folder, fname);
      const fileBuffer = fs.readFileSync(filePath);
      const mime = fname.endsWith('.png') ? 'image/png' : fname.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      const base64 = `data:${mime};base64,${fileBuffer.toString('base64')}`;

      const tInfo = parseTrainee(fname, i, bId);
      const crop = FACE_FOCUS_MAP[fname] || { x: 50, y: 18, scale: 1.85 };

      allTrainees.push({
        ...tInfo,
        filename: fname,
        photoBase64: base64,
        cropFocusX: crop.x,
        cropFocusY: crop.y,
        cropScale: crop.scale
      });
    }
  }

  return allTrainees;
}

async function syncTrainees() {
  console.log('🚀 เริ่มต้นเตรียมข้อมูลผู้เข้าอบรมและรูปถ่าย...');
  const trainees = await collectAllTrainees();
  console.log(`📦 พบข้อมูลผู้เข้าอบรมทั้งหมด ${trainees.length} ท่าน พร้อมรูปถ่าย`);

  console.log(`📡 กำลังเชื่อมต่อไปยัง Google Apps Script: ${GOOGLE_SCRIPT_URL}`);

  // เพื่อป้องกัน Request ใหญ่เกินไปใน Google Apps Script แนะนำส่งทีละรุ่น หรือส่งทีละ 5-10 คน
  const chunkSize = 4;
  let totalSuccess = 0;

  for (let i = 0; i < trainees.length; i += chunkSize) {
    const chunk = trainees.slice(i, i + chunkSize);
    console.log(`\n⏳ กำลังอัปโหลดผู้เข้าอบรมลำดับที่ ${i + 1} - ${i + chunk.length} เข้า Google Drive & Sheets...`);

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncAllTrainees',
          trainees: chunk
        })
      });

      const result = await res.json();
      if (result.status === 'success') {
        console.log(`✅ สำเร็จ: ${result.message}`);
        totalSuccess += chunk.length;
      } else {
        console.error(`❌ ผิดพลาด: ${result.message}`);
      }
    } catch (err) {
      console.error(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
    }
  }

  console.log(`\n🎉 สรุปผล: ซิงค์ข้อมูลเข้า Google Sheets และ Google Drive สำเร็จ ${totalSuccess}/${trainees.length} คน!`);
}

if (require.main === module) {
  syncTrainees();
}

module.exports = { collectAllTrainees, syncTrainees };
