
"use strict";

/* =========================================================
   AutOutline Lab
   實驗資料仍為原型資料；登入狀態會連接後端。
========================================================= */

/* ---------- 共用工具 ---------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

let canAccessExperiments = false;

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function formatMetric(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

function getCurrentDateTime() {
  return new Date().toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function statusBadge(status) {
  const isSuccess = status === "完成";
  const cls = isSuccess ? "badge badge-success" : "badge badge-warning";

  return `<span class="${cls}">${escapeHTML(status)}</span>`;
}

/* ---------- Google 登入狀態 ---------- */

async function initializeAuthUI() {
  const loginLink = $("#authLogin");
  const profile = $("#authProfile");
  const name = $("#authName");
  const avatar = $("#authAvatar");
  const logoutButton = $("#authLogout");

  if (!loginLink || !profile || !name || !avatar || !logoutButton) return;

  if (window.location.protocol === "file:") {
    loginLink.classList.add("hidden");
    return;
  }

  loginLink.href = new URL("api/auth/google/login", window.location.href).href;

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const response = await fetch(
        new URL("api/auth/logout", window.location.href),
        { method: "POST", credentials: "same-origin" }
      );
      if (!response.ok) {
        throw new Error(`登出失敗：HTTP ${response.status}`);
      }
      window.location.reload();
    } catch (error) {
      logoutButton.disabled = false;
      console.error("無法登出", error);
      showToast("登出失敗，請稍後再試。");
    }
  });

  try {
    const response = await fetch(
      new URL("api/auth/me", window.location.href),
      { credentials: "same-origin", cache: "no-store" }
    );
    if (response.status === 401) return;
    if (!response.ok) {
      throw new Error(`無法讀取登入狀態：HTTP ${response.status}`);
    }

    const member = await response.json();
    name.textContent = member.name || member.email;
    if (typeof member.picture === "string" &&
        member.picture.startsWith("https://")) {
      avatar.src = member.picture;
      avatar.classList.remove("hidden");
    }
    loginLink.classList.add("hidden");
    profile.classList.remove("hidden");
    canAccessExperiments = member.can_access_experiments === true;
    $$("[data-experiment-access]").forEach((element) => {
      element.classList.toggle("hidden", !canAccessExperiments);
    });
    if (canAccessExperiments) {
      navigateToPage("workflow");
    }
  } catch (error) {
    console.error("無法讀取登入狀態", error);
    showToast("目前無法連線到登入服務。");
  }
}

/* ---------- Sidebar 收合 ---------- */

const sidebarToggle = $("#sidebarToggle");

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);

  if (sidebarToggle) {
    sidebarToggle.textContent = collapsed ? "›" : "‹";
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    sidebarToggle.setAttribute(
      "aria-label",
      collapsed ? "展開側邊欄" : "收合側邊欄"
    );
    sidebarToggle.title = collapsed ? "展開側邊欄" : "收合側邊欄";
  }
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    const isCollapsed =
      document.body.classList.contains("sidebar-collapsed");

    setSidebarCollapsed(!isCollapsed);
  });
}

/* ---------- 頁面導覽 ---------- */

const pageNames = {
  overview: "實驗總覽",
  workflow: "Workflow 編輯器",
  dataset: "Dataset 標註",
  compare: "實驗比較",
  history: "執行紀錄",
  video: "影片觀看"
};

const experimentPages = new Set([
  "overview",
  "workflow",
  "dataset",
  "compare",
  "history"
]);

function navigateToPage(pageName) {
  if (!pageNames[pageName] ||
      (experimentPages.has(pageName) && !canAccessExperiments)) {
    return;
  }

  $$(".page-view").forEach((page) => {
    page.classList.toggle("hidden", page.id !== `page-${pageName}`);
  });

  $$(".sidebar-link").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  $("#pageTitle").textContent = pageNames[pageName];
  $("#breadcrumbCurrent").textContent = pageNames[pageName];

  if (pageName === "compare") {
    renderComparison();
  }

  if (pageName === "history") {
    renderHistory();
  }

  if (pageName === "overview") {
    renderOverview();
  }

  if (pageName === "workflow") {
    renderWorkflowExperiments();
  }

  if (window.innerWidth <= 620) {
    setSidebarCollapsed(true);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    navigateToPage(button.dataset.page);
  });
});

$$("[data-go-page]").forEach((button) => {
  button.addEventListener("click", () => {
    navigateToPage(button.dataset.goPage);
  });
});

/* ---------- 模組資料 ---------- */

