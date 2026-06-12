document.addEventListener("DOMContentLoaded", () => {
  // ---------- Elements ----------
  const saveCurrentBtn = document.getElementById("saveCurrent");
  const manualForm = document.getElementById("manualForm");
  const titleInput = document.getElementById("titleInput");
  const urlInput = document.getElementById("urlInput");
  const linksList = document.getElementById("linksList");
  const counter = document.getElementById("counter");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearch");
  const themeToggle = document.getElementById("themeToggle");
  const menuToggle = document.getElementById("menuToggle");
  const menu = document.getElementById("menu");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const openAllBtn = document.getElementById("openAllBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const toastEl = document.getElementById("toast");

  const LINKS_KEY = "savedLinks";
  const THEME_KEY = "theme";

  let links = [];
  let searchTerm = "";
  let editingId = null;
  let toastTimer = null;

  // ---------- Helpers ----------
  function uid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeUrl(url) {
    try {
      return new URL(url).href;
    } catch {
      return null;
    }
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }

  function faviconUrl(url) {
    try {
      const { hostname } = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
    } catch {
      return "";
    }
  }

  function colorFor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }

  function timeAgo(ts) {
    if (!ts) return "";
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(mo / 12)}y ago`;
  }

  function toast(message) {
    // The toast doubles as an aria-live region, so it must stay in the DOM
    // (never display:none) for the text swap to be announced.
    toastEl.textContent = message;
    requestAnimationFrame(() => toastEl.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // ---------- Storage ----------
  async function loadLinks() {
    const result = await chrome.storage.local.get(LINKS_KEY);
    const raw = Array.isArray(result[LINKS_KEY]) ? result[LINKS_KEY] : [];
    // Migrate older entries that lack id / createdAt / pinned.
    let changed = false;
    links = raw.map((item) => {
      const migrated = {
        id: item.id || uid(),
        title: item.title || "Untitled",
        url: item.url,
        createdAt: item.createdAt || Date.now(),
        pinned: Boolean(item.pinned),
      };
      if (!item.id || !item.createdAt || item.pinned === undefined) changed = true;
      return migrated;
    });
    if (changed) await persist();
  }

  async function persist() {
    await chrome.storage.local.set({ [LINKS_KEY]: links });
  }

  async function addLink({ title, url }) {
    // Normalize at this single choke point so save-current, manual add and
    // import all dedup against the same canonical URL form.
    const normalized = normalizeUrl(url);
    if (!normalized) {
      toast("Enter a valid URL");
      return false;
    }
    if (links.some((item) => item.url === normalized)) {
      toast("Already saved");
      return false;
    }
    links.unshift({
      id: uid(),
      title: title || hostOf(normalized),
      url: normalized,
      createdAt: Date.now(),
      pinned: false,
    });
    await persist();
    render();
    toast("Saved ✓");
    return true;
  }

  // ---------- Render ----------
  function visibleLinks() {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? links.filter(
          (l) =>
            (l.title || "").toLowerCase().includes(term) ||
            (l.url || "").toLowerCase().includes(term)
        )
      : links.slice();
    // Pinned first; stable sort keeps newest-first order within each group.
    return filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }

  function render() {
    const items = visibleLinks();
    counter.textContent = `${links.length} saved`;
    clearSearchBtn.classList.toggle("hidden", searchTerm.length === 0);

    if (links.length === 0) {
      linksList.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    if (items.length === 0) {
      linksList.innerHTML = `<li class="empty-state" style="padding:18px 8px">No links match “${escapeHtml(
        searchTerm
      )}”.</li>`;
      return;
    }

    linksList.innerHTML = items
      .map((link) => {
        const host = hostOf(link.url);
        const letter = (host[0] || "?").toUpperCase();
        const titleArea =
          editingId === link.id
            ? `<input class="title-edit" type="text" value="${escapeHtml(link.title)}" />`
            : `<div class="link-title">${escapeHtml(link.title || "Untitled")}</div>`;
        const pinLabel = link.pinned ? "Unpin" : "Pin to top";
        return `
          <li class="link-item ${link.pinned ? "pinned" : ""}" data-id="${link.id}">
            <div class="link-main">
              <img class="favicon" src="${escapeHtml(faviconUrl(link.url))}" alt=""
                   data-letter="${escapeHtml(letter)}" data-color="${escapeHtml(colorFor(host))}" />
              <div class="link-body">
                ${titleArea}
                <div class="link-url">${escapeHtml(link.url)}</div>
                <div class="link-meta">${escapeHtml(host)} · ${timeAgo(link.createdAt)}</div>
              </div>
              <button class="mini-btn star ${link.pinned ? "active" : ""}" data-action="pin"
                      aria-pressed="${link.pinned ? "true" : "false"}"
                      aria-label="${pinLabel}" title="${pinLabel}">${link.pinned ? "★" : "☆"}</button>
            </div>
            <div class="link-actions">
              <button class="mini-btn" data-action="open" aria-label="Open in new tab" title="Open in new tab">↗</button>
              <button class="mini-btn" data-action="copy" aria-label="Copy URL" title="Copy URL">⧉</button>
              <button class="mini-btn" data-action="edit" aria-label="Edit title" title="Edit title">✎</button>
              <button class="mini-btn" data-action="delete" aria-label="Delete" title="Delete">🗑</button>
            </div>
          </li>`;
      })
      .join("");

    // Favicon fallback (inline onerror is blocked by extension CSP).
    linksList.querySelectorAll("img.favicon").forEach((img) => {
      img.addEventListener("error", () => {
        const span = document.createElement("span");
        span.className = "fallback-icon";
        span.style.background = img.dataset.color || "#888";
        span.textContent = img.dataset.letter || "?";
        img.replaceWith(span);
      });
    });

    // Focus the inline title editor if active.
    if (editingId) {
      const editor = linksList.querySelector(".title-edit");
      if (editor) {
        editor.focus();
        editor.select();
        editor.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitEdit(editor.value);
          } else if (e.key === "Escape") {
            editingId = null;
            render();
          }
        });
        editor.addEventListener("blur", () => commitEdit(editor.value));
      }
    }
  }

  async function commitEdit(value) {
    const link = links.find((l) => l.id === editingId);
    editingId = null;
    if (link) {
      const next = value.trim();
      if (next && next !== link.title) {
        link.title = next;
        await persist();
        toast("Renamed ✓");
      }
    }
    render();
  }

  // ---------- List actions ----------
  linksList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const li = button.closest(".link-item");
    if (!li) return;
    const id = li.dataset.id;
    const link = links.find((l) => l.id === id);
    if (!link) return;

    const action = button.dataset.action;

    if (action === "open") {
      await chrome.tabs.create({ url: link.url });
    } else if (action === "copy") {
      try {
        await navigator.clipboard.writeText(link.url);
        toast("Copied to clipboard 📋");
      } catch {
        toast("Couldn't copy");
      }
    } else if (action === "pin") {
      link.pinned = !link.pinned;
      await persist();
      render();
      toast(link.pinned ? "Pinned ★" : "Unpinned");
    } else if (action === "edit") {
      editingId = id;
      render();
    } else if (action === "delete") {
      links = links.filter((l) => l.id !== id);
      await persist();
      render();
      toast("Deleted");
    }
  });

  // ---------- Save current tab ----------
  saveCurrentBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      toast("No active tab");
      return;
    }
    await addLink({ title: tab.title || tab.url, url: tab.url });
  });

  // ---------- Manual add ----------
  manualForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const normalized = normalizeUrl(urlInput.value.trim());
    if (!normalized) {
      toast("Enter a valid URL");
      urlInput.focus();
      return;
    }
    await addLink({ title: titleInput.value.trim(), url: normalized });
    titleInput.value = "";
    urlInput.value = "";
  });

  // ---------- Search ----------
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value;
    render();
  });
  clearSearchBtn.addEventListener("click", () => {
    searchTerm = "";
    searchInput.value = "";
    searchInput.focus();
    render();
  });

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  themeToggle.addEventListener("click", async () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    await chrome.storage.local.set({ [THEME_KEY]: next });
  });

  // ---------- Overflow menu ----------
  menuToggle.addEventListener("click", () => menu.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== menuToggle && !menu.classList.contains("hidden")) {
      menu.classList.add("hidden");
    }
  });

  // ---------- Export ----------
  exportBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    if (links.length === 0) {
      toast("Nothing to export");
      return;
    }
    const blob = new Blob([JSON.stringify(links, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quick-links-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${links.length} link(s)`);
  });

  // ---------- Import ----------
  importBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    importFile.click();
  });
  importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error("bad format");
      let added = 0;
      for (const item of data) {
        const url = normalizeUrl(item.url || "");
        if (!url || links.some((l) => l.url === url)) continue;
        links.push({
          id: uid(),
          title: (item.title || hostOf(url)).toString(),
          url,
          createdAt: item.createdAt || Date.now(),
          pinned: Boolean(item.pinned),
        });
        added++;
      }
      await persist();
      render();
      toast(added ? `Imported ${added} new link(s)` : "No new links found");
    } catch {
      toast("Invalid JSON file");
    }
    importFile.value = "";
  });

  // ---------- Open all (filtered) ----------
  openAllBtn.addEventListener("click", async () => {
    menu.classList.add("hidden");
    const items = visibleLinks();
    if (items.length === 0) {
      toast("Nothing to open");
      return;
    }
    if (items.length > 8 && !confirm(`Open ${items.length} tabs?`)) return;
    for (const link of items) await chrome.tabs.create({ url: link.url, active: false });
    toast(`Opened ${items.length} tab(s)`);
  });

  // ---------- Clear all ----------
  clearAllBtn.addEventListener("click", async () => {
    menu.classList.add("hidden");
    if (links.length === 0) return;
    if (!confirm(`Delete all ${links.length} saved link(s)? This cannot be undone.`)) return;
    links = [];
    await persist();
    render();
    toast("All links cleared");
  });

  // ---------- Init ----------
  (async () => {
    const stored = await chrome.storage.local.get(THEME_KEY);
    const theme =
      stored[THEME_KEY] ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(theme);
    await loadLinks();
    render();
  })();
});
