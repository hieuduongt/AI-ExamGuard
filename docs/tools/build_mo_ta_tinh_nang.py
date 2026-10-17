"""
Tạo Word: Mô tả tính năng · vai trò · công nghệ — tài liệu cả dự án cho THCS vấn đáp.
Đầu ra: docs/tai-lieu-du-thi/AI_ExamGuard_Mo_ta_tinh_nang_vai_tro_va_cong_nghe.docx
Chạy: cd docs/tools && PYTHONPATH=. /tmp/egdoc/bin/python build_mo_ta_tinh_nang.py
"""
from pathlib import Path

from docx.enum.text import WD_ALIGN_PARAGRAPH

from build_tai_lieu_hoc_sinh import MUTED, NAVY, BLUE, Writer, font_run

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "tai-lieu-du-thi" / "AI_ExamGuard_Mo_ta_tinh_nang_vai_tro_va_cong_nghe.docx"
FIG = ROOT / "tai-lieu-du-thi" / "hinh-tai-lieu-hoc-sinh"


class Doc(Writer):
    def _header_footer(self, section):
        header = section.header.paragraphs[0]
        header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        font_run(header.add_run("AI ExamGuard · Mô tả dự án cho vấn đáp (THCS)"), 9, MUTED, italic=True)
        footer = section.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        font_run(footer.add_run("Trang "), 9, MUTED)
        self._field(footer, "PAGE", 9)

    def h1(self, text, new_page=False):
        if new_page:
            self.doc.add_page_break()
        self.doc.add_heading(text, level=1)

    def fig(self, name, caption, width=15.5):
        path = FIG / name
        if path.exists():
            self.figure(path, caption, width=width)
        else:
            self.callout("canh", f"(Thiếu hình {name} — chạy so_do_tai_lieu_hoc_sinh nếu cần.)")


def cover(w):
    for _ in range(2):
        w.doc.add_paragraph()
    p = w.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("AI ExamGuard"), 36, NAVY, True)
    p = w.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("MÔ TẢ TÍNH NĂNG · VAI TRÒ · CÔNG NGHỆ"), 18, BLUE, True)
    p = w.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Tài liệu cả dự án — cập nhật đến bản đã cải tiến theo góp ý giám khảo"), 12, NAVY)
    p = w.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Dành cho học sinh THCS · Ôn vấn đáp · Không cần biết lập trình"), 12, MUTED)
    p = w.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(
        p.add_run("Hiểu bản chất → Biết ai làm gì → Biết luồng chạy → Trả lời được câu hỏi sâu"),
        11, MUTED, italic=True,
    )
    p = w.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Nhóm dự án AI ExamGuard"), 12, MUTED)
    p = w.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(
        p.add_run("File đi kèm sâu hơn phần cải tiến: AI_ExamGuard_Tai_lieu_phan_cai_tien_theo_gop_y.docx"),
        10, MUTED, italic=True,
    )


def part0(w):
    w.h1("0. Em đọc tài liệu này để làm gì?")
    w.p(
        "Đây là **bản đồ cả dự án AI ExamGuard** tính đến hiện tại — kể cả phần đã cải tiến "
        "(nút Báo nhầm, ngưỡng cúi/ngẩng riêng, đoạn hình ngắn, biên bản, đồng bộ cấu hình qua hub, "
        "xóa máy, HTTPS LAN…). Em đọc để **nói chuyện với giám khảo** tự tin, dù không lập trình."
    )
    w.callout("nho", [
        "**Mỗi bạn trong nhóm nắm như nhau** — không chia “bạn này chỉ biết phần mình”. Giám khảo hỏi ai cũng phải nói được.",
        "Thứ tự nhớ: **Vấn đề đời thật → Hệ thống giúp gì → Ai dùng trang nào → Luồng dữ liệu → Giới hạn AI → Cải tiến.**",
        "Câu chốt luôn đúng: “**AI không kết luận gian lận; AI hỗ trợ quan sát và cảnh báo; giám thị quyết định.**”",
        "Không nói “có tiếng bíp cảnh báo” — nhóm đã **gỡ âm thanh**; giám thị nhìn màu máy + dải cảnh báo mới.",
    ])
    w.h2("Cách đọc nhanh trước vấn đáp (cả nhóm)")
    w.steps([
        "Mục 1–2 (10 phút): dự án là gì + ai làm gì.",
        "Mục 3–4 (15 phút): dây chuyền AI và các trang web.",
        "Mục 5–6 (15 phút): quy tắc cảnh báo + mạng LAN / hub.",
        "Mục 7–8 (10 phút): công nghệ dễ hiểu + cải tiến tóm tắt.",
        "Mục 10–12: luyện câu hỏi + demo + checklist.",
    ])
    w.h2("Những gì mỗi bạn phải nói được (không phân công)")
    w.table(["Chủ đề", "Phải hiểu / nói được", "Bằng chứng / thao tác demo"], [
        ["Bài toán", "Phòng thi nhiều máy; giám thị không đứng sát từng em; cần gọi tới đúng máy.", "Sơ đồ tổng quan."],
        ["Ba trang + hub", "Thí sinh / giám thị / quản trị; hub trên máy giám thị cổng 8765.", "Mở 3 trang + hub đang chạy."],
        ["Hai tầng AI", "MediaPipe nhìn → BehaviorEngine đếm giây → giám thị kết luận.", "Thanh tiến trình `x / N giây`."],
        ["Báo nhầm", "Hai nút; đếm theo loại; CSV cột Kết luận.", "Bấm Báo nhầm → thẻ số tăng."],
        ["Ngưỡng", "Cúi/ngẩng 6s ≠ quay đầu 3s; Lưu ở Quản trị → hub → thí sinh.", "Chỉnh số → thấy thanh tiến trình đổi."],
        ["Đoạn hình + biên bản", "Clip lúc AI cảnh báo; biên bản = đúng + báo nhầm đã kết luận.", "Play clip; xuất biên bản."],
        ["LAN", "Không bắt buộc Internet; mất mạng tạm xếp hàng gửi lại.", "Ngắt Wi‑Fi thử rồi nối lại."],
    ], [2.8, 7.0, 6.8], size=9)


