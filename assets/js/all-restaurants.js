/**
 * All-Restaurants page — filter, sort, paginate, render cards.
 * Works as a standalone page (pages/all-restaurants.html) and embedded in index.html.
 */
(async function () {
  const PAGE_SIZE = 12;

  const els = {
    grid:        document.getElementById("grid"),
    count:       document.getElementById("result-count"),
    pageCurrent: document.getElementById("page-current"),
    pageTotal:   document.getElementById("page-total"),
    prev:        document.getElementById("btn-prev"),
    next:        document.getElementById("btn-next"),
    filterName:  document.getElementById("filter-name"),
    filterZone:  document.getElementById("filter-zone"),
    filterFood:  document.getElementById("filter-food"),
    filterGroup: document.getElementById("filter-group"),
    sort:        document.getElementById("sort-by"),
    btnAdd:      document.getElementById("btn-add-restaurant"),
    top5:        document.getElementById("top5-strip"),
  };

  if (!els.grid) return; // not on this page

  const normFT = window.normalizeFoodType || ((t) => t);

  const state = {
    all: [],
    likes: {},
    parties: [],
    page: 1,
    filters: { zone: "", food: "", group: "", name: "" },
    sort: "random",
    randomSeed: Math.random(),
  };

  // ---- Boot --------------------------------------------------------
  els.grid.innerHTML = `<div class="ar-loading">กำลังโหลดร้านอาหาร...</div>`;

  const [restaurants, likes, parties] = await Promise.all([
    safe(WongnaiiAPI.listRestaurants(), []),
    safe(WongnaiiAPI.getLikes(), {}),
    safe(WongnaiiAPI.listParties(), []),
  ]);
  state.all = restaurants;
  state.likes = likes || {};
  state.parties = parties || [];

  buildFilterOptions(restaurants);
  renderTop5();
  render();

  async function safe(p, fallback) { try { return await p; } catch (e) { console.warn(e); return fallback; } }

  // ---- Filter setup -----------------------------------------------
  function buildFilterOptions(list) {
    const zones = [...new Set(list.map((r) => r.area).filter(Boolean))].sort();
    const foods = [...new Set(list.map((r) => normFT(r.foodType)).filter(Boolean))].sort();
    for (const z of zones) els.filterZone.insertAdjacentHTML("beforeend", `<option>${esc(z)}</option>`);
    for (const f of foods) els.filterFood.insertAdjacentHTML("beforeend", `<option>${esc(f)}</option>`);
  }

  // ---- Filter / sort logic ----------------------------------------
  function applyFilters() {
    let out = state.all.slice();
    const { zone, food, group, name } = state.filters;
    if (name) out = out.filter((r) => (r.name || "").toLowerCase().includes(name.toLowerCase()));
    if (zone) out = out.filter((r) => r.area === zone);
    if (food) out = out.filter((r) => normFT(r.foodType) === food);
    if (group) out = out.filter((r) => matchesGroup(r.groupSize, group));

    const userId  = WongnaiiIdentity.getId();
    const myLike  = (r) => (state.likes[r.id] || []).includes(userId) ? 1 : 0;
    const allLikes = (r) => (state.likes[r.id] || []).length;

    switch (state.sort) {
      case "rating-desc":
        out.sort((a, b) =>
          myLike(b)  - myLike(a)  ||
          (b.totalScore || 0) - (a.totalScore || 0) ||
          (b.rating || 0) - (a.rating || 0));
        break;
      case "rating-asc":
        out.sort((a, b) =>
          myLike(b)  - myLike(a)  ||
          (a.totalScore || 0) - (b.totalScore || 0) ||
          (a.rating || 0) - (b.rating || 0));
        break;
      case "reviews-desc":
        out.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      case "likes-desc":
        out.sort((a, b) =>
          myLike(b)  - myLike(a)  ||
          allLikes(b) - allLikes(a) ||
          (b.totalScore || 0) - (a.totalScore || 0) ||
          (b.rating || 0) - (a.rating || 0));
        break;
      case "score-desc":
        out.sort((a, b) =>
          (b.totalScore || 0) - (a.totalScore || 0) ||
          (b.rating || 0) - (a.rating || 0));
        break;
      case "name-asc":
        out.sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));
        break;
      default:
        out = seededShuffle(out, state.randomSeed);
        break;
    }
    return out;
  }

  // ---- Top 5 strip ------------------------------------------------
  function renderTop5() {
    if (!els.top5 || !state.all.length) return;
    const zone = state.filters.zone;
    const source = zone ? state.all.filter((r) => r.area === zone) : state.all.slice();
    const ranked = source.slice().sort((a, b) => {
      const la = (state.likes[a.id] || []).length;
      const lb = (state.likes[b.id] || []).length;
      if (lb !== la) return lb - la;
      return (b.rating || 0) - (a.rating || 0);
    }).slice(0, 5);

    if (!ranked.length) { els.top5.hidden = true; return; }
    els.top5.hidden = false;

    const label = zone ? esc(zone) : "ทั้งหมด";
    const chipHtml = (r, i) => {
      const lc = (state.likes[r.id] || []).length;
      return `
        <div class="ar-top5__chip" data-rid="${esc(r.id || r.name)}" style="cursor:pointer" role="button" tabindex="0">
          <span class="ar-top5__rank">#${i + 1}</span>
          <div class="ar-top5__info">
            <div class="ar-top5__name">${esc(r.name)}</div>
            <div class="ar-top5__stats">
              ${lc ? `<span>♥ ${lc}</span>` : ""}
              ${r.rating ? `<span>★ ${r.rating.toFixed(1)}</span>` : ""}
              ${r.area && !zone ? `<span>📍 ${esc(r.area)}</span>` : ""}
            </div>
          </div>
        </div>
      `;
    };
    const chips = ranked.map(chipHtml).join("");
    els.top5.innerHTML = `
      <div class="ar-top5__head">
        <span class="ar-top5__title">🏆 Top 5 ย่าน${label}</span>
      </div>
      <div class="ar-top5__row">
        <div class="ar-top5__track">${chips}${chips}</div>
      </div>
    `;
  }

  function matchesGroup(groupSizeText, requested) {
    const t = (groupSizeText || "").toLowerCase();
    const n = parseInt(requested, 10);
    if (n >= 10) return /(กลุ่ม|ใหญ่|รองรับกลุ่ม|10|มาก)/.test(t);
    if (n >= 8)  return /(กลุ่ม|รองรับ|เหมาะ|มาก|8)/.test(t);
    if (n >= 4)  return /(กลุ่ม|เหมาะ|รองรับ|4|ครอบครัว)/.test(t);
    if (n >= 2)  return /(เหมาะ|คู่|2)/.test(t) || true;
    return true;
  }

  function seededShuffle(arr, seed) {
    let s = Math.floor(seed * 1e9);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Render ------------------------------------------------------
  function render() {
    const filtered = applyFilters();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    els.count.textContent = total;
    els.pageCurrent.textContent = state.page;
    els.pageTotal.textContent = totalPages;
    els.prev.disabled = state.page <= 1;
    els.next.disabled = state.page >= totalPages;

    if (!total) {
      els.grid.innerHTML = `<div class="ar-empty">ไม่พบร้านที่ตรงกับตัวกรอง — ลองปรับเงื่อนไขใหม่ดูครับ</div>`;
      return;
    }

    els.grid.innerHTML = slice.map(renderCard).join("");
  }

  function renderCard(r) {
    const liked = (state.likes[r.id] || []).includes(WongnaiiIdentity.getId());
    const likeCount = (state.likes[r.id] || []).length;
    const activeParty = state.parties.find((p) => p.restaurantId === r.id && p.status !== "closed");
    return `
      <article class="glass-card r-card" data-id="${esc(r.id)}" style="cursor:pointer">
        ${activeParty ? `<div class="r-card__party-badge">🔥 มี Party กำลังเปิดอยู่</div>` : ""}
        <div class="r-card__top">
          <div>
            <div class="r-card__title">${esc(r.name)}</div>
            <div class="r-card__type">${esc(r.foodType || "")}</div>
          </div>
          <div class="r-heart-wrap">
            ${r.totalScore != null ? `<div class="r-score-badge">${r.totalScore}<span class="r-score-badge__denom">/100</span></div>` : ""}
            <button class="r-heart ${liked ? "is-liked" : ""}" data-act="like">
              ${liked ? "♥" : "♡"}
            </button>
            ${likeCount > 0 ? `<span class="r-heart-count">${likeCount}</span>` : ""}
          </div>
        </div>

        <div class="r-card__meta">
          ${r.area ? `<span class="glass-pill">📍 ${esc(r.area)}</span>` : ""}
          ${r.rating ? `<span class="glass-pill">★ ${r.rating.toFixed(1)}${r.reviewCount ? ` (${r.reviewCount})` : ""}</span>` : ""}
          ${r.priceRange ? `<span class="glass-pill">${esc(r.priceRange)}</span>` : ""}
        </div>

        <div class="r-card__info">
          ${r.hours ? `<div class="row"><span>🕐</span><span>${esc(r.hours)}</span></div>` : ""}
          ${r.nearby ? `<div class="row"><span>🚇</span><span>${esc(r.nearby)}</span></div>` : ""}
          ${r.menus?.[0]?.name ? `<div class="row"><span>🍽️</span><span><strong>${esc(r.menus[0].name)}</strong>${r.menus[0].desc ? " — " + esc(r.menus[0].desc) : ""}</span></div>` : ""}
        </div>

        <div class="r-card__actions">
          <button class="glass-button is-primary" data-act="find-buddies">🍽️ เริ่มหาเพื่อนกินข้าว</button>
          ${activeParty
            ? `<button class="glass-button" data-act="join-list">คุณอยากกินวงไหน?</button>`
            : r.mapUrl ? `<a class="glass-button is-ghost" href="${esc(r.mapUrl)}" target="_blank" rel="noopener">🗺️ แผนที่</a>` : ""}
        </div>
      </article>
    `;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---- Event wiring -----------------------------------------------
  els.filterName.addEventListener("input", () => { state.filters.name = els.filterName.value.trim(); state.page = 1; render(); });
  els.filterZone.addEventListener("change", () => { state.filters.zone = els.filterZone.value; state.page = 1; renderTop5(); render(); });
  els.filterFood.addEventListener("change", () => { state.filters.food = els.filterFood.value; state.page = 1; render(); });
  els.sort.addEventListener("change", () => { state.sort = els.sort.value; state.page = 1; render(); });

  els.filterGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-size]");
    if (!btn) return;
    els.filterGroup.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.filters.group = btn.dataset.size;
    state.page = 1;
    render();
  });

  els.prev.addEventListener("click", () => { if (state.page > 1) { state.page--; render(); scrollTop(); } });
  els.next.addEventListener("click", () => { state.page++; render(); scrollTop(); });

  // Top 5 chip click → detail popup
  els.top5.addEventListener("click", (e) => {
    const chip = e.target.closest(".ar-top5__chip[data-rid]");
    if (!chip || !window.WongnaiiDetail) return;
    const r = state.all.find((x) => (x.id || x.name) === chip.dataset.rid);
    if (r) window.WongnaiiDetail.show(r);
  });

  // Card click → actions or detail popup
  els.grid.addEventListener("click", async (e) => {
    const card = e.target.closest(".r-card");
    if (!card) return;
    const id = card.dataset.id;
    const restaurant = state.all.find((r) => r.id === id);

    if (e.target.closest("[data-act=like]")) {
      e.preventDefault();
      const userId = WongnaiiIdentity.getId();
      try {
        const res = await WongnaiiAPI.toggleLike(id, userId);
        state.likes[id] = state.likes[id] || [];
        if (res.liked) state.likes[id] = [...new Set([...state.likes[id], userId])];
        else state.likes[id] = state.likes[id].filter((u) => u !== userId);
        render();
      } catch (err) {
        console.error(err);
        alert("ไม่สามารถบันทึก Like ได้ — ตรวจ Apps Script config");
      }
      return;
    }

    if (e.target.closest("[data-act=find-buddies]")) {
      window.WongnaiiParty.openCreator(restaurant);
      return;
    }
    if (e.target.closest("[data-act=join-list]")) {
      window.WongnaiiParty.openSeeker(restaurant, state.parties);
      return;
    }
    if (e.target.closest("a")) return;

    // Click on card body → show detail popup
    if (restaurant && window.WongnaiiDetail) {
      window.WongnaiiDetail.show(restaurant);
    }
  });

  // Scroll to top of the section (not page top, since on home page hero is above)
  function scrollTop() {
    const sec = document.getElementById("section-restaurants");
    if (sec) sec.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- Toast helper -----------------------------------------------
  function showToast(type, message, duration = 6000) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span class="toast__icon">✉️</span><span class="toast__msg">${esc(message)}</span>`;
    container.appendChild(toast);
    const remove = () => {
      toast.classList.add("is-hiding");
      setTimeout(() => toast.remove(), 350);
    };
    toast.addEventListener("click", remove);
    setTimeout(remove, duration);
  }

  // ---- Add Restaurant modal ---------------------------------------
  const modal = document.getElementById("modal-add");
  const form  = document.getElementById("add-form");

  els.btnAdd.addEventListener("click", () => {
    const name = WongnaiiIdentity.getName();
    if (name) document.getElementById("f-submitter").value = name;
    modal.classList.add("is-open");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-modal-close]")) {
      modal.classList.remove("is-open");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      submitterName:   document.getElementById("f-submitter").value.trim(),
      restaurantName:  document.getElementById("f-restaurant").value.trim(),
      area:            document.getElementById("f-zone").value,
      review:          document.getElementById("f-review").value.trim(),
      recommendMenu:   document.getElementById("f-menu").value.trim(),
      recommendMenuDesc: document.getElementById("f-menu-desc").value.trim(),
    };
    if (payload.submitterName) WongnaiiIdentity.setName(payload.submitterName);

    modal.classList.remove("is-open");
    form.reset();

    showToast("info", `กำลังตรวจสอบ "${payload.restaurantName}" ย่าน${payload.area}… (ใช้เวลา ~15 วิ)`, 20000);

    try {
      await WongnaiiAPI.submitRestaurant(payload);
      document.querySelector(".toast--info")?.click();
      showToast("success", `เพิ่มร้าน "${payload.restaurantName}" สำเร็จแล้ว! จะปรากฏหลัง reload`);
    } catch (err) {
      console.error(err);
      document.querySelector(".toast--info")?.click();
      showToast("error", err.message, 10000);
    }
  });
})();
