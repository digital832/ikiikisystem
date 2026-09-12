const { sheets } = require("./google");

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const USERS_SHEET = "利用者";
const USERS_HEADER = [
  "ID",
  "名前",
  "フリガナ",
  "性別",
  "生年月日",
  "住所",
  "電話番号",
  "続柄",
  "保険者番号",
  "被保険者証記号番号",
  "受給者番号",
  "公費負担者番号",
  "公費受給者番号",
  "一部負担金割合",
  "登録日時",
  "同意医師名",
  "同意年月日",
  "傷病名",
  "施術期間開始",
  "施術期間終了",
];

const FACILITIES_SHEET = "施設";
const FACILITIES_HEADER = ["ID", "施設名", "登録日時"];

const STAFF_SHEET = "施術師";
const STAFF_HEADER = ["ID", "名前", "登録日時"];

const CLINICS_SHEET = "治療院";
const CLINICS_HEADER = ["ID", "治療院名", "施術管理者名", "住所", "電話番号", "登録日時"];

const DOCTORS_SHEET = "医師";
const DOCTORS_HEADER = ["ID", "名前", "登録日時"];

const CONSENTS_SHEET = "同意書";
const CONSENTS_HEADER = [
  "ID",
  "利用者ID",
  "利用者名",
  "あん摩",
  "鍼灸",
  "取得日",
  "同意内容",
  "症状",
  "医師名",
  "登録日時",
];

const RECORDS_SHEET = "記録";
const RECORDS_HEADER = [
  "記録日",
  "治療院",
  "施術師",
  "利用者ID",
  "利用者名",
  "治療内容",
  "あん摩",
  "鍼灸",
  "変形徒手",
  "訪問区分",
  "施設名",
  "施設内人数",
  "所感",
  "後ろ姿写真URL",
  "膝写真URL",
  "登録日時",
];

const DAYS = ["月", "火", "水", "木", "金", "土", "日"];

function dayLabelOf(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay(); // 0=日曜
  return DAYS[(jsDay + 6) % 7];
}

async function ensureSheets() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingTitles = meta.data.sheets.map((s) => s.properties.title);

  const toCreate = [USERS_SHEET, FACILITIES_SHEET, STAFF_SHEET, CLINICS_SHEET, RECORDS_SHEET, DOCTORS_SHEET, CONSENTS_SHEET].filter((name) => !existingTitles.includes(name));
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
  }

  await ensureHeader(USERS_SHEET, USERS_HEADER);
  await ensureHeader(FACILITIES_SHEET, FACILITIES_HEADER);
  await ensureHeader(STAFF_SHEET, STAFF_HEADER);
  await ensureHeader(CLINICS_SHEET, CLINICS_HEADER);
  await ensureHeader(RECORDS_SHEET, RECORDS_HEADER);
  await ensureHeader(DOCTORS_SHEET, DOCTORS_HEADER);
  await ensureHeader(CONSENTS_SHEET, CONSENTS_HEADER);
}

async function ensureHeader(sheetName, header) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:1`,
  });
  const firstRow = res.data.values && res.data.values[0];
  if (!firstRow || firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }
}

function rowToUser(row) {
  return {
    id: row[0] || "",
    name: row[1] || "",
    kana: row[2] || "",
    gender: row[3] || "",
    birthDate: row[4] || "",
    address: row[5] || "",
    phone: row[6] || "",
    relationship: row[7] || "",
    insurerNumber: row[8] || "",
    insuredSymbolNumber: row[9] || "",
    recipientNumber: row[10] || "",
    publicExpensePayerNumber: row[11] || "",
    publicExpenseRecipientNumber: row[12] || "",
    copayRatio: row[13] || "",
  };
}

async function getUsers() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET}!A2:O`,
  });
  const rows = res.data.values || [];
  return rows.filter((row) => row[0]).map(rowToUser);
}

async function addUser(user) {
  const id = "u" + Date.now();
  const row = [
    id,
    user.name,
    user.kana || "",
    user.gender || "",
    user.birthDate || "",
    user.address || "",
    user.phone || "",
    user.relationship || "",
    user.insurerNumber || "",
    user.insuredSymbolNumber || "",
    user.recipientNumber || "",
    user.publicExpensePayerNumber || "",
    user.publicExpenseRecipientNumber || "",
    user.copayRatio || "",
    new Date().toISOString(),
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET}!A:O`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return rowToUser(row);
}

async function getFacilities() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${FACILITIES_SHEET}!A2:C`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({ id: row[0], name: row[1] || "" }));
}

async function addFacility(name) {
  const id = "f" + Date.now();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${FACILITIES_SHEET}!A:C`,
    valueInputOption: "RAW",
    requestBody: { values: [[id, name, new Date().toISOString()]] },
  });
  return { id, name };
}

async function getStaff() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${STAFF_SHEET}!A2:C`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({ id: row[0], name: row[1] || "" }));
}