def part1(w):
    w.h1("1. Dự án là gì? Giải quyết chuyện gì?", new_page=True)
    w.h2("1.1. Bài toán đời thật")
    w.p(
        "Trong phòng thi máy tính, một giám thị phải trông **nhiều máy cùng lúc**. "
        "Không thể đứng sát từng em suốt buổi. Các dấu hiệu cần chú ý "
        "(rời chỗ, có người thứ hai trước webcam, quay đầu lâu, nhìn lệch màn hình…) "
        "có thể xảy ra trong vài giây và bị bỏ sót khi giám thị đang nhìn chỗ khác."
    )
    w.h2("1.2. AI ExamGuard làm gì?")
    w.p(
        "AI ExamGuard là **“trợ lý quan sát”**: AI nhận biết tín hiệu qua webcam, "
        "hệ thống kiểm tra tín hiệu có **kéo dài đủ lâu** không, rồi gửi cảnh báo để "
        "**giám thị kiểm tra thực tế và quyết định**. AI **không** kết luận gian lận."
    )
    w.bullets([
        "Máy thí sinh mở webcam → AI **quan sát** mặt/đầu/mắt (không nhận diện “em A hay em B”).",
        "Hệ thống **đếm thời gian**: việc lạ kéo dài đủ giây mới tạo cảnh báo (tránh “liếc một cái đã báo”).",
        "Cảnh báo gửi về máy giám thị qua mạng phòng thi (**LAN**).",
        "Giám thị xem (tuỳ chọn xem đoạn hình ngắn), rồi bấm **Xác nhận đúng** hoặc **Báo nhầm**.",
        "Cuối buổi có thể xuất **báo cáo CSV** / **biên bản đã xác nhận**.",
    ])
    w.fig("01-tong-quan.png", "Tổng quan: thí sinh – trung tâm LAN – giám thị.")
    w.callout("vi", [
        "**Cảm biến lùi xe:** cảm biến không lái xe thay người — nó chỉ kêu khi có vật gần quá lâu; người lái quay lại nhìn và quyết định.",
        "**Camera cửa hàng:** camera chỉ quay; chuông kêu khi có chuyển động lâu; bảo vệ mới tới xem và quyết định.",
        "AI ExamGuard cũng vậy: chỉ “gọi giám thị” khi một dấu hiệu kéo dài đủ lâu.",
    ])
    w.h2("1.3. Bốn mục tiêu của dự án")
    w.steps([
        "Dùng AI thị giác nhận biết một số tín hiệu quan sát được qua webcam.",
        "Tránh “vừa quay đầu đã báo”: tín hiệu phải kéo dài đủ ngưỡng mới thành cảnh báo.",
        "Cảnh báo phải gắn đúng **phòng – máy – thí sinh – loại tín hiệu – thời điểm**.",
        "Con người luôn giữ quyết định cuối cùng (Xác nhận đúng / Báo nhầm).",
    ])
    w.h2("1.4. Ba câu giám khảo hay hỏi ngay từ đầu")
    w.table(["Câu hỏi", "Trả lời ngắn (học thuộc ý)"], [
        ["AI có kết luận gian lận không?", "Không. AI chỉ hỗ trợ quan sát và cảnh báo."],
        ["Ai quyết định cuối?", "Giám thị người thật, sau khi kiểm tra tận nơi (hoặc xem đoạn hình)."],
        ["Chạy offline / không Internet được không?", "Được trên LAN phòng thi (hub máy giám thị). Không bắt buộc Internet."],
    ], [5.5, 11.1], size=10)


