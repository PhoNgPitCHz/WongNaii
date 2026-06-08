/**
 * WongNaii? — Apps Script proxy
 * ============================================================
 * Single endpoint for the browser. Handles:
 *   - listRestaurants    → read Google Sheet
 *   - submitRestaurant   → Gemini auto-fill + append row
 *   - toggleLike / getLikes
 *   - createParty / joinParty / closeParty / listParties
 *   - postMessage / getMessages
 *
 * All secondary state (likes, parties, chats) is mirrored as JSON files
 * in the GitHub repo via the Contents API, so the weekly-reset Action
 * can simply overwrite them.
 *
 * Script Properties required (Project Settings → Script Properties):
 *   SHEET_ID         = 10zUQ6WGBaAuCFBgPUFhCRXMb5hVr4xwIxmgRK1Tsu5U
 *   SHEET_TAB_NAME   = (the tab name, default "Sheet1")
 *   GEMINI_API_KEY   = AIza...                  (Google AI Studio)
 *   GITHUB_TOKEN     = ghp_... or github_pat_... (fine-grained: contents:write on the repo)
 *   GITHUB_OWNER     = your-github-username
 *   GITHUB_REPO      = wongnaii
 *   GITHUB_BRANCH    = main
 *
 * Deploy: Deploy → New deployment → Web app → Execute as "Me",
 *         Access: "Anyone". Copy the /exec URL into assets/js/config.js.
 */

const PROPS = PropertiesService.getScriptProperties();

// ---- Entry points ------------------------------------------------------
function doGet(e) {
  return jsonOut({ ok: true, hint: "POST { action, payload }" });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;
    const payload = body.payload || {};
    const result = dispatch(action, payload);
    return jsonOut({ result });
  } catch (err) {
    return jsonOut({ error: String(err && err.message || err) });
  }
}

