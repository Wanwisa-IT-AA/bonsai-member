/**
 * ระบบทะเบียนสมาชิก สมาคมบอนไซไทย (Thai Bonsai Association)
 * Google Apps Script Backend (Code.gs)
 * 
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheets ที่เก็บข้อมูลสมาชิก
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) > Apps Script
 * 3. คัดลอกโค้ดทั้งหมดในไฟล์นี้ไปวางแทนที่โค้ดเดิมใน Code.gs
 * 4. กดปุ่ม บันทึก (Save)
 * 5. กดปุ่ม การทำให้ใช้งานได้ (Deploy) > จัดการการทำให้ใช้งานได้ (Manage deployments)
 * 6. เลือก แก้ไข (Edit) > เวอร์ชันใหม่ (New version) > นำไปใช้งาน (Deploy)
 */

const SHEET_NAME = "Sheet1"; // ชื่อแท็บแผ่นงาน หรือใช้แท็บแรกสุด

function getTargetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  return sheet;
}

// -------------------------------------------------------------
// 1. GET: ดึงรายชื่อสมาชิกทั้งหมดส่งกลับเป็น JSON
// -------------------------------------------------------------
function doGet(e) {
  try {
    const sheet = getTargetSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length <= 1) {
      return responseJSON([]);
    }

    const headers = values[0].map(h => String(h).trim());
    const members = [];

    // แผนที่จับคู่วิเคราะห์คอลัมน์จาก Header
    const colIndex = {
      id: findCol(headers, [/^id$/i, /รหัส/i], 0),
      joinDate: findCol(headers, [/joinDate/i, /วันที่/i], 1),
      firstName: findCol(headers, [/firstName/i, /ชื่อ(?!เล่น)/i], 2),
      lastName: findCol(headers, [/lastName/i, /นามสกุล/i], 3),
      phone: findCol(headers, [/phone/i, /เบอร์/i, /โทร/i], 4),
      province: findCol(headers, [/province/i, /จังหวัด/i], 5),
      status: findCol(headers, [/status/i, /สถานะ/i], 6),
      photoUrl: findCol(headers, [/photoUrl/i, /รูปถ่าย/i, /รูปหน้าตรง/i], 7),
      slipUrl: findCol(headers, [/slipUrl/i, /สลิป/i], 8),
      issueDate: findCol(headers, [/issueDate/i, /วันออกบัตร/i], 9),
      expireDate: findCol(headers, [/expireDate/i, /วันหมดอายุ/i], 10),
      pdpaConsent: findCol(headers, [/pdpaConsent/i, /pdpa/i, /ความยินยอม/i], 11),
      pdpaConsentDate: findCol(headers, [/pdpaConsentDate/i, /วันที่ยินยอม/i], 12)
    };

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const idVal = row[colIndex.id] ? String(row[colIndex.id]).trim() : "";
      
      // ข้ามแถวที่ไม่มีรหัสสมาชิก
      if (!idVal) continue;

      members.push({
        id: idVal,
        joinDate: row[colIndex.joinDate] || "",
        firstName: row[colIndex.firstName] || "",
        lastName: row[colIndex.lastName] || "",
        phone: row[colIndex.phone] || "",
        province: row[colIndex.province] || "",
        status: row[colIndex.status] || "pending",
        photoUrl: row[colIndex.photoUrl] || "",
        slipUrl: row[colIndex.slipUrl] || "",
        issueDate: row[colIndex.issueDate] || "",
        expireDate: row[colIndex.expireDate] || "",
        pdpaConsent: row[colIndex.pdpaConsent] || "",
        pdpaConsentDate: row[colIndex.pdpaConsentDate] || ""
      });
    }

    return responseJSON(members);
  } catch (err) {
    return responseJSON({ error: err.message });
  }
}

// -------------------------------------------------------------
// 2. POST: รองรับ register, updateStatus, payment
// -------------------------------------------------------------
function doPost(e) {
  try {
    const sheet = getTargetSheet();
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "register";

    if (action === "updateStatus") {
      return handleUpdateStatus(sheet, data);
    } else if (action === "payment") {
      return handlePayment(sheet, data);
    } else if (action === "register") {
      return handleRegister(sheet, data);
    } else if (action === "updatePhoto") {
      return handleUpdatePhoto(sheet, data);
    } else {
      return responseJSON({ status: "error", message: "Unknown action: " + action });
    }
  } catch (err) {
    return responseJSON({ status: "error", message: err.message });
  }
}

