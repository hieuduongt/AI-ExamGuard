"""
Cửa sổ ứng dụng desktop của AI ExamGuard (dùng thư viện pywebview, hiển thị bằng Edge WebView2).

File này mở cửa sổ chính chứa giao diện web, và cho trang web mở thêm một cửa sổ Giám thị riêng.
"""
import threading
import urllib.parse

import webview

from .config import APP_VERSION


class DesktopApi:
    """
    Đây là gì: lớp (class) chứa các chức năng mà chương trình Python cho trang web gọi tới.
    Mục tiêu: để nút "Mở Giám thị" trên trang web mở được một cửa sổ desktop riêng, giúp màn
      hình thí sinh (đang dùng camera) vẫn chạy tiếp.
    Chức năng: được đưa cho trang web dưới tên window.pywebview.api; hiện chỉ có một chức năng
      là open_proctor.
    Đầu ra: là một đối tượng; không tự trả về gì.
    Dùng ở đâu: open_main_window (gắn vào cửa sổ chính qua js_api), tests/test_desktop.py.
    Liên kết với: web/src/services/desktop-bridge.ts (phía trang web gọi open_proctor).
    """

    def __init__(self, port):
        """
        Đây là gì: hàm khởi tạo, chạy một lần khi tạo DesktopApi.
        Mục tiêu: ghi nhớ cổng máy chủ và chuẩn bị chỗ nhớ cửa sổ Giám thị.
        Chức năng: lưu cổng; đặt cửa sổ Giám thị là "chưa có"; tạo một khóa (lock) để hai lần bấm
          cùng lúc không mở hai cửa sổ.
        Đầu ra: không trả về gì.
        Dùng ở đâu: open_main_window (DesktopApi(port)), tests/test_desktop.py.
        Liên kết với: open_proctor (dùng các giá trị được lưu ở đây).
        """
        self._port = port
        self._proctor = None
        self._lock = threading.Lock()

    def open_proctor(self, hub_url=""):
        """
        Đây là gì: hàm mở (hoặc gọi lại) cửa sổ Giám thị.
        Mục tiêu: giám thị xem bảng theo dõi trong cửa sổ riêng, không làm tắt camera thí sinh.
        Chức năng: kiểm tra hub_url (nếu có) phải bắt đầu bằng http/https và có tên máy, sai thì
          từ chối. Tạo địa chỉ trang /giam-thi của máy này, kèm ?hub=... nếu có. Nếu cửa sổ Giám
          thị đã mở thì nạp lại địa chỉ, hiện và phóng to lại cửa sổ đó; nếu chưa thì tạo mới.
          Vì an toàn, trang web chỉ được mở đúng đường dẫn cố định này, không bao giờ được chạy
          lệnh hệ thống.
        Đầu ra: True nếu có cửa sổ Giám thị, False nếu hub_url không hợp lệ.
        Dùng ở đâu: trang web gọi qua window.pywebview.api.open_proctor
          (web/src/services/desktop-bridge.ts, nút "Mở Giám thị" trong
          web/src/components/layout/examguard-header.tsx); tests/test_desktop.py.
        Liên kết với: config.py (APP_VERSION trên tiêu đề), thư viện webview.
        """
        # Giao diện chỉ được mở đường dẫn cục bộ cố định này, không bao giờ là lệnh hệ thống.
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
    """
    Đây là gì: hàm tạo cửa sổ chính của ứng dụng.
    Mục tiêu: hiện trang chủ AI ExamGuard trong một cửa sổ giống phần mềm bình thường.
    Chức năng: tạo cửa sổ mở địa chỉ http://127.0.0.1:<cổng>/ (chính máy này), kích thước
      1380x880, gắn DesktopApi để trang web gọi được open_proctor.
    Đầu ra: không trả về gì; cửa sổ chỉ hiện ra khi run_gui chạy.
    Dùng ở đâu: app.py (main).
    Liên kết với: DesktopApi, run_gui, config.py (APP_VERSION).
    """
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
    """
    Đây là gì: hàm bật vòng chạy giao diện của các cửa sổ.
    Mục tiêu: giữ ứng dụng mở cho đến khi người dùng đóng.
    Chức năng: khởi động pywebview với Edge WebView2 ("edgechromium"); hàm đứng chờ đến khi
      mọi cửa sổ đã đóng. Chỉ chạy được trên Windows (cần Edge WebView2).
    Đầu ra: không trả về gì.
    Dùng ở đâu: app.py (main).
    Liên kết với: open_main_window (tạo cửa sổ trước khi gọi hàm này).
    """
    webview.start(gui="edgechromium", debug=False)