const moduleDefinitions = {
  input: {
    title: "影片輸入",
    description: "設定影片來源與資料讀取方式。",
    number: "01",
    fields: [
      {
        key: "source",
        label: "影片來源",
        type: "select",
        value: "dataset",
        options: [
          { value: "dataset", label: "從 Dataset 讀取" },
          { value: "folder", label: "從資料夾讀取" },
          { value: "manifest", label: "從清單檔讀取" }
        ],
        hint: "原型介面，尚未實際讀取檔案。"
      },
      {
        key: "extensions",
        label: "支援格式",
        type: "text",
        value: ".mp4, .avi, .mov"
      }
    ]
  },

  prescan: {
    title: "Pre-scan",
    description: "預先檢查影片特徵，評估頁碼是否存在。",
    number: "02",
    fields: [
      {
        key: "sampleInterval",
        label: "取樣間隔（秒）",
        type: "number",
        value: 5,
        min: 1,
        max: 120,
        step: 1,
        hint: "數值越小，取樣越密集，但可能增加計算量。"
      },
      {
        key: "detectPageNumber",
        label: "檢查頁碼特徵",
        type: "checkbox",
        value: true
      },
      {
        key: "detectSlideChange",
        label: "檢查畫面變化",
        type: "checkbox",
        value: true
      },
      {
        key: "threshold",
        label: "初步判定閾值",
        type: "number",
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.05
      }
    ]
  },

  detection: {
    title: "投影片與標題偵測",
    description: "設定 LocateAnything 的偵測方式與提示詞。",
    number: "03",
    fields: [
      {
        key: "model",
        label: "偵測方法",
        type: "select",
        value: "LocateAnything",
        options: [
          { value: "LocateAnything", label: "LocateAnything" },
          { value: "Custom", label: "自訂偵測模型" }
        ]
      },
      {
        key: "detectionMode",
        label: "偵測策略",
        type: "select",
        value: "both",
        options: [
          { value: "both", label: "同時偵測標題與頁碼" },
          { value: "title", label: "只偵測標題" },
          { value: "page", label: "只偵測頁碼" }
        ],
        hint: "可比較同時偵測與分開偵測的結果。"
      },
      {
        key: "frameInterval",
        label: "影格取樣間隔",
        type: "number",
        value: 1,
        min: 1,
        max: 60,
        step: 1,
        hint: "此處為實驗參數示意，尚未連接實際模型。"
      },
      {
        key: "confidence",
        label: "信心閾值",
        type: "number",
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        key: "prompt",
        label: "偵測 Prompt",
        type: "textarea",
        value: "Detect the presentation slide title and page number visible in the frame.",
        hint: "後續可將此欄位接入實際模型的 Prompt。"
      }
    ]
  },

  alignment: {
    title: "時間對齊",
    description: "將候選時間點合併、去重並調整對齊規則。",
    number: "04",
    fields: [
      {
        key: "mergeWindow",
        label: "時間合併窗口（秒）",
        type: "number",
        value: 2,
        min: 0,
        max: 30,
        step: 0.5,
        hint: "窗口內的相近候選時間點可合併處理。"
      },
      {
        key: "alignmentMethod",
        label: "對齊方法",
        type: "select",
        value: "nearest",
        options: [
          { value: "nearest", label: "最近時間點" },
          { value: "first", label: "保留最早時間點" },
          { value: "confidence", label: "依信心分數選擇" }
        ]
      },
      {
        key: "removeDuplicates",
        label: "移除重複候選點",
        type: "checkbox",
        value: true
      }
    ]
  },

  transcript: {
    title: "逐字稿處理",
    description: "設定逐字稿來源與文字對齊方式。",
    number: "05",
    fields: [
      {
        key: "transcriptSource",
        label: "逐字稿來源",
        type: "select",
        value: "existing",
        options: [
          { value: "existing", label: "使用現有逐字稿" },
          { value: "asr", label: "執行語音辨識" },
          { value: "none", label: "略過逐字稿" }
        ]
      },
      {
        key: "normalizeText",
        label: "文字正規化",
        type: "checkbox",
        value: true
      },
      {
        key: "timeTolerance",
        label: "時間容許差（秒）",
        type: "number",
        value: 1,
        min: 0,
        max: 30,
        step: 0.5
      }
    ]
  },

  outline: {
    title: "Outline 生成與評估",
    description: "設定輸出格式，以及如何與 Ground Truth 比較。",
    number: "06",
    fields: [
      {
        key: "outputFormat",
        label: "輸出格式",
        type: "select",
        value: "json",
        options: [
          { value: "json", label: "JSON" },
          { value: "csv", label: "CSV" },
          { value: "both", label: "JSON + CSV" }
        ]
      },
      {
        key: "evaluationTolerance",
        label: "評估時間容許差（秒）",
        type: "number",
        value: 2,
        min: 0,
        max: 60,
        step: 0.5,
        hint: "用於判定預測切換時間是否符合 Ground Truth。"
      },
      {
        key: "calculatePrecision",
        label: "計算 Precision",
        type: "checkbox",
        value: true
      },
      {
        key: "calculateRecall",
        label: "計算 Recall",
        type: "checkbox",
        value: true
      },
      {
        key: "calculateF1",
        label: "計算 F1 Score",
        type: "checkbox",
        value: true
      }
    ]
  }
};

