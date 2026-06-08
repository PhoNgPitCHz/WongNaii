/**
 * Maintenance gate — shows "กำลังปิดปรับปรุง" UI during the weekly reset window
 * (Sunday 01:30 → 02:15 GMT+7) regardless of the user's local timezone.
 */
(function () {
  const cfg = window.WONGNAII_CONFIG?.MAINTENANCE;
  if (!cfg) return;

  function isInMaintenanceWindow(now = new Date()) {
    // Convert "now" to Bangkok wall-clock parts via Intl.
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: cfg.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const get = (t) => parts.find((p) => p.type === t)?.value;
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = dayMap[get("weekday")];
    const hour = parseInt(get("hour"), 10);
    const minute = parseInt(get("minute"), 10);

    if (day !== cfg.startDay) return false;
    const totalMin = hour * 60 + minute;
    const start = cfg.startHour * 60 + cfg.startMinute;
    const end = cfg.endHour * 60 + cfg.endMinute;
    return totalMin >= start && totalMin < end;
  }

  function renderMaintenance() {
    const tpl = `
      <div class="maintenance-screen">
        <div class="glass-card">
          <div style="font-size: 4rem; margin-bottom: 1rem">🛠️</div>
          <h1>กำลังปิดปรับปรุง</h1>
          <p>ระบบกำลังรีเซ็ตข้อมูลรายสัปดาห์ (Likes / Parties / Chat)</p>
          <p style="margin-top: .75rem">เปิดให้บริการอีกครั้งเวลา <strong>02:15 น.</strong> (GMT+7)</p>
          <div style="margin-top: 1.5rem"><span class="glass-pill">WongNaii?</span></div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", tpl);
  }

  function check() {
    const existing = document.querySelector(".maintenance-screen");
    if (isInMaintenanceWindow()) {
      if (!existing) renderMaintenance();
    } else if (existing) {
      existing.remove();
    }
  }

  check();
  setInterval(check, 30 * 1000);  // re-check every 30s
})();
