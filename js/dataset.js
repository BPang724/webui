"use strict";

/* ---------- Dataset 與 Ground Truth ---------- */

const videoData = Object.create(null);
const datasetRecords = new Map();

let selectedVideoId = null;
let annotationDirty = false;
let datasetLoadVersion = 0;
let datasetVideosLoadVersion = 0;

function datasetApiUrl(path) {
  return new URL(`api/${path}`, window.location.href);
}

async function datasetApiRequest(path, options = {}) {
  const response = await fetch(datasetApiUrl(path), {
    credentials: "same-origin",
    cache: "no-store",
    ...options
  });

  if (!response.ok) {
    let message = `API 請求失敗（HTTP ${response.status}）。`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((item) => item.msg).join("、");
      }
    } catch (error) {
      console.error("無法讀取 API 錯誤回應", error);
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function formatSeconds(value) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function videoFromApi(video) {
  return {
    id: video.id,
    title: video.title || `YouTube 影片 ${video.youtube_id}`,
    youtubeId: video.youtube_id,
    url: video.url,
    duration: Number.isInteger(video.duration_seconds)
      ? formatSeconds(video.duration_seconds)
      : "未知",
    durationSeconds: video.duration_seconds,
    timestamps: video.ground_truth_timestamps.map(formatSeconds)
  };
}

async function loadDatasetList() {
  const requestVersion = ++datasetLoadVersion;
  const datasets = await datasetApiRequest("datasets");
  if (requestVersion !== datasetLoadVersion) return;

  for (const name of Object.keys(videoData)) delete videoData[name];
  datasetRecords.clear();
  datasets.forEach((dataset) => {
    datasetRecords.set(dataset.name, dataset);
    videoData[dataset.name] = [];
  });

  renderDatasetOptions();
  renderVideoList();
  renderSelectedVideo();
  renderComparison();

  const selectedDataset = datasetRecords.get($("#annotationDatasetSelect").value);
  if (selectedDataset) {
    await loadDatasetVideos(selectedDataset);
  }
}

async function loadDatasetVideos(dataset) {
  const requestVersion = ++datasetVideosLoadVersion;
  const response = await datasetApiRequest(`datasets/${dataset.id}`);
  if (
    requestVersion !== datasetVideosLoadVersion ||
    $("#annotationDatasetSelect").value !== dataset.name
  ) {
    return;
  }

  videoData[dataset.name] = response.videos.map(videoFromApi);
  if (!getCurrentVideoList().some((video) => video.id === selectedVideoId)) {
    selectedVideoId = getCurrentVideoList()[0]?.id || null;
  }
  annotationDirty = false;
  renderVideoList();
  renderSelectedVideo();
}

function handleDatasetApiError(action, error) {
  console.error(action, error);
  showToast(error instanceof Error ? error.message : "操作失敗，請稍後再試。");
}

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
    : `<div class="timestamp-empty">目前沒有影片，請新增 YouTube 影片。</div>`;

  $$(".video-item").forEach((button) => {
    button.addEventListener("click", () => {
      selectedVideoId = Number(button.dataset.videoId);
      annotationDirty = false;
      renderVideoList();
      renderSelectedVideo();
    });
  });
}

