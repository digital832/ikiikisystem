require("dotenv").config();

const express = require("express");
const path = require("path");
const sheetsService = require("./lib/sheetsService");
const storageService = require("./lib/storageService");

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/users", async (req, res) => {
  try {
    const users = await sheetsService.getUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "利用者の取得に失敗しました" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "名前を入力してください" });
    const user = await sheetsService.addUser({
      name,
      kana: (req.body.kana || "").trim(),
      gender: (req.body.gender || "").trim(),
      birthDate: (req.body.birthDate || "").trim(),
      address: (req.body.address || "").trim(),
      phone: (req.body.phone || "").trim(),
      relationship: (req.body.relationship || "").trim(),
      insurerNumber: (req.body.insurerNumber || "").trim(),
      insuredSymbolNumber: (req.body.insuredSymbolNumber || "").trim(),
      recipientNumber: (req.body.recipientNumber || "").trim(),
      publicExpensePayerNumber: (req.body.publicExpensePayerNumber || "").trim(),
      publicExpenseRecipientNumber: (req.body.publicExpenseRecipientNumber || "").trim(),
      copayRatio: (req.body.copayRatio || "").trim(),
      clinic: (req.body.clinic || "").trim(),
      practitioner1: (req.body.practitioner1 || "").trim(),
      practitioner2: (req.body.practitioner2 || "").trim(),
      day1: (req.body.day1 || "").trim(),
      day2: (req.body.day2 || "").trim(),
      day3: (req.body.day3 || "").trim(),
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "利用者の登録に失敗しました" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "名前を入力してください" });
    const user = await sheetsService.updateUser(req.params.id, {
      name,
      kana: (req.body.kana || "").trim(),
      gender: (req.body.gender || "").trim(),
      birthDate: (req.body.birthDate || "").trim(),
      address: (req.body.address || "").trim(),
      phone: (req.body.phone || "").trim(),
      relationship: (req.body.relationship || "").trim(),
      insurerNumber: (req.body.insurerNumber || "").trim(),
      insuredSymbolNumber: (req.body.insuredSymbolNumber || "").trim(),
      recipientNumber: (req.body.recipientNumber || "").trim(),
      publicExpensePayerNumber: (req.body.publicExpensePayerNumber || "").trim(),
      publicExpenseRecipientNumber: (req.body.publicExpenseRecipientNumber || "").trim(),
      copayRatio: (req.body.copayRatio || "").trim(),
      clinic: (req.body.clinic || "").trim(),
      practitioner1: (req.body.practitioner1 || "").trim(),
      practitioner2: (req.body.practitioner2 || "").trim(),
      day1: (req.body.day1 || "").trim(),
      day2: (req.body.day2 || "").trim(),
      day3: (req.body.day3 || "").trim(),
    });
    if (!user) return res.status(404).json({ error: "利用者が見つかりません" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "利用者の更新に失敗しました" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const ok = await sheetsService.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "利用者が見つかりません" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "利用者の削除に失敗しました" });
  }
});

app.post("/api/customer-list-password/verify", async (req, res) => {
  try {
    const password = (req.body.password || "").trim();
    const current = await sheetsService.getCustomerListPassword();
    if (password !== current) {
      return res.status(401).json({ error: "パスワードが違います" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "確認に失敗しました" });
  }
});

app.post("/api/customer-list-password/change", async (req, res) => {
  try {
    const currentPassword = (req.body.currentPassword || "").trim();
    const newPassword = (req.body.newPassword || "").trim();
    if (!newPassword) return res.status(400).json({ error: "新しいパスワードを入力してください" });
    const current = await sheetsService.getCustomerListPassword();
    if (currentPassword !== current) {
      return res.status(401).json({ error: "現在のパスワードが違います" });
    }
    await sheetsService.setCustomerListPassword(newPassword);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "パスワードの変更に失敗しました" });
  }
});

app.get("/api/staff", async (req, res) => {
  try {
    const staff = await sheetsService.getStaff();
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "施術師の取得に失敗しました" });
  }
});

app.post("/api/staff", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "施術師名を入力してください" });
    const staff = await sheetsService.addStaff(name);
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "施術師の登録に失敗しました" });
  }
});

app.put("/api/staff/:id", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "施術師名を入力してください" });
    const staff = await sheetsService.updateStaff(req.params.id, name);
    if (!staff) return res.status(404).json({ error: "施術師が見つかりません" });
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "施術師の更新に失敗しました" });
  }
});

app.delete("/api/staff/:id", async (req, res) => {
  try {
    const ok = await sheetsService.deleteStaff(req.params.id);
    if (!ok) return res.status(404).json({ error: "施術師が見つかりません" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "施術師の削除に失敗しました" });
  }
});

app.get("/api/clinics", async (req, res) => {
  try {
    const clinics = await sheetsService.getClinics();
    res.json(clinics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "治療院の取得に失敗しました" });
  }
});

app.post("/api/clinics", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "治療院名を入力してください" });
    const clinic = await sheetsService.addClinic({
      name,
      managerName: (req.body.managerName || "").trim(),
      address: (req.body.address || "").trim(),
      phone: (req.body.phone || "").trim(),
    });
    res.json(clinic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "治療院の登録に失敗しました" });
  }
});

