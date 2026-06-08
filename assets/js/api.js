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
