# Web Programming實作教學

> **課程定位**：Web Programming · 12週漸進式實作
> **教學理念**：讓AI輔助你【學會了】，不是【學廢了】
> **完成後你會有**：一個公開網址上跑得起來的Web App，一個乾淨的GitHub repo，以及一套「用AI協作開發前端」的完整流程經驗。

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
- [ ] 專案資料夾建在`code`下，VSCode能開啟
- [ ] `.gitignore`是第一個建立的檔案
- [ ] `git log --oneline`看得到你的第一個commit
- [ ] GitHub上看得到你的repo與README

## 🎯 延伸練習

1. 用`git log --oneline --graph`觀察歷史
2. 故意修改README，用`git diff`看差異，再commit
3. 查一下：`git add .` 跟 `git add -A` 有什麼差別？

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