// -------------------------------------------------------------
// อนุมัติสมาชิก / อัปเดตสถานะ (ค้นหาแถวเดิม แก้ไขเฉพาะสถานะ ไม่เพิ่มแถวใหม่)
// -------------------------------------------------------------
function handleUpdateStatus(sheet, data) {
  const targetId = String(data.id || "").trim();
  if (!targetId) {
    return responseJSON({ status: "error", message: "กรุณาระบุรหัสสมาชิก (id)" });
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());

  const idCol = findCol(headers, [/^id$/i, /รหัส/i], 0);
  const statusCol = findCol(headers, [/status/i, /สถานะ/i], 6);

  let updatedCount = 0;
  const newStatus = data.status || "active";

  // ค้นหาทุกแถวที่มี ID ตรงกัน และอัปเดตสถานะ (แก้ไขปัญหาเดิมที่มีแถวซ้ำ)
  for (let i = 1; i < values.length; i++) {
    const rowId = values[i][idCol] ? String(values[i][idCol]).trim() : "";
    if (rowId === targetId) {
      const sheetRowIndex = i + 1; // 1-indexed ใน Spreadsheet
      sheet.getRange(sheetRowIndex, statusCol + 1).setValue(newStatus);
      updatedCount++;
    }
  }

  if (updatedCount === 0) {
    return responseJSON({ status: "error", message: "ไม่พบรหัสสมาชิก " + targetId + " ในระบบ" });
  }

  return responseJSON({
    status: "success",
    message: "อัปเดตสถานะสมาชิก " + targetId + " เป็น " + newStatus + " เรียบร้อยแล้ว"
  });
}

// -------------------------------------------------------------
// บันทึกแจ้งชำระเงิน / สลิป (ค้นหาแถวเดิมและอัปเดต)
// -------------------------------------------------------------
function handlePayment(sheet, data) {
  const memberKey = String(data.memberId || "").trim();
  if (!memberKey) {
    return responseJSON({ status: "error", message: "กรุณาระบุเลขสมาชิกหรือเบอร์โทร" });
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());

  const idCol = findCol(headers, [/^id$/i, /รหัส/i], 0);
  const phoneCol = findCol(headers, [/phone/i, /เบอร์/i, /โทร/i], 4);
  const slipCol = findCol(headers, [/slip/i, /สลิป/i], 8);

  // อัปโหลดสลิปไป Google Drive (ถ้ามี)
  let slipUrl = "";
  if (data.slipBase64) {
    slipUrl = uploadBase64ToDrive(data.slipBase64, "slip_" + memberKey + ".jpg");
  }

  let foundRow = -1;
  for (let i = 1; i < values.length; i++) {
    const rowId = values[i][idCol] ? String(values[i][idCol]).trim() : "";
    const rowPhone = values[i][phoneCol] ? String(values[i][phoneCol]).trim() : "";
    if (rowId === memberKey || rowPhone === memberKey) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow !== -1) {
    if (slipUrl && slipCol !== -1) {
      sheet.getRange(foundRow, slipCol + 1).setValue(slipUrl);
    }
    return responseJSON({ status: "success", message: "บันทึกข้อมูลสลิปเรียบร้อยแล้ว", slipUrl: slipUrl });
  } else {
    return responseJSON({ status: "error", message: "ไม่พบข้อมูลสมาชิกที่ตรงกับ: " + memberKey });
  }
}

// -------------------------------------------------------------
// ลงทะเบียนสมาชิกใหม่ (รันรหัสสมาชิกเริ่มต้น TBA-0001)
// -------------------------------------------------------------
function handleRegister(sheet, data) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  const idCol = findCol(headers, [/^id$/i, /รหัส/i], 0);

  // คำนวณรหัสสมาชิกลำดับถัดไป (เริ่มจาก TBA-0001)
  const nextMemberId = getNextMemberId(sheet, idCol);

  let photoUrl = "";
  if (data.photoBase64) {
    photoUrl = uploadBase64ToDrive(data.photoBase64, "photo_" + nextMemberId + ".jpg");
  }

  const newRow = [
    nextMemberId,
    new Date(),
    data.firstName || "",
    data.lastName || "",
    data.phone || "",
    data.province || "",
    "pending",
    photoUrl,
    "",            // slipUrl
    data.issueDate || "",
    data.expireDate || "",
    data.pdpaConsent || "ยินยอม",
    data.pdpaConsentDate || new Date().toLocaleString("th-TH")
  ];

  sheet.appendRow(newRow);
  // เพิ่ม Header ใหม่ถ้ายังไม่มี (issueDate / expireDate / pdpaConsent / pdpaConsentDate)
  const lastCol = sheet.getLastColumn();
  if (lastCol < 10) sheet.getRange(1, 10).setValue("issueDate");
  if (lastCol < 11) sheet.getRange(1, 11).setValue("expireDate");
  if (lastCol < 12) sheet.getRange(1, 12).setValue("pdpaConsent");
  if (lastCol < 13) sheet.getRange(1, 13).setValue("pdpaConsentDate");
  return responseJSON({
    status: "success",
    message: "ลงทะเบียนและบันทึกเข้า Google Sheets เรียบร้อย!",
    id: nextMemberId
  });
}

