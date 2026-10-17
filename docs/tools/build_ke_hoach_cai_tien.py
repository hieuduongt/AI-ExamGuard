"""
Đây là gì: script tạo file Word "Kế hoạch cải tiến AI ExamGuard theo góp ý ban giám khảo".
Mục tiêu: người hướng dẫn có một tài liệu dễ đọc để trình bày kế hoạch, phân công và các mẫu
  biểu cho ba bạn Minh, Ngân, Linh trước hạn nộp thứ Bảy.
Chức năng: vẽ sơ đồ lịch làm việc, rồi dựng file Word gồm góp ý của giám khảo, ưu tiên, phân
  công, lịch, mẫu kịch bản thử nghiệm, mẫu bảng kết quả, phiếu hỏi ý kiến, danh sách nộp bài.
Đầu ra: docs/tai-lieu-du-thi/AI_ExamGuard_Ke_hoach_cai_tien_nop_thu_7.docx
Dùng ở đâu: chạy tay: python3 docs/tools/build_ke_hoach_cai_tien.py
Liên kết với: build_tai_lieu_hoc_sinh.py (bộ định dạng Word), so_do_tai_lieu_hoc_sinh.py (bộ vẽ).
"""
from pathlib import Path

from docx.enum.text import WD_ALIGN_PARAGRAPH

from build_tai_lieu_hoc_sinh import MUTED, NAVY, BLUE, TEXT, Writer, font_run
from so_do_tai_lieu_hoc_sinh import (AMBER, AMBER_BG, BLUE as D_BLUE, BLUE_BG, GRAY, GRAY_BG, GREEN, GREEN_BG,
                                     RED, RED_BG, Diagram)

OUTPUT = Path(__file__).resolve().parents[1] / "tai-lieu-du-thi" / "AI_ExamGuard_Ke_hoach_cai_tien_nop_thu_7.docx"


class PlanWriter(Writer):
    def _header_footer(self, section):
        header = section.header.paragraphs[0]
        header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        font_run(header.add_run("AI ExamGuard · Kế hoạch cải tiến trước hạn nộp thứ Bảy"), 9, MUTED, italic=True)
        footer = section.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        font_run(footer.add_run("Trang "), 9, MUTED)
        self._field(footer, "PAGE", 9)

    def h1(self, text, new_page=False):
        if new_page:
            self.doc.add_page_break()
        self.doc.add_heading(text, level=1)


def draw_lich():
    d = Diagram(1000, 540)
    d.title("Lịch làm việc của nhóm và ai phải chờ ai")
    columns = ["Tối thứ Năm", "Thứ Sáu · khối 1", "Thứ Sáu · khối 2", "Tối thứ Sáu", "Sáng thứ Bảy"]
    xs = [130 + i * 173 for i in range(5)]
    for x, name in zip(xs, columns):
        d.text(x + 82, 52, name, 13, NAVY_HEX, True, anchor="ma")
    lanes = [
        ("Minh", 80, BLUE_BG, D_BLUE, ["Đọc nhiệm vụ", "Ôn Báo nhầm + Quản trị", "Hỗ trợ ghi số liệu",
                                       "Áp dụng ngưỡng / sửa theo thầy cô", "Chuỗi ảnh (nếu kịp)"]),
        ("Ngân", 240, AMBER_BG, AMBER, ["Viết kịch bản", "Thử trực tiếp lần 1 + quay quá trình", "Điền bảng, đề xuất ngưỡng",
                                        "Thử lần 2 + quay quá trình", "Bảng trước / sau"]),
        ("Linh", 360, GREEN_BG, GREEN, ["Soạn phiếu, hẹn thầy cô", "Đóng vai / phụ quay", "Buổi thử thật với thầy cô",
                                        "Tổng hợp ý kiến", "Hồ sơ + ghép video quá trình"]),
    ]
    for name, y, fill, outline, cells in lanes:
        d.text(20, y + 35, name, 18, outline, True)
        for x, text in zip(xs, cells):
            d.box(x, y, 165, 88, None, text, fill, outline, size=13)
    d.arrow([(xs[1] + 82, 168), (xs[2] + 50, 238)], RED, width=2, dashed=True)
    d.label(xs[1] + 82, 203, "cùng buổi thử", 11, RED, True)
    d.arrow([(xs[2] + 130, 238), (xs[3] + 35, 170)], RED, width=2, dashed=True)
    d.label(xs[2] + 165, 203, "số liệu", 11, RED, True)
    d.arrow([(xs[3] + 120, 168), (xs[3] + 120, 238)], RED, width=2, dashed=True)
    d.label(xs[3] + 120, 203, "ngưỡng mới", 11, RED, True)
    d.box(130, 465, 857, 56, None,
          "Trước hạn nộp 3 tiếng: ĐÓNG BĂNG CODE → chạy kiểm thử → build EXE → thử lại toàn bộ → ghép hồ sơ → NỘP",
          RED_BG, RED, size=14)
    return d.save("ke-hoach-lich")