const workflowModules = [
  { id: "input", enabled: true },
  { id: "prescan", enabled: true },
  { id: "detection", enabled: true },
  { id: "alignment", enabled: true },
  { id: "transcript", enabled: true },
  { id: "outline", enabled: true }
];

let selectedModuleId = "input";

const moduleValues = {};

Object.entries(moduleDefinitions).forEach(([moduleId, definition]) => {
  moduleValues[moduleId] = {};

  definition.fields.forEach((field) => {
    moduleValues[moduleId][field.key] = field.value;
  });
});

/* ---------- 模組參數面板 ---------- */

function renderField(field, value) {
  const id = `field-${field.key}`;
  const label = escapeHTML(field.label);
  const hint = field.hint
    ? `<div class="field-hint">${escapeHTML(field.hint)}</div>`
    : "";

  if (field.type === "checkbox") {
    return `
      <label class="checkbox-field" for="${id}">
        <input
          id="${id}"
          type="checkbox"
          data-field="${escapeHTML(field.key)}"
          ${value ? "checked" : ""}
        >
        <span>${label}</span>
      </label>
      ${hint}
    `;
  }

  if (field.type === "select") {
    const options = field.options.map((option) => `
      <option
        value="${escapeHTML(option.value)}"
        ${String(option.value) === String(value) ? "selected" : ""}
      >${escapeHTML(option.label)}</option>
    `).join("");

    return `
      <label for="${id}">${label}</label>
      <select
        class="select"
        id="${id}"
        data-field="${escapeHTML(field.key)}"
      >
        ${options}
      </select>
      ${hint}
    `;
  }

  if (field.type === "textarea") {
    return `
      <label for="${id}">${label}</label>
      <textarea
        class="textarea"
        id="${id}"
        data-field="${escapeHTML(field.key)}"
      >${escapeHTML(value)}</textarea>
      ${hint}
    `;
  }

  const inputType = field.type === "number" ? "number" : "text";
  const numberAttrs = field.type === "number"
    ? `
      min="${field.min ?? ""}"
      max="${field.max ?? ""}"
      step="${field.step ?? 1}"
    `
    : "";

  return `
    <label for="${id}">${label}</label>
    <input
      class="input"
      id="${id}"
      type="${inputType}"
      data-field="${escapeHTML(field.key)}"
      value="${escapeHTML(value)}"
      ${numberAttrs}
    >
    ${hint}
  `;
}

function renderInspector() {
  const definition = moduleDefinitions[selectedModuleId];
  const moduleState = workflowModules.find(
    (module) => module.id === selectedModuleId
  );

  if (!definition || !moduleState) return;

  $("#inspectorTitle").textContent = definition.title;
  $("#inspectorDescription").textContent = definition.description;
  $("#moduleNumber").textContent = definition.number;

  const toggle = $("#moduleEnabledToggle");
  toggle.classList.toggle("on", moduleState.enabled);
  toggle.setAttribute("aria-pressed", String(moduleState.enabled));

  $("#inspectorForm").innerHTML = `
    <div class="field-stack">
      ${definition.fields.map((field) => `
        <div class="form-field ${field.type === "checkbox" ? "checkbox-field-wrap" : ""}">
          ${renderField(field, moduleValues[selectedModuleId][field.key])}
        </div>
      `).join("")}
    </div>
  `;

  $("#inspectorForm").querySelectorAll("[data-field]").forEach((fieldElement) => {
    const key = fieldElement.dataset.field;

    const updateValue = () => {
      if (fieldElement.type === "checkbox") {
        moduleValues[selectedModuleId][key] = fieldElement.checked;
      } else if (fieldElement.type === "number") {
        moduleValues[selectedModuleId][key] =
          fieldElement.value === "" ? "" : Number(fieldElement.value);
      } else {
        moduleValues[selectedModuleId][key] = fieldElement.value;
      }
    };

    fieldElement.addEventListener("change", updateValue);
    if (fieldElement.tagName === "TEXTAREA") {
      fieldElement.addEventListener("input", updateValue);
    }
  });
}

function renderWorkflowModules() {
  $$(".workflow-module").forEach((button) => {
    const moduleId = button.dataset.module;
    const moduleState = workflowModules.find(
      (module) => module.id === moduleId
    );

    if (!moduleState) return;

    const definition = moduleDefinitions[moduleId];
    button.classList.toggle("selected", moduleId === selectedModuleId);
    button.classList.toggle("disabled", !moduleState.enabled);

    button.querySelector(".module-status").textContent =
      moduleState.enabled ? "已啟用" : "已停用";

    button.querySelector(".module-status").classList.toggle(
      "off",
      !moduleState.enabled
    );

    button.querySelector(".module-name").textContent = definition.title;
  });

  const enabledCount = workflowModules.filter(
    (module) => module.enabled
  ).length;

  $("#workflowModuleBadge").textContent =
    `${enabledCount} / ${workflowModules.length} 個模組啟用`;

  $("#overviewModuleCount").textContent = workflowModules.length;
}

