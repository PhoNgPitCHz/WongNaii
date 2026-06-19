# WongNaii? — Prompt Log

บันทึก request ทั้งหมดทุก session เรียงตามลำดับเวลา

---

## Session 1 — สร้างโปรเจกต์ตั้งแต่ต้น

---

### [S1-1] สร้างโปรเจกต์ทั้งหมดจาก Brief

**Request:**
> Act as a Senior UX/UI Designer and Full-Stack Web Developer...
>
> สร้าง web app ชื่อ **"WongNaii?"** โดยมี requirement ดังนี้:
> - Design Style: Apple's "Liquid Glass UI" (Glassmorphism) + Dark/Light Mode toggle
> - **หน้าแรก:** Hero section + Marquee 3 แถว (แถว 1&3 เลื่อนซ้าย, แถว 2 เลื่อนขวา, pause on hover) + ปุ่ม 2 ปุ่ม
> - **หน้า All-Restaurants:** Filter (Zone/Food Type/Group Size) + Card Grid 3×4 + Pagination + Sort + Like button + "เริ่มหาเพื่อนกินข้าว" + Add Restaurant (AI auto-fill)
> - **หน้า Randomizer:** Akinator-style 7 คำถาม → แสดงร้านที่ match
> - **Party System:** Creator (15-min countdown) + Seeker (list of active parties) + Dashboard + Chat
> - **Infrastructure:** GitHub Pages + GitHub Actions (deploy + weekly-reset) + Maintenance Mode (01:30–02:15 GMT+7) + Google Apps Script (Gemini auto-fill + Sheet proxy)
> - Deployment guide เป็นภาษาไทย

**ไฟล์ที่สร้าง:**
- `index.html` — หน้าแรก
- `pages/all-restaurants.html` — หน้า All-Restaurants
- `pages/randomizer.html` — หน้า Randomizer
- `assets/css/base.css` — design tokens, typography, layout
- `assets/css/glass.css` — Liquid Glass primitives (card, button, input, modal, pill)
- `assets/css/home.css` — hero, marquee
- `assets/css/all-restaurants.css` — filters, cards, pagination
- `assets/css/party.css` — party modal, chat, bubble
- `assets/css/randomizer.css` — quiz UI
- `assets/js/config.js` — APPS_SCRIPT_URL, maintenance config
- `assets/js/api.js` — WongnaiiAPI (fetch wrapper สำหรับทุก action)
- `assets/js/identity.js` — WongnaiiIdentity (localStorage userId/name)
- `assets/js/theme.js` — dark/light toggle
- `assets/js/maintenance.js` — maintenance gate
- `assets/js/marquee.js` — home marquee 3 แถว
- `assets/js/all-restaurants.js` — filter, sort, render cards, party hooks
- `assets/js/party.js` — Party creator/seeker/dashboard/chat (polling 3s)
- `assets/js/randomizer.js` — quiz logic
- `apps-script/Code.gs` — Apps Script: listRestaurants, submitRestaurant (Gemini), toggleLike, getLikes, createParty, joinParty, closeParty, listParties, postMessage, getMessages
- `.github/workflows/deploy.yml` — GitHub Pages deploy
- `.github/workflows/weekly-reset.yml` — reset likes/parties/chats ทุกอาทิตย์ + maintenance gate
- `README.md` — deployment guide ภาษาไทย step-by-step

**หมายเหตุทางเทคนิค:**
- ข้อมูล secondary (likes, parties, chats) เก็บเป็น JSON files ใน repo ผ่าน GitHub Contents API
- Gemini auto-fill ใช้ model fallback list เพื่อรองรับ 429
- Marquee ใช้ CSS `mask-image` fade ขอบซ้าย-ขวา + duplicate content สำหรับ seamless loop
- Party chat polling ทุก 3 วิ

---

### [S1-2] User อนุมัติ plan

**Request:**
> ผมชอบแล้วจัดการต่อได้เลยครับ

Claude เริ่มสร้างโค้ดทั้งหมด

---

### [S1-3] ถาม deployment — appsscript.json

**Request:**
> 5. กลับไป tab Editor → เปิดไฟล์ `appsscript.json` → วางเนื้อหาจาก `apps-script/appsscript.json` คือวางใต้ Code.gs เลยใช่ไหม

**ตอบ:** `appsscript.json` คือ manifest file ของ Apps Script ไม่ใช่ไฟล์ที่วางใต้ Code.gs — ต้องวางแทนที่ไฟล์ที่มีอยู่ใน Apps Script project (ต้องเปิด "Show manifest file" ใน Settings ก่อน)

---

### [S1-4] ถาม deployment — Script Properties

**Request:**
> #### 3.2 ใส่ Script Properties (ตัวแปรลับฝั่ง server) คือตรงไหนนะคับ

**ตอบ:** ไป Apps Script → Project Settings (ไอคอนเฟือง) → Script Properties → เพิ่ม key-value ทีละตัว (SHEET_ID, GEMINI_API_KEY, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH)

---

### [S1-5] GitHub ขึ้น 404 หลัง deploy

**Request:**
> ตอนนี้ผมทำถึงขั้นตอนที่ 4 แล้ว แต่ github ยังขึ้น 404 ถือว่าปกติไหม

