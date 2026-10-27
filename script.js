const experimentForm = document.querySelector("#experiment-form");
const formMessage = document.querySelector("#form-message");
const comparisonFilter = document.querySelector("#comparison-filter");
const comparisonRows = [...document.querySelectorAll("#comparison-rows tr")];
const comparisonEmpty = document.querySelector("#comparison-empty");
const metricTolerance = document.querySelector("#metric-tolerance");
const caseItems = [...document.querySelectorAll(".case-item")];
const outlineMessage = document.querySelector("#outline-message");
let experimentTimer = null;

const metricResults = {
    "1": { precision: "0.93", recall: "0.86", f1: "0.89", counts: "170 / 13 / 27" },
    "2": { precision: "0.89", recall: "0.94", f1: "0.91", counts: "186 / 23 / 12" },
    "3": { precision: "0.85", recall: "0.97", f1: "0.91", counts: "192 / 34 / 6" }
};

const errorCases = {
    fp: {
        type: "FALSE POSITIVE", typeClass: "error-fp", title: "投影片動畫觸發轉場", time: "12:34.2",
        la: "相似度 0.82 · 有變化", ocr: "文字相同 · Page 12", decision: "判定為新投影片",
        truth: "同頁動畫 · 非轉場", reason: "動畫逐步顯示圖表造成視覺差異，但 title 與 page number 未變；融合權重偏重影像語意訊號。"
    },
    fn: {
        type: "FALSE NEGATIVE", typeClass: "error-fn", title: "快速切頁未被取樣", time: "08:19.0",
        la: "相似度 0.91 · 高度相似", ocr: "標題已改變 · Page 8", decision: "未判定為新投影片",
        truth: "Page 7 → Page 8", reason: "兩張投影片版型與背景相近，且切換發生在取樣影格之間；可提高該片段的取樣頻率並增加 OCR 權重。"
    },
    fp2: {
        type: "FALSE POSITIVE", typeClass: "error-fp", title: "游標遮擋造成 OCR 漂移", time: "31:06.5",
        la: "相似度 0.76 · 局部變化", ocr: "Page 27 → Page 2?", decision: "判定為新投影片",
        truth: "同頁 · Page 27", reason: "游標遮住頁碼末位，使 OCR 讀值短暫變動；可透過多影格 page consistency 檢查降低單幀誤報。"
    }
};

function updateMetrics(tolerance) {
    const result = metricResults[tolerance];
    if (!result) return;
    Object.entries(result).forEach(([key, value]) => {
        const target = document.querySelector(`[data-metric="${key}"]`);
        if (target) target.textContent = value;
    });
}

function updatePipeline() {
    const formData = new FormData(experimentForm);
    const selectedDetectors = formData.getAll("detector");
    const detectorLabel = selectedDetectors.length ? selectedDetectors.join(" + ") : "未選擇偵測器";
    const sampling = formData.get("sampling").toString().split(" · ")[0];
    const fusion = formData.get("fusion");
    const prompt = formData.get("prompt").toString().split(" ")[1];
    const tolerance = formData.get("tolerance");
    const steps = document.querySelectorAll(".pipeline-step small");

    steps[1].textContent = `${sampling} · ${formData.get("sampling").toString().split(" · ")[1]}`;
    steps[2].textContent = detectorLabel;
    steps[4].textContent = `${fusion} · ±${tolerance}s`;
    steps[6].textContent = `Prompt ${prompt}`;
}

experimentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startExperiment();
});

experimentForm.addEventListener("reset", () => {
    if (experimentTimer) {
        window.clearInterval(experimentTimer);
        experimentTimer = null;
    }
    document.querySelector("#run-progress-panel").hidden = true;
    document.querySelector("#experiment-progress-fill").style.width = "0";
    experimentForm.querySelector(".run-button").disabled = false;
    updatePipeline();
    window.setTimeout(() => {
        updatePipeline();
        updateMetrics(metricTolerance.value);
        formMessage.textContent = "已還原為預設實驗設定。";
    }, 0);
});

metricTolerance.addEventListener("change", () => updateMetrics(metricTolerance.value));

comparisonFilter.addEventListener("input", () => {
    const query = comparisonFilter.value.trim().toLocaleLowerCase();
    let visibleCount = 0;
    comparisonRows.forEach((row) => {
        const matches = row.dataset.search.toLocaleLowerCase().includes(query);
        row.hidden = !matches;
        if (matches) visibleCount += 1;
    });
    comparisonEmpty.hidden = visibleCount !== 0;
});

caseItems.forEach((item) => {
    item.addEventListener("click", () => {
        caseItems.forEach((caseItem) => {
            const selected = caseItem === item;
            caseItem.classList.toggle("selected", selected);
            caseItem.setAttribute("aria-selected", String(selected));
        });
        const details = errorCases[item.dataset.case];
        const type = document.querySelector("[data-detail-type]");
        type.textContent = details.type;
        type.className = `error-type ${details.typeClass}`;
        document.querySelector("[data-detail-title]").textContent = details.title;
        document.querySelector("[data-detail-time]").textContent = details.time;
        document.querySelector("[data-detail-la]").textContent = details.la;
        document.querySelector("[data-detail-ocr]").textContent = details.ocr;
        document.querySelector("[data-detail-decision]").textContent = details.decision;
        document.querySelector("[data-detail-truth]").textContent = details.truth;
        document.querySelector("[data-detail-reason]").textContent = details.reason;
        document.querySelector(".frame-label").textContent = `FRAME PREVIEW · ${details.time}`;
    });
});

