"use strict";

/* ---------- Dataset 與 Ground Truth ---------- */

const videoData = Object.create(null);

let selectedVideoId = null;
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
    : `<div class="timestamp-empty">目前沒有影片，請新增 YouTube 影片。</div>`;

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
  const datasetNames = Object.keys(videoData);
  const datasetOptions = datasetNames.map((datasetName) => `
    <option value="${escapeHTML(datasetName)}"
      ${datasetName === selectedDataset ? "selected" : ""}>
      ${escapeHTML(datasetName)}
    </option>
  `).join("");
  const currentWorkflowDataset = selectedDataset ?? $("#datasetSelect").value;
  const currentAnnotationDataset =
    selectedDataset ?? $("#annotationDatasetSelect").value;
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
  renderComparison();
  showToast(`已建立 Dataset「${datasetName}」。`);
});

$("#addVideoButton").addEventListener("click", () => {
  const datasetName = $("#annotationDatasetSelect").value;
  if (!datasetName || !Object.hasOwn(videoData, datasetName)) {
    showToast("請先建立並選擇 Dataset。");
    $("#annotationDatasetSelect").focus();
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