function getNextMemberId(sheet, idCol) {
  const lastRow = sheet.getLastRow();
  let maxNum = 0;

  if (lastRow >= 2) {
    const idValues = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < idValues.length; i++) {
      const val = String(idValues[i][0] || "").trim();
      const match = val.match(/^TBA-(\d+)$/i);
      if (match) {
        const numStr = match[1];
        // กรองเลขสุ่ม 6 หลักเดิมออก เพื่อให้เริ่มรันเลข 4 หลักจาก TBA-0001 เป็นต้นไป
        if (numStr.length <= 4 || parseInt(numStr, 10) < 10000) {
          const num = parseInt(numStr, 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  return "TBA-" + String(nextNum).padStart(4, "0");
}

// -------------------------------------------------------------
// ฟังก์ชันเสริม (Helper Functions)
// -------------------------------------------------------------
function findCol(headers, regexList, defaultIndex) {
  for (let i = 0; i < headers.length; i++) {
    for (let r = 0; r < regexList.length; r++) {
      if (regexList[r].test(headers[i])) return i;
    }
  }
  return defaultIndex;
}

function uploadBase64ToDrive(base64String, fileName) {
  try {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let contentType = "image/jpeg";
    let bytes;

    if (matches && matches.length === 3) {
      contentType = matches[1];
      bytes = Utilities.base64Decode(matches[2]);
    } else {
      bytes = Utilities.base64Decode(base64String);
    }

    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = DriveApp.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "";
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// อัปเดตรูปถ่ายสมาชิกใน Card พร้อมลบไฟล์รูปเก่าออกจาก Google Drive
// -------------------------------------------------------------
function handleUpdatePhoto(sheet, data) {
  const targetId = String(data.id || "").trim();
  if (!targetId) {
    return responseJSON({ status: "error", message: "กรุณาระบุรหัสสมาชิก (id)" });
  }
  if (!data.photoBase64) {
    return responseJSON({ status: "error", message: "กรุณาแนบข้อมูลรูปถ่าย (photoBase64)" });
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());

  const idCol = findCol(headers, [/^id$/i, /รหัส/i], 0);
  const photoCol = findCol(headers, [/photoUrl/i, /รูปถ่าย/i, /รูปหน้าตรง/i], 7);

  let targetRow = -1;
  let oldPhotoUrl = data.oldPhotoUrl || "";

  for (let i = 1; i < values.length; i++) {
    const rowId = values[i][idCol] ? String(values[i][idCol]).trim() : "";
    if (rowId === targetId) {
      targetRow = i + 1; // 1-indexed ใน Spreadsheet
      if (!oldPhotoUrl && photoCol !== -1) {
        oldPhotoUrl = values[i][photoCol] || "";
      }
      break;
    }
  }

  if (targetRow === -1) {
    return responseJSON({ status: "error", message: "ไม่พบรหัสสมาชิก " + targetId + " ในระบบ" });
  }

  // 1. ลบไฟล์รูปเก่าออกจาก Google Drive (ย้ายลงถังขยะอย่างสมบูรณ์)
  if (oldPhotoUrl) {
    deleteDriveFileByUrl(oldPhotoUrl);
  }

  // 2. อัปโหลดรูปใหม่เข้า Google Drive
  const newFileName = "photo_" + targetId + "_" + new Date().getTime() + ".jpg";
  const newPhotoUrl = uploadBase64ToDrive(data.photoBase64, newFileName);

  if (!newPhotoUrl) {
    return responseJSON({ status: "error", message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพใหม่ไปยัง Google Drive" });
  }

  // 3. บันทึก URL ใหม่ลงใน Google Sheets
  if (photoCol !== -1) {
    sheet.getRange(targetRow, photoCol + 1).setValue(newPhotoUrl);
  }

  return responseJSON({
    status: "success",
    message: "เปลี่ยนรูปภาพและลบรูปเก่าเรียบร้อยแล้ว",
    photoUrl: newPhotoUrl
  });
}

// ฟังก์ชันลบไฟล์ออกจาก Google Drive ตาม URL
function deleteDriveFileByUrl(fileUrl) {
  try {
    if (!fileUrl) return;
    const match = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                  fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      const file = DriveApp.getFileById(fileId);
      if (file) {
        file.setTrashed(true); // ย้ายลงถังขยะใน Google Drive
      }
    }
  } catch (e) {
    console.warn("Delete old photo error:", e.message);
  }
}