**ตอบ:** ปกติครับ — GitHub Pages ใช้เวลา 1–3 นาทีหลัง Actions รัน และต้องเปิด Pages ใน repo Settings ก่อน (Source: GitHub Actions) ถ้า Actions ยังไม่เคยรันเลยก็ต้องรอหรือ trigger manual

---

### [S1-6] Troubleshooting การ deploy (screenshots หลายรอบ)

**Request:** (screenshots หลายรูประหว่าง troubleshoot GitHub Actions + Pages)
- Actions tab ไม่มี workflow แสดง → ต้องตรวจสอบว่า push ไฟล์ `deploy.yml` เข้า `.github/workflows/` แล้วหรือไม่
- PowerShell error ระหว่าง push
- Actions มีแต่ยัง pending
- หน้าเว็บขึ้นแล้วแต่ยัง 404 บางหน้า
- ยืนยันว่าเข้าใช้งานได้แล้ว

---

### [S1-7] Bug fix รอบใหญ่ (5 bugs)

**Request:**
> สามารถใช้งานได้แล้วคับ แต่มี Bug อยู่พอสมควร
>
> - ตอนเพิ่มร้านมันมี Error: Gemini 429 (RESOURCE_EXHAUSTED) — `gemini-2.0-flash` quota หมด
> - ตอนใช้ Dark Mode ตัวอักษรจม ฝากแก้ไขหน่อยครับ
> - หน้าแรก marquee 3 แถว ใน Preview วิ่งกำลังพอดี พออัปขึ้นดันความเร็วสูงมาก แก้ให้ช้าลง 50%
> - ตอนที่หัวตี้เริ่มแชท ฝั่งลูกตี้ไม่โชว์แชทด้วย ฝากแก้ทีครับ
> - ตอนที่หัวตี้เริ่มแชท และฝั่งลูกตี้ สามารถซ่อนหน้าต่างแชทไปดูร้านอื่น ๆ ได้ ฝากแก้ทีครับ

**ไฟล์ที่เปลี่ยน:**
- `apps-script/Code.gs` — เพิ่ม Gemini model fallback list (`GEMINI_MODELS` property) ลอง model ถัดไปเมื่อได้ 429 หรือ 404
- `assets/css/base.css` / `glass.css` — แก้ dark mode color contrast (input text, select option, placeholder)
- `assets/js/marquee.js` — ลด speed 50% (duration ×2): `70s→140s`, `90s→180s`, `80s→160s`
- `assets/js/party.js` — แก้ chat sync: seeker ได้รับ messages ทันทีเมื่อ host เปิด dashboard, เพิ่มปุ่ม minimize (ย่อเป็น floating bubble) ให้ทั้ง host และ seeker

---

### [S1-8] เปลี่ยน Gemini model

**Request:**
> เปลี่ยนจาก 2.5 flash เป็น 3.5 flash ได้นะ ฟรีเหมือนกัน ฉลาดกว่าด้วย

**ไฟล์ที่เปลี่ยน:**
- `apps-script/Code.gs` — เปลี่ยน default model list ให้ขึ้นต้นด้วย `gemini-3.5-flash`

---

## Session 2 — Features เพิ่มเติม

---

### [S2-1] เพิ่ม 5 features ในหน้า All-Restaurants

**Request:**
> - เพิ่มหาชื่อร้านในโซน Setting
> - เพิ่มร้านอาหาร Top 5 ของแต่ละพื้นที่ อยู่หัวโซน Setting
> - เพิ่มตัวเลขใต้หัวใจ ว่ามีคนกดใจแล้วกี่คน
> - เพิ่มเรียงตามกดหัวใจ
> - เปลี่ยนประเภทอาหารในโซน Setting เป็นประเทศแทน เช่น ไทย/ญี่ปุ่น/เกาหลี

**ไฟล์ที่เปลี่ยน:**
- `pages/all-restaurants.html` — เพิ่ม `#filter-name` input, เปลี่ยน label "ประเภทอาหาร" → "ประเทศ" / "ทุกประเทศ", เพิ่ม `#top5-strip`, เพิ่ม sort option `likes-desc`
- `assets/js/all-restaurants.js` — เพิ่ม name filter + likes-desc sort, เพิ่ม `renderTop5()`, เพิ่ม `.r-heart-wrap` แสดง like count ใต้หัวใจ
- `assets/css/all-restaurants.css` — เพิ่ม `.r-heart-wrap`, `.r-heart-count`, `.ar-top5` + related classes

**หมายเหตุทางเทคนิค:**
- Top 5 เรียงตาม likes → rating, อัปเดตเมื่อเปลี่ยน zone filter
- like count ซ่อนเมื่อ = 0

---

### [S2-2] Top 5 strip เปลี่ยนเป็น marquee ไหล

**Request:**
> ตัวร้านอาหาร top 5 ฝากปรับให้เป็นเหมือน marquee ไหล ๆ เหมือนหน้าเว็บ ส่วนขอบซ้าย-ขวา เป็นแบบ Fade หน่อยครับ

**ไฟล์ที่เปลี่ยน:**
- `assets/css/all-restaurants.css` — เปลี่ยน `.ar-top5__row` จาก `overflow-x: auto` เป็น `overflow: hidden` + `mask-image` fade ซ้าย-ขวา 8%, เพิ่ม `.ar-top5__track` + `@keyframes ar-top5-scroll`, pause on hover
- `assets/js/all-restaurants.js` — wrap chips ใน `<div class="ar-top5__track">`, duplicate `${chips}${chips}` สำหรับ seamless loop

