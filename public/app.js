// ---- 固定の選択肢 ----

const DAYS = ["月", "火", "水", "木", "金", "土", "日"];
const VISIT_TYPES = ["通院", "訪問", "施設訪問"];

// ---- サーバーとの通信 ----

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "通信に失敗しました");
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "通信に失敗しました");
  return res.json();
}

// ---- 状態 ----

let users = [];
let selectedDay = DAYS[(new Date().getDay() + 6) % 7]; // 0=日曜 → 月曜始まりに変換
let selectedUser = null;
let photoData = { back: null, knee: null };
let selectedVisitType = VISIT_TYPES[0];
let facilities = [];
let clinics = [];
let staffList = [];

// ---- 要素取得 ----

const recordDate = document.getElementById("recordDate");
const clinicSelect = document.getElementById("clinicSelect");
const staffSelect = document.getElementById("staffSelect");
const dayPillGroup = document.getElementById("dayPillGroup");
const lastWeekList = document.getElementById("lastWeekList");
const lastWeekEmptyHint = document.getElementById("lastWeekEmptyHint");
const nameSearch = document.getElementById("nameSearch");
const searchResultList = document.getElementById("searchResultList");
const searchEmptyHint = document.getElementById("searchEmptyHint");
const newUserLink = document.getElementById("newUserLink");
const selectedUserCard = document.getElementById("selectedUserCard");
const selectedNameDisplay = document.getElementById("selectedNameDisplay");
const visitTypePillGroup = document.getElementById("visitTypePillGroup");
const facilitySection = document.getElementById("facilitySection");
const facilitySelect = document.getElementById("facilitySelect");
const newFacilityButton = document.getElementById("newFacilityButton");
const facilityPatientCount = document.getElementById("facilityPatientCount");
const treatmentContent = document.getElementById("treatmentContent");
const areaInputGroup = document.getElementById("areaInputGroup");
const areaNumberInputs = areaInputGroup.querySelectorAll(".area-number-input");
const impressionNote = document.getElementById("impressionNote");
const saveButton = document.getElementById("saveButton");
const toast = document.getElementById("toast");

const newFacilityOverlay = document.getElementById("newFacilityOverlay");
const newFacilityName = document.getElementById("newFacilityName");
const cancelNewFacilityButton = document.getElementById("cancelNewFacilityButton");
const saveNewFacilityButton = document.getElementById("saveNewFacilityButton");

const newStaffButton = document.getElementById("newStaffButton");
const newStaffOverlay = document.getElementById("newStaffOverlay");
const newStaffName = document.getElementById("newStaffName");
const cancelNewStaffButton = document.getElementById("cancelNewStaffButton");
const saveNewStaffButton = document.getElementById("saveNewStaffButton");

const recordListButton = document.getElementById("recordListButton");
const recordListOverlay = document.getElementById("recordListOverlay");
const recordListContainer = document.getElementById("recordListContainer");
const closeRecordListButton = document.getElementById("closeRecordListButton");

const menuTriggerButton = document.getElementById("menuTriggerButton");
const menuPanel = document.getElementById("menuPanel");

// ---- 初期化 ----

function fillSelect(select, options) {
  select.innerHTML = "";
  options.forEach((label) => {
    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    select.appendChild(opt);
  });
}

async function loadClinics() {
  const previousValue = clinicSelect.value;
  try {
    clinics = await apiGet("/api/clinics");
  } catch (err) {
    showToast(err.message);
    return;
  }
  if (clinics.length === 0) {
    clinicSelect.innerHTML = '<option value=""></option>';
    return;
  }
  fillSelect(clinicSelect, clinics.map((c) => c.name));
  if (clinics.some((c) => c.name === previousValue)) {
    clinicSelect.value = previousValue;
  }
}

async function loadStaff() {
  const previousValue = staffSelect.value;
  try {
    staffList = await apiGet("/api/staff");
  } catch (err) {
    showToast(err.message);
    return;
  }
  if (staffList.length === 0) {
    staffSelect.innerHTML = '<option value=""></option>';
    return;
  }
  fillSelect(staffSelect, staffList.map((s) => s.name));
  if (staffList.some((s) => s.name === previousValue)) {
    staffSelect.value = previousValue;
  }
}

