/**
 * Single-channel API client. Browser → Apps Script.
 *
 * All restaurant reads, likes, parties, chats, and AI-assisted submissions
 * go through ONE endpoint: WONGNAII_CONFIG.APPS_SCRIPT_URL.
 * No credentials live on the client.
 */
window.WongnaiiAPI = (function () {
  const cfg = () => window.WONGNAII_CONFIG;

  async function call(action, payload = {}) {
    const url = cfg().APPS_SCRIPT_URL;
    if (!url || url.startsWith("PASTE_")) {
      console.warn("[WongnaiiAPI] APPS_SCRIPT_URL not configured — using fallback CSV for reads.");
      if (action === "listRestaurants") return fallbackListRestaurants();
      throw new Error("Apps Script URL not configured");
    }
    // Apps Script web apps don't support custom CORS headers cleanly.
    // Use text/plain body so the browser sends a "simple" CORS request.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) throw new Error(`API ${action} failed: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }

  // ---- CSV fallback (read-only) ---------------------------------------
  async function fallbackListRestaurants() {
    const res = await fetch(cfg().SHEET_CSV_FALLBACK);
    const text = await res.text();
    return parseCSV(text);
  }

  // Minimal RFC-4180-ish CSV parser (handles quotes + newlines in fields)
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { field += c; }
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* skip */ }
        else { field += c; }
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const header = rows.shift().map((h) => h.replace(/\n/g, " ").trim());
    return rows.filter(r => r.some(c => c && c.trim())).map((r) => {
      const o = {};
      header.forEach((h, idx) => { o[h] = (r[idx] ?? "").trim(); });
      return normalize(o);
    });
  }

  // Map raw sheet columns → friendly keys used throughout the UI.
  function normalize(raw) {
    return {
      id: raw["Restaurant Name"],          // names are unique enough for now
      name: raw["Restaurant Name"],
      area: raw["Area"],
      foodType: raw["Food Type"],
      pitch: raw["ทำไมต้องกินร้านนี้"],
      menus: [
        { name: raw["Recommend Menu 1"], desc: raw["คำอธิบาย Recommend Menu 1"] },
        { name: raw["Recommend Menu 2"], desc: raw["คำอธิบาย Recommend Menu 2"] },
        { name: raw["Recommend Menu 3"], desc: raw["คำอธิบาย Recommend Menu 3"] },
      ].filter((m) => m.name),
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
      ...(() => {
        const scoreField = (prefix) => {
          const lo = prefix.toLowerCase();
          const k = Object.keys(raw).find((h) => h.toLowerCase().startsWith(lo));
          return parseFloat(k ? raw[k] : "") || null;
        };
        return {
          ratingQuality:     scoreField("Rating & Review Quality"),
          groupSuitability:  scoreField("Group Suitability"),
          priceSuitability:  scoreField("Price Suitability"),
          travelConvenience: scoreField("Travel Convenience"),
          dataCompleteness:  scoreField("Data Completeness"),
          uniqueness:        scoreField("Uniqueness / Experience"),
          totalScore:        parseFloat(raw["คะแนนรวม"]) || null,
        };
      })(),
      raw,  // keep original for debugging
    };
  }

  // ---- Public API -----------------------------------------------------
  return {
    listRestaurants: () => call("listRestaurants").catch(fallbackListRestaurants),
    submitRestaurant: (data) => call("submitRestaurant", data),
    toggleLike: (restaurantId, userId) => call("toggleLike", { restaurantId, userId }),
    getLikes:   () => call("getLikes"),
    createParty: (data) => call("createParty", data),
    joinParty:   (partyId, user) => call("joinParty", { partyId, user }),
    listParties: (restaurantId) => call("listParties", { restaurantId }),
    closeParty:  (partyId) => call("closeParty", { partyId }),
    postMessage: (partyId, user, message) => call("postMessage", { partyId, user, message }),
    getMessages: (partyId, since = 0) => call("getMessages", { partyId, since }),
  };
})();

/**
 * Builds HTML score bars for AE-AJ columns.
 * Used in restaurant-detail.js and randomizer.js standalone result.
 */
window.buildScoreBars = function (r) {
  const bars = [
    { label: "คุณภาพคะแนนและรีวิว", value: r.ratingQuality,     max: 25 },
    { label: "ความเหมาะกับกลุ่ม",   value: r.groupSuitability,  max: 20 },
    { label: "ความเหมาะของราคา",     value: r.priceSuitability,  max: 15 },
    { label: "ความสะดวกเดินทาง",     value: r.travelConvenience, max: 15 },
    { label: "ความครบของข้อมูล",     value: r.dataCompleteness,  max: 15 },
    { label: "ความพิเศษ/ประสบการณ์", value: r.uniqueness,        max: 10 },
  ].filter((b) => b.value != null && b.value > 0);
  if (!bars.length) return "";
  const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return `
    <div class="score-bars">
      ${bars.map((b) => `
        <div class="score-bar">
          <div class="score-bar__label">${e(b.label)}</div>
          <div class="score-bar__track">
            <div class="score-bar__fill" style="width:${Math.min(100, Math.round((b.value / b.max) * 100))}%"></div>
          </div>
          <div class="score-bar__val">${b.value}/${b.max}</div>
        </div>`).join("")}
    </div>`;
};

/**
 * Normalizes detailed food-type strings to broad parent categories.
 * e.g. "อาหารไทยพรีเมี่ยม" → "อาหารไทย", "อาหารญี่ปุ่น/ซูซิ" → "อาหารญี่ปุ่น"
 */
window.normalizeFoodType = function (t) {
  if (!t) return "";
  const s = t.toLowerCase().trim();
  if (s.includes("ซีฟู้ด") || s.includes("seafood"))          return "อาหารทะเล";
  if (s.includes("ไทย"))                                       return "อาหารไทย";
  if (s.includes("ทะเล"))                                      return "อาหารทะเล";
  if (s.includes("ญี่ปุ่น") || s.includes("ซูซิ") || s.includes("ซูชิ") || s.includes("sushi") || s.includes("ราเมง") || s.includes("ราเม็ง") || s.includes("ramen")) return "อาหารญี่ปุ่น";
  if (s.includes("เกาหลี") || s.includes("korean"))           return "อาหารเกาหลี";
  if (s.includes("จีน") || s.includes("chinese") || s.includes("ติ่มซำ")) return "อาหารจีน";
  if (s.includes("อิตาลี") || s.includes("italian") || s.includes("pasta") || s.includes("pizza")) return "อาหารอิตาลี";
  if (s.includes("อเมริกัน") || s.includes("american") || s.includes("เบอร์เกอร์") || s.includes("burger")) return "อาหารอเมริกัน";
  if (s.includes("อินเดีย") || s.includes("indian"))          return "อาหารอินเดีย";
  if (s.includes("คาเฟ่") || s.includes("cafe") || s.includes("dessert") || s.includes("ของหวาน") || s.includes("เบเกอ")) return "คาเฟ่/ขนม";
  if (s.includes("เวียดนาม") || s.includes("vietnamese"))     return "อาหารเวียดนาม";
  if (s.includes("ฝรั่งเศส") || s.includes("french"))        return "อาหารฝรั่งเศส";
  return t;
};
