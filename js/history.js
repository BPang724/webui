"use strict";

/* ---------- 執行紀錄 ---------- */

function renderHistory() {
  const sorted = experiments.slice().reverse();

  $("#historyCount").textContent = experiments.length;

  $("#historySuccessCount").textContent = experiments.filter(
    (experiment) => experiment.status === "完成"
  ).length;

  $("#historyLastRun").textContent =
    sorted[0]?.createdAt || "尚無執行紀錄";

  $("#historyTable").innerHTML = sorted.length
    ? sorted.map((experiment) => `
      <tr>
        <td>${escapeHTML(experiment.createdAt)}</td>
        <td class="table-name">${escapeHTML(experiment.name)}</td>
        <td>${escapeHTML(experiment.dataset)}</td>
        <td>${escapeHTML(experiment.version)}</td>
        <td>${experiment.duration} 秒</td>
        <td>${statusBadge(experiment.status)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" class="chart-empty">尚無執行紀錄。</td></tr>`;
}