**หมายเหตุทางเทคนิค:**
- ใช้ technique เดียวกับ home marquee: content render 2 รอบ, animate `translateX(-50%)` เพื่อ loop seamless
- Duration 28s, pause เมื่อ hover

---

### [S2-3] อัปโหลดไม่สำเร็จ (git rejected)

**Request:** (screenshot ของ terminal แสดง `! [rejected] main -> main (fetch first)`)

**ตอบ:** Push ไม่สำเร็จ — remote มี commit ใหม่ที่เครื่องยังไม่มี ต้องรัน `git pull --rebase && git push`

---

### [S2-4] ปรับความเร็ว home marquee ช้าลง 65%

**Request:**
> หน้าแรก marquee 3 แถวยังเร็วอยู่ครับ ฝากให้มันช้าลงสัก 65% ได้ไหม

**ไฟล์ที่เปลี่ยน:**
- `assets/js/marquee.js` — `140s → 231s`, `180s → 297s`, `160s → 264s` (×1.65)

---

### [S2-5] ปรับความเร็ว marquee อีกครั้ง (manual values)

**Request:**
> ยังเร็วอยู่ ขอเป็นแบบนี้ได้ไหม: 231s > 400s / 297s > 450s / 264s > 500s

**ไฟล์ที่เปลี่ยน:**
- `assets/js/marquee.js` — `231 → 400`, `297 → 450`, `264 → 500`

---

### [S2-6] แก้ bug แชท messages ซ้ำ

**Request:**
> แชทนี้มันอาจจะบัค เพราะต่างฝั่งต่างพิมพ์แค่ 1 ครั้ง แต่มันเด้งไป 2-3 ครั้ง

**Root cause:**
Submit form เรียก `refreshMessages()` manual ทันที ขณะที่ `setInterval` ทุก 3 วิก็อาจ fire พอดีกัน ทั้งสอง request ส่งด้วย `lastMsgTs` ค่าเดิม → ได้ messages ชุดเดิมกลับมา 2 ครั้ง → `appendMessages()` ถูกเรียกซ้ำ

**ไฟล์ที่เปลี่ยน:**
- `assets/js/party.js` — เพิ่ม `session.seenMsgKeys` (Set) ใน `refreshMessages()` ทุก message filter ด้วย composite key `${ts}:${userId}:${message}` ก่อน append

---

### [S2-7] Zone Dropdown + Close-on-Submit + Gemini Verify + Toast

**Request:**
> - ในหน้าเพิ่มร้าน ให้เพิ่ม Dropdown สำหรับเลือกโซนที่มีอยู่ 5 โซน (อโศก, สยาม, อารีย์, ทองหล่อ, พร้อมพงษ์)
> - ตอนที่ผู้เล่นกรอกเพิ่มร้าน แล้วกดตกลงแล้ว ให้ผู้เล่นสามารถกดออก Popup ได้เลย ไม่ต้องรอเพิ่มจนเสร็จ
> - ให้ Gemini หาข้อมูลก่อน ว่าเป็นร้านที่มีอยู่จริงหรือป่าวในโซนที่เลือก ถ้าไม่มีอยู่จริง ให้ Cancel
> - ให้ขึ้นแจ้งเตือนเป็น Icon จดหมายด้านล่าง ว่าการเพิ่มร้านสำเร็จ หรือผิดพลาด

**ไฟล์ที่เปลี่ยน:**

`pages/all-restaurants.html`
- เพิ่ม `<select id="f-zone">` 5 ตัวเลือก (required)
- ลบ `<div class="add-form-status">` ออก (ย้ายไป toast)
- เปลี่ยน submit button text → "ส่งข้อมูล"
- เพิ่ม `<div id="toast-container" class="toast-container">`

`assets/js/all-restaurants.js`
- Submit handler: ปิด modal + reset form ทันที, ส่ง API ใน background
- เพิ่ม `showToast(type, message, duration)` — toast พร้อม auto-dismiss + click-to-close
- Payload เพิ่ม `area`
- Toast flow: info "กำลังตรวจสอบ…" → dismiss → success/error toast

`assets/css/all-restaurants.css`
- เพิ่ม `.toast-container`, `.toast`, `.toast--success/error/info`
- Animation `toast-in` (spring bounce) + `toast-out`

`apps-script/Code.gs`
- `geminiAutoFill`: prompt เพิ่ม STEP 1 — Gemini ตรวจสอบว่าร้านมีจริงในย่านนั้น → ตอบ `"verified": "yes"/"no"`
- หลัง parse: ถ้า `verified === "no"` → throw error ภาษาไทย
- `delete parsed.verified` ก่อน return
- เพิ่ม `if (p.area) parsed["Area"] = p.area` — force zone ที่ user เลือก

**หมายเหตุทางเทคนิค:**
- Code.gs ต้อง re-deploy ใน Apps Script ทุกครั้งที่แก้
- Gemini อาจ false-positive/negative ได้บ้างสำหรับร้านที่เพิ่งเปิดหรือไม่ดังมาก

---

### [S2-8] สร้าง Prompt Log

**Request:**
> ฝากทํา Prompt Log เป็นไฟล์ .md ให้หน่อยครับ

