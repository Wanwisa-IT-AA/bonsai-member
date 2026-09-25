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

// ข้อมูลหลักสูตรและการจัดอบรมแต่ละรุ่น
const INITIAL_BATCH_METADATA = [
  {
    id: 1,
    batchNumber: 'รุ่นที่ 1',
    batchCode: 'BKK-B1',
    title: 'ปฐมบทศิลปะบอนไซและสรีรวิทยาไม้แคระ',
    themeColor: 'cyan',
    date: '15 - 16 มกราคม 2569',
    location: 'ศูนย์การเรียนรู้สมาคมบอนไซไทย กรุงเทพฯ',
    instructor: 'อาจารย์ผู้ทรงคุณวุฒิ คณะกรรมการสมาคมบอนไซไทย',
    description: 'เน้นพื้นฐานดิน กระถาง การขยายพันธุ์ และหลักการตัดทดกิ่งไม้เขตร้อน',
    folder: 'bangkokimage/1',
    folderNum: '1'
  },
  {
    id: 2,
    batchNumber: 'รุ่นที่ 2',
    batchCode: 'BKK-B2',
    title: 'ศิลปะการดัดเข้าลวดและการสร้างรูปทรงบอนไซขั้นกลาง',
    themeColor: 'teal',
    date: '19 - 20 กุมภาพันธ์ 2569',
    location: 'เรือนกระจกแสดงบอนไซ สวนสมาคมบอนไซกรุงเทพฯ',
    instructor: 'มาสเตอร์ช่างดัดบอนไซระดับสากล',
    description: 'เน้นทักษะการพันลวดอลูมิเนียม การสร้างมิติพุ่มใบ และการทำจิน-ชาริ',
    folder: 'bangkokimage/2',
    folderNum: '2'
  },
  {
    id: 3,
    batchNumber: 'รุ่นที่ 3',
    batchCode: 'BKK-B3',
    title: 'เทคนิคระดับสูง การประกวด และการจัดแสดงในระดับสากล',
    themeColor: 'emerald',
    date: '21 - 22 มีนาคม 2569',
    location: 'หอประชุมใหญ่ สมาคมบอนไซไทย กรุงเทพมหานคร',
    instructor: 'คณะกรรมการตัดสินประกวดบอนไซแห่งประเทศไทย',
    description: 'การคัดเลือกกระถางดินเผาโบราณ ไม้ประดับร่วม (Shitakusa) และการจัดตู้แท่นโชว์ (Tokonoma)',
    folder: 'bangkokimage/3',
    folderNum: '3'
  }
];