def part2(w):
    w.h1("2. Vai trò trong dự án (ai dùng gì?)", new_page=True)
    w.p(
        "Trong vấn đáp, hãy phân biệt **vai trò người dùng** (thí sinh / giám thị / quản trị) "
        "với **vai trò trong máy** (AI nhìn / luật đếm giây / hub)."
    )
    w.h2("2.1. Ba vai trò người dùng")
    w.table(["Vai trò", "Trang web", "Việc chính", "Không làm"], [
        [
            "**Thí sinh**",
            "`/thi-sinh`",
            "Khai báo họ tên, SBD, phòng, máy; kết nối hub; đồng ý giám sát; bật webcam; làm bài; thấy cảnh báo gần đây.",
            "Không xem máy bạn; không kết luận gian lận; không sửa ngưỡng.",
        ],
        [
            "**Giám thị**",
            "`/giam-thi`",
            "Nhìn lưới máy, đọc cảnh báo, xem clip (nếu có), bấm đúng/nhầm, xuất biên bản, xóa máy offline khỏi lưới.",
            "Không sửa ngưỡng AI (đó là Quản trị).",
        ],
        [
            "**Quản trị**",
            "`/quan-tri`",
            "Đặt tên phòng; chỉnh ngưỡng giây; bật/tắt lưu đoạn hình; **Lưu thay đổi** để đẩy lên hub.",
            "Không trực tiếp coi từng cảnh báo như giám thị (có thể mở trang giám thị nếu cùng máy).",
        ],
    ], [2.4, 2.4, 6.4, 5.4], size=9)
    w.fig("06-ca-thi.png", "Một ca thi: nhiều máy thí sinh nối một máy giám thị.")
    w.h2("2.2. Ba vai trò “trong máy” (bản chất kỹ thuật — xương sống trả lời)")
    w.table(["Vai", "Ví von", "Làm gì", "Không làm gì", "Chỗ chính"], [
        [
            "Tầng NHÌN",
            "Người gác cổng",
            "Webcam → vài con số (số mặt, góc đầu, mắt).",
            "Không kết luận gian lận; không nhận diện danh tính.",
            "`web/src/ai/` (MediaPipe, vision-provider)",
        ],
        [
            "Tầng QUYẾT ĐỊNH CẢNH BÁO",
            "Trọng tài bấm đồng hồ",
            "Đủ giây theo ngưỡng → tạo cảnh báo gọi giám thị.",
            "Không tự tuyên bố thí sinh sai phạm.",
            "`behavior-engine.ts`, `thresholds.ts`",
        ],
        [
            "CON NGƯỜI + HUB",
            "Bưu điện + bảo vệ",
            "Hub giữ dữ liệu ca thi; giám thị kết luận đúng/nhầm.",
            "Không để AI thay người kết luận cuối.",
            "`desktop-hub/`, trang `/giam-thi`",
        ],
    ], [2.4, 2.4, 4.0, 3.6, 4.2], size=9)
    w.callout("hoi",
              "“MediaPipe có phải là phần kết luận gian lận không?” → **Không**. "
              "Nó chỉ nhìn. BehaviorEngine mới đếm giây. Giám thị mới kết luận.")
    w.h2("2.3. Vì sao phải tách tầng nhìn và tầng đếm giây?")
    w.bullets([
        "Nếu gộp “nhìn” và “kết luận” vào một chỗ: mỗi lần đổi AI phải sửa cả luật cảnh báo → dễ hỏng, khó giải thích.",
        "Tách ra: đổi cách nhìn (MediaPipe → thuật toán khác) thì luật đếm giây / nút Báo nhầm / biên bản **có thể giữ**.",
        "File `vision-provider.ts` là “cửa” duy nhất từ mô hình nhìn sang các con số BehaviorEngine hiểu; có nhánh dự phòng `future-custom` (ổ cắm trống có chủ đích).",
    ])


def part3(w):
    w.h1("3. Dây chuyền hoạt động (từ webcam đến giám thị)", new_page=True)
    w.h2("3.1. Luồng chính — học thuộc theo bước")
    w.steps([
        "Máy giám thị mở **hub** (EXE hoặc `run_hub.py`) — cổng mặc định **8765**.",
        "Giám thị mở `/giam-thi` → thấy **mã kết nối 4 số** + địa chỉ LAN.",
        "Thí sinh mở `/thi-sinh`, nhập phòng/máy/họ tên, **kết nối máy giám thị** (mã 4 số hoặc địa chỉ).",
        "Đồng ý giám sát → bắt đầu → xin quyền webcam.",
        "Mỗi khung hình: MediaPipe tìm mặt → `vision-provider` đổi thành vài con số (VisionMetrics).",
        "BehaviorEngine cộng giây nếu việc lạ còn đang xảy ra; đủ ngưỡng → tạo cảnh báo.",
        "Nếu Quản trị bật lưu đoạn hình: ghi khoảng **3 giây trước** + **2 giây trong lúc** xảy ra.",
        "Cảnh báo gửi POST `/api/events` lên hub (clip gửi thẳng; **không** nhét localStorage).",
        "Máy thí sinh còn gửi “nhịp tim” POST `/api/stations` khoảng **2 giây/lần**.",
        "Trang `/giam-thi` mỗi giây hỏi GET `/api/snapshot` → hiện lưới máy + danh sách cảnh báo.",
        "Giám thị mở chi tiết → (xem clip) → **Xác nhận đúng** hoặc **Báo nhầm** (PATCH).",
        "Cuối buổi: xuất CSV đầy đủ / **Biên bản đã xác nhận** (gồm đúng + báo nhầm đã kết luận).",
    ])
    w.fig("03-day-chuyen-ai.png", "Dây chuyền AI: nhìn → đếm giây → cảnh báo → giám thị.")
    w.fig("08-hop-thu-di.png", "Hộp thư đi: mất mạng tạm thời thì xếp hàng gửi lại.")
    w.h2("3.2. Sơ đồ chữ (nói được khi không có hình)")
    w.code("Luồng tóm tắt (đọc to khi vấn đáp)", """
Webcam thí sinh
  → AI nhìn (MediaPipe) → vài con số
  → BehaviorEngine đếm giây (ngưỡng Quản trị)
  → Cảnh báo (+ clip nếu bật)
  → Hub máy giám thị (RAM)
  → Trang Giám thị poll mỗi giây
  → Người bấm: Đúng / Báo nhầm
""", "Sơ đồ chữ")
    w.h2("3.3. Dữ liệu nào rời máy thí sinh?")
    w.bullets([
        "**Không** gửi toàn bộ video liên tục lên máy chủ.",
        "Gửi: **cảnh báo** (loại, thời điểm, phòng, máy, họ tên…), vài **số liệu trạng thái**, và **clip ngắn** nếu nhà trường bật.",
        "Danh tính do thí sinh **tự khai báo** — sản phẩm **không** nhận diện khuôn mặt để biết “em A/em B”.",
    ])
    w.fig("04-diem-moc.png", "Điểm mốc khuôn mặt giúp ước lượng góc đầu / hướng mắt.")
    w.fig("05-bo-dem.png", "Bộ đếm giây: chưa đủ ngưỡng thì chưa cảnh báo.")