$$(".workflow-module").forEach((button) => {
  button.addEventListener("click", () => {
    selectedModuleId = button.dataset.module;
    renderWorkflowModules();
    renderInspector();
  });
});

$("#moduleEnabledToggle").addEventListener("click", () => {
  const moduleState = workflowModules.find(
    (module) => module.id === selectedModuleId
  );

  if (!moduleState) return;

  moduleState.enabled = !moduleState.enabled;

  renderWorkflowModules();
  renderInspector();
});

$("#resetModuleButton").addEventListener("click", () => {
  const definition = moduleDefinitions[selectedModuleId];

  definition.fields.forEach((field) => {
    moduleValues[selectedModuleId][field.key] = field.value;
  });

  renderInspector();
  showToast(`已還原「${definition.title}」的預設值。`);
});

/* ---------- 模組預設值快照 ---------- */

function getDefaultWorkflowSnapshot() {
  const values = {};

  Object.entries(moduleDefinitions).forEach(([moduleId, definition]) => {
    values[moduleId] = {};

    definition.fields.forEach((field) => {
      values[moduleId][field.key] = field.value;
    });
  });

  return {
    values,
    enabled: workflowModules.map((module) => ({
      id: module.id,
      enabled: true
    }))
  };
}

const defaultWorkflowSnapshot = getDefaultWorkflowSnapshot();

function resetWorkflow() {
  Object.entries(defaultWorkflowSnapshot.values).forEach(([moduleId, fields]) => {
    Object.entries(fields).forEach(([key, value]) => {
      moduleValues[moduleId][key] = value;
    });
  });

  workflowModules.forEach((module) => {
    module.enabled = true;
  });

  $("#workflowName").value = "LocateAnything Baseline";
  $("#experimentVersion").value = "v1.0";
  $("#datasetSelect").value = "Dataset A";

  selectedModuleId = "input";

  renderWorkflowModules();
  renderInspector();
  renderWorkflowExperiments();
  updateOverviewDataset();

  showToast("Workflow 已還原為預設設定。");
}

$("#resetPageButton").addEventListener("click", () => {
  if (!confirm("確定要還原 Workflow 與模組參數嗎？")) return;
  resetWorkflow();
});

/* ---------- 實驗資料：示範用途 ---------- */

let experiments = [
  {
    id: 1,
    name: "Baseline v1.0",
    dataset: "Dataset A",
    version: "v1.0",
    precision: 0.82,
    recall: 0.76,
    f1: 0.79,
    duration: 128,
    status: "完成",
    createdAt: "2026/10/28 10:20:00",
    selected: true
  },
  {
    id: 2,
    name: "Title + Page Detection",
    dataset: "Dataset A",
    version: "v1.1",
    precision: 0.86,
    recall: 0.81,
    f1: 0.83,
    duration: 146,
    status: "完成",
    createdAt: "2026/10/28 11:05:00",
    selected: true
  },
  {
    id: 3,
    name: "Alignment Test",
    dataset: "Dataset B",
    version: "v1.2",
    precision: 0.79,
    recall: 0.85,
    f1: 0.82,
    duration: 173,
    status: "完成",
    createdAt: "2026/10/28 14:30:00",
    selected: true
  }
];

let nextExperimentId = 4;

function experimentRow(experiment, includeDuration = false) {
  return `
    <tr>
      <td class="table-name">${escapeHTML(experiment.name)}</td>
      <td>${escapeHTML(experiment.dataset)}</td>
      <td class="metric-value">${formatMetric(experiment.precision)}</td>
      <td class="metric-value">${formatMetric(experiment.recall)}</td>
      <td class="metric-value">${formatMetric(experiment.f1)}</td>
      ${includeDuration
        ? `<td>${experiment.duration} 秒</td>`
        : ""}
      <td>${statusBadge(experiment.status)}</td>
    </tr>
  `;
}

function renderOverview() {
  $("#overviewExperimentCount").textContent = experiments.length;
  updateOverviewDataset();

  $("#overviewExperimentTable").innerHTML = experiments
    .slice()
    .reverse()
    .slice(0, 5)
    .map((experiment) => experimentRow(experiment))
    .join("");
}

function updateOverviewDataset() {
  $("#overviewDatasetName").textContent = $("#datasetSelect").value;
}

function renderWorkflowExperiments() {
  $("#workflowExperimentTable").innerHTML = experiments
    .slice()
    .reverse()
    .slice(0, 5)
    .map((experiment) => experimentRow(experiment))
    .join("");
}

