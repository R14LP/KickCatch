# 🟢 KickCatch

KickCatch is a lightweight, local web-based tool designed to capture and manage links shared in Kick.com chatrooms in real-time. It provides streamers and moderators with a safe, organized, and aesthetic way to review viewer-submitted links.

## ✨ Features

-   **Real-time Link Capturing:** Connects directly to Kick's WebSocket (Pusher) infrastructure to instantly catch links.
-   **Safe Viewing:** Links are queued and can be safely opened in background tabs.
-   **Multiple Link Opening:** Open 1x, 3x, 5x, or 10x links at once (Start, End, or Random).
-   **Platform Filters:** Filter links by platform — YouTube, Instagram, X/Twitter, TikTok.
-   **OAuth Authentication:** Login with your Kick account securely via OAuth 2.1 — your password is never stored.
-   **Ban System:** Instantly ban users directly from the panel using the official Kick Moderation API.
-   **"Bonk!" System:** View recently opened links and who sent them, with an animated emote.
-   **Spam Detection:** Manually remove duplicate links with "Spam Sil", or enable "Oto Spam" to remove them automatically in real-time.
-   **System Tray:** Runs in the background with a system tray icon. Use "Exit" to fully close.
-   **Bilingual Support:** Fully supports English and Turkish (TR/EN).

## 🚀 Installation & Setup (Running from Source)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/R14LP/KickCatch.git
    cd KickCatch
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Setup Environment Variables (.env):**
    - Go to the [Kick Developer Portal](https://kick.com/settings/developer).
    - Create a new application.
    - Set the **Redirect URI** to: `http://localhost:5050/auth/callback`
    - Copy the `Client ID` and `Client Secret`.
    - Rename `.env.example` to `.env` and fill in your keys.

4.  **Run:**
    ```bash
    python app.py
    ```
    The app will open in your browser at `http://localhost:5050/` and appear in the system tray.

## 🔨 How to Build (.exe)

1.  **Install build tools:**
    ```bash
    pip install pyinstaller
    ```

2.  Place `icon.ico` in the root folder (next to `app.py`).

3.  **Build:**
    ```bash
    pyinstaller --noconfirm --onedir --windowed --name "KickCatch" --icon "icon.ico" --add-data "templates;templates" --add-data "static;static" app.py
    ```

4.  Go to `dist/KickCatch/`, place your `.env` file next to `KickCatch.exe`, and run it.

## 🛠️ Tech Stack

-   **Backend:** Python, Flask
-   **Frontend:** HTML, Vanilla JavaScript, Custom CSS
-   **WebSocket:** Pusher (js.pusher.com)
-   **Auth:** Kick OAuth 2.1 + PKCE
-   **Cloudflare Bypass:** Cloudscraper
-   **System Tray:** pystray, Pillow

## 📋 Changelog

### v1.2
- Replaced number input with 1x / 3x / 5x / 10x quick-select buttons
- Added "Oto Spam" toggle — automatically removes duplicate links in real-time

### v1.1
- Fixed "Connection failed: Room not found" error for new users
- Channel lookup now uses Bearer token directly, Cloudscraper as fallback

### v1.0
- Initial release with OAuth 2.1 login, ban system, platform filters, spam detection, system tray

## ⚠️ Disclaimer

This tool is for educational and moderation purposes. Kick.com may update their API or Cloudflare protections at any time, which could temporarily affect functionality.

## 📄 License

MIT License
