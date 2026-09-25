/**
 * BonsaiTraineeChart.jsx
 * แผนผังและทำเนียบผู้ผ่านการอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ สมาคมบอนไซไทย
 * แบ่งเป็นรุ่นๆ (รุ่น 1, รุ่น 2, รุ่น 3)
 * ระบบดึงรูปและเรนเดอร์อัตโนมัติทันทีที่มีการเพิ่มไฟล์ลงใน bangkokimage/1, 2, 3
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
    themeColor: 'emerald',
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
    themeColor: 'cyan',
    date: '21 - 22 มีนาคม 2569',
    location: 'หอประชุมใหญ่ สมาคมบอนไซไทย กรุงเทพมหานคร',
    instructor: 'คณะกรรมการตัดสินประกวดบอนไซแห่งประเทศไทย',
    description: 'การคัดเลือกกระถางดินเผาโบราณ ไม้ประดับร่วม (Shitakusa) และการจัดตู้แท่นโชว์ (Tokonoma)',
    folder: 'bangkokimage/3',
    folderNum: '3'
  }
];

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
    // ถ้ามีส่วนที่เป็นชื่อ และชื่อเล่น
    if (parts.length >= 2 && isNaN(parts[0])) {
      const realName = parts[0].trim();
      const nickname = parts[1].trim();
      return {
        id: `BKK-0${batchId}-${String(index + 1).padStart(2, '0')}`,
        name: realName.startsWith('นาย') || realName.startsWith('นาง') ? realName : `คุณ${realName}`,
        nickname: nickname.startsWith('คุณ') ? nickname : `คุณ${nickname}`,
        role: index === 0 ? `ประธานรุ่นที่ ${batchId}` : 'สมาชิก',
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

  // ฟังก์ชันสแกนโฟลเดอร์รูปภาพอัตโนมัติ (รองรับทั้ง Directory Index ของ Server และ manifest.json)
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
      } catch (e) {
        // manifest fetch failed, continue to directory listing
      }

      const updatedBatches = await Promise.all(
        INITIAL_BATCH_METADATA.map(async (batch) => {
          let imageFiles = [];

          // 1. ลองดึงจาก Directory Listing ของโฟลเดอร์โดยตรง (/bangkokimage/1/)
          try {
            const dirUrl = `bangkokimage/${batch.folderNum}/`;
            const dirRes = await fetch(dirUrl, { cache: 'no-store' });
            if (dirRes.ok) {
              const html = await dirRes.text();
              // ตรวจจับชื่อไฟล์รูปภาพจาก href หรือ title
              const regex = /href=["']([^"']+\.(?:jpe?g|png|webp|gif|jfif))["']/gi;
              let match;
              while ((match = regex.exec(html)) !== null) {
                const fname = decodeURIComponent(match[1].split('/').pop().split('?')[0]);
                if (fname && !imageFiles.includes(fname)) {
                  imageFiles.push(fname);
                }
              }
            }
          } catch (err) {
            // directory fetch ignored
          }

          // 2. รวมกับไฟล์จาก manifest.json (ถ้ามี)
          if (manifestData && manifestData[batch.folderNum]) {
            manifestData[batch.folderNum].forEach((fname) => {
              if (fname && !imageFiles.includes(fname)) {
                imageFiles.push(fname);
              }
            });
          }

          // ถ้าไม่มีไฟล์ในโฟลเดอร์ ให้มี default fallback 1 รูปเพื่อความสมบูรณ์
          if (imageFiles.length === 0) {
            imageFiles = ['trainee_01.jpg'];
          }

          // เรียงลำดับไฟล์
          imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

          // แปลงเป็น Trainee Objects
          const trainees = imageFiles.map((fname, index) =>
            parseTraineeFromFilename(fname, index, batch.id)
          );

          return {
            ...batch,
            trainees
          };
        })
      );

      // ตรวจสอบว่ามีจำนวนภาพเพิ่มขึ้นหรือไม่เพื่อแจ้งเตือน Toast สวยๆ
      let totalImages = 0;
      let addedDiff = 0;
      updatedBatches.forEach((b) => {
        totalImages += b.trainees.length;
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

  // ทำงานอัตโนมัติ: โหลดตอนเปิดหน้าเว็บ, ตั้งเวลาตรวจจับทุก 4 วินาที, และตรวจจับเมื่อสลับกลับมาที่แท็บเว็บ
  useEffect(() => {
    scanFolderImages();

    // Auto-poll ทุก 4 วินาที เพื่อดักจับรูปใหม่ที่ผู้ใช้วางลงในโฟลเดอร์ทันที
    const interval = setInterval(() => {
      scanFolderImages(false);
    }, 4000);

    // เมื่อผู้ใช้สลับกลับมาจาก Windows Explorer / โฟลเดอร์รูปภาพ ให้สแกนทันที
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

  return (
    <div className="min-h-screen bg-[#f8faf8] text-gray-800 font-sans pb-16">
      
      {/* Toast แจ้งเตือนเมื่อตรวจพบรูปภาพใหม่ */}
      {newImageAlert && (
        <div className="fixed top-16 right-4 z-50 animate-bounce">
          <div className="bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-600 flex items-center gap-3 text-sm">
            <i className="fa-solid fa-cloud-arrow-down text-lg text-emerald-300"></i>
            <div>
              <p className="font-bold">{newImageAlert}</p>
              <p className="text-xs text-emerald-200">ระบบดึงภาพจากโฟลเดอร์และเรนเดอร์เรียบร้อย</p>
            </div>
            <button
              onClick={() => setNewImageAlert(null)}
              className="ml-2 text-emerald-300 hover:text-white"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Banner - โทนสว่าง สบายตา ไม่ทึบ */}
      <header className="bg-gradient-to-b from-white via-emerald-50/40 to-white text-gray-800 shadow-xs border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white rounded-full p-2 shadow-sm border-2 border-emerald-200 flex items-center justify-center shrink-0">
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
                  <span className="inline-block px-3 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                    <i className="fa-solid fa-graduation-cap mr-1 text-emerald-600"></i>
                    Bangkok Bonsai Training Program
                  </span>
                  
                  {/* Real-time Folder Sync Status Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    ตรวจจับรูปภาพอัตโนมัติ (Live Sync)
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950">
                  แผนผังผู้ผ่านการอบรมศิลปะบอนไซ
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  ทำเนียบผู้ผ่านการอบรมรุ่นที่ 1, รุ่นที่ 2, รุ่นที่ 3 สมาคมบอนไซไทย
                </p>
              </div>
            </div>

            {/* Quick Actions & Live Stats */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="bg-white border border-emerald-200/90 rounded-2xl px-4 py-2.5 shadow-2xs text-center min-w-[130px]">
                <div className="text-[11px] text-gray-500 font-medium">ผู้ผ่านการอบรม</div>
                <div className="text-2xl font-black text-emerald-800 leading-tight">
                  {totalTrainees} <span className="text-xs font-normal text-gray-600">ท่าน</span>
                </div>
              </div>

              {/* Refresh Folder Images Button */}
              <button
                onClick={() => scanFolderImages(true)}
                disabled={isScanning}
                className="px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-semibold shadow-2xs hover:shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="คลิกเพื่อสแกนรูปภาพในโฟลเดอร์ใหม่อีกครั้ง"
              >
                <i className={`fa-solid fa-arrows-rotate ${isScanning ? 'fa-spin text-emerald-600' : 'text-emerald-700'}`}></i>
                <span>{isScanning ? 'กำลังสแกน...' : 'รีเฟรชรูปภาพ'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer"
                title="พิมพ์หรือบันทึกเป็น PDF"
              >
                <i className="fa-solid fa-print"></i>
                <span className="hidden sm:inline">พิมพ์แผนผัง</span>
              </button>
            </div>

          </div>
        </div>
      </header>


      {/* 2. Control & Filter Bar (สบายตา สะอาด) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Batch Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setSelectedBatchId('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedBatchId === 'all'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-stone-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
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
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <i className="fa-solid fa-users"></i> {batch.batchNumber} ({batch.trainees.length})
              </button>
            ))}
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อจริง หรือชื่อเล่น..."
                className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-gray-200 rounded-2xl text-xs text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="bg-stone-100 p-1 rounded-2xl flex items-center border border-gray-200 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="มุมมองการ์ดภาพ"
              >
                <i className="fa-solid fa-grip"></i> การ์ด
              </button>
              <button
                onClick={() => setViewMode('org')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'org'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="มุมมองแผนผังผังงาน"
              >
                <i className="fa-solid fa-sitemap"></i> แผนผัง
              </button>
            </div>

          </div>

        </div>
      </section>


      {/* 3. Main Content: Trainee Roster by Batch */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {filteredBatches.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-gray-200 my-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl">
              <i className="fa-solid fa-user-slash"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-800">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</h3>
            <p className="text-sm text-gray-500 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกดูรุ่นอื่นๆ</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBatchId('all');
              }}
              className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              แสดงข้อมูลทั้งหมด
            </button>
          </div>
        ) : (
          filteredBatches.map((batch) => (
            <section
              key={batch.id}
              className="bg-white rounded-3xl shadow-sm border border-emerald-100/90 overflow-hidden transition-all hover:shadow-md"
            >
              {/* Batch Banner Header - สว่าง สบายตา */}
              <div className="px-6 sm:px-8 py-5 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/50 border-b border-emerald-100 text-gray-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-3 py-1 bg-emerald-700 text-white font-bold text-xs rounded-full shadow-2xs">
                        {batch.batchNumber}
                      </span>
                      <span className="text-xs text-emerald-800 font-mono font-semibold">
                        [{batch.batchCode}]
                      </span>
                      <span className="text-xs text-gray-500">
                        • โฟลเดอร์: <code className="bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-mono">{batch.folder}/</code>
                      </span>
                      <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ดึงรูปอัตโนมัติ ({batch.trainees.length} รูป)
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-950">
                      {batch.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
                      {batch.description}
                    </p>
                  </div>

                  {/* Batch Details (Date, Location, Instructor) */}
                  <div className="bg-white border border-emerald-200/80 rounded-2xl p-3 text-xs space-y-1 md:min-w-[270px] shadow-2xs">
                    <div className="flex items-center gap-2 text-gray-700">
                      <i className="fa-solid fa-calendar-days text-emerald-600 w-4 text-center"></i>
                      <span>{batch.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <i className="fa-solid fa-location-dot text-emerald-600 w-4 text-center"></i>
                      <span>{batch.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <i className="fa-solid fa-chalkboard-user text-emerald-600 w-4 text-center"></i>
                      <span className="truncate">วิทยากร: {batch.instructor}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* View 1: Cards View - สะอาดตา สบายตา เอาคำบรรยายออก เหลือแต่ชื่อจริง และชื่อเล่น */}
              {viewMode === 'cards' ? (
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                    {batch.trainees.map((trainee) => (
                      <div
                        key={trainee.id}
                        onClick={() => setSelectedTrainee({ ...trainee, batch })}
                        className="group bg-white hover:bg-emerald-50/30 rounded-2xl border border-gray-200/90 hover:border-emerald-400 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-1"
                      >
                        {/* Trainee Card Top Photo (Clear, Natural, Bright 3:4) */}
                        <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
                          <img
                            src={trainee.image}
                            alt={trainee.name}
                            className="w-full h-full object-cover object-top transition duration-500 group-hover:scale-104"
                            onError={(e) => {
                              // Fallback รูปภาพหากไฟล์ยังไม่เสร็จสิ้น
                              e.target.onerror = null;
                              e.target.src = 'sample-member.jpg';
                            }}
                          />
                        </div>

                        {/* Trainee Details Bottom: เฉพาะชื่อจริง และชื่อเล่น ตามที่ผู้ใช้ระบุ */}
                        <div className="p-3 text-center bg-white border-t border-gray-100 flex flex-col justify-center min-h-[64px]">
                          <div className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition leading-snug truncate">
                            {trainee.name}
                          </div>
                          <div className="text-xs text-emerald-700 font-medium mt-0.5 truncate">
                            ({trainee.nickname})
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* View 2: Hierarchical Org Chart View - สะอาด สบายตา */
                <div className="p-6 sm:p-8 overflow-x-auto">
                  <div className="min-w-[650px] flex flex-col items-center">
                    
                    {/* Level 1: Instructor / Master */}
                    <div className="bg-emerald-800 text-white px-6 py-3 rounded-2xl shadow-xs border border-emerald-600 text-center max-w-sm mb-6">
                      <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold">วิทยากรผู้ทรงคุณวุฒิประจำรุ่น</div>
                      <div className="text-sm font-bold mt-0.5">{batch.instructor}</div>
                      <div className="text-[11px] text-emerald-100 mt-0.5">{batch.location}</div>
                    </div>

                    <div className="w-0.5 h-6 bg-emerald-400 mb-6"></div>

                    {/* Level 2: Batch President */}
                    {batch.trainees.filter(t => t.role && t.role.includes('ประธาน')).slice(0, 1).map(leader => (
                      <div key={leader.id} className="flex flex-col items-center mb-6">
                        <div
                          onClick={() => setSelectedTrainee({ ...leader, batch })}
                          className="bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 rounded-2xl p-3 shadow-xs flex items-center gap-3 cursor-pointer transition transform hover:scale-103"
                        >
                          <img
                            src={leader.image}
                            alt={leader.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shadow-2xs"
                            onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                          />
                          <div>
                            <span className="px-2 py-0.5 bg-emerald-700 text-white font-bold text-[10px] rounded-full">
                              {leader.role}
                            </span>
                            <div className="text-sm font-bold text-gray-900 mt-0.5">{leader.name}</div>
                            <div className="text-xs text-emerald-700 font-medium">({leader.nickname})</div>
                          </div>
                        </div>
                        <div className="w-0.5 h-6 bg-emerald-400 mt-6"></div>
                      </div>
                    ))}

                    {/* Level 3: Members Grid */}
                    <div className="w-full flex justify-center flex-wrap gap-3 pt-4 border-t border-dashed border-emerald-200">
                      {batch.trainees.map((trainee) => (
                        <div
                          key={trainee.id}
                          onClick={() => setSelectedTrainee({ ...trainee, batch })}
                          className="bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-400 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition cursor-pointer flex items-center gap-2.5 w-52 transform hover:-translate-y-0.5"
                        >
                          <img
                            src={trainee.image}
                            alt={trainee.name}
                            className="w-10 h-10 rounded-full object-cover border border-emerald-200 shrink-0"
                            onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                          />
                          <div className="overflow-hidden text-left">
                            <div className="text-xs font-bold text-gray-900 truncate">{trainee.name}</div>
                            <div className="text-[11px] text-emerald-700 font-medium truncate">({trainee.nickname})</div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              )}

              {/* Batch Footer Summary */}
              <div className="px-6 py-3 bg-stone-50/70 border-t border-emerald-100 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-folder-open text-emerald-600"></i>
                  <span>ตำแหน่งโฟลเดอร์: <code className="font-semibold text-gray-700">{batch.folder}/</code></span>
                  <span className="text-emerald-700 font-medium">• เรนเดอร์รูปภาพอัตโนมัติ</span>
                </div>
                <div className="font-semibold text-emerald-900">
                  รวมผู้เข้าร่วมอบรม {batch.trainees.length} ท่าน
                </div>
              </div>

            </section>
          ))
        )}
      </main>


      {/* 4. Trainee Detail Modal Popup */}
      {selectedTrainee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 transform transition-all">
            
            {/* Modal Header - โทนสว่าง สบายตา */}
            <div className="bg-emerald-50/80 text-gray-800 px-6 py-4 flex items-center justify-between border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-700 text-white font-bold text-xs rounded-full shadow-2xs">
                  {selectedTrainee.batch ? selectedTrainee.batch.batchNumber : 'ผู้ผ่านการอบรม'}
                </span>
                <span className="text-xs text-emerald-800 font-mono font-semibold">
                  {selectedTrainee.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedTrainee(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex items-center justify-center text-sm border border-gray-200 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                
                {/* Photo 3:4 */}
                <div className="w-36 h-48 rounded-2xl overflow-hidden shadow-lg border-2 border-emerald-600 shrink-0 bg-stone-100">
                  <img
                    src={selectedTrainee.image}
                    alt={selectedTrainee.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                  />
                </div>

                {/* Trainee Info */}
                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      {selectedTrainee.role || 'ผู้ผ่านการอบรม'}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                      {selectedTrainee.name}
                    </h3>
                    <p className="text-sm text-gray-600 font-medium">
                      ชื่อเล่น: <strong className="text-emerald-800">{selectedTrainee.nickname}</strong>
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div>
                      <span className="text-gray-500">เลขที่ใบรับรอง:</span>{' '}
                      <code className="text-amber-800 font-mono font-bold">{selectedTrainee.certNo}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">สถานะ:</span>{' '}
                      <span className="text-emerald-700 font-bold">
                        <i className="fa-solid fa-circle-check text-emerald-500 mr-1"></i>
                        {selectedTrainee.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400 break-all">
                    <i className="fa-solid fa-folder-open mr-1 text-emerald-600"></i>
                    ที่อยู่ไฟล์ภาพ: <code>{selectedTrainee.image}</code>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedTrainee(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-print"></i> พิมพ์ประวัติ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Footer */}
      <footer className="mt-16 text-center text-xs text-gray-500 border-t border-gray-200 pt-8">
        <p className="font-bold text-gray-700 text-sm">สมาคมบอนไซไทย (Thai Bonsai Association)</p>
        <p className="mt-1">ทำเนียบผู้ผ่านการอบรมศิลปะและศาสตร์แห่งบอนไซ • กรุงเทพมหานคร</p>
        <p className="text-[11px] text-gray-400 mt-1">
          ระบบตรวจจับรูปภาพอัตโนมัติจากโฟลเดอร์ bangkokimage/
          {lastScanTime && ` • อัปเดตล่าสุดเมื่อ ${lastScanTime.toLocaleTimeString('th-TH')}`}
        </p>
      </footer>

    </div>
  );
}