$("#datasetSelect").addEventListener("change", updateOverviewDataset);

/* ---------- 儲存 Workflow ---------- */

$("#saveWorkflowButton").addEventListener("click", () => {
  const name = $("#workflowName").value.trim();

  if (!name) {
    showToast("請先輸入 Workflow 名稱。");
    $("#workflowName").focus();
    return;
  }

  showToast("設定已暫存於目前頁面；重新整理後不會保留。");
});

/* ---------- 執行實驗：前端模擬 ---------- */

$("#runExperimentButton").addEventListener("click", () => {
  const name = $("#workflowName").value.trim();
  const version = $("#experimentVersion").value.trim();
  const dataset = $("#datasetSelect").value;

  if (!name) {
    showToast("請先輸入 Workflow 名稱。");
    $("#workflowName").focus();
    return;
  }

  if (!version) {
    showToast("請輸入實驗版本，例如 v1.1。");
    $("#experimentVersion").focus();
    return;
  }

  const enabledModules = workflowModules.filter(
    (module) => module.enabled
  );

  if (enabledModules.length === 0) {
    showToast("至少需要啟用一個 Workflow 模組。");
    return;
  }

  const button = $("#runExperimentButton");
  button.disabled = true;
  button.textContent = "執行中…";

  showToast("已建立前端模擬實驗。此操作尚未執行實際模型。");

  setTimeout(() => {
    const lastExperiment = experiments[experiments.length - 1];

    // 產生小幅度差異，僅用於 UI 預覽，不代表實際模型結果。
    const precision = Math.min(
      0.99,
      Math.max(0.1, lastExperiment.precision + (Math.random() * 0.08 - 0.04))
    );

    const recall = Math.min(
      0.99,
      Math.max(0.1, lastExperiment.recall + (Math.random() * 0.08 - 0.04))
    );

    const f1 = (2 * precision * recall) / (precision + recall);

    const experiment = {
      id: nextExperimentId++,
      name: `${name} ${version}`,
      dataset,
      version,
      precision,
      recall,
      f1,
      duration: Math.floor(90 + Math.random() * 110),
      status: "完成",
      createdAt: getCurrentDateTime(),
      selected: true
    };

    experiments.push(experiment);
    renderWorkflowExperiments();
    renderOverview();
    renderComparison();
    renderHistory();

    button.disabled = false;
    button.textContent = "▶ 執行實驗";

    showToast(
      "前端模擬完成。評估數字為隨機示意值，不能視為實際實驗結果。"
    );
  }, 700);
});

/* ---------- Dataset 與 Ground Truth ---------- */

const videoData = {
  "Dataset A": [
    {
      id: "a1",
      title: "第一部教學影片",
      duration: "00:25:30",
      timestamps: ["00:01:20", "00:04:35", "00:08:10"]
    },
    {
      id: "a2",
      title: "第二部教學影片",
      duration: "00:32:10",
      timestamps: ["00:02:15", "00:07:45"]
    },
    {
      id: "a3",
      title: "第三部教學影片",
      duration: "00:18:45",
      timestamps: []
    },
    {
      id: "a4",
      title: "第四部教學影片",
      duration: "00:41:20",
      timestamps: ["00:03:20", "00:12:30", "00:19:10"]
    },
    {
      id: "a5",
      title: "第五部教學影片",
      duration: "00:29:05",
      timestamps: ["00:05:40"]
    }
  ],

  "Dataset B": [
    {
      id: "b1",
      title: "投影片含頁碼範例",
      duration: "00:35:10",
      timestamps: ["00:01:15", "00:03:30", "00:09:20"]
    },
    {
      id: "b2",
      title: "投影片無頁碼範例",
      duration: "00:27:40",
      timestamps: ["00:02:50", "00:08:25"]
    },
    {
      id: "b3",
      title: "混合版面範例",
      duration: "00:44:05",
      timestamps: ["00:04:10", "00:15:40"]
    }
  ],

  "Dataset C": [
    {
      id: "c1",
      title: "不同版型測試影片",
      duration: "00:22:35",
      timestamps: ["00:03:05", "00:11:20"]
    },
    {
      id: "c2",
      title: "長時間教學影片",
      duration: "01:05:10",
      timestamps: ["00:02:15", "00:13:40", "00:28:20"]
    }
  ]
};

let selectedVideoId = "a1";
let annotationDirty = false;

function getCurrentVideoList() {
  return videoData[$("#annotationDatasetSelect").value] || [];
}

function getSelectedVideo() {
  return getCurrentVideoList().find(
    (video) => video.id === selectedVideoId
  ) || getCurrentVideoList()[0] || null;
}

function markAnnotationDirty() {
  annotationDirty = true;
  $("#annotationStatus").textContent = "尚未儲存";
  $("#annotationStatus").className = "badge badge-warning";
}