NAVY_HEX = "#0B2545"


def intro(w):
    doc = w.doc
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("KẾ HOẠCH CẢI TIẾN AI EXAMGUARD"), 24, NAVY, True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Theo góp ý của ban giám khảo · Hạn nộp: thứ Bảy 17/10/2026"), 13, BLUE)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Nhóm: Minh · Ngân · Linh"), 12, MUTED, italic=True)
    w.callout("nho", [
        "**Mục tiêu của chúng ta:** giám khảo mở hồ sơ ra là thấy ngay **cả 4 góp ý đều đã được tiếp thu**, và **góp ý nào cũng có bằng chứng**: ảnh, số liệu, ý kiến thầy cô.",
        "Ta còn khoảng **một ngày rưỡi**. Vì vậy làm **đủ và chắc** từng góp ý, không làm thật sâu một góp ý rồi bỏ các góp ý khác.",
    ], "MỤC TIÊU TRONG MỘT CÂU")


def section_feedback(w):
    w.h1("1. Ban giám khảo đã nói gì?")
    w.h2("Điểm mạnh: những gì cần giữ")
    w.bullets([
        "Sản phẩm giải quyết **đúng khó khăn thật** của thầy cô coi thi, và nhóm đặt giới hạn đúng: **AI chỉ nhắc, con người quyết định**.",
        "AI **chạy thật** trên máy: liếc nhanh không báo; không thấy mặt, hai khuôn mặt, quay đầu lâu thì giám thị nhận cảnh báo đủ phòng, máy, số báo danh, thời điểm.",
        "Nhóm **chú ý quyền riêng tư**: hỏi đồng ý trước, không nhận diện danh tính, xử lý ngay trên máy.",
        "Nhóm **đã thử cả trường hợp AI không được báo**, có cách xử lý nhiễu ngắn và camera đứng hình.",
    ])
    w.h2("Bốn yêu cầu cải tiến, nói dễ hiểu")
    w.table(["#", "Giám khảo muốn", "Nói gọn lại"], [
        ["1", "Thêm nút **“Báo nhầm”**, đếm số lần báo nhầm để chỉnh lại thời gian chờ.",
         "Báo nhầm nguy hiểm vì thí sinh bị **nghi oan, mất tập trung**. Phải đo được nó thì mới giảm được nó."],
        ["2", "**Thử có hệ thống**: khoảng 15 phút theo kịch bản (việc bình thường + việc cần báo), đếm **đúng / báo nhầm / bỏ sót**; mỗi lần chỉnh ngưỡng thì **thử lại đúng kịch bản**; thử cả thiếu sáng, đeo kính, ngồi lệch; **quay lại quá trình** kiểm thử và chỉnh ngưỡng.",
         "Thay vì nói “AI chạy tốt”, ta phải **thử trực tiếp**, có **bảng số liệu**, và cho thấy chỉnh ngưỡng xong thì số liệu **tốt lên**."],
        ["3", "Lưu **đoạn hình ngắn** vài giây quanh lúc xảy ra; có **bản tổng kết** cuối buổi chỉ ghi những lần **giám thị đã xác nhận**.",
         "Giám thị tới nơi thì chuyện đã xong, nên cần xem lại được. Biên bản chỉ ghi những gì con người đã kiểm tra."],
        ["4", "Thử **một buổi thật** với nhóm bạn và một thầy cô làm giám thị, hỏi ý kiến để cải tiến màn hình giám thị.",
         "Nghe **người dùng thật** nói, rồi sửa theo họ."],
    ], [0.8, 8.2, 7.6])


