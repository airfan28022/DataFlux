/**
 * Production-ready Google Apps Script (Code.gs) template for teachers.
 * Teachers can copy this into Google Apps Script connected to Google Sheet & Google Drive.
 * Fully compatible with the Classroom Management Web Application.
 */

export const GAS_CODE_TEMPLATE = `/**
 * =========================================================================================
 * 🎓 ระบบสารสนเทศและบริหารจัดการข้อมูลครูประจำชั้น (Google Apps Script Backend API)
 * 📁 Google Sheets (ฐานข้อมูล 7 ตาราง) + ☁️ Google Drive (คลังจัดเก็บไฟล์/รูปภาพนักเรียน)
 * =========================================================================================
 * 
 * 📌 ขั้นตอนการติดตั้งใช้งาน:
 * 1. เปิด Google Sheets เปล่าขึ้นมา 1 ไฟล์ (เช่น ตั้งชื่อว่า "ฐานข้อมูลครูประจำชั้น ป.6")
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > เลือก "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดในไฟล์ Code.gs แล้ววางโค้ดชุดนี้ลงไปทั้งหมด
 * 4. (ทางเลือก) เลือกฟังก์ชัน "initSpreadsheet" แล้วกด "เรียกใช้" (Run) เพื่อสร้างหัวตารางทั้ง 7 ชีตโดยอัตโนมัติ
 * 5. กดปุ่มสีน้ำเงิน "การทำให้ใช้งานได้" (Deploy) > เลือก "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภท: "เว็บแอป" (Web app)
 *    - คำอธิบาย: ระบบจัดการข้อมูลครูประจำชั้น v2.0
 *    - ดำเนินการในฐานะ (Execute as): ฉัน (อีเมลของคุณ)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone) **สำคัญมาก ต้องเลือกทุกคน**
 * 7. กด "ทำให้ใช้งานได้" (Deploy) และอนุญาตสิทธิ์เข้าถึง (Grant Access)
 * 8. คัดลอก "URL ของเว็บแอป" (Web App URL) ที่ลงท้ายด้วย /exec
 * 9. นำ URL มาวางในเมนู "ตั้งค่า" > "Google Apps Script & Drive" ในหน้าเว็บไซต์
 * =========================================================================================
 */

// 📂 รหัสโฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์ (สามารถเปลี่ยนเป็น Folder ID ของท่านได้)
var DEFAULT_DRIVE_FOLDER_ID = "1nymxjSukQ_exIWuN6HRehXRTFrPrfekP";

/**
 * ⚡ ฟังก์ชันสร้างและตั้งค่าชีตทั้งหมดโดยอัตโนมัติ (คลิก Run ครั้งแรกเพื่อเตรียมชีต)
 */
function initSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ชีต Students (ทะเบียนนักเรียน)
  setupSheet(ss, "Students", [
    "รหัสนักเรียน (ID)", "เลขประจำตัว", "คำนำหน้า", "ชื่อ", "นามสกุล", 
    "ชื่อเล่น", "วันเกิด", "อายุ", "เพศ", "อาศัยอยู่กับ", 
    "การเดินทาง", "เงินมา รร. (บาท)", "อาชีพผู้ปกครอง", "เบอร์โทรผู้ปกครอง", 
    "ที่อยู่", "กรุ๊ปเลือด", "โรคประจำตัว", "ลิงก์รูปถ่าย (Drive)", 
    "เงินออมสะสม (บาท)", "ข้อมูลเพิ่มเติม (JSON)", "วันที่สร้าง", "อัปเดตล่าสุด"
  ], "#047857");

  // 2. ชีต WeightHeight (น้ำหนัก-ส่วนสูง BMI)
  setupSheet(ss, "WeightHeight", [
    "รหัสบันทึก", "วันที่ตรวจวัด", "ปีการศึกษา", "ภาคเรียน", 
    "รหัสนักเรียน", "ชื่อ-สกุล", "อายุ (ปี)", "น้ำหนัก (กก.)", 
    "ส่วนสูง (ซม.)", "ค่า BMI", "สถานะการเจริญเติบโต", "หมายเหตุ", "บันทึกเมื่อ"
  ], "#059669");

  // 3. ชีต AttendanceBank (เช็คชื่อประจำวันและฝากเงิน)
  setupSheet(ss, "AttendanceBank", [
    "วันที่ (วว/ดด/ปปปป)", "รหัสนักเรียน", "ชื่อ-สกุล", 
    "สถานะการมาเรียน", "ยอดเงินฝากวันนี้ (บาท)", "หมายเหตุประจำวัน", "อัปเดตล่าสุด"
  ], "#0d9488");

  // 4. ชีต Withdrawals (ประวัติการถอนเงินออม)
  setupSheet(ss, "Withdrawals", [
    "รหัสรายการ", "รหัสนักเรียน", "ชื่อนักเรียน", "วันที่ถอน", 
    "เวลา", "ยอดเงินที่ถอน (บาท)", "เหตุผลการถอน", "ครูผู้บันทึก", "วันที่บันทึก"
  ], "#e11d48");

  // 5. ชีต Scores (บันทึกคะแนนและตัดเกรด - แยกภาคเรียน 1 และ 2)
  setupSheet(ss, "Scores", [
    "รหัสชุดคะแนน", "ชื่อวิชา", "รหัสวิชา", "ระดับชั้น", "ภาคเรียน", "ปีการศึกษา",
    "รหัสนักเรียน", "ชื่อ-สกุล", "บทที่ 1", "บทที่ 2", "บทที่ 3", "บทที่ 4", 
    "บทที่ 5", "บทที่ 6", "บทที่ 7", "บทที่ 8", "สอบปลายภาค", "คะแนนรวม (100)", 
    "เกรดที่ได้", "โครงสร้างบทเรียน (JSON)", "อัปเดตล่าสุด"
  ], "#2563eb");

  // 6. ชีต Events (ปฏิทินกิจกรรมและการนัดหมาย)
  setupSheet(ss, "Events", [
    "รหัสกิจกรรม", "ชื่อกิจกรรม/นัดหมาย", "วันที่", "เวลาเริ่มต้น", 
    "เวลาสิ้นสุด", "สีแถบกิจกรรม", "รายละเอียด/สถานที่", "วันที่สร้าง"
  ], "#d97706");

  // 7. ชีต Settings (ข้อมูลโรงเรียนและครูประจำชั้น)
  setupSheet(ss, "Settings", [
    "ชื่อครูประจำชั้น", "โรงเรียน", "ชั้นเรียน", "ปีการศึกษา", 
    "Google Drive Folder ID", "อัปเดตล่าสุด"
  ], "#475569");

  Logger.log("✅ สร้างและจัดระเบียบตารางใน Google Sheets ครบทั้ง 7 หมวดหมู่เรียบร้อยแล้ว!");
}

/**
 * 🛠️ ฟังก์ชันช่วยจัดรูปแบบหัวตาราง
 */
function setupSheet(ss, sheetName, headers, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // ตรวจสอบว่ามีข้อมูลหัวตารางหรือยัง
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // จัดรูปแบบหัวตารางให้สวยงาม เป็นมืออาชีพ
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(headerColor || "#047857");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Sarabun");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);
}

/**
 * 🌐 รองรับ GET Request (สำหรับทดสอบ Ping และดึงข้อมูล)
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * 🌐 รองรับ POST Request (สำหรับรับข้อมูลจากหน้าเว็บและอัปโหลดไฟล์)
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * ⚙️ แกนประมวลผลคำขอ (Request Router)
 */
function handleRequest(e) {
  var lock = LockService.getScriptLock();
  // ล็อคคิวการเขียนเพื่อป้องกันข้อมูลชนกัน
  lock.tryLock(20000);

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
    var responseData = { status: "success", action: action };
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      // 1. ตรวจสอบสถานะการเชื่อมต่อ
      case "ping":
        responseData.message = "ระบบเชื่อมต่อ Google Apps Script สำเร็จพร้อมใช้งาน!";
        responseData.spreadsheetName = ss.getName();
        responseData.timestamp = new Date().toISOString();
        break;

      // 2. อัปโหลดไฟล์หรือรูปถ่ายลง Google Drive
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

      // 3. ดึงข้อมูลทั้งหมดจาก Google Sheets กลับไปยังหน้าเว็บ
      case "getAllData":
        responseData.data = {
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

      // 4. ซิงค์ข้อมูลทั้งหมดจากหน้าเว็บมาบันทึกลง Google Sheets
      case "syncAllData":
        if (params.payload) {
          syncAllDataToSheets(ss, params.payload);
        }
        responseData.message = "ซิงค์และบันทึกข้อมูลทั้งหมดลง Google Sheets สำเร็จสมบูรณ์";
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
 * 💾 ซิงค์ข้อมูลทั้งหมดจาก Web App มาลง Google Sheets
 */
function syncAllDataToSheets(ss, payload) {
  // 1. ซิงค์นักเรียน (Students)
  if (payload.Students && Array.isArray(payload.Students)) {
    syncStudents(ss, payload.Students);
  }

  // 2. ซิงค์น้ำหนัก-ส่วนสูง BMI (WeightHeight)
  if (payload.WeightHeight && Array.isArray(payload.WeightHeight)) {
    syncWeightHeight(ss, payload.WeightHeight);
  }

  // 3. ซิงค์เช็คชื่อและเงินฝากประจำวัน (AttendanceBank)
  if (payload.AttendanceBank && Array.isArray(payload.AttendanceBank)) {
    syncAttendanceBank(ss, payload.AttendanceBank);
  }

  // 4. ซิงค์ประวัติการถอนเงิน (Withdrawals)
  if (payload.Withdrawals && Array.isArray(payload.Withdrawals)) {
    syncWithdrawals(ss, payload.Withdrawals);
  }

  // 5. ซิงค์คะแนนและการตัดเกรด (Scores)
  if (payload.Scores && Array.isArray(payload.Scores)) {
    syncScores(ss, payload.Scores);
  }

  // 6. ซิงค์ปฏิทินกิจกรรม (Events)
  if (payload.Events && Array.isArray(payload.Events)) {
    syncEvents(ss, payload.Events);
  }

  // 7. ซิงค์ข้อมูลครูและการตั้งค่า (Settings)
  if (payload.Settings && Array.isArray(payload.Settings)) {
    syncSettings(ss, payload.Settings[0] || payload.Settings);
  }
}

/**
 * 1️⃣ ซิงค์ชีต Students
 */
function syncStudents(ss, students) {
  var headers = [
    "รหัสนักเรียน (ID)", "เลขประจำตัว", "คำนำหน้า", "ชื่อ", "นามสกุล", 
    "ชื่อเล่น", "วันเกิด", "อายุ", "เพศ", "อาศัยอยู่กับ", 
    "การเดินทาง", "เงินมา รร. (บาท)", "อาชีพผู้ปกครอง", "เบอร์โทรผู้ปกครอง", 
    "ที่อยู่", "กรุ๊ปเลือด", "โรคประจำตัว", "ลิงก์รูปถ่าย (Drive)", 
    "เงินออมสะสม (บาท)", "ข้อมูลเพิ่มเติม (JSON)", "วันที่สร้าง", "อัปเดตล่าสุด"
  ];
  setupSheet(ss, "Students", headers, "#047857");
  var sheet = ss.getSheetByName("Students");
  
  // ล้างแถวข้อมูลเดิม (คงแถวหัวตารางไว้)
  clearDataRows(sheet);

  if (students.length === 0) return;

  var rows = students.map(function(s) {
    return [
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

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 2️⃣ ซิงค์ชีต WeightHeight
 */
function syncWeightHeight(ss, records) {
  var headers = [
    "รหัสบันทึก", "วันที่ตรวจวัด", "ปีการศึกษา", "ภาคเรียน", 
    "รหัสนักเรียน", "ชื่อ-สกุล", "อายุ (ปี)", "น้ำหนัก (กก.)", 
    "ส่วนสูง (ซม.)", "ค่า BMI", "สถานะการเจริญเติบโต", "หมายเหตุ", "บันทึกเมื่อ"
  ];
  setupSheet(ss, "WeightHeight", headers, "#059669");
  var sheet = ss.getSheetByName("WeightHeight");
  clearDataRows(sheet);

  var rows = [];
  records.forEach(function(rec) {
    var measurements = rec.measurements || [];
    measurements.forEach(function(m) {
      rows.push([
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

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * 3️⃣ ซิงค์ชีต AttendanceBank (เช็คชื่อและฝากเงิน)
 */
function syncAttendanceBank(ss, days) {
  var headers = [
    "วันที่ (วว/ดด/ปปปป)", "รหัสนักเรียน", "ชื่อ-สกุล", 
    "สถานะการมาเรียน", "ยอดเงินฝากวันนี้ (บาท)", "หมายเหตุประจำวัน", "อัปเดตล่าสุด"
  ];
  setupSheet(ss, "AttendanceBank", headers, "#0d9488");
  var sheet = ss.getSheetByName("AttendanceBank");
  clearDataRows(sheet);

  var rows = [];
  var statusThai = {
    present: "มาเรียน",
    sick: "ลาป่วย",
    personal: "ลากิจ",
    absent: "ขาดเรียน",
    late: "มาสาย"
  };

  days.forEach(function(day) {
    var records = day.records || {};
    for (var stdId in records) {
      var r = records[stdId];
      rows.push([
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

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * 4️⃣ ซิงค์ชีต Withdrawals
 */
function syncWithdrawals(ss, withdrawals) {
  var headers = [
    "รหัสรายการ", "รหัสนักเรียน", "ชื่อนักเรียน", "วันที่ถอน", 
    "เวลา", "ยอดเงินที่ถอน (บาท)", "เหตุผลการถอน", "ครูผู้บันทึก", "วันที่บันทึก"
  ];
  setupSheet(ss, "Withdrawals", headers, "#e11d48");
  var sheet = ss.getSheetByName("Withdrawals");
  clearDataRows(sheet);

  if (withdrawals.length === 0) return;

  var rows = withdrawals.map(function(w) {
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

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 5️⃣ ซิงค์ชีต Scores (คะแนนและตัดเกรด - รองรับแยกภาคเรียน 1 และ 2)
 */
function syncScores(ss, scoreSheets) {
  var headers = [
    "รหัสชุดคะแนน", "ชื่อวิชา", "รหัสวิชา", "ระดับชั้น", "ภาคเรียน", "ปีการศึกษา",
    "รหัสนักเรียน", "ชื่อ-สกุล", "บทที่ 1", "บทที่ 2", "บทที่ 3", "บทที่ 4", 
    "บทที่ 5", "บทที่ 6", "บทที่ 7", "บทที่ 8", "สอบปลายภาค", "คะแนนรวม (100)", 
    "เกรดที่ได้", "โครงสร้างบทเรียน (JSON)", "อัปเดตล่าสุด"
  ];
  setupSheet(ss, "Scores", headers, "#2563eb");
  var sheet = ss.getSheetByName("Scores");
  clearDataRows(sheet);

  var rows = [];
  scoreSheets.forEach(function(sc) {
    var studentScores = sc.studentScores || [];
    var chaptersJson = JSON.stringify(sc.chapters || []);

    studentScores.forEach(function(st) {
      var chScores = st.chapterScores || [];
      rows.push([
        sc.id || "",
        sc.subjectName || sc.title || "",
        sc.subjectCode || "",
        sc.classroom || "",
        "ภาคเรียนที่ " + (sc.term || 1),
        sc.academicYear || "",
        st.studentId || "",
        st.studentName || "",
        chScores[0] !== undefined ? chScores[0] : "",
        chScores[1] !== undefined ? chScores[1] : "",
        chScores[2] !== undefined ? chScores[2] : "",
        chScores[3] !== undefined ? chScores[3] : "",
        chScores[4] !== undefined ? chScores[4] : "",
        chScores[5] !== undefined ? chScores[5] : "",
        chScores[6] !== undefined ? chScores[6] : "",
        chScores[7] !== undefined ? chScores[7] : "",
        st.finalExamScore !== undefined ? st.finalExamScore : "",
        st.totalScore !== undefined ? st.totalScore : 0,
        st.grade || "0",
        chaptersJson,
        sc.updatedAt || new Date().toISOString()
      ]);
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * 6️⃣ ซิงค์ชีต Events
 */
function syncEvents(ss, events) {
  var headers = [
    "รหัสกิจกรรม", "ชื่อกิจกรรม/นัดหมาย", "วันที่", "เวลาเริ่มต้น", 
    "เวลาสิ้นสุด", "สีแถบกิจกรรม", "รายละเอียด/สถานที่", "วันที่สร้าง"
  ];
  setupSheet(ss, "Events", headers, "#d97706");
  var sheet = ss.getSheetByName("Events");
  clearDataRows(sheet);

  if (events.length === 0) return;

  var rows = events.map(function(ev) {
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

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 7️⃣ ซิงค์ชีต Settings
 */
function syncSettings(ss, settings) {
  var headers = [
    "ชื่อครูประจำชั้น", "โรงเรียน", "ชั้นเรียน", "ปีการศึกษา", 
    "Google Drive Folder ID", "อัปเดตล่าสุด"
  ];
  setupSheet(ss, "Settings", headers, "#475569");
  var sheet = ss.getSheetByName("Settings");
  clearDataRows(sheet);

  if (!settings) return;

  var row = [
    settings.teacherName || "",
    settings.schoolName || "",
    settings.classroomName || "",
    settings.academicYear || "",
    settings.driveFolderId || DEFAULT_DRIVE_FOLDER_ID,
    new Date().toISOString()
  ];

  sheet.getRange(2, 1, 1, headers.length).setValues([row]);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 🧹 ฟังก์ชันลบเฉพาะแถวข้อมูล (เก็บแถวที่ 1 ซึ่งเป็นหัวตารางไว้เสมอ)
 */
function clearDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
}

/**
 * ☁️ จัดเก็บไฟล์/รูปภาพลง Google Drive โดยอัตโนมัติ
 * และตั้งสิทธิ์เป็นสาธารณะ (ANYONE_WITH_LINK) เพื่อให้รูปแสดงผลในเว็บได้ทันที
 */
function saveFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    var targetFolderId = folderId || DEFAULT_DRIVE_FOLDER_ID;
    var folder;
    
    try {
      folder = DriveApp.getFolderById(targetFolderId);
    } catch (e) {
      // หากหาโฟลเดอร์ไม่พบ ให้ใช้ Root Directory
      folder = DriveApp.getRootFolder();
    }

    // ล้าง Data URL Prefix หากมีติดมา
    var cleanBase64 = (base64Data || "").replace(/^data:[^;]+;base64,/, "");
    var decoded = Utilities.base64Decode(cleanBase64);
    var safeMime = mimeType || "image/jpeg";
    var safeName = fileName || ("student_photo_" + Date.now() + ".jpg");

    var blob = Utilities.newBlob(decoded, safeMime, safeName);
    var file = folder.createFile(blob);

    // เปิดสิทธิ์ให้ทุกคนที่มีลิงก์เข้าดูได้
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    // Direct CDN Link สำหรับแท็ก <img> โดยไม่มีปัญหา CORS
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

/**
 * 📖 ฟังก์ชันอ่านข้อมูลจากชีตกลับเป็น JSON (สำหรับ action: getAllData)
 */
function readStudentsSheet(ss) {
  return getSheetObjects(ss, "Students");
}

function readWeightHeightSheet(ss) {
  return getSheetObjects(ss, "WeightHeight");
}

function readAttendanceBankSheet(ss) {
  return getSheetObjects(ss, "AttendanceBank");
}

function readWithdrawalsSheet(ss) {
  return getSheetObjects(ss, "Withdrawals");
}

function readScoresSheet(ss) {
  return getSheetObjects(ss, "Scores");
}

function readEventsSheet(ss) {
  return getSheetObjects(ss, "Events");
}

function readSettingsSheet(ss) {
  return getSheetObjects(ss, "Settings");
}

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