**ไฟล์ที่สร้าง:**
- `PROMPT_LOG.md` — บันทึก request ทุก session นี้

---

### [S2-9] แก้ Prompt Log ให้ละเอียดเท่ากันทุก session

**Request:**
> Prompt Log ของ Session ก่อนหน้าไม่ต้องสรุป ทำเป็นเหมือนกับ Session ปัจจุบัน เลย

อ่าน JSONL transcript จาก session ก่อนหน้า แล้ว rewrite `PROMPT_LOG.md` ให้ครบทุก entry

---

## Session 3 — SPA Merge + Score Columns

---

### [S3-1] รวมหน้า All-Restaurants + Randomizer เข้า index.html เป็น SPA

**Request:**
> มีสิ่งที่ต้องแก้ไขอยู่ ตามรายการนี้:
> - รวมหน้า All-Restaurants และ Randomizer เข้ากับหน้าแรก index.html เลย (Single Page)
> - ให้ Marquee chip กดได้ แล้วขึ้น Popup รายละเอียดร้าน
> - ให้ Top 5 chip กดได้ แล้วขึ้น Popup รายละเอียดร้าน
> - ให้การ์ดร้านอาหารกดที่ตัวการ์ดได้ แล้วขึ้น Popup รายละเอียดร้าน
> - เพิ่ม normalization ประเภทอาหาร เช่น อาหารไทยพรีเมี่ยม → อาหารไทย
> - จัดตัวอักษรให้อยู่กึ่งกลาง
> - เปลี่ยน Hero text เป็น "หิวหรอ? กินอะไรดี! — ให้เราช่วยตัดสินใจ 🍜"

**ไฟล์ที่เปลี่ยน:**

`index.html`
- Rewrite เป็น SPA: hero → marquee → `#section-restaurants` → `#section-randomizer`
- เพิ่ม CSS: `all-restaurants.css`, `randomizer.css`
- เพิ่ม JS: `identity.js`, `restaurant-detail.js`, `party.js`, `all-restaurants.js`, `randomizer.js`
- Hero buttons: `<a href="#section-restaurants">` และ `<a href="#section-randomizer">`
- เพิ่ม `#party-modals`, `#toast-container`, add-restaurant modal
- Title: "WongNaii? - หิวหรอ? กินอะไรดี! — ให้เราช่วยตัดสินใจ 🍜"

`assets/js/restaurant-detail.js` (สร้างใหม่)
- Shared popup module: `window.WongnaiiDetail = { show, close }`
- `show(r)`: สร้าง modal ผ่าน `getOrCreate()`, populate ด้วย `buildHtml(r)`, เปิดผ่าน `is-open` class
- ไม่มีปุ่ม "สุ่มใหม่" (ต่างจาก randomizer result)
- Wire `#detail-party-btn` → `WongnaiiParty.openCreator(r)` ทุกครั้งที่ show

`assets/js/api.js`
- เพิ่ม `window.normalizeFoodType(t)` global: map Thai food type strings ให้เป็น parent category
  - อาหารไทยพรีเมี่ยม → อาหารไทย, ซูชิ/ราเมง → อาหารญี่ปุ่น, ฯลฯ

`assets/js/marquee.js`
- `chip(r)` เพิ่ม `el.dataset.rid = r.id || r.name`, `role="button"`, `cursor: pointer`
- Click event delegation: find `.marquee-chip[data-rid]` → lookup restaurant → `WongnaiiDetail.show(r)`

`assets/js/all-restaurants.js`
- Card click (body, ไม่ใช่ action buttons) → `WongnaiiDetail.show(restaurant)`
- Top5 chip click → `WongnaiiDetail.show(r)`
- `normFT = window.normalizeFoodType || ((t) => t)` ใน filter และ buildFilterOptions
- Null check: `if (!els.grid) return;`

`assets/js/randomizer.js`
- Null check: `if (!stepEl || !progressEl) return;`
- ตรวจสอบ `window.WongnaiiDetail`: ถ้ามี (home page) → show popup + mini "สุ่มใหม่" state, ถ้าไม่มี → inline result
- foodType question: ใช้ `normFT` normalizer

`assets/css/home.css`
- `html { scroll-behavior: smooth }`
- `#section-restaurants, #section-randomizer { scroll-margin-top: 72px }`
- ลด section padding เพื่อลด whitespace

**หมายเหตุทางเทคนิค:**
- `window.WongnaiiDetail` เป็น global shared module ทำให้ marquee, top5, card, randomizer ทุกส่วนใช้ popup เดียวกัน
- Scroll anchors ใช้ `scroll-margin-top: 72px` รองรับ sticky header

---

### [S3-2] แก้ spacing + popup ใหญ่เกิน

**Request:**
> - ตอนนี้เมื่อกดปุ่ม 'ดูร้านอาหารทั้งหมด' กับ 'สุ่มร้านตามคำถาม' แล้วมันมีช่องว่างข้างบนเยอะไป ช่วยปรับให้มันอยู่ชิดก่อนถึง Header
> - หน้าสุ่มร้านตามคำถาม ข้อความ 'ตอบคำถาม แล้วเราจะเลือกร้านให้คุณ' กับเส้นคำถามมันห่างกันเกินไป ให้มันชิดกันนิดนึง
> - หน้าสุ่มร้านตามคำถามฝากย่อ Pop-up หลังจากตอบคำถามทั้งหมดแล้ว มันใหญ่เกินไป