def section_priority(w):
    w.h1("2. Ta sẽ làm gì, làm tới đâu?", new_page=True)
    w.table(["Góp ý", "Ta làm gì trước thứ Bảy", "Bằng chứng nộp kèm", "Mức độ"], [
        ["1. Nút Báo nhầm",
         "Thêm hai nút **“Xác nhận đúng”** và **“Báo nhầm”**. Màn hình giám thị đếm số lần báo nhầm **theo từng loại**. File CSV có thêm cột kết luận.",
         "Ảnh chụp màn hình, kiểm thử tự động chạy qua", "**Bắt buộc**"],
        ["2. Thử có hệ thống",
         "Viết kịch bản. **Thử trực tiếp** (webcam + đóng vai) lần 1 → đếm đúng / báo nhầm / bỏ sót. Chỉnh ngưỡng → **thử lại đúng kịch bản**. Thử thiếu sáng / kính / lệch camera. **Quay màn hình / góc phòng** lúc đang thử và lúc chỉnh ngưỡng.",
         "Kịch bản, **video quay quá trình**, **bảng kết quả trước / sau**", "**Bắt buộc, quan trọng nhất**"],
        ["3a. Tổng kết đã xác nhận",
         "Nút xuất **biên bản** gồm các cảnh báo đã kết luận: “Xác nhận đúng” **và** “Báo nhầm”.",
         "File biên bản mẫu", "**Bắt buộc**"],
        ["3b. Đoạn hình ngắn",
         "**Clip video ngắn** (~3 giây trước + ~2 giây trong lúc xảy ra), **mặc định tắt**. Giám thị Play xem lại trong chi tiết cảnh báo.",
         "Ảnh chụp trình phát đoạn hình trên trang giám thị", "**Bắt buộc**"],
        ["4. Buổi thử thật",
         "Một buổi 30–45 phút: 2–3 bạn làm bài, một thầy cô làm giám thị, kèm phiếu hỏi ý kiến. Sửa ngay 1–2 ý dễ sửa.",
         "Ảnh buổi thử, phiếu đã điền, danh sách đã sửa", "**Bắt buộc**"],
    ], [2.8, 7.0, 4.2, 2.6], size=10)
    w.h2("Vì sao làm theo thứ tự này?")
    w.bullets([
        "**Bảng số liệu trước và sau** + **video quay quá trình thử/chỉnh** là bằng chứng thuyết phục nhất. Nó trả lời góp ý 2, đồng thời chứng minh nút Báo nhầm có ích.",
        "**Không hiểu nhầm:** giám khảo **không** yêu cầu “quay file rồi đưa AI nhận diện”. Yêu cầu là **kiểm thử trực tiếp + quay lại quá trình**.",
        "Ta đã có sẵn **một cải tiến rất hợp lý để chỉnh**: tách riêng ngưỡng cúi/ngẩng (ví dụ 6 giây) gần như chắc chắn **giảm báo nhầm**, và ta sẽ có số liệu để chứng minh.",
    ])
    w.callout("canh", [
        "**Về đoạn hình, cẩn thận với quyền riêng tư.** Trước đây ta nói “không lưu ảnh, video”. Nếu làm thì phải giữ đúng tinh thần đó:",
        "• **Mặc định tắt**, chỉ bật khi nhà trường chọn. Thí sinh được **báo trước** khi bật camera.",
        "• Chỉ **đoạn hình ngắn** (~5 giây, độ phân giải thấp), chỉ gửi kèm khi có cảnh báo.",
        "• Chỉ nằm trong **bộ nhớ máy giám thị**, tắt phần mềm là mất.",
        "Viết rõ như vậy trong hồ sơ thì góp ý này thành **điểm cộng**.",
    ])