document.querySelector("#show-more").addEventListener("click", (event) => {
    const moreSegments = document.querySelector("#more-segments");
    const expanded = moreSegments.hidden;
    moreSegments.hidden = !expanded;
    event.currentTarget.textContent = expanded ? "− 收合其餘段落" : "＋ 顯示其餘 3 個段落";
});

document.querySelectorAll(".edit-button").forEach((button) => {
    button.addEventListener("click", () => {
        const segment = button.closest(".outline-segment");
        const title = segment.querySelector("h3");
        const summary = segment.querySelector(".segment-content p");
        const isEditing = button.dataset.editing === "true";
        if (isEditing) {
            title.contentEditable = "false";
            summary.contentEditable = "false";
            button.dataset.editing = "false";
            button.textContent = "編輯";
            outlineMessage.textContent = "修改已套用於目前頁面；尚未儲存至後端。";
            return;
        }
        title.contentEditable = "true";
        summary.contentEditable = "true";
        title.focus();
        button.dataset.editing = "true";
        button.textContent = "完成";
        outlineMessage.textContent = "可直接修改標題與摘要，完成後按「完成」。";
    });
});

document.querySelector("#export-outline").addEventListener("click", () => {
    const segments = [...document.querySelectorAll(".outline-segment")];
    const content = ["Lecture 04 · Neural Networks", ""];
    segments.forEach((segment) => {
        content.push(
            `${segment.querySelector(".segment-time").innerText.replace(/\s+/g, " ").trim()}  ${segment.querySelector("h3").innerText.trim()}`,
            segment.querySelector(".segment-content p").innerText.trim(),
            `關鍵詞：${[...segment.querySelectorAll(".key-terms span")].map((term) => term.innerText).join("、")}`,
            ""
        );
    });
    const blob = new Blob([content.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lecture-04-outline.txt";
    link.click();
    URL.revokeObjectURL(url);
});

const dashboardContent = document.querySelector("#dashboard-content");
const videoViewer = document.querySelector("#video-viewer");
const videoModeButton = document.querySelector("#open-video-viewer");
const headerContextLabel = document.querySelector("#header-context-label");
const sidebarLinks = [...document.querySelectorAll(".sidebar-link[href^='#']")];
const videoPlayer = document.querySelector("#local-video-player");
const embeddedVideoPlayer = document.querySelector("#embedded-video-player");
const videoEmptyState = document.querySelector("#video-empty-state");
const videoFileName = document.querySelector("#video-file-name");
const viewerFileTitle = document.querySelector("#viewer-file-title");
const generatedOutlinePanel = document.querySelector("#generated-outline-panel");
const generatedOutlineList = document.querySelector("#generated-outline-list");
const navSections = sidebarLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
let currentVideoUrl = null;

function setViewMode(viewerMode) {
    dashboardContent.hidden = viewerMode;
    videoViewer.hidden = !viewerMode;
    videoModeButton.setAttribute("aria-pressed", String(viewerMode));
    videoModeButton.classList.toggle("active", viewerMode);
    headerContextLabel.textContent = viewerMode ? "影片觀看" : "研究工作區";
    if (viewerMode) {
        sidebarLinks.forEach((link) => link.classList.remove("active"));
    }
}

videoModeButton.addEventListener("click", () => {
    generatedOutlinePanel.hidden = true;
    setViewMode(true);
});

sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
        setViewMode(false);
        sidebarLinks.forEach((sidebarLink) => sidebarLink.classList.toggle("active", sidebarLink === link));
    });
});

document.querySelector(".brand").addEventListener("click", () => setViewMode(false));

function parseVideoUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (!["http:", "https:"].includes(url.protocol)) return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") {
        const videoId = host === "youtu.be"
            ? url.pathname.split("/").filter(Boolean)[0]
            : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
        return videoId && /^[\w-]{11}$/.test(videoId)
            ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${videoId}`, label: "YouTube 影片" }
            : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
        const videoId = url.pathname.match(/(?:video\/)?(\d+)/)?.[1];
        return videoId
            ? { kind: "vimeo", src: `https://player.vimeo.com/video/${videoId}`, label: "Vimeo 影片" }
            : null;
    }
    if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(url.pathname)) {
        const name = url.pathname.split("/").pop() || "影片連結";
        return { kind: "direct", src: url.href, label: name };
    }
    return null;
}

function clearCurrentVideo() {
    if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
        currentVideoUrl = null;
    }
    videoPlayer.pause();
    videoPlayer.removeAttribute("src");
    videoPlayer.load();
    videoPlayer.hidden = true;
    embeddedVideoPlayer.removeAttribute("src");
    embeddedVideoPlayer.hidden = true;
}

