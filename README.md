# WongNaii? 🍜

เว็บไซต์ค้นหา-สุ่ม-จับคู่กินข้าวร้านอร่อย ออกแบบสไตล์ **Liquid Glass UI** (Glassmorphism) รองรับ Dark/Light Mode

> **Stack:** Vanilla HTML/CSS/JS · Google Sheets (DB หลัก) · Google Apps Script (proxy ฝั่ง server) · Gemini 2.0 Flash (AI auto-fill) · GitHub Pages (host) · GitHub Actions (cron + deploy)

---

## โครงสร้างโปรเจกต์

```
wongnaii/
├── index.html                      ← หน้า Home (hero + marquee 3 แถว)
├── pages/                          ← หน้า All-Restaurants / Randomizer (รอบถัดไป)
├── assets/
│   ├── css/  base.css · glass.css · home.css
│   └── js/   config.js · theme.js · maintenance.js · api.js · marquee.js
├── apps-script/
│   ├── Code.gs                     ← วางใน script.google.com
│   └── appsscript.json
├── data/                           ← Secondary DB (เขียนโดย Apps Script, รีเซ็ตทุกอาทิตย์)
│   ├── likes.json
│   ├── parties.json
│   └── chats/
├── .github/workflows/
│   ├── deploy.yml                  ← Auto-deploy ไป GitHub Pages เมื่อ push main
│   └── weekly-reset.yml            ← Cron: ทุกอาทิตย์ 02:00 GMT+7 รีเซ็ตข้อมูลรอง
└── README.md                       ← (ไฟล์นี้)
```

---

## 🚀 คู่มือ Deploy แบบละเอียด (ภาษาไทย)

### 📋 สิ่งที่ต้องเตรียม

1. บัญชี **GitHub** (อันที่จะใช้ host)
2. บัญชี **Google** (อันที่เป็นเจ้าของ Google Sheet)
3. **Gemini API Key** จาก https://aistudio.google.com/apikey (ฟรี, ใช้ Gemini 2.0 Flash)
4. **Git** ติดตั้งบนเครื่อง

---

### STEP 1 — สร้าง GitHub Repo และ push โค้ดขึ้นไป

```powershell
# จาก folder โปรเจกต์ (C:\Users\3PSKub\Desktop\Food Discovery)
git init
git add .
git commit -m "Initial commit: WongNaii? scaffold"
git branch -M main

# สร้าง repo ใหม่บน GitHub ผ่าน CLI (หรือสร้างผ่านเว็บก็ได้)
gh repo create wongnaii --public --source=. --remote=origin --push
```

> ถ้ายังไม่ติดตั้ง `gh` CLI: ติดตั้งจาก https://cli.github.com/ แล้วรัน `gh auth login`
> หรือสร้าง repo ผ่าน https://github.com/new ชื่อ `wongnaii` แล้วทำ `git remote add origin ...` + `git push -u origin main`

---

### STEP 2 — เปิด GitHub Pages

1. ไปที่ repo → **Settings** → **Pages**
2. Source เลือก **"GitHub Actions"**
3. Workflow `deploy.yml` จะรันอัตโนมัติ ขั้นตอนนี้เสร็จ → ดูที่ tab **Actions**
4. หลัง deploy สำเร็จ URL จะเป็น `https://<your-username>.github.io/wongnaii/`

---

### STEP 3 — ตั้งค่า Google Apps Script (server-side proxy)

#### 3.1 สร้าง Apps Script project

1. เปิด https://script.google.com → **New project**
2. ลบไฟล์ `Code.gs` ตัวอย่างทิ้ง แล้วสร้างใหม่ชื่อ `Code.gs`
3. คัดลอกเนื้อหาจาก `apps-script/Code.gs` ในโปรเจกต์นี้มาวาง
4. คลิกไอคอน ⚙️ (Project Settings) → ติ๊ก **"Show appsscript.json manifest file"**
5. กลับไป tab Editor → เปิดไฟล์ `appsscript.json` → วางเนื้อหาจาก `apps-script/appsscript.json`

#### 3.2 ใส่ Script Properties (ตัวแปรลับฝั่ง server)

ที่ Project Settings → **Script Properties** → Add script properties ทีละตัว:

| Key | Value |
|---|---|
| `SHEET_ID` | `10zUQ6WGBaAuCFBgPUFhCRXMb5hVr4xwIxmgRK1Tsu5U` |
| `SHEET_TAB_NAME` | (ชื่อ tab ใน sheet — เว้นไว้ถ้าใช้ tab แรก) |
| `GEMINI_API_KEY` | `AIza...` (จาก aistudio.google.com) |
| `GITHUB_TOKEN` | Fine-grained PAT (ดูข้อ 3.3) |
| `GITHUB_OWNER` | ชื่อ user GitHub ของคุณ |
| `GITHUB_REPO` | `wongnaii` |
| `GITHUB_BRANCH` | `main` |

