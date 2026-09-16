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
  "治療院",
  "担当施術師１",
  "担当施術師２",
  "曜日１",
  "曜日２",
  "曜日３",
  "あん摩",
  "鍼灸",
  "変形徒手",
  "初診日",
];

const FACILITIES_SHEET = "施設";
const FACILITIES_HEADER = ["ID", "施設名", "登録日時"];

const STAFF_SHEET = "施術師";
const STAFF_HEADER = ["ID", "名前", "登録日時"];

const CLINICS_SHEET = "治療院";
const CLINICS_HEADER = ["ID", "治療院名", "施術管理者名", "住所", "電話番号", "登録日時"];

const DOCTORS_SHEET = "医師";
const DOCTORS_HEADER = ["ID", "名前", "登録日時"];

const EMPLOYEES_SHEET = "スタッフ";
const EMPLOYEES_HEADER = ["ID", "名前", "登録日時"];

const INSURERS_SHEET = "保険者番号";
const INSURERS_HEADER = ["ID", "保険者番号", "登録日時"];

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

const SETTINGS_SHEET = "設定";
const SETTINGS_HEADER = ["キー", "値"];

const CUSTOMER_LIST_PASSWORD_KEY = "customerListPassword";
const DEFAULT_CUSTOMER_LIST_PASSWORD = "0013";

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

  const toCreate = [USERS_SHEET, FACILITIES_SHEET, STAFF_SHEET, CLINICS_SHEET, RECORDS_SHEET, DOCTORS_SHEET, CONSENTS_SHEET, EMPLOYEES_SHEET, SETTINGS_SHEET, INSURERS_SHEET].filter((name) => !existingTitles.includes(name));
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
  await ensureHeader(EMPLOYEES_SHEET, EMPLOYEES_HEADER);
  await ensureHeader(SETTINGS_SHEET, SETTINGS_HEADER);
  await ensureHeader(INSURERS_SHEET, INSURERS_HEADER);
}

let gridIdCache = null;

async function getGridId(sheetName) {
  if (!gridIdCache) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    gridIdCache = {};
    meta.data.sheets.forEach((s) => {
      gridIdCache[s.properties.title] = s.properties.sheetId;
    });
  }
  return gridIdCache[sheetName];
}

async function findRowById(sheetName, lastCol, id) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:${lastCol}`,
  });
  const rows = res.data.values || [];
  const index = rows.findIndex((row) => row[0] === id);
  if (index === -1) return null;
  return { row: rows[index], rowNumber: index + 2 };
}

async function deleteRowById(sheetName, lastCol, id) {
  const found = await findRowById(sheetName, lastCol, id);
  if (!found) return false;
  const gridId = await getGridId(sheetName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId: gridId, dimension: "ROWS", startIndex: found.rowNumber - 1, endIndex: found.rowNumber },
          },
        },
      ],
    },
  });
  return true;
}

function columnLetter(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

async function ensureColumnCount(sheetName, minColumns) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === sheetName);
  const currentColumns = sheet.properties.gridProperties.columnCount;
  if (currentColumns < minColumns) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            appendDimension: {
              sheetId: sheet.properties.sheetId,
              dimension: "COLUMNS",
              length: minColumns - currentColumns,
            },
          },
        ],
      },
    });
  }
}

async function ensureHeader(sheetName, header) {
  await ensureColumnCount(sheetName, header.length);
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
  } else if (firstRow.length < header.length) {
    const missing = header.slice(firstRow.length);
    const startCol = columnLetter(firstRow.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${startCol}1`,
      valueInputOption: "RAW",
      requestBody: { values: [missing] },
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
    clinic: row[20] || "",
    practitioner1: row[21] || "",
    practitioner2: row[22] || "",
    day1: row[23] || "",
    day2: row[24] || "",
    day3: row[25] || "",
    areas: {
      "あん摩": row[26] || "",
      "鍼灸": row[27] || "",
      "変形徒手": row[28] || "",
    },
    firstVisitDate: row[29] || "",
  };
}

async function getUsers() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET}!A2:AD`,
  });
  const rows = res.data.values || [];
  return rows.filter((row) => row[0]).map(rowToUser);
}

async function addUser(user) {
  const id = "u" + Date.now();
  const areas = user.areas || {};
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
    "",
    "",
    "",
    "",
    "",
    user.clinic || "",
    user.practitioner1 || "",
    user.practitioner2 || "",
    user.day1 || "",
    user.day2 || "",
    user.day3 || "",
    areas["あん摩"] || "",
    areas["鍼灸"] || "",
    areas["変形徒手"] || "",
    user.firstVisitDate || "",
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET}!A:AD`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return rowToUser(row);
}

