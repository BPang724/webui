
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

function statusBadge(status) {
  const isSuccess = status === "完成";
  const cls = isSuccess ? "badge badge-success" : "badge badge-warning";

  return `<span class="${cls}">${escapeHTML(status)}</span>`;
}