app.put("/api/clinics/:id", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "治療院名を入力してください" });
    const clinic = await sheetsService.updateClinic(req.params.id, {
      name,
      managerName: (req.body.managerName || "").trim(),
      address: (req.body.address || "").trim(),
      phone: (req.body.phone || "").trim(),
    });
    if (!clinic) return res.status(404).json({ error: "治療院が見つかりません" });
    res.json(clinic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "治療院の更新に失敗しました" });
  }
});

app.delete("/api/clinics/:id", async (req, res) => {
  try {
    const ok = await sheetsService.deleteClinic(req.params.id);
    if (!ok) return res.status(404).json({ error: "治療院が見つかりません" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "治療院の削除に失敗しました" });
  }
});

app.get("/api/facilities", async (req, res) => {
  try {
    const facilities = await sheetsService.getFacilities();
    res.json(facilities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "施設の取得に失敗しました" });
  }
});

app.post("/api/facilities", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "施設名を入力してください" });
    const facility = await sheetsService.addFacility(name);
    res.json(facility);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "施設の登録に失敗しました" });
  }
});

app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await sheetsService.getDoctors();
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "医師の取得に失敗しました" });
  }
});

app.post("/api/doctors", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "医師名を入力してください" });
    const doctor = await sheetsService.addDoctor(name);
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "医師の登録に失敗しました" });
  }
});

app.get("/api/employees", async (req, res) => {
  try {
    const employees = await sheetsService.getEmployees();
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "スタッフの取得に失敗しました" });
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "スタッフ名を入力してください" });
    const employee = await sheetsService.addEmployee(name);
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "スタッフの登録に失敗しました" });
  }
});

app.put("/api/employees/:id", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "スタッフ名を入力してください" });
    const employee = await sheetsService.updateEmployee(req.params.id, name);
    if (!employee) return res.status(404).json({ error: "スタッフが見つかりません" });
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "スタッフの更新に失敗しました" });
  }
});

app.delete("/api/employees/:id", async (req, res) => {
  try {
    const ok = await sheetsService.deleteEmployee(req.params.id);
    if (!ok) return res.status(404).json({ error: "スタッフが見つかりません" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "スタッフの削除に失敗しました" });
  }
});

app.get("/api/consents", async (req, res) => {
  try {
    const consents = await sheetsService.getConsents(req.query.userId);
    res.json(consents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "同意書の取得に失敗しました" });
  }
});

app.post("/api/consents", async (req, res) => {
  try {
    const body = req.body;
    if (!body.userName || !body.obtainedDate) {
      return res.status(400).json({ error: "利用者と取得日は必須です" });
    }
    if (!body.anma && !body.shinkyu) {
      return res.status(400).json({ error: "あん摩・鍼灸のどちらかを選んでください" });
    }
    const consent = await sheetsService.addConsent({
      userId: body.userId,
      userName: body.userName,
      anma: !!body.anma,
      shinkyu: !!body.shinkyu,
      obtainedDate: body.obtainedDate,
      content: (body.content || "").trim(),
      symptom: (body.symptom || "").trim(),
      doctorName: body.doctorName || "",
    });
    res.json(consent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "同意書の保存に失敗しました" });
  }
});

app.get("/api/last-week", async (req, res) => {
  try {
    const day = req.query.day;
    if (!day) return res.status(400).json({ error: "day を指定してください" });
    const users = await sheetsService.getLastWeekUsersByDay(day);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "先週の利用者の取得に失敗しました" });
  }
});

app.get("/api/records", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const records = await sheetsService.getRecords(limit);
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "記録の取得に失敗しました" });
  }
});

app.post("/api/records", async (req, res) => {
  try {
    const body = req.body;
    if (!body.recordDate || !body.userName) {
      return res.status(400).json({ error: "日付と利用者名は必須です" });
    }

    const namePrefix = `${body.recordDate}_${body.userName}_${Date.now()}`;
    const [backPhotoUrl, kneePhotoUrl] = await Promise.all([
      body.backPhoto ? storageService.uploadPhoto(body.backPhoto, `${namePrefix}_後ろ姿.jpg`) : Promise.resolve(""),
      body.kneePhoto ? storageService.uploadPhoto(body.kneePhoto, `${namePrefix}_膝.jpg`) : Promise.resolve(""),
    ]);

    const record = await sheetsService.addRecord({
      recordDate: body.recordDate,
      clinic: body.clinic,
      staff: body.staff,
      userId: body.userId,
      userName: body.userName,
      visitType: body.visitType,
      facilityName: body.facilityName,
      facilityPatientCount: body.facilityPatientCount,
      treatmentContent: body.treatmentContent,
      areas: body.areas,
      note: body.note,
      backPhotoUrl,
      kneePhotoUrl,
    });

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "記録の保存に失敗しました" });
  }
});

app.get("/api/photos/:objectName", async (req, res) => {
  try {
    const stream = await storageService.getPhotoStream(req.params.objectName);
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(404).send("画像が見つかりません");
  }
});

const PORT = process.env.PORT || 8080;

sheetsService
  .ensureSheets()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("起動時にスプレッドシートの初期化に失敗しました", err);
    process.exit(1);
  });