**ไฟล์ที่เปลี่ยน:**

`assets/css/home.css`
- `.section-block { padding-top: var(--space-4) }` (ลดจาก 5rem)
- `.section-block .ar-header { padding-top: 0 }`
- `.section-block .quiz { padding-top: var(--space-4) }`

`assets/js/randomizer.js`
- `renderResult()`: ถ้า `window.WongnaiiDetail` มี → show popup (compact) แทน inline result ขนาดใหญ่

---

### [S3-3] เปลี่ยน Preview title

**Request:**
> ตอนนี้ Preview ของเว็บไซต์เป็น 'WongNaii? - หิวอะไรดีวันนี้' ฝากแก้เป็น 'หิวหรอ? กินอะไรดี! — ให้เราช่วยตัดสินใจ 🍜'

**ไฟล์ที่เปลี่ยน:**
- `index.html` — `<title>` และ `<meta property="og:title">` เปลี่ยนเป็น "หิวหรอ? กินอะไรดี! — ให้เราช่วยตัดสินใจ 🍜"

---

### [S3-4] เพิ่ม prefix "WongNaii?" ใน title

**Request:**
> แก้ Title ใหม่อีกรอบ แก้เป็น 'WongNaii? - หิวหรอ? กินอะไรดี! — ให้เราช่วยตัดสินใจ 🍜'

**ไฟล์ที่เปลี่ยน:**
- `index.html` — `<title>` → "WongNaii? - หิวหรอ? กินอะไรดี! — ให้เราช่วยตัดสินใจ 🍜"

---

### [S3-5] แก้ Dropdown ขยายตอน hover + Group size ล้น row

**Request:**
> - ส่วนร้านอาหารทั้งหมด ตัว Dropdown 'ประเทศ' เวลาเลื่อนเมาส์ ตัว Dropdown มันขยาย ทำให้มันไม่ขยายที
> - ส่วนร้านอาหารทั้งหมด ตัวจำนวนคน ฝากปรับให้อยู่บรรทัดเดียวกันที เพราะตอนนี้ +10 อยู่บรรทัดล่าง

**Root cause Dropdown:**
`.glass-card:hover { transform: translateY(-2px) }` ยก filter panel ทั้งชิ้นขึ้น → filter panel เป็น glass-card ด้วย → hover ทำให้ "ขยาย" ในสายตา

**ไฟล์ที่เปลี่ยน:**
- `assets/css/all-restaurants.css`
  - `.ar-filters { transform: none !important }` — ปิด glass-card hover lift สำหรับ filter panel
  - `.ar-group-sizes { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none }` — ปุ่มทุกตัวอยู่แถวเดียว
  - `.ar-group-sizes button { flex-shrink: 0; padding: 6px 11px; font-size: 0.85rem }`

---

### [S3-6] ย้ายปุ่ม "เพิ่มร้าน" มาข้าง Dropdown เรียงตาม

**Request:**
> เอาปุ่มเพิ่มร้านในหน้า 'ร้านอาหารทั้งหมด' อยู่ข้าง ๆ Dropdown 'เรียงตามให้หน่อยครับ'

**ไฟล์ที่เปลี่ยน:**
- `assets/css/all-restaurants.css` — `.ar-top-actions { flex-wrap: nowrap }` — sort dropdown + ปุ่มเพิ่มร้านอยู่แถวเดียวกัน

---

### [S3-7] ถามว่าดึงข้อมูลจาก Google Sheet ไฟล์ไหน

**Request:**
> อันนี้เป็นคำถาม ผมให้คุณดึงข้อมูลร้านอาหารจาก Google Sheet ไฟล์ไหนคับ

**ตอบ:** ดึงจาก Google Sheet ที่ระบุใน Script Properties `SHEET_ID` ของ Google Apps Script — อ่านผ่าน `SpreadsheetApp.openById(sheetId)` ใน Code.gs ฟังก์ชัน `listRestaurants()` ครับ ถ้า Apps Script ยังไม่ configured จะ fallback มาดึง CSV จาก `SHEET_CSV_FALLBACK` URL ใน config.js แทน

---

### [S3-8] เพิ่ม Score Columns (AE–AK)

**Request:**
> ตอนนี้ในชีทข้อมูลมีเพิ่มข้อมูลใหม่มาคือ:
> - AE: "Rating & Review Quality (คุณภาพคะแนนและรีวิว)" — max 25
> - AF: "Group Suitability (ความเหมาะกับกลุ่ม)" — max 20
> - AG: "Price Suitability (ความเหมาะของราคา)" — max 15
> - AH: "Travel Convenience (ความสะดวกการเดินทาง)" — max 15
> - AI: "Data Completeness (ความครบของข้อมูล)" — max 15
> - AJ: "Uniqueness / Experience (ความพิเศษ/ประสบการณ์)" — max 10
> - AK: "คะแนนรวม" — ผลรวม = max 100
>
> สิ่งที่ต้องเพิ่ม:
> - เอาคะแนนรวมจากคอลัมพ์ AK ไปใส่ในการ์ดร้านอาหาร บริเวณที่อยู่ใกล้กับปุ่มหัวใจ โดยให้หัวใจอยู่ใต้คะแนน
> - ในหน้าร้านอาหารทั้งหมด เมื่อกดเข้าร้านใดร้านหนึ่ง หรือตอนที่สุ่มร้านได้ ให้แสดงคะแนนรวมอยู่ใต้ชื่อร้านอาหาร
> - ให้แสดงบาร์คะแนนของคอลัมพ์ AE ถึง AJ อยู่บริเวณเหนือ 🍽️ เมนูแนะนำ
> - ตอนที่เพิ่มร้านอาหาร ให้คำนวนคะแนนของคอลัมพ์ AE ถึง AJ ด้วย