function renderVideoList() {
  const videos = getCurrentVideoList();

  $("#videoCount").textContent = `共 ${videos.length} 部影片`;

  $("#videoList").innerHTML = videos.length
    ? videos.map((video) => `
      <button
        type="button"
        class="video-item ${video.id === selectedVideoId ? "active" : ""}"
        data-video-id="${escapeHTML(video.id)}"
      >
        <div class="video-item-title">${escapeHTML(video.title)}</div>
        <div class="video-item-meta">
          時長 ${escapeHTML(video.duration)}
          · ${video.timestamps.length} 個時間點
        </div>
      </button>
    `).join("")
    : `<div class="timestamp-empty">沒有符合條件的影片。</div>`;

  $$(".video-item").forEach((button) => {
    button.addEventListener("click", () => {
      selectedVideoId = button.dataset.videoId;
      annotationDirty = false;
      renderVideoList();
      renderSelectedVideo();
    });
  });
}

function renderSelectedVideo() {
  const video = getSelectedVideo();

  if (!video) {
    $("#selectedVideoTitle").textContent = "沒有可用影片";
    $("#selectedVideoMeta").textContent = "請先在此 Dataset 新增 YouTube 影片。";
    $("#annotationStatus").textContent = "尚未儲存";
    $("#annotationStatus").className = "badge badge-warning";
    $("#page-dataset .video-preview").innerHTML = `
      <div class="preview-icon">▶</div>
      <h4>尚未新增影片</h4>
      <p>請在上方貼上 YouTube 影片網址並新增至目前 Dataset。</p>
    `;
    $("#timestampList").innerHTML = "";
    $("#timestampSummary").textContent = "共 0 個 Ground Truth 時間點";
    return;
  }

  $("#selectedVideoTitle").textContent = video.title;
  $("#selectedVideoMeta").textContent =
    `${$("#annotationDatasetSelect").value} · 影片長度 ${video.duration}`;
  if (video.youtubeId) {
    $("#page-dataset .video-preview").innerHTML = `
      <div class="preview-icon">▶</div>
      <h4>YouTube 影片已加入 Dataset</h4>
      <p>
        <a href="${escapeHTML(video.url)}" target="_blank" rel="noopener noreferrer">
          在 YouTube 開啟影片
        </a>
      </p>
    `;
  } else {
    $("#page-dataset .video-preview").innerHTML = `
      <div class="preview-icon">▶</div>
      <h4>影片預覽區</h4>
      <p>
        此處預留影片播放器。後續可接入影片 URL 或實體影片路徑。
      </p>
    `;
  }

  $("#annotationStatus").textContent = annotationDirty
    ? "尚未儲存"
    : "已儲存";

  $("#annotationStatus").className = annotationDirty
    ? "badge badge-warning"
    : "badge badge-success";

  renderTimestampRows(video);
}

function renderTimestampRows(video) {
  const timestamps = video.timestamps;

  if (!timestamps.length) {
    $("#timestampList").innerHTML = `
      <div class="timestamp-empty">
        目前沒有時間點，請點選「新增時間點」。
      </div>
    `;
  } else {
    $("#timestampList").innerHTML = timestamps.map((timestamp, index) => `
      <div class="timestamp-row" data-timestamp-index="${index}">
        <span class="timestamp-number">
          時間點 ${String(index + 1).padStart(2, "0")}
        </span>
        <input
          class="input timestamp-input"
          type="text"
          inputmode="numeric"
          aria-label="時間點 ${index + 1}"
          placeholder="HH:MM:SS"
          value="${escapeHTML(timestamp)}"
          data-index="${index}"
        >
        <button
          class="btn btn-small btn-danger remove-timestamp"
          type="button"
          data-index="${index}"
        >刪除</button>
      </div>
    `).join("");
  }

  $("#timestampSummary").textContent =
    `共 ${timestamps.length} 個 Ground Truth 時間點`;

  $$(".timestamp-input").forEach((input) => {
    input.addEventListener("change", () => {
      const index = Number(input.dataset.index);
      const value = input.value.trim();

      if (!isValidTimestamp(value)) {
        showToast("時間格式需為 HH:MM:SS，例如 00:03:25。");
        input.focus();
        return;
      }

      video.timestamps[index] = value;
      sortTimestamps(video.timestamps);
      markAnnotationDirty();
      renderTimestampRows(video);
    });
  });

  $$(".remove-timestamp").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);

      video.timestamps.splice(index, 1);
      markAnnotationDirty();
      renderTimestampRows(video);
      renderVideoList();
    });
  });
}

function isValidTimestamp(value) {
  const match = value.match(/^(\d{2,}):([0-5]\d):([0-5]\d)$/);
  if (!match) return false;

  return true;
}

