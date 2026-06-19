/**
 * Three-row infinite marquee. Rows 1 & 3 scroll left, row 2 scrolls right.
 * Each row hover-pauses independently. Duplicates content for seamless loop.
 */
(async function () {
  const container = document.getElementById("marquee");
  if (!container) return;

  const FOOD_EMOJI = ["🍜", "🍣", "🍔", "🍕", "🍱", "🥘", "🍲", "🍛", "🥟", "🍝", "🥗", "🍤", "🌮", "🍢", "🍰", "🍩", "🥐", "🍇", "🍉"];
  const pickEmoji = (seed) => {
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return FOOD_EMOJI[h % FOOD_EMOJI.length];
  };

  let restaurants = [];
  try {
    restaurants = await WongnaiiAPI.listRestaurants();
  } catch (err) {
    console.warn("[marquee] could not load restaurants, using placeholders", err);
  }

  // If empty (config not done yet), seed with placeholders so the page still feels alive.
  if (!restaurants.length) {
    restaurants = [
      "Nara Thai • อโศก", "Savoey • อโศก", "After You • สยาม", "Ros Niyom • สีลม",
      "Krua Apsorn • พระนคร", "Som Tam Nua • สยาม", "Greyhound Cafe • เอกมัย",
      "Issaya • สาทร", "Jay Fai • พระนคร", "Hai Som Tam Convent • สีลม",
      "Polo Fried Chicken • ลุมพินี", "Err • ท่าเตียน",
    ].map((s, i) => {
      const [name, area] = s.split(" • ");
      return { id: name, name, area, foodType: "อาหารไทย", rating: 4.5 + (i % 5) / 10 };
    });
  }

  // Shuffle helper
  const shuffled = () => [...restaurants].sort(() => Math.random() - 0.5);

  function chip(r) {
    const el = document.createElement("div");
    el.className = "marquee-chip";
    el.dataset.rid = r.id || r.name;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.style.cursor = "pointer";
    el.innerHTML = `
      <div class="marquee-chip__emoji" aria-hidden="true">${pickEmoji(r.name)}</div>
      <div style="min-width:0; flex:1">
        <div class="marquee-chip__name">${escape(r.name)}</div>
        <div class="marquee-chip__meta">${escape(r.area || "")}${r.rating ? ` • ★ ${r.rating.toFixed(1)}` : ""}</div>
      </div>
    `;
    return el;
  }

  function escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function buildRow(direction, durationSec) {
    const row = document.createElement("div");
    row.className = "marquee-row";
    row.dataset.direction = direction;

    const track = document.createElement("div");
    track.className = "marquee-track";
    track.style.setProperty("--marquee-duration", `${durationSec}s`);

    // Duplicate items so the loop is seamless
    const items = shuffled();
    [...items, ...items].forEach((r) => track.appendChild(chip(r)));

    row.appendChild(track);
    return row;
  }

  container.appendChild(buildRow("left",  400));
  container.appendChild(buildRow("right", 450));
  container.appendChild(buildRow("left",  500));

  // Click chip → show detail popup
  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".marquee-chip[data-rid]");
    if (!chip || !window.WongnaiiDetail) return;
    const r = restaurants.find((x) => (x.id || x.name) === chip.dataset.rid);
    if (r) window.WongnaiiDetail.show(r);
  });
  container.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const chip = e.target.closest(".marquee-chip[data-rid]");
      if (chip) chip.click();
    }
  });
})();