def section_flow(w, fig):
    w.h1("3. Lịch làm việc", new_page=True)
    w.figure(fig, "Ba làn việc chạy song song. Mũi tên đỏ: chỗ phải chờ người khác xong mới làm được.")
    w.table(["Thời điểm", "Minh", "Ngân", "Linh"], [
        ["**Tối thứ Năm 15/10** (30 phút)", "Đọc nhiệm vụ, xem trang Quản trị / Giám thị", "Viết kịch bản buổi thử A (mẫu ở mục 5)", "Soạn phiếu hỏi ý kiến (mẫu ở mục 6), hẹn thầy cô"],
        ["**Thứ Sáu 16/10 · khối 1**", "Ôn nút Báo nhầm, biên bản, ô cúi/ngẩng", "**Buổi thử trực tiếp lần 1** + quay màn hình quá trình", "Đóng vai thí sinh / phụ quay"],
        ["**Thứ Sáu 16/10 · khối 2**", "Hỗ trợ chỉnh ngưỡng theo số liệu", "Điền bảng lần 1; đề xuất chỉnh ngưỡng", "**Buổi thử thật** với thầy cô"],
        ["**Tối thứ Sáu** · họp 30 phút", "Cả nhóm xem bảng kết quả + ý kiến thầy cô, **chọn 1–2 thay đổi**. Người hướng dẫn **build thử EXE**.", "", ""],
        ["**Tối thứ Sáu** · sau họp", "Áp dụng ngưỡng mới / sửa theo thầy cô", "**Buổi thử lần 2** đúng kịch bản + quay quá trình chỉnh/thử lại", "Tổng hợp ý kiến, bắt đầu viết hồ sơ"],
        ["**Sáng thứ Bảy 17/10**", "Kiểm tra đoạn hình ngắn + biên bản trên EXE", "Bảng so sánh trước / sau, viết kết luận; phiên thiếu sáng/kính/lệch", "Hồ sơ, ghép video quay quá trình, ảnh chụp màn hình"],
        ["**Trước hạn nộp 3 tiếng**", "**Đóng băng code.** Người hướng dẫn chạy kiểm thử, build EXE, thử lại toàn bộ.", "", "Ghép hồ sơ cuối cùng, **nộp**"],
    ], [3.4, 4.6, 4.3, 4.3], size=10)
    w.callout("nho", "Nếu thứ Sáu các em đi học thì dồn **khối 1 và khối 2 vào buổi chiều tối**. "
              "Ngân có thể viết kịch bản và chuẩn bị bảng trống trước, không cần chờ code mới.")


def section_minh(w):
    w.h1("4. Phân công chi tiết", new_page=True)
    w.h2("4.1. Minh: phần code chính")
    w.p("**Vai trò (cập nhật):** code cải tiến đã được triển khai sẵn. Minh **đọc hiểu, demo và trình bày** toàn bộ cải tiến kỹ thuật. "
        "Ngân hỗ trợ hiểu thuật toán ngưỡng; Linh hỗ trợ phần giao diện giám thị và quyền riêng tư. "
        "Người hướng dẫn chỉ gỡ khi các em bị kẹt quá 30 phút.")
    w.h3("Việc 1 (đã có sẵn — chỉ cần hiểu): Nút “Xác nhận đúng” / “Báo nhầm”")
    w.table(["Sửa ở đâu", "Sửa gì"], [
        ["`web/src/domain/exam-types.ts`", "Thêm vào cảnh báo trường kết luận, ví dụ `verdict?: 'confirmed' | 'false_alarm'`."],
        ["`shared/hub-contract.json`", "Ghi thêm danh sách giá trị kết luận hợp lệ."],
        ["`desktop-hub/examguard_desktop/http_handler.py`, `exam_store.py`", "Lệnh PATCH nhận thêm kết luận, chỉ chấp nhận hai giá trị hợp lệ, lưu vào cảnh báo."],
        ["`web/src/services/exam-sync.ts` (và `local-store.ts`, `firestore-sync.ts`)", "Hàm đánh dấu đã xem gửi kèm kết luận."],
        ["`web/src/features/proctor/components/event-detail-drawer.tsx`", "Hai nút “Xác nhận đúng” và “Báo nhầm”."],
        ["`web/src/features/proctor/components/stat-cards.tsx`", "Thẻ thống kê **số lần báo nhầm theo từng loại** cảnh báo."],
        ["`web/src/features/proctor/csv-export.ts`", "Thêm cột “Kết luận”; nút **xuất biên bản** gồm cảnh báo đã “Xác nhận đúng” hoặc “Báo nhầm”."],
        ["Kiểm thử", "`desktop-hub/tests/test_hub_api.py`, `test_contract.py`, `web/tests/unit/contract.test.cjs`, `proctor.test.cjs`."],
    ], [7.0, 9.6], size=10)
    w.p("**Xong khi:** bấm “Báo nhầm” thì số đếm tăng, CSV có cột kết luận, biên bản có cả đúng và báo nhầm (đã kết luận).")
    w.h3("Việc 2 (đã có sẵn — chỉ cần hiểu): Tách ngưỡng cúi/ngẩng")
    w.bullets([
        "`headPoseSeconds` mặc định **6 giây**; quay đầu vẫn **3 giây**.",
        "Trang Quản trị có ô riêng “Cúi/ngẩng đầu” — Ngân dùng ô này khi chỉnh theo số liệu buổi thử.",
    ])
    w.h3("Việc 3: Hỗ trợ Ngân khi kiểm thử trực tiếp")
    w.bullets([
        "Mở trang Giám thị, ghi nhận cảnh báo, hướng dẫn bấm **Báo nhầm** đúng lúc.",
        "Chụp ảnh trang Quản trị trước/sau khi đổi ngưỡng.",
        "Nhắc nhóm: **quay màn hình** lúc thử và lúc chỉnh — đây mới là video bằng chứng.",
    ])
    w.callout("nho", "Trong code vẫn có `?thu-nghiem=1` (chọn file video thay webcam) như **công cụ phụ**. "
              "**Không trình bày** đó là cách trả lời góp ý giám khảo. Cách chính: thử webcam trực tiếp + quay quá trình.")


