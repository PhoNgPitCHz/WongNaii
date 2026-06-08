/**
 * Randomizer — Akinator-style quiz (max 7 questions).
 *
 * Each question narrows the candidate pool. If the pool becomes <=1 early,
 * we short-circuit to the result. Questions are derived from the data so
 * options are always present in the catalog (no dead-end branches).
 */
(async function () {
  const stepEl = document.getElementById("step");
  const progressEl = document.getElementById("progress");
  const TOTAL_STEPS = 7;

  stepEl.innerHTML = `<div class="ar-loading">กำลังโหลดร้านอาหาร...</div>`;

  let restaurants = [];
  try {
    restaurants = await WongnaiiAPI.listRestaurants();
  } catch (e) {
    stepEl.innerHTML = `<div class="quiz-empty">โหลดข้อมูลไม่ได้: ${e.message}</div>`;
    return;
  }
  if (!restaurants.length) {
    stepEl.innerHTML = `<div class="quiz-empty">ยังไม่มีข้อมูลร้าน ลองเพิ่มร้านในหน้า "ดูร้านทั้งหมด" ก่อนนะครับ</div>`;
    return;
  }

  // ---------- Define question bank --------------------------------
  // Each question: { id, title, hint, getOptions(pool), filter(opt, r) }
  const QUESTIONS = [
    {
      id: "zone",
      title: "ตอนนี้คุณอยู่ย่านไหน?",
      hint: "เลือกย่านที่สะดวก (หรือ 'ไหนก็ได้')",
      getOptions: (pool) => topOptions(pool, "area", 6, "📍"),
      filter: (opt, r) => !opt.value || r.area === opt.value,
    },
    {
      id: "foodType",
      title: "อยากกินอาหารชาติไหน / ประเภทอะไร?",
      hint: "บอกหมวดอาหารที่อยากกินวันนี้",
      getOptions: (pool) => topOptions(pool, "foodType", 6, "🍽️"),
      filter: (opt, r) => !opt.value || r.foodType === opt.value,
    },
    {
      id: "groupSize",
      title: "ไปกันกี่คน?",
      hint: "ขนาดของกลุ่ม",
      getOptions: () => [
        { value: "1",  label: "คนเดียว",     emoji: "🧍" },
        { value: "2",  label: "2 คน",        emoji: "👫" },
        { value: "4",  label: "3–4 คน",      emoji: "👨‍👩‍👧" },
        { value: "8",  label: "5–8 คน",      emoji: "👨‍👩‍👧‍👦" },
        { value: "10", label: "10+ คน",      emoji: "🎉" },
      ],
      filter: (opt, r) => {
        const text = (r.groupSize || "").toLowerCase();
        const n = parseInt(opt.value, 10);
        if (n >= 10) return /(กลุ่ม|ใหญ่|10|รองรับกลุ่ม)/.test(text);
        if (n >= 8)  return /(กลุ่ม|รองรับ|เหมาะ)/.test(text);
        if (n >= 4)  return /(กลุ่ม|เหมาะ|รองรับ|ครอบครัว|4)/.test(text);
        return true;
      },
    },
    {
      id: "price",
      title: "งบประมาณคร่าว ๆ?",
      hint: "ราคาต่อคน",
      getOptions: () => [
        { value: "low",    label: "ไม่เกิน 200",   emoji: "💰" },
        { value: "mid",    label: "200–500",        emoji: "💸" },
        { value: "high",   label: "500+",           emoji: "💎" },
        { value: "any",    label: "ไม่จำกัด",       emoji: "✨" },
      ],
      filter: (opt, r) => {
        if (opt.value === "any") return true;
        const p = (r.priceRange || "").toLowerCase();
        const m = p.match(/(\d+)\s*[-–]\s*(\d+)/);
        const lo = m ? parseInt(m[1], 10) : null;
        const hi = m ? parseInt(m[2], 10) : null;
        if (opt.value === "low")  return (hi !== null && hi <= 250) || /ถูก|ประหยัด|\$\s*$|฿\s*$/.test(p);
        if (opt.value === "mid")  return (lo !== null && hi !== null && lo <= 500 && hi >= 150) || /ปานกลาง|฿฿/.test(p);
        if (opt.value === "high") return (lo !== null && lo >= 400) || /พรีเมียม|฿฿฿|แพง/.test(p);
        return true;
      },
    },
    {
      id: "rating",
      title: "อยากได้ร้านที่คะแนนเท่าไร?",
      hint: "Google Rating",
      getOptions: () => [
        { value: "4.5", label: "4.5 ขึ้นไป", emoji: "⭐" },
        { value: "4.0", label: "4.0 ขึ้นไป", emoji: "⭐" },
        { value: "any", label: "เท่าไรก็ได้", emoji: "🤷" },
      ],
      filter: (opt, r) => {
        if (opt.value === "any") return true;
        return (r.rating || 0) >= parseFloat(opt.value);
      },
    },
    {
      id: "transport",
      title: "อยากได้ร้านใกล้อะไร?",
      hint: "การเดินทาง",
      getOptions: () => [
        { value: "bts",  label: "ติด BTS/MRT", emoji: "🚇" },
        { value: "mall", label: "ในห้าง",      emoji: "🛍️" },
        { value: "any",  label: "ไม่สนใจ",     emoji: "🚗" },
      ],
      filter: (opt, r) => {
        if (opt.value === "any") return true;
        const blob = ((r.nearby || "") + " " + (r.address || "")).toLowerCase();
        if (opt.value === "bts")  return /bts|mrt|สถานี|รถไฟฟ้า/.test(blob);
        if (opt.value === "mall") return /ห้าง|mall|terminal|emporium|emquartier|siam|central|paragon/.test(blob);
        return true;
      },
    },
    {
      id: "mood",
      title: "วันนี้รู้สึกยังไง?",
      hint: "เลือกอารมณ์ที่ตรงที่สุด — เราจะใช้สุ่มจากผลลัพธ์ที่เหลือ",
      getOptions: () => [
        { value: "comfort", label: "อยากกินอะไรอุ่น ๆ", emoji: "🍲" },
        { value: "fancy",   label: "ฉลองหน่อย",          emoji: "🥂" },
        { value: "spicy",   label: "ขออะไรเผ็ด ๆ",       emoji: "🌶️" },
        { value: "sweet",   label: "ของหวาน",            emoji: "🍰" },
        { value: "any",     label: "อะไรก็ได้",         emoji: "🎲" },
      ],
      filter: (opt, r) => {
        if (opt.value === "any") return true;
        const blob = ((r.foodType || "") + " " + (r.menus || []).map(m => m.name).join(" ")).toLowerCase();
        if (opt.value === "spicy")   return /เผ็ด|ส้มตำ|ต้มยำ|แกง|ยำ/.test(blob);
        if (opt.value === "sweet")   return /หวาน|ขนม|เค้ก|ไอติม|cafe|cafe|dessert|เบเกอ/.test(blob);
        if (opt.value === "comfort") return /ก๋วย|ข้าวต้ม|โจ๊ก|ราเมง|ซุป|noodle|soup/.test(blob);
        if (opt.value === "fancy")   return /พรีเมียม|fine|premium|ซีฟู้ด|steak|ญี่ปุ่น/.test(blob);
        return true;
      },
    },
  ];

  // Build options ranked by frequency in the current pool — keeps the quiz adaptive.
  function topOptions(pool, key, max, emoji) {
    const counts = new Map();
    for (const r of pool) {
      const v = r[key];
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max);
    return [
      { value: "", label: "ไหนก็ได้", emoji: "🌐" },
      ...sorted.map(([v]) => ({ value: v, label: v, emoji })),
    ];
  }

  // ---------- Quiz state machine ----------------------------------
  let step = 0;
  let pool = restaurants.slice();
  const history = []; // [{ qIndex, optionIndex, poolBefore }]

  renderProgress();
  renderStep();

  function renderProgress() {
    progressEl.innerHTML = "";
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const span = document.createElement("span");
      if (i < step) span.classList.add("is-done");
      if (i === step) span.classList.add("is-current");
      progressEl.appendChild(span);
    }
  }

  function renderStep() {
    renderProgress();

    if (step >= TOTAL_STEPS || pool.length <= 1) return renderResult();

    const q = QUESTIONS[step];
    const options = q.getOptions(pool);
    stepEl.innerHTML = `
      <div class="quiz-q">${esc(q.title)}</div>
      <div class="quiz-hint">${esc(q.hint || "")}</div>
      <div class="quiz-options" id="quiz-options">
        ${options.map((o, i) => `
          <button class="quiz-option" data-i="${i}">
            <span class="quiz-option__emoji">${o.emoji || "•"}</span>
            <span class="quiz-option__label">${esc(o.label)}</span>
          </button>
        `).join("")}
      </div>
      <div class="quiz-actions">
        <button class="glass-button is-ghost" id="btn-back" ${step === 0 ? "disabled" : ""}>← ย้อนกลับ</button>
        <span style="color: var(--text-muted); font-size: .9rem">เหลือ ${pool.length} ร้านที่ตรงเงื่อนไข</span>
      </div>
    `;

    document.getElementById("quiz-options").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-i]");
      if (!btn) return;
      const opt = options[parseInt(btn.dataset.i, 10)];
      const next = pool.filter((r) => q.filter(opt, r));
      // If the filter would empty the pool, keep the pool and just advance.
      history.push({ qIndex: step, option: opt, poolBefore: pool });
      pool = next.length ? next : pool;
      step++;
      renderStep();
    });

    document.getElementById("btn-back").addEventListener("click", () => {
      if (step === 0) return;
      step--;
      const last = history.pop();
      if (last) pool = last.poolBefore;
      renderStep();
    });
  }

  function renderResult() {
    const choice = pool[Math.floor(Math.random() * pool.length)] || restaurants[0];

    // Fill progress bar fully
    progressEl.querySelectorAll("span").forEach((s) => { s.classList.add("is-done"); s.classList.remove("is-current"); });

    stepEl.innerHTML = `
      <div class="quiz-result">
        <div class="badge">🎯 เราเลือกให้คุณแล้ว</div>
        <h2>${esc(choice.name)}</h2>
        <div class="meta">
          ${choice.area ? `<span class="glass-pill">📍 ${esc(choice.area)}</span>` : ""}
          ${choice.foodType ? `<span class="glass-pill">${esc(choice.foodType)}</span>` : ""}
          ${choice.rating ? `<span class="glass-pill">★ ${choice.rating.toFixed(1)}</span>` : ""}
          ${choice.priceRange ? `<span class="glass-pill">${esc(choice.priceRange)}</span>` : ""}
        </div>
        ${choice.pitch ? `<p style="color: var(--text-muted); max-width: 540px; margin: 0 auto var(--space-4)">${esc(choice.pitch)}</p>` : ""}

        ${choice.menus?.length ? `
          <div class="menus">
            <h3>🍽️ เมนูแนะนำ</h3>
            <ul>
              ${choice.menus.map((m) => `
                <li>
                  <strong>${esc(m.name)}</strong>
                  ${m.desc ? `<span>${esc(m.desc)}</span>` : ""}
                </li>
              `).join("")}
            </ul>
          </div>` : ""}

        ${choice.hours ? `<p style="color: var(--text-muted); font-size: .9rem; margin-bottom: var(--space-2)">🕐 ${esc(choice.hours)}</p>` : ""}
        ${choice.nearby ? `<p style="color: var(--text-muted); font-size: .9rem; margin-bottom: var(--space-4)">🚇 ${esc(choice.nearby)}</p>` : ""}

        <div class="result-actions">
          ${choice.mapUrl ? `<a class="glass-button" href="${esc(choice.mapUrl)}" target="_blank" rel="noopener">🗺️ ดูแผนที่</a>` : ""}
          <button class="glass-button is-primary" id="btn-find-buddies">🍽️ เริ่มหาเพื่อนกินข้าว</button>
          <button class="glass-button is-ghost" id="btn-retry">🎲 สุ่มใหม่</button>
        </div>
      </div>
    `;

    document.getElementById("btn-retry").addEventListener("click", () => {
      step = 0; pool = restaurants.slice(); history.length = 0; renderStep();
    });
    document.getElementById("btn-find-buddies").addEventListener("click", () => {
      window.WongnaiiParty.openCreator(choice);
    });
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();
