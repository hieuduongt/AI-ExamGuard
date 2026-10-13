"""Run only the LAN hub (no desktop window): `python run_hub.py`.

For macOS/Linux or testing. Serves ../web/out (run `npm run build` in web/ first)
and the /api routes on port 8765 (or EXAMGUARD_PORT), on every network card.
Needs only the Python standard library.
"""
from examguard_desktop.network import get_lan_ip
from examguard_desktop.server import create_server


def main():
    server = create_server()
    port = server.server_address[1]
    print("AI ExamGuard LAN hub")
    print(f"  This machine: http://localhost:{port}")
    print(f"  Other machines on the LAN: http://{get_lan_ip()}:{port}")
    print("Press Ctrl+C to stop. Data is kept in memory only.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