function timestampToSeconds(timestamp) {
  const [hours, minutes, seconds] = timestamp.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function sortTimestamps(timestamps) {
  timestamps.sort((a, b) => timestampToSeconds(a) - timestampToSeconds(b));
}

function getYouTubeVideoId(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const allowedHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be"
  ]);
  if (!["http:", "https:"].includes(url.protocol) ||
      !allowedHosts.has(url.hostname.toLowerCase())) {
    return null;
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const videoId = url.hostname.toLowerCase().endsWith("youtu.be")
    ? pathParts[0]
    : url.pathname === "/watch"
      ? url.searchParams.get("v")
      : ["embed", "shorts", "live"].includes(pathParts[0])
        ? pathParts[1]
        : null;

  return typeof videoId === "string" && /^[\w-]{11}$/.test(videoId)
    ? videoId
    : null;
}

function renderDatasetOptions(selectedDataset) {
  const select = $("#annotationDatasetSelect");
  select.innerHTML = Object.keys(videoData).map((datasetName) => `
    <option value="${escapeHTML(datasetName)}"
      ${datasetName === selectedDataset ? "selected" : ""}>
      ${escapeHTML(datasetName)}
    </option>
  `).join("");
}

$("#createDatasetButton").addEventListener("click", () => {
  const datasetName = window.prompt("請輸入新的 Dataset 名稱：")?.trim();
  if (datasetName === undefined) return;
  if (!datasetName || datasetName.length > 60) {
    showToast("請輸入 1 至 60 個字元的 Dataset 名稱。");
    return;
  }

  if (Object.keys(videoData).some(
    (name) => name.toLowerCase() === datasetName.toLowerCase()
  )) {
    showToast("這個 Dataset 名稱已存在，請改用其他名稱。");
    return;
  }

  if (["__proto__", "constructor", "prototype"].includes(datasetName.toLowerCase())) {
    showToast("這個名稱無法使用，請改用其他 Dataset 名稱。");
    return;
  }

  videoData[datasetName] = [];
  renderDatasetOptions(datasetName);
  selectedVideoId = null;
  annotationDirty = false;
  renderVideoList();
  renderSelectedVideo();
  showToast(`已建立 Dataset「${datasetName}」。`);
});

$("#addVideoButton").addEventListener("click", () => {
  const youtubeUrl = $("#newVideoUrl").value.trim();
  if (!youtubeUrl) {
    showToast("請先輸入 YouTube 影片網址。");
    return;
  }
  const youtubeId = getYouTubeVideoId(youtubeUrl);
  if (!youtubeId) {
    showToast("請輸入有效的 YouTube 影片網址（youtube.com 或 youtu.be）。");
    return;
  }

  const currentVideos = getCurrentVideoList();
  if (currentVideos.some((video) => video.youtubeId === youtubeId)) {
    showToast("這部影片已存在於目前的 Dataset。");
    return;
  }

  const video = {
    id: `youtube-${youtubeId}`,
    title: `YouTube 影片 ${youtubeId}`,
    youtubeId,
    url: `https://www.youtube.com/watch?v=${youtubeId}`,
    duration: "未知",
    timestamps: []
  };
  currentVideos.push(video);
  selectedVideoId = video.id;
  annotationDirty = false;
  $("#newVideoUrl").value = "";
  renderVideoList();
  renderSelectedVideo();
  showToast("已將 YouTube 影片新增至目前的 Dataset。");
});

$("#annotationDatasetSelect").addEventListener("change", () => {
  selectedVideoId = getCurrentVideoList()[0]?.id || null;
  annotationDirty = false;
  renderVideoList();
  renderSelectedVideo();
});

$("#addTimestampButton").addEventListener("click", () => {
  const video = getSelectedVideo();
  if (!video) {
    showToast("請先選擇影片。");
    return;
  }

  video.timestamps.push("00:00:00");
  markAnnotationDirty();
  renderTimestampRows(video);
  renderVideoList();

  const inputs = $$(".timestamp-input");
  const lastInput = inputs[inputs.length - 1];

  if (lastInput) {
    lastInput.focus();
    lastInput.select();
  }
});

$("#saveAnnotationButton").addEventListener("click", () => {
  const video = getSelectedVideo();
  if (!video) return;

  for (const timestamp of video.timestamps) {
    if (!isValidTimestamp(timestamp)) {
      showToast("有無效的時間格式，請先修正。");
      return;
    }
  }

  sortTimestamps(video.timestamps);
  annotationDirty = false;

  renderSelectedVideo();
  renderVideoList();

  showToast(
    "標註已更新於目前頁面記憶體；重新整理後不會保留。"
  );
});

/* ---------- 比較圖表 ---------- */

const selectedExperimentIds = new Set(
  experiments.filter((experiment) => experiment.selected)
    .map((experiment) => experiment.id)
);

