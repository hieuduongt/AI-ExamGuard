from examguard_desktop import discovery
from examguard_desktop.network import get_lan_ip
from examguard_desktop.server import create_server

def main():
    server = create_server()
    port = server.server_address[1]
    discovery.start(port)
    print('AI ExamGuard LAN hub')
    print(f'  This machine: http://localhost:{port}')
    print(f'  Other machines on the LAN: http://{get_lan_ip()}:{port}')
    print(f'  Connect code (shown on the proctor dashboard): {discovery.CONNECT_CODE}')
    print('Press Ctrl+C to stop. Data is kept in memory only.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
if __name__ == '__main__':
    main()
