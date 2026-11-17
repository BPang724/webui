"use strict";

/* ---------- Dataset 與 Ground Truth ---------- */

const videoData = Object.create(null);
const datasetRecords = new Map();

let selectedVideoId = null;
let annotationDirty = false;
let datasetLoadVersion = 0;
let datasetVideosLoadVersion = 0;
let addingVideo = false;
let datasetListLoaded = false;
let datasetListPromise = null;
let youtubeApiPromise = null;
let youtubePlayer = null;
let youtubePlayerVideoId = null;
let youtubePlayerReady = false;
let youtubePlayerGeneration = 0;
let renderedPreviewVideoId = null;
const persistedTimestamps = new Map();
const timestampSavesInProgress = new Set();

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
  const result = {
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
  persistedTimestamps.set(result.id, [...result.timestamps]);
  return result;
}

async function loadDatasetList() {
  const requestVersion = ++datasetLoadVersion;
  const datasets = await datasetApiRequest("datasets");
  if (requestVersion !== datasetLoadVersion) return;

  datasetVideosLoadVersion += 1;
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
  datasetListLoaded = true;
}

async function ensureDatasetListLoaded() {
  if (datasetListLoaded) return;
  if (!datasetListPromise) {
    datasetListPromise = loadDatasetList().finally(() => {
      datasetListPromise = null;
    });
  }
  await datasetListPromise;
}

async function loadDatasetsForPage(pageName) {
  await ensureDatasetListLoaded();
  if (pageName !== "dataset") return;

  const dataset = datasetRecords.get($("#annotationDatasetSelect").value);
  if (dataset) {
    await loadDatasetVideos(dataset);
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

function renderAnnotationStatus(video) {
  const isSaving = timestampSavesInProgress.has(video.id);
  $("#annotationStatus").textContent = isSaving
    ? "儲存中..."
    : annotationDirty
      ? "尚未儲存"
      : "已儲存";
  $("#annotationStatus").className = isSaving || annotationDirty
    ? "badge badge-warning"
    : "badge badge-success";
}

function restorePersistedTimestamps(video) {
  video.timestamps = [...(persistedTimestamps.get(video.id) || [])];
  if (selectedVideoId === video.id) {
    annotationDirty = false;
    renderSelectedVideo();
  }
  renderVideoList();
}

async function saveVideoTimestamps(video, timestamps) {
  if (timestampSavesInProgress.has(video.id)) return false;
  if (timestamps.some((timestamp) => !Number.isInteger(timestamp) || timestamp < 0)) {
    showToast("時間點格式錯誤，無法儲存。");
    restorePersistedTimestamps(video);
    return false;
  }
  if (new Set(timestamps).size !== timestamps.length) {
    showToast("同一支影片不能有重複的切換時間點。");
    restorePersistedTimestamps(video);
    return false;
  }
  if (timestamps.some((timestamp) => timestamp > 2_147_483_647)) {
    showToast("時間點超出可儲存範圍。");
    restorePersistedTimestamps(video);
    return false;
  }

  timestampSavesInProgress.add(video.id);
  if (selectedVideoId === video.id) {
    renderAnnotationStatus(video);
    $("#recordTimestampButton").disabled = true;
    $$(".timestamp-part").forEach((input) => { input.disabled = true; });
    $$(".remove-timestamp").forEach((button) => { button.disabled = true; });
  }

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
    persistedTimestamps.set(video.id, [...video.timestamps]);
    if (selectedVideoId === video.id) {
      annotationDirty = false;
      renderSelectedVideo();
      showToast("Ground Truth 已自動儲存。");
    }
    renderVideoList();
    return true;
  } catch (error) {
    restorePersistedTimestamps(video);
    handleDatasetApiError("儲存 Ground Truth 失敗", error);
    return false;
  } finally {
    timestampSavesInProgress.delete(video.id);
    if (selectedVideoId === video.id) {
      renderAnnotationStatus(video);
      $("#recordTimestampButton").disabled = !youtubePlayerReady ||
        youtubePlayerVideoId !== video.id;
    }
  }
}

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    const script = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    ) || document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      reject(new Error("等待 YouTube 播放器 API 逾時。"));
    }, 15000);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeoutId);
      resolve(window.YT);
      if (typeof previousCallback === "function") previousCallback();
    };

    script.addEventListener("error", () => {
      window.clearTimeout(timeoutId);
      reject(new Error("無法載入 YouTube 播放器 API。"));
    }, { once: true });

    if (!script.src) {
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.append(script);
    }
  });

  return youtubeApiPromise;
}