// พิกัดจุดโฟกัสโซนใบหน้า (Face Focus Coordinates) สำหรับครอบรูปอัตโนมัติ
// โฟกัสเฉพาะโซนหน้าขึ้นไปให้ได้สัดส่วนภาพถ่ายบุคคล
const FACE_FOCUS_MAP = {
  '78995_0.jpg': { x: 23, y: 13, scale: 1.85 }, // ยืนฝั่งซ้าย
  '78996_0.jpg': { x: 34, y: 14, scale: 1.85 }, // ยืนฝั่งซ้าย
  '78997_0.jpg': { x: 78, y: 12, scale: 1.85 }, // ยืนฝั่งขวา
  '78998_0.jpg': { x: 27, y: 14, scale: 1.85 }, // ยืนฝั่งซ้าย
  '78999_0.jpg': { x: 80, y: 14, scale: 1.85 }, // ยืนฝั่งขวา
  '79000_0.jpg': { x: 21, y: 15, scale: 1.85 }, // ยืนฝั่งซ้าย
  '79001_0.jpg': { x: 32, y: 16, scale: 1.85 }, // ยืนฝั่งซ้าย
  '79002_0.jpg': { x: 28, y: 16, scale: 1.85 }, // ยืนฝั่งซ้าย
  '79003_0.jpg': { x: 24, y: 15, scale: 1.85 }, // ยืนฝั่งซ้าย
  '79004_0.jpg': { x: 80, y: 15, scale: 1.85 }, // ยืนฝั่งขวา
  '79005_0.jpg': { x: 77, y: 28, scale: 1.85 }, // ยืนฝั่งขวา
  '79006_0.jpg': { x: 50, y: 22, scale: 1.75 }, // อยู่ตรงกลาง
  '79007_0.jpg': { x: 23, y: 24, scale: 1.85 }, // ยืนฝั่งซ้าย
  '79009_0.jpg': { x: 82, y: 35, scale: 1.85 }, // ยืนฝั่งขวา
  '79010_0.jpg': { x: 85, y: 24, scale: 1.85 }, // ยืนฝั่งขวา
  '79011_0.jpg': { x: 25, y: 28, scale: 1.85 }, // ยืนฝั่งซ้าย
  '79012_0.jpg': { x: 50, y: 27, scale: 1.85 }, // อยู่ตรงกลาง
  '79013_0.jpg': { x: 50, y: 25, scale: 1.85 }, // อยู่ตรงกลาง
  '79014_0.jpg': { x: 50, y: 25, scale: 1.85 }  // อยู่ตรงกลาง
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
  '79011_0.jpg': { name: 'นายอนุสรณ์ วิชิตกุล', nickname: 'คุณสรณ์', role: 'สมาชิก', code: 'A024' },
  '79012_0.jpg': { name: 'นายชวลิต ลิขิตพงษ์', nickname: 'คุณชวลิต', role: 'สมาชิก', code: 'A025' },
  '79013_0.jpg': { name: 'นายประวิทย์ อักษรทอง', nickname: 'คุณวิทย์', role: 'สมาชิก', code: 'A026' },
  '79014_0.jpg': { name: 'นายภาณุวัฒน์ เด่นดวง', nickname: 'คุณภาณุ', role: 'สมาชิก', code: 'A027' }
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

export default function BonsaiTraineeChart() {
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'org'

  // สไตล์การออกแบบ: 'wattvision' (ตาม desig.md) | 'poster' (ตามแบบรูปสัมมนา) | 'light' (สว่าง)
  const [cardTheme, setCardTheme] = useState(() => {
    try {
      return localStorage.getItem('bonsai_theme_mode') || 'wattvision';
    } catch (e) {
      return 'wattvision';
    }
  });

  // โหมดการครอบรูปภาพ: 'face' (ครอบเฉพาะโซนหน้าขึ้นไป ได้สัดส่วน) | 'full' (แสดงภาพเต็มตัว)
  const [cropMode, setCropMode] = useState(() => {
    try {
      return localStorage.getItem('bonsai_crop_mode') || 'face';
    } catch (e) {
      return 'face';
    }
  });

  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [newImageAlert, setNewImageAlert] = useState(null);

  // สถานะข้อมูลรุ่นและผู้ผ่านการอบรมที่ดึงมาจากโฟลเดอร์แบบไดนามิก
  const [batches, setBatches] = useState(() => {
    return INITIAL_BATCH_METADATA.map((b) => ({
      ...b,
      trainees: []
    }));
  });

  const prevImageCounts = useRef({});

  // บันทึกการเลือกธีมและโหมดครอบรูปลง LocalStorage
  const handleThemeChange = (newTheme) => {
    setCardTheme(newTheme);
    try {
      localStorage.setItem('bonsai_theme_mode', newTheme);
    } catch (e) {}
  };

  const handleCropModeChange = (newCrop) => {
    setCropMode(newCrop);
    try {
      localStorage.setItem('bonsai_crop_mode', newCrop);
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
        document.body.style.backgroundColor = '#f8faf8';
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

          const trainees = imageFiles.map((fname, index) =>
            parseTraineeFromFilename(fname, index, batch.id)
          );

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

  // คำนวณยอดรวมสถิติ
  const totalTrainees = useMemo(() => {
    return batches.reduce((acc, batch) => acc + batch.trainees.length, 0);
  }, [batches]);

  // กรองข้อมูลตามรุ่นและคำค้นหา
  const filteredBatches = useMemo(() => {
    return batches
      .filter((batch) => {
        if (selectedBatchId !== 'all' && batch.id !== Number(selectedBatchId)) {
          return false;
        }
        return true;
      })
      .map((batch) => {
        const trainees = batch.trainees.filter((t) => {
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
  }, [batches, selectedBatchId, searchTerm]);

  // คำนวณ Style การครอบรูปภาพ (Face Auto-Crop)
  const getImageStyle = (filename) => {
    if (cropMode === 'face') {
      const focus = FACE_FOCUS_MAP[filename] || { x: 50, y: 18, scale: 1.8 };
      return {
        objectFit: 'cover',
        objectPosition: `${focus.x}% ${focus.y}%`,
        transform: `scale(${focus.scale || 1.85})`,
        transformOrigin: `${focus.x}% ${focus.y}%`,
        transition: 'transform 0.35s ease, object-position 0.35s ease'
      };
    }
    return {
      objectFit: 'cover',
      objectPosition: 'center 15%',
      transform: 'scale(1)',
      transition: 'transform 0.35s ease, object-position 0.35s ease'
    };
  };

  return (
    <div className={`min-h-screen font-sans pb-16 transition-colors duration-300 ${
      cardTheme === 'wattvision'
        ? 'bg-[#121212] text-white'
        : cardTheme === 'poster'
        ? 'bg-[#030e0c] text-white'
        : 'bg-[#f8faf8] text-gray-800'
    }`}>
      
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-9">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl p-2 shadow-md border flex items-center justify-center shrink-0 ${
                cardTheme === 'wattvision'
                  ? 'bg-[#141414] border-[#2C2C2E]'
                  : cardTheme === 'poster'
                  ? 'bg-slate-900 border-emerald-600/50'
                  : 'bg-white border-emerald-200'
              }`}>
                <img
                  src="logo.png"
                  alt="สมาคมบอนไซไทย"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = 'logo-card.png';
                  }}
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                  <span className={`inline-block px-3 py-0.5 text-xs font-semibold rounded-full border ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#141414] text-[#00E5FF] border-[#00E5FF]/40'
                      : cardTheme === 'poster'
                      ? 'bg-emerald-900/80 text-amber-300 border-emerald-700'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    <i className="fa-solid fa-graduation-cap mr-1"></i>
                    Bangkok Bonsai Training Program
                  </span>
                  
                  {/* Real-time Status Badge (Lime Green ตาม desig.md) */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                    cardTheme === 'wattvision'
                      ? 'bg-[#17261C] text-[#32D74B] border-[#32D74B]/40'
                      : cardTheme === 'poster'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#32D74B] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#32D74B]"></span>
                    </span>
                    Live Sync • แถวละ 5 คน
                  </span>
                </div>

                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  cardTheme === 'wattvision'
                    ? 'text-white'
                    : cardTheme === 'poster'
                    ? 'text-amber-300 drop-shadow'
                    : 'text-emerald-950'
                }`}>
                  ทำเนียบผู้ผ่านการอบรมบอนไซ
                </h1>
                <p className={`text-xs sm:text-sm mt-1 ${
                  cardTheme === 'wattvision' ? 'text-[#98989D]' : cardTheme === 'poster' ? 'text-emerald-200/90' : 'text-gray-600'
                }`}>
                  ทำเนียบผู้ผ่านการอบรมรุ่นที่ 1, รุ่นที่ 2, รุ่นที่ 3 • สมาคมบอนไซไทย
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
                  ผู้ผ่านการอบรม
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
                disabled={isScanning}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 border ${
                  cardTheme === 'wattvision'
                    ? 'bg-[#1E1E1E] hover:bg-[#252525] text-[#00E5FF] border-[#2C2C2E] hover:border-[#00E5FF]'
                    : cardTheme === 'poster'
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-emerald-700'
                    : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
                title="คลิกเพื่อสแกนรูปภาพในโฟลเดอร์ใหม่อีกครั้ง"
              >
                <i className={`fa-solid fa-arrows-rotate ${isScanning ? 'fa-spin' : ''}`}></i>
                <span>{isScanning ? 'กำลังสแกน...' : 'รีเฟรชรูปภาพ'}</span>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
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

            {/* ฟังก์ชันครอบรูปภาพ: ครอบเฉพาะโซนหน้า (Auto Face Crop) vs ภาพเต็มตัว */}
            <div className={`p-1 rounded-2xl flex items-center border shrink-0 ${
              cardTheme === 'wattvision'
                ? 'bg-[#141414] border-[#2C2C2E]'
                : cardTheme === 'poster'
                ? 'bg-slate-900 border-emerald-700'
                : 'bg-stone-100 border-gray-200'
            }`}>
              <button
                onClick={() => handleCropModeChange('face')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  cropMode === 'face'
                    ? cardTheme === 'wattvision'
                      ? 'bg-[#00E5FF] text-[#121212] shadow-xs'
                      : cardTheme === 'poster'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-emerald-800 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="ครอบรูปภาพอัตโนมัติ โฟกัสเฉพาะโซนหน้าขึ้นไป ได้สัดส่วนรูปถ่ายบุคคล"
              >
                <i className="fa-solid fa-user-tie"></i>
                <span>ครอบโซนหน้า</span>
              </button>
              <button
                onClick={() => handleCropModeChange('full')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  cropMode === 'full'
                    ? cardTheme === 'wattvision'
                      ? 'bg-[#00E5FF] text-[#121212] font-bold shadow-xs'
                      : cardTheme === 'poster'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'bg-emerald-800 text-white font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="แสดงภาพเต็มตัวพร้อมต้นบอนไซ"
              >
                <i className="fa-solid fa-tree"></i>
                <span>ภาพเต็ม</span>
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

          </div>

        </div>
      </section>


      {/* 3. Main Content: Trainee Roster by Batch */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
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
                      <span className={`text-xs ${cardTheme === 'wattvision' ? 'text-[#98989D]' : 'opacity-70'}`}>
                        • โฟลเดอร์: <code className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          cardTheme === 'wattvision' ? 'bg-[#141414] text-[#00E5FF] border border-[#2C2C2E]' : 'bg-emerald-950 text-emerald-300'
                        }`}>{batch.folder}/</code>
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                        cardTheme === 'wattvision'
                          ? 'bg-[#17261C] text-[#32D74B] border-[#32D74B]/40'
                          : cardTheme === 'poster'
                          ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <i className="fa-solid fa-grip mr-1"></i> แถวละ 5 ท่าน ({batch.trainees.length} รูป)
                      </span>
                      {cropMode === 'face' && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          cardTheme === 'wattvision' ? 'bg-[#141414] text-[#00E5FF] border-[#00E5FF]/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          <i className="fa-solid fa-crop-simple mr-1"></i> ครอบโซนหน้าอัตโนมัติ
                        </span>
                      )}
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
                        onClick={() => setSelectedTrainee({ ...trainee, batch })}
                        className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-2 ${
                          cardTheme === 'wattvision'
                            ? 'bg-[#1E1E1E] border-[#2C2C2E] hover:border-[#00E5FF] hover:shadow-xl hover:shadow-[#00E5FF]/20'
                            : cardTheme === 'poster'
                            ? 'bg-gradient-to-b from-slate-900 via-[#071f19] to-slate-950 border-emerald-500/30 hover:border-amber-400 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 rounded-t-[2.2rem]'
                            : 'bg-white hover:bg-emerald-50/30 border-gray-200 hover:border-emerald-400 shadow-2xs hover:shadow-md'
                        }`}
                        style={cardTheme === 'wattvision' ? { borderRadius: '16px' } : {}}
                      >
                        {/* Trainee Card Top Photo (รองรับ Auto Face Crop โฟกัสเฉพาะโซนหน้าขึ้นไป) */}
                        <div className={`relative aspect-[3/4] overflow-hidden ${
                          cardTheme === 'poster' ? 'rounded-t-[2.2rem]' : 'rounded-t-2xl'
                        } ${
                          cardTheme === 'wattvision'
                            ? 'bg-[#121212]'
                            : cardTheme === 'poster'
                            ? 'bg-gradient-to-b from-[#0d3429] via-[#08201a] to-slate-950'
                            : 'bg-stone-100'
                        }`}>
                          {/* Radial Spotlight Effect behind person */}
                          {cardTheme === 'poster' && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.38)_0%,transparent_75%)] pointer-events-none z-10"></div>
                          )}

                          {cardTheme === 'wattvision' && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,229,255,0.18)_0%,transparent_75%)] pointer-events-none z-10"></div>
                          )}

                          <img
                            src={trainee.image}
                            alt={trainee.name}
                            style={getImageStyle(trainee.filename || trainee.image.split('/').pop())}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'sample-member.jpg';
                            }}
                          />

                          {/* Subtle Bottom Vignette Shadow */}
                          <div className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t z-10 pointer-events-none ${
                            cardTheme === 'wattvision'
                              ? 'from-[#1E1E1E] via-[#1E1E1E]/60 to-transparent'
                              : cardTheme === 'poster'
                              ? 'from-slate-950 via-slate-950/70 to-transparent'
                              : 'from-black/30 to-transparent'
                          }`}></div>

                          {/* Indicator Crop Tag Icon */}
                          {cropMode === 'face' && (
                            <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="px-1.5 py-0.5 bg-black/70 text-[#00E5FF] text-[9px] rounded-md font-mono border border-white/10">
                                <i className="fa-solid fa-crop-simple"></i> Auto Crop
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Trainee Details Bottom: เฉพาะชื่อจริง และชื่อเล่น ตามที่ระบุ */}
                        <div className={`p-3.5 text-center border-t flex flex-col justify-center min-h-[68px] ${
                          cardTheme === 'wattvision'
                            ? 'bg-[#1E1E1E] border-[#2C2C2E]'
                            : cardTheme === 'poster'
                            ? 'bg-slate-950/95 border-emerald-900/60'
                            : 'bg-white border-gray-100'
                        }`}>
                          {/* ชื่อจริง */}
                          <div className={`text-sm sm:text-base font-bold transition leading-tight truncate ${
                            cardTheme === 'wattvision'
                              ? 'text-white group-hover:text-[#00E5FF]'
                              : cardTheme === 'poster'
                              ? 'text-amber-300 group-hover:text-amber-200 drop-shadow-xs'
                              : 'text-gray-900 group-hover:text-emerald-700'
                          }`}>
                            {trainee.name}
                          </div>
                          
                          {/* ชื่อเล่น */}
                          <div className={`text-xs sm:text-sm font-medium mt-1 truncate ${
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
                          onClick={() => setSelectedTrainee({ ...leader, batch })}
                          className={`rounded-2xl p-3 shadow-md flex items-center gap-3 cursor-pointer transition transform hover:scale-103 border ${
                            cardTheme === 'wattvision'
                              ? 'bg-[#1E1E1E] border-[#00E5FF] text-white hover:shadow-lg hover:shadow-[#00E5FF]/20'
                              : 'bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300'
                          }`}
                        >
                          <img
                            src={leader.image}
                            alt={leader.name}
                            style={getImageStyle(leader.filename || leader.image.split('/').pop())}
                            className={`w-12 h-12 rounded-full object-cover border-2 shadow-2xs ${
                              cardTheme === 'wattvision' ? 'border-[#00E5FF]' : 'border-emerald-400'
                            }`}
                            onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                          />
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
                          onClick={() => setSelectedTrainee({ ...trainee, batch })}
                          className={`rounded-xl p-2.5 shadow-xs transition cursor-pointer flex items-center gap-2.5 w-52 transform hover:-translate-y-0.5 border ${
                            cardTheme === 'wattvision'
                              ? 'bg-[#1E1E1E] border-[#2C2C2E] hover:border-[#00E5FF] text-white'
                              : 'bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-400'
                          }`}
                        >
                          <img
                            src={trainee.image}
                            alt={trainee.name}
                            style={getImageStyle(trainee.filename || trainee.image.split('/').pop())}
                            className={`w-10 h-10 rounded-full object-cover border shrink-0 ${
                              cardTheme === 'wattvision' ? 'border-[#00E5FF]/50' : 'border-emerald-200'
                            }`}
                            onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                          />
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
                    • {cropMode === 'face' ? 'ครอบเฉพาะโซนหน้าอัตโนมัติ' : 'แสดงภาพเต็ม'} (แถวละ 5 ท่าน)
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
                    src={selectedTrainee.image}
                    alt={selectedTrainee.name}
                    style={getImageStyle(selectedTrainee.filename || selectedTrainee.image.split('/').pop())}
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
            <div className={`px-6 py-3.5 border-t flex justify-end gap-2 ${
              cardTheme === 'wattvision'
                ? 'bg-[#191919] border-[#2C2C2E]'
                : 'bg-gray-50 border-gray-200'
            }`}>
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
