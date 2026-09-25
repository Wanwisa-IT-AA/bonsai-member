/**
 * BonsaiTraineeChart.jsx
 * แผนผังและทำเนียบผู้ผ่านการอบรมศิลปะการปลูกและสร้างสรรค์บอนไซ สมาคมบอนไซไทย
 * แบ่งเป็นรุ่นๆ (รุ่น 1, รุ่น 2, รุ่น 3) ดึงรูปจาก bangkokimage/1, bangkokimage/2, bangkokimage/3
 */

// รองรับทั้งระบบโมดูล (Bundler) และ Browser Standalone (window.React)
const _React = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : {});
const { useState, useMemo } = _React;

// ข้อมูลหลักสูตรและการจัดอบรมแต่ละรุ่น
const BATCH_DATA = [
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
    trainees: [
      {
        id: 'BKK-01-01',
        name: 'นายเกรียงไกร ชัยเจริญ',
        nickname: 'คุณไก่',
        treeSpecies: 'มะสังแคระป่า (Premna serratifolia)',
        status: 'จบหลักสูตรดีเด่น',
        certNo: 'TBA-CERT-2026-0101',
        image: 'bangkokimage/1/trainee_01.jpg',
        role: 'ประธานรุ่นที่ 1',
        highlight: 'สร้างโครงสร้างทรงต้นตรงสง่างาม (Chokkan Style)'
      },
      {
        id: 'BKK-01-02',
        name: 'นายสมศักดิ์ สุวรรณสิทธิ์',
        nickname: 'คุณศักดิ์',
        treeSpecies: 'ตะโกหนู (Diospyros rhodocalyx)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0102',
        image: 'bangkokimage/1/trainee_02.jpg',
        role: 'สมาชิก',
        highlight: 'เทคนิคการสร้างรากเกาะหิน (Ishitsuki)'
      },
      {
        id: 'BKK-01-03',
        name: 'นางวราภรณ์ มงคลชัย',
        nickname: 'คุณนา',
        treeSpecies: 'โพธิ์เก้าเกศ (Ficus religiosa)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0103',
        image: 'bangkokimage/1/trainee_03.jpg',
        role: 'สมาชิก',
        highlight: 'เทคนิคการย่อใบและกระตุ้นตาข้าง'
      },
      {
        id: 'BKK-01-04',
        name: 'นายกิตติคุณ รัตนกิจ',
        nickname: 'คุณเอก',
        treeSpecies: 'ชาฮกเกี้ยน (Carmona microphylla)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0104',
        image: 'bangkokimage/1/trainee_04.jpg',
        role: 'สมาชิก',
        highlight: 'การทำทรงต้นเอนลู่ลม (Fukinagashi)'
      }
    ]
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
    trainees: [
      {
        id: 'BKK-02-01',
        name: 'นางสาวแก้วตา มณีรัตน์',
        nickname: 'คุณแก้ว',
        treeSpecies: 'สนชิมปากุญี่ปุ่น (Juniperus chinensis)',
        status: 'จบหลักสูตรดีเด่น',
        certNo: 'TBA-CERT-2026-0201',
        image: 'bangkokimage/2/trainee_01.jpg',
        role: 'ประธานรุ่นที่ 2',
        highlight: 'การดัดขึ้นทรงกึ่งตกกระถาง (Han-Kengai)'
      },
      {
        id: 'BKK-02-02',
        name: 'นายพีระวัฒน์ ทวีทรัพย์',
        nickname: 'คุณพี',
        treeSpecies: 'เพรมน่าไต้หวัน (Premna microphylla)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0202',
        image: 'bangkokimage/2/trainee_02.jpg',
        role: 'สมาชิก',
        highlight: 'การจัดวางโครงสร้างกิ่งหน้า-กิ่งหลัง'
      },
      {
        id: 'BKK-02-03',
        name: 'นางจันทร์เพ็ญ รัตนประสิทธิ์',
        nickname: 'คุณเพ็ญ',
        treeSpecies: 'โมกหนูลา (Wrightia religiosa)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0203',
        image: 'bangkokimage/2/trainee_03.jpg',
        role: 'สมาชิก',
        highlight: 'การทำดอกและคุมฟอร์มพุ่มแน่น'
      },
      {
        id: 'BKK-02-04',
        name: 'นายอนันต์ รุ่งเรือง',
        nickname: 'คุณนันต์',
        treeSpecies: 'สนแบล็คไพน์ (Pinus thunbergii)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0204',
        image: 'bangkokimage/2/trainee_04.jpg',
        role: 'สมาชิก',
        highlight: 'การถอนเข็มและกระตุ้นตาชุดสอง (Mekiri)'
      }
    ]
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
    trainees: [
      {
        id: 'BKK-03-01',
        name: 'นายธนากร วัฒนศิลป์',
        nickname: 'คุณกร',
        treeSpecies: 'จูนิเปอร์สายพันธุ์ทอง (Golden Juniper)',
        status: 'จบหลักสูตรเกียรตินิยม',
        certNo: 'TBA-CERT-2026-0301',
        image: 'bangkokimage/3/trainee_01.jpg',
        role: 'ประธานรุ่นที่ 3',
        highlight: 'งานแกะซากไม้แห้งธรรมชาติ (Natural Deadwood Jin)'
      },
      {
        id: 'BKK-03-02',
        name: 'นายดนัย สิทธิพรชัย',
        nickname: 'คุณดนัย',
        treeSpecies: 'มะขามเทศด่าง (Pithecellobium dulce)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0302',
        image: 'bangkokimage/3/trainee_02.jpg',
        role: 'สมาชิก',
        highlight: 'การขึ้นทรงตกกระถางสมบูรณ์แบบ (Kengai Style)'
      },
      {
        id: 'BKK-03-03',
        name: 'นางสาวศิริพร บุญรักษา',
        nickname: 'คุณพร',
        treeSpecies: 'เพรมน่าใบด่าง (Premna Variegated)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0303',
        image: 'bangkokimage/3/trainee_03.jpg',
        role: 'สมาชิก',
        highlight: 'การจัดแสดงคู่กระถางดินปั้นมือศิลปินไทย'
      },
      {
        id: 'BKK-03-04',
        name: 'นายธวัชชัย บวรเกียรติ',
        nickname: 'คุณโต้ง',
        treeSpecies: 'ข้าวตอกพระร่วง (Serissa japonica)',
        status: 'จบหลักสูตร',
        certNo: 'TBA-CERT-2026-0304',
        image: 'bangkokimage/3/trainee_04.jpg',
        role: 'สมาชิก',
        highlight: 'การสร้างบอนไซจิ๋วทรงกลุ่มกอ (Kabudachi)'
      }
    ]
  }
];