async function addStaff(name) {
  const id = "s" + Date.now();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${STAFF_SHEET}!A:C`,
    valueInputOption: "RAW",
    requestBody: { values: [[id, name, new Date().toISOString()]] },
  });
  return { id, name };
}

async function getClinics() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${CLINICS_SHEET}!A2:F`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({
      id: row[0],
      name: row[1] || "",
      managerName: row[2] || "",
      address: row[3] || "",
      phone: row[4] || "",
    }));
}

async function addClinic(clinic) {
  const id = "c" + Date.now();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${CLINICS_SHEET}!A:F`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        id,
        clinic.name,
        clinic.managerName || "",
        clinic.address || "",
        clinic.phone || "",
        new Date().toISOString(),
      ]],
    },
  });
  return { id, name: clinic.name, managerName: clinic.managerName || "", address: clinic.address || "", phone: clinic.phone || "" };
}

async function getRecordRows() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${RECORDS_SHEET}!A2:P`,
  });
  return res.data.values || [];
}

function rowToRecord(row) {
  return {
    recordDate: row[0] || "",
    clinic: row[1] || "",
    staff: row[2] || "",
    userId: row[3] || "",
    userName: row[4] || "",
    treatmentContent: row[5] || "",
    areas: {
      ...(row[6] ? { "あん摩": Number(row[6]) } : {}),
      ...(row[7] ? { "鍼灸": Number(row[7]) } : {}),
      ...(row[8] ? { "変形徒手": Number(row[8]) } : {}),
    },
    visitType: row[9] || "",
    facilityName: row[10] || "",
    facilityPatientCount: row[11] ? Number(row[11]) : "",
    note: row[12] || "",
    backPhotoUrl: row[13] || "",
    kneePhotoUrl: row[14] || "",
    createdAt: row[15] || "",
  };
}

async function getRecords(limit = 200) {
  const rows = await getRecordRows();
  return rows
    .map(rowToRecord)
    .reverse()
    .slice(0, limit);
}

async function addRecord(record) {
  const areas = record.areas || {};
  const row = [
    record.recordDate,
    record.clinic,
    record.staff,
    record.userId || "",
    record.userName,
    record.treatmentContent || "",
    areas["あん摩"] || "",
    areas["鍼灸"] || "",
    areas["変形徒手"] || "",
    record.visitType || "",
    record.facilityName || "",
    record.facilityPatientCount || "",
    record.note || "",
    record.backPhotoUrl || "",
    record.kneePhotoUrl || "",
    new Date().toISOString(),
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${RECORDS_SHEET}!A:P`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return rowToRecord(row);
}

async function getDoctors() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${DOCTORS_SHEET}!A2:C`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({ id: row[0], name: row[1] || "" }));
}

async function addDoctor(name) {
  const id = "d" + Date.now();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${DOCTORS_SHEET}!A:C`,
    valueInputOption: "RAW",
    requestBody: { values: [[id, name, new Date().toISOString()]] },
  });
  return { id, name };
}

function rowToConsent(row) {
  return {
    id: row[0] || "",
    userId: row[1] || "",
    userName: row[2] || "",
    anma: row[3] === "1",
    shinkyu: row[4] === "1",
    obtainedDate: row[5] || "",
    content: row[6] || "",
    symptom: row[7] || "",
    doctorName: row[8] || "",
    createdAt: row[9] || "",
  };
}

async function getConsentRows() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${CONSENTS_SHEET}!A2:J`,
  });
  return res.data.values || [];
}

async function getConsents(userId) {
  const rows = await getConsentRows();
  let consents = rows.filter((row) => row[0]).map(rowToConsent);
  if (userId) {
    consents = consents.filter((c) => c.userId === userId);
  }
  return consents.reverse();
}

async function addConsent(consent) {
  const id = "co" + Date.now();
  const row = [
    id,
    consent.userId || "",
    consent.userName,
    consent.anma ? "1" : "",
    consent.shinkyu ? "1" : "",
    consent.obtainedDate || "",
    consent.content || "",
    consent.symptom || "",
    consent.doctorName || "",
    new Date().toISOString(),
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${CONSENTS_SHEET}!A:J`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return rowToConsent(row);
}

async function getLastWeekUsersByDay(day) {
  const rows = await getRecordRows();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 14);

  const seen = new Map();
  for (const row of rows) {
    const recordDate = row[0];
    if (!recordDate) continue;
    const [y, m, d] = recordDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date < cutoff || date > today) continue;
    if (dayLabelOf(recordDate) !== day) continue;

    const userId = row[3] || "";
    const userName = row[4] || "";
    if (!userName) continue;
    const key = userId || userName;
    const existing = seen.get(key);
    if (!existing || date > existing.date) {
      seen.set(key, { id: userId, name: userName, date });
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.date - a.date)
    .map(({ id, name }) => ({ id, name }));
}

module.exports = {
  ensureSheets,
  getUsers,
  addUser,
  getFacilities,
  addFacility,
  getStaff,
  addStaff,
  getClinics,
  addClinic,
  getRecords,
  addRecord,
  getLastWeekUsersByDay,
  getDoctors,
  addDoctor,
  getConsents,
  addConsent,
};
