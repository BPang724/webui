"use strict";

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

  $("#comparisonTable").innerHTML = filtered.length
    ? filtered.map((experiment) => {
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
    }).join("")
    : `<tr><td colspan="8" class="chart-empty">尚無實驗結果。</td></tr>`;

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
        尚無可比較的實驗結果。
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