**ไฟล์ที่เปลี่ยน:**

`assets/js/api.js`
- `normalize()`: เพิ่ม 7 score fields (`ratingQuality`, `groupSuitability`, `priceSuitability`, `travelConvenience`, `dataCompleteness`, `uniqueness`, `totalScore`)
- เพิ่ม `window.buildScoreBars(r)` global: สร้าง HTML score bars จาก AE–AJ, filter bars ที่ value เป็น null หรือ 0 ออก
- เพิ่ม `window.normalizeFoodType(t)` global (moved here for sharing)

`assets/js/all-restaurants.js`
- `renderCard(r)`: เพิ่ม `.r-score-badge` แสดง totalScore เหนือปุ่มหัวใจ

`assets/js/restaurant-detail.js`
- `buildHtml(r)`: เพิ่ม `.detail-total-score` ใต้ h2, เพิ่ม `window.buildScoreBars(r)` ก่อน menus

`assets/js/randomizer.js`
- `renderResult()` (standalone page): เพิ่ม totalScore + scoreBars ใน inline result

`apps-script/Code.gs`
- `listRestaurants()`: return score fields ทั้ง 7 ตัว
- `geminiAutoFill()`: เพิ่ม STEP 3 ในให้ Gemini ประเมินคะแนน AE–AJ + คะแนนรวม
- JSON keys ใน prompt: เพิ่ม score columns ทั้งหมด
- Server-side safety: คำนวน `คะแนนรวม` ใหม่จาก sum AE–AJ จริง (ป้องกัน Gemini คำนวณผิด)

`assets/css/all-restaurants.css`
- เพิ่ม `.r-score-badge`, `.r-score-badge__denom` — badge บนการ์ด
- เพิ่ม `.detail-total-score`, `.detail-total-score__num`, `.detail-total-score__denom` — score ใน popup
- เพิ่ม `.score-bars`, `.score-bar`, `.score-bar__label`, `.score-bar__track`, `.score-bar__fill`, `.score-bar__val` — progress bars

**หมายเหตุทางเทคนิค:**
- `buildScoreBars` อยู่ใน `api.js` เพื่อให้ทั้ง `restaurant-detail.js` และ `randomizer.js` ใช้ร่วมกันได้
- Apps Script ต้อง re-deploy ทุกครั้งที่แก้ Code.gs (GitHub push ไม่ได้ update Apps Script อัตโนมัติ)

---

## Session 4 — Score Bug Fixes + UI Polish

---

### [S4-1] ยืนยัน push สำเร็จหรือไม่

**Request:**
> อันนี้คือ push แล้วใช่ไหม

**ตอบ:** ใช่ครับ push เรียบร้อยแล้ว ขึ้น `main` ที่ GitHub เรียบร้อย — commit `8cd1bd3`

---

### [S4-2] ถามว่าแก้ HTML แล้วหรือยัง / GitHub update ช้า

**Request:**
> อันนี้แก้ HTML แล้วหรือยัง เพราะรอ Github Update นานมาก ก็ยังไม่มีสิ่งที่บอกให้อัปเดตไปเลย

**ตอบ:**
- `index.html` ไม่ต้องแก้ — ไฟล์ CSS/JS ที่อัปเดตถูก link อยู่ใน HTML อยู่แล้ว
- ให้ไปเช็ค GitHub repo → Actions tab ว่า workflow status เป็นอะไร
- ถ้า Actions เสร็จแล้วแต่หน้าเว็บยังไม่อัปเดต ให้กด **Ctrl + Shift + R** (hard refresh)

---

### [S4-3] GitHub Actions สำเร็จแต่คะแนนยังไม่ขึ้น

**Request:**
> (screenshot GitHub Actions สำเร็จ + screenshot popup ร้าน Dough Bros.)
> ตอนนี้ที่เห็นใน Actions เห็นว่ามัน push สำเร็จแล้วจริง แต่ในหน้าเว็บไซต์มันยังไม่มีคะแนนรวมทั้ง 2 จุด กับ บาร์คะแนน เลย ฝากเช็กหน่อยครับ

**Root cause:**
Code.gs บน GitHub ถูก update แล้ว แต่ตัว Google Apps Script ที่ deploy จริงยังเป็นโค้ดเก่า — GitHub กับ Google Apps Script เป็นคนละระบบกัน push ไป GitHub ไม่ได้อัปเดต Apps Script ให้อัตโนมัติ

**ตอบ:** ต้อง copy Code.gs ใหม่ไปวางใน Apps Script ด้วยตัวเอง:
1. script.google.com → เปิดโปรเจกต์ WongNaii
2. ลบโค้ดเก่าใน Code.gs → วางโค้ดใหม่ → Save
3. Deploy → Manage deployments → Edit → New version → Deploy

---

