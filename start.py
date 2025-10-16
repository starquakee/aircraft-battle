import os
import sys
import time
import socket
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler

try:
    # Python 3.7+ provides ThreadingHTTPServer; fallback to TCPServer if not available
    from http.server import ThreadingHTTPServer as HTTPServer
except ImportError:
    from socketserver import TCPServer as HTTPServer


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def run_server(base_dir: str, port: int):
    os.chdir(base_dir)
    httpd = HTTPServer(("127.0.0.1", port), SimpleHTTPRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        try:
            httpd.server_close()
        except Exception:
            pass


def main():
    # If bundled by PyInstaller --onefile, assets are in sys._MEIPASS
    base_dir = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    port = find_free_port()

    t = threading.Thread(target=run_server, args=(base_dir, port), daemon=True)
    t.start()

    url = f"http://127.0.0.1:{port}/index.html"

    # Give the server a moment to start, then open default browser
    for _ in range(10):
        time.sleep(0.2)
        try:
            webbrowser.open(url)
            break
        except Exception:
            continue

    # Keep the main process alive while the server thread runs
    try:
        while t.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()