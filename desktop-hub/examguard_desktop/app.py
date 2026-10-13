import threading

from . import discovery
from .desktop_window import open_main_window, run_gui
from .server import create_server


def main():
    server = create_server()
    server.daemon_threads = True
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    port = server.server_address[1]
    discovery.start(port)
    open_main_window(port)

    try:
        run_gui()
    finally:
        server.shutdown()
        server.server_close()
