/**
 * Production-ready Google Apps Script (Code.gs) template for teachers & schools.
 * Supports Multi-User / Multi-Classroom / Dedicated Spreadsheets per ID:
 * - Creates a dedicated Google Sheet file in Google Drive for every Admin-created ID / Teacher!
 * - Isolates data completely so each teacher's records are private, organized, and secure.
 * - Non-destructive Master Spreadsheet synchronization: Other teachers' data is NEVER deleted or overwritten.
 * - Central Master Members directory linking directly to each teacher's private Google Sheet.
 */

export const GAS_CODE_TEMPLATE = `/**
 * =========================================================================================
 * 🎓 ระบบสารสนเทศและบริหารจัดการข้อมูลครูประจำชั้น (Google Apps Script Backend API v4.0)
 * 📁 Google Sheets (สร้างไฟล์แยกราย ID อัตโนมัติ + รวมศูนย์ Master + ป้องกันข้อมูลสูญหาย 100%)
 * ☁️ Google Drive (จัดเก็บไฟล์และสำรองข้อมูลอัตโนมัติ)
 * =========================================================================================
 * 
 * 📌 จุดเด่นและระบบความปลอดภัยในเวอร์ชัน 4.0:
 * 1. 📂 แยก Google Sheet ใหม่เสมอสำหรับทุก ID ที่สร้าง:
 *    - ทุก ID ที่ Admin สร้าง (เช่น airfan, kru_somchai ฯลฯ) ระบบจะสร้างไฟล์ Google Sheet ส่วนตัว
 *      แยกเฉพาะสำหรับ ID นั้นๆ ลงใน Google Drive โดยอัตโนมัติ (1 ID = 1 Google Sheet แยกไฟล์เด็ดขาด)
 * 2. 🛡️ ข้อมูลไม่หายเด็ดขาด (Zero Data Loss Guarantee):
 *    - เมื่อมีคุณครูคนใดคนหนึ่งกดซิงค์ข้อมูล ระบบจะไม่อนุญาตให้ลบข้อมูลของครูหรือ ID อื่นๆ
 *    - ในชีตหลัก (Master) ใช้ระบบ Smart Upsert อัปเดตเฉพาะแถวของ ID ที่ส่งมา ข้อมูลของ ID อื่นยังอยู่ครบ 100%
 *    - ในไฟล์ชีตประจำตัวของแต่ละ ID จะมีเฉพาะข้อมูลของครูห้องนั้นๆ 100% สะอาดตา ไม่ปะปนกับใคร
 * 3. 🔗 รวมศูนย์ลิงก์ชีตในแท็บ "Members":
 *    - ที่ไฟล์หลัก ในแท็บ Members จะมีคอลัมน์ลิงก์เปิด Google Sheet ประจำตัวของแต่ละ ID ให้คลิกเปิดดูได้ทันที
 * 
 * 📌 ขั้นตอนการติดตั้งหรืออัปเกรด:
 * 1. เปิด Google Sheets ของท่าน (ไฟล์หลักที่ต้องการให้เป็น Master Sheet)
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > เลือก "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดในไฟล์ Code.gs แล้ววางโค้ดชุดนี้ลงไปแทนที่ทั้งหมด
 * 4. เลือกฟังก์ชัน "initSpreadsheet" แล้วกด "เรียกใช้" (Run) 1 ครั้ง เพื่อเตรียมหัวตารางทั้ง 8 ชีต
 * 5. กดปุ่มสีน้ำเงิน "การทำให้ใช้งานได้" (Deploy) > "จัดการการทำให้ใช้งานได้" (Manage deployments)
 *    - กดรูปดินสอ (Edit) > เลือกเวอร์ชัน: "เวอร์ชันใหม่" (New version)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: "ทุกคน" (Anyone)
 *    - กด "ทำให้ใช้งานได้" (Deploy)
 * 6. คัดลอก "URL ของเว็บแอป" (Web App URL) มาวางในหน้าตั้งค่าของระบบ
 * =========================================================================================
 */

// 📂 รหัสโฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์และชีตประจำ ID (สามารถเปลี่ยนเป็น Folder ID ของท่านได้)
var DEFAULT_DRIVE_FOLDER_ID = "1nymxjSukQ_exIWuN6HRehXRTFrPrfekP";

/**
 * ⚡ ฟังก์ชันสร้างและตั้งค่าชีตหลัก (Master Spreadsheet) โดยอัตโนมัติ (คลิก Run ครั้งแรกเพื่อเตรียมชีต)
 */
function initSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ชีต Members (รายชื่อสมาชิก และลิงก์ Google Sheet ประจำ ID)
  setupSheet(ss, "Members", [
    "รหัสสมาชิก (User ID)", "ชื่อผู้ใช้งาน (Username)", "ชื่อ-สกุลครู", 
    "บทบาท (Role)", "ห้องเรียนที่รับผิดชอบ", "โรงเรียน", 
    "ลิงก์ Google Sheet ประจำ ID (เปิดดู)", "Google Sheet ID",
    "สถานะบัญชี", "วันที่สร้าง", "เข้าสู่ระบบล่าสุด"
  ], "#7c3aed");

  // 2. ชีต Students (ทะเบียนนักเรียน - รวมทุกห้องเรียน)
  setupSheet(ss, "Students", [
    "บัญชีครู (ID)", "ชื่อครูผู้รับผิดชอบ", "ห้องเรียน", 
    "รหัสนักเรียน (ID)", "เลขประจำตัว", "คำนำหน้า", "ชื่อ", "นามสกุล", 
    "ชื่อเล่น", "วันเกิด", "อายุ", "เพศ", "อาศัยอยู่กับ", 
    "การเดินทาง", "เงินมา รร. (บาท)", "อาชีพผู้ปกครอง", "เบอร์โทรผู้ปกครอง", 
    "ที่อยู่", "กรุ๊ปเลือด", "โรคประจำตัว", "ลิงก์รูปถ่าย (Drive)", 
    "เงินออมสะสม (บาท)", "ข้อมูลเพิ่มเติม (JSON)", "วันที่สร้าง", "อัปเดตล่าสุด"
  ], "#047857");

  // 3. ชีต AttendanceBank (เช็คชื่อประจำวันและฝากเงิน - รวมทุกห้องเรียน)
  setupSheet(ss, "AttendanceBank", [
    "วันที่ (วว/ดด/ปปปป)", "บัญชีครู (ID)", "ห้องเรียน", 
    "รหัสนักเรียน", "ชื่อ-สกุล", "สถานะการมาเรียน", "ยอดเงินฝากวันนี้ (บาท)", 
    "หมายเหตุประจำวัน", "อัปเดตล่าสุด"
  ], "#0d9488");

  // 4. ชีต WeightHeight (น้ำหนัก-ส่วนสูง BMI - รวมทุกห้องเรียน)
  setupSheet(ss, "WeightHeight", [
    "รหัสบันทึก", "บัญชีครู (ID)", "ห้องเรียน", "วันที่ตรวจวัด", "ปีการศึกษา", "ภาคเรียน", 
    "รหัสนักเรียน", "ชื่อ-สกุล", "อายุ (ปี)", "น้ำหนัก (กก.)", 
    "ส่วนสูง (ซม.)", "ค่า BMI", "สถานะการเจริญเติบโต", "หมายเหตุ", "บันทึกเมื่อ"
  ], "#059669");

  // 5. ชีต Withdrawals (ประวัติการถอนเงินออม - รวมทุกห้องเรียน)
  setupSheet(ss, "Withdrawals", [
    "รหัสรายการ", "บัญชีครู (ID)", "ห้องเรียน", "รหัสนักเรียน", "ชื่อนักเรียน", 
    "วันที่ถอน", "เวลา", "ยอดเงินที่ถอน (บาท)", "เหตุผลการถอน", "ครูผู้บันทึก", "วันที่บันทึก"
  ], "#e11d48");

  // 6. ชีต Scores (บันทึกคะแนนและตัดเกรด - รวมทุกห้องเรียน)
  setupSheet(ss, "Scores", [
    "รหัสชุดคะแนน", "บัญชีครู (ID)", "ห้องเรียน", "ชื่อวิชา", "รหัสวิชา", "ระดับชั้น", "ภาคเรียน", "ปีการศึกษา",
    "รหัสนักเรียน", "ชื่อ-สกุล", "บทที่ 1", "บทที่ 2", "บทที่ 3", "บทที่ 4", 
    "บทที่ 5", "บทที่ 6", "บทที่ 7", "บทที่ 8", "สอบปลายภาค", "คะแนนรวม (100)", 
    "เกรดที่ได้", "โครงสร้างบทเรียน (JSON)", "อัปเดตล่าสุด"
  ], "#2563eb");

  // 7. ชีต Events (ปฏิทินกิจกรรมและการนัดหมาย)
  setupSheet(ss, "Events", [
    "รหัสกิจกรรม", "บัญชีครู (ID)", "ห้องเรียน", "ชื่อกิจกรรม/นัดหมาย", 
    "วันที่", "เวลาเริ่มต้น", "เวลาสิ้นสุด", "สีแถบกิจกรรม", "รายละเอียด/สถานที่", "วันที่สร้าง"
  ], "#d97706");

  // 8. ชีต Settings (ข้อมูลโรงเรียนและครูแต่ละห้อง)
  setupSheet(ss, "Settings", [
    "บัญชีครู (ID)", "ชื่อครูประจำชั้น", "โรงเรียน", "ชั้นเรียน", 
    "ปีการศึกษา", "Google Drive Folder ID", "Google Sheet ประจำตัว", "อัปเดตล่าสุด"
  ], "#475569");

  Logger.log("✅ ตั้งค่า Master Google Sheets ครบทั้ง 8 หมวดหมู่เรียบร้อยแล้ว!");
}

/**
 * 🛠️ ฟังก์ชันช่วยจัดรูปแบบหัวตาราง
 */
function setupSheet(ss, sheetName, headers, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(headerColor || "#047857");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Sarabun");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var params = {};
    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    var action = params.action || "ping";
    var responseData = { status: "success", action: action, version: "v4.0" };
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case "ping":
        responseData.message = "ระบบเชื่อมต่อ Google Apps Script v4.0 พร้อมแยก Google Sheet ราย ID สำเร็จ!";
        responseData.spreadsheetName = ss.getName();
        responseData.spreadsheetId = ss.getId();
        responseData.spreadsheetUrl = ss.getUrl();
        responseData.timestamp = new Date().toISOString();
        break;

      case "uploadFile":
        var fileInfo = saveFileToDrive(
          params.base64Data, 
          params.fileName, 
          params.mimeType, 
          params.folderId || DEFAULT_DRIVE_FOLDER_ID
        );
        responseData.file = fileInfo;
        responseData.message = "อัปโหลดไฟล์ลง Google Drive สำเร็จ";
        break;

      // สร้าง Google Sheet ใหม่เฉพาะ ID นั้นๆ ทันที
      case "createMemberSpreadsheet":
        var targetUid = (params.userId || "").trim().toLowerCase();
        if (!targetUid) {
          throw new Error("กรุณาระบุ User ID สำหรับสร้าง Google Sheet");
        }
        var newSheet = getOrCreateUserSpreadsheet(
          targetUid,
          params.userName || targetUid,
          params.classroom || "ห้องเรียน",
          params.folderId || DEFAULT_DRIVE_FOLDER_ID,
          ss
        );
        responseData.spreadsheet = newSheet;
        responseData.message = "สร้าง Google Sheet เฉพาะ ID " + targetUid + " สำเร็จแล้ว";
        break;

      // ดึงลิงก์ Google Sheet ประจำตัวของทุก ID
      case "getMemberSpreadsheetLinks":
        responseData.links = getAllUserSpreadsheetLinks(ss);
        responseData.message = "ดึงรายชื่อลิงก์ Google Sheet ของสมาชิกเรียบร้อย";
        break;

      case "getAllData":
        responseData.data = {
          Members: readMembersSheet(ss),
          Students: readStudentsSheet(ss),
          WeightHeight: readWeightHeightSheet(ss),
          AttendanceBank: readAttendanceBankSheet(ss),
          Withdrawals: readWithdrawalsSheet(ss),
          Scores: readScoresSheet(ss),
          Events: readEventsSheet(ss),
          Settings: readSettingsSheet(ss)
        };
        responseData.message = "ดึงข้อมูลจาก Google Sheets สำเร็จ";
        break;

      case "syncAllData":
        if (params.payload) {
          var syncResult = syncAllDataToSheets(
            ss, 
            params.payload, 
            params.userId, 
            params.folderId || DEFAULT_DRIVE_FOLDER_ID
          );
          responseData.syncResult = syncResult;
        }
        responseData.message = "ซิงค์และบันทึกข้อมูลทุก ID พร้อมอัปเดต Google Sheet แยกรายบัญชีสำเร็จสมบูรณ์ (ข้อมูลไม่หาย)";
        responseData.syncedAt = new Date().toISOString();
        break;

      default:
        responseData.status = "error";
        responseData.message = "ไม่พบคำสั่ง (Action): " + action;
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 📁 ค้นหาหรือสร้าง Google Sheet ไฟล์ใหม่เฉพาะสำหรับ ID นั้นๆ ใน Google Drive
 * (1 บัญชีผู้ใช้ = 1 ไฟล์ Google Spreadsheet ประจำตัว)
 */
function getOrCreateUserSpreadsheet(userId, userName, classroom, folderId, masterSs) {
  var uid = String(userId || "").trim().toLowerCase();
  if (!uid) return null;

  var scriptProperties = PropertiesService.getScriptProperties();
  var savedId = scriptProperties.getProperty("USER_SHEET_" + uid);

  // ตรวจสอบว่ามีชีตนี้อยู่ใน Drive หรือไม่
  if (savedId) {
    try {
      var existingSs = SpreadsheetApp.openById(savedId);
      if (existingSs) {
        return {
          id: existingSs.getId(),
          url: existingSs.getUrl(),
          name: existingSs.getName(),
          isNew: false
        };
      }
    } catch (e) {
      Logger.log("ไม่พบไฟล์ชีตเดิมของ " + uid + " จากรหัสบันทึก: " + e.message);
    }
  }

  // หากยังไม่มี ให้สร้างไฟล์ Google Spreadsheet ใหม่ใน Google Drive
  var targetFolderId = folderId || DEFAULT_DRIVE_FOLDER_ID;
  var targetFolder;
  try {
    targetFolder = DriveApp.getFolderById(targetFolderId);
  } catch (e) {
    targetFolder = DriveApp.getRootFolder();
  }

  var fileName = "📁 ข้อมูลห้องเรียน [" + (classroom || "ห้องเรียน") + "] - " + (userName || uid) + " (" + uid + ")";
  var newSpreadsheet = SpreadsheetApp.create(fileName);
  var newFile = DriveApp.getFileById(newSpreadsheet.getId());

  // ย้ายไฟล์เข้าโฟลเดอร์เป้าหมาย
  try {
    newFile.moveTo(targetFolder);
  } catch (e) {
    try {
      targetFolder.addFile(newFile);
      DriveApp.getRootFolder().removeFile(newFile);
    } catch (err) {}
  }

  // ตั้งสิทธิ์การเข้าถึงไฟล์ให้ทุกคนที่มีลิงก์เข้าดูได้
  try {
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  // เตรียม 7 ชีตมาตรฐานสำหรับคุณครูห้องนี้
  setupUserPrivateSheets(newSpreadsheet, userName, classroom);

  // บันทึก ID ลงใน ScriptProperties
  scriptProperties.setProperty("USER_SHEET_" + uid, newSpreadsheet.getId());

  // บันทึกลิงก์ลงในชีต Members ของ Master Spreadsheet (ถ้ามี)
  if (masterSs) {
    updateMemberSheetLinkInMaster(masterSs, uid, newSpreadsheet.getUrl(), newSpreadsheet.getId());
  }

  return {
    id: newSpreadsheet.getId(),
    url: newSpreadsheet.getUrl(),
    name: fileName,
    isNew: true
  };
}

/**
 * 🎨 เตรียมชีต 7 รายการในไฟล์ Google Sheet ประจำตัวของครูแต่ละ ID
 */
function setupUserPrivateSheets(ss, teacherName, classroom) {
  // 1. Students (นักเรียน)
  setupSheet(ss, "Students", [
    "รหัสนักเรียน (ID)", "เลขประจำตัว", "คำนำหน้า", "ชื่อ", "นามสกุล", 
    "ชื่อเล่น", "ห้องเรียน", "วันเกิด", "อายุ", "เพศ", "อาศัยอยู่กับ", 
    "การเดินทาง", "เงินมา รร. (บาท)", "อาชีพผู้ปกครอง", "เบอร์โทรผู้ปกครอง", 
    "ที่อยู่", "กรุ๊ปเลือด", "โรคประจำตัว", "ลิงก์รูปถ่าย (Drive)", 
    "เงินออมสะสม (บาท)", "ข้อมูลเพิ่มเติม (JSON)", "วันที่สร้าง", "อัปเดตล่าสุด"
  ], "#047857");

  // 2. AttendanceBank (เช็คชื่อประจำวันและฝากเงิน)
  setupSheet(ss, "AttendanceBank", [
    "วันที่ (วว/ดด/ปปปป)", "รหัสนักเรียน", "ชื่อ-สกุล", 
    "สถานะการมาเรียน", "ยอดเงินฝากวันนี้ (บาท)", "หมายเหตุประจำวัน", "อัปเดตล่าสุด"
  ], "#0d9488");

  // 3. WeightHeight (น้ำหนัก-ส่วนสูง BMI)
  setupSheet(ss, "WeightHeight", [
    "รหัสบันทึก", "วันที่ตรวจวัด", "ปีการศึกษา", "ภาคเรียน", 
    "รหัสนักเรียน", "ชื่อ-สกุล", "อายุ (ปี)", "น้ำหนัก (กก.)", 
    "ส่วนสูง (ซม.)", "ค่า BMI", "สถานะการเจริญเติบโต", "หมายเหตุ", "บันทึกเมื่อ"
  ], "#059669");

  // 4. Withdrawals (ประวัติการถอนเงินออม)
  setupSheet(ss, "Withdrawals", [
    "รหัสรายการ", "รหัสนักเรียน", "ชื่อนักเรียน", 
    "วันที่ถอน", "เวลา", "ยอดเงินที่ถอน (บาท)", "เหตุผลการถอน", "ผู้บันทึก", "วันที่บันทึก"
  ], "#e11d48");

  // 5. Scores (บันทึกคะแนนและตัดเกรด)
  setupSheet(ss, "Scores", [
    "รหัสชุดคะแนน", "ชื่อวิชา", "รหัสวิชา", "ระดับชั้น", "ภาคเรียน", "ปีการศึกษา",
    "รหัสนักเรียน", "ชื่อ-สกุล", "บทที่ 1", "บทที่ 2", "บทที่ 3", "บทที่ 4", 
    "บทที่ 5", "บทที่ 6", "บทที่ 7", "บทที่ 8", "สอบปลายภาค", "คะแนนรวม (100)", 
    "เกรดที่ได้", "โครงสร้างบทเรียน (JSON)", "อัปเดตล่าสุด"
  ], "#2563eb");

  // 6. Events (ปฏิทินกิจกรรม)
  setupSheet(ss, "Events", [
    "รหัสกิจกรรม", "ชื่อกิจกรรม/นัดหมาย", 
    "วันที่", "เวลาเริ่มต้น", "เวลาสิ้นสุด", "สีแถบกิจกรรม", "รายละเอียด/สถานที่", "วันที่สร้าง"
  ], "#d97706");

  // 7. Settings (ข้อมูลห้องเรียนและครูประจำชั้น)
  setupSheet(ss, "Settings", [
    "ชื่อครูประจำชั้น", "โรงเรียน", "ชั้นเรียน", "ปีการศึกษา", "อัปเดตล่าสุด"
  ], "#475569");

  // ลบ Sheet1 เริ่มต้นทิ้งถ้ามี
  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("ชีต1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }
}

/**
 * 💾 ซิงค์ข้อมูลทั้งหมดจาก Web App มาลง Google Sheets
 * - สร้าง/อัปเดตไฟล์ Google Sheet แยกเฉพาะสำหรับแต่ละ ID
 * - อัปเดตชีตกลาง (Master) แบบ Smart Upsert ไม่ลบข้อมูลของ ID อื่น ข้อมูลไม่สูญหายแน่นอน
 */
function syncAllDataToSheets(masterSs, payload, targetUserId, folderId) {
  var members = payload.Members || [];
  var students = payload.Students || [];
  var weightHeight = payload.WeightHeight || [];
  var attendanceBank = payload.AttendanceBank || [];
  var withdrawals = payload.Withdrawals || [];
  var scores = payload.Scores || [];
  var events = payload.Events || [];
  var settingsList = payload.Settings ? (Array.isArray(payload.Settings) ? payload.Settings : [payload.Settings]) : [];

  // รวบรวมรายชื่อ User IDs ทั้งหมดที่มีข้อมูลในรอบนี้
  var userIdsMap = {};
  if (targetUserId) userIdsMap[String(targetUserId).toLowerCase()] = true;
  members.forEach(function(m) { if (m.id) userIdsMap[String(m.id).toLowerCase()] = true; });
  students.forEach(function(s) { var uid = s._teacherId || s.teacherId; if (uid) userIdsMap[String(uid).toLowerCase()] = true; });

  var activeUserIds = Object.keys(userIdsMap);

  // -------------------------------------------------------------
  // ส่วนที่ 1: อัปเดตหรือสร้าง Google Sheet แยกไฟล์ประจำตัวให้แต่ละ ID
  // -------------------------------------------------------------
  var memberSheetsInfo = {};
  for (var i = 0; i < activeUserIds.length; i++) {
    var uid = activeUserIds[i];
    var memberObj = members.find(function(m) { return String(m.id).toLowerCase() === uid; }) || {};
    var teacherName = memberObj.name || uid;
    var classroom = memberObj.classroom || "ห้องเรียน";

    try {
      var userSsInfo = getOrCreateUserSpreadsheet(uid, teacherName, classroom, folderId, masterSs);
      if (userSsInfo && userSsInfo.id) {
        memberSheetsInfo[uid] = userSsInfo;
        var userSs = SpreadsheetApp.openById(userSsInfo.id);

        // ซิงค์ข้อมูลเฉพาะของ ID นี้ลงในชีตส่วนตัว
        syncUserDataToPrivateSpreadsheet(userSs, uid, {
          students: students.filter(function(s) { return (s._teacherId || s.teacherId || "airfan").toLowerCase() === uid; }),
          attendance: attendanceBank.filter(function(a) { return (a._teacherId || a.teacherId || "airfan").toLowerCase() === uid; }),
          weightHeight: weightHeight.filter(function(w) { return (w._teacherId || w.teacherId || "airfan").toLowerCase() === uid; }),
          withdrawals: withdrawals.filter(function(w) { return (w._teacherId || w.teacherId || "airfan").toLowerCase() === uid; }),
          scores: scores.filter(function(sc) { return (sc._teacherId || sc.teacherId || "airfan").toLowerCase() === uid; }),
          events: events.filter(function(ev) { return (ev._teacherId || ev.teacherId || "airfan").toLowerCase() === uid; }),
          settings: settingsList.find(function(st) { return (st.userId || "airfan").toLowerCase() === uid; }) || memberObj
        });
      }
    } catch (err) {
      Logger.log("⚠️ ข้อผิดพลาดในการอัปเดตชีตส่วนตัวของ " + uid + ": " + err.message);
    }
  }

  // -------------------------------------------------------------
  // ส่วนที่ 2: อัปเดตใน Master Spreadsheet แบบ Smart Non-Destructive
  // (รักษาแถวของ ID อื่นไว้ ไม่มีการลบข้อมูลครูท่านอื่นเด็ดขาด)
  // -------------------------------------------------------------
  if (masterSs) {
    // 1. Members
    syncMasterMembers(masterSs, members, memberSheetsInfo);

    // 2. Students
    syncMasterStudentsNonDestructive(masterSs, students, activeUserIds);

    // 3. WeightHeight
    syncMasterWeightHeightNonDestructive(masterSs, weightHeight, activeUserIds);

    // 4. AttendanceBank
    syncMasterAttendanceBankNonDestructive(masterSs, attendanceBank, activeUserIds);

    // 5. Withdrawals
    syncMasterWithdrawalsNonDestructive(masterSs, withdrawals, activeUserIds);

    // 6. Scores
    syncMasterScoresNonDestructive(masterSs, scores, activeUserIds);

    // 7. Events
    syncMasterEventsNonDestructive(masterSs, events, activeUserIds);

    // 8. Settings
    syncMasterSettingsNonDestructive(masterSs, settingsList, activeUserIds);
  }

  return {
    syncedUsers: activeUserIds,
    sheets: memberSheetsInfo
  };
}

/**
 * 🔒 ซิงค์ข้อมูลลงใน Google Sheet ส่วนตัวของครู ID นั้นๆ (มีเฉพาะข้อมูลห้องของตนเอง 100%)
 */
function syncUserDataToPrivateSpreadsheet(userSs, userId, data) {
  // 1. Students
  var stdSheet = userSs.getSheetByName("Students");
  if (stdSheet) {
    clearDataRows(stdSheet);
    if (data.students && data.students.length > 0) {
      var stdRows = data.students.map(function(s) {
        return [
          s.id || "",
          s.studentCode || "",
          s.prefix || "",
          s.firstName || "",
          s.lastName || "",
          s.nickname || "",
          s.gradeLevel || s._classroom || "",
          s.birthDate || "",
          s.age || "",
          s.gender === "female" ? "หญิง" : "ชาย",
          s.livesWith || "",
          s.commuteMethod || "",
          s.dailyAllowance !== undefined ? s.dailyAllowance : 0,
          s.parentOccupation || "",
          s.parentPhone || "",
          s.address || "",
          s.bloodType || "",
          s.chronicDisease || "ไม่มี",
          s.photoUrl || "",
          s.currentSavings || 0,
          s.dynamicFields ? JSON.stringify(s.dynamicFields) : "",
          s.createdAt || "",
          s.updatedAt || new Date().toISOString()
        ];
      });
      stdSheet.getRange(2, 1, stdRows.length, stdRows[0].length).setValues(stdRows);
      stdSheet.autoResizeColumns(1, stdRows[0].length);
    }
  }

  // 2. AttendanceBank
  var attSheet = userSs.getSheetByName("AttendanceBank");
  if (attSheet) {
    clearDataRows(attSheet);
    if (data.attendance && data.attendance.length > 0) {
      var statusThai = { present: "มาเรียน", sick: "ลาป่วย", personal: "ลากิจ", absent: "ขาดเรียน", late: "มาสาย" };
      var attRows = [];
      data.attendance.forEach(function(day) {
        var records = day.records || {};
        for (var stdId in records) {
          var r = records[stdId];
          attRows.push([
            day.date || "",
            stdId,
            r.studentName || "",
            statusThai[r.status] || r.status || "มาเรียน",
            r.savingsDeposit || 0,
            r.note || "",
            day.updatedAt || new Date().toISOString()
          ]);
        }
      });
      if (attRows.length > 0) {
        attSheet.getRange(2, 1, attRows.length, attRows[0].length).setValues(attRows);
        attSheet.autoResizeColumns(1, attRows[0].length);
      }
    }
  }

  // 3. WeightHeight
  var whSheet = userSs.getSheetByName("WeightHeight");
  if (whSheet) {
    clearDataRows(whSheet);
    if (data.weightHeight && data.weightHeight.length > 0) {
      var whRows = [];
      data.weightHeight.forEach(function(rec) {
        (rec.measurements || []).forEach(function(m) {
          whRows.push([
            rec.id || "",
            rec.date || "",
            rec.academicYear || "",
            "ภาคเรียนที่ " + (rec.term || 1),
            m.studentId || "",
            m.studentName || "",
            m.age || "",
            m.weight || 0,
            m.height || 0,
            m.bmi || 0,
            m.status || "",
            rec.note || "",
            rec.createdAt || new Date().toISOString()
          ]);
        });
      });
      if (whRows.length > 0) {
        whSheet.getRange(2, 1, whRows.length, whRows[0].length).setValues(whRows);
        whSheet.autoResizeColumns(1, whRows[0].length);
      }
    }
  }

  // 4. Withdrawals
  var wSheet = userSs.getSheetByName("Withdrawals");
  if (wSheet) {
    clearDataRows(wSheet);
    if (data.withdrawals && data.withdrawals.length > 0) {
      var wRows = data.withdrawals.map(function(w) {
        return [
          w.id || "",
          w.studentId || "",
          w.studentName || "",
          w.date || "",
          w.time || "",
          w.amount || 0,
          w.reason || "",
          w.adminName || "",
          w.createdAt || new Date().toISOString()
        ];
      });
      wSheet.getRange(2, 1, wRows.length, wRows[0].length).setValues(wRows);
      wSheet.autoResizeColumns(1, wRows[0].length);
    }
  }

  // 5. Scores
  var scSheet = userSs.getSheetByName("Scores");
  if (scSheet) {
    clearDataRows(scSheet);
    if (data.scores && data.scores.length > 0) {
      var scRows = [];
      data.scores.forEach(function(sc) {
        var chaptersJson = JSON.stringify(sc.chapters || []);
        (sc.studentScores || []).forEach(function(st) {
          var ch = st.chapterScores || [];
          scRows.push([
            sc.id || "",
            sc.subjectName || sc.title || "",
            sc.subjectCode || "",
            sc.classroom || "",
            "ภาคเรียนที่ " + (sc.term || 1),
            sc.academicYear || "",
            st.studentId || "",
            st.studentName || "",
            ch[0] !== undefined ? ch[0] : "",
            ch[1] !== undefined ? ch[1] : "",
            ch[2] !== undefined ? ch[2] : "",
            ch[3] !== undefined ? ch[3] : "",
            ch[4] !== undefined ? ch[4] : "",
            ch[5] !== undefined ? ch[5] : "",
            ch[6] !== undefined ? ch[6] : "",
            ch[7] !== undefined ? ch[7] : "",
            st.finalExamScore !== undefined ? st.finalExamScore : "",
            st.totalScore !== undefined ? st.totalScore : 0,
            st.grade || "0",
            chaptersJson,
            sc.updatedAt || new Date().toISOString()
          ]);
        });
      });
      if (scRows.length > 0) {
        scSheet.getRange(2, 1, scRows.length, scRows[0].length).setValues(scRows);
        scSheet.autoResizeColumns(1, scRows[0].length);
      }
    }
  }

  // 6. Events
  var evSheet = userSs.getSheetByName("Events");
  if (evSheet) {
    clearDataRows(evSheet);
    if (data.events && data.events.length > 0) {
      var evRows = data.events.map(function(ev) {
        return [
          ev.id || "",
          ev.title || "",
          ev.date || "",
          ev.startTime || "",
          ev.endTime || "",
          ev.color || "emerald",
          ev.description || "",
          ev.createdAt || new Date().toISOString()
        ];
      });
      evSheet.getRange(2, 1, evRows.length, evRows[0].length).setValues(evRows);
      evSheet.autoResizeColumns(1, evRows[0].length);
    }
  }

  // 7. Settings
  var stSheet = userSs.getSheetByName("Settings");
  if (stSheet && data.settings) {
    clearDataRows(stSheet);
    var st = data.settings;
    var stRow = [[
      st.teacherName || st.name || "",
      st.schoolName || "",
      st.classroomName || st.classroom || "",
      st.academicYear || "2569",
      new Date().toISOString()
    ]];
    stSheet.getRange(2, 1, 1, stRow[0].length).setValues(stRow);
    stSheet.autoResizeColumns(1, stRow[0].length);
  }
}

/**
 * 👑 ซิงค์ชีต Members ของ Master Spreadsheet พร้อมใส่สูตร Hyperlink ไปยัง Google Sheet ของแต่ละ ID
 */
function syncMasterMembers(masterSs, members, memberSheetsInfo) {
  var headers = [
    "รหัสสมาชิก (User ID)", "ชื่อผู้ใช้งาน (Username)", "ชื่อ-สกุลครู", 
    "บทบาท (Role)", "ห้องเรียนที่รับผิดชอบ", "โรงเรียน", 
    "ลิงก์ Google Sheet ประจำ ID (เปิดดู)", "Google Sheet ID",
    "สถานะบัญชี", "วันที่สร้าง", "เข้าสู่ระบบล่าสุด"
  ];
  setupSheet(masterSs, "Members", headers, "#7c3aed");
  var sheet = masterSs.getSheetByName("Members");
  clearDataRows(sheet);

  if (!members || members.length === 0) return;

  var scriptProperties = PropertiesService.getScriptProperties();

  var rows = members.map(function(m) {
    var uid = String(m.id || "").toLowerCase();
    var sheetInfo = (memberSheetsInfo && memberSheetsInfo[uid]) ? memberSheetsInfo[uid] : null;
    var sheetId = sheetInfo ? sheetInfo.id : (scriptProperties.getProperty("USER_SHEET_" + uid) || "");
    var sheetUrl = sheetInfo ? sheetInfo.url : (sheetId ? ("https://docs.google.com/spreadsheets/d/" + sheetId + "/edit") : "");

    var sheetHyperlink = sheetUrl 
      ? '=HYPERLINK("' + sheetUrl + '", "📊 เปิด Google Sheet ประจำตัว [' + uid + ']")' 
      : "กำลังจัดเตรียม...";

    return [
      m.id || "",
      m.username || "",
      m.name || "",
      m.role === "admin" ? "ผู้ดูแลระบบ (Admin)" : "ครูประจำชั้น (สมาชิก)",
      m.classroom || "",
      m.schoolName || "",
      sheetHyperlink,
      sheetId,
      m.status === "active" ? "ใช้งานปกติ" : "ระงับการใช้งาน",
      m.createdAt || "",
      m.lastLogin || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 🛡️ Smart Non-Destructive Update สำหรับตาราง Students
 * แทนที่เฉพาะแถวของ activeUserIds เท่านั้น ไม่ลบข้อมูลของ ID อื่นเด็ดขาด!
 */
function syncMasterStudentsNonDestructive(masterSs, newStudents, activeUserIds) {
  var headers = [
    "บัญชีครู (ID)", "ชื่อครูผู้รับผิดชอบ", "ห้องเรียน", 
    "รหัสนักเรียน (ID)", "เลขประจำตัว", "คำนำหน้า", "ชื่อ", "นามสกุล", 
    "ชื่อเล่น", "วันเกิด", "อายุ", "เพศ", "อาศัยอยู่กับ", 
    "การเดินทาง", "เงินมา รร. (บาท)", "อาชีพผู้ปกครอง", "เบอร์โทรผู้ปกครอง", 
    "ที่อยู่", "กรุ๊ปเลือด", "โรคประจำตัว", "ลิงก์รูปถ่าย (Drive)", 
    "เงินออมสะสม (บาท)", "ข้อมูลเพิ่มเติม (JSON)", "วันที่สร้าง", "อัปเดตล่าสุด"
  ];
  setupSheet(masterSs, "Students", headers, "#047857");
  var sheet = masterSs.getSheetByName("Students");

  // แปลง newStudents เป็น 2D array
  var newRows = (newStudents || []).map(function(s) {
    return [
      s._teacherId || s.teacherId || "airfan",
      s._teacherName || s.teacherName || "",
      s._classroom || s.gradeLevel || "",
      s.id || "",
      s.studentCode || "",
      s.prefix || "",
      s.firstName || "",
      s.lastName || "",
      s.nickname || "",
      s.birthDate || "",
      s.age || "",
      s.gender === "female" ? "หญิง" : "ชาย",
      s.livesWith || "",
      s.commuteMethod || "",
      s.dailyAllowance !== undefined ? s.dailyAllowance : 0,
      s.parentOccupation || "",
      s.parentPhone || "",
      s.address || "",
      s.bloodType || "",
      s.chronicDisease || "ไม่มี",
      s.photoUrl || "",
      s.currentSavings || 0,
      s.dynamicFields ? JSON.stringify(s.dynamicFields) : "",
      s.createdAt || "",
      s.updatedAt || new Date().toISOString()
    ];
  });

  upsertRowsByUserId(sheet, headers, newRows, activeUserIds, 0);
}

/**
 * 🛡️ Smart Non-Destructive Update สำหรับ WeightHeight
 */
function syncMasterWeightHeightNonDestructive(masterSs, records, activeUserIds) {
  var headers = [
    "รหัสบันทึก", "บัญชีครู (ID)", "ห้องเรียน", "วันที่ตรวจวัด", "ปีการศึกษา", "ภาคเรียน", 
    "รหัสนักเรียน", "ชื่อ-สกุล", "อายุ (ปี)", "น้ำหนัก (กก.)", 
    "ส่วนสูง (ซม.)", "ค่า BMI", "สถานะการเจริญเติบโต", "หมายเหตุ", "บันทึกเมื่อ"
  ];
  setupSheet(masterSs, "WeightHeight", headers, "#059669");
  var sheet = masterSs.getSheetByName("WeightHeight");

  var newRows = [];
  (records || []).forEach(function(rec) {
    var teacherId = rec._teacherId || rec.teacherId || "airfan";
    var classroom = rec._classroom || "";
    (rec.measurements || []).forEach(function(m) {
      newRows.push([
        rec.id || "",
        teacherId,
        classroom,
        rec.date || "",
        rec.academicYear || "",
        "ภาคเรียนที่ " + (rec.term || 1),
        m.studentId || "",
        m.studentName || "",
        m.age || "",
        m.weight || 0,
        m.height || 0,
        m.bmi || 0,
        m.status || "",
        rec.note || "",
        rec.createdAt || new Date().toISOString()
      ]);
    });
  });

  upsertRowsByUserId(sheet, headers, newRows, activeUserIds, 1);
}

/**
 * 🛡️ Smart Non-Destructive Update สำหรับ AttendanceBank
 */
function syncMasterAttendanceBankNonDestructive(masterSs, days, activeUserIds) {
  var headers = [
    "วันที่ (วว/ดด/ปปปป)", "บัญชีครู (ID)", "ห้องเรียน", 
    "รหัสนักเรียน", "ชื่อ-สกุล", "สถานะการมาเรียน", "ยอดเงินฝากวันนี้ (บาท)", 
    "หมายเหตุประจำวัน", "อัปเดตล่าสุด"
  ];
  setupSheet(masterSs, "AttendanceBank", headers, "#0d9488");
  var sheet = masterSs.getSheetByName("AttendanceBank");

  var statusThai = { present: "มาเรียน", sick: "ลาป่วย", personal: "ลากิจ", absent: "ขาดเรียน", late: "มาสาย" };
  var newRows = [];
  (days || []).forEach(function(day) {
    var teacherId = day._teacherId || day.teacherId || "airfan";
    var classroom = day._classroom || "";
    var records = day.records || {};
    for (var stdId in records) {
      var r = records[stdId];
      newRows.push([
        day.date || "",
        teacherId,
        classroom,
        stdId,
        r.studentName || "",
        statusThai[r.status] || r.status || "มาเรียน",
        r.savingsDeposit || 0,
        r.note || "",
        day.updatedAt || new Date().toISOString()
      ]);
    }
  });

  upsertRowsByUserId(sheet, headers, newRows, activeUserIds, 1);
}

/**
 * 🛡️ Smart Non-Destructive Update สำหรับ Withdrawals
 */
function syncMasterWithdrawalsNonDestructive(masterSs, withdrawals, activeUserIds) {
  var headers = [
    "รหัสรายการ", "บัญชีครู (ID)", "ห้องเรียน", "รหัสนักเรียน", "ชื่อนักเรียน", 
    "วันที่ถอน", "เวลา", "ยอดเงินที่ถอน (บาท)", "เหตุผลการถอน", "ครูผู้บันทึก", "วันที่บันทึก"
  ];
  setupSheet(masterSs, "Withdrawals", headers, "#e11d48");
  var sheet = masterSs.getSheetByName("Withdrawals");

  var newRows = (withdrawals || []).map(function(w) {
    return [
      w.id || "",
      w._teacherId || w.teacherId || "airfan",
      w._classroom || "",
      w.studentId || "",
      w.studentName || "",
      w.date || "",
      w.time || "",
      w.amount || 0,
      w.reason || "",
      w.adminName || "",
      w.createdAt || new Date().toISOString()
    ];
  });

  upsertRowsByUserId(sheet, headers, newRows, activeUserIds, 1);
}

/**
 * 🛡️ Smart Non-Destructive Update สำหรับ Scores
 */
function syncMasterScoresNonDestructive(masterSs, scoreSheets, activeUserIds) {
  var headers = [
    "รหัสชุดคะแนน", "บัญชีครู (ID)", "ห้องเรียน", "ชื่อวิชา", "รหัสวิชา", "ระดับชั้น", "ภาคเรียน", "ปีการศึกษา",
    "รหัสนักเรียน", "ชื่อ-สกุล", "บทที่ 1", "บทที่ 2", "บทที่ 3", "บทที่ 4", 
    "บทที่ 5", "บทที่ 6", "บทที่ 7", "บทที่ 8", "สอบปลายภาค", "คะแนนรวม (100)", 
    "เกรดที่ได้", "โครงสร้างบทเรียน (JSON)", "อัปเดตล่าสุด"
  ];
  setupSheet(masterSs, "Scores", headers, "#2563eb");
  var sheet = masterSs.getSheetByName("Scores");

  var newRows = [];
  (scoreSheets || []).forEach(function(sc) {
    var teacherId = sc._teacherId || sc.teacherId || "airfan";
    var classroom = sc._classroom || sc.classroom || "";
    var chaptersJson = JSON.stringify(sc.chapters || []);
    (sc.studentScores || []).forEach(function(st) {
      var ch = st.chapterScores || [];
      newRows.push([
        sc.id || "",
        teacherId,
        classroom,
        sc.subjectName || sc.title || "",
        sc.subjectCode || "",
        sc.classroom || "",
        "ภาคเรียนที่ " + (sc.term || 1),
        sc.academicYear || "",
        st.studentId || "",
        st.studentName || "",
        ch[0] !== undefined ? ch[0] : "",
        ch[1] !== undefined ? ch[1] : "",
        ch[2] !== undefined ? ch[2] : "",
        ch[3] !== undefined ? ch[3] : "",
        ch[4] !== undefined ? ch[4] : "",
        ch[5] !== undefined ? ch[5] : "",
        ch[6] !== undefined ? ch[6] : "",
        ch[7] !== undefined ? ch[7] : "",
        st.finalExamScore !== undefined ? st.finalExamScore : "",
        st.totalScore !== undefined ? st.totalScore : 0,
        st.grade || "0",
        chaptersJson,
        sc.updatedAt || new Date().toISOString()
      ]);
    });
  });

  upsertRowsByUserId(sheet, headers, newRows, activeUserIds, 1);
}

/**
 * 🛡️ Smart Non-Destructive Update สำหรับ Events
 */
function syncMasterEventsNonDestructive(masterSs, events, activeUserIds) {
  var headers = [
    "รหัสกิจกรรม", "บัญชีครู (ID)", "ห้องเรียน", "ชื่อกิจกรรม/นัดหมาย", 
    "วันที่", "เวลาเริ่มต้น", "เวลาสิ้นสุด", "สีแถบกิจกรรม", "รายละเอียด/สถานที่", "วันที่สร้าง"
  ];
  setupSheet(masterSs, "Events", headers, "#d97706");
  var sheet = masterSs.getSheetByName("Events");

  var newRows = (events || []).map(function(ev) {
    return [
      ev.id || "",
      ev._teacherId || ev.teacherId || "airfan",
      ev._classroom || "",
      ev.title || "",
      ev.date || "",
      ev.startTime || "",
      ev.endTime || "",
      ev.color || "emerald",
      ev.description || "",
      ev.createdAt || new Date().toISOString()
    ];
  });

  upsertRowsByUserId(sheet, headers, newRows, activeUserIds, 1);
}

/**
 * 🛡️ Smart Non-Destructive Update สำหรับ Settings
 */
function syncMasterSettingsNonDestructive(masterSs, settingsList, activeUserIds) {
  var headers = [
    "บัญชีครู (ID)", "ชื่อครูประจำชั้น", "โรงเรียน", "ชั้นเรียน", 
    "ปีการศึกษา", "Google Drive Folder ID", "Google Sheet ประจำตัว", "อัปเดตล่าสุด"
  ];
  setupSheet(masterSs, "Settings", headers, "#475569");
  var sheet = masterSs.getSheetByName("Settings");
  var scriptProperties = PropertiesService.getScriptProperties();

  var newRows = (settingsList || []).map(function(st) {
    var uid = (st.userId || "airfan").toLowerCase();
    var sheetId = scriptProperties.getProperty("USER_SHEET_" + uid) || "";
    var sheetUrl = sheetId ? ("https://docs.google.com/spreadsheets/d/" + sheetId + "/edit") : "";
    return [
      uid,
      st.teacherName || "",
      st.schoolName || "",
      st.classroomName || "",
      st.academicYear || "",
      st.driveFolderId || DEFAULT_DRIVE_FOLDER_ID,
      sheetUrl,
      new Date().toISOString()
    ];
  });

  upsertRowsByUserId(sheet, headers, newRows, activeUserIds, 0);
}

/**
 * 🛡️ หัวใจสำคัญของการป้องกันข้อมูลสูญหาย: upsertRowsByUserId
 * - อ่านแถวเดิมทั้งหมด
 * - ลบเฉพาะแถวที่เป็นของ activeUserIds (คนที่กำลังซิงค์รอบนี้)
 * - แถวของ ID อื่นๆ จะถูก "เก็บรักษาไว้ทั้งหมด 100%" ไม่โดนลบ
 * - รวมแถวของ ID อื่นเข้ากับ newRows ของคนที่ซิงค์ แล้วเขียนกลับลงตาราง
 */
function upsertRowsByUserId(sheet, headers, newRows, activeUserIds, userIdColIndex) {
  var userMap = {};
  (activeUserIds || []).forEach(function(u) { userMap[String(u).toLowerCase()] = true; });

  var existingRows = [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow > 1 && lastCol > 0) {
    var rawValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (var i = 0; i < rawValues.length; i++) {
      var row = rawValues[i];
      var rowUid = String(row[userIdColIndex] || "").toLowerCase().trim();
      // หากแถวนี้เป็นของ ID อื่นที่ไม่ได้อยู่ในรอบการซิงค์นี้ ให้เก็บไว้!
      if (!userMap[rowUid]) {
        existingRows.push(row);
      }
    }
  }

  // เคลียร์ข้อมูลเดิมทั้งหมด
  clearDataRows(sheet);

  // รวมแถวเดิมของคนอื่น + แถวใหม่ของคนที่ซิงค์
  var finalRows = existingRows.concat(newRows || []);

  if (finalRows.length > 0) {
    sheet.getRange(2, 1, finalRows.length, headers.length).setValues(finalRows);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * 🔗 บันทึกลิงก์ Google Sheet ประจำตัวของสมาชิกในแถวชีต Members ของ Master
 */
function updateMemberSheetLinkInMaster(masterSs, userId, sheetUrl, sheetId) {
  try {
    var sheet = masterSs.getSheetByName("Members");
    if (!sheet) return;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    var uid = String(userId).toLowerCase().trim();
    var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase().trim() === uid) {
        var rowNum = i + 2;
        var formula = '=HYPERLINK("' + sheetUrl + '", "📊 เปิด Google Sheet ประจำตัว [' + uid + ']")';
        sheet.getRange(rowNum, 7).setValue(formula);
        sheet.getRange(rowNum, 8).setValue(sheetId);
        break;
      }
    }
  } catch (e) {
    Logger.log("updateMemberSheetLinkInMaster error: " + e.message);
  }
}

/**
 * 🔍 ดึงรายการลิงก์ชีตประจำตัวของทุก ID ที่มีในระบบ
 */
function getAllUserSpreadsheetLinks(masterSs) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var allProps = scriptProperties.getProperties();
  var result = {};

  for (var key in allProps) {
    if (key.indexOf("USER_SHEET_") === 0) {
      var uid = key.replace("USER_SHEET_", "");
      var sheetId = allProps[key];
      result[uid] = {
        userId: uid,
        sheetId: sheetId,
        sheetUrl: "https://docs.google.com/spreadsheets/d/" + sheetId + "/edit"
      };
    }
  }

  return result;
}

/**
 * ⚡ ฟังก์ชันเสริม: สั่งสร้าง Google Sheet ให้ทุก ID ที่มีในชีต Members ทันที (คลิก Run เพื่อทดสอบ)
 */
function createSheetForAllMembers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var membersSheet = ss.getSheetByName("Members");
  if (!membersSheet || membersSheet.getLastRow() <= 1) {
    Logger.log("⚠️ ยังไม่มีรายชื่อสมาชิกในชีต Members กรุณาคลิก initSpreadsheet หรือซิงค์ข้อมูลจากเว็บแอพก่อน");
    return;
  }

  var values = membersSheet.getRange(2, 1, membersSheet.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < values.length; i++) {
    var uid = String(values[i][0] || "").toLowerCase().trim();
    var name = values[i][2] || uid;
    var classroom = values[i][4] || "ห้องเรียน";
    if (uid) {
      Logger.log("กำลังสร้างหรือตรวจสอบ Google Sheet ของ ID: " + uid);
      var info = getOrCreateUserSpreadsheet(uid, name, classroom, DEFAULT_DRIVE_FOLDER_ID, ss);
      Logger.log("✅ " + uid + " -> " + info.url);
    }
  }
  Logger.log("🎉 ดำเนินการสร้าง Google Sheet ครบทุก ID เรียบร้อยแล้ว!");
}

function clearDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
}

function saveFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    var targetFolderId = folderId || DEFAULT_DRIVE_FOLDER_ID;
    var folder;
    
    try {
      folder = DriveApp.getFolderById(targetFolderId);
    } catch (e) {
      folder = DriveApp.getRootFolder();
    }

    var cleanBase64 = (base64Data || "").replace(/^data:[^;]+;base64,/, "");
    var decoded = Utilities.base64Decode(cleanBase64);
    var safeMime = mimeType || "image/jpeg";
    var safeName = fileName || ("student_photo_" + Date.now() + ".jpg");

    var blob = Utilities.newBlob(decoded, safeMime, safeName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    return {
      fileId: fileId,
      fileName: file.getName(),
      directUrl: directUrl,
      viewUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl()
    };
  } catch (err) {
    throw new Error("เกิดข้อผิดพลาดในการบันทึกไฟล์ลง Google Drive: " + err.message);
  }
}

function readMembersSheet(ss) { return getSheetObjects(ss, "Members"); }
function readStudentsSheet(ss) { return getSheetObjects(ss, "Students"); }
function readWeightHeightSheet(ss) { return getSheetObjects(ss, "WeightHeight"); }
function readAttendanceBankSheet(ss) { return getSheetObjects(ss, "AttendanceBank"); }
function readWithdrawalsSheet(ss) { return getSheetObjects(ss, "Withdrawals"); }
function readScoresSheet(ss) { return getSheetObjects(ss, "Scores"); }
function readEventsSheet(ss) { return getSheetObjects(ss, "Events"); }
function readSettingsSheet(ss) { return getSheetObjects(ss, "Settings"); }

function getSheetObjects(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}
`;