def section_ngan(w):
    w.h2("4.2. Ngân: thử nghiệm có hệ thống")
    w.p("**Vai trò:** người làm ra **bằng chứng số liệu**, phần giám khảo coi trọng nhất.")
    w.callout("canh", [
        "**Hiểu đúng góp ý:** không quay sẵn file rồi “đưa cho AI nhận diện”.",
        "Làm: **đóng vai thử trực tiếp** theo kịch bản → đếm → chỉnh ngưỡng → **thử lại** → **quay lại cả quá trình đó**.",
    ])
    w.steps([
        "Viết **kịch bản có mốc thời gian** cho buổi thử A (mẫu ở mục 5.1). Kịch bản chính là **đáp án đúng** để đối chiếu.",
        "Chuẩn bị điều kiện thử (camera đặt như lúc thi thật):\n"
        "   • **Buổi A**: khoảng 15 phút, ánh sáng bình thường, kịch bản đầy đủ.\n"
        "   • **Buổi B**: khoảng 5 phút, **thiếu sáng**.\n"
        "   • **Buổi C**: khoảng 5 phút, **đeo kính và ngồi lệch camera**.",
        "**Thử lần 1 (trực tiếp):** một bạn đóng vai trước webcam; một bạn ngồi trang Giám thị. "
        "Bật quay màn hình (và/hoặc góc phòng). Xuất CSV, đối chiếu kịch bản theo mục 5.2.",
        "Điền **bảng kết quả** (mẫu ở mục 5.3).",
        "Chỉnh ngưỡng (ví dụ tăng cúi/ngẩng) → **thử lần 2 đúng kịch bản** → quay tiếp đoạn chỉnh + thử lại → bảng so sánh trước/sau + 3–4 câu kết luận.",
    ])
    w.p("**Xong khi:** có bảng lần 1, lần 2, kết luận, và **file video quay quá trình** gắn được với từng lần thử / bộ ngưỡng.")


def section_linh(w):
    w.h2("4.3. Linh: thử thật, ý kiến người dùng, hồ sơ")
    w.p("**Vai trò:** người mang **tiếng nói người dùng thật** vào sản phẩm, và người **kể lại câu chuyện cải tiến** trong hồ sơ.")
    w.steps([
        "Đóng vai thí sinh trong các video của Ngân.",
        "Tổ chức **buổi thử thật**: 2–3 bạn làm bài, một thầy cô làm giám thị, 30–45 phút. Chụp ảnh buổi thử (được sự đồng ý của mọi người).",
        "Phát **phiếu hỏi ý kiến** (mẫu ở mục 6) cho thầy cô và các bạn thí sinh.",
        "Tổng hợp ý kiến, chọn **1–2 ý dễ sửa** (thường là chữ, vị trí nút trên màn hình giám thị) để Minh sửa luôn.",
        "Viết phần **“Tiếp thu góp ý của ban giám khảo”** trong hồ sơ (mẫu ở mục 7). Quay lại **video trình diễn mới**.",
    ])
    w.p("**Xong khi:** có ảnh buổi thử, phiếu đã điền, danh sách ý kiến kèm “đã sửa / chưa sửa”, và phần hồ sơ hoàn chỉnh.")