function setViewerProcessingLabel(text) {
    const label = document.querySelector("#viewer-processing-label");
    const indicator = document.createElement("i");
    label.replaceChildren(indicator, document.createTextNode(text));
}

function showVideoSource(source) {
    clearCurrentVideo();
    videoEmptyState.hidden = true;
    if (source.kind === "youtube" || source.kind === "vimeo") {
        embeddedVideoPlayer.src = source.src;
        embeddedVideoPlayer.hidden = false;
        document.querySelector("#video-source-note").textContent = "由第三方播放器載入影片";
        document.querySelector("#viewer-source-label").textContent = source.label.split(" ")[0];
        setViewerProcessingLabel("由外部平台播放");
    } else {
        videoPlayer.src = source.src;
        videoPlayer.hidden = false;
        document.querySelector("#video-source-note").textContent = source.kind === "local" ? "本機播放 · 不會上傳" : "直接影片連結";
        document.querySelector("#viewer-source-label").textContent = source.kind === "local" ? "本機裝置" : "影片網址";
        setViewerProcessingLabel("不會上傳影片");
    }
    videoFileName.textContent = source.label;
    viewerFileTitle.textContent = source.label;
}

function renderGeneratedOutline(sourceLabel) {
    generatedOutlineList.replaceChildren();
    document.querySelectorAll("#outline .outline-segment").forEach((segment) => {
        const copy = segment.cloneNode(true);
        copy.querySelector(".edit-button")?.remove();
        copy.querySelectorAll("[contenteditable]").forEach((element) => element.removeAttribute("contenteditable"));
        generatedOutlineList.append(copy);
    });
    document.querySelector("#generated-outline-meta").textContent = `${sourceLabel} · 示範生成結果（前端假資料）`;
    generatedOutlinePanel.hidden = false;
}

function startExperiment() {
    const source = parseVideoUrl(experimentForm.elements.videoUrl.value.trim());
    if (!source) {
        formMessage.textContent = "目前支援 YouTube / Vimeo 分享連結，或 MP4、WebM 等直接影片檔連結。";
        experimentForm.elements.videoUrl.focus();
        return;
    }

    updatePipeline();
    updateMetrics(experimentForm.elements.tolerance.value);
    generatedOutlinePanel.hidden = true;
    document.querySelector("#viewer-mode-label").textContent = "實驗結果";
    document.querySelector("#viewer-description").textContent = "影片分析已完成，以下大綱為前端假資料示範，並非模型實際輸出。";
    document.querySelector("#run-progress-panel").hidden = false;
    experimentForm.querySelector(".run-button").disabled = true;
    formMessage.textContent = "正在執行前端示範流程…";

    const stages = [
        "載入影片與抽取影格…",
        "執行候選轉場偵測…",
        "對齊 title / page / OCR 訊號…",
        "整理投影片段落並生成大綱…"
    ];
    let progress = 0;
    const progressLabel = document.querySelector("#run-progress-label");
    const progressPercent = document.querySelector("#run-progress-percent");
    const progressFill = document.querySelector("#experiment-progress-fill");

    experimentTimer = window.setInterval(() => {
        progress += 1;
        progressLabel.textContent = stages[progress - 1];
        progressPercent.textContent = `${progress * 25}%`;
        progressFill.style.width = `${progress * 25}%`;
        if (progress < stages.length) return;

        window.clearInterval(experimentTimer);
        experimentTimer = null;
        experimentForm.querySelector(".run-button").disabled = false;
        formMessage.textContent = "示範流程完成；模型尚未連接，顯示的是前端假資料。";
        showVideoSource(source);
        document.querySelector("#viewer-mode-label").textContent = "實驗結果";
        document.querySelector("#viewer-description").textContent = "以下大綱為介面展示用假資料，不是此影片的實際模型分析結果。";
        renderGeneratedOutline(source.label);
        setViewMode(true);
        videoViewer.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
}

function loadLocalVideo(event) {
    const file = event.currentTarget.files[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
        videoFileName.textContent = "請選擇有效的影片檔";
        viewerFileTitle.textContent = "無法播放此檔案";
        return;
    }

    generatedOutlinePanel.hidden = true;
    const localUrl = URL.createObjectURL(file);
    showVideoSource({ kind: "local", src: localUrl, label: file.name });
    currentVideoUrl = localUrl;
    document.querySelector("#viewer-mode-label").textContent = "一般觀看";
    document.querySelector("#viewer-description").textContent = "目前為單純影片觀看模式；執行實驗後會在這裡顯示生成大綱。";
}

document.querySelectorAll("#video-file-input, .video-file-proxy").forEach((input) => {
    input.addEventListener("change", loadLocalVideo);
});

videoPlayer.addEventListener("error", () => {
    document.querySelector("#viewer-description").textContent = "影片無法播放，請確認連結有效，或使用瀏覽器支援的影片格式。";
});

if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting || videoViewer.hidden === false) return;
            sidebarLinks.forEach((link) => {
                link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
            });
        });
    }, { rootMargin: "-25% 0px -65% 0px" });
    navSections.forEach((section) => sectionObserver.observe(section));
}

updatePipeline();