function destroyYouTubePlayer() {
  youtubePlayerGeneration += 1;
  youtubePlayerVideoId = null;
  youtubePlayerReady = false;
  $("#recordTimestampButton").disabled = true;
  if (youtubePlayer) {
    youtubePlayer.destroy();
    youtubePlayer = null;
  }
}

async function initializeYouTubePlayer(video) {
  destroyYouTubePlayer();
  const generation = youtubePlayerGeneration;
  youtubePlayerVideoId = video.id;

  try {
    const youtube = await loadYouTubeIframeApi();
    if (
      generation !== youtubePlayerGeneration ||
      !document.getElementById("youtubePlayer")
    ) {
      return;
    }

    youtubePlayer = new youtube.Player("youtubePlayer", {
      events: {
        onReady: () => {
          if (
            generation === youtubePlayerGeneration &&
            selectedVideoId === video.id
          ) {
            youtubePlayerReady = true;
            $("#recordTimestampButton").disabled = false;
          }
        },
        onError: (event) => {
          if (generation !== youtubePlayerGeneration) return;
          youtubePlayerReady = false;
          $("#recordTimestampButton").disabled = true;
          console.error("YouTube 播放器錯誤", event.data);
          showToast("YouTube 影片無法播放，請確認影片允許嵌入。");
        }
      }
    });
  } catch (error) {
    if (generation !== youtubePlayerGeneration) return;
    console.error("初始化 YouTube 播放器失敗", error);
    showToast("無法載入 YouTube 播放器，請稍後重試或重新整理頁面。");
  }
}

function renderVideoList() {
  const videos = getCurrentVideoList();
  const videoSelect = $("#videoList");
  const removeVideoButton = $("#removeVideoButton");

  $("#videoCount").textContent = `共 ${videos.length} 部影片`;
  if (!videos.some((video) => video.id === selectedVideoId)) {
    selectedVideoId = videos[0]?.id || null;
  }

  videoSelect.disabled = videos.length === 0;
  videoSelect.innerHTML = videos.length
    ? videos.map((video) => `
      <option value="${escapeHTML(video.id)}">
        ${escapeHTML(video.title)} · ${escapeHTML(video.duration)} · ${video.timestamps.length} 個時間點
      </option>
    `).join("")
    : `<option value="">目前沒有影片，請先新增影片</option>`;
  videoSelect.value = selectedVideoId === null ? "" : String(selectedVideoId);
  removeVideoButton.hidden = !selectedVideoId;
}

async function removeSelectedVideo() {
  const videos = getCurrentVideoList();
  const videoId = Number($("#videoList").value);
  const video = videos.find((item) => item.id === videoId);
  const datasetName = $("#annotationDatasetSelect").value;
  const dataset = datasetRecords.get(datasetName);
  if (!video || !dataset) return;

  const unsavedWarning = annotationDirty
    ? "目前尚未儲存的時間點修改也會一起丟失。"
    : "";
  if (!window.confirm(
    `確定要從「${datasetName}」移除「${video.title}」嗎？${unsavedWarning}`
  )) {
    return;
  }

  const button = $("#removeVideoButton");
  button.disabled = true;
  try {
    await datasetApiRequest(
      `datasets/${dataset.id}/videos/${video.id}`,
      { method: "DELETE" }
    );
    const index = videos.findIndex((item) => item.id === video.id);
    if (index >= 0) videos.splice(index, 1);
    selectedVideoId = videos[0]?.id || null;
    annotationDirty = false;
    renderVideoList();
    renderSelectedVideo();
    renderComparison();
    showToast("已從目前 Dataset 移除影片；影片標註仍保留。");
  } catch (error) {
    handleDatasetApiError("移除影片失敗", error);
  } finally {
    button.disabled = false;
  }
}