def section_mentor(w):
    w.h2("4.4. Người hướng dẫn")
    w.bullets([
        "Tối nay: tạo nhánh Git cho đợt cải tiến, giao việc, gửi tài liệu này cho các em.",
        "**Duyệt code** của Minh trước khi gộp. Chỉ gỡ khi em bị kẹt quá **30 phút**, **không làm thay**.",
        "**Build thử EXE ngay tối thứ Sáu**, để lỗi đóng gói lộ ra sớm, đừng để tới sáng thứ Bảy.",
        "Chủ trì buổi họp tối thứ Sáu và quyết định **thời điểm đóng băng code**.",
    ])
    w.callout("nho", "Vì sao người hướng dẫn **không làm hết**? Khi vấn đáp, giám khảo sẽ hỏi từng em “**em đã làm gì?**”. "
              "Em nào tự làm thì trả lời được thật, chi tiết và tự tin. Đó mới là điểm cao.")


def section_templates(w):
    w.h1("5. Mẫu cho Ngân: kịch bản và bảng kết quả", new_page=True)
    w.h2("5.1. Kịch bản buổi thử A (khoảng 15 phút)")
    w.p("Đây là **kịch bản đóng vai khi thử trực tiếp** (không phải kịch bản để quay sẵn rồi đưa AI đọc). "
        "Các tình huống cách nhau **ít nhất 1 phút**, để không bị dính “thời gian nghỉ” 12 giây giữa hai cảnh báo cùng loại.")
    w.table(["Mốc", "Thí sinh làm gì", "Kéo dài", "Phần mềm nên", "Loại cảnh báo"], [
        ["00:00", "Làm bài bình thường", "90 giây", "Không báo", "—"],
        ["01:30", "Cúi viết nháp", "8 giây", "**Không báo**", "(dễ báo nhầm cúi/ngẩng)"],
        ["02:30", "Nhìn xuống bàn phím", "5 giây", "**Không báo**", "—"],
        ["03:30", "Uống nước", "4 giây", "**Không báo**", "—"],
        ["04:30", "Quay hẳn sang trái", "6 giây", "**Báo**", "Quay đầu"],
        ["05:30", "Ngẩng lên suy nghĩ", "5 giây", "**Không báo**", "(dễ báo nhầm cúi/ngẩng)"],
        ["06:30", "Cúi nhặt bút", "4 giây", "**Không báo**", "(dễ báo nhầm)"],
        ["07:30", "Rời khỏi chỗ", "10 giây", "**Báo**", "Không có mặt"],
        ["09:00", "Một người đứng sau lưng", "5 giây", "**Báo**", "Nhiều khuôn mặt"],
        ["10:00", "Liếc sang phải 3 lần, mỗi lần 2 giây", "~15 giây", "**Không báo**", "(liếc ngắn)"],
        ["11:00", "Nhìn ra ngoài màn hình", "8 giây", "**Báo**", "Mắt lệch"],
        ["12:00", "Quay hẳn sang phải", "6 giây", "**Báo**", "Quay đầu"],
        ["13:00", "Cúi viết nháp lâu", "10 giây", "**Không báo**", "(dễ báo nhầm cúi/ngẩng)"],
        ["14:00", "Làm bài bình thường đến hết", "60 giây", "Không báo", "—"],
    ], [1.5, 5.4, 2.0, 2.6, 5.1], size=10)
    w.p("Buổi B và C dùng **một phần** kịch bản trên (ví dụ các mốc 01:30 tới 09:00), để so sánh được với buổi A.")
    w.h2("5.2. Quy tắc đếm")
    w.bullets([
        "**Giờ trong buổi thử** ≈ giờ cảnh báo (CSV) − giờ bấm bắt đầu giám sát (ghi tay hoặc từ video quay màn hình).",
        "**Đúng**: tình huống “Báo” có cảnh báo **đúng loại** trong khoảng từ lúc bắt đầu tới **5 giây sau khi kết thúc** tình huống.",
        "**Báo nhầm**: cảnh báo xuất hiện lúc thí sinh đang làm việc “Không báo”. Ghi rõ **việc gì gây ra** (ví dụ “cúi viết nháp”). Giám thị nên bấm nút **Báo nhầm**.",
        "**Bỏ sót**: tình huống “Báo” mà không có cảnh báo đúng loại.",
        "Mỗi lần thử phải ghi: **buổi nào (A/B/C)**, **bộ ngưỡng nào** (ảnh Quản trị), **ngày giờ**, **file CSV**, **file video quay quá trình**.",
    ])
    w.h2("5.3. Bảng kết quả (mỗi lần thử, mỗi buổi một bảng)")
    w.table(["Loại hành vi", "Số tình huống cần báo", "Đúng", "Bỏ sót", "Báo nhầm", "Báo nhầm do việc gì"], [
        ["Không có mặt", "", "", "", "", ""],
        ["Nhiều khuôn mặt", "", "", "", "", ""],
        ["Quay đầu", "", "", "", "", ""],
        ["Cúi / ngẩng", "", "", "", "", ""],
        ["Mắt lệch", "", "", "", "", ""],
        ["**Tổng**", "", "", "", "", ""],
    ], [3.2, 2.8, 1.6, 1.6, 1.8, 5.6], size=10)
    w.p("Hai con số tổng kết dễ hiểu:")
    w.bullets([
        "**Tỉ lệ báo nhầm** = số báo nhầm ÷ tổng số cảnh báo phần mềm đưa ra.",
        "**Tỉ lệ bỏ sót** = số bỏ sót ÷ tổng số tình huống cần báo.",
    ])
    w.h2("5.4. Bảng so sánh trước và sau khi chỉnh ngưỡng")
    w.table(["Buổi", "Điều kiện", "Báo nhầm (lần 1)", "Báo nhầm (lần 2)", "Bỏ sót (lần 1)", "Bỏ sót (lần 2)"], [
        ["A", "Bình thường", "", "", "", ""],
        ["B", "Thiếu sáng", "", "", "", ""],
        ["C", "Đeo kính, ngồi lệch", "", "", "", ""],
    ], [1.4, 3.6, 2.9, 2.9, 2.9, 2.9], size=10)
    w.callout("canh", "**Không được sửa số cho đẹp.** Nếu chỉnh ngưỡng xong mà báo nhầm giảm nhưng **bỏ sót tăng** thì ghi đúng như vậy và giải thích. "
              "Giám khảo đánh giá cao việc hiểu được sự đánh đổi này hơn là một bảng số “hoàn hảo”.")