### [S4-4] คะแนนรวมขึ้นแล้ว แต่บาร์คะแนนยังไม่ขึ้น

**Request:**
> (screenshot popup แสดง 71.5/100 แต่ไม่มีบาร์) ตอนนี้คะแนนมาแล้ว เยี่ยมมากคับ แต่บาร์คะแนนของแต่ละประเภทเมื่อกดการ์ดร้านอาหารยังไม่มาเลย ฝากเพิ่มไปหน่อยคับ

**Root cause:**
Column header matching ล้มเหลวสำหรับ AE–AJ เพราะชื่อ column ใน Google Sheet อาจมี Thai text ในวงเล็บต่างกันเล็กน้อย ขณะที่ `คะแนนรวม` (AK) เป็น Thai ล้วน match ได้ง่ายกว่า

**ไฟล์ที่เปลี่ยน:**

`apps-script/Code.gs`
- เพิ่ม `scoreField(prefix)` helper: ค้นหา column โดย `Object.keys(raw).find(h => h.toLowerCase().startsWith(prefix.toLowerCase()))` แทนการ match ตรง
- ใช้ `scoreField("Rating & Review Quality")` แทน `raw["Rating & Review Quality (คุณภาพฯ)"]`

`assets/js/api.js`
- `normalize()`: ใช้ `scoreField` IIFE แบบเดียวกันสำหรับ CSV fallback path

---

### [S4-5] อัปเดต Apps Script อีกรอบแล้วบาร์ยังไม่ขึ้น + ขอตัวอย่าง UI

**Request:**
> (screenshot popup แสดงบาร์แบบ reference image: รีวิว/เหมาะกลุ่ม/ราคา/เดินทาง/ข้อมูล/พิเศษ)
> ตอนนี้ push ไปแล้ว และ Update ตัว Google App Script ไปแล้วตัวคะแนนที่เป็นบาร์คะแนนก็ยังไม่ขึ้นเหมือนเดิม อยากได้แบบนี้ โดยให้มันอยู่ในกรอบบนหัว 🍽️ เมนูแนะนำ

**ไฟล์ที่เปลี่ยน:**

`assets/js/api.js`
- `buildScoreBars`: เปลี่ยน labels เป็นแบบสั้น (รีวิว / เหมาะกลุ่ม / ราคา / เดินทาง / ข้อมูล / พิเศษ)

`assets/css/all-restaurants.css`
- `.score-bars`: เพิ่ม `padding`, `background: var(--glass-bg)`, `border`, `border-radius` → ทำเป็น glass-card box
- `.score-bar__label`: ลด `flex: 0 0 130px` → `72px` รองรับ label สั้น
- `.score-bar__track`: เปลี่ยน background เป็น `rgba(255,255,255,0.08)` (เข้มขึ้นเล็กน้อย)
- `.score-bar__fill`: เปลี่ยนจาก `var(--accent)` เป็น `#34d399, #10b981` (เขียว)

**หมายเหตุ:** บาร์ยังไม่ขึ้นเพราะ Apps Script ที่ user update ยังเป็นโค้ดเวอร์ชันก่อน partial match — ต้อง update Apps Script อีกรอบด้วยโค้ดล่าสุด

---

### [S4-6] บาร์ขึ้นแล้ว — เปลี่ยนสีเป็นส้ม + แก้ปุ่มล้นกรอบ

**Request:**
> (screenshots popup BABA @Marché + TEN-SHOW Live Kitchen แสดงบาร์สีเขียว)
> - เปลี่ยนสีบาร์คะแนนเป็นสีส้มตาม Theme เว็บไซต์
> - ปรับการ์ดร้านอาหารให้ย่อลงอีก เพราะปุ่ม "ดูแผนที่" กับ "หาเพื่อนกินข้าว" มันจมลงไปแล้ว แถมออกนอกกรอบด้วย

**Root cause ปุ่มล้น:**
`.detail-modal { overflow: visible }` override `.glass-modal`'s `overflow: auto` ทำให้ popup ไม่ scroll และ content ล้นออกนอก modal

**ไฟล์ที่เปลี่ยน:**

`assets/css/all-restaurants.css`
- `.score-bar__fill`: เปลี่ยนจาก `#34d399, #10b981` (เขียว) กลับเป็น `var(--accent), var(--accent-hover)` (ส้ม theme)
- `.detail-modal`: `overflow: visible` → `overflow-y: auto`

---

### [S4-7] Spacing + Sort improvements + Scroll lock

**Request:**
> - อยากให้คะแนน กับ หัวใจมันห่างกันนิดนึง มันชิดกันเกินไป
> - การเรียงคะแนนสูง-ต่ำ/ต่ำ-สูง อยากให้เรียงตามความสำคัญ: ร้านที่เรากดหัวใจ → คะแนนรวม AK → Google rating
> - การเรียงกดหัวใจเยอะสุด อยากให้เรียงตามความสำคัญ: ร้านที่เรากดหัวใจ → ทุกคนกดหัวใจ → คะแนน AK → Google rating
> - เพิ่มการเรียง "เรียงคะแนนจาก AI WongNaii" (sort by totalScore AK)
> - ตอนกดการ์ดแล้ว Scroll Mouse นอกการ์ด ข้างหลังมันเลื่อนแทน ฝากทำให้ไม่เลื่อน

**ไฟล์ที่เปลี่ยน:**

