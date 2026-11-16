"use strict";

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

  $("#workflowName").value = "";
  $("#experimentVersion").value = "";
  $("#datasetSelect").value = "";

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