def part4(w):
    w.h1("4. Tính năng theo từng trang", new_page=True)
    w.h2("4.1. Trang Thí sinh `/thi-sinh`")
    w.bullets([
        "Form: họ tên, số báo danh, phòng, số máy.",
        "Ô địa chỉ / mã kết nối hub; nút kiểm tra kết nối trước khi bắt đầu.",
        "Checkbox **đồng ý giám sát** (nếu Quản trị bắt buộc) — chỉ sau đó mới mở webcam.",
        "Camera + lớp vẽ điểm mốc (giúp hiểu AI đang “nhìn” gì).",
        "Thanh **tiến trình tạo cảnh báo** (ví dụ `1.2 / 6.0s`) — thấy AI đang đếm gì.",
        "Danh sách cảnh báo gần đây: “Đang chờ gửi” / “Giám thị đã nhận”.",
        "Nút tạo cảnh báo thử (demo đường truyền, bỏ qua cooldown).",
        "Nút Dừng: tắt phiên, máy chuyển trạng thái offline trên lưới giám thị.",
    ])
    w.fig("10-khoi-dong.png", "Khởi động phiên thí sinh: kết nối → đồng ý → webcam → AI.")
    w.h2("4.2. Trang Giám thị `/giam-thi`")
    w.bullets([
        "Banner địa chỉ hub / mã 4 số để thí sinh nối.",
        "Thẻ số liệu: máy bình thường / cảnh báo / báo nhầm (kể cả theo loại)…",
        "Lưới máy màu xanh – vàng – đỏ – xám (mất kết nối).",
        "Máy offline quá khoảng **7 giây** không nhịp tim → hiện mất kết nối.",
        "**Nút thùng rác** trên ô máy: xóa máy khỏi lưới (không xóa cảnh báo đã ghi).",
        "Feed cảnh báo; dải đỏ “cảnh báo mới” (tự tắt khi cảnh báo biến mất / đã xem).",
        "Chi tiết: hai nút **Xác nhận đúng** / **Báo nhầm**; xem đoạn hình / ảnh nếu có.",
        "Xuất báo cáo CSV đầy đủ; **Biên bản đã xác nhận** = các lần đã kết luận (đúng + báo nhầm).",
        "**Không** còn tiếng bíp — dùng màu + dải đỏ để gọi chú ý.",
    ])
    w.fig("09-mau-trang-thai.png", "Màu máy trên lưới giám thị.")
    w.h2("4.3. Trang Quản trị `/quan-tri`")
    w.bullets([
        "Tên phòng, số máy (gợi ý tổ chức).",
        "Ô chỉnh từng ngưỡng giây (1–60): không mặt, nhiều mặt, quay đầu, cúi/ngẩng, mắt lệch, cooldown…",
        "Công tắc: yêu cầu đồng ý giám sát; **lưu đoạn hình ngắn** (mặc định tắt).",
        "Nút **Lưu thay đổi** → lưu localStorage **và** đẩy lên hub (`thresholds` + quyền riêng tư).",
        "Xuất file cấu hình JSON (sao lưu).",
    ])
    w.callout("canh",
              "Đổi ngưỡng / công tắc clip mà **không bấm Lưu** thì máy thí sinh khác trong phòng **không** nhận. "
              "Hub phải đang chạy.")
    w.h2("4.4. Trung tâm LAN (hub) trên máy giám thị")
    w.bullets([
        "Chương trình Python `desktop-hub/` (hoặc EXE): cổng mặc định **8765**.",
        "Giữ cảnh báo + trạng thái máy + cài đặt phòng trong **RAM** (tắt hub → mất — chủ đích).",
        "API chính: health, runtime, snapshot, events, stations, settings, DELETE máy.",
        "UDP discovery cổng **8766**: hô mã 4 số khi trang giám thị đang mở (thí sinh gõ mã để tìm IP).",
        "Giữ tối đa khoảng **500** cảnh báo mới nhất trong bộ nhớ.",
    ])
    w.fig("07-tim-may.png", "Thí sinh tìm máy giám thị bằng mã kết nối trên LAN.")
    w.fig("02-cau-truc.png", "Cấu trúc thư mục chính của dự án.")


