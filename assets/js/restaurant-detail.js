/**
 * Shared restaurant detail popup.
 * Call window.WongnaiiDetail.show(restaurant) from marquee chips, top5, cards, etc.
 * Shows the same result UI as the randomizer but without the "สุ่มใหม่" button.
 */
(function () {
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function getOrCreate() {
    let el = document.getElementById("detail-modal");
    if (el) return el;
    el = document.createElement("div");
    el.className = "glass-modal-scrim";
    el.id = "detail-modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="glass-modal detail-modal"><div id="detail-content"></div></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-detail-close]")) close();
    });
    return el;
  }

  function close() {
    const el = document.getElementById("detail-modal");
    if (el) el.classList.remove("is-open");
  }

  function show(r) {
    const scrim = getOrCreate();
    document.getElementById("detail-content").innerHTML = buildHtml(r);
    scrim.classList.add("is-open");
    const partyBtn = document.getElementById("detail-party-btn");
    if (partyBtn && window.WongnaiiParty) {
      partyBtn.addEventListener("click", () => { close(); window.WongnaiiParty.openCreator(r); });
    }
  }

  function buildHtml(r) {
    const scoreBars = window.buildScoreBars ? window.buildScoreBars(r) : "";
    return `
      <button class="detail-close" data-detail-close aria-label="ปิด">✕</button>
      <div class="quiz-result">
        <div class="badge">🍽️ รายละเอียดร้าน</div>
        <h2>${esc(r.name)}</h2>
        ${r.totalScore != null ? `
          <div class="detail-total-score">
            <span class="detail-total-score__num">${r.totalScore}</span>
            <span class="detail-total-score__denom">/100 คะแนน</span>
          </div>` : ""}
        <div class="meta">
          ${r.area       ? `<span class="glass-pill">📍 ${esc(r.area)}</span>` : ""}
          ${r.foodType   ? `<span class="glass-pill">${esc(r.foodType)}</span>` : ""}
          ${r.rating     ? `<span class="glass-pill">★ ${r.rating.toFixed(1)}${r.reviewCount ? ` (${r.reviewCount})` : ""}</span>` : ""}
          ${r.priceRange ? `<span class="glass-pill">${esc(r.priceRange)}</span>` : ""}
        </div>
        ${r.pitch ? `<p style="color:var(--text-muted);max-width:540px;margin:0 auto var(--space-4)">${esc(r.pitch)}</p>` : ""}
        ${scoreBars}
        ${r.menus?.length ? `
          <div class="menus">
            <h3>🍽️ เมนูแนะนำ</h3>
            <ul>${r.menus.map((m) => `
              <li>
                <strong>${esc(m.name)}</strong>
                ${m.desc ? `<span>${esc(m.desc)}</span>` : ""}
              </li>`).join("")}
            </ul>
          </div>` : ""}
        ${r.hours  ? `<p style="color:var(--text-muted);font-size:.9rem;margin-bottom:var(--space-2)">🕐 ${esc(r.hours)}</p>`  : ""}
        ${r.nearby ? `<p style="color:var(--text-muted);font-size:.9rem;margin-bottom:var(--space-4)">🚇 ${esc(r.nearby)}</p>` : ""}
        <div class="result-actions">
          ${r.mapUrl ? `<a class="glass-button" href="${esc(r.mapUrl)}" target="_blank" rel="noopener">🗺️ ดูแผนที่</a>` : ""}
          <button class="glass-button is-primary" id="detail-party-btn">🍽️ เริ่มหาเพื่อนกินข้าว</button>
        </div>
      </div>
    `;
  }

  window.WongnaiiDetail = { show, close };
})();