loadClinics();
loadStaff();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadClinics();
    loadStaff();
    loadUsers().then(renderSearchResults);
  }
});

newStaffButton.addEventListener("click", () => {
  newStaffName.value = "";
  openSheet(newStaffOverlay);
  newStaffName.focus();
});

cancelNewStaffButton.addEventListener("click", () => closeSheet(newStaffOverlay));

saveNewStaffButton.addEventListener("click", async () => {
  const name = newStaffName.value.trim();
  if (!name) {
    newStaffName.focus();
    return;
  }
  saveNewStaffButton.disabled = true;
  try {
    const staff = await apiPost("/api/staff", { name });
    staffList.push(staff);
    fillSelect(staffSelect, staffList.map((s) => s.name));
    staffSelect.value = staff.name;
    closeSheet(newStaffOverlay);
    showToast("施術師を登録しました");
  } catch (err) {
    showToast(err.message);
  } finally {
    saveNewStaffButton.disabled = false;
  }
});

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

recordDate.value = toDateInputValue(new Date());

DAYS.forEach((day) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pill-option" + (day === selectedDay ? " active" : "");
  btn.textContent = day + "曜";
  btn.dataset.day = day;
  btn.addEventListener("click", () => {
    selectedDay = day;
    document.querySelectorAll("#dayPillGroup .pill-option").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    renderLastWeekList();
  });
  dayPillGroup.appendChild(btn);
});

// ---- 通院・訪問の区分 ----

function updateFacilitySectionVisibility() {
  facilitySection.hidden = selectedVisitType !== "施設訪問";
}

VISIT_TYPES.forEach((type) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pill-option" + (type === selectedVisitType ? " active" : "");
  btn.textContent = type;
  btn.dataset.visitType = type;
  btn.addEventListener("click", () => {
    selectedVisitType = type;
    document.querySelectorAll("#visitTypePillGroup .pill-option").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    updateFacilitySectionVisibility();
  });
  visitTypePillGroup.appendChild(btn);
});

updateFacilitySectionVisibility();

function fillFacilitySelect() {
  facilitySelect.innerHTML = "";
  if (facilities.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "登録されている施設がありません";
    facilitySelect.appendChild(opt);
    return;
  }
  facilities.forEach((facility) => {
    const opt = document.createElement("option");
    opt.value = facility.id;
    opt.textContent = facility.name;
    facilitySelect.appendChild(opt);
  });
}

async function loadFacilities() {
  try {
    facilities = await apiGet("/api/facilities");
  } catch (err) {
    showToast(err.message);
  }
  fillFacilitySelect();
}

newFacilityButton.addEventListener("click", () => {
  newFacilityName.value = "";
  openSheet(newFacilityOverlay);
  newFacilityName.focus();
});

cancelNewFacilityButton.addEventListener("click", () => closeSheet(newFacilityOverlay));

saveNewFacilityButton.addEventListener("click", async () => {
  const name = newFacilityName.value.trim();
  if (!name) {
    newFacilityName.focus();
    return;
  }
  saveNewFacilityButton.disabled = true;
  try {
    const facility = await apiPost("/api/facilities", { name });
    facilities.push(facility);
    fillFacilitySelect();
    facilitySelect.value = facility.id;
    closeSheet(newFacilityOverlay);
    showToast("施設を登録しました");
  } catch (err) {
    showToast(err.message);
  } finally {
    saveNewFacilityButton.disabled = false;
  }
});

// ---- あいまい検索（ひらがな・カタカナ・空白を無視して部分一致） ----

function normalize(str) {
  return str
    .replace(/[ァ-ン]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60)) // カタカナ→ひらがな
    .replace(/\s+/g, "")
    .toLowerCase();
}

function fuzzyMatch(query, target) {
  if (!query) return false;
  return normalize(target).includes(normalize(query));
}

// ---- 利用者リストの描画 ----

function createUserRow(user, meta) {
  const row = document.createElement("div");
  row.className = "user-list-row" + (selectedUser && selectedUser.id === user.id ? " active" : "");
  row.innerHTML = `
    <div>
      <div class="user-list-row-name">${user.name}</div>
      ${meta ? `<div class="user-list-row-meta">${meta}</div>` : ""}
    </div>
    <div class="user-list-row-check">✓ 選択中</div>
  `;
  row.addEventListener("click", () => selectUser(user));
  return row;
}