def part5(w):
    w.h1("5. Quy tắc tạo cảnh báo (học thuộc bảng này)", new_page=True)
    w.p(
        "AI **không** báo ngay khi em liếc sang một chút. Giống trọng tài cầm đồng hồ: "
        "chỉ khi dấu hiệu **kéo dài liên tục đủ lâu** mới “thổi còi”. "
        "Thổi xong phải nghỉ khoảng **12 giây** mới thổi lại cùng loại. "
        "Còi chỉ để gọi giám thị — **không phải phán quyết**."
    )
    w.h2("5.1. Các loại cảnh báo")
    w.table(["Loại (ý)", "Mức màu", "Điều kiện đơn giản", "Phải kéo dài (mặc định)"], [
        ["Không có mặt trước máy", "Đỏ", "Không thấy khuôn mặt nào", "5 giây"],
        ["Nhiều khuôn mặt", "Đỏ", "Từ 2 khuôn mặt trở lên", "2 giây"],
        ["Quay đầu trái/phải", "Vàng", "1 mặt, quay ngang rõ", "3 giây"],
        ["Cúi / ngẩng đầu", "Vàng", "1 mặt, cúi hoặc ngẩng rõ", "6 giây (tách riêng)"],
        ["Mắt nhìn lệch", "Vàng", "1 mặt, hướng mắt lệch lâu", "5 giây"],
        ["Rời cửa sổ bài thi", "Vàng", "Chuyển tab / thu nhỏ trang", "Ngay lập tức"],
        ["Thao tác bàn phím hạn chế", "Vàng", "Ctrl/Cmd + C, V, X, P", "Ngay lập tức"],
    ], [4.2, 1.8, 5.8, 4.8], size=9)
    w.callout("vi",
              "Vì sao cúi/ngẩng **6 giây** còn quay đầu **3 giây**? "
              "Viết nháp / nhặt bút / ngẩng suy nghĩ dễ kéo dài hơn 3 giây → dễ báo oan nếu chung ngưỡng. "
              "Quay hẳn sang bạn bên cạnh đáng chú ý sớm hơn.")
    w.h2("5.2. Cách đếm thời gian (chống báo nhầm kỹ thuật)")
    w.bullets([
        "Chỉ cộng thời gian giữa hai khung hình liên tiếp **cùng** vi phạm.",
        "Tín hiệu biến mất dưới ~0,4 giây (nhiễu ngắn) thì bộ đếm vẫn giữ; mất lâu hơn thì về 0.",
        "Hai khung hình cách nhau quá ~1,5 giây (camera đứng / máy treo) → đếm về 0: không tính thời gian camera dừng là “đã quan sát”.",
        "Cooldown ~12 giây theo **từng loại** cảnh báo (nút thử bỏ qua cooldown).",
        "Bắt đầu phiên mới → xóa mọi bộ đếm và cooldown.",
    ])
    w.h2("5.3. Màu trạng thái máy trên lưới")
    w.table(["Màu", "Ý nghĩa"], [
        ["Đỏ (critical)", "Số khuôn mặt khác 1 (không mặt hoặc nhiều mặt)."],
        ["Vàng (warning)", "Có 1 mặt nhưng góc đầu/mắt vượt giới hạn; hoặc AI chưa sẵn sàng / tạm dừng."],
        ["Xanh (normal)", "1 khuôn mặt, mọi chỉ số trong giới hạn."],
        ["Xám / mất kết nối", "Không nhận nhịp tim quá ~7 giây, hoặc thí sinh đã Dừng."],
    ], [4.0, 12.6], size=10)
    w.h2("5.4. Trạng thái AI (giám thị cần biết)")
    w.bullets([
        "`loading`: đang tải mô hình.",
        "`ready`: có khung hình mới được phân tích gần đây.",
        "`stalled`: camera mở nhưng vài giây không có khung hình mới (“AI tạm dừng”).",
        "`error`: lỗi mô hình / webcam.",
        "`stopped`: thí sinh bấm Dừng.",
    ])
    w.callout("canh",
              "**Camera có hình chưa có nghĩa AI đang chạy.** Giám thị cần nhìn trạng thái AI trên máy đó.")


def part6(w):
    w.h1("6. Mạng LAN, hub và các kênh đồng bộ", new_page=True)
    w.h2("6.1. Phòng thi thật ưu tiên LAN")
    w.p(
        "Máy giám thị chạy hub; máy thí sinh nối cùng Wi‑Fi/LAN. "
        "**Không bắt buộc Internet.** Cảnh báo và trạng thái máy đi qua API `/api/...`."
    )
    w.h2("6.2. Tìm máy giám thị bằng mã 4 số")
    w.steps([
        "Trang Giám thị đang mở → hub cứ khoảng 2 giây phát gói UDP (cổng 8766) mang mã 4 số + tên phòng + cổng.",
        "Thí sinh gõ đúng mã → biết địa chỉ để kết nối HTTP/HTTPS tới cổng 8765.",
        "Nếu mạng chặn quảng bá UDP → thí sinh gõ thẳng địa chỉ (ví dụ `https://192.168.x.x:3000` cho web dev, hoặc địa chỉ hub).",
    ])
    w.h2("6.3. Ba kênh đồng bộ (biết tên là đủ)")
    w.table(["Kênh", "Khi nào", "Phạm vi"], [
        ["**LAN (chính)**", "Có hub / đã nhập địa chỉ máy giám thị", "Nhiều máy cùng mạng, không cần Internet"],
        ["**Firebase (tuỳ chọn)**", "Có cấu hình khi build", "Qua Internet — cần bảo mật thêm nếu dùng thật"],
        ["**Cục bộ trong trình duyệt**", "Luôn chạy song song", "Chỉ các tab cùng một trình duyệt — không thay LAN"],
    ], [3.6, 5.4, 7.6], size=10)
    w.h2("6.4. Mất mạng tạm thời")
    w.bullets([
        "Cảnh báo chữ được xếp **hộp thư đi** trong trình duyệt và gửi lại khi có kết nối.",
        "Hub bỏ qua cảnh báo **trùng mã** → gửi lại không làm nhân đôi kết luận đã có.",
        "Clip lớn **không** nhét localStorage (dễ đầy bộ nhớ → hỏng cả lần gửi chữ).",
    ])
    w.h2("6.5. HTTPS khi mở web bằng IP LAN (webcam)")
    w.bullets([
        "Trình duyệt chỉ cho webcam trên `localhost` hoặc **HTTPS**.",
        "Demo nhiều máy: web chạy `npm run dev:https`; cert tự ký — máy khác bấm Advanced → Proceed.",
        "Đổi IP máy → chạy lại `npm run certs:dev` để cert khớp địa chỉ mới.",
        "EXE tải giao diện từ `127.0.0.1` nên webcam trên máy đó hoạt động mà không cần HTTPS công cộng.",
    ])


