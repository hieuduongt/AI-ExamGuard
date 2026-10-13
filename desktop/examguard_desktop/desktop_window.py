import threading
import urllib.parse

import webview

from .config import APP_VERSION


class DesktopApi:
    """Exposed to the web UI as window.pywebview.api."""

    def __init__(self, port):
        self._port = port
        self._proctor = None
        self._lock = threading.Lock()

    def open_proctor(self, hub_url=""):
        # Only this fixed local route is exposed to the UI, never shell commands.
        parsed = urllib.parse.urlparse(hub_url)
        if hub_url and (parsed.scheme not in ("http", "https") or not parsed.hostname):
            return False
        with self._lock:
            url = f"http://127.0.0.1:{self._port}/giam-thi"
            if hub_url:
                url += "?" + urllib.parse.urlencode({"hub": hub_url})
            if self._proctor in webview.windows:
                self._proctor.load_url(url)
                self._proctor.show()
                self._proctor.restore()
            else:
                self._proctor = webview.create_window(
                    title=f"AI ExamGuard - Giám thị - {APP_VERSION}", url=url,
                    width=1280, height=820, min_size=(900, 650), text_select=True,
                )
        return self._proctor is not None


def open_main_window(port):
    webview.create_window(
        title=f"AI ExamGuard - {APP_VERSION}",
        js_api=DesktopApi(port),
        url=f"http://127.0.0.1:{port}/",
        width=1380,
        height=880,
        min_size=(1024, 700),
        text_select=True,
        confirm_close=False,
    )


def run_gui():
    """Blocks until every window is closed. Windows only (Edge WebView2)."""
    webview.start(gui="edgechromium", debug=False)