const metricInfo = {
  precision: { label: "Precision", key: "precision" },
  recall: { label: "Recall", key: "recall" },
  f1: { label: "F1 Score", key: "f1" }
};

function getFilteredExperiments() {
  const dataset = $("#compareDatasetSelect").value;

  return experiments.filter((experiment) => {
    return dataset === "all" || experiment.dataset === dataset;
  });
}

function renderComparison() {
  const filtered = getFilteredExperiments();
  const metricKey = $("#compareMetricSelect").value;
  const metric = metricInfo[metricKey] || metricInfo.f1;

  $("#comparisonMetricLabel").textContent = metric.label;

  $("#comparisonTable").innerHTML = filtered.map((experiment) => {
    const checked = selectedExperimentIds.has(experiment.id);

    return `
      <tr>
        <td>
          <input
            class="table-checkbox comparison-checkbox"
            type="checkbox"
            aria-label="比較 ${escapeHTML(experiment.name)}"
            data-experiment-id="${experiment.id}"
            ${checked ? "checked" : ""}
          >
        </td>
        <td class="table-name">${escapeHTML(experiment.name)}</td>
        <td>${escapeHTML(experiment.dataset)}</td>
        <td class="metric-value">${formatMetric(experiment.precision)}</td>
        <td class="metric-value">${formatMetric(experiment.recall)}</td>
        <td class="metric-value">${formatMetric(experiment.f1)}</td>
        <td>${experiment.duration} 秒</td>
        <td>${statusBadge(experiment.status)}</td>
      </tr>
    `;
  }).join("");

  $$(".comparison-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = Number(checkbox.dataset.experimentId);

      if (checkbox.checked) {
        selectedExperimentIds.add(id);
      } else {
        selectedExperimentIds.delete(id);
      }

      renderComparisonChart();
    });
  });

  renderComparisonChart();
}

function renderComparisonChart() {
  const metricKey = $("#compareMetricSelect").value;
  const metric = metricInfo[metricKey] || metricInfo.f1;

  const visibleExperiments = getFilteredExperiments().filter(
    (experiment) => selectedExperimentIds.has(experiment.id)
  );

  if (!visibleExperiments.length) {
    $("#comparisonChart").innerHTML = `
      <div class="chart-empty">
        尚未選取實驗版本，請勾選下方表格中的項目。
      </div>
    `;
    return;
  }

  $("#comparisonChart").innerHTML = visibleExperiments.map((experiment) => {
    const value = experiment[metric.key];
    const width = Math.max(0, Math.min(100, value * 100));

    return `
      <div class="chart-row">
        <div class="chart-label" title="${escapeHTML(experiment.name)}">
          ${escapeHTML(experiment.name)}
        </div>
        <div class="chart-track">
          <div class="chart-bar" style="width: ${width}%"></div>
        </div>
        <div class="chart-value">${formatMetric(value)}</div>
      </div>
    `;
  }).join("");
}

$("#compareDatasetSelect").addEventListener("change", renderComparison);
$("#compareMetricSelect").addEventListener("change", renderComparison);

$("#selectAllExperimentsButton").addEventListener("click", () => {
  const filtered = getFilteredExperiments();
  const allSelected = filtered.every((experiment) =>
    selectedExperimentIds.has(experiment.id)
  );

  filtered.forEach((experiment) => {
    if (allSelected) {
      selectedExperimentIds.delete(experiment.id);
    } else {
      selectedExperimentIds.add(experiment.id);
    }
  });

  renderComparison();
});

/* ---------- 執行紀錄 ---------- */

function renderHistory() {
  const sorted = experiments.slice().reverse();

  $("#historyCount").textContent = experiments.length;

  $("#historySuccessCount").textContent = experiments.filter(
    (experiment) => experiment.status === "完成"
  ).length;

  $("#historyLastRun").textContent =
    sorted[0]?.createdAt || "尚無執行紀錄";

  $("#historyTable").innerHTML = sorted.map((experiment) => `
    <tr>
      <td>${escapeHTML(experiment.createdAt)}</td>
      <td class="table-name">${escapeHTML(experiment.name)}</td>
      <td>${escapeHTML(experiment.dataset)}</td>
      <td>${escapeHTML(experiment.version)}</td>
      <td>${experiment.duration} 秒</td>
      <td>${statusBadge(experiment.status)}</td>
    </tr>
  `).join("");
}

/* ---------- 初始化 ---------- */

function initializeApp() {
  initializeAuthUI();
  renderWorkflowModules();
  renderInspector();

  renderOverview();
  renderWorkflowExperiments();

  renderVideoList();
  renderSelectedVideo();

  renderComparison();
  renderHistory();

  // 小螢幕預設收合，桌面版預設展開。
  if (window.innerWidth <= 620) {
    setSidebarCollapsed(true);
  } else {
    setSidebarCollapsed(false);
  }
}

initializeApp();
