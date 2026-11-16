"use strict";

/* ---------- 實驗資料 ---------- */

let experiments = [];

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

  $("#overviewExperimentTable").innerHTML = experiments.length
    ? experiments
        .slice()
        .reverse()
        .slice(0, 5)
        .map((experiment) => experimentRow(experiment))
        .join("")
    : `<tr><td colspan="6" class="chart-empty">尚無實驗結果。</td></tr>`;
}

function updateOverviewDataset() {
  $("#overviewDatasetName").textContent =
    $("#datasetSelect").value || "尚未選取";
}

function renderWorkflowExperiments() {
  $("#workflowExperimentTable").innerHTML = experiments.length
    ? experiments
        .slice()
        .reverse()
        .slice(0, 5)
        .map((experiment) => experimentRow(experiment))
        .join("")
    : `<tr><td colspan="6" class="chart-empty">尚無實驗結果。</td></tr>`;
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

/* ---------- 執行實驗 ---------- */

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

  if (!dataset) {
    showToast("請先建立並選擇 Dataset。");
    $("#datasetSelect").focus();
    return;
  }

  const enabledModules = workflowModules.filter(
    (module) => module.enabled
  );

  if (enabledModules.length === 0) {
    showToast("至少需要啟用一個 Workflow 模組。");
    return;
  }

  showToast("目前尚未連接實驗執行服務，尚未建立實驗結果。");
});

