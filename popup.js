document.addEventListener("DOMContentLoaded", () => {
  const saveCurrentBtn = document.getElementById("saveCurrent");
  const manualForm = document.getElementById("manualForm");
  const titleInput = document.getElementById("titleInput");
  const urlInput = document.getElementById("urlInput");
  const linksList = document.getElementById("linksList");

  async function getLinks() {
    const result = await chrome.storage.local.get("savedLinks");
    return Array.isArray(result.savedLinks) ? result.savedLinks : [];
  }

  async function saveLinks(links) {
    await chrome.storage.local.set({ savedLinks: links });
  }

  function normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.href;
    } catch {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function addLink(link) {
    const links = await getLinks();
    const alreadyExists = links.some((item) => item.url === link.url);

    if (alreadyExists) {
      return false;
    }

    links.unshift(link);
    await saveLinks(links);
    await renderLinks();
    return true;
  }

  async function renderLinks() {
    const links = await getLinks();
    linksList.innerHTML = "";

    if (links.length === 0) {
      linksList.innerHTML = "<li>No saved links yet.</li>";
      return;
    }

    const itemsMarkup = links
      .map(
        (link, index) => `
          <li class="link-item">
            <div class="link-title">${escapeHtml(link.title || "Untitled")}</div>
            <div class="link-url">${escapeHtml(link.url)}</div>
            <div class="actions">
              <button type="button" data-action="open" data-index="${index}">Open</button>
              <button type="button" data-action="delete" data-index="${index}">Delete</button>
            </div>
          </li>
        `
      )
      .join("");

    linksList.innerHTML = itemsMarkup;
  }

  linksList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const index = Number(button.dataset.index);
    const action = button.dataset.action;
    const links = await getLinks();
    const selectedLink = links[index];

    if (!selectedLink) {
      return;
    }

    if (action === "open") {
      await chrome.tabs.create({ url: selectedLink.url });
      return;
    }

    if (action === "delete") {
      links.splice(index, 1);
      await saveLinks(links);
      await renderLinks();
    }
  });

  saveCurrentBtn.addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab || !currentTab.url) {
      return;
    }

    await addLink({
      title: currentTab.title || "Untitled",
      url: currentTab.url
    });
  });

  manualForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rawUrl = urlInput.value.trim();
    const normalizedUrl = normalizeUrl(rawUrl);

    if (!normalizedUrl) {
      alert("Enter a valid URL");
      return;
    }

    await addLink({
      title: titleInput.value.trim() || normalizedUrl,
      url: normalizedUrl
    });

    titleInput.value = "";
    urlInput.value = "";
  });

  renderLinks();
});
