/**
 * BonsaiTraineeChart.jsx
 * แผนผังและทำเนียบผู้ผ่านการอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ สมาคมบอนไซไทย
 * แบ่งเป็นรุ่นๆ (รุ่น 1, รุ่น 2, รุ่น 3)
 * รองรับสไตล์ WattVision Dark (#121212, Cyan #00E5FF, Lime Green #32D74B ตาม desig.md)
 * และรองรับการสลับกลับไปยังสไตล์โปสเตอร์สัมมนา หรือสไตล์สว่างได้ทันที
 * พร้อมฟังก์ชันครอบรูปภาพอัตโนมัติ (Auto Face Crop) โฟกัสเฉพาะโซนหน้าขึ้นไป ได้สัดส่วน 3:4
 */

// รองรับทั้งระบบโมดูล (Bundler) และ Browser Standalone (window.React)
const _React = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : {});
const { useState, useMemo, useEffect, useCallback, useRef } = _React;

// 🌟 Google Apps Script Web App URL (เชื่อมโยง Google Sheets และ Google Drive)
const GOOGLE_SCRIPT_URL = 
  (typeof localStorage !== 'undefined' && localStorage.getItem('BONSAI_API_URL')) ||
  'https://script.google.com/macros/s/AKfycbyNwpMFNf2Anl_y5uo_Tv-zA3la5bxziW79Cmw2e1goG5g1yn__81bFZQK9wKBzqL-HFQ/exec';

// ฟังก์ชันแปลงลิงก์ Google Drive ให้แสดงผลใน <img> ได้โดยตรง
function formatDriveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || !url.includes('drive.google.com')) {
    return url;
  }
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
}

/**
 * ฟังก์ชันแปลงไฟล์เป็น Base64 Data URL (แบบเดียวกับบัตรสมาชิก)
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * ตัวช่วยโหลดสคริปต์ MediaPipe Face Detection อัตโนมัติ (On-Demand Loader)
 */
let _mediaPipeScriptLoading = null;
function loadMediaPipeScript() {
  if (typeof FaceDetection !== 'undefined') {
    return Promise.resolve();
  }
  if (_mediaPipeScriptLoading) return _mediaPipeScriptLoading;
  _mediaPipeScriptLoading = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('No document'));
    const existing = document.querySelector('script[src*="face_detection"]');
    if (existing) {
      if (typeof FaceDetection !== 'undefined') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (err) => reject(err));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/face_detection.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
  return _mediaPipeScriptLoading;
}

/**
 * ตัวช่วยเริ่มการทำงาน MediaPipe Face Detection Engine (แบบเดียวกับบัตรสมาชิก)
 */