def part7(w):
    w.h1("7. Công nghệ — giải thích cho người không lập trình", new_page=True)
    w.table(["Tên", "Là gì?", "Trong dự án dùng để"], [
        ["Webcam + trình duyệt", "Camera máy tính + Chrome/Edge", "Lấy hình thí sinh; chạy AI ngay trên máy thí sinh."],
        ["MediaPipe Face Landmarker", "Thư viện Google đọc mặt/điểm mốc", "Ước lượng số mặt, góc đầu, hướng mắt — **không** kết luận gian lận."],
        ["Next.js / React", "Khung làm trang web", "Ba trang: thí sinh, giám thị, quản trị."],
        ["TypeScript", "Ngôn ngữ phía web", "Viết logic rõ ràng, có kiểm thử."],
        ["Python hub", "Chương trình máy giám thị", "Nhận cảnh báo, giữ trạng thái phòng thi trên LAN."],
        ["JSON / API", "Cách hai chương trình nói chuyện", "`/api/events`, `/api/stations`, `/api/settings`…"],
        ["`shared/hub-contract.json`", "Hợp đồng chung web ↔ Python", "Cổng, loại cảnh báo, verdict… được kiểm thử tự động."],
        ["localStorage", "Bộ nhớ nhỏ trong trình duyệt", "Nhớ địa chỉ hub, hàng chờ gửi chữ; **không** nhét clip lớn."],
        ["Firebase (tuỳ chọn)", "Dịch vụ đám mây", "Có thể dùng thêm; phòng thi thật ưu tiên LAN."],
    ], [3.4, 5.4, 7.8], size=9)
    w.h2("7.1. Vì sao AI chạy trên máy thí sinh?")
    w.p(
        "Hình webcam **không cần** gửi hết lên máy chủ để nhận diện. "
        "Máy thí sinh tự phân tích → chỉ gửi **cảnh báo và vài số liệu** (và clip ngắn nếu bật). "
        "Giảm tải mạng, tăng riêng tư."
    )
    w.h2("7.2. Hai phần mềm chính")
    w.table(["Phần", "Ngôn ngữ", "Vai trò"], [
        ["`web/`", "TypeScript (Next.js)", "Giao diện + AI nhìn + đếm hành vi + hàng chờ gửi"],
        ["`desktop-hub/`", "Python", "Trung tâm LAN (API, dữ liệu RAM), đóng gói EXE"],
        ["`shared/`", "JSON", "Hợp đồng chung giữa hai phía"],
    ], [3.2, 4.0, 9.4], size=10)
    w.h2("7.3. Giới hạn phải nói thật với giám khảo")
    w.bullets([
        "AI có **báo nhầm** và **bỏ sót** — không 100%.",
        "Không phát hiện điện thoại ngoài khung / sách dưới bàn nếu camera không thấy.",
        "Phòng tối, kính, ngồi lệch có thể làm MediaPipe kém chính xác.",
        "Góc đầu / mắt là **ước tính**, không phải bằng chứng độc lập để kết luận vi phạm.",
        "Cúi đầu lâu có thể chỉ đang viết nháp — cảnh báo chỉ nhắc giám thị quan sát thêm.",
        "Clip và dữ liệu hub trong RAM: tắt chương trình là mất (chủ đích quyền riêng tư).",
        "Bản LAN cần thử thêm với nhiều máy trước khi dùng phòng thi quy mô lớn.",
    ])


def part8(w):
    w.h1("8. Phần cải tiến theo góp ý giám khảo (bản đồ nhanh)", new_page=True)
    w.p(
        "Chi tiết vấn đáp phần này nằm ở file "
        "**AI_ExamGuard_Tai_lieu_phan_cai_tien_theo_gop_y.docx**. Dưới đây là bản nhớ nhanh cả dự án."
    )
    w.table(["#", "Góp ý giám khảo", "Đã có trong sản phẩm"], [
        ["1", "Báo nhầm nguy hiểm; cần nút + đếm để chỉnh ngưỡng", "Hai nút; thống kê theo loại; CSV cột Kết luận."],
        ["2", "Thử có hệ thống; chỉnh ngưỡng; thử thiếu sáng/kính", "Cúi/ngẩng 6s tách khỏi quay đầu 3s; đồng bộ ngưỡng qua hub; quy trình thử."],
        ["3", "Đoạn hình ngắn + biên bản", "Clip ~5s khi bật công tắc; biên bản = đúng + báo nhầm đã kết luận."],
        ["4", "Thử với thầy cô thật", "Quy trình buổi thử + tiếp thu UI (không phải thêm AI)."],
    ], [0.8, 5.4, 10.4], size=10)
    w.h2("8.1. Vận hành thêm sau khi triển khai (có thể bị hỏi)")
    w.bullets([
        "Đã **gỡ âm thanh** cảnh báo — dùng màu máy + dải đỏ.",
        "`vision-provider`: MediaPipe đang dùng; `future-custom` là ổ cắm trống có chủ đích.",
        "Nút **xóa máy** trên lưới giám thị (máy offline / thử xong).",
        "**HTTPS LAN** cho webcam khi mở bằng IP; cert khớp IP hiện tại.",
        "Sửa gửi cảnh báo ổn định (không nhét media vào localStorage).",
        "Ngưỡng + công tắc clip: Quản trị **Lưu** → hub → thí sinh đọc lại khi bắt đầu và đang chạy.",
    ])
    w.callout("nho",
              "Khi vấn đáp: nói được cả **dự án gốc** (mục 1–7) lẫn **cải tiến** (mục 8 + tài liệu cải tiến).")


