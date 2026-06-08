/**
 * Party System — Creator (host) + Seeker (joiner) + Chat (polling).
 * All state lives in data/parties.json + data/chats/<id>.json via Apps Script.
 */
(function () {
  // Inject the party.css link (page authors don't need to remember it)
  if (!document.querySelector('link[data-party-css]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.partyCss = "1";
    // resolve relative to current page
    const here = location.pathname.replace(/\/[^/]*$/, "/");
    link.href = here + (here.endsWith("/pages/") ? "../" : "") + "assets/css/party.css";
    document.head.appendChild(link);
  }

  const container = document.getElementById("party-modals") || (() => {
    const d = document.createElement("div"); d.id = "party-modals"; document.body.appendChild(d); return d;
  })();

  function modalShell(id, innerHTML) {
    return `
      <div class="glass-modal-scrim is-open" id="${id}" role="dialog" aria-modal="true">
        <div class="glass-modal party-modal">${innerHTML}</div>
      </div>`;
  }

  function close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove("is-open"); setTimeout(() => el.remove(), 400); }
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ====================================================================
  // CREATOR — host opens this, fills form, party is created with 15-min timer
  // ====================================================================
  function openCreator(restaurant) {
    const hostName = WongnaiiIdentity.getName() || "";
    const html = `
      <h2 style="margin-bottom: .25rem">เริ่มหาเพื่อนกินข้าว</h2>
      <p style="color: var(--text-muted); margin-bottom: 1.25rem">ที่ <strong>${esc(restaurant.name)}</strong></p>
      <form class="party-form" id="party-create-form">
        <div class="form-row">
          <div>
            <label>ชื่อ Party *</label>
            <input id="pf-party-name" class="glass-input" placeholder="เช่น มากินมื้อเย็น" required>
          </div>
          <div>
            <label>ชื่อ Host *</label>
            <input id="pf-host" class="glass-input" value="${esc(hostName)}" required>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label>เวลาที่จะกิน *</label>
            <input id="pf-time" class="glass-input" placeholder="เช่น 19:00 วันนี้" required>
          </div>
          <div>
            <label>จำนวนคน *</label>
            <input id="pf-people" class="glass-input" type="number" min="2" max="20" value="4" required>
          </div>
        </div>
        <div>
          <label>รายละเอียดเพิ่มเติม</label>
          <textarea id="pf-details" class="glass-input" rows="3" placeholder="เช่น เจอกันหน้าร้าน, ใส่เสื้อสีแดง..."></textarea>
        </div>
        <div style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:.5rem">
          <button type="button" class="glass-button" data-close>ยกเลิก</button>
          <button type="submit" class="glass-button is-primary">สร้าง Party (15 นาที)</button>
        </div>
      </form>`;
    container.insertAdjacentHTML("beforeend", modalShell("party-creator", html));
    const scrim = document.getElementById("party-creator");
    scrim.addEventListener("click", (e) => {
      if (e.target === scrim || e.target.closest("[data-close]")) close("party-creator");
    });
    document.getElementById("party-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.submitter; btn.disabled = true; btn.textContent = "กำลังสร้าง...";
      const hostName = document.getElementById("pf-host").value.trim();
      WongnaiiIdentity.setName(hostName);
      try {
        const party = await WongnaiiAPI.createParty({
          restaurantId: restaurant.id,
          partyName: document.getElementById("pf-party-name").value.trim(),
          hostName,
          hostId: WongnaiiIdentity.getId(),
          eatTime: document.getElementById("pf-time").value.trim(),
          requiredPeople: parseInt(document.getElementById("pf-people").value, 10),
          details: document.getElementById("pf-details").value.trim(),
        });
        close("party-creator");
        openDashboard(restaurant, party);
      } catch (err) {
        console.error(err);
        alert("ไม่สามารถสร้าง Party ได้: " + err.message);
        btn.disabled = false; btn.textContent = "สร้าง Party (15 นาที)";
      }
    });
  }

  // ====================================================================
  // DASHBOARD — host sees joiners + can start chat / close party
  // ====================================================================
  function openDashboard(restaurant, party) {
    const isHost = party.hostId === WongnaiiIdentity.getId();
    const html = `
      <h2 style="margin-bottom: .25rem">${esc(party.partyName)}</h2>
      <p style="color: var(--text-muted); margin-bottom: 1rem">ที่ <strong>${esc(restaurant.name)}</strong> · ${esc(party.eatTime)}</p>
      <div class="countdown" id="party-countdown">
        <div style="font-size: 1.6rem">⏱️</div>
        <div>
          <div class="countdown__time" id="party-countdown-time">15:00</div>
          <div class="countdown__label">เวลารับสมัคร (Recruitment)</div>
        </div>
      </div>

      <div style="margin-top: 1.25rem">
        <h3 style="font-size: 1rem; margin-bottom: .25rem">สมาชิก <span id="party-count">${party.members.length}</span> / ${party.requiredPeople}</h3>
        <table class="members-table">
          <thead><tr><th>ชื่อ</th><th style="text-align:right">เข้าร่วมเมื่อ</th></tr></thead>
          <tbody id="party-members"></tbody>
        </table>
      </div>

      <div id="party-actions" style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1.25rem">
        ${isHost ? `
          <button class="glass-button" data-close>ปิดหน้าต่าง</button>
          <button class="glass-button is-primary" id="btn-start-chat">เริ่มคุย (Start Chat)</button>
        ` : `<button class="glass-button" data-close>ออก</button>`}
      </div>

      <div id="chat-section" style="display:none"></div>`;

    container.insertAdjacentHTML("beforeend", modalShell("party-dashboard", html));
    const scrim = document.getElementById("party-dashboard");
    scrim.addEventListener("click", (e) => {
      if (e.target === scrim || e.target.closest("[data-close]")) {
        stopPoll(); close("party-dashboard");
      }
    });

    renderMembers(party);
    startCountdown(party);
    let pollHandle;
    function startPoll() {
      pollHandle = setInterval(async () => {
        try {
          const list = await WongnaiiAPI.listParties(restaurant.id);
          const fresh = list.find((p) => p.id === party.id);
          if (fresh) { party = fresh; renderMembers(party); }
        } catch (e) { /* keep trying */ }
      }, 4000);
    }
    function stopPoll() { if (pollHandle) clearInterval(pollHandle); }
    startPoll();

    const startBtn = document.getElementById("btn-start-chat");
    if (startBtn) startBtn.addEventListener("click", async () => {
      startBtn.disabled = true; startBtn.textContent = "...";
      try {
        // mark party as chatting (we reuse joinParty semantics — Apps Script doesn't need a separate action for now)
        // For simplicity, just open chat UI; party stays "recruiting" until host closes.
        openChat(party);
      } finally {
        startBtn.disabled = false; startBtn.textContent = "เริ่มคุย (Start Chat)";
      }
    });
  }

  function renderMembers(party) {
    const tbody = document.getElementById("party-members");
    if (!tbody) return;
    document.getElementById("party-count").textContent = party.members.length;
    tbody.innerHTML = party.members.map((m) => `
      <tr>
        <td>${esc(m.name)}${m.host ? `<span class="host-tag">HOST</span>` : ""}</td>
        <td style="text-align:right; color: var(--text-muted); font-size: .85rem">${new Date(m.joinedAt).toLocaleTimeString("th-TH")}</td>
      </tr>
    `).join("");
  }

  function startCountdown(party) {
    const timeEl = document.getElementById("party-countdown-time");
    const card = document.getElementById("party-countdown");
    function tick() {
      const ms = party.expiresAt - Date.now();
      if (ms <= 0) {
        timeEl.textContent = "หมดเวลา";
        card.classList.add("is-expired");
        clearInterval(handle);
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      timeEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
    }
    tick();
    const handle = setInterval(tick, 1000);
  }

  // ====================================================================
  // CHAT — replaces dashboard footer with chat box, polls every 3s
  // ====================================================================
  function openChat(party) {
    const section = document.getElementById("chat-section");
    document.getElementById("party-actions").style.display = "none";
    section.style.display = "block";
    section.innerHTML = `
      <h3 style="margin-top: 1.25rem; font-size: 1rem">💬 แชท</h3>
      <div class="chat-box">
        <div class="chat-messages" id="chat-msgs"></div>
        <form class="chat-form" id="chat-form">
          <input id="chat-input" class="glass-input" placeholder="พิมพ์ข้อความ..." autocomplete="off" required>
          <button class="glass-button is-primary">ส่ง</button>
        </form>
      </div>
      <div style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1rem">
        ${party.hostId === WongnaiiIdentity.getId()
          ? `<button class="glass-button" id="btn-close-party">ปิด Party</button>`
          : `<button class="glass-button" data-close>ออก</button>`}
      </div>`;

    const msgsEl = document.getElementById("chat-msgs");
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    let lastTs = 0;
    const myId = WongnaiiIdentity.getId();

    function renderBubble(m) {
      const isMe = m.user?.id === myId;
      const div = document.createElement("div");
      div.className = "chat-bubble" + (isMe ? " is-me" : "");
      div.innerHTML = `
        ${!isMe ? `<div class="chat-bubble__author">${esc(m.user?.name || "?")}</div>` : ""}
        <div class="chat-bubble__text">${esc(m.message)}</div>`;
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    async function poll() {
      try {
        const msgs = await WongnaiiAPI.getMessages(party.id, lastTs);
        msgs.forEach((m) => { renderBubble(m); lastTs = Math.max(lastTs, m.ts); });
      } catch (e) { /* ignore */ }
    }
    poll();
    const handle = setInterval(poll, 3000);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      try {
        await WongnaiiAPI.postMessage(party.id, { id: myId, name: WongnaiiIdentity.getName() || "ผู้ใช้" }, text);
        poll();
      } catch (err) { alert("ส่งไม่สำเร็จ: " + err.message); }
    });

    const closeBtn = document.getElementById("btn-close-party");
    if (closeBtn) closeBtn.addEventListener("click", async () => {
      if (!confirm("ปิด Party นี้? สมาชิกจะออกจากแชท")) return;
      try {
        await WongnaiiAPI.closeParty(party.id);
        clearInterval(handle);
        close("party-dashboard");
      } catch (err) { alert("ปิดไม่สำเร็จ: " + err.message); }
    });

    // Stop polling when modal is closed
    const scrim = document.getElementById("party-dashboard");
    const observer = new MutationObserver(() => {
      if (!document.body.contains(scrim)) { clearInterval(handle); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true });
  }

  // ====================================================================
  // SEEKER — show list of active parties for this restaurant, joinable
  // ====================================================================
  function openSeeker(restaurant, allParties) {
    const parties = (allParties || []).filter((p) =>
      p.restaurantId === restaurant.id && p.status !== "closed" && p.expiresAt > Date.now()
    );
    const html = `
      <h2 style="margin-bottom: .25rem">คุณอยากกินวงไหน?</h2>
      <p style="color: var(--text-muted); margin-bottom: 1rem">Party ที่ <strong>${esc(restaurant.name)}</strong></p>
      <div class="seeker-list" id="seeker-list">
        ${parties.length ? parties.map(renderSeekerCard).join("") :
          `<div class="ar-empty">ยังไม่มี Party ที่กำลังเปิดอยู่ — ลองเป็นคนเริ่มเองดูไหม?</div>`}
      </div>
      <div style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1.25rem">
        <button class="glass-button" data-close>ปิด</button>
      </div>`;
    container.insertAdjacentHTML("beforeend", modalShell("party-seeker", html));
    const scrim = document.getElementById("party-seeker");
    scrim.addEventListener("click", async (e) => {
      if (e.target === scrim || e.target.closest("[data-close]")) close("party-seeker");
      const joinBtn = e.target.closest("[data-join]");
      if (joinBtn) {
        const partyId = joinBtn.dataset.join;
        const party = parties.find((p) => p.id === partyId);
        const name = WongnaiiIdentity.getOrPromptName("ใส่ชื่อของคุณเพื่อเข้า Party");
        if (!name) return;
        joinBtn.disabled = true; joinBtn.textContent = "กำลังเข้า...";
        try {
          const updated = await WongnaiiAPI.joinParty(partyId, { id: WongnaiiIdentity.getId(), name });
          close("party-seeker");
          openDashboard(restaurant, updated);
        } catch (err) {
          alert("เข้าไม่สำเร็จ: " + err.message);
          joinBtn.disabled = false; joinBtn.textContent = "เข้า Party";
        }
      }
    });
  }

  function renderSeekerCard(p) {
    const remaining = Math.max(0, p.expiresAt - Date.now());
    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    return `
      <div class="glass-card seeker-card">
        <div>
          <div class="seeker-card__name">${esc(p.partyName)}</div>
          <div class="seeker-card__meta">
            <span>⏱️ เหลือ <strong>${min}:${String(sec).padStart(2,"0")}</strong> / 15:00</span>
            <span>👥 <strong>${p.members.length}</strong> / ${p.requiredPeople}</span>
            <span>🍽️ ${esc(p.eatTime)}</span>
            <span>Host: <strong>${esc(p.hostName)}</strong></span>
          </div>
        </div>
        <button class="glass-button is-primary" data-join="${esc(p.id)}">เข้า Party</button>
      </div>`;
  }

  window.WongnaiiParty = { openCreator, openSeeker };
})();