function renderSelectedVideo() {
  const video = getSelectedVideo();
  const preview = $("#page-dataset .video-preview");

  if (!video) {
    destroyYouTubePlayer();
    renderedPreviewVideoId = null;
    const hasDataset = Boolean($("#annotationDatasetSelect").value);
    $("#selectedVideoTitle").textContent = "尚未選取影片";
    $("#selectedVideoMeta").textContent = hasDataset
      ? "請在此 Dataset 新增 YouTube 影片。"
      : "請先建立並選擇 Dataset。";
    $("#annotationStatus").textContent = "尚未儲存";
    $("#annotationStatus").className = "badge badge-warning";
    preview.className = "video-preview";
    preview.innerHTML = `
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
  if (video.youtubeId && renderedPreviewVideoId !== video.id) {
    destroyYouTubePlayer();
    renderedPreviewVideoId = video.id;
    preview.className = "video-preview video-preview-playing";
    preview.innerHTML = `
      <div class="youtube-embed">
        <iframe
          id="youtubePlayer"
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtubeId)}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&playsinline=1"
          title="${escapeHTML(video.title)}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    `;
    initializeYouTubePlayer(video);
  } else if (!video.youtubeId && renderedPreviewVideoId !== video.id) {
    destroyYouTubePlayer();
    renderedPreviewVideoId = video.id;
    preview.className = "video-preview";
    preview.innerHTML = `
      <div class="preview-icon">▶</div>
      <h4>影片預覽區</h4>
      <p>
        此處預留影片播放器。後續可接入影片 URL 或實體影片路徑。
      </p>
    `;
  }

  renderAnnotationStatus(video);

  renderTimestampRows(video);
}

function renderTimestampRows(video) {
  const timestamps = video.timestamps;

  if (!timestamps.length) {
    $("#timestampList").innerHTML = `
      <div class="timestamp-empty">
        目前沒有時間點，播放至切換位置後點選「記錄目前播放時間」。
      </div>
    `;
  } else {
    $("#timestampList").innerHTML = timestamps.map((timestamp, index) => {
      const [hours = "", minutes = "", seconds = ""] = timestamp.split(":");
      return `
        <div class="timestamp-row" data-timestamp-index="${index}">
          <span class="timestamp-number">
            時間點 ${String(index + 1).padStart(2, "0")}
          </span>
          <div class="timestamp-input-group" role="group"
            aria-label="時間點 ${index + 1}，時分秒">
            <input
              class="input timestamp-part"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              aria-label="小時"
              placeholder="HH"
              maxlength="2"
              value="${escapeHTML(hours)}"
              data-index="${index}"
              data-part="0"
            >
            <span class="timestamp-separator" aria-hidden="true">:</span>
            <input
              class="input timestamp-part"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              aria-label="分鐘"
              placeholder="MM"
              maxlength="2"
              value="${escapeHTML(minutes)}"
              data-index="${index}"
              data-part="1"
            >
            <span class="timestamp-separator" aria-hidden="true">:</span>
            <input
              class="input timestamp-part"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              aria-label="秒"
              placeholder="SS"
              maxlength="2"
              value="${escapeHTML(seconds)}"
              data-index="${index}"
              data-part="2"
            >
          </div>
          <button
            class="btn btn-small btn-danger remove-timestamp"
            type="button"
            data-index="${index}"
          >刪除</button>
        </div>
      `;
    }).join("");
  }

  $("#timestampSummary").textContent =
    `共 ${timestamps.length} 個 Ground Truth 時間點`;

  $$(".timestamp-part").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.index);
      const part = Number(input.dataset.part);
      input.value = input.value.replace(/\D/g, "").slice(0, 2);
      const row = input.closest(".timestamp-row");
      const parts = $$(".timestamp-part", row);
      video.timestamps[index] = parts.map((field) => field.value).join(":");
      markAnnotationDirty();

      if (input.value.length === 2 && part < parts.length - 1) {
        parts[part + 1].focus();
      }
    });

    input.addEventListener("keydown", (event) => {
      const part = Number(input.dataset.part);
      if (event.key === "Backspace" && !input.value && part > 0) {
        const previous = input.closest(".timestamp-row")
          .querySelectorAll(".timestamp-part")[part - 1];
        previous.focus();
      }
    });

    input.addEventListener("change", () => {
      const value = video.timestamps[Number(input.dataset.index)];
      if (!value || value.split(":").some((part) => part.length !== 2)) return;
      if (!isValidTimestamp(value)) {
        showToast("分鐘和秒鐘需介於 00 至 59。");
        input.focus();
        return;
      }
      if (video.timestamps.some((timestamp, timestampIndex) =>
        timestampIndex !== Number(input.dataset.index) &&
        isValidTimestamp(timestamp) &&
        timestampToSeconds(timestamp) === timestampToSeconds(value)
      )) {
        showToast("同一支影片不能有重複的切換時間點。");
        restorePersistedTimestamps(video);
        return;
      }
      sortTimestamps(video.timestamps);
      saveVideoTimestamps(
        video,
        video.timestamps.map(timestampToSeconds)
      );
    });
  });

  $("#timestampList").querySelectorAll(".timestamp-row").forEach((row) => {
    row.title = "點擊跳轉至影片中的此時間點";
    row.addEventListener("click", (event) => {
      if (event.target.closest(".remove-timestamp")) return;

      const currentVideo = getSelectedVideo();
      const timestamp = currentVideo?.timestamps[
        Number(row.dataset.timestampIndex)
      ];
      if (!currentVideo || currentVideo.id !== video.id || !timestamp) return;
      if (!isValidTimestamp(timestamp)) {
        showToast("請先完成此時間點的 HH、MM、SS 輸入。");
        return;
      }
      if (
        !youtubePlayerReady ||
        !youtubePlayer ||
        youtubePlayerVideoId !== video.id
      ) {
        showToast("YouTube 播放器尚未就緒，請稍後再試。");
        return;
      }

      youtubePlayer.seekTo(timestampToSeconds(timestamp), true);
    });
  });

  $$(".remove-timestamp").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.index);
      video.timestamps.splice(index, 1);
      markAnnotationDirty();
      renderTimestampRows(video);
      renderVideoList();
      await saveVideoTimestamps(
        video,
        video.timestamps.map(timestampToSeconds)
      );
    });
  });
}