async function renderLastWeekList() {
  lastWeekList.innerHTML = '<p class="field-hint">読み込み中...</p>';
  lastWeekEmptyHint.hidden = true;
  try {
    const rows = await apiGet(`/api/last-week?day=${encodeURIComponent(selectedDay)}`);
    lastWeekList.innerHTML = "";
    rows.forEach((user) => lastWeekList.appendChild(createUserRow(user, `先週の${selectedDay}曜日に利用`)));
    lastWeekEmptyHint.hidden = rows.length > 0;
  } catch (err) {
    lastWeekList.innerHTML = "";
    showToast(err.message);
  }
}

function renderSearchResults() {
  const query = nameSearch.value.trim();
  searchResultList.innerHTML = "";
  if (!query) {
    searchEmptyHint.hidden = true;
    return;
  }
  const matched = users.filter((u) => fuzzyMatch(query, u.name));
  matched.forEach((user) => searchResultList.appendChild(createUserRow(user)));
  searchEmptyHint.hidden = matched.length > 0;
}

nameSearch.addEventListener("input", renderSearchResults);

async function loadUsers() {
  try {
    users = await apiGet("/api/users");
  } catch (err) {
    showToast(err.message);
  }
}

// ---- 利用者の選択 ----

function selectUser(user) {
  selectedUser = user;
  selectedNameDisplay.textContent = user.name;
  renderLastWeekList();
  renderSearchResults();
}

// ---- 新規登録シート ----

function openSheet(overlay) {
  overlay.classList.add("open");
}

function closeSheet(overlay) {
  overlay.classList.remove("open");
}

newUserLink.addEventListener("click", () => {
  const query = nameSearch.value.trim();
  newUserLink.href = query ? `user-new.html?name=${encodeURIComponent(query)}` : "user-new.html";
});

// ---- 施術部位の数値入力 ----

function getAreaValues() {
  const result = {};
  areaNumberInputs.forEach((input) => {
    const value = Number(input.value);
    if (input.value !== "" && value > 0) {
      result[input.dataset.area] = value;
    }
  });
  return result;
}

// ---- 写真撮影（スマホのカメラを起動し、選んだ画像をプレビュー表示） ----

function wirePhotoInput(buttonId, inputId, previewId, key) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  button.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      photoData[key] = reader.result;
      preview.style.backgroundImage = `url(${reader.result})`;
      preview.classList.add("filled");
    };
    reader.readAsDataURL(file);
  });
}

wirePhotoInput("backPhotoButton", "backPhotoInput", "backPhotoPreview", "back");
wirePhotoInput("kneePhotoButton", "kneePhotoInput", "kneePhotoPreview", "knee");

// ---- 保存 ----

function resetEntryForm() {
  selectedUser = null;
  selectedNameDisplay.textContent = "未選択";
  treatmentContent.value = "";
  impressionNote.value = "";
  areaNumberInputs.forEach((input) => (input.value = ""));
  selectedVisitType = VISIT_TYPES[0];
  document.querySelectorAll("#visitTypePillGroup .pill-option").forEach((el, i) => {
    el.classList.toggle("active", i === 0);
  });
  updateFacilitySectionVisibility();
  facilitySelect.selectedIndex = 0;
  facilityPatientCount.value = "";
  photoData = { back: null, knee: null };
  ["backPhotoPreview", "kneePhotoPreview"].forEach((id) => {
    const el = document.getElementById(id);
    el.style.backgroundImage = "";
    el.classList.remove("filled");
  });
  document.getElementById("backPhotoInput").value = "";
  document.getElementById("kneePhotoInput").value = "";
  nameSearch.value = "";
  renderLastWeekList();
  renderSearchResults();
}

