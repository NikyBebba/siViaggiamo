"""Server statico threaded per i test Playwright.

Il `python3 -m http.server` predefinito è single-threaded e ha un backlog di
soli 5 Request: con più browser paralleli alcune richieste vengono resettate.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDLER = partial(SimpleHTTPRequestHandler, directory=str(ROOT))


class TestServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 128


if __name__ == "__main__":
    TestServer(("127.0.0.1", 4173), HANDLER).serve_forever()
