from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import sys

try:
    import psutil
except ImportError:
    print("Missing dependency: psutil. Run: python -m pip install -r requirements.txt")
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 8765

# These are the actual VALORANT game process names. Riot Client alone is not counted.
VALORANT_PROCESS_NAMES = {
    "valorant.exe",
    "valorant-win64-shipping.exe",
}

def get_status():
    found = []
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            name = (proc.info.get("name") or "").lower()
            if name in VALORANT_PROCESS_NAMES:
                found.append({"pid": proc.info["pid"], "process": proc.info["name"]})
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    return {
        "ok": True,
        "valorant_running": bool(found),
        "game": "VALORANT" if found else None,
        "processes": found,
    }

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/status":
            payload = json.dumps(get_status()).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path.split("?", 1)[0] == "/api/health":
            payload = json.dumps({"ok": True, "service": "VITAL Windows Game Detector"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print("[VITAL] " + (fmt % args))

if __name__ == "__main__":
    os.chdir(ROOT)
    print("=" * 56)
    print(" VITAL Windows Game Detector")
    print(" Website: http://127.0.0.1:8765")
    print(" Detector: http://127.0.0.1:8765/api/status")
    print(" Keep this window open while using VITAL.")
    print(" Press Ctrl+C to stop.")
    print("=" * 56)
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
        server.serve_forever()
    except OSError as exc:
        print(f"Could not start VITAL on port {PORT}: {exc}")
        print("Close another program using port 8765, then try again.")
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("\nVITAL stopped.")