function isValidTimestamp(value) {
  return /^\d{2}:[0-5]\d:[0-5]\d$/.test(value);
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
  $("#deleteDatasetSelect").innerHTML = datasetNames.map((datasetName) => {
    const dataset = datasetRecords.get(datasetName);
    return `<option value="${escapeHTML(dataset.id)}">${escapeHTML(datasetName)}</option>`;
  }).join("");
  $("#deleteDatasetButton").disabled =
    datasetNames.length === 0;
  updateOverviewDataset();
}

$("#createDatasetButton").addEventListener("click", () => {
  $("#newDatasetName").value = "";
  $("#createDatasetDialog").showModal();
  $("#newDatasetName").focus();
});

$("#cancelCreateDatasetButton").addEventListener("click", () => {
  $("#createDatasetDialog").close();
});

async function createDataset() {
  const datasetName = $("#newDatasetName").value.trim();
  if (!datasetName || datasetName.length > 60) {
    showToast("請輸入 1 至 60 個字元的 Dataset 名稱。");
    $("#newDatasetName").focus();
    return;
  }

  if (datasetNamesContain(datasetName)) {
    showToast("這個 Dataset 名稱已存在，請改用其他名稱。");
    $("#newDatasetName").focus();
    return;
  }

  if (["__proto__", "constructor", "prototype"].includes(datasetName.toLowerCase())) {
    showToast("這個名稱無法使用，請改用其他 Dataset 名稱。");
    $("#newDatasetName").focus();
    return;
  }

  const button = $("#confirmCreateDatasetButton");
  button.disabled = true;
  try {
    const dataset = await datasetApiRequest("datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: datasetName })
    });
    datasetRecords.set(dataset.name, dataset);
    videoData[dataset.name] = [];
    datasetListLoaded = true;
    renderDatasetOptions(dataset.name);
    selectedVideoId = null;
    annotationDirty = false;
    renderVideoList();
    renderSelectedVideo();
    renderComparison();
    $("#createDatasetDialog").close();
    showToast(`已建立 Dataset「${dataset.name}」。`);
  } catch (error) {
    handleDatasetApiError("建立 Dataset 失敗", error);
  } finally {
    button.disabled = false;
  }
}

$("#confirmCreateDatasetButton").addEventListener("click", createDataset);
$("#createDatasetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  createDataset();
});

function datasetNamesContain(datasetName) {
  return Array.from(datasetRecords.keys()).some(
    (name) => name.toLowerCase() === datasetName.toLowerCase()
  );
}

$("#deleteDatasetButton").addEventListener("click", async () => {
  if (datasetRecords.size === 0) {
    showToast("目前沒有可刪除的 Dataset。");
    return;
  }

  $("#deleteDatasetDialog").showModal();
});