def part9(w):
    w.h1("9. Quyền riêng tư và an toàn khi demo", new_page=True)
    w.bullets([
        "Thí sinh phải **đồng ý** giám sát trước khi bật camera (nếu cấu hình bắt buộc).",
        "Lưu đoạn hình **mặc định tắt**; chỉ khi Quản trị bật và bấm **Lưu**.",
        "Clip chỉ vài giây quanh cảnh báo, độ phân giải thấp; chỉ trong **RAM** máy giám thị.",
        "Không dùng để nhận diện danh tính học sinh.",
        "Trên LAN: dùng HTTPS (`dev:https`) nếu máy khác mở bằng IP — webcam mới được phép.",
        "Cert tự ký: máy khác bấm Advanced → Proceed; đổi IP thì `npm run certs:dev`.",
        "Cuối ca thi: **Xuất báo cáo / biên bản** trước khi tắt hub (dữ liệu RAM sẽ mất).",
    ])
    w.callout("canh",
              "Demo vấn đáp: luôn bật hub cùng lúc với web. "
              "Trang giám thị trống / mất snapshot thường vì hub chưa chạy.")


def part10(w):
    w.h1("10. Bản đồ file (nhắc tên nếu giám khảo hỏi sâu)", new_page=True)
    w.p("Không cần thuộc đường dẫn. Nhớ **ý**: mỗi việc quan trọng nằm ở đâu.")
    w.table(["Việc", "File / chỗ chính", "Nói một câu"], [
        ["Đếm giây cảnh báo", "`web/src/domain/behavior-engine.ts`", "Trọng tài bấm đồng hồ."],
        ["Số ngưỡng mặc định", "`web/src/domain/thresholds.ts`", "Bảng luật giây."],
        ["Từ điển dữ liệu", "`web/src/domain/exam-types.ts`", "Cùng một kiểu cho mọi trang."],
        ["Cửa tầng nhìn", "`web/src/ai/vision-provider.ts`", "MediaPipe → con số; có future-custom."],
        ["Phiên thí sinh", "`use-monitoring-session.ts`", "Webcam, AI, gửi cảnh báo, đọc ngưỡng hub."],
        ["Ghi clip ngắn", "`alert-clip-recorder.ts`", "~3s trước + ~2s trong lúc."],
        ["Hai nút đúng/nhầm", "`event-detail-drawer.tsx`", "Giám thị kết luận sau khi kiểm tra."],
        ["Xuất CSV / biên bản", "`csv-export.ts`", "Biên bản = confirmed + false_alarm."],
        ["Hub lưu sự kiện", "`desktop-hub/.../exam_store.py`", "RAM ca thi."],
        ["API HTTP", "`desktop-hub/.../http_handler.py`", "Cửa nhận lệnh từ web."],
        ["Hợp đồng chung", "`shared/hub-contract.json`", "Web và Python phải khớp."],
        ["Đẩy cấu hình", "`hub-settings.ts` + `/api/settings`", "Quản trị Lưu → cả phòng dùng chung."],
    ], [3.6, 5.8, 7.2], size=9)


