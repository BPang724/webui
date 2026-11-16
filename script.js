"use strict";

/* ---------- 初始化 ---------- */

function initializeApp() {
  initializeAuthUI();
  renderDatasetOptions();
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