function dispatch(action, p) {
  switch (action) {
    case "listRestaurants": return listRestaurants();
    case "submitRestaurant": return submitRestaurant(p);
    case "toggleLike":       return toggleLike(p.restaurantId, p.userId);
    case "getLikes":         return getJsonFile("data/likes.json", {});
    case "createParty":      return createParty(p);
    case "joinParty":        return joinParty(p.partyId, p.user);
    case "closeParty":       return closeParty(p.partyId);
    case "listParties":      return listParties(p.restaurantId);
    case "postMessage":      return postMessage(p.partyId, p.user, p.message);
    case "getMessages":      return getMessages(p.partyId, p.since || 0);
    default: throw new Error("Unknown action: " + action);
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Restaurants -------------------------------------------------------
function listRestaurants() {
  const sheetId = PROPS.getProperty("SHEET_ID");
  const tabName = PROPS.getProperty("SHEET_TAB_NAME") || null;
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = tabName ? ss.getSheetByName(tabName) : ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];

  const header = values.shift().map((h) => String(h).replace(/\n/g, " ").trim());
  return values
    .filter((row) => row.some((c) => c !== "" && c != null))
    .map((row) => {
      const raw = {};
      header.forEach((h, i) => { raw[h] = String(row[i] ?? "").trim(); });
      return {
        id: raw["Restaurant Name"],
        name: raw["Restaurant Name"],
        area: raw["Area"],
        foodType: raw["Food Type"],
        pitch: raw["ทำไมต้องกินร้านนี้"],
        menus: [1, 2, 3]
          .map((n) => ({ name: raw[`Recommend Menu ${n}`], desc: raw[`คำอธิบาย Recommend Menu ${n}`] }))
          .filter((m) => m.name),
        menuSummary: raw["คำอธิบาย Recommend Menu"],
        rating: parseFloat(raw["Google Rating"]) || null,
        reviewCount: parseInt(raw["Review Count"], 10) || null,
        priceRange: raw["Price Range"],
        address: raw["Location / Address"],
        nearby: raw["Distance / Travel Note"],
        hours: raw["Opening Hours"],
        groupSize: raw["Suitable for Group"],
        mapUrl: raw["Source URL (Google Map)"],
        notes: raw["Notes"],
        pros: raw["จุดเด่น"],
        cons: raw["จุดด้อย"],
      };
    });
}

function submitRestaurant(p) {
  // p: { submitterName, restaurantName, review, recommendMenu, recommendMenuDesc }
  if (!p.restaurantName) throw new Error("restaurantName is required");

  // Ask Gemini to auto-fill the rest based on what the user provided.
  const enriched = geminiAutoFill(p);

  const sheetId = PROPS.getProperty("SHEET_ID");
  const tabName = PROPS.getProperty("SHEET_TAB_NAME") || null;
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = tabName ? ss.getSheetByName(tabName) : ss.getSheets()[0];
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map((h) => String(h).replace(/\n/g, " ").trim());

  const newRow = header.map((col) => enriched[col] ?? "");
  sheet.appendRow(newRow);

  return { ok: true, name: p.restaurantName, enriched };
}

function geminiAutoFill(p) {
  const apiKey = PROPS.getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in Script Properties");
  // Allow swapping models without code change. Try in order; fall back on 429.
  const modelList = (PROPS.getProperty("GEMINI_MODELS") ||
    "gemini-3.5-flash,gemini-3-flash,gemini-flash-latest,gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash"
  ).split(",").map((s) => s.trim()).filter(Boolean);

  const prompt = [
    "คุณคือผู้ช่วยตรวจสอบและรวบรวมข้อมูลร้านอาหารในกรุงเทพฯ",
    "",
    "STEP 1 — ตรวจสอบว่าร้านมีอยู่จริง:",
    `ร้านชื่อ \"${p.restaurantName}\" ในย่าน${p.area || "ที่ระบุ"} ของกรุงเทพฯ มีอยู่จริงหรือไม่?`,
    "- ถ้าเป็นชื่อร้านที่คุณรู้จักหรือน่าจะมีอยู่จริงในย่านนั้น → verified: \"yes\"",
    "- ถ้าชื่อดูสุ่ม/มั่ว/ไม่น่าจะเป็นร้านจริง/ไม่รู้จักเลย → verified: \"no\"",
    "",
    "STEP 2 — ถ้า verified: \"yes\" เท่านั้น ให้เติมข้อมูลที่เหลือให้สมจริง ถ้าไม่ทราบให้ใช้คำว่า 'ไม่ระบุ'",
    "ตอบกลับเป็น JSON ตรงตาม keys ที่กำหนดเท่านั้น ห้ามมีข้อความอื่น",
    "",
    "ข้อมูลที่ผู้ใช้ให้มา:",
    `- Restaurant Name: ${p.restaurantName}`,
    `- ย่าน/โซน: ${p.area || "ไม่ระบุ"}`,
    `- ทำไมต้องกินร้านนี้ (รีวิว): ${p.review || ""}`,
    `- Recommend Menu 1: ${p.recommendMenu || ""}`,
    `- คำอธิบาย Recommend Menu 1: ${p.recommendMenuDesc || ""}`,
    `- ผู้ส่ง: ${p.submitterName || ""}`,
    "",
    "ให้ส่ง JSON ที่มี keys ดังนี้ (ใช้ string ทุกตัว):",
    '"verified",',
    '"Restaurant Name", "Area", "Food Type", "ทำไมต้องกินร้านนี้",',
    '"Recommend Menu 1", "คำอธิบาย Recommend Menu 1",',
    '"Recommend Menu 2", "คำอธิบาย Recommend Menu 2",',
    '"Recommend Menu 3", "คำอธิบาย Recommend Menu 3",',
    '"คำอธิบาย Recommend Menu", "Google Rating", "Review Count",',
    '"Price Range", "Location / Address", "Distance / Travel Note",',
    '"Opening Hours", "Suitable for Group", "Source URL (Google Map)", "Notes"',
  ].join("\n");

  // Try each model in turn. 429 → next model. Other errors → throw.
  let lastErr = "";
  let text = null;
  for (const model of modelList) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    });
    const code = res.getResponseCode();
    if (code === 200) {
      const data = JSON.parse(res.getContentText());
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      break;
    }
    lastErr = "model=" + model + " status=" + code + " body=" + res.getContentText();
    // 429 quota / 404 model-not-available → try next model. Other codes → fail fast.
    if (code !== 429 && code !== 404) throw new Error("Gemini API error: " + lastErr);
  }
  if (text === null) {
    throw new Error("All Gemini models quota-exceeded. Last: " + lastErr +
      "\n\nวิธีแก้:\n1) ไป https://aistudio.google.com/apikey สร้าง API key ใหม่จากโปรเจกต์ที่มี free tier\n2) หรือเปิด billing ใน Google AI Studio\n3) หรือเพิ่ม Script Property GEMINI_MODELS=<model1>,<model2> เพื่อระบุ model ที่ใช้ได้");
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) {
    // Strip ```json fences if any
    parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  }

  // Reject if Gemini says the restaurant doesn't exist
  if ((parsed.verified || "").toLowerCase() === "no") {
    throw new Error(
      "ไม่พบร้าน \"" + p.restaurantName + "\" ในย่าน" + (p.area || "ที่เลือก") +
      " — ตรวจสอบชื่อร้านใหม่อีกครั้ง หรือเลือกย่านให้ถูกต้อง"
    );
  }
  delete parsed.verified;

  // Always overwrite with what the user actually submitted
  parsed["Restaurant Name"] = p.restaurantName;
  if (p.area)              parsed["Area"] = p.area;
  if (p.review)            parsed["ทำไมต้องกินร้านนี้"] = p.review;
  if (p.recommendMenu)     parsed["Recommend Menu 1"] = p.recommendMenu;
  if (p.recommendMenuDesc) parsed["คำอธิบาย Recommend Menu 1"] = p.recommendMenuDesc;
  parsed["Notes"] = (parsed["Notes"] ? parsed["Notes"] + " · " : "") +
                    `Added by ${p.submitterName || "anonymous"} @ ${new Date().toISOString()}`;
  return parsed;
}