function renderSelectedVideo() {
  const video = getSelectedVideo();

  if (!video) {
    const hasDataset = Boolean($("#annotationDatasetSelect").value);
    $("#selectedVideoTitle").textContent = "尚未選取影片";
    $("#selectedVideoMeta").textContent = hasDataset
      ? "請在此 Dataset 新增 YouTube 影片。"
      : "請先建立並選擇 Dataset。";
    $("#annotationStatus").textContent = "尚未儲存";
    $("#annotationStatus").className = "badge badge-warning";
    $("#page-dataset .video-preview").innerHTML = `
      <div class="preview-icon">▶</div>
      <h4>${hasDataset ? "尚未新增影片" : "尚未選擇 Dataset"}</h4>
      <p>${hasDataset
        ? "請在上方貼上 YouTube 影片網址並新增至目前 Dataset。"
        : "請先建立 Dataset，再選擇清單並新增 YouTube 影片。"}
      </p>
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

      if (video.timestamps.some((timestamp, timestampIndex) =>
        timestampIndex !== index &&
        timestampToSeconds(timestamp) === timestampToSeconds(value)
      )) {
        showToast("同一支影片不能有重複的切換時間點。");
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
  const datasetNames = Array.from(datasetRecords.keys());
  const datasetOptions = datasetNames.map((datasetName) => `
    <option value="${escapeHTML(datasetName)}"
      ${datasetName === selectedDataset ? "selected" : ""}>
      ${escapeHTML(datasetName)}
    </option>
  `).join("");
  const fallbackDataset = datasetNames[0] || "";
  const currentWorkflowDataset =
    selectedDataset ?? ($("#datasetSelect").value || fallbackDataset);
  const currentAnnotationDataset =
    selectedDataset ?? ($("#annotationDatasetSelect").value || fallbackDataset);
  const currentCompareDataset = $("#compareDatasetSelect").value || "all";

  $("#datasetSelect").innerHTML = datasetOptions ||
    `<option value="">尚未建立 Dataset</option>`;
  $("#annotationDatasetSelect").innerHTML = datasetOptions ||
    `<option value="">尚未建立 Dataset</option>`;
  $("#compareDatasetSelect").innerHTML = `
    <option value="all">全部 Dataset</option>
    ${datasetOptions}
  `;

  $("#datasetSelect").value = datasetNames.includes(currentWorkflowDataset)
    ? currentWorkflowDataset
    : "";
  $("#annotationDatasetSelect").value =
    datasetNames.includes(currentAnnotationDataset)
      ? currentAnnotationDataset
      : "";
  $("#compareDatasetSelect").value =
    currentCompareDataset === "all" ||
    datasetNames.includes(currentCompareDataset)
      ? currentCompareDataset
      : "all";
  updateOverviewDataset();
}

$("#createDatasetButton").addEventListener("click", async () => {
  const datasetName = window.prompt("請輸入新的 Dataset 名稱：")?.trim();
  if (datasetName === undefined) return;
  if (!datasetName || datasetName.length > 60) {
    showToast("請輸入 1 至 60 個字元的 Dataset 名稱。");
    return;
  }

  if (datasetNamesContain(datasetName)) {
    showToast("這個 Dataset 名稱已存在，請改用其他名稱。");
    return;
  }

  if (["__proto__", "constructor", "prototype"].includes(datasetName.toLowerCase())) {
    showToast("這個名稱無法使用，請改用其他 Dataset 名稱。");
    return;
  }

  const button = $("#createDatasetButton");
  button.disabled = true;
  try {
    const dataset = await datasetApiRequest("datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: datasetName })
    });
    datasetRecords.set(dataset.name, dataset);
    videoData[dataset.name] = [];
    renderDatasetOptions(dataset.name);
    selectedVideoId = null;
    annotationDirty = false;
    renderVideoList();
    renderSelectedVideo();
    renderComparison();
    showToast(`已建立 Dataset「${dataset.name}」。`);
  } catch (error) {
    handleDatasetApiError("建立 Dataset 失敗", error);
  } finally {
    button.disabled = false;
  }
});

function datasetNamesContain(datasetName) {
  return Array.from(datasetRecords.keys()).some(
    (name) => name.toLowerCase() === datasetName.toLowerCase()
  );
}

$("#addVideoButton").addEventListener("click", async () => {
  const datasetName = $("#annotationDatasetSelect").value;
  if (!datasetName || !Object.hasOwn(videoData, datasetName)) {
    showToast("請先建立並選擇 Dataset。");
    $("#annotationDatasetSelect").focus();
    return;
  }
  const dataset = datasetRecords.get(datasetName);
  if (!dataset) {
    showToast("無法找到目前 Dataset，請重新載入清單。");
    return;
  }

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

  const button = $("#addVideoButton");
  button.disabled = true;
  try {
    const result = await datasetApiRequest(
      `datasets/${dataset.id}/videos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl })
      }
    );
    const video = videoFromApi(result);
    videoData[datasetName].push(video);
    $("#newVideoUrl").value = "";
    if ($("#annotationDatasetSelect").value === datasetName) {
      selectedVideoId = video.id;
      annotationDirty = false;
      renderVideoList();
      renderSelectedVideo();
    }
    renderComparison();
    showToast("已將 YouTube 影片新增至目前的 Dataset。");
  } catch (error) {
    handleDatasetApiError("新增影片失敗", error);
  } finally {
    button.disabled = false;
  }
});

$("#annotationDatasetSelect").addEventListener("change", async () => {
  const dataset = datasetRecords.get($("#annotationDatasetSelect").value);
  selectedVideoId = null;
  annotationDirty = false;
  renderVideoList();
  renderSelectedVideo();
  if (!dataset) return;

  try {
    await loadDatasetVideos(dataset);
  } catch (error) {
    handleDatasetApiError("讀取 Dataset 影片失敗", error);
  }
});

$("#addTimestampButton").addEventListener("click", () => {
  const video = getSelectedVideo();
  if (!video) {
    showToast("請先選擇影片。");
    return;
  }

  video.timestamps.push("");
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

$("#saveAnnotationButton").addEventListener("click", async () => {
  const video = getSelectedVideo();
  if (!video) return;

  for (const timestamp of video.timestamps) {
    if (!isValidTimestamp(timestamp)) {
      showToast("有無效的時間格式，請先修正。");
      return;
    }
  }

  const timestamps = video.timestamps.map(timestampToSeconds);
  if (timestamps.some((timestamp) => timestamp > 2_147_483_647)) {
    showToast("時間點超出可儲存範圍。");
    return;
  }

  const button = $("#saveAnnotationButton");
  button.disabled = true;
  try {
    const result = await datasetApiRequest(
      `videos/${video.id}/timestamps`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamps })
      }
    );
    video.timestamps = result.timestamps.map(formatSeconds);
    annotationDirty = false;
    renderSelectedVideo();
    renderVideoList();
    showToast("Ground Truth 已儲存。");
  } catch (error) {
    handleDatasetApiError("儲存 Ground Truth 失敗", error);
  } finally {
    button.disabled = false;
  }
});