def section_survey(w):
    w.h1("6. Mẫu cho Linh: phiếu hỏi ý kiến", new_page=True)
    w.h2("6.1. Phiếu cho thầy cô giám thị")
    w.p("Chấm từ **1** (rất không đồng ý) đến **5** (rất đồng ý):")
    w.table(["#", "Câu hỏi", "Điểm 1–5"], [
        ["1", "Khi có cảnh báo, tôi nhận ra **ngay** máy nào cần chú ý.", ""],
        ["2", "Nội dung cảnh báo **dễ hiểu**, biết ngay chuyện gì xảy ra.", ""],
        ["3", "Số lượng cảnh báo **vừa phải**, không gây phiền.", ""],
        ["4", "Nút “Xác nhận đúng” / “Báo nhầm” **dễ dùng**.", ""],
        ["5", "Tôi **muốn dùng** phần mềm này trong buổi coi thi thật.", ""],
    ], [0.8, 12.8, 3.0])
    w.p("Câu hỏi mở:")
    w.bullets([
        "Thầy cô muốn **thêm** gì trên màn hình giám thị?",
        "Điều gì làm thầy cô **khó chịu** hoặc **khó hiểu** nhất?",
    ])
    w.h2("6.2. Phiếu cho các bạn thí sinh")
    w.table(["#", "Câu hỏi", "Điểm 1–5"], [
        ["1", "Tôi hiểu rõ thông báo giám sát trước khi bật camera.", ""],
        ["2", "Phần mềm **không làm tôi mất tập trung** khi làm bài.", ""],
        ["3", "Tôi cảm thấy **yên tâm về quyền riêng tư**.", ""],
    ], [0.8, 12.8, 3.0])
    w.p("Câu hỏi mở: có lúc nào bạn bị báo mà thấy **không hợp lý** không? Lúc đó bạn đang làm gì?")