`index.html`
- sort dropdown: เพิ่ม `<option value="score-desc">เรียงคะแนนจาก AI WongNaii</option>`

`assets/js/all-restaurants.js`
- `applyFilters()`: เพิ่ม `myLike(r)` helper (ร้านที่ current user กด♥), `allLikes(r)` helper (จำนวนทั้งหมด)
- `rating-desc`: เรียงด้วย `myLike desc → totalScore desc → rating desc`
- `rating-asc`: เรียงด้วย `myLike desc → totalScore asc → rating asc`
- `likes-desc`: เรียงด้วย `myLike desc → allLikes desc → totalScore desc → rating desc`
- เพิ่ม `score-desc`: เรียงด้วย `totalScore desc → rating desc`

`assets/js/restaurant-detail.js`
- `show(r)`: เพิ่ม `document.body.style.overflow = "hidden"` — ล็อก body scroll เมื่อ popup เปิด
- `close()`: เพิ่ม `document.body.style.overflow = ""` — restore scroll เมื่อปิด

`assets/css/all-restaurants.css`
- `.r-heart-wrap { gap: 8px }` (เพิ่มจาก 4px) — ห่างระหว่าง score badge กับ หัวใจ

---

### [S4-8] สร้าง PROMPT_LOG.md ฉบับเต็ม

**Request:**
> ช่วยทำ Prompt Log.md ให้หน่อย โดยไม่ต้องย่อหรือทำสรุป ขอแบบตัวเต็มมาเลย

**ไฟล์ที่เปลี่ยน:**
- `PROMPT_LOG.md` — เขียนใหม่ทั้งหมด: S1 (8 entries) + S2 (9 entries) + S3 (8 entries) + S4 (8 entries)

---

## สถาปัตยกรรมโปรเจกต์ (ณ ปัจจุบัน)

```
Food Discovery/
├── index.html                    # SPA: hero + marquee + all-restaurants + randomizer
├── assets/
│   ├── css/
│   │   ├── base.css              # design tokens, typography, layout
│   │   ├── glass.css             # Liquid Glass primitives (card, button, input, modal, pill)
│   │   ├── home.css              # hero, marquee, SPA section spacing
│   │   ├── all-restaurants.css   # filters, cards, pagination, top5, toast, score bars, detail popup
│   │   ├── party.css             # party modal, chat, bubble
│   │   └── randomizer.css        # quiz UI
│   └── js/
│       ├── config.js             # APPS_SCRIPT_URL, SHEET_CSV_FALLBACK, maintenance config
│       ├── api.js                # WongnaiiAPI wrapper + normalizeFoodType + buildScoreBars
│       ├── identity.js           # WongnaiiIdentity (localStorage userId/name)
│       ├── theme.js              # dark/light toggle
│       ├── maintenance.js        # maintenance gate (01:30–02:15 GMT+7)
│       ├── marquee.js            # home marquee (3 rows, clickable chips → detail popup)
│       ├── restaurant-detail.js  # WongnaiiDetail shared popup (show/close + scroll lock)
│       ├── all-restaurants.js    # filter, sort (6 modes), render, top5, toast, party hooks
│       ├── party.js              # Party creator/seeker/dashboard/chat (dedup, minimize)
│       └── randomizer.js         # Akinator-style quiz (7 questions, back button, result popup)
├── apps-script/
│   └── Code.gs                   # Google Apps Script: Sheet proxy + Gemini (verify + score) + GitHub API
└── .github/
    └── workflows/
        ├── deploy.yml            # GitHub Pages deploy on push to main
        └── weekly-reset.yml      # reset likes/parties/chats weekly + maintenance gate
```

### Score System (AE–AK)

| Column | Field | Max | ความหมาย |
|--------|-------|-----|-----------|
| AE | `ratingQuality` | 25 | คุณภาพคะแนนและรีวิว (Google Rating × จำนวนรีวิว) |
| AF | `groupSuitability` | 20 | ความเหมาะกับกลุ่ม (ที่นั่งหลายคน, จองได้) |
| AG | `priceSuitability` | 15 | ความเหมาะของราคา (คุ้มค่า) |
| AH | `travelConvenience` | 15 | ความสะดวกเดินทาง (BTS/MRT, ที่จอดรถ) |
| AI | `dataCompleteness` | 15 | ความครบของข้อมูล |
| AJ | `uniqueness` | 10 | ความพิเศษ/ประสบการณ์ |
| AK | `totalScore` | 100 | คะแนนรวม (sum AE–AJ, คำนวณโดย Gemini + safety recalc server-side) |

### Sort Priority Matrix

| Mode | Priority 1 | Priority 2 | Priority 3 | Priority 4 |
|------|-----------|-----------|-----------|-----------|
| คะแนน สูง→ต่ำ | ร้านที่ฉันกด♥ | totalScore ↓ | Google rating ↓ | — |
| คะแนน ต่ำ→สูง | ร้านที่ฉันกด♥ | totalScore ↑ | Google rating ↑ | — |
| กดหัวใจเยอะสุด | ร้านที่ฉันกด♥ | ทุกคนกด♥ ↓ | totalScore ↓ | Google rating ↓ |
| AI WongNaii | totalScore ↓ | Google rating ↓ | — | — |

---

*สร้างโดย Claude Code — อัปเดตล่าสุด: 2026-06-19*