// ---- Likes -------------------------------------------------------------
function toggleLike(restaurantId, userId) {
  if (!restaurantId || !userId) throw new Error("restaurantId and userId required");
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const path = "data/likes.json";
    const { content, sha } = githubReadFile(path);
    const likes = JSON.parse(content || "{}");
    const set = new Set(likes[restaurantId] || []);
    set.has(userId) ? set.delete(userId) : set.add(userId);
    likes[restaurantId] = [...set];
    githubWriteFile(path, JSON.stringify(likes, null, 2), sha, `toggle like ${restaurantId} by ${userId}`);
    return { restaurantId, count: set.size, liked: set.has(userId) };
  } finally { lock.releaseLock(); }
}

// ---- Parties -----------------------------------------------------------
function createParty(p) {
  // p: { restaurantId, partyName, hostName, hostId, eatTime, requiredPeople, details }
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const { content, sha } = githubReadFile("data/parties.json");
    const parties = JSON.parse(content || "[]");
    const party = {
      id: Utilities.getUuid(),
      restaurantId: p.restaurantId,
      partyName: p.partyName,
      hostName: p.hostName,
      hostId: p.hostId,
      eatTime: p.eatTime,
      requiredPeople: Number(p.requiredPeople) || 2,
      details: p.details || "",
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      status: "recruiting",            // recruiting | chatting | closed
      members: [{ id: p.hostId, name: p.hostName, joinedAt: Date.now(), host: true }],
    };
    parties.push(party);
    githubWriteFile("data/parties.json", JSON.stringify(parties, null, 2), sha, `create party ${party.id}`);
    return party;
  } finally { lock.releaseLock(); }
}

