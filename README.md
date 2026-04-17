# 🟢 KickCatch

KickCatch is a lightweight, local web-based tool designed to capture and manage links shared in Kick.com chatrooms in real-time. It provides streamers and moderators with a safe, organized, and aesthetic way to review viewer-submitted links.

## ✨ Features

-   **Real-time Link Capturing:** Connects directly to Kick's WebSocket (Pusher) infrastructure to instantly catch links.
-   **Safe Viewing:** Links are queued in a FIFO structure and can be safely opened in background tabs.
-   **Multiple Link Opening:** Open a batch of queued links at once (Start, End, or Random selections).
-   **Authentication & Moderation:** Authenticate with your Kick account via OAuth to enable advanced features like instant banning.
-   **"Bonk!" System:** Quickly view a history of recently opened links and the usernames who sent them, complete with an animated "Bonk!" emote for misbehaving viewers.
-   **Spam Detection:** Automatically detects and filters out repeated links or spamming behavior.
-   **Bilingual Support:** Fully supports English and Turkish (TR/EN).

## 🚀 Installation & Setup (Running from Source)

If you are a developer and want to run or modify the code from the source, you need to set up your own Kick API credentials.

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
    - Rename the `.env.example` file to `.env` in your project folder.
    - Paste your keys into the `.env` file.

4.  **Run the application:**
    ```bash
    python app.py
    ```
    The application will automatically launch your default browser and navigate to `http://127.0.0.1:5050/`.

## 🔨 How to Build (Create your own .exe)

To compile the application into a standalone executable (`.exe`) file, follow these steps:

1.  **Install PyInstaller:**
    ```bash
    pip install pyinstaller python-dotenv
    ```

2.  **Run the build command:**
    This command bundles the Python script along with the required folders. (Note: It does NOT embed the .env file for security reasons).
    ```bash
    pyinstaller --noconfirm --onedir --windowed --add-data "templates;templates" --add-data "static;static" app.py
    ```

3.  **Run your build:**
    Go to the newly created `dist/app` folder. Make sure your `.env` file is placed in this folder next to `app.exe`, then double-click `app.exe` to run it.

## 🛠️ Tech Stack

-   **Backend:** Python, Flask
-   **Frontend:** HTML, Vanilla JavaScript, Custom CSS
-   **WebSocket:** Pusher (js.pusher.com)
-   **Protection Bypass:** Cloudscraper

## ⚠️ Disclaimer

This tool is created for educational and moderation purposes. Kick.com may update their API or Cloudflare protections at any time, which could temporarily affect the functionality of this application.

## 📄 License
MIT License