from dotenv import load_dotenv
load_dotenv()

import os
import json
import secrets
import hashlib
import base64
import webbrowser
import threading
import requests
import cloudscraper
from threading import Timer
from flask import Flask, render_template, jsonify, request, redirect, session
from PIL import Image, ImageDraw, ImageFont
import pystray

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", secrets.token_hex(32))

CLIENT_ID     = os.environ.get("KICK_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("KICK_CLIENT_SECRET", "")
REDIRECT_URI  = "http://localhost:5050/auth/callback"
TOKENS_FILE   = "tokens.json"

def load_tokens():
    if os.path.exists(TOKENS_FILE):
        with open(TOKENS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_tokens(data):
    with open(TOKENS_FILE, "w") as f:
        json.dump(data, f)

def generate_pkce():
    verifier  = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/auth/login")
def auth_login():
    verifier, challenge = generate_pkce()
    state = secrets.token_hex(16)
    session["pkce_verifier"] = verifier
    session["oauth_state"]   = state

    params = (
        f"response_type=code"
        f"&client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope=user:read%20moderation:ban"
        f"&code_challenge={challenge}"
        f"&code_challenge_method=S256"
        f"&state={state}"
    )
    return redirect(f"https://id.kick.com/oauth/authorize?{params}")

@app.route("/auth/callback")
def auth_callback():
    code  = request.args.get("code")
    state = request.args.get("state")

    if state != session.get("oauth_state"):
        return "State mismatch", 400

    verifier = session.get("pkce_verifier")

    resp = requests.post("https://id.kick.com/oauth/token", data={
        "grant_type":    "authorization_code",
        "client_id":     CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri":  REDIRECT_URI,
        "code_verifier": verifier,
        "code":          code,
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})

    token_data = resp.json()
    if "access_token" not in token_data:
        return f"Token error: {token_data}", 400

    user_resp = requests.get("https://api.kick.com/public/v1/users", headers={
        "Authorization": f"Bearer {token_data['access_token']}"
    })
    user     = user_resp.json().get("data", [{}])[0]
    username = user.get("name") or user.get("username") or user.get("slug", "unknown")

    tokens = load_tokens()
    tokens[username] = {
        "access_token":  token_data["access_token"],
        "refresh_token": token_data.get("refresh_token", ""),
        "user_id":       user.get("user_id"),
        "username":      username,
    }
    save_tokens(tokens)

    return redirect(f"/?logged_in={username}")

@app.route("/auth/accounts")
def get_accounts():
    tokens = load_tokens()
    return jsonify({"accounts": [{"username": v["username"]} for v in tokens.values()]})

@app.route("/auth/logout", methods=["POST"])
def logout():
    data     = request.get_json()
    username = data.get("username")
    tokens   = load_tokens()
    if username in tokens:
        del tokens[username]
        save_tokens(tokens)
    return jsonify({"ok": True})

@app.route("/api/get_room", methods=["POST"])
def get_room():
    try:
        req_data     = request.get_json()
        username     = req_data.get("username")
        tokens       = load_tokens()
        access_token = tokens.get(username, {}).get("access_token")
        if not access_token:
            for v in tokens.values():
                if v.get("access_token"):
                    access_token = v["access_token"]
                    break

        headers = {"Accept": "application/json"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        res  = requests.get(
            f"https://kick.com/api/v1/channels/{username}",
            headers=headers, timeout=10
        )
        data = res.json()
        return jsonify({
            "id":             data["chatroom"]["id"],
            "broadcaster_id": data.get("user_id") or data.get("id"),
        })
    except Exception as e:
        print("Kick API error:", e)
        scraper = cloudscraper.create_scraper(browser={
            "browser": "chrome", "platform": "windows", "mobile": False
        })
        try:
            res  = scraper.get(f"https://kick.com/api/v1/channels/{username}",
                               headers={"Accept": "application/json"}, timeout=10)
            data = res.json()
            return jsonify({
                "id":             data["chatroom"]["id"],
                "broadcaster_id": data.get("user_id") or data.get("id"),
            })
        except Exception as e2:
            print("Cloudscraper fallback error:", e2)
            return jsonify({"id": None})

@app.route("/api/ban", methods=["POST"])
def ban_user():
    try:
        req_data        = request.get_json()
        mod_username    = req_data.get("mod_username")
        broadcaster_id  = req_data.get("broadcaster_id")
        target_username = req_data.get("target_username")
        duration        = req_data.get("duration", None)
        reason          = req_data.get("reason", "")

        tokens = load_tokens()
        if mod_username not in tokens:
            return jsonify({"ok": False, "error": "Not authenticated"}), 401

        access_token = tokens[mod_username]["access_token"]

        scraper  = cloudscraper.create_scraper(browser={
            "browser": "chrome", "platform": "windows", "mobile": False
        })
        user_res  = scraper.get(f"https://kick.com/api/v1/channels/{target_username}",
                                headers={"Accept": "application/json"}, timeout=10)
        target_id = user_res.json().get("user_id")

        if not target_id:
            return jsonify({"ok": False, "error": "User not found"}), 404

        payload = {"broadcaster_user_id": broadcaster_id, "user_id": target_id, "reason": reason}
        if duration:
            payload["duration"] = duration

        resp = requests.post("https://api.kick.com/public/v1/moderation/bans",
            json=payload,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        )
        return jsonify({"ok": resp.status_code in [200, 201, 204]})
    except Exception as e:
        print("Ban error:", e)
        return jsonify({"ok": False, "error": str(e)}), 500

def make_tray_icon():
    img  = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, 63, 63], radius=12, fill=(17, 20, 24, 255))
    draw.rounded_rectangle([2, 2, 61, 61], radius=11, outline=(0, 255, 102, 160), width=2)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 38)
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), "K", font=font)
    x = (64 - (bbox[2] - bbox[0])) // 2 - bbox[0]
    y = (64 - (bbox[3] - bbox[1])) // 2 - bbox[1]
    draw.text((x, y), "K", font=font, fill=(0, 255, 102, 255))
    return img

def run_flask():
    app.run(port=5050, debug=False, use_reloader=False)

def on_open(icon, item):
    webbrowser.open_new("http://localhost:5050/")

def on_exit(icon, item):
    icon.stop()
    os._exit(0)

if __name__ == "__main__":
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    Timer(1.2, lambda: webbrowser.open_new("http://localhost:5050/")).start()

    menu = pystray.Menu(
        pystray.MenuItem("Open KickCatch", on_open, default=True),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Exit", on_exit),
    )
    icon = pystray.Icon("KickCatch", make_tray_icon(), "KickCatch", menu)
    icon.run()