function joinParty(partyId, user) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const { content, sha } = githubReadFile("data/parties.json");
    const parties = JSON.parse(content || "[]");
    const party = parties.find((x) => x.id === partyId);
    if (!party) throw new Error("party not found");
    if (party.status !== "recruiting") throw new Error("party not recruiting");
    if (!party.members.some((m) => m.id === user.id)) {
      party.members.push({ ...user, joinedAt: Date.now() });
    }
    githubWriteFile("data/parties.json", JSON.stringify(parties, null, 2), sha, `join party ${partyId}`);
    return party;
  } finally { lock.releaseLock(); }
}

function closeParty(partyId) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const { content, sha } = githubReadFile("data/parties.json");
    const parties = JSON.parse(content || "[]");
    const party = parties.find((x) => x.id === partyId);
    if (!party) throw new Error("party not found");
    party.status = "closed";
    party.closedAt = Date.now();
    githubWriteFile("data/parties.json", JSON.stringify(parties, null, 2), sha, `close party ${partyId}`);
    return party;
  } finally { lock.releaseLock(); }
}

function listParties(restaurantId) {
  const parties = getJsonFile("data/parties.json", []);
  const now = Date.now();
  return parties.filter((p) =>
    (!restaurantId || p.restaurantId === restaurantId) &&
    p.status !== "closed" &&
    p.expiresAt > now
  );
}

// ---- Chat --------------------------------------------------------------
function postMessage(partyId, user, message) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const path = `data/chats/${partyId}.json`;
    const { content, sha } = githubReadFile(path);
    const messages = JSON.parse(content || "[]");
    const msg = { id: Utilities.getUuid(), user, message, ts: Date.now() };
    messages.push(msg);
    githubWriteFile(path, JSON.stringify(messages, null, 2), sha, `chat ${partyId}`);
    return msg;
  } finally { lock.releaseLock(); }
}

function getMessages(partyId, since) {
  const messages = getJsonFile(`data/chats/${partyId}.json`, []);
  return messages.filter((m) => m.ts > (since || 0));
}

// ---- GitHub Contents API helpers --------------------------------------
function githubBase() {
  const owner = PROPS.getProperty("GITHUB_OWNER");
  const repo  = PROPS.getProperty("GITHUB_REPO");
  if (!owner || !repo) throw new Error("GITHUB_OWNER/GITHUB_REPO not set");
  return `https://api.github.com/repos/${owner}/${repo}/contents/`;
}

function githubHeaders() {
  const token = PROPS.getProperty("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function githubReadFile(path) {
  const branch = PROPS.getProperty("GITHUB_BRANCH") || "main";
  const res = UrlFetchApp.fetch(githubBase() + encodeURI(path) + "?ref=" + branch, {
    method: "get",
    headers: githubHeaders(),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() === 404) return { content: "", sha: null };
  if (res.getResponseCode() >= 300) throw new Error("GitHub read failed: " + res.getContentText());
  const data = JSON.parse(res.getContentText());
  return { content: Utilities.newBlob(Utilities.base64Decode(data.content)).getDataAsString(), sha: data.sha };
}

function githubWriteFile(path, contentStr, sha, message) {
  const branch = PROPS.getProperty("GITHUB_BRANCH") || "main";
  const body = {
    message: message || ("update " + path),
    content: Utilities.base64Encode(Utilities.newBlob(contentStr).getBytes()),
    branch,
    committer: { name: "WongNaii Bot", email: "bot@wongnaii.local" },
  };
  if (sha) body.sha = sha;
  const res = UrlFetchApp.fetch(githubBase() + encodeURI(path), {
    method: "put",
    headers: githubHeaders(),
    contentType: "application/json",
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error("GitHub write failed: " + res.getContentText());
  return JSON.parse(res.getContentText());
}

function getJsonFile(path, fallback) {
  try {
    const { content } = githubReadFile(path);
    return content ? JSON.parse(content) : fallback;
  } catch (e) {
    return fallback;
  }
}