def part11(w):
    w.h1("11. Ngân hàng câu hỏi vấn đáp (cả dự án)", new_page=True)
    items = [
        ("Dự án giải quyết vấn đề gì?",
         "Giúp giám thị biết máy nào cần tới kiểm tra khi có dấu hiệu bất thường kéo dài, trong phòng thi nhiều máy."),
        ("AI có thay giám thị không?",
         "Không. AI hỗ trợ quan sát và cảnh báo; giám thị quyết định đúng hay báo nhầm."),
        ("Có những trang nào? Ai dùng?",
         "Thí sinh /thi-sinh, giám thị /giam-thi, quản trị /quan-tri; hub chạy trên máy giám thị."),
        ("Cảnh báo đi đường nào?",
         "Máy thí sinh tạo sự kiện → gửi hub LAN → trang giám thị đọc snapshot mỗi giây."),
        ("Hai nút trên cảnh báo để làm gì?",
         "Xác nhận đúng = đáng chú ý thật; Báo nhầm = AI báo oan — để đếm và chỉnh ngưỡng."),
        ("Biên bản gồm gì?",
         "Các cảnh báo đã có kết luận: xác nhận đúng và báo nhầm. Không gồm chưa kiểm tra."),
        ("Vì sao cúi/ngẩng lâu hơn quay đầu?",
         "Viết nháp dễ bị oan nếu ngưỡng ngắn; quay sang bên đáng chú ý sớm hơn."),
        ("Clip tạo khi nào?",
         "Khi AI phát cảnh báo (nếu bật lưu hình), không phải lúc bấm nút kết luận."),
        ("Em sửa ngưỡng ở đâu để cả phòng dùng?",
         "Trang Quản trị → chỉnh → Lưu thay đổi (đẩy hub). Thí sinh đọc từ hub."),
        ("Nút xóa máy làm gì?",
         "Gỡ máy khỏi lưới khi offline/thử xong; không xóa cảnh báo đã lưu."),
        ("MediaPipe và BehaviorEngine khác nhau thế nào?",
         "MediaPipe nhìn ra số; BehaviorEngine đếm giây theo ngưỡng; hai tầng tách để dễ giải thích và mở rộng."),
        ("Chạy thiếu Internet được không?",
         "Được trên LAN nội bộ với hub. Firebase chỉ là kênh tùy chọn."),
        ("Có tiếng bíp cảnh báo không?",
         "Không. Nhóm đã gỡ âm thanh; giám thị nhìn màu máy và dải cảnh báo mới."),
        ("Mất Wi‑Fi tạm thời thì sao?",
         "Cảnh báo chữ xếp hộp thư đi, gửi lại khi có mạng; hub bỏ qua trùng mã."),
        ("Video có gửi liên tục lên máy chủ không?",
         "Không. Chỉ cảnh báo, số liệu trạng thái, và clip ngắn nếu nhà trường bật."),
        ("future-custom là gì?",
         "Ổ cắm trống có chủ đích trong vision-provider để sau gắn thuật toán nhìn khác, không viết lại cả hệ thống."),
        ("Hub tắt thì dữ liệu đâu?",
         "Mất vì lưu trong RAM — chủ đích. Phải xuất CSV/biên bản trước khi tắt."),
        ("Làm sao webcam chạy trên máy khác trong LAN?",
         "Dùng HTTPS (dev:https) hoặc EXE trên localhost; cert phải khớp IP hiện tại."),
        ("AI nhận diện được điện thoại không?",
         "Không. Face Landmarker phân tích khuôn mặt; điện thoại ngoài khung thì không thấy."),
        ("Em tự tin nói giới hạn gì?",
         "Có báo nhầm/bỏ sót; phụ thuộc ánh sáng và tư thế; không thay giám thị; ngưỡng cần thử trước khi dùng thật."),
    ]
    for i, (q, a) in enumerate(items, 1):
        w.qa(i, q, a)


def part12(w):
    w.h1("12. Kịch bản demo vấn đáp cả dự án (8–12 phút)", new_page=True)
    w.steps([
        "Giới thiệu 1 phút: bài toán phòng thi + AI hỗ trợ, không kết luận gian lận.",
        "Chỉ sơ đồ tổng quan + dây chuyền AI (hình trong tài liệu).",
        "Demo thí sinh: kết nối hub → bắt đầu → tạo/đợi một cảnh báo (thấy thanh tiến trình).",
        "Demo giám thị: lưới màu → mở chi tiết → Báo nhầm hoặc Xác nhận đúng → thẻ số đổi.",
        "Nếu kịp: bật lưu đoạn hình ở Quản trị → Lưu → phiên mới → Play clip; xuất biên bản có cả đúng và báo nhầm.",
        "Quản trị: chỉ ô cúi/ngẩng hoặc nhiều mặt → Lưu → nói thí sinh nhận ngưỡng mới.",
        "Chốt giới hạn AI + quyền riêng tư + (nếu hỏi) future-custom / xóa máy / HTTPS / không tiếng bíp.",
    ])
    w.callout("tay", [
        "Trước giờ thi vấn đáp: cả nhóm chạy thử **một lần** trên máy thật (hub + ít nhất một máy thí sinh).",
        "Chuẩn bị sẵn ảnh/video ngắn buổi thử nếu giám khảo hỏi bằng chứng cải tiến.",
    ])


def part13(w):
    w.h1("13. Checklist trước giờ vấn đáp", new_page=True)
    w.bullets([
        "☐ Nói được dự án là gì trong 30 giây.",
        "☐ Phân biệt được thí sinh / giám thị / quản trị / hub.",
        "☐ Nói được dây chuyền: nhìn → đếm giây → cảnh báo → người kết luận.",
        "☐ Demo được ít nhất: kết nối + một cảnh báo + một nút kết luận.",
        "☐ Thuộc mặc định cúi/ngẩng 6s, quay đầu 3s; biết phải Lưu ở Quản trị.",
        "☐ Biết biên bản gồm đúng + báo nhầm; clip gắn lúc cảnh báo.",
        "☐ Không nói “có tiếng bíp”; không nói “AI kết luận gian lận”.",
        "☐ Biết dữ liệu hub trong RAM; xuất báo cáo trước khi tắt.",
        "☐ Đọc thêm file tài liệu phần cải tiến nếu giám khảo hỏi sâu cải tiến.",
    ])
    w.callout("nho", [
        "Ba câu chốt cả dự án:",
        "1) AI hỗ trợ giám sát phòng thi nhiều máy — gọi giám thị tới đúng chỗ.",
        "2) Hai tầng nhìn / đếm giây + giám thị quyết định (đúng / báo nhầm).",
        "3) Đã cải tiến theo góp ý: báo nhầm, ngưỡng, đoạn hình, biên bản, vận hành LAN.",
    ])


def build():
    w = Doc()
    cover(w)
    part0(w)
    part1(w)
    part2(w)
    part3(w)
    part4(w)
    part5(w)
    part6(w)
    part7(w)
    part8(w)
    part9(w)
    part10(w)
    part11(w)
    part12(w)
    part13(w)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    w.doc.save(str(OUTPUT))
    print(OUTPUT)


if __name__ == "__main__":
    build()
