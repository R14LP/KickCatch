# 🟢 KickCatch

KickCatch is a lightweight, local web-based tool designed to capture and manage links shared in Kick.com chatrooms in real-time. It provides streamers and moderators with a safe, organized, and aesthetic way to review viewer-submitted links.

## ✨ Features

-   **Real-time Link Capturing:** Connects directly to Kick's WebSocket (Pusher) infrastructure to instantly catch links.
-   **Safe Viewing (Pop-up Blocker Aware):** Links are queued in a FIFO structure and can be opened in background tabs securely.
-   **Multiple Link Opening:** Open a batch of queued links at once (Start, End, or Random selections).
-   **Authentication & Moderation:** Authenticate with your Kick account via OAuth to enable advanced features like instant banning.
-   **"Bonk!" System:** Quickly view a history of recently opened links and the usernames who sent them, complete with an animated "Bonk!" emote for misbehaving viewers.
-   **Spam Detection:** Automatically detects and filters out repeated links or spamming behavior.
-   **Dark/Grid Theme Aesthetic:** Designed with a clean, terminal-like interface.
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

3.  **Run the application:**
    ```bash
    python app.py
    ```
    The application will automatically launch your default browser and navigate to `http://127.0.0.1:5050/`.

## 🔨 How to Build (Create your own .exe)

If you prefer to compile the application into a standalone executable (`.exe`) file yourself, follow these steps:

1.  **Install PyInstaller:**
    Make sure you are in your project directory and run:
    ```bash
    pip install pyinstaller
    ```

2.  **Run the build command:**
    This command bundles the Python script along with the `templates`, `static`, and `.env` files into a single directory:
    ```bash
    pyinstaller --noconfirm --onedir --windowed --add-data "templates;templates" --add-data "static;static" --add-data ".env;." app.py
    ```

3.  **Run your build:**
    Once the process is complete, navigate to the newly created `dist/app` folder. You can launch the application by running `app.exe`.

## 🛠️ Tech Stack

-   **Backend:** Python, Flask
-   **Frontend:** HTML, Vanilla JavaScript, Custom CSS
-   **WebSocket:** Pusher (js.pusher.com)
-   **Protection Bypass:** Cloudscraper

## ⚠️ Disclaimer

This tool is created for educational and moderation purposes. Kick.com may update their API or Cloudflare protections at any time, which could temporarily affect the functionality of this application.

## 📄 License
MIT License