def section_dossier(w):
    w.h1("7. Mẫu phần “Tiếp thu góp ý” trong hồ sơ")
    w.p("Linh điền bảng này. Đây là **trang giám khảo đọc đầu tiên**, nên phải rõ ràng và có bằng chứng.")
    w.table(["Góp ý của ban giám khảo", "Nhóm đã làm", "Kết quả, bằng chứng", "Việc còn lại"], [
        ["Nút Báo nhầm, đếm báo nhầm", "", "Ảnh chụp màn hình, số lần báo nhầm theo loại", ""],
        ["Thử nghiệm có hệ thống", "", "Bảng trước / sau, link video, kịch bản", ""],
        ["Đoạn hình và biên bản đã xác nhận", "", "Biên bản mẫu, ảnh chuỗi hình", ""],
        ["Buổi thử thật với thầy cô", "", "Ảnh, điểm trung bình phiếu, ý kiến đã sửa", ""],
    ], [4.2, 4.2, 4.6, 3.6], size=10)


def section_rules(w):
    w.h1("8. Quy tắc chung và danh sách nộp bài", new_page=True)
    w.h2("8.1. Quy tắc chung")
    w.bullets([
        "**Mỗi việc chỉ tính là xong khi có bằng chứng**: ảnh, bảng số liệu hoặc kiểm thử chạy qua.",
        "**Trung thực tuyệt đối với số liệu.** Giám khảo đã khen nhóm vì biết rõ giới hạn của sản phẩm, hãy giữ điểm mạnh đó.",
        "Bị kẹt quá **30 phút** thì hỏi ngay, đừng ngồi một mình.",
        "Mỗi tối **báo cáo nhanh 3 dòng**: đã xong gì, đang làm gì, đang kẹt gì.",
        "Mỗi em phải **tự trình bày được** phần mình làm, vì giám khảo sẽ hỏi.",
    ])
    w.h2("8.2. Rủi ro và cách phòng")
    w.table(["Rủi ro", "Cách phòng"], [
        ["Hiểu nhầm “quay video đưa AI nhận diện”", "Nhắc lại: **thử trực tiếp + quay quá trình thử/chỉnh**. `?thu-nghiem=1` chỉ là công cụ phụ."],
        ["Buổi thử lần 2 không giống lần 1", "Giữ **cùng danh sách mốc kịch bản**; một người đọc mốc to; không cần giống từng mili giây."],
        ["Build EXE lỗi vào phút chót", "Build thử **tối thứ Sáu**. Sáng thứ Bảy chỉ build lại."],
        ["Không hẹn được thầy cô", "Linh hẹn ngay **tối nay**. Phương án dự phòng: một thầy cô khác hoặc phụ huynh làm giám thị, ghi rõ trong hồ sơ."],
        ["Clip đoạn hình quá lớn / hub từ chối", "Giữ độ phân giải 320px và bitrate thấp; hub cho phép ~1,5 MB. Thử lại trên Chrome/Edge."],
    ], [5.6, 11.0])
    w.h2("8.3. Danh sách nộp bài")
    w.bullets([
        "☐ File EXE mới đã build và thử lại toàn bộ luồng.",
        "☐ Hồ sơ có phần **“Tiếp thu góp ý của ban giám khảo”**.",
        "☐ Kịch bản thử nghiệm, bảng kết quả lần 1, lần 2, bảng so sánh.",
        "☐ **Video quay lại quá trình** kiểm thử trực tiếp và chỉnh ngưỡng (không phải “file để AI đọc”).",
        "☐ Ảnh chụp màn hình: nút Báo nhầm, thống kê báo nhầm, biên bản đã xác nhận, trang Quản trị trước/sau khi đổi ngưỡng.",
        "☐ Ảnh buổi thử thật và tổng hợp phiếu hỏi ý kiến.",
        "☐ Video trình diễn mới (nếu khác video quay quá trình).",
        "☐ Tên công cụ AI trong mọi tài liệu đã **thống nhất**.",
        "☐ Mỗi em đã tập trình bày phần của mình trong 1–2 phút.",
    ])
    w.callout("nho", "Ba câu để nhớ: **Làm đủ cả 4 góp ý. Góp ý nào cũng có bằng chứng. Ai làm phần nào thì tự trình bày phần đó.**")


def build():
    fig = draw_lich()
    w = PlanWriter()
    intro(w)
    section_feedback(w)
    section_priority(w)
    section_flow(w, fig)
    section_minh(w)
    section_ngan(w)
    section_linh(w)
    section_mentor(w)
    section_templates(w)
    section_survey(w)
    section_dossier(w)
    section_rules(w)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    w.doc.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    print(build())
