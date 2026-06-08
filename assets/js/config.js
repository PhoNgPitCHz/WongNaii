/**
 * WongNaii? — Frontend config
 *
 * IMPORTANT: After deploying the Apps Script web app, paste its URL into APPS_SCRIPT_URL below.
 * The browser only ever talks to Apps Script. No secrets live on the client.
 */
window.WONGNAII_CONFIG = Object.freeze({
  // Replace this with your deployed Apps Script web app URL (ends with /exec)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyfdIMQ54D4b4TxnvTPhrv90iNmd9B-Vz_vA4Oj9SrC4r-Ai1lOJbrER23IFY2kM-iTAg/exec",

  // Public CSV fallback — used only as a read-only fallback if Apps Script is unreachable.
  // The browser fetches restaurants from Apps Script first (which proxies the Sheet).
  SHEET_CSV_FALLBACK: "https://docs.google.com/spreadsheets/d/10zUQ6WGBaAuCFBgPUFhCRXMb5hVr4xwIxmgRK1Tsu5U/export?format=csv&gid=973377067",

  // Maintenance window (GMT+7) — Sunday 01:30 → 02:15
  MAINTENANCE: {
    timezone: "Asia/Bangkok",
    startDay: 0,           // Sunday
    startHour: 1,
    startMinute: 30,
    endHour: 2,
    endMinute: 15,
  },

  PARTY_DURATION_MS: 15 * 60 * 1000,  // 15 minutes
});
