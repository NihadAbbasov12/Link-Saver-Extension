# 🔗 Quick Links Saver

A lightweight Chrome extension to save, search, and organize links right from your toolbar — now with a clean, modern UI and light/dark themes.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![Version](https://img.shields.io/badge/version-2.0.0-6366f1)

## ✨ Features

- **Save the current tab** with one click, or **add links manually**.
- **🔎 Instant search** — filter saved links by title or URL as you type.
- **📌 Pin favorites** to keep important links at the top.
- **🌗 Light & dark themes** — toggle anytime, your choice is remembered (auto-detects your system theme on first run).
- **🖼️ Favicons** for every link, with a colored letter fallback when none is available.
- **⧉ Copy URL** to the clipboard in one tap.
- **✎ Inline rename** — edit a link's title without leaving the popup.
- **🚀 Open all** currently filtered links at once.
- **⬇️⬆️ Import / Export** your links as JSON for backup or moving between devices.
- **🕒 Relative timestamps** ("2h ago") and a live saved-links counter.
- **Friendly toasts** instead of intrusive alerts, plus a polished empty state.

## 📦 Installation (load unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium browser).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.
5. Pin **Quick Links Saver** to your toolbar and start saving links.

## 🛠️ Tech

- Manifest V3
- Vanilla JavaScript (no build step, no dependencies)
- `chrome.storage.local` for persistence
- Permissions: `storage`, `tabs`

## 🔒 Privacy

All data stays **on your device** in local storage. Nothing is sent to any server. Favicons are fetched from Google's public favicon service.

---

Made with ❤️ by [NihadAbbasov12](https://github.com/NihadAbbasov12)