let _globalFaceDetector = null;
async function initFaceDetector() {
  if (_globalFaceDetector) return _globalFaceDetector;
  if (typeof FaceDetection === 'undefined') {
    await loadMediaPipeScript().catch(() => null);
  }
  if (typeof FaceDetection === 'undefined') return null;
  try {
    _globalFaceDetector = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${file}`,
    });
    _globalFaceDetector.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5,
    });
    return _globalFaceDetector;
  } catch (e) {
    console.warn('MediaPipe initialization error:', e);
    return null;
  }
}

/**
 * ฟังก์ชันครอบรูปภาพเฉพาะใบหน้าด้วย AI MediaPipe Face Detection (ดึงวิธีการทำงานของบัตรสมาชิกมาใช้ 100%)
 * สัดส่วน 3:4 (450 x 600 px) คุณภาพสูง จัดระยะเหนือศีรษะ 44% ให้ความสมดุลสวยงาม
 */
async function cropFaceWithMediaPipe(fileOrBase64) {
  return new Promise(async (resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      if (typeof fileOrBase64 === 'string') {
        img.src = fileOrBase64;
      } else {
        img.src = await fileToBase64(fileOrBase64);
      }

      await new Promise((res, rej) => {
        if (img.complete && img.naturalWidth) return res();
        img.onload = () => res();
        img.onerror = () => rej(new Error('โหลดรูปภาพไม่สำเร็จ'));
      });

      const detector = await initFaceDetector();
      if (!detector) {
        console.warn('Face detector not ready, fallback to original');
        return resolve({ base64: img.src, detected: false, rawImg: img });
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('MediaPipe detection timed out, fallback to original');
          resolve({ base64: img.src, detected: false, rawImg: img });
        }
      }, 5000);

      detector.onResults((results) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        if (!results || !results.detections || results.detections.length === 0) {
          console.log('No face detected by MediaPipe, keeping original');
          return resolve({ base64: img.src, detected: false, rawImg: img });
        }

        const box = results.detections[0].boundingBox;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;

        const fx = box.xCenter * iw;
        const fy = box.yCenter * ih;
        const fw = box.width * iw;
        const fh = box.height * ih;

        // คำนวณกรอบสัดส่วนการ์ดให้กระชับ โฟกัสเฉพาะใบหน้าและช่วงบนให้พอดีกับการ์ด
        let cropH = fh * 2.6;
        let cropW = cropH * (4 / 3.2); // สัดส่วนการ์ดทรงกะทัดรัด

        if (cropW > iw) {
          cropW = iw;
          cropH = cropW * (3.2 / 4);
        }
        if (cropH > ih) {
          cropH = ih;
          cropW = cropH * (4 / 3.2);
        }

        let cropX = fx - cropW / 2;
        let cropY = fy - cropH * 0.42; // ระยะศีรษะ

        if (cropX < 0) cropX = 0;
        if (cropY < 0) cropY = 0;
        if (cropX + cropW > iw) cropX = iw - cropW;
        if (cropY + cropH > ih) cropY = ih - cropH;

        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          canvas.width,
          canvas.height
        );
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);
        resolve({
          base64: croppedBase64,
          detected: true,
          cropBox: {
            cropX,
            cropY,
            cropW,
            cropH,
            fxPercent: Math.max(0, Math.min(100, Math.round((fx / iw) * 100))),
            fyPercent: Math.max(0, Math.min(100, Math.round((fy / ih) * 100)))
          },
          rawImg: img
        });
      });

      await detector.send({ image: img });
    } catch (err) {
      console.error('MediaPipe crop error:', err);
      const fallback =
        typeof fileOrBase64 === 'string'
          ? fileOrBase64
          : await fileToBase64(fileOrBase64).catch(() => '');
      resolve({ base64: fallback, detected: false });
    }
  });
}

/**
 * ฟังก์ชันสร้างรูปภาพที่ครอบแล้วจริง (สัดส่วน 4:3.2 ขนาด 480x384 px Base64 JPEG)
 * จากภาพและพิกัดจุดโฟกัส (X%, Y%)
 * นำรูปที่ครอบแล้วนี้กลับไปอัปเดตแทนรูปเดิมได้ทันที
 */
function generateCroppedImageFromPos(img, pos, scale = 1.0) {
  return new Promise((resolve) => {
    try {
      if (!img) return resolve('');
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return resolve(img.src || '');

      const targetAspect = 4 / 3.2;
      let baseW = iw;
      let baseH = baseW / targetAspect;
      if (baseH > ih) {
        baseH = ih;
        baseW = baseH * targetAspect;
      }

      const s = Math.max(1.0, Number(scale) || 1.0);
      const cropW = baseW / s;
      const cropH = baseH / s;

      const centerX = ((Number(pos.x !== undefined ? pos.x : 50)) / 100) * iw;
      const centerY = ((Number(pos.y !== undefined ? pos.y : 22)) / 100) * ih;

      let cropX = centerX - cropW / 2;
      let cropY = centerY - cropH / 2;

      if (cropX < 0) cropX = 0;
      if (cropY < 0) cropY = 0;
      if (cropX + cropW > iw) cropX = iw - cropW;
      if (cropY + cropH > ih) cropY = ih - cropH;

      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 384;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve(dataUrl);
    } catch (e) {
      console.warn('Canvas crop generation fallback:', e);
      resolve(img ? img.src : '');
    }
  });
}

// ⚡ ตัวช่วยดึงข้อมูลด่วนผ่าน Google Sheets CSV Link (เร็วกว่า Apps Script 10-20 เท่า)
const GOOGLE_SPREADSHEET_ID = 
  (typeof localStorage !== 'undefined' && localStorage.getItem('BONSAI_SPREADSHEET_ID')) || 
  '1JXpFFL-whqQsh9WLZR-qrz9xCxK-HLY3hQRy9iK3Uwg';

/**
 * ฟังก์ชันแปลงข้อความ CSV เป็น JavaScript Objects (RFC 4180 รองรับเครื่องหมายจุลภาคและเครื่องหมายคำพูด)
 */
function parseCSV(csvText) {
  if (!csvText) return [];
  const rows = [];
  let row = [];
  let inQuotes = false;
  let curVal = '';

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        curVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(curVal.trim());
      curVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(curVal.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        rows.push(row);
      }
      row = [];
      curVal = '';
    } else {
      curVal += c;
    }
  }
  if (curVal || row.length > 0) {
    row.push(curVal.trim());
    rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => {
      const val = r[idx] !== undefined ? r[idx].replace(/^["']|["']$/g, '').trim() : '';
      obj[h] = val;
    });
    return obj;
  });
}

// ข้อมูลหลักสูตรและการจัดอบรมแต่ละรุ่น
const INITIAL_BATCH_METADATA = [
  {
    id: 1,
    batchNumber: 'รุ่นที่ 1',
    batchCode: 'BKK-B1',
    title: 'เรียนรู้การทำบอนไซเบี้ยงต้น',
    themeColor: 'cyan',
    date: '20-21 มิถุนายน 2569',
    location: 'สวนบางกอกบอนไซ ไร่อริยะ กาญจนบุรี',
    instructor: 'อาจารย์พิศิษย์ อริยะอมรกุล นายกสมาคมบอนไซไทย',
    description: 'เน้นพื้นฐานดิน กระถาง การขยายพันธุ์ และหลักการตัดทดกิ่งไม้เขตร้อน',
    folder: 'bangkokimage/1',
    folderNum: '1'
  },
  {
    id: 2,
    batchNumber: 'รุ่นที่ 2',
    batchCode: 'BKK-B2',
    title: 'เรียนรู้การทำบอนไซเบี้ยงต้น',
    themeColor: 'teal',
    date: '18 กรกฏาคม 2569',
    location: 'สวนบางกอกบอนไซ ไร่อริยะ กาญจนบุรี',
    instructor: 'มาสเตอร์ช่างดัดบอนไซระดับสากล',
    description: 'เน้นทักษะการพันลวดอลูมิเนียม การสร้างมิติพุ่มใบ และการทำจิน-ชาริ',
    folder: 'bangkokimage/2',
    folderNum: '2'
  },
  {
    id: 3,
    batchNumber: 'รุ่นที่ 3',
    batchCode: 'BKK-B3',
    title: 'เรียนรู้การทำบอนไซเบี้ยงต้น',
    themeColor: 'emerald',
    date: '19 กันยายน 2569',
    location: 'สวนบางกอกบอนไซ ไร่อริยะ กาญจนบุรี',
    instructor: 'คณะกรรมการตัดสินประกวดบอนไซแห่งประเทศไทย',
    description: 'การคัดเลือกกระถางดินเผาโบราณ ไม้ประดับร่วม (Shitakusa) และการจัดตู้แท่นโชว์ (Tokonoma)',
    folder: 'bangkokimage/3',
    folderNum: '3'
  }
];

// พิกัดจุดโฟกัสโซนใบหน้า (Face Focus Coordinates) สำหรับครอบรูปอัตโนมัติ (object-position)
// จัดวางใบหน้าให้อยู่กึ่งกลางการ์ดรูปภาพแบบ 100% ไม่มีขอบขาว
const FACE_FOCUS_MAP = {
  '78995_0.jpg': { x: 26, y: 18, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณพัศ A008)
  '78996_0.jpg': { x: 34, y: 16, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณกัญ A015)
  '78997_0.jpg': { x: 78, y: 16, scale: 1.0 }, // ยืนฝั่งขวา (คุณวีระ A014)
  '78998_0.jpg': { x: 34, y: 18, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณโชค A011)
  '78999_0.jpg': { x: 78, y: 18, scale: 1.0 }, // ยืนฝั่งขวา (คุณธีร์ A013)
  '79000_0.jpg': { x: 26, y: 18, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณบอย A009)
  '79001_0.jpg': { x: 30, y: 15, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณธน A010)
  '79002_0.jpg': { x: 24, y: 22, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณปิยะ A012)
  '79003_0.jpg': { x: 26, y: 20, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณกิต A016)
  '79004_0.jpg': { x: 78, y: 20, scale: 1.0 }, // ยืนฝั่งขวา (คุณชาญ A017)
  '79005_0.jpg': { x: 78, y: 22, scale: 1.0 }, // ยืนฝั่งขวา (คุณพงษ์ A018)
  '79006_0.jpg': { x: 50, y: 26, scale: 1.0 }, // กึ่งกลาง (คุณณัฐ A019)
  '79007_0.jpg': { x: 25, y: 24, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณเทพ A020)
  '79008_0.jpg': { x: 53, y: 20, scale: 1.0 }, // กึ่งกลาง (คุณศิริ A021)
  '79009_0.jpg': { x: 72, y: 35, scale: 1.0 }, // ยืนฝั่งขวา (คุณรินทร์ A022)
  '79010_0.jpg': { x: 86, y: 22, scale: 1.0 }, // ยืนฝั่งขวา (คุณเชษฐ์ A023)
  '79011_0.jpg': { x: 74, y: 26, scale: 1.0 }, // ยืนฝั่งขวา (คุณสรณ์ A024)
  '79012_0.jpg': { x: 51, y: 26, scale: 1.0 }, // กึ่งกลาง (คุณชวลิต A025)
  '79013_0.jpg': { x: 45, y: 20, scale: 1.0 }, // กึ่งกลาง (คุณวิทย์ A026)
  '79014_0.jpg': { x: 45, y: 22, scale: 1.0 }, // กึ่งกลาง (คุณภาณุ A027)
  '79019_0.jpg': { x: 24, y: 18, scale: 1.0 }, // ยืนฝั่งซ้าย (คุณวณิช A028)
  'trainee_01.jpg': { x: 50, y: 22, scale: 1.0 }
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
  '79014_0.jpg': { name: 'นายภาณุวัฒน์ เด่นดวง', nickname: 'คุณภาณุ', role: 'สมาชิก', code: 'A027' },
  '79019_0.jpg': { name: 'นายวณิช กฤษณะเศรณี', nickname: 'คุณวณิช', role: 'สมาชิก', code: 'A028' }
};

// ฟังก์ชันแยกชื่อจริงและชื่อเล่นจากชื่อไฟล์แบบอัตโนมัติ
function parseTraineeFromFilename(filename, index, batchId) {
  const cleanFilename = filename.split('?')[0].split('#')[0];

  // 1. ถ้ามีในรายชื่อที่แมปไว้โดยเฉพาะ
  if (KNOWN_TRAINEES_MAP[cleanFilename]) {
    const k = KNOWN_TRAINEES_MAP[cleanFilename];
    return {
      id: `BKK-0${batchId}-${k.code || String(index + 1).padStart(2, '0')}`,
      name: k.name,
      nickname: k.nickname,
      role: k.role || 'สมาชิก',
      filename: cleanFilename,
      image: `bangkokimage/${batchId}/${cleanFilename}`,
      treeSpecies: 'บอนไซศิลปะสร้างสรรค์',
      status: 'จบหลักสูตร',
      certNo: `TBA-CERT-2026-0${batchId}${String(index + 1).padStart(2, '0')}`,
      highlight: 'ผ่านการฝึกอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ'
    };
  }

  // 2. แยกจากชื่อไฟล์ เช่น "สมชาย_ชาย.jpg" หรือ "นางสาวสมหญิง_หญิง.png"
  const nameWithoutExt = cleanFilename.replace(/\.[^/.]+$/, '').trim();
  
  if (nameWithoutExt.includes('_')) {
    const parts = nameWithoutExt.split('_').filter(Boolean);
    if (parts.length >= 2 && isNaN(parts[0])) {
      const realName = parts[0].trim();
      const nickname = parts[1].trim();
      return {
        id: `BKK-0${batchId}-${String(index + 1).padStart(2, '0')}`,
        name: realName.startsWith('นาย') || realName.startsWith('นาง') ? realName : `คุณ${realName}`,
        nickname: nickname.startsWith('คุณ') ? nickname : `คุณ${nickname}`,
        role: index === 0 ? `ประธานรุ่นที่ ${batchId}` : 'สมาชิก',
        filename: cleanFilename,
        image: `bangkokimage/${batchId}/${cleanFilename}`,
        treeSpecies: 'บอนไซศิลปะสร้างสรรค์',
        status: 'จบหลักสูตร',
        certNo: `TBA-CERT-2026-0${batchId}${String(index + 1).padStart(2, '0')}`,
        highlight: 'ผ่านการฝึกอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ'
      };
    }
  }

  // 3. ชื่อไฟล์แบบอื่นๆ หรือไฟล์รูปใหม่ที่เพิ่งเพิ่มเข้ามา
  const num = index + 1;
  return {
    id: `BKK-0${batchId}-${String(num).padStart(2, '0')}`,
    name: `ผู้เข้าร่วมอบรม ท่านที่ ${num}`,
    nickname: `รุ่น ${batchId} - คนที่ ${num}`,
    role: num === 1 ? `ประธานรุ่นที่ ${batchId}` : 'สมาชิก',
    filename: cleanFilename,
    image: `bangkokimage/${batchId}/${cleanFilename}`,
    treeSpecies: 'บอนไซศิลปะสร้างสรรค์',
    status: 'จบหลักสูตร',
    certNo: `TBA-CERT-2026-0${batchId}${String(num).padStart(2, '0')}`,
    highlight: 'ผ่านการฝึกอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ'
  };
}

/**
 * หน้าต่างสำหรับคลิกเลือกตำแหน่งครอบรูปภาพแบบโต้ตอบ (Interactive Photo Cropper)
 * ผู้ใช้สามารถคลิกบนภาพถ่ายตรงจุดที่ต้องการ (เช่น โซนใบหน้า) เพื่อให้ระบบโฟกัสและครอบอัตโนมัติ
 * พร้อมดูภาพตัวอย่างการ์ดจริงแบบ Real-time และปรับซูม/สเกลได้อิสระ
 */
function CropEditorModal({
  trainee,
  cardTheme,
  currentCrop,
  defaultCrop,
  onSave,
  onReset,
  onClose
}) {
  const [pos, setPos] = useState({
    x: currentCrop.x !== undefined ? currentCrop.x : 50,
    y: currentCrop.y !== undefined ? currentCrop.y : 18
  });
  const [scale, setScale] = useState(currentCrop.scale || 1.85);
  const [copied, setCopied] = useState(false);
  const [hoverCoord, setHoverCoord] = useState(null);
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);
  const imgRef = useRef(null);

  const filename = trainee.filename || (trainee.image ? trainee.image.split('/').pop() : '');

  // ตรวจจับใบหน้าอัตโนมัติด้วย AI MediaPipe (แบบเดียวกับบัตรสมาชิก)
  const handleAutoDetectFace = async () => {
    setIsDetectingFace(true);
    setAiMessage({ type: 'info', text: 'กำลังตรวจจับใบหน้าด้วย AI MediaPipe...' });
    try {
      const result = await cropFaceWithMediaPipe(trainee.image);
      if (result.detected && result.cropBox) {
        setPos({ x: result.cropBox.fxPercent, y: result.cropBox.fyPercent });
        setScale(1.85);
        setAiMessage({ type: 'success', text: '✓ AI MediaPipe ตรวจพบใบหน้าและปรับตำแหน่งโฟกัสให้อัตโนมัติแล้ว!' });
      } else {
        setAiMessage({ type: 'warn', text: 'ไม่พบใบหน้าชัดเจนในภาพ ใช้จุดโฟกัสกึ่งกลางแทน' });
      }
    } catch (e) {
      setAiMessage({ type: 'warn', text: 'การตรวจจับใบหน้าขัดข้อง คุณสามารถคลิกเลือกจุดบนภาพได้โดยตรง' });
    } finally {
      setIsDetectingFace(false);
      setTimeout(() => setAiMessage(null), 4000);
    }
  };

  // ดักจับการคลิกบนรูปภาพเพื่อคำนวณตำแหน่งพิกัด X% และ Y%
  const handleImageClick = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const x = Math.max(0, Math.min(100, Math.round(rawX)));
    const y = Math.max(0, Math.min(100, Math.round(rawY)));
    setPos({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const x = Math.max(0, Math.min(100, Math.round(rawX)));
    const y = Math.max(0, Math.min(100, Math.round(rawY)));
    setHoverCoord({ x, y });
  };

  // เลื่อนพิกัดทีละนิดด้วยปุ่มควบคุม (Fine-tuning)
  const nudge = (dx, dy) => {
    setPos((p) => ({
      x: Math.max(0, Math.min(100, p.x + dx)),
      y: Math.max(0, Math.min(100, p.y + dy))
    }));
  };

  // คัดลอกโค้ดพิกัดสำหรับนำไปใช้ในโค้ด
  const copyConfig = () => {
    const text = `'${filename}': { x: ${pos.x}, y: ${pos.y}, scale: ${scale} }`;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {}
  };

  const handleReset = () => {
    const d = defaultCrop || { x: 50, y: 18, scale: 1.85 };
    setPos({ x: d.x, y: d.y });
    setScale(d.scale || 1.85);
    onReset();
  };

  // ครอปภาพจริงเป็น Base64 3:4 และส่งกลับไปแทนที่รูปเดิม
  const handleSaveCrop = async () => {
    setIsSavingCrop(true);
    try {
      let croppedBase64 = null;
      if (imgRef.current) {
        croppedBase64 = await generateCroppedImageFromPos(imgRef.current, pos, scale);
      }
      onSave({
        croppedImage: croppedBase64,
        x: pos.x,
        y: pos.y,
        scale: scale
      });
    } catch (e) {
      console.warn('Crop save error:', e);
      onSave({ x: pos.x, y: pos.y, scale });
    } finally {
      setIsSavingCrop(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className={`rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border flex flex-col my-auto transition-all ${
        cardTheme === 'wattvision'
          ? 'bg-[#181818] border-[#2C2C2E] text-white'
          : cardTheme === 'poster'
          ? 'bg-[#041712] border-emerald-800 text-white'
          : 'bg-white border-gray-200 text-gray-800'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          cardTheme === 'wattvision'
            ? 'bg-[#1F1F1F] border-[#2C2C2E]'
            : cardTheme === 'poster'
            ? 'bg-[#062019] border-emerald-800/80'
            : 'bg-emerald-50/80 border-emerald-100 text-gray-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${
              cardTheme === 'wattvision'
                ? 'bg-[#00E5FF] text-[#121212]'
                : cardTheme === 'poster'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-emerald-700 text-white'
            }`}>
              <i className="fa-solid fa-crop-simple"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>เลือกจุดครอบรูปภาพ</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  cardTheme === 'wattvision' ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {trainee.name} ({trainee.nickname})
                </span>
              </h3>
              <p className={`text-xs ${cardTheme === 'wattvision' ? 'text-[#98989D]' : 'text-gray-500'}`}>
                คลิกบนภาพถ่ายเพื่อเลือกจุดโฟกัส หรือให้ AI ครอปภาพสัดส่วน 3:4 อัตโนมัติ
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border transition cursor-pointer ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E] text-gray-400 hover:text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content Body: แบ่งเป็น ฝั่งรูปถ่ายเต็มให้กด (ซ้าย) + แผงตั้งค่าและตัวอย่างการ์ดจริง (ขวา) */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ซ้าย: ภาพถ่ายเต็มใบ พร้อมจุดพิกัดเล็งเป้า Reticle ให้คลิก */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold flex items-center gap-1.5 text-amber-500">
                <i className="fa-solid fa-hand-pointer animate-bounce"></i>
                คลิกบนภาพเพื่อเลือกจุดโฟกัส:
              </span>
              <div className="font-mono text-[11px] opacity-75">
                พิกัด: <strong>X: {pos.x}%</strong>, <strong>Y: {pos.y}%</strong>
                {hoverCoord && (
                  <span className="ml-2 text-gray-400 hidden sm:inline">(เมาส์: {hoverCoord.x}%, {hoverCoord.y}%)</span>
                )}
              </div>
            </div>

            {/* Container ภาพถ่ายเต็ม */}
            <div
              className={`relative rounded-2xl overflow-hidden border flex items-center justify-center p-1 cursor-crosshair select-none ${
                cardTheme === 'wattvision'
                  ? 'bg-[#101010] border-[#2C2C2E]'
                  : 'bg-stone-900 border-gray-300'
              }`}
              style={{ minHeight: '320px' }}
            >
              {/* Full Original Image */}
              <div className="relative inline-block max-w-full">
                <img
                  ref={imgRef}
                  src={trainee.image}
                  alt={trainee.name}
                  onClick={handleImageClick}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoverCoord(null)}
                  className="max-h-[380px] sm:max-h-[420px] w-auto max-w-full object-contain rounded-xl block mx-auto cursor-crosshair"
                />

                {/* Reticle Target Marker at clicked pos */}
                <div
                  className="absolute pointer-events-none transition-all duration-75"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Glowing Pulse Rings */}
                  <div className="w-12 h-12 rounded-full border-2 border-[#00E5FF] bg-[#00E5FF]/20 animate-ping absolute -inset-2"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/35 shadow-xl flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white shadow-xs"></div>
                  </div>
                  {/* Crosshair guidelines */}
                  <div className="w-16 h-px bg-amber-300/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                  <div className="h-16 w-px bg-amber-300/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                  {/* Badge */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-black/90 text-amber-300 text-[10px] font-mono font-bold rounded-md whitespace-nowrap shadow-lg border border-amber-400/40">
                    🎯 จุดกึ่งกลาง
                  </div>
                </div>
              </div>
            </div>

            {/* AI Status Message */}
            {aiMessage && (
              <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 border transition-all ${
                aiMessage.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : aiMessage.type === 'warn'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                  : 'bg-sky-950/80 text-sky-300 border-sky-500/50'
              }`}>
                <i className={`fa-solid ${aiMessage.type === 'success' ? 'fa-circle-check text-emerald-400' : aiMessage.type === 'warn' ? 'fa-triangle-exclamation text-amber-400' : 'fa-spinner fa-spin text-sky-400'}`}></i>
                <span className="font-medium">{aiMessage.text}</span>
              </div>
            )}

            {/* Quick Position Presets, AI Auto Crop & Fine-tuning */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* ปุ่ม AI MediaPipe ครอปใบหน้าอัตโนมัติ (ดึงจากบัตรสมาชิก) */}
                <button
                  type="button"
                  onClick={handleAutoDetectFace}
                  disabled={isDetectingFace}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="ใช้ AI MediaPipe ตรวจจับใบหน้าและคำนวณจุดกึ่งกลางให้อัตโนมัติ"
                >
                  <i className={`fa-solid ${isDetectingFace ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles text-amber-300'}`}></i>
                  <span>{isDetectingFace ? 'กำลัง AI ตรวจจับ...' : '⚡ AI ครอปใบหน้า'}</span>
                </button>

                <span className="opacity-70 text-[11px] ml-1">พิกัดสำเร็จรูป:</span>
                <button
                  type="button"
                  onClick={() => setPos({ x: 28, y: 24 })}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-500 hover:text-white transition font-medium cursor-pointer"
                >
                  👤 คนยืนซ้าย
                </button>
                <button
                  type="button"
                  onClick={() => setPos({ x: 50, y: 26 })}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-500 hover:text-white transition font-medium cursor-pointer"
                >
                  👤 กึ่งกลาง
                </button>
                <button
                  type="button"
                  onClick={() => setPos({ x: 74, y: 22 })}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-500 hover:text-white transition font-medium cursor-pointer"
                >
                  👤 คนยืนขวา
                </button>
                <button
                  type="button"
                  onClick={() => setPos({ x: 50, y: 50 })}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-500 hover:text-white transition font-medium cursor-pointer"
                >
                  🎯 กึ่งกลางภาพ
                </button>
              </div>

              {/* D-Pad Fine Tuning */}
              <div className="flex items-center gap-1">
                <span className="opacity-70 text-[11px] mr-1">ขยับละเอียด:</span>
                <button
                  type="button"
                  onClick={() => nudge(-2, 0)}
                  className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                  title="เลื่อนซ้าย 2%"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button
                  type="button"
                  onClick={() => nudge(2, 0)}
                  className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                  title="เลื่อนขวา 2%"
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
                <button
                  type="button"
                  onClick={() => nudge(0, -2)}
                  className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                  title="เลื่อนขึ้น 2%"
                >
                  <i className="fa-solid fa-chevron-up"></i>
                </button>
                <button
                  type="button"
                  onClick={() => nudge(0, 2)}
                  className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                  title="เลื่อนลง 2%"
                >
                  <i className="fa-solid fa-chevron-down"></i>
                </button>
              </div>
            </div>

          </div>


          {/* ขวา: ตัวอย่างการ์ดจริง (Live Preview) & สเกลการซูม */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            {/* Live Preview Box */}
            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E]'
                : cardTheme === 'poster'
                ? 'bg-[#020b08] border-emerald-900/60'
                : 'bg-stone-50 border-gray-200'
            }`}>
              <div className="w-full flex items-center justify-between text-xs font-bold mb-3 px-1">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <i className="fa-solid fa-eye"></i>
                  ตัวอย่างการ์ดจริง (Live Preview)
                </span>
                <span className="text-[11px] font-mono opacity-70">
                  สัดส่วนมาตรฐาน 3:4
                </span>
              </div>

              {/* Exact Card Preview */}
              <div className={`w-44 sm:w-48 rounded-2xl border overflow-hidden shadow-lg flex flex-col ${
                cardTheme === 'wattvision'
                  ? 'bg-[#1E1E1E] border-[#00E5FF]/60 shadow-[#00E5FF]/10'
                  : cardTheme === 'poster'
                  ? 'bg-slate-950 border-amber-400 shadow-amber-500/10'
                  : 'bg-white border-emerald-400 shadow-md'
              }`}>
                {/* Image Frame */}
                <div className={`relative overflow-hidden aspect-[4/3.2] ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#121212]'
                    : cardTheme === 'poster'
                    ? 'bg-slate-900'
                    : 'bg-stone-100'
                }`}>
                  <img
                    src={trainee.image}
                    alt={trainee.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: `${pos.x}% ${pos.y}%`,
                      transform: scale > 1.05 ? `scale(${scale})` : 'none',
                      transformOrigin: `${pos.x}% ${pos.y}%`,
                      transition: 'none'
                    }}
                  />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/75 text-[#00E5FF] text-[9px] rounded font-mono border border-white/10">
                    {pos.x}%, {pos.y}%
                  </div>
                </div>

                {/* Bottom Card Text */}
                <div className={`p-2.5 text-center border-t flex flex-col justify-center min-h-[48px] ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#1E1E1E] border-[#2C2C2E]'
                    : cardTheme === 'poster'
                    ? 'bg-slate-950 border-emerald-900/60'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className={`text-xs sm:text-sm font-bold truncate ${
                    cardTheme === 'wattvision'
                      ? 'text-white'
                      : cardTheme === 'poster'
                      ? 'text-amber-300'
                      : 'text-gray-900'
                  }`}>
                    {trainee.name}
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 truncate ${
                    cardTheme === 'wattvision'
                      ? 'text-[#00E5FF] font-mono'
                      : cardTheme === 'poster'
                      ? 'text-emerald-300/90'
                      : 'text-emerald-700'
                  }`}>
                    ({trainee.nickname})
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom / Scale Controller */}
            <div className={`p-4 rounded-2xl border ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E]'
                : 'bg-stone-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-magnifying-glass-plus text-amber-500"></i>
                  ระยะซูมขยายภาพ (Scale):
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {scale}x
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1.0"
                max="3.2"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />

              {/* Quick Scale Buttons */}
              <div className="flex items-center justify-between mt-2.5 gap-1">
                {[
                  { label: 'เต็มตัว', val: 1.0 },
                  { label: 'ครึ่งตัว', val: 1.4 },
                  { label: 'สัดส่วนมาตรฐาน', val: 1.85 },
                  { label: 'ซูมใกล้', val: 2.3 },
                  { label: 'โคลสอัพ', val: 2.8 }
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setScale(s.val)}
                    className={`px-1.5 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                      scale === s.val
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-500 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={isSavingCrop}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className={`fa-solid ${isSavingCrop ? 'fa-spinner fa-spin' : 'fa-circle-check text-base'}`}></i>
                <span>{isSavingCrop ? 'กำลังสร้างรูปที่ครอบและบันทึก...' : 'บันทึกรูปและนำไปใช้แทนรูปเดิมทันที'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#1E1E1E] hover:bg-[#252525] border-[#2C2C2E] text-gray-300'
                      : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-gray-700'
                  }`}
                  title="คืนค่าเป็นจุดโฟกัสเริ่มต้นของระบบ"
                >
                  <i className="fa-solid fa-arrow-rotate-left"></i>
                  <span>รีเซ็ตค่าเริ่มต้น</span>
                </button>

                <button
                  type="button"
                  onClick={copyConfig}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#1E1E1E] hover:bg-[#252525] border-[#2C2C2E] text-gray-300'
                      : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-gray-700'
                  }`}
                  title="คัดลอกโค้ดพิกัดนี้เก็บไว้"
                >
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                  <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกพิกัด'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

/**
 * หน้าต่างสำหรับแก้ไขข้อมูลผู้ผ่านการอบรม และอัปเดตเปลี่ยนรูปถ่าย
 */
function EditTraineeModal({
  trainee,
  cardTheme,
  onSave,
  onOpenCrop,
  onClose
}) {
  const [name, setName] = useState(trainee.name || '');
  const [nickname, setNickname] = useState(trainee.nickname || '');
  const [role, setRole] = useState(trainee.role || 'สมาชิก');
  const [certNo, setCertNo] = useState(trainee.certNo || '');
  const [status, setStatus] = useState(trainee.status || 'จบหลักสูตร');
  const [image, setImage] = useState(trainee.image || '');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoCropStatus, setPhotoCropStatus] = useState(null);
  const fileInputRef = useRef(null);

  // ดึงวิธีการทำงานของบัตรสมาชิกมาใช้ (MediaPipe Face Detection & Auto Crop 3:4)
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('ไฟล์รูปภาพมีขนาดใหญ่เกิน 15MB กรุณาเลือกไฟล์ที่มีขนาดเล็กลง');
      return;
    }

    setIsProcessingPhoto(true);
    setPhotoCropStatus({ processing: true, text: 'กำลังตรวจจับใบหน้าและครอบรูป... (MediaPipe)' });

    try {
      const result = await cropFaceWithMediaPipe(file);
      setImage(result.base64);
      setPhotoCropStatus({
        processing: false,
        detected: result.detected,
        text: result.detected ? '✓ AI ครอปใบหน้า' : 'รูปต้นฉบับ'
      });
    } catch (err) {
      console.error('Photo crop error:', err);
      const fallback = await fileToBase64(file).catch(() => '');
      setImage(fallback);
      setPhotoCropStatus({
        processing: false,
        detected: false,
        text: 'เลือกรูปภาพเรียบร้อยแล้ว'
      });
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // ปุ่มกดสั่งให้ AI MediaPipe วิเคราะห์และครอบรูปปัจจุบันอีกครั้ง
  const handleTriggerMediaPipeCrop = async () => {
    if (!image || isProcessingPhoto) return;
    setIsProcessingPhoto(true);
    setPhotoCropStatus({ processing: true, text: 'กำลังตรวจจับใบหน้าและครอบรูป...' });
    try {
      const result = await cropFaceWithMediaPipe(image);
      setImage(result.base64);
      setPhotoCropStatus({
        processing: false,
        detected: result.detected,
        text: result.detected ? '✓ AI ครอปใบหน้า' : 'รูปต้นฉบับ'
      });
    } catch (err) {
      console.error('Trigger crop error:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณาระบุชื่อ - นามสกุล');
      return;
    }
    onSave({
      name: name.trim(),
      nickname: nickname.trim(),
      role: role.trim(),
      certNo: certNo.trim(),
      status: status.trim(),
      image
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-y-auto animate-fadeIn">
      <div className={`rounded-3xl shadow-2xl max-w-3xl sm:max-w-4xl w-full overflow-hidden border flex flex-col my-auto transition-all ${
        cardTheme === 'wattvision'
          ? 'bg-[#181818] border-[#2C2C2E] text-white'
          : cardTheme === 'poster'
          ? 'bg-[#041712] border-emerald-800 text-white'
          : 'bg-white border-gray-200 text-gray-800'
      }`}>
        
        {/* Header (ใหญ่และชัดเจน) */}
        <div className={`px-6 sm:px-8 py-5 flex items-center justify-between border-b ${
          cardTheme === 'wattvision'
            ? 'bg-[#1F1F1F] border-[#2C2C2E]'
            : cardTheme === 'poster'
            ? 'bg-[#062019] border-emerald-800/80'
            : 'bg-emerald-50/90 border-emerald-100 text-gray-800'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
              cardTheme === 'wattvision'
                ? 'bg-[#00E5FF] text-[#121212]'
                : cardTheme === 'poster'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-emerald-700 text-white'
            }`}>
              <i className="fa-solid fa-user-pen"></i>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex flex-wrap items-center gap-2">
                <span>แก้ไขข้อมูลผู้ผ่านการอบรม</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  cardTheme === 'wattvision' ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {trainee.id}
                </span>
              </h3>
              <p className={`text-xs sm:text-sm mt-0.5 ${cardTheme === 'wattvision' ? 'text-[#98989D]' : 'text-gray-500'}`}>
                อัปเดตชื่อ รูปถ่าย ตำแหน่ง สถานะ และเลขที่ใบประกาศนียบัตร
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-base border transition cursor-pointer shrink-0 ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E] text-gray-400 hover:text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form Body (กว้างขวาง สบายตา) */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* ส่วนเปลี่ยนรูปภาพ (Photo Update - พร้อมกล่องพรีวิวขนาดใหญ่) */}
          <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center gap-5 ${
            cardTheme === 'wattvision'
              ? 'bg-[#121212] border-[#2C2C2E]'
              : 'bg-stone-50 border-gray-200'
          }`}>
            {/* กล่องแสดงรูปตัวอย่างขนาดใหญ่และคมชัด สัดส่วนการ์ด 4:3.2 */}
            <div className="w-44 sm:w-56 aspect-[4/3.2] rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg shrink-0 relative bg-stone-200 flex flex-col items-center justify-center">
              {isProcessingPhoto ? (
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <i className="fa-solid fa-spinner fa-spin text-3xl text-emerald-600 mb-2"></i>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">AI กำลังตรวจจับ...</p>
                </div>
              ) : (
                <>
                  <img
                    src={image}
                    alt="รูปถ่าย"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                  />
                  {photoCropStatus && (
                    <span className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white text-[10px] px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap ${
                      photoCropStatus.detected ? 'bg-emerald-600 font-bold' : 'bg-stone-700 font-medium'
                    }`}>
                      {photoCropStatus.text}
                    </span>
                  )}
                </>
              )}
            </div>
            
            <div className="flex-1 text-center sm:text-left space-y-2.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-image"></i>
                  <span>อัปเดตรูปถ่ายผู้เข้าอบรม</span>
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  AI MediaPipe Auto Crop
                </span>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">
                เลือกรูปจากเครื่อง AI จะตรวจจับใบหน้าและครอบรูปสัดส่วนให้พอดีกับการ์ดให้อัตโนมัติ (ถอดแบบจากระบบบัตรสมาชิก)
              </p>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={isProcessingPhoto}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <i className="fa-solid fa-arrow-up-from-bracket"></i>
                  <span>เลือกรูปจากเครื่อง</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerMediaPipeCrop}
                  disabled={isProcessingPhoto || !image}
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="ให้ AI MediaPipe ตรวจจับและครอบภาพปัจจุบันใหม่อีกครั้ง"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-amber-300"></i>
                  <span>AI ครอปหน้านี้</span>
                </button>

                {onOpenCrop && (
                  <button
                    type="button"
                    onClick={() => onOpenCrop({ ...trainee, image, name, nickname })}
                    className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                      cardTheme === 'wattvision'
                        ? 'bg-[#1E1E1E] hover:bg-[#252525] border-[#2C2C2E] text-[#00E5FF]'
                        : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
                    }`}
                  >
                    <i className="fa-solid fa-crop-simple text-amber-500"></i>
                    <span>ปรับจุดครอบเอง</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ฟิลด์กรอกข้อมูล (Grid 2 คอลัมน์ ขนาดฟอนต์และ Input ใหญ่ขึ้น) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-sm">
            <div>
              <label className="block font-bold text-xs sm:text-sm mb-1.5 opacity-90">
                ชื่อ - นามสกุลจริง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น นายสมชาย ใจดี"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#141414] border-[#2C2C2E] text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-xs sm:text-sm mb-1.5 opacity-90">
                ชื่อเล่น
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="เช่น คุณชาย"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#141414] border-[#2C2C2E] text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-xs sm:text-sm mb-1.5 opacity-90">
                ตำแหน่งในรุ่น
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="เช่น สมาชิก, ประธานรุ่นที่ 1"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#141414] border-[#2C2C2E] text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-xs sm:text-sm mb-1.5 opacity-90">
                สถานะการอบรม
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#141414] border-[#2C2C2E] text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="จบหลักสูตร">จบหลักสูตร</option>
                <option value="ผ่านการอบรม">ผ่านการอบรม</option>
                <option value="อยู่ระหว่างฝึกอบรม">อยู่ระหว่างฝึกอบรม</option>
                <option value="เกียรตินิยม">เกียรตินิยม</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-xs sm:text-sm mb-1.5 opacity-90">
                เลขที่ใบรับรอง (Certificate No.)
              </label>
              <input
                type="text"
                value={certNo}
                onChange={(e) => setCertNo(e.target.value)}
                placeholder="เช่น TBA-CERT-2026-0101"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm sm:text-base font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#141414] border-[#2C2C2E] text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border transition cursor-pointer ${
                cardTheme === 'wattvision'
                  ? 'bg-[#252525] hover:bg-[#303030] text-gray-300 border-[#2C2C2E]'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>บันทึกการเปลี่ยนแปลง</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

/**
 * หน้าต่างยืนยันการลบรายชื่อผู้เข้าอบรม
 */
function DeleteConfirmModal({
  trainee,
  cardTheme,
  onConfirm,
  onClose
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className={`rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border p-6 text-center transform transition-all ${
        cardTheme === 'wattvision'
          ? 'bg-[#1E1E1E] border-[#2C2C2E] text-white'
          : 'bg-white border-gray-200 text-gray-800'
      }`}>
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center text-2xl mb-4">
          <i className="fa-solid fa-trash-can"></i>
        </div>

        <h3 className="text-lg font-bold">ยืนยันการลบรายชื่อ?</h3>
        <p className={`text-sm mt-1 ${cardTheme === 'wattvision' ? 'text-gray-300' : 'text-gray-600'}`}>
          คุณต้องการลบ <strong>{trainee.name} {trainee.nickname ? `(${trainee.nickname})` : ''}</strong> ออกจากทำเนียบผู้ผ่านการอบรมหรือไม่?
        </p>
        <p className="text-[11px] opacity-60 mt-1">
          (ระบบจะซ่อนข้อมูลท่านนี้ออกจากหน้าเว็บ โดยคุณสามารถกู้คืนกลับมาได้ตลอดเวลา)
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              cardTheme === 'wattvision'
                ? 'bg-[#252525] hover:bg-[#303030] text-gray-300 border-[#2C2C2E]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trainee)}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-trash-can"></i>
            <span>ยืนยันการลบ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * หน้าต่างรายการรายชื่อที่ถูกลบ สามารถเลือกกดกู้คืนรายชื่อได้
 */
function DeletedListModal({
  deletedIds,
  allTrainees,
  cardTheme,
  onRestore,
  onRestoreAll,
  onClose
}) {
  const deletedTrainees = deletedIds.map(id => {
    const found = allTrainees.find(t => t.id === id);
    return found || { id, name: `ผู้เข้าอบรมรหัส ${id}`, nickname: '' };
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className={`rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border p-5 flex flex-col ${
        cardTheme === 'wattvision'
          ? 'bg-[#1E1E1E] border-[#2C2C2E] text-white'
          : 'bg-white border-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-base font-bold">รายชื่อที่ถูกลบ ({deletedTrainees.length} ท่าน)</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-sm">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="my-4 max-h-72 overflow-y-auto space-y-2 pr-1">
          {deletedTrainees.map(t => (
            <div key={t.id} className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-900 border-gray-200 dark:border-gray-800">
              <div className="overflow-hidden text-left">
                <div className="text-xs font-bold truncate">{t.name}</div>
                <div className="text-[11px] opacity-70 truncate font-mono">{t.id} {t.nickname ? `(${t.nickname})` : ''}</div>
              </div>
              <button
                type="button"
                onClick={() => onRestore(t.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-rotate-left text-[10px]"></i>
                <span>กู้คืน</span>
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t text-xs">
          <button
            type="button"
            onClick={onRestoreAll}
            className="text-rose-600 hover:underline font-semibold cursor-pointer"
          >
            กู้คืนทั้งหมด
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

function BonsaiTraineeChart() {
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'org'

  // สไตล์การออกแบบ: 'light' (สว่าง โทนสีขาว) | 'wattvision' | 'poster'
  const [cardTheme, setCardTheme] = useState('light');

  // รายการพิกัดครอบรูปที่ผู้ใช้กำหนดเองจากการกดรูปภาพ (บันทึกจำใน LocalStorage)
  const [customCropMap, setCustomCropMap] = useState(() => {
    try {
      const saved = localStorage.getItem('bonsai_custom_crops');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // รายการผู้เข้าอบรมที่ถูกแก้ไขข้อมูล (ชื่อ, ชื่อเล่น, บทบาท, รูปถ่าย ฯลฯ)
  const [editedTrainees, setEditedTrainees] = useState(() => {
    try {
      const saved = localStorage.getItem('bonsai_edited_trainees');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // รายการรหัส ID ของผู้เข้าอบรมที่ถูกลบ
  const [deletedTraineeIds, setDeletedTraineeIds] = useState(() => {
    try {
      const saved = localStorage.getItem('bonsai_deleted_trainees');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // ผู้เข้าอบรมที่กำลังแก้ไขข้อมูล
  const [editingTrainee, setEditingTrainee] = useState(null);

  // ผู้เข้าอบรมที่กำลังขอยืนยันการลบ
  const [deletingTrainee, setDeletingTrainee] = useState(null);

  // แสดงหน้าต่างรายการที่ถูกลบเพื่อกู้คืน
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  // ผู้ผ่านการอบรมที่กำลังเปิดหน้าต่างปรับแต่งการครอบรูป (Interactive Crop Modal)
  const [croppingTrainee, setCroppingTrainee] = useState(null);

  // โหมดการกระทำเมื่อกดรูป: 'crop' (กดรูปเพื่อครอบรูปทันที) | 'view' (กดรูปเพื่อดูประวัติ)
  const [clickAction, setClickAction] = useState('crop');

  // ข้อความแจ้งเตือนเมื่อบันทึกจุดครอบรูปสำเร็จ
  const [cropToast, setCropToast] = useState(null);

  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncingToGoogle, setIsSyncingToGoogle] = useState(false);
  const [dataSource, setDataSource] = useState('local'); // 'local' | 'google'
  const [lastScanTime, setLastScanTime] = useState(null);
  const [newImageAlert, setNewImageAlert] = useState(null);

  // สถานะข้อมูลรุ่นและผู้ผ่านการอบรม (รองรับ Stale-While-Revalidate โหลดพรีวิวทันทีใน 0 วินาที)
  const [batches, setBatches] = useState(() => {
    try {
      const cached = localStorage.getItem('bonsai_cached_batches');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_BATCH_METADATA.map((b) => ({
      ...b,
      trainees: []
    }));
  });

  const prevImageCounts = useRef({});

  // ฟังก์ชันค้นหาและดึงพิกัดจุดโฟกัสครอบรูปที่แม่นยำที่สุดของผู้เข้าอบรมท่านนี้
  const getTraineeCrop = useCallback((trainee) => {
    if (!trainee) return { x: 50, y: 25, scale: 1.85 };
    const id = typeof trainee === 'object' ? trainee.id : null;
    const rawFname = typeof trainee === 'object' ? (trainee.filename || (trainee.image ? trainee.image.split('/').pop() : '')) : trainee;
    const cleanFname = rawFname ? rawFname.split('?')[0].split('#')[0] : '';

    // 1. ตรวจสอบจาก customCropMap โดยใช้ trainee ID (แม่นยำสูงสุด ไม่ซ้ำกันแน่นอน)
    if (id && customCropMap[id]) return customCropMap[id];

    // 2. ตรวจสอบจาก customCropMap โดยใช้ชื่อไฟล์
    if (cleanFname && customCropMap[cleanFname]) return customCropMap[cleanFname];

    // 3. ตรวจสอบจากข้อมูลใน trainee (เช่น ดึงมาจาก Google Sheets / editedTrainees)
    if (typeof trainee === 'object' && trainee.cropFocusX !== undefined && trainee.cropFocusX !== '' && !isNaN(Number(trainee.cropFocusX))) {
      return {
        x: Number(trainee.cropFocusX),
        y: Number(trainee.cropFocusY),
        scale: Number(trainee.cropScale || 1.85)
      };
    }

    // 4. ตรวจสอบจากพิกัดมาตรฐานของระบบ (FACE_FOCUS_MAP) ที่คำนวณไว้ตรงกลางสำหรับทุกรูป
    if (cleanFname && FACE_FOCUS_MAP[cleanFname]) return FACE_FOCUS_MAP[cleanFname];

    // 5. ค่าเริ่มต้นตรงกลางมาตรฐาน
    return { x: 50, y: 25, scale: 1.85 };
  }, [customCropMap]);

  // บันทึกและปรับปรุงจุดครอบรูปของผู้ใช้ลงใน State และ LocalStorage พร้อมนำรูปที่ครอบแล้วไปอัปเดตแทนรูปเดิม
  const handleSaveCustomCrop = (trainee, cropData) => {
    if (!trainee) return;
    const id = trainee.id;
    const rawFname = trainee.filename || (trainee.image ? trainee.image.split('/').pop() : '');
    const cleanFname = rawFname ? rawFname.split('?')[0].split('#')[0] : '';
    const newImage = cropData.croppedImage || trainee.image;

    // 1. บันทึกลง customCropMap ทั้งแบบ ID และ Clean Filename
    setCustomCropMap((prev) => {
      const updated = {
        ...prev,
        ...(id ? { [id]: cropData } : {}),
        ...(cleanFname ? { [cleanFname]: cropData } : {})
      };
      try {
        localStorage.setItem('bonsai_custom_crops', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. อัปเดต batches ทันทีเพื่อให้ UI อัปเดตใน 0ms และเก็บรูปใหม่ลง LocalStorage
    setBatches((prevBatches) => {
      const updated = prevBatches.map(b => ({
        ...b,
        trainees: b.trainees.map(t => {
          if (t.id === id || (cleanFname && t.filename === cleanFname)) {
            return {
              ...t,
              image: newImage,
              cropFocusX: cropData.x,
              cropFocusY: cropData.y,
              cropScale: cropData.scale
            };
          }
          return t;
        })
      }));
      try {
        localStorage.setItem('bonsai_cached_batches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 3. บันทึกลง editedTrainees เพื่อให้ filteredBatches อัปเดตรูปใหม่แทนรูปเดิมทันที
    if (id) {
      setEditedTrainees((prev) => {
        const up = {
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            image: newImage,
            cropFocusX: cropData.x,
            cropFocusY: cropData.y,
            cropScale: cropData.scale
          }
        };
        try {
          localStorage.setItem('bonsai_edited_trainees', JSON.stringify(up));
        } catch (e) {}
        return up;
      });
    }

    // 4. ซิงค์รูปที่ครอบแล้วไปยัง Google Sheets / Google Drive เบื้องหลัง
    try {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveTrainee',
          id: trainee.id,
          batch: trainee.batch ? trainee.batch.id : 1,
          name: trainee.name,
          nickname: trainee.nickname,
          photoBase64: newImage && newImage.startsWith('data:') ? newImage : undefined,
          cropFocusX: cropData.x,
          cropFocusY: cropData.y,
          cropScale: cropData.scale
        })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success' && resData.photoUrl) {
          setEditedTrainees(prev => {
            const up = { ...prev, [id]: { ...(prev[id] || {}), image: formatDriveImageUrl(resData.photoUrl) } };
            try { localStorage.setItem('bonsai_edited_trainees', JSON.stringify(up)); } catch (e) {}
            return up;
          });
        }
      })
      .catch(e => console.warn('Background sync crop notice:', e));
    } catch (e) {}

    setCropToast(`ครอบรูปและอัปเดตแทนรูปเดิมของ ${trainee.name || trainee.nickname || 'รูปนี้'} เรียบร้อยแล้ว`);
    setTimeout(() => setCropToast(null), 4500);
  };

  // รีเซ็ตจุดครอบรูปเฉพาะภาพนี้กลับเป็นค่าเริ่มต้น
  const handleResetCustomCrop = (trainee) => {
    if (!trainee) return;
    const id = trainee.id;
    const rawFname = trainee.filename || (trainee.image ? trainee.image.split('/').pop() : '');
    const cleanFname = rawFname ? rawFname.split('?')[0].split('#')[0] : '';

    setCustomCropMap((prev) => {
      const updated = { ...prev };
      if (id) delete updated[id];
      if (cleanFname) delete updated[cleanFname];
      try {
        localStorage.setItem('bonsai_custom_crops', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (id) {
      setEditedTrainees((prev) => {
        const up = { ...prev };
        if (up[id]) {
          delete up[id].cropFocusX;
          delete up[id].cropFocusY;
          delete up[id].cropScale;
        }
        try {
          localStorage.setItem('bonsai_edited_trainees', JSON.stringify(up));
        } catch (e) {}
        return up;
      });
    }
  };

  // บันทึกการแก้ไขข้อมูลผู้ผ่านการอบรม (อัปเดต LocalStorage และซิงค์ Google Sheets/Drive ทันที)
  const handleSaveTrainee = (traineeId, updatedData) => {
    setEditedTrainees((prev) => {
      const updated = {
        ...prev,
        [traineeId]: {
          ...(prev[traineeId] || {}),
          ...updatedData
        }
      };
      try {
        localStorage.setItem('bonsai_edited_trainees', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // ส่งข้อมูลไปบันทึกใน Google Sheets และอัปโหลดรูปลง Google Drive เบื้องหลัง
    try {
      const foundT = allRawTrainees.find(item => item.id === traineeId) || {};
      const batchId = foundT.batch ? foundT.batch.id : 1;
      const crop = getTraineeCrop(foundT);

      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveTrainee',
          id: traineeId,
          batch: batchId,
          name: updatedData.name || foundT.name,
          nickname: updatedData.nickname || foundT.nickname,
          role: updatedData.role || foundT.role,
          certNo: updatedData.certNo || foundT.certNo,
          status: updatedData.status || foundT.status,
          photoBase64: updatedData.image && updatedData.image.startsWith('data:') ? updatedData.image : undefined,
          oldPhotoUrl: foundT.image && foundT.image.includes('drive.google.com') ? foundT.image : undefined,
          cropFocusX: crop.x,
          cropFocusY: crop.y,
          cropScale: crop.scale
        })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success' && resData.photoUrl) {
          setEditedTrainees(prev => {
            const up = { ...prev, [traineeId]: { ...(prev[traineeId] || {}), image: formatDriveImageUrl(resData.photoUrl) } };
            try { localStorage.setItem('bonsai_edited_trainees', JSON.stringify(up)); } catch (e) {}
            return up;
          });
        }
      })
      .catch(e => console.warn('Google Sheets background sync notice:', e));
    } catch (e) {}

    setCropToast(`อัปเดตข้อมูลของ ${updatedData.name || traineeId} เรียบร้อยแล้ว`);
    setTimeout(() => setCropToast(null), 4500);
    setEditingTrainee(null);
    setSelectedTrainee(null);
  };

  // ยืนยันการลบผู้ผ่านการอบรม (ซ่อนจาก UI และส่งลบใน Google Sheets)
  const handleConfirmDelete = (trainee) => {
    setDeletedTraineeIds((prev) => {
      const updated = [...new Set([...prev, trainee.id])];
      try {
        localStorage.setItem('bonsai_deleted_trainees', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // ส่งลบใน Google Sheets เบื้องหลัง
    try {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteTrainee',
          id: trainee.id
        })
      }).catch(e => console.warn('Google Sheets delete notice:', e));
    } catch (e) {}

    setCropToast(`ลบ ${trainee.name} เรียบร้อยแล้ว (สามารถกู้คืนได้จากปุ่มถังขยะ)`);
    setTimeout(() => setCropToast(null), 6000);
    setDeletingTrainee(null);
    setSelectedTrainee(null);
  };

  // ซิงค์นำเข้าข้อมูลผู้เข้าอบรมและรูปภาพทั้งหมดขึ้น Google Drive & Google Sheets ในคราวเดียว
  const handleSyncAllToGoogle = async () => {
    if (isSyncingToGoogle) return;
    setIsSyncingToGoogle(true);
    setCropToast('☁️ กำลังเตรียมรูปถ่ายและข้อมูลผู้เข้าอบรมเพื่อซิงค์ขึ้น Google Drive & Sheets...');

    try {
      const allToSync = [];
      for (const batch of batches) {
        for (const trainee of batch.trainees) {
          let base64 = null;
          // ถ้าเป็นรูปไฟล์ในโฟลเดอร์เครื่อง ให้ fetch และแปลงเป็น Base64
          if (trainee.image && !trainee.image.includes('drive.google.com')) {
            try {
              const res = await fetch(trainee.image);
              if (res.ok) {
                const blob = await res.blob();
                base64 = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
              }
            } catch (err) {}
          }

          const crop = getTraineeCrop(trainee);

          allToSync.push({
            id: trainee.id,
            batch: batch.id,
            name: trainee.name,
            nickname: trainee.nickname,
            role: trainee.role,
            certNo: trainee.certNo,
            status: trainee.status,
            filename: trainee.filename || `${trainee.id}.jpg`,
            photoUrl: trainee.image.includes('drive.google.com') ? trainee.image : '',
            photoBase64: base64,
            cropFocusX: crop.x,
            cropFocusY: crop.y,
            cropScale: crop.scale
          });
        }
      }

      if (allToSync.length === 0) {
        setCropToast('ไม่พบข้อมูลที่จะซิงค์');
        setIsSyncingToGoogle(false);
        return;
      }

      // ทยอยส่งทีละ 4 คนเพื่อป้องกัน payload ใหญ่เกินไป
      const chunkSize = 4;
      let totalSuccess = 0;

      for (let i = 0; i < allToSync.length; i += chunkSize) {
        const chunk = allToSync.slice(i, i + chunkSize);
        setCropToast(`☁️ กำลังอัปโหลดรูปภาพลง Google Drive และบันทึกลง Google Sheets (${i + 1}/${allToSync.length} คน)...`);

        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'syncAllTrainees',
            trainees: chunk
          })
        });

        const resData = await res.json();
        if (resData.status === 'success') {
          totalSuccess += chunk.length;
        }
      }

      setDataSource('google');
      setCropToast(`🎉 ซิงค์ข้อมูล ${totalSuccess} ท่านเข้า Google Sheets และ Google Drive สำเร็จเรียบร้อย!`);
      setTimeout(() => setCropToast(null), 6000);
      scanFolderImages(true);
    } catch (err) {
      console.error('Sync to Google failed:', err);
      setCropToast(`❌ เกิดข้อผิดพลาดในการซิงค์: ${err.message}`);
      setTimeout(() => setCropToast(null), 6000);
    } finally {
      setIsSyncingToGoogle(false);
    }
  };

  // กู้คืนรายชื่อที่เคยลบ
  const handleRestoreTrainee = (traineeId) => {
    setDeletedTraineeIds((prev) => {
      const updated = prev.filter(id => id !== traineeId);
      try {
        localStorage.setItem('bonsai_deleted_trainees', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setCropToast(`กู้คืนรายชื่อเรียบร้อยแล้ว`);
    setTimeout(() => setCropToast(null), 4500);
  };

  // สแกนและตรวจจับใบหน้าทุกรูปในรุ่นด้วย MediaPipe Face Detection ให้พอดีกับการ์ดอัตโนมัติ
  const [isEnhancingAI, setIsEnhancingAI] = useState(false);
  const handleAutoEnhanceAllWithAI = async () => {
    if (isEnhancingAI) return;
    setIsEnhancingAI(true);
    setCropToast('⚡ AI MediaPipe กำลังสแกนและจัดตำแหน่งใบหน้าของทุกท่านให้พอดีกับการ์ด...');
    
    try {
      let count = 0;
      const updatedBatches = await Promise.all(
        batches.map(async (batch) => {
          const updatedTrainees = await Promise.all(
            batch.trainees.map(async (t) => {
              if (t.image && !t.image.startsWith('data:')) {
                try {
                  const res = await cropFaceWithMediaPipe(t.image);
                  if (res.detected && res.cropBox) {
                    count++;
                    return {
                      ...t,
                      cropFocusX: res.cropBox.fxPercent,
                      cropFocusY: res.cropBox.fyPercent
                    };
                  }
                } catch (e) {}
              }
              return t;
            })
          );
          return { ...batch, trainees: updatedTrainees };
        })
      );

      setBatches(updatedBatches);
      try { localStorage.setItem('bonsai_cached_batches', JSON.stringify(updatedBatches)); } catch (e) {}
      setCropToast(`✓ AI MediaPipe จัดตำแหน่งใบหน้าผู้เข้าอบรม ${count} ท่านให้พอดีกับการ์ดเรียบร้อยแล้ว!`);
      setTimeout(() => setCropToast(null), 5000);
    } catch (e) {
      console.warn('Auto AI enhance error:', e);
    } finally {
      setIsEnhancingAI(false);
    }
  };

  // กู้คืนรายชื่อทั้งหมด
  const handleRestoreAll = () => {
    setDeletedTraineeIds([]);
    try {
      localStorage.removeItem('bonsai_deleted_trainees');
    } catch (e) {}
    setShowDeletedModal(false);
    setCropToast('กู้คืนรายชื่อทั้งหมดเรียบร้อยแล้ว');
    setTimeout(() => setCropToast(null), 4500);
  };

  // บันทึกการเลือกธีมลง LocalStorage
  const handleThemeChange = (newTheme) => {
    setCardTheme(newTheme);
    try {
      localStorage.setItem('bonsai_theme_mode', newTheme);
    } catch (e) {}
  };

  // ปรับพื้นหลังของ body และ top-nav ให้กลมกลืนกับธีมที่เลือก
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const nav = document.getElementById('top-nav');
      if (cardTheme === 'wattvision') {
        document.body.style.backgroundColor = '#121212';
        if (nav) {
          nav.style.backgroundColor = '#1E1E1E';
          nav.style.borderColor = '#2C2C2E';
        }
      } else if (cardTheme === 'poster') {
        document.body.style.backgroundColor = '#030e0c';
        if (nav) {
          nav.style.backgroundColor = '#062019';
          nav.style.borderColor = '#092b23';
        }
      } else {
        document.body.style.backgroundColor = '#FFFFFF';
        if (nav) {
          nav.style.backgroundColor = '#FFFFFF';
          nav.style.borderColor = '#E5E7EB';
        }
      }
    }
  }, [cardTheme]);

  // ฟังก์ชันสแกนโฟลเดอร์รูปภาพอัตโนมัติ
  const scanFolderImages = useCallback(async (isManual = false) => {
    if (isManual) setIsScanning(true);

    try {
      // ⚡ ระดับที่ 1: ดึงผ่าน Google Sheets CSV Link (เร็วที่สุด ระดับ 100-300ms)
      const currentSheetId = GOOGLE_SPREADSHEET_ID || (typeof localStorage !== 'undefined' ? localStorage.getItem('BONSAI_SPREADSHEET_ID') : '');
      if (currentSheetId) {
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${currentSheetId}/gviz/tq?tqx=out:csv&sheet=Trainees&_t=${Date.now()}`;
          const csvRes = await fetch(csvUrl);
          if (csvRes.ok) {
            const csvText = await csvRes.text();
            const csvRows = parseCSV(csvText);
            if (Array.isArray(csvRows) && csvRows.length > 0 && csvRows.some(t => t.batch !== undefined || t.id !== undefined)) {
              const updatedBatches = INITIAL_BATCH_METADATA.map((batch) => {
                const traineesInBatch = csvRows
                  .filter((t) => Number(t.batch) === batch.id)
                  .map((t, index) => {
                    const fname = t.photoUrl ? t.photoUrl.split('/').pop() : `${t.id}.jpg`;
                    return {
                      id: t.id || `BKK-0${batch.id}-${String(index + 1).padStart(2, '0')}`,
                      name: t.name,
                      nickname: t.nickname,
                      role: t.role || (index === 0 ? `ประธานรุ่นที่ ${batch.id}` : 'สมาชิก'),
                      filename: fname,
                      image: formatDriveImageUrl(t.photoUrl) || 'sample-member.jpg',
                      treeSpecies: 'บอนไซศิลปะสร้างสรรค์',
                      status: t.status || 'จบหลักสูตร',
                      certNo: t.certNo || `TBA-CERT-2026-0${batch.id}${String(index + 1).padStart(2, '0')}`,
                      highlight: 'ผ่านการฝึกอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ',
                      cropFocusX: (t.cropFocusX !== undefined && t.cropFocusX !== '' && !isNaN(Number(t.cropFocusX))) ? Number(t.cropFocusX) : undefined,
                      cropFocusY: (t.cropFocusY !== undefined && t.cropFocusY !== '' && !isNaN(Number(t.cropFocusY))) ? Number(t.cropFocusY) : undefined,
                      cropScale: (t.cropScale !== undefined && t.cropScale !== '' && !isNaN(Number(t.cropScale))) ? Number(t.cropScale) : undefined
                    };
                  });

                return {
                  ...batch,
                  trainees: traineesInBatch
                };
              });

              setBatches(updatedBatches);
              setDataSource('google');
              setLastScanTime(new Date());
              try { localStorage.setItem('bonsai_cached_batches', JSON.stringify(updatedBatches)); } catch (e) {}
              return;
            }
          }
        } catch (csvErr) {
          console.warn('CSV Link fetch notice, falling back to Apps Script:', csvErr);
        }
      }

      // 🌐 ระดับที่ 2: ดึงข้อมูลผ่าน Google Apps Script Web App (พร้อมสืบค้น Spreadsheet ID อัตโนมัติ)
      try {
        const gsRes = await fetch(`${GOOGLE_SCRIPT_URL}?action=getTrainees&_t=${Date.now()}`);
        if (gsRes.ok) {
          const gsData = await gsRes.json();
          // ตรวจสอบว่าเป็นข้อมูลผู้เข้าอบรมจริง (มีฟิลด์ batch) ไม่ใช่รายชื่อสมาชิกทั่วไป
          if (Array.isArray(gsData) && gsData.length > 0 && gsData.some(t => t.batch !== undefined)) {
            const updatedBatches = INITIAL_BATCH_METADATA.map((batch) => {
              const traineesInBatch = gsData
                .filter((t) => Number(t.batch) === batch.id)
                .map((t, index) => {
                  const fname = t.photoUrl ? t.photoUrl.split('/').pop() : `${t.id}.jpg`;
                  return {
                    id: t.id || `BKK-0${batch.id}-${String(index + 1).padStart(2, '0')}`,
                    name: t.name,
                    nickname: t.nickname,
                    role: t.role || (index === 0 ? `ประธานรุ่นที่ ${batch.id}` : 'สมาชิก'),
                    filename: fname,
                    image: formatDriveImageUrl(t.photoUrl) || 'sample-member.jpg',
                    treeSpecies: 'บอนไซศิลปะสร้างสรรค์',
                    status: t.status || 'จบหลักสูตร',
                    certNo: t.certNo || `TBA-CERT-2026-0${batch.id}${String(index + 1).padStart(2, '0')}`,
                    highlight: 'ผ่านการฝึกอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ',
                    cropFocusX: (t.cropFocusX !== undefined && t.cropFocusX !== '' && !isNaN(Number(t.cropFocusX))) ? Number(t.cropFocusX) : undefined,
                    cropFocusY: (t.cropFocusY !== undefined && t.cropFocusY !== '' && !isNaN(Number(t.cropFocusY))) ? Number(t.cropFocusY) : undefined,
                    cropScale: (t.cropScale !== undefined && t.cropScale !== '' && !isNaN(Number(t.cropScale))) ? Number(t.cropScale) : undefined
                  };
                });

              return {
                ...batch,
                trainees: traineesInBatch
              };
            });

            setBatches(updatedBatches);
            setDataSource('google');
            setLastScanTime(new Date());
            try { localStorage.setItem('bonsai_cached_batches', JSON.stringify(updatedBatches)); } catch (e) {}

            // พยายามสืบค้น Spreadsheet ID อัตโนมัติเพื่อใช้ CSV Link ในครั้งถัดไป
            if (!currentSheetId) {
              fetch(`${GOOGLE_SCRIPT_URL}?action=getInfo`)
                .then(r => r.json())
                .then(info => {
                  if (info && info.spreadsheetId) {
                    try { localStorage.setItem('BONSAI_SPREADSHEET_ID', info.spreadsheetId); } catch (e) {}
                  }
                })
                .catch(() => {});
            }

            return;
          }
        }
      } catch (err) {}

      // 💾 ระดับที่ 3: หากยังไม่มีข้อมูลใน Google Sheets ให้สแกนจากโฟลเดอร์ภาพในเครื่อง
      setDataSource('local');
      const manifestUrl = `bangkokimage/manifest.json?_t=${Date.now()}`;
      let manifestData = null;

      try {
        const manifestRes = await fetch(manifestUrl, { cache: 'no-store' });
        if (manifestRes.ok) {
          manifestData = await manifestRes.json();
        }
      } catch (e) {}

      const updatedBatches = await Promise.all(
        INITIAL_BATCH_METADATA.map(async (batch) => {
          let imageFiles = [];

          // 1. ลองดึงจาก Directory Listing ของโฟลเดอร์โดยตรง (/bangkokimage/1/)
          try {
            const dirUrl = `bangkokimage/${batch.folderNum}/`;
            const dirRes = await fetch(dirUrl, { cache: 'no-store' });
            if (dirRes.ok) {
              const html = await dirRes.text();
              const regex = /href=["']([^"']+\.(?:jpe?g|png|webp|gif|jfif))["']/gi;
              let match;
              while ((match = regex.exec(html)) !== null) {
                const fname = decodeURIComponent(match[1].split('/').pop().split('?')[0]);
                if (fname && !imageFiles.includes(fname)) {
                  imageFiles.push(fname);
                }
              }
            }
          } catch (err) {}

          // 2. รวมกับไฟล์จาก manifest.json (ถ้ามี)
          if (manifestData && manifestData[batch.folderNum]) {
            manifestData[batch.folderNum].forEach((fname) => {
              if (fname && !imageFiles.includes(fname)) {
                imageFiles.push(fname);
              }
            });
          }

          if (imageFiles.length === 0) {
            imageFiles = ['trainee_01.jpg'];
          }

          imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

          const trainees = imageFiles.map((fname, index) => {
            const tr = parseTraineeFromFilename(fname, index, batch.id);
            const crop = (customCropMap && (customCropMap[tr.id] || customCropMap[fname])) || FACE_FOCUS_MAP[fname];
            if (crop) {
              tr.cropFocusX = crop.x;
              tr.cropFocusY = crop.y;
              tr.cropScale = crop.scale;
            }
            return tr;
          });

          return {
            ...batch,
            trainees
          };
        })
      );

      let addedDiff = 0;
      updatedBatches.forEach((b) => {
        const prev = prevImageCounts.current[b.id] || 0;
        if (prev > 0 && b.trainees.length > prev) {
          addedDiff += b.trainees.length - prev;
        }
        prevImageCounts.current[b.id] = b.trainees.length;
      });

      setBatches(updatedBatches);
      setLastScanTime(new Date());

      if (addedDiff > 0) {
        setNewImageAlert(`ตรวจพบรูปใหม่เพิ่มเข้ามา ${addedDiff} รูป! เรนเดอร์บนหน้าเว็บให้ทันทีแล้ว`);
        setTimeout(() => setNewImageAlert(null), 6000);
      }
    } catch (error) {
      console.error('Error scanning folder images:', error);
    } finally {
      if (isManual) {
        setTimeout(() => setIsScanning(false), 400);
      }
    }
  }, []);

  // Auto-scan ทุก 4 วินาที และเมื่อสลับกลับมาที่หน้าต่าง
  useEffect(() => {
    scanFolderImages();
    const interval = setInterval(() => {
      scanFolderImages(false);
    }, 4000);

    const handleFocus = () => scanFolderImages(false);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [scanFolderImages]);

  // คำนวณยอดรวมสถิติ (หักคนที่ถูกลบออก)
  const totalTrainees = useMemo(() => {
    return batches.reduce((acc, batch) => {
      const active = batch.trainees.filter(t => !deletedTraineeIds.includes(t.id));
      return acc + active.length;
    }, 0);
  }, [batches, deletedTraineeIds]);

  // รวมรายชื่อเดิมทั้งหมดสำหรับใช้ในหน้าต่างถังขยะ/กู้คืน
  const allRawTrainees = useMemo(() => {
    return batches.flatMap(b => b.trainees);
  }, [batches]);

  // กรองข้อมูลตามรุ่น คำค้นหา และผสานการแก้ไข/ลบ
  const filteredBatches = useMemo(() => {
    return batches
      .filter((batch) => {
        if (selectedBatchId !== 'all' && batch.id !== Number(selectedBatchId)) {
          return false;
        }
        return true;
      })
      .map((batch) => {
        const trainees = batch.trainees
          .filter((t) => !deletedTraineeIds.includes(t.id))
          .map((t) => {
            const edit = editedTrainees[t.id];
            return edit ? { ...t, ...edit } : t;
          })
          .filter((t) => {
            if (!searchTerm.trim()) return true;
            const q = searchTerm.toLowerCase();
            return (
              t.name.toLowerCase().includes(q) ||
              t.id.toLowerCase().includes(q) ||
              (t.nickname && t.nickname.toLowerCase().includes(q)) ||
              batch.batchNumber.toLowerCase().includes(q)
            );
          });
        return { ...batch, trainees };
      })
      .filter((batch) => batch.trainees.length > 0);
  }, [batches, selectedBatchId, searchTerm, editedTrainees, deletedTraineeIds]);

  // คำนวณ Style การจัดวางรูปภาพให้อยู่กึ่งกลางการ์ดรูปภาพแบบ 100% (ไร้ขอบขาว ไม่มั่ว ตรงหน้าคนพอดี)
  const getImageStyle = useCallback((trainee) => {
    if (!trainee) return { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' };
    
    // หากรูปภาพผ่านการครอบจริงแล้ว (Base64 หรือ Blob) ให้แสดงเต็มกรอบตรงกลาง 100% สวยงามทันที
    if (trainee.image && (trainee.image.startsWith('data:') || trainee.image.startsWith('blob:'))) {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center'
      };
    }

    const focus = getTraineeCrop(trainee);
    const x = focus.x !== undefined ? focus.x : 50;
    const y = focus.y !== undefined ? focus.y : 20;

    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: `${x}% ${y}%`,
      transition: 'object-position 0.25s ease'
    };
  }, [getTraineeCrop]);

  return (
    <div className={`min-h-screen font-sans pb-16 transition-colors duration-300 ${
      cardTheme === 'wattvision'
        ? 'bg-[#121212] text-white'
        : cardTheme === 'poster'
        ? 'bg-[#030e0c] text-white'
        : 'bg-white text-gray-800'
    }`}>
      
      {/* Toast แจ้งเตือนเมื่อบันทึกจุดครอบรูปสำเร็จ */}
      {cropToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 text-sm">
            <i className="fa-solid fa-circle-check text-lg text-emerald-400"></i>
            <div>
              <p className="font-bold text-white">{cropToast}</p>
              <p className="text-xs text-emerald-200">ระบบบันทึกและแสดงผลการครอบรูปตำแหน่งนี้ทันทีแล้ว</p>
            </div>
            <button
              onClick={() => setCropToast(null)}
              className="ml-2 text-emerald-300 hover:text-white"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* Toast แจ้งเตือนเมื่อตรวจพบรูปภาพใหม่ */}
      {newImageAlert && (
        <div className="fixed top-16 right-4 z-50 animate-bounce">
          <div className="bg-[#1E1E1E] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#00E5FF] flex items-center gap-3 text-sm">
            <i className="fa-solid fa-bolt text-lg text-[#00E5FF]"></i>
            <div>
              <p className="font-bold text-[#00E5FF]">{newImageAlert}</p>
              <p className="text-xs text-[#98989D]">ระบบดึงภาพและครอบโซนหน้าให้อัตโนมัติแล้ว</p>
            </div>
            <button
              onClick={() => setNewImageAlert(null)}
              className="ml-2 text-gray-400 hover:text-white"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Banner */}
      <header className={`border-b transition-colors duration-300 ${
        cardTheme === 'wattvision'
          ? 'bg-[#1E1E1E] border-[#2C2C2E] text-white'
          : cardTheme === 'poster'
          ? 'bg-gradient-to-b from-[#062019] via-[#041712] to-[#020b08] border-emerald-900/80 text-white'
          : 'bg-gradient-to-b from-white via-emerald-50/40 to-white border-emerald-100 text-gray-800'
      }`}>
        <div className="max-w-[96%] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-9">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md border flex items-center justify-center shrink-0 ${
                cardTheme === 'wattvision'
                  ? 'bg-[#141414] border-[#2C2C2E]'
                  : cardTheme === 'poster'
                  ? 'bg-slate-900 border-emerald-600/50'
                  : 'bg-white border-emerald-200'
              }`}>
                <img
                  src="bangkok-bonsai-logo.jpg"
                  alt="บางกอกบอนไซ"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'logo.png';
                  }}
                />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  cardTheme === 'wattvision'
                    ? 'text-white'
                    : cardTheme === 'poster'
                    ? 'text-amber-300 drop-shadow'
                    : 'text-emerald-950'
                }`}>
                  ทำเนียบผู้ผ่านการอบรมศิลปะบอนไซ
                </h1>
                <p className={`text-xs sm:text-sm mt-1 ${
                  cardTheme === 'wattvision' ? 'text-[#98989D]' : cardTheme === 'poster' ? 'text-emerald-200/90' : 'text-gray-600'
                }`}>
                  สวนบางกอกบอนไซ ไร่อริยะ กาญจนบุรี • สมาคมบอนไซไทย
                </p>
              </div>
            </div>

            {/* Quick Actions & Live Stats (Cards Style ตาม desig.md) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className={`rounded-2xl px-4 py-2.5 shadow-sm text-center min-w-[130px] border ${
                cardTheme === 'wattvision'
                  ? 'bg-[#141414] border-[#2C2C2E]'
                  : cardTheme === 'poster'
                  ? 'bg-slate-900 border-emerald-700/60'
                  : 'bg-white border-emerald-200'
              }`}>
                <div className={`text-[11px] font-medium ${cardTheme === 'wattvision' ? 'text-[#98989D]' : 'text-gray-400'}`}>
                  ผู้เข้าอบรม
                </div>
                <div className={`text-2xl font-black leading-tight ${
                  cardTheme === 'wattvision' ? 'text-[#00E5FF]' : cardTheme === 'poster' ? 'text-amber-300' : 'text-emerald-800'
                }`}>
                  {totalTrainees} <span className="text-xs font-normal opacity-70">ท่าน</span>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => scanFolderImages(true)}
                disabled={isScanning || isSyncingToGoogle}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 border ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#1E1E1E] hover:bg-[#252525] text-[#00E5FF] border-[#2C2C2E] hover:border-[#00E5FF]'
                    : cardTheme === 'poster'
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-emerald-700'
                    : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
                title="คลิกเพื่อสแกนรูปภาพใหม่อีกครั้ง"
              >
                <i className={`fa-solid fa-arrows-rotate ${isScanning ? 'fa-spin' : ''}`}></i>
                <span>{isScanning ? 'กำลังสแกน...' : 'รีเฟรช'}</span>
              </button>

              {/* AI MediaPipe Auto Enhance Button */}
              <button
                onClick={handleAutoEnhanceAllWithAI}
                disabled={isEnhancingAI || isScanning}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 border ${
                  isEnhancingAI
                    ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                    : cardTheme === 'wattvision'
                    ? 'bg-[#1E1E1E] hover:bg-[#252525] text-amber-400 border-[#2C2C2E] hover:border-amber-400'
                    : cardTheme === 'poster'
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-emerald-700'
                    : 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title="ใช้ AI MediaPipe ตรวจจับใบหน้าและจัดตำแหน่งรูปภาพทุกท่านให้พอดีกับการ์ดอัตโนมัติ"
              >
                <i className={`fa-solid ${isEnhancingAI ? 'fa-spinner fa-spin text-amber-500' : 'fa-wand-magic-sparkles text-amber-500'}`}></i>
                <span>{isEnhancingAI ? 'กำลัง AI จัดภาพ...' : 'AI จัดตำแหน่งภาพทั้งหมด'}</span>
              </button>

              {/* Google Sheets & Drive Sync Button */}
              <button
                onClick={handleSyncAllToGoogle}
                disabled={isSyncingToGoogle}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 border ${
                  isSyncingToGoogle
                    ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                    : cardTheme === 'wattvision'
                    ? 'bg-[#1E1E1E] hover:bg-[#252525] text-[#00E5FF] border-[#2C2C2E] hover:border-[#00E5FF]'
                    : cardTheme === 'poster'
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-emerald-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
                title="คลิกเพื่ออัปโหลดรูปภาพทั้งหมดเข้า Google Drive และบันทึกข้อมูลลง Google Sheets อัตโนมัติ"
              >
                <i className={`fa-solid ${isSyncingToGoogle ? 'fa-spinner fa-spin text-amber-500' : 'fa-cloud-arrow-up text-emerald-600'}`}></i>
                <span>{isSyncingToGoogle ? 'กำลังซิงค์...' : 'ซิงค์เข้า Drive & Sheets'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#121212]'
                    : cardTheme === 'poster'
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                }`}
                title="พิมพ์หรือบันทึกเป็น PDF"
              >
                <i className="fa-solid fa-print"></i>
                <span className="hidden sm:inline">พิมพ์แผนผัง</span>
              </button>
            </div>

          </div>
        </div>
      </header>


      {/* 2. Control & Filter Bar (รวมฟังก์ชันสลับธีม และโหมดครอบหน้า) */}
      <section className="max-w-[96%] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className={`rounded-3xl shadow-lg border p-4 sm:p-5 flex flex-col xl:flex-row items-center justify-between gap-4 transition-colors duration-300 ${
          cardTheme === 'wattvision'
            ? 'bg-[#1E1E1E] border-[#2C2C2E] text-white'
            : cardTheme === 'poster'
            ? 'bg-[#062019] border-emerald-800/80 text-white'
            : 'bg-white border-emerald-100 text-gray-800'
        }`}>
          
          {/* Batch Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <button
              onClick={() => setSelectedBatchId('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedBatchId === 'all'
                  ? cardTheme === 'wattvision'
                    ? 'bg-[#00E5FF] text-[#121212] shadow-sm font-black'
                    : cardTheme === 'poster'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-emerald-800 text-white'
                  : cardTheme === 'wattvision'
                  ? 'bg-[#141414] text-[#98989D] hover:text-white border border-[#2C2C2E]'
                  : 'bg-stone-100 text-gray-700 hover:bg-emerald-50'
              }`}
            >
              <i className="fa-solid fa-layer-group"></i> ทุกรุ่น ({totalTrainees})
            </button>
            {batches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => setSelectedBatchId(String(batch.id))}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedBatchId === String(batch.id)
                    ? cardTheme === 'wattvision'
                      ? 'bg-[#00E5FF] text-[#121212] shadow-sm font-black'
                      : cardTheme === 'poster'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-emerald-800 text-white'
                    : cardTheme === 'wattvision'
                    ? 'bg-[#141414] text-[#98989D] hover:text-white border border-[#2C2C2E]'
                    : 'bg-stone-100 text-gray-700 hover:bg-emerald-50'
                }`}
              >
                <i className="fa-solid fa-users"></i> {batch.batchNumber} ({batch.trainees.length})
              </button>
            ))}
          </div>

          {/* Search Box, Theme Selector & Face Crop Toggle */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56 min-w-[180px]">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อจริง หรือชื่อเล่น..."
                className={`w-full pl-9 pr-8 py-2 rounded-2xl text-xs transition border focus:outline-none ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#141414] border-[#2C2C2E] text-white placeholder-[#98989D] focus:border-[#00E5FF]'
                    : cardTheme === 'poster'
                    ? 'bg-slate-900 border-emerald-700 text-white placeholder-gray-400 focus:border-amber-400'
                    : 'bg-stone-50 border-gray-200 text-gray-800 focus:border-emerald-500'
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* โหมดเมื่อกดที่รูปภาพ: กดรูปเพื่อครอบ (Interactive Crop) vs ดูประวัติ */}
            <div className={`p-1 rounded-2xl flex items-center border shrink-0 ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E]'
                : cardTheme === 'poster'
                ? 'bg-slate-900 border-emerald-700'
                : 'bg-stone-100 border-gray-200'
            }`}>
              <button
                onClick={() => setClickAction('crop')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  clickAction === 'crop'
                    ? cardTheme === 'wattvision'
                      ? 'bg-[#00E5FF] text-[#121212] shadow-xs'
                      : cardTheme === 'poster'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-emerald-800 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="เมื่อกดที่รูปจะเปิดเครื่องมือครอบและเลือกจุดโฟกัสทันที"
              >
                <i className="fa-solid fa-crosshairs text-[11px]"></i>
                <span>กดรูปเพื่อครอบ</span>
              </button>
              <button
                onClick={() => setClickAction('view')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  clickAction === 'view'
                    ? cardTheme === 'wattvision'
                      ? 'bg-[#00E5FF] text-[#121212] font-bold shadow-xs'
                      : cardTheme === 'poster'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'bg-emerald-800 text-white font-bold shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="เมื่อกดที่รูปจะเปิดดูประวัติและข้อมูลผู้ผ่านการอบรม"
              >
                <i className="fa-regular fa-id-badge text-[11px]"></i>
                <span>ดูประวัติ</span>
              </button>
            </div>

            {/* ตัวสลับสไตล์การออกแบบ (Theme Selector) - เลือกกลับมาสไตล์เดิมได้ตลอดเวลา */}
            <div className={`p-1 rounded-2xl flex items-center border shrink-0 ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E]'
                : cardTheme === 'poster'
                ? 'bg-slate-900 border-emerald-700'
                : 'bg-stone-100 border-gray-200'
            }`}>
              <button
                onClick={() => handleThemeChange('wattvision')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#1E1E1E] text-[#00E5FF] border border-[#00E5FF]/50 shadow-xs'
                    : 'text-[#98989D] hover:text-white'
                }`}
                title="สไตล์ WattVision Dark (#121212 / Cyan #00E5FF ตามไฟล์ desig.md)"
              >
                <i className="fa-solid fa-bolt text-[#00E5FF]"></i>
                <span className="hidden sm:inline">WattVision</span>
              </button>
              <button
                onClick={() => handleThemeChange('poster')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  cardTheme === 'poster'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-[#98989D] hover:text-white'
                }`}
                title="สไตล์โปสเตอร์สัมมนา แถวละ 5 คน (ตามแบบตัวอย่าง)"
              >
                <i className="fa-solid fa-award"></i>
                <span className="hidden sm:inline">โปสเตอร์</span>
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  cardTheme === 'light'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-[#98989D] hover:text-white'
                }`}
                title="สไตล์สว่าง มินิมอล แถวละ 5 คน"
              >
                <i className="fa-solid fa-sun"></i>
                <span className="hidden sm:inline">สว่าง</span>
              </button>
            </div>

            {/* View Mode Toggle: การ์ด vs แผนผัง */}
            <div className={`p-1 rounded-2xl flex items-center border shrink-0 ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E]'
                : cardTheme === 'poster'
                ? 'bg-slate-900 border-emerald-700'
                : 'bg-stone-100 border-gray-200'
            }`}>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'cards'
                    ? cardTheme === 'wattvision'
                      ? 'bg-[#1E1E1E] text-white shadow-2xs'
                      : cardTheme === 'poster'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-emerald-900 shadow-2xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="มุมมองการ์ด แถวละ 5 คน"
              >
                <i className="fa-solid fa-grip"></i>
              </button>
              <button
                onClick={() => setViewMode('org')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'org'
                    ? cardTheme === 'wattvision'
                      ? 'bg-[#1E1E1E] text-white shadow-2xs'
                      : cardTheme === 'poster'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-emerald-900 shadow-2xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="มุมมองแผนผังผังงาน"
              >
                <i className="fa-solid fa-sitemap"></i>
              </button>
            </div>

            {/* ปุ่มถังขยะสำหรับดูและกู้คืนรายชื่อที่เคยลบ */}
            {deletedTraineeIds.length > 0 && (
              <button
                onClick={() => setShowDeletedModal(true)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shrink-0 animate-pulse ${
                  cardTheme === 'wattvision'
                    ? 'bg-rose-950/40 text-rose-400 border-rose-800/60 hover:bg-rose-900/50'
                    : cardTheme === 'poster'
                    ? 'bg-rose-950/70 text-rose-300 border-rose-700/70 hover:bg-rose-900/80'
                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-2xs'
                }`}
                title="ดูรายชื่อที่ถูกลบและกู้คืน"
              >
                <i className="fa-solid fa-trash-can text-rose-500"></i>
                <span>ถังขยะ ({deletedTraineeIds.length})</span>
              </button>
            )}

          </div>

        </div>
      </section>


      {/* 3. Main Content: Trainee Roster by Batch */}
      <main className="max-w-[96%] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {filteredBatches.length === 0 ? (
          <div className={`rounded-3xl p-12 text-center border my-8 ${
            cardTheme === 'wattvision'
              ? 'bg-[#1E1E1E] border-[#2C2C2E]'
              : 'bg-white border-gray-200'
          }`}>
            <div className="w-16 h-16 mx-auto mb-4 bg-[#252525] text-[#00E5FF] rounded-full flex items-center justify-center text-2xl">
              <i className="fa-solid fa-user-slash"></i>
            </div>
            <h3 className="text-lg font-bold">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</h3>
            <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกดูรุ่นอื่นๆ</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBatchId('all');
              }}
              className="mt-4 px-4 py-2 bg-[#00E5FF] text-[#121212] text-xs font-bold rounded-xl transition cursor-pointer"
            >
              แสดงข้อมูลทั้งหมด
            </button>
          </div>
        ) : (
          filteredBatches.map((batch) => (
            <section
              key={batch.id}
              className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                cardTheme === 'wattvision'
                  ? 'bg-[#1E1E1E] border-[#2C2C2E] text-white shadow-xl'
                  : cardTheme === 'poster'
                  ? 'bg-gradient-to-b from-[#061e18] via-[#041612] to-[#020b08] border-emerald-700/60 text-white shadow-xl'
                  : 'bg-white border-emerald-100 text-gray-800 shadow-md'
              }`}
              style={cardTheme === 'wattvision' ? { borderRadius: '16px' } : {}}
            >
              {/* Batch Banner Header */}
              <div
                className={`px-6 sm:px-8 py-5 border-b ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#191919] border-[#2C2C2E] text-white'
                    : cardTheme === 'poster'
                    ? 'bg-gradient-to-r from-[#062019] via-[#092b23] to-[#041712] border-emerald-800/80 text-white'
                    : 'bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/50 border-emerald-100 text-gray-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`px-3 py-1 font-bold text-xs rounded-full shadow-2xs ${
                        cardTheme === 'wattvision'
                          ? 'bg-[#00E5FF] text-[#121212]'
                          : cardTheme === 'poster'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {batch.batchNumber}
                      </span>
                      <span className={`text-xs font-mono font-semibold ${
                        cardTheme === 'wattvision' ? 'text-[#00E5FF]' : cardTheme === 'poster' ? 'text-amber-300' : 'text-emerald-800'
                      }`}>
                        [{batch.batchCode}]
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                        cardTheme === 'wattvision'
                          ? 'bg-[#17261C] text-[#32D74B] border-[#32D74B]/40'
                          : cardTheme === 'poster'
                          ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <i className="fa-solid fa-users mr-1"></i> ผู้ผ่านการอบรม {batch.trainees.length} ท่าน
                      </span>
                    </div>
                    <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
                      cardTheme === 'wattvision' ? 'text-white' : cardTheme === 'poster' ? 'text-amber-300 drop-shadow-xs' : 'text-emerald-950'
                    }`}>
                      {batch.title}
                    </h2>
                    <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${
                      cardTheme === 'wattvision' ? 'text-[#98989D]' : cardTheme === 'poster' ? 'text-emerald-100/90' : 'text-gray-600'
                    }`}>
                      {batch.description}
                    </p>
                  </div>

                  {/* Batch Details (Date, Location, Instructor) */}
                  <div className={`rounded-2xl p-3 text-xs space-y-1 md:min-w-[270px] shadow-2xs border ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#141414] border-[#2C2C2E] text-[#98989D]'
                      : cardTheme === 'poster'
                      ? 'bg-slate-950/70 border-emerald-600/40 text-emerald-200'
                      : 'bg-white border-emerald-200/80 text-gray-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <i className={`fa-solid fa-calendar-days w-4 text-center ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-amber-400'}`}></i>
                      <span className={cardTheme === 'wattvision' ? 'text-white' : ''}>{batch.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className={`fa-solid fa-location-dot w-4 text-center ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-amber-400'}`}></i>
                      <span>{batch.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className={`fa-solid fa-chalkboard-user w-4 text-center ${cardTheme === 'wattvision' ? 'text-[#32D74B]' : 'text-amber-400'}`}></i>
                      <span className="truncate">วิทยากร: {batch.instructor}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* View 1: Cards View - แถวละ 5 คนอย่างสมบูรณ์แบบ */}
              {viewMode === 'cards' ? (
                <div className={`p-6 sm:p-8 ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#181818]'
                    : cardTheme === 'poster'
                    ? 'bg-gradient-to-b from-[#051813] via-[#030e0c] to-[#020907]'
                    : 'bg-white'
                }`}>
                  {/* Grid 5 Columns แถวละ 5 คนบน Desktop/Tablet แน่นอน */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4 sm:gap-5">
                    {batch.trainees.map((trainee) => (
                      <div
                        key={trainee.id}
                        onClick={() => {
                          if (clickAction === 'crop') {
                            setCroppingTrainee(trainee);
                          } else {
                            setSelectedTrainee({ ...trainee, batch });
                          }
                        }}
                        className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-2 ${
                          cardTheme === 'wattvision'
                            ? 'bg-[#1E1E1E] border-[#2C2C2E] hover:border-[#00E5FF] hover:shadow-xl hover:shadow-[#00E5FF]/20'
                            : cardTheme === 'poster'
                            ? 'bg-gradient-to-b from-slate-900 via-[#071f19] to-slate-950 border-emerald-500/30 hover:border-amber-400 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 rounded-t-[2.2rem]'
                            : 'bg-white hover:bg-emerald-50/30 border-gray-200 hover:border-emerald-400 shadow-2xs hover:shadow-md'
                        }`}
                        style={cardTheme === 'wattvision' ? { borderRadius: '16px' } : {}}
                      >
                        {/* Trainee Card Top Photo (สัดส่วน 4:3.2 สั้นลง กระชับ เข้ากับใบหน้าพอดี) */}
                        <div className={`relative overflow-hidden aspect-[4/3.2] ${
                          cardTheme === 'poster' ? 'rounded-t-[2rem]' : 'rounded-t-xl'
                        } ${
                          cardTheme === 'wattvision'
                            ? 'bg-[#121212]'
                            : cardTheme === 'poster'
                            ? 'bg-gradient-to-b from-[#0d3429] via-[#08201a] to-slate-950'
                            : 'bg-stone-50'
                        }`}>
                          {/* Radial Spotlight Effect behind person */}
                          {cardTheme === 'poster' && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.38)_0%,transparent_75%)] pointer-events-none z-10"></div>
                          )}

                          {cardTheme === 'wattvision' && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,229,255,0.18)_0%,transparent_75%)] pointer-events-none z-10"></div>
                          )}

                          <img
                            src={formatDriveImageUrl(trainee.image)}
                            alt={trainee.name}
                            style={getImageStyle(trainee)}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'sample-member.jpg';
                            }}
                          />

                          {/* Subtle Bottom Vignette Shadow */}
                          <div className={`absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t z-10 pointer-events-none ${
                            cardTheme === 'wattvision'
                              ? 'from-[#1E1E1E] via-[#1E1E1E]/50 to-transparent'
                              : cardTheme === 'poster'
                              ? 'from-slate-950 via-slate-950/60 to-transparent'
                              : 'from-black/15 to-transparent'
                          }`}></div>

                          {/* Quick Action Top Bar (Edit, Crop & Delete) on Card */}
                          <div className="absolute top-1.5 left-1.5 z-30 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTrainee(trainee);
                              }}
                              className="w-7 h-7 rounded-lg bg-black/85 hover:bg-emerald-600 text-white backdrop-blur-xs border border-white/20 transition-all flex items-center justify-center shadow-md cursor-pointer hover:scale-110"
                              title="แก้ไขข้อมูล / เปลี่ยนรูปถ่ายคนนี้"
                            >
                              <i className="fa-solid fa-pen text-[10px] text-emerald-300"></i>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingTrainee(trainee);
                              }}
                              className="w-7 h-7 rounded-lg bg-black/85 hover:bg-rose-600 text-white backdrop-blur-xs border border-white/20 transition-all flex items-center justify-center shadow-md cursor-pointer hover:scale-110 opacity-70 hover:opacity-100"
                              title="ลบคนนี้ออกจากทำเนียบ"
                            >
                              <i className="fa-solid fa-trash-can text-[10px] text-rose-300"></i>
                            </button>
                          </div>

                          {/* Custom Crop Active Badge */}
                          {(customCropMap[trainee.id] || customCropMap[trainee.filename] || (trainee.cropFocusX !== undefined && trainee.cropFocusX !== '')) && (
                            <div className="absolute bottom-1.5 right-1.5 z-20 px-1.5 py-0.5 bg-emerald-950/85 text-emerald-300 text-[9px] font-bold rounded-md backdrop-blur-xs border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                              <i className="fa-solid fa-check text-emerald-400"></i>
                              <span>ปรับแล้ว</span>
                            </div>
                          )}

                          {/* Floating Crop Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCroppingTrainee(trainee);
                            }}
                            className="absolute top-1.5 right-1.5 z-30 px-2 py-1 bg-black/80 hover:bg-amber-600 text-white text-[10px] font-medium rounded-lg backdrop-blur-xs border border-white/20 transition-all flex items-center gap-1 shadow-md cursor-pointer hover:scale-105"
                            title="คลิกเพื่อเลือกจุดครอบรูปภาพนี้เอง"
                          >
                            <i className="fa-solid fa-crop-simple text-amber-300"></i>
                            <span>ครอป</span>
                          </button>

                          {/* Click-to-Crop Overlay Hint on Hover */}
                          {clickAction === 'crop' && (
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none">
                              <span className="px-2.5 py-1 bg-black/85 text-amber-300 text-xs font-bold rounded-xl shadow-lg border border-amber-400/40 flex items-center gap-1.5">
                                <i className="fa-solid fa-crosshairs"></i>
                                <span>คลิกปรับตำแหน่งภาพ</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Trainee Details Bottom: กระชับ ชัดเจน มีปุ่มแก้ไขรูปภาพในตัว */}
                        <div className={`p-2.5 text-center border-t flex flex-col justify-between ${
                          cardTheme === 'wattvision'
                            ? 'bg-[#1E1E1E] border-[#2C2C2E]'
                            : cardTheme === 'poster'
                            ? 'bg-slate-950/95 border-emerald-900/60'
                            : 'bg-white border-gray-100'
                        }`}>
                          {/* ชื่อจริง */}
                          <div className={`text-xs sm:text-sm font-bold transition leading-snug truncate ${
                            cardTheme === 'wattvision'
                              ? 'text-white group-hover:text-[#00E5FF]'
                              : cardTheme === 'poster'
                              ? 'text-amber-300 group-hover:text-amber-200 drop-shadow-xs'
                              : 'text-gray-900 group-hover:text-emerald-700'
                          }`}>
                            {trainee.name}
                          </div>
                          
                          {/* ชื่อเล่น */}
                          <div className={`text-[11px] sm:text-xs font-medium mt-0.5 truncate ${
                            cardTheme === 'wattvision'
                              ? 'text-[#00E5FF] font-mono'
                              : cardTheme === 'poster'
                              ? 'text-emerald-300/90'
                              : 'text-emerald-700'
                          }`}>
                            ({trainee.nickname})
                          </div>

                          {/* ปุ่มแก้ไขรูปภาพ / ครอปรูปภาพ */}
                          <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-[#2C2C2E]/60 flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTrainee(trainee);
                              }}
                              className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs ${
                                cardTheme === 'wattvision'
                                  ? 'bg-[#141414] hover:bg-[#252525] text-[#00E5FF] border border-[#2C2C2E]'
                                  : cardTheme === 'poster'
                                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-amber-300 border border-emerald-700/60'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                              title="แก้ไขชื่อ หรือเปลี่ยนรูปถ่ายใหม่"
                            >
                              <i className="fa-solid fa-user-pen text-[10px]"></i>
                              <span>แก้ไขรูป</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCroppingTrainee(trainee);
                              }}
                              className={`py-1 px-2 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs ${
                                cardTheme === 'wattvision'
                                  ? 'bg-[#141414] hover:bg-[#252525] text-amber-400 border border-[#2C2C2E]'
                                  : cardTheme === 'poster'
                                  ? 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-800'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                              }`}
                              title="ปรับจุดโฟกัส / ครอปรูป"
                            >
                              <i className="fa-solid fa-crop-simple text-[10px]"></i>
                              <span>ครอป</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* View 2: Org Chart View */
                <div className={`p-6 sm:p-8 overflow-x-auto ${cardTheme === 'wattvision' ? 'bg-[#181818]' : ''}`}>
                  <div className="min-w-[650px] flex flex-col items-center">
                    
                    {/* Level 1: Instructor */}
                    <div className={`px-6 py-3 rounded-2xl shadow-md border text-center max-w-sm mb-6 ${
                      cardTheme === 'wattvision'
                        ? 'bg-[#1E1E1E] border-[#00E5FF]/40 text-white'
                        : 'bg-emerald-800 text-white border-emerald-600'
                    }`}>
                      <div className={`text-[11px] uppercase tracking-wider font-bold ${
                        cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-emerald-200'
                      }`}>
                        วิทยากรผู้ทรงคุณวุฒิประจำรุ่น
                      </div>
                      <div className="text-sm font-bold mt-0.5">{batch.instructor}</div>
                      <div className="text-[11px] opacity-75 mt-0.5">{batch.location}</div>
                    </div>

                    <div className={`w-0.5 h-6 mb-6 ${cardTheme === 'wattvision' ? 'bg-[#00E5FF]' : 'bg-emerald-400'}`}></div>

                    {/* Level 2: Batch President */}
                    {batch.trainees.filter(t => t.role && t.role.includes('ประธาน')).slice(0, 1).map(leader => (
                      <div key={leader.id} className="flex flex-col items-center mb-6">
                        <div
                          onClick={() => {
                            if (clickAction === 'crop') {
                              setCroppingTrainee(leader);
                            } else {
                              setSelectedTrainee({ ...leader, batch });
                            }
                          }}
                          className={`rounded-2xl p-3 shadow-md flex items-center gap-3 cursor-pointer transition transform hover:scale-103 border ${
                            cardTheme === 'wattvision'
                              ? 'bg-[#1E1E1E] border-[#00E5FF] text-white hover:shadow-lg hover:shadow-[#00E5FF]/20'
                              : 'bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full overflow-hidden relative border-2 shadow-2xs shrink-0 ${
                            cardTheme === 'wattvision' ? 'border-[#00E5FF]' : 'border-emerald-400'
                          }`}>
                            <img
                              src={leader.image}
                              alt={leader.name}
                              style={getImageStyle(leader)}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                            />
                          </div>
                          <div>
                            <span className={`px-2 py-0.5 font-bold text-[10px] rounded-full ${
                              cardTheme === 'wattvision' ? 'bg-[#00E5FF] text-[#121212]' : 'bg-emerald-700 text-white'
                            }`}>
                              {leader.role}
                            </span>
                            <div className="text-sm font-bold mt-0.5">{leader.name}</div>
                            <div className={`text-xs ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-emerald-700'}`}>
                              ({leader.nickname})
                            </div>
                          </div>
                        </div>
                        <div className={`w-0.5 h-6 mt-6 ${cardTheme === 'wattvision' ? 'bg-[#00E5FF]' : 'bg-emerald-400'}`}></div>
                      </div>
                    ))}

                    {/* Level 3: Members Grid */}
                    <div className={`w-full flex justify-center flex-wrap gap-3 pt-4 border-t border-dashed ${
                      cardTheme === 'wattvision' ? 'border-[#2C2C2E]' : 'border-emerald-200'
                    }`}>
                      {batch.trainees.map((trainee) => (
                        <div
                          key={trainee.id}
                          onClick={() => {
                            if (clickAction === 'crop') {
                              setCroppingTrainee(trainee);
                            } else {
                              setSelectedTrainee({ ...trainee, batch });
                            }
                          }}
                          className={`rounded-xl p-2.5 shadow-xs transition cursor-pointer flex items-center gap-2.5 w-52 transform hover:-translate-y-0.5 border ${
                            cardTheme === 'wattvision'
                              ? 'bg-[#1E1E1E] border-[#2C2C2E] hover:border-[#00E5FF] text-white'
                              : 'bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-400'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full overflow-hidden relative border shrink-0 ${
                            cardTheme === 'wattvision' ? 'border-[#00E5FF]/50' : 'border-emerald-200'
                          }`}>
                            <img
                              src={trainee.image}
                              alt={trainee.name}
                              style={getImageStyle(trainee)}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                            />
                          </div>
                          <div className="overflow-hidden text-left">
                            <div className="text-xs font-bold truncate">{trainee.name}</div>
                            <div className={`text-[11px] truncate ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-emerald-700'}`}>
                              ({trainee.nickname})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              )}

              {/* Batch Footer Summary */}
              <div className={`px-6 py-3.5 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
                cardTheme === 'wattvision'
                  ? 'bg-[#141414] border-[#2C2C2E] text-[#98989D]'
                  : cardTheme === 'poster'
                  ? 'bg-[#020b08] border-emerald-900/60 text-emerald-300'
                  : 'bg-stone-50/70 border-emerald-100 text-gray-500'
              }`}>
                <div className="flex items-center gap-2">
                  <i className={`fa-solid fa-folder-open ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-emerald-500'}`}></i>
                  <span>ตำแหน่งโฟลเดอร์: <code className={`font-semibold ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : cardTheme === 'poster' ? 'text-amber-300' : 'text-gray-700'}`}>{batch.folder}/</code></span>
                  <span className={`${cardTheme === 'wattvision' ? 'text-[#32D74B]' : 'text-emerald-400'} font-medium`}>
                    • รูปภาพสัดส่วนบุคคล 3:4 มาตรฐาน (แถวละ 5 ท่าน)
                  </span>
                </div>
                <div className={`font-bold ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : cardTheme === 'poster' ? 'text-amber-300' : 'text-emerald-900'}`}>
                  รวมผู้เข้าร่วมอบรม {batch.trainees.length} ท่าน
                </div>
              </div>

            </section>
          ))
        )}
      </main>


      {/* 4. Trainee Detail Modal Popup */}
      {selectedTrainee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className={`rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border transform transition-all ${
            cardTheme === 'wattvision'
              ? 'bg-[#1E1E1E] border-[#2C2C2E] text-white'
              : 'bg-white border-gray-200 text-gray-800'
          }`}>
            
            {/* Modal Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              cardTheme === 'wattvision'
                ? 'bg-[#191919] border-[#2C2C2E]'
                : 'bg-emerald-50/80 border-emerald-100 text-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 font-bold text-xs rounded-full ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#00E5FF] text-[#121212]'
                    : 'bg-emerald-700 text-white'
                }`}>
                  {selectedTrainee.batch ? selectedTrainee.batch.batchNumber : 'ผู้ผ่านการอบรม'}
                </span>
                <span className={`text-xs font-mono font-semibold ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-emerald-800'}`}>
                  {selectedTrainee.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedTrainee(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition cursor-pointer ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#141414] border-[#2C2C2E] text-gray-400 hover:text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                
                {/* Photo (Face Crop or Full) */}
                <div className={`w-36 h-48 rounded-2xl overflow-hidden shadow-lg border-2 shrink-0 relative ${
                  cardTheme === 'wattvision' ? 'border-[#00E5FF] bg-[#141414]' : 'border-emerald-600 bg-stone-100'
                }`}>
                  <img
                    src={formatDriveImageUrl(selectedTrainee.image)}
                    alt={selectedTrainee.name}
                    style={getImageStyle(selectedTrainee)}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                  />
                </div>

                {/* Trainee Info */}
                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-emerald-700'
                    }`}>
                      {selectedTrainee.role || 'ผู้ผ่านการอบรม'}
                    </span>
                    <h3 className="text-xl font-bold mt-0.5">
                      {selectedTrainee.name}
                    </h3>
                    <p className={`text-sm font-medium ${cardTheme === 'wattvision' ? 'text-[#98989D]' : 'text-gray-600'}`}>
                      ชื่อเล่น: <strong className={cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-emerald-800'}>{selectedTrainee.nickname}</strong>
                    </p>
                  </div>

                  <div className={`border rounded-xl p-3 text-xs space-y-1.5 ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#141414] border-[#2C2C2E]'
                      : 'bg-stone-50 border-stone-200'
                  }`}>
                    <div>
                      <span className={cardTheme === 'wattvision' ? 'text-[#98989D]' : 'text-gray-500'}>เลขที่ใบรับรอง:</span>{' '}
                      <code className={`font-mono font-bold ${cardTheme === 'wattvision' ? 'text-[#00E5FF]' : 'text-amber-800'}`}>
                        {selectedTrainee.certNo}
                      </code>
                    </div>
                    <div>
                      <span className={cardTheme === 'wattvision' ? 'text-[#98989D]' : 'text-gray-500'}>สถานะ:</span>{' '}
                      <span className={`font-bold ${cardTheme === 'wattvision' ? 'text-[#32D74B]' : 'text-emerald-700'}`}>
                        <i className="fa-solid fa-circle-check mr-1"></i>
                        {selectedTrainee.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] opacity-60 break-all">
                    <i className="fa-solid fa-folder-open mr-1"></i>
                    ที่อยู่ไฟล์: <code>{selectedTrainee.image}</code>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-2 ${
              cardTheme === 'wattvision'
                ? 'bg-[#191919] border-[#2C2C2E]'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const t = selectedTrainee;
                    setSelectedTrainee(null);
                    setEditingTrainee(t);
                  }}
                  className={`px-3 py-2 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                    cardTheme === 'wattvision'
                      ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-500/40'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                  title="แก้ไขชื่อ ตำแหน่ง หรืออัปโหลดรูปภาพใหม่"
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  <span>แก้ไข / เปลี่ยนรูป</span>
                </button>

                <button
                  onClick={() => {
                    const t = selectedTrainee;
                    setSelectedTrainee(null);
                    setCroppingTrainee(t);
                  }}
                  className={`px-3 py-2 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] hover:bg-[#00E5FF]/30 border border-[#00E5FF]/50'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                  }`}
                  title="ปรับจุดโฟกัสหรือระยะซูมของรูปนี้"
                >
                  <i className="fa-solid fa-crop-simple"></i>
                  <span>ครอบรูป</span>
                </button>

                <button
                  onClick={() => {
                    const t = selectedTrainee;
                    setSelectedTrainee(null);
                    setDeletingTrainee(t);
                  }}
                  className="px-3 py-2 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800"
                  title="ลบคนนี้ออกจากทำเนียบ"
                >
                  <i className="fa-solid fa-trash-can"></i>
                  <span>ลบ</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTrainee(null)}
                  className={`px-4 py-2 font-semibold text-xs rounded-xl transition cursor-pointer ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#252525] hover:bg-[#303030] text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  onClick={() => window.print()}
                  className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#121212]'
                      : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                  }`}
                >
                  <i className="fa-solid fa-print"></i> พิมพ์ประวัติ
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. Interactive Crop Editor Modal */}
      {croppingTrainee && (
        <CropEditorModal
          trainee={croppingTrainee}
          cardTheme={cardTheme}
          currentCrop={getTraineeCrop(croppingTrainee)}
          defaultCrop={
            FACE_FOCUS_MAP[croppingTrainee.filename ? croppingTrainee.filename.split('?')[0].split('#')[0] : (croppingTrainee.image ? croppingTrainee.image.split('/').pop().split('?')[0] : '')] ||
            { x: 50, y: 25, scale: 1.85 }
          }
          onSave={(cropData) => {
            handleSaveCustomCrop(croppingTrainee, cropData);
            setCroppingTrainee(null);
          }}
          onReset={() => {
            handleResetCustomCrop(croppingTrainee);
          }}
          onClose={() => setCroppingTrainee(null)}
        />
      )}

      {/* 6. Edit Trainee Modal (แก้ไขข้อมูล + อัปเดตรูปถ่าย) */}
      {editingTrainee && (
        <EditTraineeModal
          trainee={editingTrainee}
          cardTheme={cardTheme}
          onSave={(updatedData) => handleSaveTrainee(editingTrainee.id, updatedData)}
          onOpenCrop={(t) => {
            setEditingTrainee(null);
            setCroppingTrainee(t);
          }}
          onClose={() => setEditingTrainee(null)}
        />
      )}

      {/* 7. Delete Trainee Confirm Modal */}
      {deletingTrainee && (
        <DeleteConfirmModal
          trainee={deletingTrainee}
          cardTheme={cardTheme}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingTrainee(null)}
        />
      )}

      {/* 8. Deleted Trainees (Recycle Bin / Trash) Modal */}
      {showDeletedModal && (
        <DeletedListModal
          deletedIds={deletedTraineeIds}
          allTrainees={allRawTrainees}
          cardTheme={cardTheme}
          onRestore={handleRestoreTrainee}
          onRestoreAll={handleRestoreAll}
          onClose={() => setShowDeletedModal(false)}
        />
      )}

      {/* 5. Footer */}
      <footer className={`mt-16 text-center text-xs border-t pt-8 ${
        cardTheme === 'wattvision'
          ? 'border-[#2C2C2E] text-[#98989D]'
          : 'border-gray-200 text-gray-500'
      }`}>
        <p className={`font-bold text-sm ${cardTheme === 'wattvision' ? 'text-white' : 'text-gray-700'}`}>
          สมาคมบอนไซไทย (Thai Bonsai Association)
        </p>
        <p className="mt-1">ทำเนียบผู้ผ่านการอบรมศิลปะและศาสตร์แห่งบอนไซ • กรุงเทพมหานคร</p>
        <p className="text-[11px] opacity-60 mt-1">
          ระบบครอบโซนหน้าอัตโนมัติ (Face Auto-Crop) • รองรับสไตล์ WattVision Dark (#121212) และสลับกลับได้ตลอดเวลา
          {lastScanTime && ` • อัปเดตเมื่อ ${lastScanTime.toLocaleTimeString('th-TH')}`}
        </p>
      </footer>

    </div>
  );
}

// Global window and Module Export
if (typeof window !== 'undefined') {
  window.BonsaiTraineeChart = BonsaiTraineeChart;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BonsaiTraineeChart;
}