#### 3.3 สร้าง GitHub Fine-grained PAT (สำหรับให้ Apps Script เขียน data/*.json)

1. ไปที่ https://github.com/settings/personal-access-tokens/new
2. **Token name:** `wongnaii-apps-script`
3. **Expiration:** 90 วัน (renew เมื่อหมดอายุ)
4. **Repository access:** Only select repositories → เลือก `wongnaii`
5. **Permissions** → Repository permissions:
   - **Contents:** Read and write
   - **Metadata:** Read-only (auto)
6. Generate token → คัดลอกค่า `github_pat_...` มาใส่ที่ `GITHUB_TOKEN` ใน Script Properties

#### 3.4 Deploy Apps Script เป็น Web App

1. คลิก **Deploy** → **New deployment**
2. ⚙️ ข้าง "Select type" → **Web app**
3. ตั้งค่า:
   - **Description:** WongNaii API v1
   - **Execute as:** Me (อีเมลคุณ)
   - **Who has access:** **Anyone**
4. คลิก **Deploy** → กดอนุญาตสิทธิ์ตามที่ Google ขอ (จะมี warning หน้าจอ "Google hasn't verified this app" → คลิก Advanced → Go to ... )
5. คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

#### 3.5 ใส่ URL กลับเข้าโปรเจกต์

แก้ `assets/js/config.js` บรรทัด `APPS_SCRIPT_URL`:

```js
APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec",
```

แล้ว commit + push:

```powershell
git add assets/js/config.js
git commit -m "config: wire up Apps Script web app URL"
git push
```

GitHub Actions จะ deploy ใหม่ให้อัตโนมัติภายใน ~1 นาที

---

### STEP 4 — ตรวจสอบว่าทุกอย่างทำงาน

1. เปิด `https://<your-username>.github.io/wongnaii/`
2. ควรเห็น hero "WongNaii?" + marquee ของร้านจริงจาก Google Sheet
3. ลองเปลี่ยน Dark/Light mode ที่ปุ่มมุมขวาบน
4. เปิด DevTools → Console — ถ้าเห็น `[WongnaiiAPI] APPS_SCRIPT_URL not configured` แสดงว่ายังไม่ได้แก้ STEP 3.5

---

## 🗓️ Weekly Reset & Maintenance Window

| เวลา (GMT+7) | สิ่งที่เกิดขึ้น |
|---|---|
| ทุกอาทิตย์ **01:30** | Frontend แสดงหน้า "🛠️ กำลังปิดปรับปรุง" อัตโนมัติ (ตรวจจาก wall-clock ในเบราว์เซอร์) |
| ทุกอาทิตย์ **02:00** | GitHub Actions รัน `weekly-reset.yml` → เคลียร์ `likes.json`, `parties.json`, `chats/*` |
| ทุกอาทิตย์ **02:15** | Frontend ปลด maintenance อัตโนมัติ ใช้งานได้ตามปกติ |

> Cron ใน `weekly-reset.yml` ใช้ UTC: `0 19 * * 6` = เสาร์ 19:00 UTC = อาทิตย์ 02:00 Bangkok
> 
> ⚠️ **GitHub Actions cron จะ delay 5–15 นาที** ในช่วงที่ traffic สูง — ถ้าต้องการตรงเวลาเป๊ะ ใช้ external scheduler เช่น cron-job.org ยิง `workflow_dispatch` แทน

---

## 🧪 รัน Local แบบไม่ต้อง deploy

```powershell
# ใช้ Python ที่ติดมากับเครื่อง
python -m http.server 5173
# หรือ
npx serve .
```

แล้วเปิด http://localhost:5173

> หมายเหตุ: ถ้ายังไม่ได้ตั้งค่า `APPS_SCRIPT_URL` หน้า marquee จะใช้ข้อมูล placeholder

---

## 🔒 Security model

- **ไม่มี secret ใดๆ ใน frontend** — browser ติดต่อแค่ Apps Script URL (ซึ่ง public ได้)
- **GITHUB_TOKEN, GEMINI_API_KEY เก็บใน Apps Script Script Properties** (server-side, ไม่ติดออกมาใน build)
- **PAT scope แคบที่สุด** — Contents:write ของ repo เดียวเท่านั้น

---

## 📝 To-do (รอบถัดไป)

- [ ] หน้า `pages/all-restaurants.html` — filters + 3×4 card grid + pagination + sort
- [ ] หน้า `pages/randomizer.html` — Akinator-style 7 คำถาม
- [ ] Modal "Add Restaurant" + AI auto-fill flow
- [ ] Party Creator + 15-min countdown + Chat
- [ ] Party Seeker list

---

ใครอ่านมาถึงตรงนี้ — ขอให้กินอร่อยทุกมื้อ 🧡