$("#cancelDeleteDatasetButton").addEventListener("click", () => {
  $("#deleteDatasetDialog").close();
});

$("#confirmDeleteDatasetButton").addEventListener("click", async () => {
  const datasetId = Number($("#deleteDatasetSelect").value);
  const selectedEntry = Array.from(datasetRecords.entries()).find(
    ([, dataset]) => dataset.id === datasetId
  );
  if (!selectedEntry) {
    showToast("請選擇要刪除的 Dataset。");
    return;
  }
  const [datasetName, dataset] = selectedEntry;
  if (!window.confirm(
    `確定要刪除 Dataset「${datasetName}」嗎？此操作無法復原。`
  )) {
    return;
  }

  const button = $("#deleteDatasetButton");
  button.disabled = true;
  try {
    await datasetApiRequest(`datasets/${dataset.id}`, { method: "DELETE" });
    datasetRecords.delete(datasetName);
    delete videoData[datasetName];
    datasetListLoaded = true;
    $("#deleteDatasetDialog").close();
    datasetVideosLoadVersion += 1;
    selectedVideoId = null;
    annotationDirty = false;

    const nextDatasetName = Array.from(datasetRecords.keys())[0] || "";
    renderDatasetOptions(nextDatasetName);
    renderVideoList();
    renderSelectedVideo();
    renderComparison();
    showToast(`已刪除 Dataset「${datasetName}」。`);

    const nextDataset = datasetRecords.get(nextDatasetName);
    if (nextDataset) {
      try {
        await loadDatasetVideos(nextDataset);
      } catch (error) {
        handleDatasetApiError("讀取 Dataset 影片失敗", error);
      }
    }
  } catch (error) {
    handleDatasetApiError("刪除 Dataset 失敗", error);
    button.disabled = datasetRecords.size === 0;
  }
});

$("#addVideoButton").addEventListener("click", async () => {
  if (addingVideo) return;

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

  const existingVideo = videoData[datasetName].find(
    (video) => video.youtubeId === youtubeId
  );
  if (existingVideo) {
    $("#newVideoUrl").value = "";
    selectedVideoId = existingVideo.id;
    annotationDirty = false;
    renderVideoList();
    renderSelectedVideo();
    showToast("這部影片已存在於目前的 Dataset。");
    return;
  }

  const button = $("#addVideoButton");
  addingVideo = true;
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
    const currentVideos = videoData[datasetName];
    const existingIndex = currentVideos.findIndex(
      (item) => item.id === video.id || item.youtubeId === video.youtubeId
    );
    if (existingIndex >= 0) {
      currentVideos[existingIndex] = video;
    } else {
      currentVideos.push(video);
    }
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
    addingVideo = false;
    button.disabled = false;
  }
});

$("#annotationDatasetSelect").addEventListener("change", async () => {
  const dataset = datasetRecords.get($("#annotationDatasetSelect").value);
  $("#deleteDatasetButton").disabled = !dataset;
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

$("#videoList").addEventListener("change", () => {
  selectedVideoId = Number($("#videoList").value) || null;
  annotationDirty = false;
  renderVideoList();
  renderSelectedVideo();
});

$("#removeVideoButton").addEventListener("click", removeSelectedVideo);

$("#recordTimestampButton").addEventListener("click", async () => {
  const video = getSelectedVideo();
  if (
    !video ||
    !youtubePlayer ||
    youtubePlayerVideoId !== video.id ||
    timestampSavesInProgress.has(video.id) ||
    typeof youtubePlayer.getCurrentTime !== "function"
  ) {
    showToast("YouTube 播放器尚未就緒，請稍後再試。");
    return;
  }

  const currentTime = Math.floor(youtubePlayer.getCurrentTime());
  if (!Number.isFinite(currentTime) || currentTime < 0) {
    showToast("目前無法讀取影片播放時間。");
    return;
  }

  const timestamp = formatSeconds(currentTime);
  if (video.timestamps.includes(timestamp)) {
    showToast(`時間點 ${timestamp} 已經存在。`);
    return;
  }

  const timestamps = [...video.timestamps, timestamp]
    .map(timestampToSeconds)
    .sort((left, right) => left - right);
  const saved = await saveVideoTimestamps(video, timestamps);
  if (!saved) return;

  $("#timestampList").scrollTop = $("#timestampList").scrollHeight;
});
