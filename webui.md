# Web Programming實作教學

> **課程定位**：Web Programming · 12週漸進式實作
> **教學理念**：讓AI輔助你【學會了】，不是【學廢了】
> **完成後你會有**：一個公開網址上跑得起來的Web App，一個乾淨的GitHub repo，以及一套「用AI協作開發前端」的完整流程經驗。

| 主題 | 產出 |
|---|---|
| [W01 — 環境與Git](#EnvGit) | 了解開發環境、Git專案、`.gitignore`、專案架構  |
| [W02 — Web UI and HTML](#WebHTML) | 了解Web基本架構 |
| [W03 — 從本機開發到公開部署](#PublicURL) | https public單一服務完成 |
| [W04 — CSS版面與RWD](#RWD) | Mobile-first App with RWD |
| [W05 — JavaScript DOM操作與事件處理](#JSDOM) | 具互動性的前端功能 |
| [W06 — Fetch API/AJAX串接外部公開API](#FetchAPI) | CORS？fetch被瀏覽器擋下來？ |
| [W07 — 表單處理與前端輸入驗證](#FormValidation) | XSS（跨站腳本攻擊）？具表單功能的頁面 + 基本驗證 |
| [W08 — OAuth 2.0 Login](#OAuth) | 了解第三方登入的運作與優缺點 |
| [W09 — 使用者登入與token](#JWT) | JWT？伺服器「記得」卻不存session，登入防弊 |
| [W10 — Session/Cookie狀態管理](#Cookie) | Cookie vs. LocalStorage vs. SessionStorage；CSRF攻擊原理 |
| [W11 — 專案整合與重構](#Integration) | API限流、API Key/Secrets、功能完整度達80%以上 |
| [W12 — 部署前資安檢查清單](#Deployment) | HTTPS、環境變數、CORS、可公開存取的部署連結 |

---


## 環境準備（若PC Room測試成功，可略過）

* 以下項目需要**管理員權限**，請在課程開始前完成。學生端的所有步驟都在Users權限下可完成。
* 建議學生準備好Win11或Ubuntu，可用電腦教室遠端桌面連線，課程掌控度更高。

### 電腦教室預裝軟體

| 軟體 | 版本 | 安裝方式 | 備註 |
|---|---|---|---|
| VSCode | 最新 | System Installer | 需admin |
| Git for Windows | 2.4x | 預設安裝 | 含Git Credential Manager |
| Node.js LTS | 22.x | MSI，選「Add to PATH」 | 需admin |
| Google Chrome / Edge | 最新 | — | 用於開發者工具 |

> **若無法預裝Node.js**：學生可用Users權限自行安裝（見「Plan B」），但會多花15分鐘。建議還是預裝。

# W01環境與Git

## 架構說明

在寫任何一行程式碼之前，先理解你即將使用的三個工具各自負責什麼：

```
┌────────────┐   寫程式    ┌────────────┐   版本記錄   ┌────────────┐
│  VSCode    │ ─────────> │   專案資料夾 │ ─────────> │    Git     │
│  (編輯器)   │            │  (你的電腦)  │            │  (本機歷史) │
└────────────┘            └─────┬──────┘            └─────┬──────┘
                                │                          │ push
                          ┌─────▼──────┐            ┌─────▼──────┐
                          │  Node.js   │            │   GitHub   │
                          │ (執行環境)  │            │  (雲端備份) │
                          └────────────┘            └────────────┘
```

| 工具 | 它做什麼 | 沒有它會怎樣 |
|---|---|---|
| VSCode | 寫程式、看錯誤、跑終端機 | 用記事本寫也行，但你會很痛苦 |
| Node.js | 讓JavaScript能在瀏覽器外執行 | 無法使用Vite、npm等現代工具 |
| Git | 記錄每次修改，可以回到過去 | 改壞了就回不去了 |
| GitHub | 把Git歷史備份到雲端 | 電腦壞了作業就沒了 |

## 動手做

### 1.1 確認環境

開啟VSCode → 上方選單 `Terminal` → `New Terminal`（或按 `` Ctrl+` ``）

終端機視窗會出現在下方。輸入：

```powershell
node --version
npm --version
git --version
```

**預期輸出**（版本號可能略有不同）：
```
v22.14.0
10.9.2
git version 2.47.1.windows.1
```

三個都有版本號 → 直接跳到 1.3
有任何一個顯示「不是內部或外部命令」 → 看 1.2

### 1.2 Plan B：Users權限自行安裝Node.js

如果`node --version`失敗，用這個方法在**不需要管理員權限**的情況下安裝：

```powershell
# 1. 建立個人工具資料夾
mkdir "$env:LOCALAPPDATA\tools"
cd "$env:LOCALAPPDATA\tools"

# 2. 下載Node.js的zip版（不是msi，msi要admin）
$url = "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip"
Invoke-WebRequest -Uri $url -OutFile node.zip

# 3. 解壓縮
Expand-Archive node.zip -DestinationPath .
Rename-Item node-v22.14.0-win-x64 node

# 4. 加入「使用者」層級的PATH（不影響其他人，不需admin）
$nodePath = "$env:LOCALAPPDATA\tools\node"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$userPath;$nodePath", "User")
```

**關掉VSCode再重開**（PATH變更要重開才生效），然後重新測試`node --version`。

> **教學重點**：為什麼zip可以、msi不行？
> msi安裝程式預設寫入`C:\Program Files`，那是系統目錄，Users權限碰不得。
> zip解壓到你自己的`AppData\Local`，那是你的個人空間，完全不需要特殊權限。
> **理解權限邊界在哪，比記住指令更重要。**

### 1.3 設定Git身分

```powershell
git config --global user.name "你的姓名"
git config --global user.email "你的email@school.edu.tw"

# 確認設定成功
git config --global --list
```

> Git用這組資料標記「是誰做了這次修改」，跟GitHub帳號無關但建議一致。

### 1.4 建立專案資料夾

```powershell
# 建在你的個人文件夾（Users權限完全沒問題）
mkdir "$env:USERPROFILE\code\webui-lab"
cd "$env:USERPROFILE\code\webui-lab"
code -r .
```

> `code -r .` 的意思是「在目前視窗開啟這個資料夾」。

### 1.5 初始化Git

```powershell
git init
git branch -M main
```

### 1.6 先寫`.gitignore`（順序很重要）

在VSCode左側檔案列表按「新增檔案」圖示，建立`.gitignore`：

```gitignore
# 依賴套件 —— 這個資料夾會有上萬個檔案，絕不能進git
node_modules/

# 建置產物
dist/
build/

# 環境變數與密鑰
.env
.env.local
.env.*.local

# 編輯器與系統
.vscode/
.DS_Store
Thumbs.db

# 日誌
*.log
npm-debug.log*
```

> **⚠️ 為什麼要先寫`.gitignore`再寫程式？**
>
> `node_modules`動輒上萬個檔案、數百MB。一旦不小心commit進去，
> 它**永遠留在git歷史裡**——就算之後刪掉，repo體積也回不去了。
>
> **規則：`.gitignore`永遠是專案的第一個檔案。**

### 1.7 建立README.md

```markdown
# WebUI Lab

Web Programming課程實作專案。

## 學號
B11012345
```

### 建立index.html

VSCode: ! + TAB 就會產生HTML框架程式碼

Ctrl + ~ 在VSCode叫出terminal (default: powershell)

```powershell
# y同意安裝http-server
npx.cmd http-server . -p 7777 -a 0.0.0.0
```

http://127.0.0.1:7777/

http://<ip>:7777/

### 1.8 第一次commit

```powershell
git add .gitignore README.md index.html
git commit -m "0: initialize project"
```
#### git add all files 
```powershell
git add .
```

### 1.9 推上GitHub

1. 到 [github.com](https://github.com) 註冊/登入
2. 右上角 `+` → `New repository`
3. Repository name填 `webui-lab`
4. **選Public**（之後要用GitHub Pages當備援部署）
5. **不要**勾選任何初始化選項（README、gitignore、license都不要勾）
6. 建立後複製指令：

```powershell
git remote add origin https://github.com/你的帳號/webui-lab.git
git push -u origin main
```

第一次push會跳出瀏覽器要你登入GitHub授權（Git Credential Manager處理，不需要admin）。

## ✅ W01檢查點

- [x] `node --version`、`npm --version`、`git --version`都有輸出
- [x] 專案資料夾建在`code`下，VSCode能開啟
- [x] `.gitignore`是第一個建立的檔案
- [x] `git log --oneline`看得到你的第一個commit
- [x] GitHub上看得到你的repo與README

## 🎯 延伸練習

1. 用`git log --oneline --graph`觀察歷史
- 2d805e8 (HEAD -> main, origin/main) Initial commit
2. 故意修改README，用`git diff`看差異，再commit
3. 查一下：`git add .` 跟 `git add -A` 有什麼差別？
- 在範圍上有所差異
    - git add .是當前目錄及子目錄
    - git add -A = git add -all 是涵蓋整個git目錄
## 🤝 這週怎麼問AI

```
❌ 「幫我裝Node.js」
✅ 「我在Windows 11只有Users權限，無法執行需要admin的安裝程式。
    我想安裝Node.js，請說明zip版與msi版的差異，
    以及為什麼zip版不需要管理員權限。」
```

**差別在哪**：第二種問法你會學到「權限模型」這個概念，第一種你只會拿到一串複製貼上的指令。

## 心得
- 了解github開發環境與社群運作概念
- AI coding建立基礎專案：create a basic web ui repo so that I can push to github later. start from index.html and README.md with .gitignore for web app.
- 不須強記git commands，AI可協助： commit "W01: Basic Web UI" and push to https://github.com/<user>/webui.git

---

# W02 — Web UI and HTML

根據專案需求思考畫面設計 ()

> Prompt: 
> Use open webui style (like chatgpt) to redesign my web framework. Use the simplest HTML and CSS so that I can understand easily.
> 
> Prompt: 
> Split css from html and store in ./css so that I can keep each code file concise.

## Topics: semantic HTML tags
> 了解以下tags用法

### index.html 使用的語意化標籤

| 標籤 | 位置 | 初學者理解 |
|---|---|---|
| `<aside>` | [index.html](index.html#L11) | 主要內容旁邊的輔助內容，例如側邊欄。 |
| `<main>` | [index.html](index.html#L31) | 頁面的主要內容，一個頁面通常只使用一次。 |
| `<header>` | [index.html](index.html#L32) | 頁面或區塊的頂部內容，例如標題或選單。 |
| `<section>` | [index.html](index.html#L38) | 一個有主題的內容區塊，這裡是聊天區域。 |
| `<h1>` | [index.html](index.html#L40) | 頁面最重要的標題。 |
| `<p>` | [index.html](index.html#L41) | 一段文字或說明。 |
| `<form>` | [index.html](index.html#L61) | 使用者輸入資料的表單。 |
| `<textarea>` | [index.html](index.html#L62) | 可以輸入多行文字的欄位。 |
| `<button>` | [index.html](index.html#L13) | 可以操作的按鈕，例如新增聊天或送出訊息。 |
| `<a>` | [index.html](index.html#L21-L23) | 超連結，用來前往其他位置或頁面。 |
| `<strong>` | [index.html](index.html#L27) | 表示重要文字，通常會以粗體顯示。 |
| `<small>` | [index.html](index.html#L27) | 表示較次要或補充性的文字。 |

### 沒有特殊語意的標籤

- `<div>`：通用區塊容器，本身沒有特殊含義。
- `<span>`：行內容器，本身沒有特殊含義。

目前頁面沒有使用 `<nav>`。如果要明確表示側邊欄是網站導覽，可以將導覽按鈕放進 `<nav>` 裡。

### 為什麼要使用語意化標籤？

語意化標籤可以讓瀏覽器、搜尋引擎和螢幕閱讀器理解每個區域的用途。

例如：
- `<main>` 表示主要內容。
- `<aside>` 表示側邊內容。
- `<nav>` 表示導覽。
- `<form>` 表示表單。
- `<footer>`

即使不看 CSS，也能大致理解 HTML 的結構。

### Project Milestone

#### Problem
我要解決什麼問題？

#### Target Users
誰會使用？

#### Core Features
- 
- 
- 

#### Data
需要哪些資料？

#### External API
是否需要API？

#### Security / Privacy
可能有哪些風險？

#### MVP
如果只剩4週，我最少要完成哪些功能？

## W02 Learning Log


### AI Concept Question

```text
為什麼不應該整個網站全部用<div>？
請比較：
<div>
<section>
<article>
<nav>
<main>

用實際網頁例子解釋。
```

---

# W03 — 從本機開發到公開部署

> **階段**：學生已完成網站demo，「**讓作品上線、公開存取**」
> **目標**：支援https，以便公開服務，或支援Line bot

---

## 📋 大綱

| 階段 | 內容 | 時間估計 |
|------|------|----------|
| Part 1 | ASGI 概念 & uvicorn 啟動靜態網站 | ~25 min |
| Part 2 | IIS URL Rewrite 反向代理設定 | ~20 min |
| Part 3 | 學生實作 & 驗收 | ~15 min |

---

## Part 1：用 uvicorn 啟動你的靜態網站

### 1.1 什麼是 ASGI？

| 比較項目 | WSGI (傳統) | ASGI (新一代) |
|----------|-------------|---------------|
| 全稱 | Web Server Gateway Interface | **Asynchronous** Server Gateway Interface |
| 特性 | 同步、一個請求佔一個 thread | 非同步、支援高併發 |
| 支援協定 | HTTP only | HTTP + **WebSocket** |
| 代表框架 | Flask, Django (傳統) | FastAPI, Starlette, Django 4+ |

> 💡 **白話說**：ASGI 就是 Python Web 應用程式與伺服器之間的「溝通規格」，uvicorn 是實作這個規格的高效能伺服器。

### 1.2 為什麼選 uvicorn？

- ⚡ 基於 `uvloop` + `httptools`，效能極佳
- 🔄 支援 `--reload` 熱重載，開發超方便
- 📦 安裝簡單，一行指令搞定
- 🎯 搭配 FastAPI / Starlette 的 `StaticFiles`，直接服務 HTML/CSS/JS

### 1.3 環境安裝

```bash
# 建議使用 pip（學生機已有 Python 3.10+）
pip install fastapi uvicorn aiofiles
```

### 1.4 專案目錄結構

假設學生的網站雛形放在 `site/` 資料夾中：

```
my_project/
├── server.py # 進入點（啟動用）
└── site/ # ← 學生的網站雛形（HTML5 + CSS3 + JS）
├── index.html
├── css/
│ └── style.css
├── js/
│ └── app.js
└── images/
└── ...
```

### 1.5 撰寫 `server.py`（最精簡版本）

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# 關鍵：html=True 讓它自動找 index.html
app.mount("/", StaticFiles(directory="site", html=True), name="site")
```

> ✅ `html=True` 的效果：
> - 訪問 `/` → 自動回傳 `site/index.html`
> - 訪問 `/about` → 自動回傳 `site/about.html`
> - 不用為每個頁面手動寫路由！

### 1.6 啟動伺服器

```bash
# 開發模式（含熱重載）
uvicorn server:app --reload --host 0.0.0.0 --port 7777
```

| 參數 | 說明 |
|------|------|
| `server:app` | `server.py` 檔案中的 `app` 物件 |
| `--reload` | 程式碼修改後自動重啟（開發用） |
| `--host 0.0.0.0` | ⚠️ 綁定所有網路介面，讓外部可連入 |
| `--port 7777` | 指定 port 為 **7777** |

### 1.7 驗證

啟動後，學生可以在瀏覽器打開：

```
http://localhost:7777/
```

看到自己的網站就代表成功 🎉

> ⚠️ 此時其他人可以透過 `http://<你的IP>:7777/` 存取，但這是 **HTTP** 且 port 不標準，不適合公開展示。

---

## Part 2：IIS URL Rewrite — 反向代理讓作品公開上線

### 2.1 目標架構

```
┌──────────────────────────────────┐
│ IIS (Windows Server) │
使用者瀏覽器 │ HTTPS :443 (SSL 憑證) │
│ │ │
│ HTTPS 請求 │ URL Rewrite Rules: │
▼ │ │
https://demo…/A11234567 │ /A11234567/* → http://IP:7777/ │
│ /B22345678/* → http://IP:7777/ │
│ /C33456789/* → http://IP:7777/ │
│ ... │
└──────────┬───────────────────────┘
│ HTTP (內部反向代理)
▼
┌──────────────────────┐
│ 學生的 uvicorn :7777 │
│ (各自的電腦/VM) │
└──────────────────────┘
```

**效果**：
- 對外：`https://demo…/<student_no>` （HTTPS、好記、專業）
- 對內：`http://<student_IP>:7777/` （uvicorn 原始服務）

### 2.2 IIS 必要模組（老師已在伺服器安裝）

| 模組 | 用途 |
|------|------|
| **URL Rewrite Module 2.0+** | URL 規則比對與重寫 |
| **Application Request Routing (ARR) 3.0+** | 反向代理轉發能力 |
| **SSL 憑證** | 提供 HTTPS 加密連線 |

### 2.3 啟用 ARR Proxy（伺服器層級，只需做一次。老師已在伺服器安裝）

1. 開啟 **IIS Manager**
2. 點擊最上層 **Server 節點**
3. 雙擊 **Application Request Routing Cache**
4. 右側 Actions → **Server Proxy Settings**
5. ✅ 勾選 **Enable proxy**
6. 套用 (Apply)

### 2.4 URL Rewrite 規則設定

在 IIS 網站根目錄的 `web.config` 中加入規則：參考 `web03_iis_url_rewrite_uvicorn.md`

### 2.5 批次產生規則（Python 輔助腳本）

如果學生人數多，可用腳本自動產生：

```python
# generate_rules.py
students = {
"A11234567": "192.168.x.101",
"B22345678": "192.168.x.102",
"C33456789": "192.168.x.103",
# ... 從名單匯入
}

for sid, ip in students.items():
print(f'''
<rule name="Student_{sid}" stopProcessing="true">
<match url="^{sid}(/.*)?$" />
<action type="Rewrite" url="http://{ip}:7777/{{R:1}}" />
</rule>''')
```

```bash
python generate_rules.py > rules_fragment.xml
# 再貼入 web.config 的 <rules> 區塊內
```

### 2.6 HTTPS (SSL Offloading)

```
瀏覽器 ←── HTTPS (加密) ──→ IIS ←── HTTP (明文) ──→ uvicorn
```

- IIS 負責 SSL 終結（SSL Offloading / SSL Termination）
- 內部轉發到 uvicorn 用 HTTP 即可，**不需要**學生自己處理憑證
- 學生的作品自動享有 HTTPS 🔒

---

## Part 3：學生實作步驟 Checklist
- 有修DBS課程學生，在上課使用FastAPI建立好Web Homepage和API服務，可以略過以下步驟。
- 只有修Web Programming課程學生，可以直接執行：
```powershell
npx.cmd http-server . -p 7777 -a 0.0.0.0
```

### 若要用FastAPI架站，學生需要做的事（約 15 分鐘）

- [x] **Step 1**：確認 Python 環境，安裝套件
```bash
pip install fastapi uvicorn aiofiles
```

- [x] **Step 2**：在專案根目錄建立 `server.py`
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount("/", StaticFiles(directory="web目錄", html=True), name="site")
```

- [x] **Step 3**：啟動 uvicorn
```bash
uvicorn server:app --host 0.0.0.0 --port 7777
```

- [x] **Step 4**：本機測試 → 開瀏覽器訪問 `http://localhost:7777/`

- [x] **Step 5**：回報 IP 給老師（老師設定 IIS 規則）

- [x] **Step 6**：公開測試 → 訪問 `https://demo…/<你的學號>`，確認作品上線 🎉

### 老師需要做的事

- [ ] 收集學生 IP 對照表（學號 ↔ IP）
- [ ] 更新 IIS `web.config` 中的 Rewrite Rules
- [ ] 確認 ARR Proxy 已啟用
- [ ] 逐一或抽樣測試 `https://demo…/<student_no>`

---

## 🔧 常見問題排除

### Q1：瀏覽器顯示 502 / 503 錯誤
- ✅ 確認學生的 uvicorn 正在執行中
- ✅ 確認 port 是 **7777** 沒打錯
- ✅ 確認 `--host 0.0.0.0`（不是預設的 127.0.0.1）
- ✅ 確認 Windows 防火牆允許 port 7777 的 inbound 連線

### Q2：CSS / JS / 圖片載入失敗 (404)
- ✅ 檢查 HTML 中的路徑是否為**相對路徑**
```html
<!-- ✅ 正確：相對路徑 -->
<link rel="stylesheet" href="css/style.css">
<script src="js/app.js"></script>

<!-- ❌ 錯誤：絕對路徑會跑到根目錄 -->
<link rel="stylesheet" href="/css/style.css">
```
- 💡 因為透過子目錄（`/<student_no>/`）存取，絕對路徑 `/css/...` 會指向 IIS 根目錄而非學生的 uvicorn

### Q3：uvicorn 啟動後終端機關掉就斷了
- 先不管，課堂上保持終端機開著即可
- 進階：可用 `nohup` (Linux) 或 Windows 背景執行，但不在本節範圍

### Q4：多個學生同一台電腦？
- 各自使用不同 port（7777, 7778, 7779...）
- IIS 規則也對應到各自的 port

---

## 📖 觀念小結

| 你學到了什麼 | 對應的業界實務 |
|-------------|---------------|
| uvicorn 啟動靜態網站 | ASGI 伺服器部署 |
| `--host 0.0.0.0` | 伺服器綁定與網路存取 |
| IIS URL Rewrite | 反向代理 (Reverse Proxy) |
| HTTPS via IIS | SSL Termination / Offloading |
| 學號對應子路徑 | 多租戶架構 (Multi-tenancy) 概念 |

> 🎓 **這就是你第一次把自己寫的網站「部署上線」的完整流程！**
> 未來你可能會用 Nginx、Cloudflare、Docker、Kubernetes 做類似的事，但核心觀念都一樣：
> **「寫好的東西 → 用伺服器跑起來 → 透過反向代理讓全世界看到」**

---

## 📚 延伸閱讀（有興趣自行探索）

- [Uvicorn 官方文件](https://www.uvicorn.org/)
- [FastAPI 靜態檔案](https://fastapi.tiangolo.com/tutorial/static-files/)
- [IIS URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)
- [Application Request Routing (ARR)](https://www.iis.net/downloads/microsoft/application-request-routing)


# W04 — CSS版面與RWD

> **課程定位**:Web Programming · 第4週 · 前端進化起點
> **前情提要**:W01建好環境與Git,W02做出靜態頁面,W03部署上線
> **本週完成後你會有**:一個在手機、平板、桌機都不跑版的UI,以及一套可重用的設計系統。但請遵循**mobile first**設計原則。

---

## This Week at a Glance

| Phase | Content | Use case & scenario |
|------|---------|--------------------|
| Part 1 | Box model, Flexbox, and Grid responsibilities | A product dashboard with a sidebar, top bar, and content cards; you need to decide which layout system controls each layer |
| Part 2 | CSS variables design system + dark mode | A SaaS landing page or admin panel that must keep branding consistent across buttons, cards, backgrounds, and theme switching |
| Part 3 | RWD breakpoints and responsive validation | A web app used on phone, tablet, and desktop, where the layout must adapt without breaking reading flow or interaction |

---

## Page Layout

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Header (full width, top layer)                                         │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────┐ ┌──────────────────────────────────────────────┐│
│ │ Sidebar            │ │ Main content area                            ││
│ │ (navigation)       │ │ - content                                    ││
│ │                    │ │ - cards                                      ││
│ │                    │ │ - layout                                     ││
│ └────────────────────┘ └──────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ Footer                                                                 │
└────────────────────────────────────────────────────────────────────────┘
```

| Scenario | Use | Why |
|---|---|---|
| Page structure (sidebar + main area) | **Grid** | Two-dimensional layout with fixed columns; `grid-template-columns: 260px 1fr` solves it in one line |
| A row of buttons, icons, and text | **Flex** | One-dimensional arrangement; alignment and spacing are very intuitive |
| Card list wrapping automatically | **Grid** with `auto-fill` + `minmax()` | Adapts without writing multiple media queries |
| Fine-tuning element position | `gap` / `position` | ⚠️ Avoid forcing layouts with `margin` |

---

## AI Coding
> 遵循**mobile first**設計原則，手機、平板、桌機都不跑版。
> 根據以上page layout與CSS學習項目，修改index與css，盡量結構清楚。例如可以多個 .css files負責不同區塊呈現。click互動行為可以規畫於./js/app.js或其他適合名稱的.js files。盡量保持index.html結構清楚簡單易懂。
> Header (WKE教務系統，登入靠右)；Sidebar (讀取json\teacher_ops.json)；Main先設計模擬卡片對應Sidebar預設的dashboard內容，請於json/產生 .json file對應card呈現。原來open webui sample內容都可以清除。
> 不須執行npx，我已經用fastapi架站，於 `https://demo.wke.csie.ncnu.edu.tw/s115999999/`可以測試

### 問題
> Sidebar由items對應功能列表並未出現。預設選在Sidebar::dashboard也沒有顯示內容範例於Main。後續都不須run npx，我已經用fastapi架站。

使用 <base href="/s115999999/"> 正確組合 FastAPI 路徑：
/s115999999/json/teacher_ops.json
/s115999999/json/dashboard_cards.json

### FastAPI
```
app.mount(
    "/",
    HtmlCssOnlyStaticFiles(directory=public_directory, html=True),
    name="public",
)
```
> 擴大允許 ./js/*, ./json/*, *.svg

```
class HtmlCssOnlyStaticFiles(StaticFiles):
    """只提供允許的前端靜態資源，拒絕其他公開檔案類型。

    目錄本身仍會交給 Starlette 處理，這樣根目錄可以透過 html=True
    找到 index.html；實際檔案則必須符合副檔名或目錄白名單。
    """

    allowed_extensions = {".css", ".html", ".svg"}
    allowed_directories = {"js", "json"}

```

## 學習心得
- 

---

# W05 — JavaScript DOM操作與事件處理{#JSDOM}
用 AI Coding 加入具互動性的前端功能：
- 本週核心不是背 JavaScript DOM API  
- 目標是讓你能看懂一支前端程式「怎麼運作」
- 並能用清楚的 prompt 要 AI 幫你加入互動功能
- 同時知道 AI 改了哪裡、為什麼這樣改。

---

## 0. 本週學習目標

完成本週後，你應該能做到：
1. 從 top-down 角度看懂一支 `app.js` 的主要組成。
2. 把 JavaScript function 分成幾種常見類型。
3. 看懂一條完整互動流程：
```text
Event
→ Function
→ DOM Change
→ UI Result
```

4. 不需要自己從零背完整 DOM 語法，也能用 prompt 要 AI 加入互動。
5. AI 改完後，可以檢查：
   - 綁了什麼 event？
   - event 觸發哪個 function？
   - function 修改哪個 DOM element？
   - 修改了哪個 class / attribute / text？
6. 能要求 AI 只做局部修改，而不是整份程式重寫。
7. 為 W06 的：
```text
fetch() → HTTP → API → JSON → DOM
```
做好準備。

## 1. AI Coding 先學「看結構」，不要先鑽語法

面對一支你不熟的 `app.js`，初學者很容易從第一行開始逐行問：
```text
這行是什麼？
下一行是什麼？
這個函式是什麼？
```
這樣很慢，而且容易失去整體概念。

AI coding 比較有效的方法是：
> 先要求 AI 幫你把程式分類，再從主要流程往下追。

例如可以先問：
```text
請先不要逐行解釋。
請把這支 app.js 的 functions 依照功能分類，例如：
1. 啟動 / 初始化
2. 資料載入
3. DOM render
4. UI state 修改
5. event handler
6. error handling

然後告訴我整支程式從載入頁面開始的 top-down 執行流程。
```

這樣你先看到「地圖」，再進入細節。

## 2. 先猜這支 app.js 可以分成哪幾類 Function

我們先從目前的 `app.js` 做 top-down 分類。

### 類型 A：啟動 / 初始化
```js
loadPageData();
```
這是整支程式的啟動點之一。

意思可以先理解為：
> 頁面載入 JavaScript 後，開始載入頁面需要的資料。

### 類型 B：資料載入 Functions
```js
async function loadPageData() {
    ...
}
```

以及：
```js
function readJson(response) {
    ...
}
```

這類 function 的責任是：
```text
取得資料 → 檢查資料 → 轉成 JavaScript 可以使用的格式
```

這一類會在 W06 深入，以Fetch API取得資料。

W05 先知道：
> 資料載入完成後，會交給 render function。

### 類型 C：Render / 建立畫面 Functions
例如：
```js
renderNavigation()
createNavigationGroup()
createNavigationItem()
renderDashboard()
createDashboardCard()
showDashboard()
```

這類 function 的工作是：
```text
Data → 建立或修改 DOM → 顯示 UI
```

例如：
```js
function renderDashboard(cards) {
    dashboardCards.replaceChildren();

    cards.forEach((card) => {
        dashboardCards.append(createDashboardCard(card));
    });
}
```

你不必一開始就看懂每一行。
先看 function 名稱：

```text
renderDashboard
```

就可以猜：
> 這個 function 應該負責把 dashboard 畫出來。

這就是 top-down reading。

### 類型 D：UI State Functions
例如：
```js
function setActiveNavigation(element) {
    ...
}
```

```js
function openSidebar() {
    ...
}
```

```js
function closeSidebar() {
    ...
}
```

這些 function 不一定建立新的畫面。

它們通常是在改變：
```text
目前 UI 的狀態
```

例如：
```text
Sidebar： closed → open
Navigation： normal → active
```

### 類型 E：小型 Helper Functions
例如：
```js
getIcon()
getCardIcon()
```

這些 function 通常做一件很小的事情。例如：
```js
function getIcon(icon) {
    const icons = {
        dashboard: "▦",
        presentation: "▤"
    };

    return icons[icon] || "•";
}
```

可以理解為：
> 給我一個名稱，我回傳對應 icon。

### 類型 F：Error Handling Functions
例如：
```js
renderNavigationError()
renderDashboardError()
```

這些 function 處理：
```text
正常流程失敗時，UI 要顯示什麼？Console 要記錄什麼？
```

### 類型 G：Event Binding
最後有：
```js
menuToggle.addEventListener("click", openSidebar);

sidebarClose.addEventListener("click", closeSidebar);

sidebarBackdrop.addEventListener("click", closeSidebar);
```

這幾行很重要。

它們不是一般「做事情」的 function。

而是在說：
> 哪個 Event 發生時，要執行哪個 Function。

這就是本週核心。

## 3. Top-down 看整支 app.js

先不要看細節。

整體流程可以畫成：
```text
app.js
│
├─ 取得 DOM elements
│
├─ loadPageData()
│   │
│   ├─ 取得 navigation data
│   ├─ renderNavigation()
│   │
│   ├─ 取得 dashboard data
│   └─ renderDashboard()
│
├─ 建立 Sidebar / Dashboard UI
│
└─ 綁定 Events
    │
    ├─ menu click → openSidebar()
    ├─ close click → closeSidebar()
    ├─ backdrop click → closeSidebar()
    └─ account click → toggle aria-expanded
```

先理解這張圖，再往下看，比逐行閱讀有效很多。

## 4. 本週最重要的 Mental Model
前端互動可以先簡化成：
```text
Event → Function → DOM
```

完整一點：
```text
User Action → Browser Event → Event Listener → Function → DOM Change → UI Result
```

例如：
```text
使用者按 Menu → click event → openSidebar() → sidebar state = is-open → Sidebar 顯示
```

這就是一條完整互動鏈。

## 5. 第一條互動鏈：打開 Sidebar
程式：
```js
menuToggle.addEventListener("click", openSidebar);
```

先不要把它當成語法背。

把它翻成：
```text
Event：menuToggle 被 click

Function：openSidebar

Result：Sidebar 被打開
```

接著看：
```js
function openSidebar() {
    sidebar.classList.add("is-open");
    sidebarBackdrop.classList.add("is-visible");
    menuToggle.setAttribute("aria-expanded", "true");
}
```

現在再拆：
```text
Event
menuToggle click
        ↓
Function
openSidebar()
        ↓
DOM Changes
sidebar 加入 is-open
sidebarBackdrop 加入 is-visible
menuToggle aria-expanded 改成 true
        ↓
UI
Sidebar 出現
Backdrop 出現
```

## 6. 第二條互動鏈：關閉 Sidebar

程式：
```js
sidebarClose.addEventListener("click", closeSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);
```

代表有兩種 event 都會呼叫同一個 function。
```text
close button click ─┐
                    ├→ closeSidebar()
backdrop click ─────┘
```

function：
```js
function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarBackdrop.classList.remove("is-visible");
    menuToggle.setAttribute("aria-expanded", "false");
}
```

因此：
```text
Event → closeSidebar() → remove class → UI 回到 closed state
```

## 7. AI Coding 的第一個關鍵能力：描述「我要的互動」
如果你想新增功能，不需要一開始就知道完整 JavaScript syntax。例如你想加入：
> 按 ESC 可以關閉 Sidebar。

不要只問：
```text
幫我加 ESC 關閉。
```

可以改成：
```text
目前 Sidebar 已經有 openSidebar() 和 closeSidebar()。我要新增一個互動：

Event：使用者按下 Escape key

Function：沿用現有 closeSidebar()

DOM：不要新增新的 DOM 操作，
沿用 closeSidebar() 原本的行為。

請只修改必要的 app.js，
並解釋新增的 event listener 放在哪裡。
```

這個 prompt 已經包含：
```text
Event
Function
DOM
```

AI 比較不容易亂改。

## 8. 一個好 Prompt 的基本格式
本週可以直接使用這個模板：
```text
我要在目前頁面加入一個互動。
Event：[什麼事件？發生在哪個 element？]
Function：[要呼叫現有 function，還是新增 function？]
DOM Change：[要改哪個 element？][改 class / text / attribute / hidden？]
Expected UI：[使用者最後看到什麼？]

限制：
1. 只修改必要部分。
2. 不要重寫整份 app.js。
3. 優先沿用現有 function。
4. 修改後列出： Event → Function → DOM Change。
```

以WKE教務系統為例：
```prompt
block教師功能是多餘的，應該要有menu icon，click之後可以控制Sidebar close | open。
update app.js。限制：
1. 只修改必要部分。
2. 不要重寫整份 app.js。
3. 優先沿用現有 function。
```
> 「教師功能」標題仍在 index.html，這次依照你的指定只修改了 app.js，未移除該標題。

```prompt
「教師功能」block 以menu icon取代，控制sidebar close | open
```
> 測試OK。版面對齊不滿意！
```prompt
<a class="brand" href="./" aria-label="WKE 教務系統首頁">
靠左貼其menuToggle
```
> RWD測試也OK。
```prompt
手機版預設sidebar closed
```
> RWD測試OK。

## 9. 範例：點 Dashboard Card 後標示 selected
需求：
> 使用者點某張 Dashboard Card 時，讓該 Card 加上 `is-selected`。

Prompt 可以寫：
```text
我要在 dashboard card 加入 click interaction。

Event：使用者 click 某一張 .dashboard-card。
Function：請新增一個簡單 function 處理 card selection。
DOM Change：
1. 先移除其他 dashboard card 的 is-selected。
2. 被 click 的 card 加上 is-selected。
Expected UI：一次只有一張 card 是 selected。

請：
1. 優先修改 createDashboardCard() 附近。
2. 不要重寫其他 functions。
3. 修改完成後用   Event → Function → DOM   解釋整個流程。
```

## 10. AI 可能產生的程式
例如：
```js
function setSelectedCard(card) {
    document
        .querySelectorAll(".dashboard-card")
        .forEach((item) => item.classList.remove("is-selected"));

    card.classList.add("is-selected");
}
```

然後：
```js
article.addEventListener("click", () => {
    setSelectedCard(article);
});
```

你現在不應只看：
```text
程式有沒有跑
```

而應該能檢查：
```text
Event：article click

Function：setSelectedCard(article)

DOM：
其他 card remove is-selected
目前 card add is-selected
```

## 11. AI Coding 第二個能力：要求 AI 說清楚「改了哪裡」
AI 很容易一次產生很多 code。

先不要急著 click #Keep in VScode，先觀察思考清處：
```text
那些檔案修改了？觀察：
1. Event
2. Event listener 加在哪裡
3. 呼叫哪個 function
4. function 修改哪個 DOM element
5. 修改什麼 property / class / attribute
6. 思考為什麼這樣設計
```

都確認清楚再 click #Keep，同時也筆記摘要為何目的改動那些？作為後續commit message的參考。

## 12. AI Coding 第三個能力：限制修改範圍
例如你只是要新增一個按鈕互動。

Prompt 裡可以加入：
```text
限制：
- 不要修改 loadPageData()
- 不要修改 fetch()
- 不要修改 JSON format
- 不要改現有 Sidebar 行為
- 只新增必要 event handling
```

這種 constraint 非常重要。

因為 AI Coding 的問題通常不是「AI 不會寫」，

而是：
> AI 寫太多、改太多。

## 13. DOM 操作不用全背，但要知道有哪些種類
W05 不要求你把所有 API 背起來。先把 DOM change 分成幾種類型。

### 類型 1：改文字

```js
element.textContent = "新的文字";
```

Prompt 可以說：
```text
DOM Change：把 #message 的文字改成「完成」。
```

---

### 類型 2：改 CSS class

```js
element.classList.add("active");
element.classList.remove("active");
element.classList.toggle("active");
```

Prompt：
```text
DOM Change： click 後切換 active class。
```

### 類型 3：改 attribute

```js
element.setAttribute("aria-expanded", "true");
```

Prompt：
```text
DOM Change：Sidebar 打開時 aria-expanded=true，關閉時改回 false。
```

### 類型 4：隱藏 / 顯示

```js
element.hidden = true;
element.hidden = false;
```

Prompt：
```text
DOM Change：click 後顯示 detail panel。
```

### 類型 5：新增 element

```js
const item = document.createElement("li");
item.textContent = "New Item";
list.append(item);
```

Prompt：
```text
DOM Change：每次 click Add 時，建立新的 li，並 append 到 #todoList。
```

### 類型 6：清除 / 重新 Render

```js
container.replaceChildren();
```

再重新 append。

Prompt：
```text
DOM Change：重新 render 前先清空舊 cards。
```

## 14. Event 也不用全背，先認識常用類型
常見：
```text
click
input
change
submit
keydown
```

Prompt 裡直接用自然語言描述即可。例如：
```text
Event： 使用者 click Save button。
```

或 (e.g. auto-complete)：
```text
Event： 使用者在 search input 每次輸入文字時。
```

或 (e.g. submit)：
```text
Event： 使用者按下 Enter key。
```

AI 可以幫你轉成正確 event。

但你要檢查它轉成什麼。

## 15. 練習：先描述，不急著寫 code
假設你要加入：
> 點「帳號」後顯示 / 隱藏帳號選單。

先不要寫 JavaScript。

先寫：
```text
Event： accountButton click
Function： toggleAccountMenu()
DOM Change： accountMenu.hidden true / false; aria-expanded true / false

Expected UI：
第一次 click 打開，
第二次 click 關閉。
```

這已經完成 80% 的設計。剩下 syntax 可以讓 AI 協助。

## 16. 再把設計變成 Prompt
```text
請在目前 app.js 中加入 account dropdown interaction。

目前已經有 accountButton。
Event：accountButton click。
Function：請新增 toggleAccountMenu()。
DOM：假設 HTML 有 #accountMenu。
每次 click：
- 切換 accountMenu.hidden
- 同步更新 accountButton 的 aria-expanded

限制：
- 不要修改 Sidebar functions
- 不要修改 fetch / loadPageData
- 不要重寫整份 app.js

完成後：
請用 Event → Function → DOM Change 說明。
```
## 17. 修改既有功能時，Prompt 要先描述「現在怎麼做」
例如現在：
```text
Backdrop click → closeSidebar()
```

你想改成：
> Sidebar 裡面 click 不關閉，只有 backdrop click 才關。

可以問：
```text
目前 Sidebar 關閉方式包含：
1. sidebarClose click
2. sidebarBackdrop click

我要保留這兩個行為。
但請檢查是否有其他 click event
可能讓 sidebar 內部 click 也觸發關閉。
如果有，請只修 event propagation 相關部分。

完成後告訴我：
Event 原本如何傳遞？
修改後如何傳遞？
哪個 function 沒有改？
```

這種 prompt 已經接近實際 developer debugging。

## 18. Event → Function → DOM，是 Debugging 的方法

如果功能壞掉，可以從三段檢查。

### Step 1：Event 有沒有發生？

可以暫時：
```js
console.log("clicked");
```

如果沒有：
```text
可能 element 沒找對
可能 listener 沒綁上
可能 event 名稱錯了
```

### Step 2：Function 有沒有執行？
例如：
```js
function openSidebar() {
    console.log("openSidebar");
    ...
}
```

### Step 3：DOM 有沒有真的改變？
瀏覽器 DevTools → Elements 檢查：
```html
class="sidebar is-open"
```

有沒有出現。

因此 Debugging 可以想成：
```text
Event?
  ↓
Function?
  ↓
DOM Changed?
  ↓
CSS Result?
```

## 19. Prompt：請 AI 幫你 Debug，但不要直接重寫

推薦：
```text
這個互動目前沒有正常運作。

預期流程：
Event： #menuToggle click

Function： openSidebar()

DOM：#sidebar 應加入 is-open

請依序檢查：
1. element 是否取得成功
2. event listener 是否綁定
3. function 是否執行
4. class 是否真的加入
5. CSS 是否有對應 .is-open

不要先重寫程式。
請先指出是哪一層出錯。
```

這種 prompt 比：

```text
為什麼不能動？幫我修。
```

好很多。

## 20. 從 Function 名稱猜程式：AI Coding 很重要

看到：
```js
renderNavigation()
```

你可以先猜：
> 應該是負責顯示 navigation。

看到：
```js
createNavigationItem()
```

可以猜：
> 應該建立單一 navigation item。

看到：
```js
setActiveNavigation()
```

可以猜：
> 應該是改變 active 狀態。

看到：
```js
renderDashboardError()
```

可以猜：
> 應該在 dashboard 發生錯誤時顯示 UI。

這種能力比記 syntax 更重要。

因為 AI 產生的 code 可能有幾百行，

你不可能永遠逐行閱讀。

你要先看：
```text
Architecture
→ Function responsibility
→ Interaction flow
→ Detail
```

## 21. 建議閱讀 app.js 的順序
不要按照：

```text
line 1
line 2
line 3
...
```

推薦：
### 第一次：只看 Function 名稱
```text
loadPageData
readJson
renderNavigation
createNavigationGroup
...
```

猜它們的責任。

### 第二次：找啟動點
例如：
```js
loadPageData();
```

以及：
```js
addEventListener(...)
```

### 第三次：追一條流程
例如：
```text
menuToggle → click → openSidebar → classList.add
```

### 第四次：才看細節 syntax
例如：
```js
classList.add()
setAttribute()
```

這樣會比較有效率。

## 22. AI Coding 練習 1：加入 ESC Close
先寫需求：
```text
Event： keydown Escape
Function：closeSidebar()
DOM：沿用 closeSidebar() 原本操作
```

Prompt：
```text
目前 app.js 已有 closeSidebar()。
請新增：
使用者按 Escape 時關閉 Sidebar。
請優先沿用 closeSidebar()，
不要重複寫 remove class 的 code。
只顯示需要新增的 code。

最後用：
Event → Function → DOM
解釋。
```

## 23. AI Coding 練習 2：加入 Navigation Hover Preview
需求：
```text
Event： navigation item mouseenter
Function： showNavigationPreview(item)
DOM：更新 #preview 文字
```

Prompt：
```text
請幫 navigation-link 加入 preview interaction。

Event：mouseenter
Function：新增 showNavigationPreview(item)

DOM：把 item.label 顯示到 #preview

mouseleave 時清空。

請不要修改既有 click behavior。

完成後列出：
Event → Function → DOM
```
## 24. AI Coding 練習 3：Dashboard Card Click
需求：

```text
Event： dashboard card click
Function： selectDashboardCard()
DOM： 切換 is-selected
```

請學生先自己寫 Prompt，

再讓 AI 實作。

最後學生必須回答：
```text
listener 加在哪裡？
function 放在哪裡？
修改哪個 element？
修改哪個 class？
```

## 25. AI Coding 練習 4：Button 修改文字
需求：
```text
Event：click
Function：changeMessage()
DOM：#message.textContent
```

Prompt 範例：
```text
我要做一個最小 DOM interaction。

HTML 已有：
#changeButton
#message

Event：
changeButton click

Function：
changeMessage()

DOM：
把 #message 的 textContent 改成
「已完成更新」。

請只提供最小必要修改，
並說明 Event → Function → DOM。
```

## 26. AI Coding 練習 5：Toggle Detail Panel
需求：
```text
Event： click
Function：toggleDetail()
DOM：
detailPanel.hidden
button aria-expanded
```

這個練習重要的原因是：
> 同一個 interaction 可能需要同時改兩個 DOM state。

例如：
```text
Visual state：
hidden

Accessibility state：
aria-expanded
```

## 27. AI 產生 Code 後，學生要做 Code Review
每次 AI coding 都至少回答下面五題：
```text
1. Event 是什麼？
2. Listener 綁在哪個 DOM element？
3. 觸發哪個 function？
4. Function 修改哪些 DOM？
5. 這個修改是否影響其他既有功能？
```

如果答不出來，

代表：
> Code 雖然是 AI 寫的，但你還沒有真正掌握。

## 28. 建議 AI 回答格式

你可以要求 AI：
```text
每次修改完 JavaScript，
最後都請用這個格式摘要：

[Interaction]
Event:
Listener:
Function:
DOM target:
DOM change:
UI result:
Possible side effect:
```

例如：
```text
[Interaction]
Event:
click

Listener:
#menuToggle

Function:
openSidebar()

DOM target:
#sidebar
#sidebarBackdrop
#menuToggle

DOM change:
add is-open
add is-visible
aria-expanded=true

UI result:
Sidebar 顯示

Possible side effect:
需要 CSS 已定義 is-open / is-visible
```

這非常適合本課程後續使用。

## 29. 從 W05 開始建立 AI Coding 工作流程

推薦學生以後都用：
```text
1. Describe
2. Ask AI
3. Inspect
4. Run
5. Verify
6. Refine
7. Commit
```

### 1. Describe

先自己寫：
```text
Event
Function
DOM
Expected UI
```

### 2. Ask AI

請 AI 實作。

### 3. Inspect

不要直接接受。

檢查：

```text
改哪些檔？
改哪些 functions？
有沒有多改？
```

### 4. Run

在 Browser 執行。

### 5. Verify

確認：

```text
Event 有發生嗎？
Function 有執行嗎？
DOM 有變嗎？
UI 正確嗎？
```

### 6. Refine

例如要求：

```text
不要重複 code。
請沿用 closeSidebar()。
```

### 7. Commit

```bash
git add .
git commit -m "Add Escape key sidebar interaction"
git push
```

Commit message 要描述功能，

而不是：

```text
update
test
fix
```

## 30. 本週建議不要過度深入的內容

這支 `app.js` 已經有：

```js
fetch()
async
await
Promise
response.json()
try
catch
```

本週不要全部展開。

否則會同時混入：

```text
DOM
Event
Async
HTTP
API
CORS
```

初學者很容易失焦。

W05 先固定：

```text
Event
→ Function
→ DOM
```

下週再擴大。

## 31. W05 → W06

目前：

```text
User
 ↓
Event
 ↓
Function
 ↓
DOM
 ↓
UI
```

但目前的 UI 資料從哪裡來？

這支 app.js 已經有：

```js
fetch(...)
```

所以 W06 會把模型擴大成：

```text
User
 ↓
Event
 ↓
Function
 ↓
fetch()
 ↓
HTTP Request
 ↓
API
 ↓
JSON Response
 ↓
Function
 ↓
DOM
 ↓
UI
```

## 32. 下週新的問題

例如：

```js
fetch("http://localhost:8000/api/courses")
```

AI 幫你寫完，

但 Browser 出現：

```text
Blocked by CORS policy
```

這時候你不能只問：

```text
幫我修 CORS。
```

我們會學著問：

```text
Frontend origin 是什麼？
API origin 是什麼？
Request 有沒有送出去？
Server 有沒有回 response？
Browser 為什麼不讓 JavaScript 讀？
CORS header 是誰設定？
```

這會成為 W06 的 AI Coding 核心。

## 33. 本週 AI Prompt 作業

請從目前 `app.js` 選一個互動功能，讓 AI 幫你修改。

可以選：

```text
A. Escape 關閉 Sidebar
B. Dashboard Card selected state
C. Account dropdown 顯示 / 隱藏
D. Navigation hover preview
E. 自己設計一個 interaction
```

你的提交內容必須包含：

### 1. 原始需求

例如：

```text
我要讓 Escape 可以關閉 Sidebar。
```

### 2. 你給 AI 的 Prompt

必須包含：

```text
Event
Function
DOM
Expected UI
Constraints
```

### 3. AI 修改內容

只列必要 diff 或主要 code。

### 4. 你自己的解釋

必須寫：

```text
Event：
Function：
DOM：
UI Result：
```

### 5. 測試結果

例如：

```text
1. Sidebar closed 時按 Escape → 無明顯副作用
2. Sidebar open 時按 Escape → 成功關閉
3. Menu button 仍可正常 open
4. Close button 仍可正常 close
5. Backdrop 仍可正常 close
```

### 6. Git Commit

例如：

```bash
git commit -m "Add Escape key to close sidebar"
```

## 34. 本週最重要的不是 Syntax

如果你忘記：

```js
classList.toggle()
```

可以問 AI。

如果你忘記：

```js
addEventListener()
```

也可以問 AI。

但你一定要能說清楚：

```text
我要監聽什麼 Event？

Event 發生後做什麼？

哪個 Function 負責？

它要改哪個 DOM？

UI 最後應該變成什麼？
```

這才是 AI Coding 時真正不能外包給 AI 的部分。

## 35. W05 核心總結

本週不要把 JavaScript 學成：

```text
querySelector
createElement
append
classList
addEventListener
```

而是把它們放進同一個模型：

```text
Event
  ↓
Function
  ↓
DOM Change
  ↓
UI
```

面對 AI 產生的 code，也用同一個模型 review：

```text
這個 Event 從哪裡來？
       ↓
哪個 Function 被執行？
       ↓
哪個 DOM 被修改？
       ↓
畫面發生什麼變化？
```

## Next Week — W06 Fetch API / AJAX

W06 會在這個模型中插入網路：

```text
Event
 ↓
Function
 ↓
fetch()
 ↓
HTTP
 ↓
API
 ↓
JSON
 ↓
Function
 ↓
DOM
 ↓
UI
```

新的 AI Coding 問題會從：

```text
「按按鈕後怎麼改畫面？」
```

進一步變成：

```text
「按按鈕後怎麼向 API 要資料，
拿到 JSON 後再更新畫面？」
```

以及：

```text
「為什麼 API 明明正常，
fetch 卻被 Browser 的 CORS 擋下來？」
```

這就是 W05 到 W06 的銜接。

---

# W06 — Fetch API/AJAX {#FetchAPI}
OAuth串接外部 (Google Cloud) 公開API，注意CORS？fetch可能被瀏覽器擋下來？
- OAuth須要對應開發API串接
- 若只修Web Programming須注意API在哪實作，可以要求AI寫對應JS。

> 本週核心：延續 W05 的 `Event → Function → DOM`，加入網路請求：
> `Event → Function → fetch() → HTTP/API → JSON → DOM`

---

## 1. 本週學習目標

完成本週後，你應該能：

- 看懂 `fetch()` 如何向外部 API 取得資料。
- 知道 AJAX 為什麼不需要重新整理整個頁面。
- 知道 API 回傳 JSON 後如何更新 DOM。
- 分辨 HTTP error、OAuth / token error、CORS error。
- 知道為什麼 Postman / curl 成功，但 Browser `fetch()` 仍可能被擋。
- 能用 AI 協助串接 Google Cloud API，但知道哪些設定不能讓 AI 猜。

## 2. W05 → W06

W05：
> Event → Function → DOM → UI

W06：
> Event **→ Function → fetch() → HTTP Request → API → JSON Response** → Function → DOM → UI


## 3. Fetch範例 (後續應該使用try-catch)

```js
async function loadData() {
    const response = await fetch("https://example.com/api/items");

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
}
```

先理解三件事：
- fetch() → 送出 HTTP request
- response.ok → HTTP 是否成功
- response.json() → JSON 轉成 JavaScript data

## 4. AJAX 是什麼？
AJAX = Asynchronous JavaScript and XML。
- 不是程式語言，僅為技術概念。
- 現在實務上使用JSON取代XML。

可以把 AJAX 理解成：
> JavaScript 在背景向 Server/API 取得或送出資料，不必整頁重新載入。

例如：click Search → text → search() → fetch(API) → JSON → renderResults() → DOM 更新

## 5. AI Coding Prompt：串接 API
- 不要只問：幫我串 API
- 建議
> Page → DOM → Event (e.g.使用者click #searchButton) → Function：新增searchData() → API：使用fetch()GET指定API → JSON list data → DOM： render #results
Error處理：1. HTTP error; 2. Network error; 3. 空資料
限制：不要重寫現有 HTML / CSS，沿用目前 Event → Function → DOM 架構。

完成後：
- VScode trace codes: Event → fetch → API → JSON → DOM
- 理解並能解釋流程。

## 6. `async / await`
`fetch()`需要時間：
> Browser → Network → Server → Processing → Network → Browser

JS預設行為是async，因此 `await fun()` → 同步等到完成：
```js
const response = await fetch(url);
```

可以先理解為：
> 等非同步操作完成，再繼續使用結果。

## 7. HTTP Status 要檢查
`fetch()`執行完成，不代表 API 一定成功。

常見 status：
```text
200 OK
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Internal Server Error
```

因此建議，僅輸出狀態訊息，避免洩漏詳細錯誤codes：
```js
if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
}
```

## 8. 公開 API、API Key 與 OAuth
不是所有 API 都能直接呼叫。常見情況：
- Public API → 不需登入
- API Key → 辨識 application / project
- OAuth → 使用者授權 application 存取特定資料，get access token

不要混淆：**API Key ≠ OAuth Access Token**

## 9. OAuth 簡化流程
Google Cloud / Google APIs 常見概念：
> User → Google Login / Consent → OAuth → Access Token → fetch() → Google API → JSON

常見名詞，用「你做一個純HTML+CSS+JS的Google Calendar Viewer」來理解，會最直覺。
- Client ID：Google Cloud申請取得，e.g. 1234567890-abcdefg.apps.googleusercontent.com
- URI：Application範圍，e.g http://localhost:5500
- Redirect URI：OAuth後導向，e.g. http://localhost:5500/oauth/callback.html
- Scope：Application要求哪些權限？呼叫 API 時常見：e.g. https://www.googleapis.com/auth/calendar.readonly
```http
Authorization: Bearer ACCESS_TOKEN
```
```js
const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    }
);
```
- Access Token
- Refresh Token：Access Token過期後，用Refresh Token向Authorization Server換一張新的Access Token。
```http
Authorization: Bearer REFRESH_TOKEN
```

## 10. 不要把 Secret 放進 Frontend
> 這時，AI比菜鳥更不容易出錯！

不要要求 AI 把以下資訊直接寫進 `app.js`：
```text
Client Secret
Private API Secret
Service Account private key
Refresh Token
Database password
```

因為 Browser 端 JavaScript 使用者都可以看到。AI coding 時要先問：
```text
這個 credential 可以出現在 Browser 嗎？
還是應該放 Backend？
```

## 11. CORS (Cross-Origin Resource Sharing)
> 跨域請求、跨來源資源共享
假設：
- Frontend: http://localhost:5500
- API: https://api.example.com

兩者 Origin (scheme + host + port) 不同。例如：
```text
http://localhost:5500
http://localhost:8000
```
即使 host 都是 `localhost`，port 不同仍是不同 Origin。

## 12. 為什麼 Browser 會擋？
- Browser因資安要求，有Same-Origin Policy。
- 跨Origin時，Browser會依Server回傳的`CORS headers`決定JavaScript是否可以讀取response。

例如，API回傳以下host，就可以讓來自此host requests讀取：
```http
Access-Control-Allow-Origin: https://your-site.example
```

## 13. 最重要的 CORS 觀念
可能發生：
- curl     → 成功：curl (Client and URL) 不會替網頁URL執行Same-Origin Policy
- Postman  → 成功：不會替網頁URL執行Same-Origin Policy
- Browser  → CORS blocked

這不矛盾。因為 CORS 主要是 Browser 對網頁 JavaScript 執行的安全限制。

## 14. 常見誤解
- fetch() 壞掉了。實際可能是：Server 不允許目前 Origin。
- Frontend 加 Access-Control-Allow-Origin 就可以。通常不對。`Access-Control-Allow-Origin`主要應由 Server response 回傳。
- 把 Browser CORS 關掉就好了。只能作暫時測試，不是正式解法。

## 15. Preflight
某些跨 Origin request 在真正送出前，Browser 會先送：
```http
OPTIONS
```

稱為：
```text
Preflight Request
```

流程：
```text
Browser
↓
OPTIONS
↓
Server
↓
是否允許？
↓
真正的 GET / POST
```

W06 先知道概念即可。

## 16. AI Coding：遇到 CORS 怎麼問？
> 其實目前AI都會自行判斷是否為CORS問題

建議CORS問題：
```text
我的 Browser fetch() 發生 CORS error。
請不要先修改 code。
先幫我判斷：
1. Frontend origin 是什麼？
2. API origin 是什麼？
3. 是否 Cross-Origin？
4. Network 中 request 是否有送出？
5. 是否有 OPTIONS preflight？
6. Server response 有哪些 CORS headers？
7. 問題應修 Frontend、Backend、OAuth，還是 API console 設定？
最後再提出最小修改方式。
```

## 17. API Debug 建議順序
```text
1. URL 正確嗎？
2. HTTP method 正確嗎？
3. HTTP status 是多少？
4. response body 是什麼？
5. 是否需要 API key / OAuth token？
6. OAuth scope 正確嗎？
7. Browser Console 有 CORS error 嗎？
8. Network 有 OPTIONS request 嗎？
9. Server CORS headers 正確嗎？
```

不要看到：fetch failed，就讓 AI 整份重寫。

## 18. Google Cloud API 串接檢查
如果使用 Google API / OAuth，常見檢查流程：
```text
Google Cloud Project
↓
API 是否 Enabled
↓
OAuth Client 設定
↓
Authorized JavaScript Origin
↓
Authorized Redirect URI
↓
OAuth Scope
↓
取得 Access Token
↓
呼叫 API
```

AI 可以協助產生程式與解釋流程，但以下設定要依實際專案確認，不要讓 AI 猜：
```text
Client ID
Redirect URI
Enabled APIs
Scopes
Origins
```

## 本週實作與Debug紀錄

至少記錄一個：
```text
HTTP error
OAuth / token error
CORS
JSON format error
DOM render error
```

並說明你如何判斷是哪一層。

## AI Coding Review
AI 幫你串完 API 後，你必須回答：
```text
1. fetch() 在哪個 function？
2. 什麼 event 觸發它？
3. HTTP method 是什麼？
4. Authentication 怎麼提供？
5. Response 是什麼格式？
6. 哪個 function 處理 JSON？
7. 哪個 function 更新 DOM？
8. HTTP error 怎麼處理？
9. 是否 Cross-Origin？
10. 若出現 CORS，應去哪一層修？
```

---

## AI Coding
> AI 可以幫你寫 `fetch()`，但你必須知道 request 往哪裡去、帶了什麼權限、response 怎麼回來，以及 Browser 為什麼可能拒絕讓 JavaScript 讀取它。

### Google Cloud Console
- GMail > 認證信用卡才能開發
- Create Project > search "oauth"
- Google Auth Platform > 用戶端 > Input data
- Add URI: https://demo.wke.csie.ncnu.edu.tw
- Add Redirect URI: https://demo.wke.csie.ncnu.edu.tw/s115999999/api/auth/google/callback

> Header [(王) 王老師] 我要改成[登入]，click以gmail登入，登入後根據gmail資料顯示。**API部分先保留，我會後端寫FastAPI串接。**

- `GET api/auth/google/login`: begin Google OAuth and redirect the browser.
- `GET api/auth/me`: return the signed-in profile as JSON, for example `{ "name": "王老師", "email": "teacher@example.com", "picture": "https://..." }`.
- Return `401 Unauthorized` from `api/auth/me` when the visitor is not signed in. The frontend then keeps the sign-in link visible.

The frontend uses a same-origin session (`credentials: "same-origin"`). The backend must validate the Google identity and `email_verified` server-side, then manage the session with secure cookie attributes such as `HttpOnly`, `Secure`, and an appropriate `SameSite` policy. Do not put Google client secrets in browser code.

> click icon: pull down dialoug with two functions: Settings and Logout
```js
async function logout() {
    if (!window.confirm("確定要登出嗎？")) {
        return;
    }

    logoutButton.disabled = true;
    try {
        const response = await fetch(new URL("auth/logout", API_PATH), {
            method: "POST",
            credentials: "same-origin"
        });
        if (!response.ok) {
            throw new Error(`登出失敗：${response.status}`);
        }
        window.location.reload();
    } catch (error) {
        logoutButton.disabled = false;
        console.error("無法登出", error);
        window.alert("登出失敗，稍後再試");
    }
}
```

## F12 Trace Web Implementation
思考Google OAuth如何運作？
- ./api/auth/google/login
- 登入後
- Logout 
```js app.js
async function logout() {
    if (!window.confirm("確定要登出嗎？")) {
        return;
    }

    logoutButton.disabled = true;
    try {
        const response = await fetch(new URL("auth/logout", API_PATH), {
            method: "POST",
            credentials: "same-origin"
        });
        if (!response.ok) {
            throw new Error(`登出失敗：${response.status}`);
        }
        window.location.reload();
    } catch (error) {
        logoutButton.disabled = false;
        console.error("無法登出", error);
        window.alert("登出失敗，稍後再試");
    }
}

logoutButton.addEventListener("click", logout); 
```

## User's Navigation Menu
```prompt
Update loadPageData(): fetch teachers_ops.json改為 ./api/subclass/pcid/4`
取得items以render item.child_name，click -> fetch ./api/subclass/pcid/{cid}
icon可以照原來定義
```

- 注意 ./api/subclass 要登入後才可以取得資料
- 養成好習慣：**fetch都要寫try-catch**
```js app.js
async function loadPageData() {
    const navigationRequest = fetch(new URL("subclass/pcid/4", API_PATH), { credentials: "same-origin" }).then(readJson);
    const dashboardRequest = fetch(new URL("dashboard_cards.json", DATA_PATH)).then(readJson);

    try {
        const navigation = await navigationRequest;
        renderNavigation(getItems(navigation));
    } catch (error) {
        renderNavigationError(error);
    }

    try {
        const dashboard = await dashboardRequest;
        renderDashboard(dashboard.cards);
    } catch (error) {
        renderDashboardError(error);
    }
}
```

---

# W07 — 表單處理與前端輸入驗證 {#FormValidation}
XSS（跨站腳本攻擊）？具表單功能的頁面 + 基本驗證 

--- 

# W08 — OAuth 2.0 Login {#OAuth}
了解第三方登入的運作與優缺點 

---

# W09 — 使用者登入與token {#JWT}
JWT？伺服器「記得」卻不存session，登入防弊

---

# W10 — Session/Cookie狀態管理 {#Cookie}
Cookie vs. LocalStorage vs. SessionStorage；CSRF攻擊原理

---

# W11 — 專案整合與重構 {#Integration}
API限流、API Key/Secrets、功能完整度達80%以上

---

# W12 — 部署前資安檢查清單 {#Deployment}
HTTPS、環境變數、CORS、可公開存取的部署連結