export default function BonsaiTraineeChart() {
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'org'
  const [selectedTrainee, setSelectedTrainee] = useState(null);

  // คำนวณยอดรวมสถิติ
  const totalTrainees = useMemo(() => {
    return BATCH_DATA.reduce((acc, batch) => acc + batch.trainees.length, 0);
  }, []);

  // กรองข้อมูลตามรุ่นและคำค้นหา
  const filteredBatches = useMemo(() => {
    return BATCH_DATA.filter((batch) => {
      if (selectedBatchId !== 'all' && batch.id !== Number(selectedBatchId)) {
        return false;
      }
      return true;
    }).map((batch) => {
      const trainees = batch.trainees.filter((t) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.nickname && t.nickname.toLowerCase().includes(q)) ||
          t.treeSpecies.toLowerCase().includes(q) ||
          batch.batchNumber.toLowerCase().includes(q)
        );
      });
      return { ...batch, trainees };
    }).filter((batch) => batch.trainees.length > 0);
  }, [selectedBatchId, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-emerald-50/20 to-stone-100 text-gray-800 font-sans pb-16">
      
      {/* 1. Header Banner */}
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-950 text-white shadow-xl border-b-4 border-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-20 h-20 bg-white rounded-full p-2 shadow-lg border-2 border-emerald-400 flex items-center justify-center shrink-0">
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
                <span className="inline-block px-3 py-1 bg-emerald-800/80 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-700/60 mb-2">
                  <i className="fa-solid fa-graduation-cap mr-1.5"></i>
                  Bangkok Bonsai Training Program
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  แผนผังผู้ผ่านการอบรมศิลปะบอนไซ
                </h1>
                <p className="text-sm text-emerald-200 mt-1">
                  สมาคมบอนไซไทย (Thai Bonsai Association) • ทำเนียบรุ่นและผลงานสร้างสรรค์
                </p>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-emerald-800/60 backdrop-blur-sm border border-emerald-700/60 px-4 py-2.5 rounded-xl text-center shadow-sm">
                <div className="text-2xl font-black text-amber-300">{BATCH_DATA.length}</div>
                <div className="text-[11px] text-emerald-200">รุ่นที่เปิดอบรม</div>
              </div>
              <div className="bg-emerald-800/60 backdrop-blur-sm border border-emerald-700/60 px-4 py-2.5 rounded-xl text-center shadow-sm">
                <div className="text-2xl font-black text-emerald-300">{totalTrainees}</div>
                <div className="text-[11px] text-emerald-200">ผู้ผ่านการอบรมรวม</div>
              </div>
              <div className="bg-emerald-800/60 backdrop-blur-sm border border-emerald-700/60 px-4 py-2.5 rounded-xl text-center shadow-sm">
                <div className="text-2xl font-black text-white">100%</div>
                <div className="text-[11px] text-emerald-200">ได้รับประกาศนียบัตร</div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* 2. Control Bar (Filter & Search) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 p-4 sm:p-5 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Tabs เลือกดูเป็นรุ่นๆ */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <button
              onClick={() => setSelectedBatchId('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedBatchId === 'all'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <i className="fa-solid fa-layer-group"></i> ทุกรุ่น ({totalTrainees})
            </button>
            {BATCH_DATA.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedBatchId === b.id
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800'
                }`}
              >
                <i className="fa-solid fa-users-viewfinder"></i> {b.batchNumber}
              </button>
            ))}
          </div>

          {/* Search Bar & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัส, พันธุ์ไม้..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-end sm:self-auto shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="มุมมองการ์ดรุ่น"
              >
                <i className="fa-solid fa-table-cells-large"></i> การ์ดรุ่น
              </button>
              <button
                onClick={() => setViewMode('org')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'org'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="มุมมองแผนผังผังงาน"
              >
                <i className="fa-solid fa-sitemap"></i> แผนผังรุ่น
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 3. Main Content: Trainee Roster by Batch */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-12">
        {filteredBatches.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-200 my-8">
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
              className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition"
            >
              แสดงข้อมูลทั้งหมด
            </button>
          </div>
        ) : (
          filteredBatches.map((batch) => (
            <section
              key={batch.id}
              className="bg-white rounded-3xl shadow-md border border-gray-200/90 overflow-hidden transition-all hover:shadow-lg"
            >
              {/* Batch Banner Header */}
              <div className="relative px-6 sm:px-8 py-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-full shadow-xs">
                        {batch.batchNumber}
                      </span>
                      <span className="text-xs text-emerald-200 font-mono tracking-wider">
                        [{batch.batchCode}]
                      </span>
                      <span className="text-xs text-emerald-200">
                        • โฟลเดอร์รูปภาพ: <code className="bg-emerald-950/60 px-2 py-0.5 rounded text-amber-200">{batch.folder}</code>
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {batch.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-2xl">
                      {batch.description}
                    </p>
                  </div>

                  {/* Batch Details (Date, Location, Instructor) */}
                  <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-3.5 text-xs space-y-1 md:min-w-[280px]">
                    <div className="flex items-center gap-2 text-emerald-200">
                      <i className="fa-solid fa-calendar-days text-amber-300 w-4 text-center"></i>
                      <span>{batch.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-200">
                      <i className="fa-solid fa-location-dot text-amber-300 w-4 text-center"></i>
                      <span>{batch.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-200">
                      <i className="fa-solid fa-chalkboard-user text-amber-300 w-4 text-center"></i>
                      <span className="truncate">วิทยากร: {batch.instructor}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* View 1: Cards View */}
              {viewMode === 'cards' ? (
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {batch.trainees.map((trainee) => (
                      <div
                        key={trainee.id}
                        onClick={() => setSelectedTrainee({ ...trainee, batch })}
                        className="group bg-stone-50/70 hover:bg-white rounded-2xl border border-stone-200/90 hover:border-emerald-500 overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-1"
                      >
                        {/* Trainee Card Top Photo */}
                        <div className="relative aspect-[3/4] bg-stone-200 overflow-hidden">
                          <img
                            src={trainee.image}
                            alt={trainee.name}
                            className="w-full h-full object-cover object-top transition duration-500 group-hover:scale-105"
                            onError={(e) => {
                              // Fallback รูปภาพหากไฟล์ในโฟลเดอร์ยังไม่มี
                              e.target.onerror = null;
                              e.target.src = 'sample-member.jpg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
                          
                          {/* Role Tag & ID Badge */}
                          <div className="absolute top-2.5 left-2.5">
                            <span className="bg-emerald-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded-md border border-emerald-600/60 shadow">
                              {trainee.id}
                            </span>
                          </div>
                          <div className="absolute top-2.5 right-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow ${
                              trainee.role.includes('ประธาน')
                                ? 'bg-amber-400 text-amber-950 font-black'
                                : 'bg-white/90 text-gray-700'
                            }`}>
                              {trainee.role}
                            </span>
                          </div>

                          {/* Trainee Name on bottom of photo */}
                          <div className="absolute bottom-2.5 left-3 right-3 text-white">
                            <div className="text-base font-bold drop-shadow leading-tight">
                              {trainee.name}
                            </div>
                            <div className="text-xs text-amber-300 font-medium">
                              ({trainee.nickname})
                            </div>
                          </div>
                        </div>

                        {/* Trainee Details Bottom */}
                        <div className="p-3.5 space-y-2 text-xs flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-1.5 text-gray-700">
                              <i className="fa-solid fa-seedling text-emerald-600 mt-0.5 shrink-0"></i>
                              <span className="font-semibold text-gray-900 line-clamp-1">
                                {trainee.treeSpecies}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 line-clamp-2 italic bg-white p-2 rounded-lg border border-gray-100">
                              "{trainee.highlight}"
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                              <i className="fa-solid fa-circle-check text-emerald-500"></i>
                              {trainee.status}
                            </span>
                            <span className="text-[11px] text-gray-400 group-hover:text-emerald-700 flex items-center gap-1 transition">
                              ดูประวัติ <i className="fa-solid fa-chevron-right text-[9px]"></i>
                            </span>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* View 2: Hierarchical Org Chart View */
                <div className="p-6 sm:p-8 overflow-x-auto">
                  <div className="min-w-[650px] flex flex-col items-center">
                    
                    {/* Level 1: Instructor / Master */}
                    <div className="bg-emerald-950 text-white px-6 py-3 rounded-2xl shadow-md border-2 border-emerald-500 text-center max-w-sm mb-6">
                      <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">วิทยากรผู้ทรงคุณวุฒิประจำรุ่น</div>
                      <div className="text-sm font-bold mt-0.5">{batch.instructor}</div>
                      <div className="text-[11px] text-emerald-200 mt-1">{batch.location}</div>
                    </div>

                    <div className="w-0.5 h-6 bg-emerald-600 mb-6"></div>

                    {/* Level 2: Batch President */}
                    {batch.trainees.filter(t => t.role.includes('ประธาน')).map(leader => (
                      <div key={leader.id} className="flex flex-col items-center mb-6">
                        <div
                          onClick={() => setSelectedTrainee({ ...leader, batch })}
                          className="bg-amber-50 hover:bg-amber-100 border-2 border-amber-400 rounded-2xl p-4 shadow-md flex items-center gap-3 cursor-pointer transition transform hover:scale-105"
                        >
                          <img
                            src={leader.image}
                            alt={leader.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 shadow-sm"
                            onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                          />
                          <div>
                            <span className="px-2 py-0.5 bg-amber-400 text-amber-950 font-bold text-[10px] rounded-full">
                              {leader.role}
                            </span>
                            <div className="text-sm font-bold text-gray-900 mt-0.5">{leader.name}</div>
                            <div className="text-xs text-gray-600">{leader.treeSpecies}</div>
                          </div>
                        </div>
                        <div className="w-0.5 h-6 bg-emerald-600 mt-6"></div>
                      </div>
                    ))}

                    {/* Level 3: Members Grid */}
                    <div className="w-full flex justify-center flex-wrap gap-4 pt-4 border-t-2 border-dashed border-emerald-300">
                      {batch.trainees.map((trainee) => (
                        <div
                          key={trainee.id}
                          onClick={() => setSelectedTrainee({ ...trainee, batch })}
                          className="bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-500 rounded-xl p-3 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-3 w-56 transform hover:-translate-y-0.5"
                        >
                          <img
                            src={trainee.image}
                            alt={trainee.name}
                            className="w-10 h-10 rounded-full object-cover border border-emerald-300"
                            onError={(e) => { e.target.src = 'sample-member.jpg'; }}
                          />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-gray-900 truncate">{trainee.name}</div>
                            <div className="text-[10px] text-gray-500 truncate">{trainee.treeSpecies}</div>
                            <div className="text-[9px] text-emerald-600 font-mono">{trainee.id}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              )}

              {/* Batch Footer Summary */}
              <div className="px-6 py-3 bg-stone-50 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <i className="fa-solid fa-circle-info text-emerald-600 mr-1.5"></i>
                  ภาพถ่ายจริงถูกโหลดจากโฟลเดอร์ <span className="font-semibold text-gray-700">{batch.folder}/</span>
                </div>
                <div className="font-medium text-emerald-800">
                  จำนวนผู้ผ่านการประเมิน {batch.trainees.length} ท่าน
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
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 to-green-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-700">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 font-bold text-xs rounded-full">
                  {selectedTrainee.batch.batchNumber}
                </span>
                <span className="text-xs text-emerald-200 font-mono">
                  {selectedTrainee.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedTrainee(null)}
                className="w-8 h-8 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-white flex items-center justify-center text-sm transition"
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
                      {selectedTrainee.role}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                      {selectedTrainee.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      ชื่อเล่น: {selectedTrainee.nickname}
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div>
                      <span className="text-gray-500">สายพันธุ์บอนไซ:</span>{' '}
                      <strong className="text-emerald-900 font-semibold">{selectedTrainee.treeSpecies}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">เทคนิคผลงาน:</span>{' '}
                      <span className="text-gray-700">{selectedTrainee.highlight}</span>
                    </div>
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

                  <div className="text-[11px] text-gray-400">
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
        <p className="text-[11px] text-gray-400 mt-1">© 2026 สงวนลิขสิทธิ์</p>
      </footer>

    </div>
  );
}
