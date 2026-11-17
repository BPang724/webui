"use strict";

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

  if (["overview", "workflow", "dataset", "compare"].includes(pageName)) {
    loadDatasetsForPage(pageName).catch((error) => {
      handleDatasetApiError("載入 Dataset 資料失敗", error);
    });
  }

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