saveButton.addEventListener("click", async () => {
  if (!selectedUser) {
    showToast("利用者を選んでください");
    return;
  }
  if (!recordDate.value) {
    showToast("日付を入力してください");
    recordDate.focus();
    return;
  }

  let facilityName = "";
  let facilityPatientCountValue = "";
  if (selectedVisitType === "施設訪問") {
    const facility = facilities.find((f) => f.id === facilitySelect.value);
    if (!facility) {
      showToast("訪問先の施設を選んでください");
      return;
    }
    if (!facilityPatientCount.value || Number(facilityPatientCount.value) < 1) {
      showToast("同施設内での施術人数を入力してください");
      facilityPatientCount.focus();
      return;
    }
    facilityName = facility.name;
    facilityPatientCountValue = Number(facilityPatientCount.value);
  }

  saveButton.disabled = true;
  showToast("保存しています...");
  try {
    await apiPost("/api/records", {
      recordDate: recordDate.value,
      clinic: clinicSelect.value,
      staff: staffSelect.value,
      userId: selectedUser.id,
      userName: selectedUser.name,
      visitType: selectedVisitType,
      facilityName,
      facilityPatientCount: facilityPatientCountValue,
      treatmentContent: treatmentContent.value.trim(),
      areas: getAreaValues(),
      note: impressionNote.value.trim(),
      backPhoto: photoData.back,
      kneePhoto: photoData.knee,
    });
    showToast("保存しました");
    resetEntryForm();
  } catch (err) {
    showToast(err.message);
  } finally {
    saveButton.disabled = false;
  }
});

// ---- 記録一覧シート ----

function formatRecordDate(r) {
  const [y, m, d] = r.recordDate.split("-");
  return `${Number(m)}/${Number(d)}`;
}

async function renderRecordList() {
  recordListContainer.innerHTML = '<p class="record-list-empty">読み込み中...</p>';
  let records;
  try {
    records = await apiGet("/api/records");
  } catch (err) {
    recordListContainer.innerHTML = `<p class="record-list-empty">${err.message}</p>`;
    return;
  }

  recordListContainer.innerHTML = "";
  if (records.length === 0) {
    recordListContainer.innerHTML = '<p class="record-list-empty">まだ記録がありません。</p>';
    return;
  }
  records.forEach((r) => {
    const row = document.createElement("div");
    row.className = "record-row";
    const areaText = Object.entries(r.areas || {}).map(([name, value]) => `${name}:${value}`).join(" / ");
    const visitText = r.visitType === "施設訪問"
      ? `施設訪問（${r.facilityName || "施設未設定"}・${r.facilityPatientCount || "?"}人）`
      : (r.visitType || "");
    const photoLinks = [
      r.backPhotoUrl ? `<a href="${r.backPhotoUrl}" target="_blank" rel="noopener">後ろ姿</a>` : "",
      r.kneePhotoUrl ? `<a href="${r.kneePhotoUrl}" target="_blank" rel="noopener">膝の位置</a>` : "",
    ].filter(Boolean).join("　");
    row.innerHTML = `
      <div class="record-row-top">
        <div class="record-row-name">${r.userName}</div>
        <div class="record-row-date">${formatRecordDate(r)}</div>
      </div>
      <div class="record-row-meta">${areaText || "部位未入力"}　|　${r.clinic}・${r.staff}${visitText ? `　|　${visitText}` : ""}</div>
      ${r.treatmentContent ? `<div class="record-row-note">${r.treatmentContent}</div>` : ""}
      ${r.note ? `<div class="record-row-note">所感: ${r.note}</div>` : ""}
      ${photoLinks ? `<div class="record-row-note">📷 ${photoLinks}</div>` : ""}
    `;
    recordListContainer.appendChild(row);
  });
}

function closeMenuPanel() {
  menuPanel.hidden = true;
  menuTriggerButton.setAttribute("aria-expanded", "false");
}

menuTriggerButton.addEventListener("click", () => {
  const willOpen = menuPanel.hidden;
  menuPanel.hidden = !willOpen;
  menuTriggerButton.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", (e) => {
  if (!menuPanel.hidden && !e.target.closest(".menu-dropdown")) closeMenuPanel();
});

recordListButton.addEventListener("click", () => {
  closeMenuPanel();
  renderRecordList();
  openSheet(recordListOverlay);
});

menuPanel.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => closeMenuPanel());
});

closeRecordListButton.addEventListener("click", () => closeSheet(recordListOverlay));

[newFacilityOverlay, newStaffOverlay, recordListOverlay].forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet(overlay);
  });
});

// ---- トースト通知 ----

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

// ---- 初回描画 ----

loadUsers();
loadFacilities();
renderLastWeekList();
