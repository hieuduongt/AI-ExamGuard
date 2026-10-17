"""
Đây là gì: script vẽ các sơ đồ (ảnh PNG) cho tài liệu học tập dành cho học sinh.
Mục tiêu: có hình minh họa dễ hiểu cho từng phần của AI ExamGuard mà không cần phần mềm vẽ.
Chức năng: dùng thư viện Pillow vẽ hộp, mũi tên, chữ tiếng Việt; mỗi hàm draw_* vẽ một sơ đồ.
Đầu ra: các file PNG trong docs/tai-lieu-du-thi/hinh-tai-lieu-hoc-sinh/.
Dùng ở đâu: build_tai_lieu_hoc_sinh.py gọi draw_all() trước khi dựng file Word.
Liên kết với: build_tai_lieu_hoc_sinh.py.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parents[1] / "tai-lieu-du-thi" / "hinh-tai-lieu-hoc-sinh"

# Vẽ ở độ phân giải gấp đôi để ảnh nét khi in.
S = 2

REGULAR_FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
BOLD_FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]

NAVY = "#0B2545"
TEXT = "#1F2937"
MUTED = "#64748B"
BLUE, BLUE_BG = "#2E74B5", "#E8F1FB"
GREEN, GREEN_BG = "#16794A", "#E7F6EE"
RED, RED_BG = "#C0392B", "#FDECEA"
AMBER, AMBER_BG = "#B7791F", "#FFF4DB"
GRAY, GRAY_BG = "#64748B", "#F1F5F9"
WHITE = "#FFFFFF"


def _first_existing(paths):
    for path in paths:
        if Path(path).exists():
            return path
    raise FileNotFoundError("Không tìm thấy phông chữ hỗ trợ tiếng Việt: " + ", ".join(paths))


REGULAR = _first_existing(REGULAR_FONTS)
BOLD = _first_existing(BOLD_FONTS)


class Diagram:
    """Một tấm hình trống; mọi tọa độ tính theo đơn vị logic (nhân S khi vẽ)."""

    def __init__(self, width, height):
        self.width, self.height = width, height
        self.img = Image.new("RGB", (width * S, height * S), WHITE)
        self.draw = ImageDraw.Draw(self.img)
        self._fonts = {}

    def font(self, size, bold=False):
        key = (size, bold)
        if key not in self._fonts:
            self._fonts[key] = ImageFont.truetype(BOLD if bold else REGULAR, int(size * S))
        return self._fonts[key]

    def text_width(self, text, font):
        return self.draw.textlength(text, font=font) / S

    def wrap(self, text, font, max_width):
        lines = []
        for paragraph in text.split("\n"):
            words, current = paragraph.split(" "), ""
            for word in words:
                trial = f"{current} {word}".strip()
                if self.text_width(trial, font) <= max_width or not current:
                    current = trial
                else:
                    lines.append(current)
                    current = word
            lines.append(current)
        return lines

    def text(self, x, y, text, size=14, color=TEXT, bold=False, anchor="la"):
        self.draw.text((x * S, y * S), text, fill=color, font=self.font(size, bold), anchor=anchor)

    def lines_block(self, cx, top, lines, size, color, bold, align="center", left=0):
        line_height = size * 1.32
        for index, line in enumerate(lines):
            y = top + index * line_height
            if align == "center":
                self.text(cx, y, line, size, color, bold, anchor="ma")
            else:
                self.text(left, y, line, size, color, bold, anchor="la")
        return len(lines) * line_height

    def box(self, x, y, w, h, title=None, body=None, fill=BLUE_BG, outline=BLUE, title_color=None,
            size=14, title_size=None, align="center", radius=12, width=2, dashed=False):
        title_size = title_size or size + 2
        if dashed:
            self.dashed_rect(x, y, w, h, outline)
        else:
            self.draw.rounded_rectangle((x * S, y * S, (x + w) * S, (y + h) * S), radius=radius * S,
                                        fill=fill, outline=outline, width=width * S)
        pad = 12
        title_lines = self.wrap(title, self.font(title_size, True), w - 2 * pad) if title else []
        body_lines = self.wrap(body, self.font(size), w - 2 * pad) if body else []
        total = len(title_lines) * title_size * 1.32 + len(body_lines) * size * 1.32
        if title_lines and body_lines:
            total += 4
        top = y + (h - total) / 2 - 2
        cx = x + w / 2
        used = self.lines_block(cx, top, title_lines, title_size, title_color or outline, True, align, x + pad)
        if body_lines:
            self.lines_block(cx, top + used + (4 if title_lines else 0), body_lines, size, TEXT, False, align, x + pad)

    def dashed_rect(self, x, y, w, h, color, dash=8):
        for (x1, y1, x2, y2) in ((x, y, x + w, y), (x, y + h, x + w, y + h), (x, y, x, y + h), (x + w, y, x + w, y + h)):
            self.dashed_line(x1, y1, x2, y2, color, dash)

    def dashed_line(self, x1, y1, x2, y2, color, dash=8, width=2):
        length = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        steps = max(int(length / dash), 1)
        for i in range(0, steps, 2):
            a, b = i / steps, min((i + 1) / steps, 1)
            self.draw.line(((x1 + (x2 - x1) * a) * S, (y1 + (y2 - y1) * a) * S,
                            (x1 + (x2 - x1) * b) * S, (y1 + (y2 - y1) * b) * S), fill=color, width=width * S)

    def arrow(self, points, color=NAVY, width=3, head=11, dashed=False, both=False):
        for (x1, y1), (x2, y2) in zip(points, points[1:]):
            if dashed:
                self.dashed_line(x1, y1, x2, y2, color, width=width)
            else:
                self.draw.line((x1 * S, y1 * S, x2 * S, y2 * S), fill=color, width=width * S)
        self._head(points[-2], points[-1], color, head)
        if both:
            self._head(points[1], points[0], color, head)

    def _head(self, start, end, color, head):
        (x1, y1), (x2, y2) = start, end
        length = max(((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5, 0.001)
        ux, uy = (x2 - x1) / length, (y2 - y1) / length
        left = (x2 - ux * head - uy * head * 0.55, y2 - uy * head + ux * head * 0.55)
        right = (x2 - ux * head + uy * head * 0.55, y2 - uy * head - ux * head * 0.55)
        self.draw.polygon([(x2 * S, y2 * S), (left[0] * S, left[1] * S), (right[0] * S, right[1] * S)], fill=color)

    def label(self, cx, cy, text, size=13, color=TEXT, bold=False, bg=WHITE, max_width=None):
        font = self.font(size, bold)
        lines = self.wrap(text, font, max_width) if max_width else text.split("\n")
        line_height = size * 1.32
        width = max(self.text_width(line, font) for line in lines)
        height = len(lines) * line_height
        top = cy - height / 2
        if bg:
            self.draw.rounded_rectangle(((cx - width / 2 - 5) * S, (top - 3) * S, (cx + width / 2 + 5) * S,
                                         (top + height + 2) * S), radius=4 * S, fill=bg)
        self.lines_block(cx, top, lines, size, color, bold)

    def title(self, text):
        self.text(self.width / 2, 18, text, 21, NAVY, True, anchor="ma")

    def dot(self, x, y, color, r=6):
        self.draw.ellipse(((x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S), fill=color, outline=WHITE, width=2 * S)

    def save(self, name):
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        path = OUT_DIR / f"{name}.png"
        self.img.save(path, dpi=(200, 200))
        return path


def draw_tong_quan():
    d = Diagram(1000, 570)
    d.title("Toàn cảnh AI ExamGuard trong một phòng thi")
    for index, (y, name) in enumerate(((80, "Máy thí sinh 01"), (215, "Máy thí sinh 02"), (350, "Máy thí sinh 30"))):
        d.box(30, y, 270, 105, name, "Webcam + AI chạy ngay trên máy này", BLUE_BG, BLUE)
        d.arrow([(300, y + 52), (378, 262)], BLUE)
    d.text(165, 466, "(mỗi máy mở cùng một file EXE)", 13, MUTED, anchor="ma")
    d.box(380, 205, 220, 115, "Mạng LAN / Wi-Fi", "của phòng máy, không cần Internet", GRAY_BG, GRAY)
    d.label(490, 175, "cảnh báo + nhịp tim 2 giây/lần", 13, BLUE, True)
    d.arrow([(600, 262), (678, 262)], GREEN)
    d.box(680, 110, 290, 290, "Máy giám thị",
          "• Trung tâm LAN (cổng 8765): nhận và cất mọi cảnh báo\n• Màn hình Giám thị: sơ đồ máy xanh / vàng / đỏ / xám, tiếng bíp, xuất báo cáo",
          GREEN_BG, GREEN, align="left")
    d.arrow([(825, 400), (825, 428)], AMBER)
    d.box(700, 430, 250, 70, "Giám thị", "đi tới tận nơi xem và tự quyết định", AMBER_BG, AMBER)
    d.box(30, 512, 640, 44, None, "Video KHÔNG rời khỏi máy thí sinh. Chỉ gửi đi vài con số và các cảnh báo.",
          RED_BG, RED, size=14)
    return d.save("01-tong-quan")


def draw_cau_truc():
    d = Diagram(1000, 540)
    d.title("Dự án gồm 3 phần chính, gộp lại thành 1 file EXE")
    d.box(30, 60, 300, 210, "web/  ·  Giao diện + AI",
          "Viết bằng TypeScript (Next.js, React).\n4 trang: Trang chủ, Thí sinh, Giám thị, Quản trị.\nAI nhận diện khuôn mặt và bộ đếm hành vi.\nVí von: phòng ăn và đầu bếp.",
          BLUE_BG, BLUE, align="left")
    d.box(350, 60, 300, 210, "shared/  ·  Hợp đồng chung",
          "Một file JSON ghi những con số hai bên phải giống nhau: cổng 8765 và 8766, phiên bản, 7 loại cảnh báo, danh sách API.\nVí von: thực đơn chung của nhà hàng.",
          AMBER_BG, AMBER, align="left")
    d.box(670, 60, 300, 210, "desktop-hub/  ·  Máy chủ + cửa sổ",
          "Viết bằng Python.\nTrung tâm LAN nhận cảnh báo, tìm máy bằng mã 4 số, mở cửa sổ ứng dụng Windows.\nVí von: lễ tân kiêm tổng đài.",
          GREEN_BG, GREEN, align="left")
    d.box(30, 330, 150, 70, "web/", "mã giao diện", BLUE_BG, BLUE)
    d.arrow([(180, 365), (288, 365)])
    d.label(234, 385, "npm run build", 12, NAVY, True)
    d.box(290, 330, 200, 70, "web/out", "HTML, JS, mô hình AI", BLUE_BG, BLUE)
    d.arrow([(490, 365), (548, 365)])
    d.box(550, 330, 190, 70, "PyInstaller", "đóng gói tất cả", GRAY_BG, GRAY)
    d.arrow([(820, 270), (820, 300), (645, 300), (645, 328)], GREEN)
    d.label(735, 300, "+ mã Python", 12, GREEN, True)
    d.arrow([(740, 365), (798, 365)])
    d.box(800, 330, 170, 70, "File EXE", "trong release/", RED_BG, RED)
    d.box(30, 440, 940, 74, None,
          "Khi mở EXE: Python bật máy chủ ở cổng 8765, rồi mở một cửa sổ hiển thị giao diện lấy từ chính máy chủ đó (http://127.0.0.1:8765). Cùng một EXE dùng cho cả máy giáo viên và máy học sinh.",
          GRAY_BG, GRAY, size=14)
    return d.save("02-cau-truc")


def draw_day_chuyen_ai():
    d = Diagram(1000, 490)
    d.title("Dây chuyền xử lý trên máy thí sinh (lặp lại khoảng 12 lần mỗi giây)")
    top = [("Bước 1 · Webcam", "chụp liên tục từng khung hình (một tấm ảnh)"),
           ("Bước 2 · MediaPipe", "AI của Google tìm khuôn mặt, chấm 478 điểm mốc (mũi, mắt, má, cằm…)"),
           ("Bước 3 · Tính con số", "số khuôn mặt, góc quay đầu, góc cúi/ngẩng, hướng mắt")]
    for index, (title, body) in enumerate(top):
        x = 30 + index * 330
        d.box(x, 65, 280, 120, title, body, BLUE_BG, BLUE)
        if index < 2:
            d.arrow([(x + 280, 125), (x + 328, 125)])
    d.arrow([(830, 185), (830, 243)])
    bottom = [(690, "Bước 4 · Bộ đếm thời gian", "dấu hiệu đã kéo dài đủ lâu chưa? (ví dụ quay đầu ≥ 3 giây)", AMBER_BG, AMBER),
              (360, "Bước 5 · Tạo cảnh báo", "có mã riêng, ghi phòng, máy, thí sinh, loại, giờ", RED_BG, RED),
              (30, "Bước 6 · Hộp thư đi", "gửi về máy giám thị; mất mạng thì chờ gửi lại", GREEN_BG, GREEN)]
    for x, title, body, fill, outline in bottom:
        d.box(x, 245, 280, 120, title, body, fill, outline)
    d.arrow([(690, 305), (642, 305)])
    d.label(666, 282, "đủ ngưỡng", 12, RED, True)
    d.arrow([(360, 305), (312, 305)])
    d.box(360, 405, 280, 66, "Canh trình duyệt", "rời cửa sổ bài thi, bấm Ctrl/Cmd + C, V, X, P", AMBER_BG, AMBER, size=13)
    d.arrow([(500, 405), (500, 367)], AMBER)
    d.box(30, 405, 280, 66, None, "Ảnh chỉ dùng ở bước 1–2 rồi bỏ đi: không lưu, không gửi.", RED_BG, RED, size=13)
    d.box(690, 405, 280, 66, None, "Song song: cứ 2 giây gửi một “nhịp tim” báo trạng thái máy.", GREEN_BG, GREEN, size=13)
    return d.save("03-day-chuyen-ai")


def _face(d, cx, cy, turn):
    d.draw.ellipse(((cx - 110) * S, (cy - 140) * S, (cx + 110) * S, (cy + 140) * S), fill="#FDF3E7", outline="#C9A27E", width=3 * S)
    shift = 55 if turn else 0
    for ex in (-45, 45):
        x = cx + ex + shift * (0.75 if ex > 0 else 1)
        w = 26 if not turn else (18 if ex > 0 else 28)
        d.draw.ellipse(((x - w) * S, (cy - 42) * S, (x + w) * S, (cy - 22) * S), fill=WHITE, outline="#8B6B4A", width=2 * S)
        d.draw.ellipse(((x - 7) * S, (cy - 39) * S, (x + 7) * S, (cy - 25) * S), fill="#3B2F2F")
    left, right = (cx - 106, cy + 12), (cx + 106, cy + 12)
    forehead, chin = (cx + shift * 0.3, cy - 128), (cx + shift * 0.3, cy + 132)
    nose = (cx + shift, cy + 22)
    d.dashed_line(cx, cy - 150, cx, cy + 150, MUTED, dash=6)
    d.dashed_line(left[0], left[1], right[0], right[1], BLUE, dash=6)
    for point, color in ((left, BLUE), (right, BLUE), (forehead, GREEN), (chin, GREEN), (nose, RED)):
        d.dot(point[0], point[1], color, 7)
    d.label(left[0] - 52, left[1], "má trái (234)", 13, BLUE, True)
    d.label(right[0] + 54, right[1], "má phải (454)", 13, BLUE, True)
    d.label(forehead[0], forehead[1] - 22, "trán (10)", 13, GREEN, True)
    d.label(chin[0], chin[1] + 22, "cằm (152)", 13, GREEN, True)
    d.label(nose[0] + 36, nose[1] + 14, "mũi (1)", 13, RED, True, bg="#FDF3E7")
    if turn:
        d.arrow([(cx, cy + 50), (nose[0] - 4, cy + 50)], RED, width=2, head=8)
        d.text(cx + shift / 2, cy + 58, "mũi lệch", 12, RED, True, anchor="ma")


def draw_diem_moc():
    d = Diagram(1000, 520)
    d.title("Cách AI ước tính góc quay đầu từ các điểm mốc khuôn mặt")
    _face(d, 250, 230, False)
    _face(d, 750, 230, True)
    d.text(250, 395, "Nhìn thẳng: mũi nằm giữa hai má → góc ≈ 0°", 14, NAVY, True, anchor="ma")
    d.text(750, 395, "Quay đầu: mũi lệch khỏi điểm giữa → góc lớn", 14, NAVY, True, anchor="ma")
    d.box(30, 430, 940, 74, None,
          "Góc quay ≈ (vị trí mũi − điểm giữa hai má) ÷ bề rộng mặt × 110. Vượt 14° là bất thường. "
          "Cúi/ngẩng tính tương tự bằng trán – mũi – cằm (vượt 20°). Hướng mắt tính bằng vị trí tròng đen nằm trong khóe mắt.",
          GRAY_BG, GRAY, size=14)
    return d.save("04-diem-moc")


def draw_bo_dem():
    d = Diagram(1000, 500)
    d.title("Bộ đếm thời gian hoạt động thế nào? (ví dụ: quay đầu, ngưỡng 3 giây)")

    def tx(t):
        return 90 + t * 170

    def vy(v):
        return 365 - v * 65

    segments = [(0, 1.5, AMBER_BG, AMBER, "quay đầu"), (1.5, 1.8, GREEN_BG, GREEN, ""),
                (1.8, 3.5, AMBER_BG, AMBER, "quay đầu"), (3.5, 5, GREEN_BG, GREEN, "nhìn thẳng")]
    d.text(20, 82, "Thí sinh", 13, MUTED, True)
    for start, end, fill, outline, text in segments:
        d.draw.rectangle((tx(start) * S, 72 * S, tx(end) * S, 104 * S), fill=fill, outline=outline, width=2 * S)
        if text:
            d.text((tx(start) + tx(end)) / 2, 80, text, 13, outline, True, anchor="ma")
    d.text(20, 140, "Bộ đếm", 13, MUTED, True)
    d.text(20, 157, "(giây)", 12, MUTED)
    d.draw.line((tx(0) * S, vy(0) * S, tx(5.1) * S, vy(0) * S), fill=MUTED, width=2 * S)
    for t in range(6):
        d.draw.line((tx(t) * S, vy(0) * S, tx(t) * S, (vy(0) + 6) * S), fill=MUTED, width=2 * S)
        d.text(tx(t), vy(0) + 10, f"{t} s", 12, MUTED, anchor="ma")
    d.dashed_line(tx(0), vy(3), tx(5), vy(3), RED, dash=7)
    d.text(tx(0) + 4, vy(3) - 20, "ngưỡng 3 giây", 13, RED, True)
    points = [(0, 0), (1.5, 1.5), (1.8, 1.5), (3.3, 3.0), (3.5, 3.2), (3.9, 3.2), (3.9, 0), (5, 0)]
    d.draw.line([(tx(t) * S, vy(v) * S) for t, v in points], fill=BLUE, width=4 * S, joint="curve")
    d.dot(tx(3.3), vy(3.0), RED, 9)
    d.label(tx(3.3) - 10, vy(3.0) - 42, "BÍP! Tạo cảnh báo", 14, RED, True)
    d.label(tx(1.4), 205, "liếc về 0,3 giây (dưới 0,4 giây): bộ đếm giữ nguyên", 13, GREEN, True, max_width=220)
    d.label(tx(4.45), 250, "nhìn thẳng đủ 0,4 giây → bộ đếm về 0", 13, GREEN, True, max_width=170)
    d.box(30, 405, 940, 74, None,
          "Sau khi BÍP, cùng loại cảnh báo phải chờ 12 giây mới được báo tiếp (cooldown). "
          "Nếu hai khung hình cách nhau quá 1,5 giây (camera đứng hình, máy treo) thì mọi bộ đếm về 0.",
          GRAY_BG, GRAY, size=14)
    return d.save("05-bo-dem")


def draw_ca_thi():
    d = Diagram(1000, 680)
    d.title("Một ca thi diễn ra thế nào? (đọc từ trên xuống)")
    lanes = {"hs": 160, "hub": 500, "gv": 840}
    d.box(35, 55, 250, 58, "Học sinh", "máy thí sinh", BLUE_BG, BLUE)
    d.box(375, 55, 250, 58, "Trung tâm LAN", "chạy trong máy giáo viên", GRAY_BG, GRAY)
    d.box(715, 55, 250, 58, "Giáo viên", "màn hình Giám thị", GREEN_BG, GREEN)
    for x in lanes.values():
        d.dashed_line(x, 113, x, 665, "#CBD5E1", dash=6)

    def msg(y, a, b, text, color=NAVY):
        d.arrow([(lanes[a], y), (lanes[b], y)], color, width=2, head=10)
        d.label((lanes[a] + lanes[b]) / 2, y - 16, text, 12, color, True, max_width=320)

    def note(y, lane, text, fill, outline):
        x = lanes[lane]
        d.box(x - 125, y, 250, 44, None, text, fill, outline, size=13)

    msg(160, "gv", "hub", "1. Mở EXE, vào trang Giám thị (hỏi dữ liệu mỗi 1 giây)", GREEN)
    msg(220, "hub", "hs", "2. Hô trên LAN mỗi 2 giây: “mã 4821, phòng 01”", GRAY)
    msg(280, "hs", "hub", "3. Gõ mã 4821 → tìm ra địa chỉ → kiểm tra kết nối", BLUE)
    note(300, "hs", "4. Đồng ý giám sát, bật webcam, AI chạy", BLUE_BG, BLUE)
    msg(395, "hs", "hub", "5. Mỗi 2 giây: nhịp tim “máy tôi vẫn ổn”", BLUE)
    msg(450, "hs", "hub", "6. Dấu hiệu kéo dài đủ lâu → gửi CẢNH BÁO", RED)
    msg(505, "hub", "gv", "7. Màn hình thấy cảnh báo: đổi màu, kêu bíp", RED)
    note(520, "gv", "8. Đi tới tận nơi xem", AMBER_BG, AMBER)
    msg(605, "gv", "hub", "9. Bấm “Đã xác minh”", GREEN)
    note(620, "gv", "10. Cuối ca: Xuất báo cáo CSV", GREEN_BG, GREEN)
    return d.save("06-ca-thi")


def draw_tim_may():
    d = Diagram(1000, 470)
    d.title("Tìm máy giám thị bằng mã kết nối 4 số")
    d.box(30, 80, 300, 150, "Máy giáo viên",
          "Trang Giám thị đang mở → trung tâm hô mỗi 2 giây: “examguard-hub, mã 4821, phòng 01, cổng 8765”",
          GREEN_BG, GREEN)
    d.arrow([(330, 155), (558, 155)], GRAY, dashed=True)
    d.label(444, 125, "gói tin quảng bá UDP, cổng 8766\n(mọi máy trong mạng đều nghe)", 12, GRAY, True)
    d.box(560, 65, 410, 290, None, None, BLUE_BG, BLUE)
    d.text(765, 75, "Máy học sinh (cũng mở EXE)", 15, BLUE, True, anchor="ma")
    d.box(590, 105, 350, 80, "Trung tâm nhỏ chạy ngầm", "nghe và ghi nhớ các máy giáo viên đang hô", WHITE, BLUE, size=13)
    d.box(590, 265, 350, 70, "Trang Thí sinh", "em gõ mã 4821", WHITE, BLUE, size=13)
    d.arrow([(650, 265), (650, 187)], BLUE, width=2)
    d.arrow([(880, 187), (880, 263)], BLUE, width=2)
    d.label(700, 212, "hỏi: ai có mã 4821?", 12, BLUE, True)
    d.label(830, 240, "trả về địa chỉ", 12, BLUE, True)
    d.arrow([(765, 355), (765, 392), (180, 392), (180, 232)], GREEN)
    d.label(470, 392, "kết nối thẳng tới máy giáo viên: http://192.168.1.10:8765", 13, GREEN, True)
    d.text(500, 432, "Wi-Fi chặn gói quảng bá? Học sinh gõ địa chỉ http://192.168.1.10:8765 thay cho mã.", 14, MUTED, anchor="ma")
    return d.save("07-tim-may")


def draw_hop_thu_di():
    d = Diagram(1000, 430)
    d.title("Hộp thư đi: không để mất cảnh báo khi mạng chập chờn")
    d.box(30, 165, 170, 80, "Cảnh báo mới", "vừa được tạo", RED_BG, RED)
    d.arrow([(200, 205), (248, 205)])
    d.box(250, 150, 230, 110, "Hộp thư đi", "cất trong trình duyệt; tải lại trang vẫn còn", AMBER_BG, AMBER)
    d.arrow([(480, 205), (528, 205)])
    d.box(530, 165, 180, 80, "Gửi tới", "máy giám thị", GRAY_BG, GRAY)
    d.arrow([(710, 190), (758, 120)], GREEN)
    d.label(722, 145, "được", 12, GREEN, True)
    d.box(760, 60, 210, 100, "Thành công", "xóa khỏi hộp thư; hiện “Giám thị đã nhận”", GREEN_BG, GREEN)
    d.arrow([(710, 220), (758, 290)], RED)
    d.label(722, 265, "mất mạng", 12, RED, True)
    d.box(760, 250, 210, 100, "Chưa gửi được", "giữ nguyên trong hộp thư", AMBER_BG, AMBER)
    d.arrow([(865, 350), (865, 388), (365, 388), (365, 262)], AMBER)
    d.label(615, 388, "2 giây sau thử lại (cùng lúc gửi nhịp tim)", 13, AMBER, True)
    d.box(30, 55, 500, 70, None,
          "Gửi lại nhiều lần có bị trùng không? Không: mỗi cảnh báo có mã riêng, máy giám thị thấy mã đã có thì bỏ qua.",
          BLUE_BG, BLUE, size=13)
    return d.save("08-hop-thu-di")


def draw_mau_trang_thai():
    d = Diagram(1000, 540)
    d.title("Máy thí sinh được tô màu gì trên màn hình giám thị?")
    questions = ["Quá 7 giây không nhận được nhịp tim?", "AI chưa sẵn sàng, tạm dừng hoặc lỗi?",
                 "Số khuôn mặt khác 1 (không có ai, hoặc từ 2 người)?", "Góc đầu hoặc hướng mắt vượt giới hạn?"]
    results = [("XÁM · Mất kết nối", GRAY_BG, GRAY), ("VÀNG · Cần chú ý", AMBER_BG, AMBER),
               ("ĐỎ · Nghiêm trọng", RED_BG, RED), ("VÀNG · Cần chú ý", AMBER_BG, AMBER)]
    for index, (question, (result, fill, outline)) in enumerate(zip(questions, results)):
        y = 65 + index * 92
        d.box(60, y, 460, 60, None, question, WHITE, NAVY, size=14)
        d.arrow([(520, y + 30), (618, y + 30)], outline)
        d.label(569, y + 14, "Có", 12, outline, True)
        d.box(620, y, 330, 60, result, None, fill, outline)
        d.arrow([(290, y + 60), (290, y + 90)], NAVY, width=2, head=8)
        d.label(318, y + 75, "Không", 12, NAVY, True)
    d.box(60, 433, 460, 60, "XANH · Bình thường", None, GREEN_BG, GREEN)
    d.box(620, 423, 330, 80, None, "Màu chỉ phản ánh khung hình hiện tại. Muốn thành CẢNH BÁO thì dấu hiệu phải kéo dài đủ lâu.",
          BLUE_BG, BLUE, size=13)
    return d.save("09-mau-trang-thai")


def draw_khoi_dong():
    d = Diagram(1000, 410)
    d.title("Chuyện gì xảy ra khi bấm mở file EXE?")
    d.box(30, 180, 180, 80, "Mở EXE", "app.py · main()", RED_BG, RED)
    rows = [(70, "Máy chủ web · cổng 8765", "phục vụ giao diện và các API /api/…", GRAY_BG, GRAY),
            (180, "Bộ tìm máy · cổng UDP 8766", "một luồng nghe, một luồng hô", AMBER_BG, AMBER),
            (290, "Cửa sổ ứng dụng", "Edge WebView2 mở http://127.0.0.1:8765", BLUE_BG, BLUE)]
    for y, title, body, fill, outline in rows:
        d.box(330, y, 300, 80, title, body, fill, outline, size=13)
        d.arrow([(210, 220), (270, 220), (270, y + 40), (328, y + 40)], NAVY, width=2)
    d.arrow([(630, 330), (690, 330), (690, 110), (632, 110)], BLUE, width=2)
    d.label(690, 220, "tải trang", 12, BLUE, True)
    d.box(740, 125, 230, 190, "Vì sao cần EXE?",
          "Trình duyệt chỉ cho bật webcam ở địa chỉ an toàn (localhost hoặc HTTPS). EXE mở trang từ 127.0.0.1 nên webcam chạy được.",
          AMBER_BG, AMBER, size=13)
    return d.save("10-khoi-dong")


def draw_all():
    return {
        "tong_quan": draw_tong_quan(),
        "cau_truc": draw_cau_truc(),
        "day_chuyen": draw_day_chuyen_ai(),
        "diem_moc": draw_diem_moc(),
        "bo_dem": draw_bo_dem(),
        "ca_thi": draw_ca_thi(),
        "tim_may": draw_tim_may(),
        "hop_thu": draw_hop_thu_di(),
        "mau": draw_mau_trang_thai(),
        "khoi_dong": draw_khoi_dong(),
    }


if __name__ == "__main__":
    for name, path in draw_all().items():
        print(name, path)