async function updateUser(id, user) {
  const found = await findRowById(USERS_SHEET, "AD", id);
  if (!found) return null;
  const areas = user.areas || {};
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
    found.row[14] || new Date().toISOString(),
    found.row[15] || "",
    found.row[16] || "",
    found.row[17] || "",
    found.row[18] || "",
    found.row[19] || "",
    user.clinic || "",
    user.practitioner1 || "",
    user.practitioner2 || "",
    user.day1 || "",
    user.day2 || "",
    user.day3 || "",
    areas["あん摩"] || "",
    areas["鍼灸"] || "",
    areas["変形徒手"] || "",
    user.firstVisitDate || "",
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET}!A${found.rowNumber}:AD${found.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return rowToUser(row);
}

async function deleteUser(id) {
  return deleteRowById(USERS_SHEET, "AD", id);
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

async function updateStaff(id, name) {
  const found = await findRowById(STAFF_SHEET, "C", id);
  if (!found) return null;
  const row = [id, name, found.row[2] || new Date().toISOString()];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${STAFF_SHEET}!A${found.rowNumber}:C${found.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return { id, name };
}

async function deleteStaff(id) {
  return deleteRowById(STAFF_SHEET, "C", id);
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

async function updateClinic(id, clinic) {
  const found = await findRowById(CLINICS_SHEET, "F", id);
  if (!found) return null;
  const row = [
    id,
    clinic.name,
    clinic.managerName || "",
    clinic.address || "",
    clinic.phone || "",
    found.row[5] || new Date().toISOString(),
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${CLINICS_SHEET}!A${found.rowNumber}:F${found.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return { id, name: clinic.name, managerName: clinic.managerName || "", address: clinic.address || "", phone: clinic.phone || "" };
}

async function deleteClinic(id) {
  return deleteRowById(CLINICS_SHEET, "F", id);
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

async function getEmployees() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${EMPLOYEES_SHEET}!A2:C`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({ id: row[0], name: row[1] || "" }));
}

async function addEmployee(name) {
  const id = "e" + Date.now();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${EMPLOYEES_SHEET}!A:C`,
    valueInputOption: "RAW",
    requestBody: { values: [[id, name, new Date().toISOString()]] },
  });
  return { id, name };
}

async function updateEmployee(id, name) {
  const found = await findRowById(EMPLOYEES_SHEET, "C", id);
  if (!found) return null;
  const row = [id, name, found.row[2] || new Date().toISOString()];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${EMPLOYEES_SHEET}!A${found.rowNumber}:C${found.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return { id, name };
}

async function deleteEmployee(id) {
  return deleteRowById(EMPLOYEES_SHEET, "C", id);
}

async function getInsurers() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${INSURERS_SHEET}!A2:C`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({ id: row[0], number: row[1] || "" }));
}

async function addInsurer(number) {
  const id = "in" + Date.now();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${INSURERS_SHEET}!A:C`,
    valueInputOption: "RAW",
    requestBody: { values: [[id, number, new Date().toISOString()]] },
  });
  return { id, number };
}

async function getSettingRows() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SETTINGS_SHEET}!A2:B`,
  });
  return res.data.values || [];
}

async function getSetting(key) {
  const rows = await getSettingRows();
  const row = rows.find((r) => r[0] === key);
  return row ? row[1] || "" : null;
}

async function setSetting(key, value) {
  const rows = await getSettingRows();
  const index = rows.findIndex((r) => r[0] === key);
  if (index === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SETTINGS_SHEET}!A:B`,
      valueInputOption: "RAW",
      requestBody: { values: [[key, value]] },
    });
  } else {
    const rowNumber = index + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SETTINGS_SHEET}!A${rowNumber}:B${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[key, value]] },
    });
  }
}

async function getCustomerListPassword() {
  const value = await getSetting(CUSTOMER_LIST_PASSWORD_KEY);
  return value || DEFAULT_CUSTOMER_LIST_PASSWORD;
}

async function setCustomerListPassword(newPassword) {
  await setSetting(CUSTOMER_LIST_PASSWORD_KEY, newPassword);
}

module.exports = {
  ensureSheets,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getFacilities,
  addFacility,
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  getClinics,
  addClinic,
  updateClinic,
  deleteClinic,
  getRecords,
  addRecord,
  getLastWeekUsersByDay,
  getDoctors,
  addDoctor,
  getConsents,
  addConsent,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getCustomerListPassword,
  setCustomerListPassword,
  getInsurers,
  addInsurer,
};
