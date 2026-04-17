import os
import json
import secrets
import hashlib
import base64
import webbrowser
import cloudscraper
from threading import Timer
from flask import Flask, render_template, jsonify, request, redirect, session

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", secrets.token_hex(32))

CLIENT_ID = os.environ.get("KICK_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("KICK_CLIENT_SECRET", "")
REDIRECT_URI = "http://localhost:5050/auth/callback"
TOKENS_FILE = "tokens.json"

def load_tokens():
    if os.path.exists(TOKENS_FILE):
        with open(TOKENS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_tokens(data):
    with open(TOKENS_FILE, "w") as f:
        json.dump(data, f)

def generate_pkce():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
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
    session["oauth_state"] = state

    params = (
        f"response_type=code"
        f"&client_id={CLIENT_ID}"
        f"&redirect=127.0.0.1"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope=user:read%20moderation:ban"
        f"&code_challenge={challenge}"
        f"&code_challenge_method=S256"
        f"&state={state}"
    )
    return redirect(f"https://id.kick.com/oauth/authorize?{params}")

@app.route("/auth/callback")
def auth_callback():
    code = request.args.get("code")
    state = request.args.get("state")

    if state != session.get("oauth_state"):
        return "State mismatch", 400

    verifier = session.get("pkce_verifier")

    import requests as req
    resp = req.post("https://id.kick.com/oauth/token", data={
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "code_verifier": verifier,
        "code": code,
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})

    token_data = resp.json()
    if "access_token" not in token_data:
        return f"Token error: {token_data}", 400

    user_resp = req.get("https://api.kick.com/public/v1/users", headers={
        "Authorization": f"Bearer {token_data['access_token']}"
    })
    user_data = user_resp.json()
    print("DEBUG user_data:", user_data)
    user = user_data.get("data", [{}])[0]

    tokens = load_tokens()
    username = user.get("name") or user.get("username") or user.get("slug", "unknown")
    tokens[username] = {
        "access_token": token_data["access_token"],
        "refresh_token": token_data.get("refresh_token", ""),
        "user_id": user.get("user_id"),
        "username": username,
    }
    save_tokens(tokens)

    return redirect(f"/?logged_in={username}")

@app.route("/auth/accounts")
def get_accounts():
    tokens = load_tokens()
    accounts = [{"username": v["username"]} for v in tokens.values()]
    return jsonify({"accounts": accounts})

@app.route("/auth/logout", methods=["POST"])
def logout():
    data = request.get_json()
    username = data.get("username")
    tokens = load_tokens()
    if username in tokens:
        del tokens[username]
        save_tokens(tokens)
    return jsonify({"ok": True})

@app.route("/api/get_room", methods=["POST"])
def get_room():
    try:
        req_data = request.get_json()
        username = req_data.get("username")
        scraper = cloudscraper.create_scraper(browser={
            "browser": "chrome", "platform": "windows", "mobile": False
        })
        res = scraper.get(f"https://kick.com/api/v1/channels/{username}",
                          headers={"Accept": "application/json"}, timeout=10)
        data = res.json()
        return jsonify({
            "id": data["chatroom"]["id"],
            "broadcaster_id": data.get("user_id") or data.get("id"),
        })
    except Exception as e:
        print("Kick API Hatası:", e)
        return jsonify({"id": None})

@app.route("/api/ban", methods=["POST"])
def ban_user():
    try:
        req_data = request.get_json()
        mod_username = req_data.get("mod_username")
        broadcaster_id = req_data.get("broadcaster_id")
        target_username = req_data.get("target_username")
        duration = req_data.get("duration", None)
        reason = req_data.get("reason", "")

        tokens = load_tokens()
        if mod_username not in tokens:
            return jsonify({"ok": False, "error": "Not authenticated"}), 401

        access_token = tokens[mod_username]["access_token"]

        scraper = cloudscraper.create_scraper(browser={
            "browser": "chrome", "platform": "windows", "mobile": False
        })
        user_res = scraper.get(
            f"https://kick.com/api/v1/channels/{target_username}",
            headers={"Accept": "application/json"}, timeout=10
        )
        user_data = user_res.json()
        target_id = user_data.get("user_id")

        if not target_id:
            return jsonify({"ok": False, "error": "User not found"}), 404

        import requests as req
        payload = {
            "broadcaster_user_id": broadcaster_id,
            "user_id": target_id,
            "reason": reason,
        }
        if duration:
            payload["duration"] = duration

        resp = req.post("https://api.kick.com/public/v1/moderation/bans",
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }
        )
        return jsonify({"ok": resp.status_code in [200, 201, 204]})
    except Exception as e:
        print("Ban hatası:", e)
        return jsonify({"ok": False, "error": str(e)}), 500

def open_browser():
    webbrowser.open_new("http://localhost:5050/")

if __name__ == "__main__":
    port = 5050
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        Timer(1.2, open_browser).start()
    app.run(port=port, debug=True)
