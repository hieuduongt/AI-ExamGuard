"""
Đây là gì: script tạo file Word "Tài liệu học tập AI ExamGuard" dành cho học sinh.
Mục tiêu: một tài liệu dễ đọc giúp học sinh hiểu bản chất dự án, cấu trúc code, cách hoạt động,
  đọc được các đoạn code quan trọng, tự sửa code nhỏ và chuẩn bị trả lời vấn đáp.
Chức năng: vẽ sơ đồ (so_do_tai_lieu_hoc_sinh.py), rồi dựng file Word gồm bìa, mục lục, 14 phần
  và phụ lục từ điển thuật ngữ.
Đầu ra: docs/tai-lieu-du-thi/AI_ExamGuard_Tai_lieu_hoc_tap_cho_hoc_sinh.docx
Dùng ở đâu: chạy tay: python3 docs/tools/build_tai_lieu_hoc_sinh.py (cần python-docx và Pillow,
  xem docs/tools/requirements.txt). Khi code thay đổi, sửa nội dung trong file này rồi chạy lại.
Liên kết với: so_do_tai_lieu_hoc_sinh.py (sơ đồ); các đoạn code trích từ web/src và
  desktop-hub/examguard_desktop.
"""
import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

from so_do_tai_lieu_hoc_sinh import draw_all

OUTPUT = Path(__file__).resolve().parents[1] / "tai-lieu-du-thi" / "AI_ExamGuard_Tai_lieu_hoc_tap_cho_hoc_sinh.docx"

FONT = "Calibri"
CODE_FONT = "Consolas"
NAVY = "0B2545"
BLUE = "2E74B5"
TEXT = "1F2937"
MUTED = "5C6B7A"
CODE_COLOR = "9A3412"

CALLOUTS = {
    "nho": ("GHI NHỚ", "E8F1FB", "2E74B5"),
    "hoi": ("GIÁM KHẢO HAY HỎI", "FFF4DB", "B7791F"),
    "tay": ("THỬ TAY", "E7F6EE", "16794A"),
    "canh": ("LƯU Ý", "FDECEA", "C0392B"),
    "vi": ("VÍ DỤ ĐỜI THƯỜNG", "F3E8FF", "7C3AED"),
}


# ---------------------------------------------------------------- định dạng chung

def font_run(run, size=None, color=None, bold=None, italic=None, name=FONT):
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    for key in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rpr.rFonts.set(qn(key), name)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = RGBColor.from_string(color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    return run


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def cell_borders(cell, color="D5DDE8", size=4, left=None):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        node = OxmlElement(f"w:{edge}")
        edge_color, edge_size = (left if edge == "left" and left else (color, size))
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), str(edge_size))
        node.set(qn("w:color"), edge_color)
        borders.append(node)
    tc_pr.append(borders)


def cell_margins(cell, top=90, side=140, bottom=90):
    tc_pr = cell._tc.get_or_add_tcPr()
    mar = OxmlElement("w:tcMar")
    for edge, value in (("top", top), ("left", side), ("bottom", bottom), ("right", side)):
        node = OxmlElement(f"w:{edge}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        mar.append(node)
    tc_pr.append(mar)


def keep_with_next(paragraph):
    paragraph.paragraph_format.keep_with_next = True


def rich(paragraph, text, size=None, color=TEXT, bold=False):
    """Viết chữ có **in đậm** và `mã code` vào một đoạn."""
    for part in re.split(r"(\*\*.+?\*\*|`.+?`)", text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            font_run(paragraph.add_run(part[2:-2]), size, color, True)
        elif part.startswith("`") and part.endswith("`"):
            font_run(paragraph.add_run(part[1:-1]), (size or 11.5) - 1, CODE_COLOR, bold, name=CODE_FONT)
        else:
            font_run(paragraph.add_run(part), size, color, bold)
    return paragraph


class Writer:
    def __init__(self):
        self.doc = Document()
        self.figure_no = 0
        self.code_no = 0
        self._setup()

    # ---- thiết lập trang và kiểu chữ
    def _setup(self):
        section = self.doc.sections[0]
        section.orientation = WD_ORIENT.PORTRAIT
        section.page_width, section.page_height = Cm(21), Cm(29.7)
        section.left_margin = section.right_margin = Cm(2.2)
        section.top_margin = section.bottom_margin = Cm(2)
        normal = self.doc.styles["Normal"]
        normal.font.name = FONT
        normal.font.size = Pt(12)
        normal.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
        normal.paragraph_format.space_after = Pt(6)
        normal.paragraph_format.line_spacing = 1.2
        for level, size, color in ((1, 20, NAVY), (2, 15, BLUE), (3, 13, NAVY)):
            style = self.doc.styles[f"Heading {level}"]
            style.font.name = FONT
            style.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
            style.element.rPr.rFonts.set(qn("w:ascii"), FONT)
            style.element.rPr.rFonts.set(qn("w:hAnsi"), FONT)
            style.font.size = Pt(size)
            style.font.bold = True
            style.font.color.rgb = RGBColor.from_string(color)
            style.paragraph_format.space_before = Pt(16 if level > 1 else 0)
            style.paragraph_format.space_after = Pt(8)
            style.paragraph_format.keep_with_next = True
        settings = self.doc.settings.element
        update = OxmlElement("w:updateFields")
        update.set(qn("w:val"), "true")
        settings.append(update)
        self._header_footer(section)

    def _header_footer(self, section):
        header = section.header.paragraphs[0]
        header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        font_run(header.add_run("AI ExamGuard · Tài liệu học tập cho học sinh"), 9, MUTED, italic=True)
        footer = section.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        font_run(footer.add_run("Trang "), 9, MUTED)
        self._field(footer, "PAGE", 9)

    def _field(self, paragraph, instruction, size):
        run = font_run(paragraph.add_run(), size, MUTED)
        begin = OxmlElement("w:fldChar")
        begin.set(qn("w:fldCharType"), "begin")
        instr = OxmlElement("w:instrText")
        instr.set(qn("xml:space"), "preserve")
        instr.text = instruction
        separate = OxmlElement("w:fldChar")
        separate.set(qn("w:fldCharType"), "separate")
        end = OxmlElement("w:fldChar")
        end.set(qn("w:fldCharType"), "end")
        run._r.append(begin)
        run._r.append(instr)
        run._r.append(separate)
        placeholder = font_run(paragraph.add_run("1" if instruction == "PAGE" else
                                                  "Mở file trong Word, bấm chuột phải vào đây và chọn “Update Field” để hiện mục lục."),
                               size, MUTED)
        placeholder._r.append(end)

    # ---- khối nội dung
    def h1(self, text):
        self.doc.add_page_break()
        self.doc.add_heading(text, level=1)

    def h2(self, text):
        self.doc.add_heading(text, level=2)

    def h3(self, text):
        self.doc.add_heading(text, level=3)

    def p(self, text, size=None, color=TEXT, align=None, italic=False):
        paragraph = self.doc.add_paragraph()
        rich(paragraph, text, size, color)
        if italic:
            for run in paragraph.runs:
                run.italic = True
        if align:
            paragraph.alignment = align
        return paragraph

    def bullets(self, items, style="List Bullet"):
        for item in items:
            paragraph = self.doc.add_paragraph(style=style)
            paragraph.paragraph_format.space_after = Pt(3)
            rich(paragraph, item)

    def steps(self, items):
        for index, item in enumerate(items, 1):
            paragraph = self.doc.add_paragraph()
            paragraph.paragraph_format.left_indent = Cm(0.9)
            paragraph.paragraph_format.first_line_indent = Cm(-0.9)
            paragraph.paragraph_format.space_after = Pt(4)
            font_run(paragraph.add_run(f"{index}.\t"), None, BLUE, True)
            rich(paragraph, item)

    def table(self, headers, rows, widths, header_fill="DCE8F5", size=10.5):
        table = self.doc.add_table(rows=1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        for index, header in enumerate(headers):
            cell = table.rows[0].cells[index]
            shade(cell, header_fill)
            cell_borders(cell)
            cell_margins(cell, 60, 100, 60)
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            font_run(paragraph.add_run(header), size, NAVY, True)
        tr_pr = table.rows[0]._tr.get_or_add_trPr()
        repeat = OxmlElement("w:tblHeader")
        repeat.set(qn("w:val"), "true")
        tr_pr.append(repeat)
        for row_index, row in enumerate(rows):
            cells = table.add_row().cells
            for index, value in enumerate(row):
                cell = cells[index]
                cell_borders(cell)
                cell_margins(cell, 60, 100, 60)
                if row_index % 2 == 1:
                    shade(cell, "F8FAFC")
                paragraph = cell.paragraphs[0]
                paragraph.paragraph_format.space_after = Pt(0)
                paragraph.paragraph_format.line_spacing = 1.1
                rich(paragraph, value, size)
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Cm(width)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(2)
        return table

    def callout(self, kind, text, title=None):
        label, fill, color = CALLOUTS[kind]
        table = self.doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.rows[0].cells[0]
        cell.width = Cm(16.6)
        shade(cell, fill)
        cell_borders(cell, fill, 4, left=(color, 24))
        cell_margins(cell, 100, 180, 100)
        head = cell.paragraphs[0]
        head.paragraph_format.space_after = Pt(2)
        font_run(head.add_run(title or label), 10.5, color, True)
        for line in text if isinstance(text, list) else [text]:
            paragraph = cell.add_paragraph()
            paragraph.paragraph_format.space_after = Pt(2)
            rich(paragraph, line, 11)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(2)

    def code(self, path, code, lang_note=None):
        self.code_no += 1
        caption = self.doc.add_paragraph()
        caption.paragraph_format.space_after = Pt(2)
        keep_with_next(caption)
        font_run(caption.add_run(f"Đoạn code {self.code_no} · "), 10, BLUE, True)
        font_run(caption.add_run(path), 10, MUTED, name=CODE_FONT)
        if lang_note:
            font_run(caption.add_run(f"  ({lang_note})"), 10, MUTED, italic=True)
        table = self.doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.rows[0].cells[0]
        cell.width = Cm(16.6)
        shade(cell, "F6F8FA")
        cell_borders(cell, "D0D7DE", 4)
        cell_margins(cell, 100, 160, 100)
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = 1.0
        lines = code.strip("\n").split("\n")
        for index, line in enumerate(lines):
            run = font_run(paragraph.add_run(line), 9, "24292F", name=CODE_FONT)
            if line.lstrip().startswith(("//", "#", "*", "/*")):
                run.font.color.rgb = RGBColor.from_string("6A737D")
                run.italic = True
            if index < len(lines) - 1:
                run.add_break(WD_BREAK.LINE)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(2)

    def explain(self, items):
        intro = self.p("**Đọc hiểu đoạn code trên:**", 11.5, NAVY)
        keep_with_next(intro)
        self.bullets(items)

    def figure(self, path, caption, width=16.2):
        self.figure_no += 1
        paragraph = self.doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        keep_with_next(paragraph)
        paragraph.add_run().add_picture(str(path), width=Cm(width))
        cap = self.doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        font_run(cap.add_run(f"Hình {self.figure_no}. "), 10, BLUE, True)
        font_run(cap.add_run(caption), 10, MUTED, italic=True)

    def qa(self, number, question, answer, tip=None):
        q = self.doc.add_paragraph()
        q.paragraph_format.space_before = Pt(8)
        q.paragraph_format.space_after = Pt(2)
        keep_with_next(q)
        font_run(q.add_run(f"Câu {number}. "), 12, BLUE, True)
        rich(q, question, 12, NAVY, True)
        a = self.doc.add_paragraph()
        a.paragraph_format.left_indent = Cm(0.6)
        a.paragraph_format.space_after = Pt(2)
        font_run(a.add_run("Trả lời: "), 11.5, "16794A", True)
        rich(a, answer, 11.5)
        if tip:
            t = self.doc.add_paragraph()
            t.paragraph_format.left_indent = Cm(0.6)
            font_run(t.add_run("Mẹo: "), 10.5, "B7791F", True)
            rich(t, tip, 10.5, MUTED)

    def save(self):
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        self.doc.save(OUTPUT)
        return OUTPUT


# ---------------------------------------------------------------- nội dung

def cover(w):
    doc = w.doc
    for _ in range(5):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("AI ExamGuard"), 40, NAVY, True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Trợ lý AI giúp giám thị trông thi trên máy tính"), 16, BLUE)
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("TÀI LIỆU HỌC TẬP DÀNH CHO HỌC SINH"), 18, TEXT, True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Hiểu dự án · Đọc được code · Tự sửa được code · Tự tin trả lời vấn đáp"), 12.5, MUTED, italic=True)
    for _ in range(3):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("“Một giám thị có thể nhìn nhiều thí sinh,\nnhưng không thể nhìn mọi vị trí trong mọi giây.”"), 13, BLUE, italic=True)
    for _ in range(6):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font_run(p.add_run("Phiên bản phần mềm: 2026.09.08.3"), 11, MUTED)


def toc(w):
    w.doc.add_page_break()
    w.doc.add_heading("Mục lục", level=1)
    paragraph = w.doc.add_paragraph()
    run = font_run(paragraph.add_run(), 11)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = 'TOC \\o "1-2" \\h \\z \\u'
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(separate)
    hint = font_run(paragraph.add_run("Mục lục sẽ hiện khi mở bằng Word. Nếu chưa thấy: bấm chuột phải vào dòng này → Update Field (Cập nhật trường)."), 11, MUTED, italic=True)
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    hint._r.append(end)


def part0(w):
    w.h1("0. Cách dùng tài liệu này")
    w.p("Tài liệu này viết cho các em, những người sẽ **trình bày và bảo vệ** dự án AI ExamGuard trước ban giám khảo. "
        "Mục tiêu không phải là học thuộc, mà là **hiểu** để có thể tự giải thích bằng lời của mình.")
    w.p("Sau khi đọc xong, các em sẽ:")
    w.bullets([
        "Giải thích được dự án làm gì, vì sao làm như vậy, trong 1 phút.",
        "Vẽ lại được sơ đồ hệ thống và kể được hành trình của một cảnh báo từ webcam tới màn hình giám thị.",
        "Mở đúng file code khi giám khảo hỏi “phần này nằm ở đâu?”, đọc và giải thích được các đoạn code chính.",
        "Tự sửa một vài chỗ nhỏ trong code và chạy kiểm thử.",
        "Trả lời tự tin các câu hỏi kỹ thuật, kể cả câu hỏi “bẫy”, và dám nói thật về hạn chế.",
    ])
    w.h2("Lộ trình đọc gợi ý")
    w.table(["Buổi", "Đọc phần", "Sau buổi này em làm được"], [
        ["1", "Phần 1, 2, 3", "Kể lại dự án làm gì, ai dùng, một ca thi diễn ra thế nào."],
        ["2", "Phần 4, 5", "Biết dự án có những thư mục nào; hiểu AI nhìn camera và quyết định cảnh báo ra sao."],
        ["3", "Phần 6, 7, 8", "Hiểu dữ liệu đi qua mạng LAN thế nào, máy chủ Python làm gì, vì sao cần EXE."],
        ["4", "Phần 9, 10", "Tự chạy thử, sửa code nhỏ, chạy kiểm thử."],
        ["5", "Phần 11, 12, 13, 14", "Thuộc các con số quan trọng, luyện trả lời vấn đáp."],
    ], [1.6, 4.0, 11.0])
    w.h2("Các hộp màu trong tài liệu")
    w.callout("nho", "Điều quan trọng nhất của mục đó. Nếu chỉ có 30 giây ôn bài, hãy đọc các hộp này.")
    w.callout("vi", "So sánh kỹ thuật với một chuyện quen thuộc để dễ nhớ và dễ kể lại cho giám khảo.")
    w.callout("hoi", "Câu hỏi giám khảo rất hay hỏi ở phần đó, kèm gợi ý trả lời.")
    w.callout("tay", "Bài thực hành nhỏ: mở code, sửa thử, chạy thử.")
    w.callout("canh", "Chỗ dễ nói sai hoặc điểm yếu thật của dự án mà em nên biết trước.")
    w.p("Trong tài liệu, chữ viết kiểu `nhu-the-nay` là **tên file, tên hàm hoặc đoạn code** đúng như trong dự án. "
        "Từ nào lạ, em tra ở **Phụ lục: Từ điển thuật ngữ** cuối tài liệu.")


def part1(w):
    w.h1("1. AI ExamGuard là gì?")
    w.h2("1.1. Bài toán")
    w.p("Hãy tưởng tượng phòng thi tin học có 30 máy và chỉ một hoặc hai thầy cô coi thi. Thầy cô chỉ có hai mắt, "
        "nên rất khó thấy hết lúc một bạn **rời chỗ**, **quay sang bạn bên cạnh rất lâu**, **có người lạ ngồi cùng** "
        "hay **cứ nhìn ra ngoài màn hình**. Những chuyện đó xảy ra trong vài giây và dễ bị bỏ sót.")
    w.h2("1.2. Giải pháp")
    w.p("AI ExamGuard giống như **một “trợ lý quan sát” ngồi sau mỗi webcam**:")
    w.steps([
        "Webcam của từng máy thi nhìn khuôn mặt thí sinh. AI chạy **ngay trên máy đó** đo xem: có mấy khuôn mặt, đầu đang quay bao nhiêu độ, mắt có nhìn ra ngoài màn hình không.",
        "Nếu một dấu hiệu **kéo dài đủ lâu** (ví dụ quay đầu liên tục hơn 3 giây), máy thi gửi một **cảnh báo** qua mạng nội bộ (LAN) tới máy giám thị.",
        "Máy giám thị tô máy đó màu vàng hoặc đỏ, kêu tiếng “bíp” và ghi rõ: phòng nào, máy số mấy, bạn nào, chuyện gì, lúc mấy giờ.",
        "**Giám thị đi tới xem tận nơi và tự quyết định.** AI không bao giờ tự kết luận ai gian lận.",
    ])
    w.callout("nho", "Nguyên tắc của cả dự án gói trong 4 bước: **Quan sát tín hiệu → Kiểm tra thời gian → Tạo cảnh báo → Con người xác minh.**")
    w.callout("vi", "AI ExamGuard giống **cảm biến lùi xe ô tô**. Cảm biến không lái xe thay người. Nó chỉ kêu “bíp bíp” khi có vật ở gần quá lâu, "
              "còn người lái quay lại nhìn và quyết định. AI ExamGuard cũng vậy: chỉ “bíp” khi một dấu hiệu kéo dài đủ lâu, giám thị là người nhìn và quyết định.")
    w.h2("1.3. Ba điều làm nên sự khác biệt")
    w.table(["Điều", "Nghĩa là gì", "Vì sao quan trọng"], [
        ["**Không gửi video đi đâu cả**", "Hình ảnh được AI phân tích ngay trên máy thi rồi bỏ đi. Thứ gửi đi chỉ là vài con số và các cảnh báo.", "Bảo vệ quyền riêng tư của học sinh, mạng không bị nghẽn."],
        ["**Không cần Internet**", "Các máy chỉ cần cắm chung mạng LAN hoặc chung Wi-Fi của phòng máy.", "Phòng thi thường không có hoặc bị cắt Internet; dữ liệu không ra khỏi trường."],
        ["**Một file EXE duy nhất**", "Cùng một file chạy được cho cả máy giáo viên lẫn máy học sinh (Windows 10/11).", "Thầy cô không cần cài đặt phức tạp."],
    ], [4.0, 7.0, 5.6])
    w.h2("1.4. Những điều AI ExamGuard KHÔNG làm")
    w.bullets([
        "**Không kết luận gian lận.** Nó chỉ nhắc giám thị “máy này cần xem”.",
        "**Không nhận diện ai là ai bằng khuôn mặt.** Họ tên, số báo danh do thí sinh tự khai.",
        "**Không thu âm**, không bật camera lén: thí sinh phải đồng ý trước thì webcam mới mở.",
        "**Không phát hiện điện thoại hay tài liệu.** AI chỉ phân tích khuôn mặt.",
    ])
    w.callout("hoi", "“Tóm tắt dự án trong 30 giây?” → Gợi ý: “AI ExamGuard là trợ lý quan sát cho giám thị phòng thi tin học. "
              "Webcam mỗi máy dùng AI chạy ngay trên máy để theo dõi khuôn mặt; khi một dấu hiệu như vắng mặt, có hai người, quay đầu hay nhìn lệch kéo dài đủ lâu "
              "thì gửi cảnh báo qua mạng LAN về máy giám thị. Không gửi video, không cần Internet, và giám thị luôn là người quyết định.”")


def part2(w, figs):
    w.h1("2. Ai dùng và dùng như thế nào?")
    w.p("Phần mềm có **4 trang** (4 màn hình). Mỗi người dùng một trang khác nhau:")
    w.table(["Trang", "Địa chỉ", "Ai dùng", "Làm được gì"], [
        ["Trang chủ", "`/`", "Mọi người", "Giới thiệu, nút vào phòng thí sinh hoặc giám thị."],
        ["Thí sinh", "`/thi-sinh`", "Học sinh", "Nhập họ tên, số báo danh, phòng, số máy → gõ mã kết nối 4 số → đồng ý giám sát → bật webcam. Xem AI đang đếm gì."],
        ["Giám thị", "`/giam-thi`", "Giáo viên", "Xem mã kết nối, sơ đồ máy xanh/vàng/đỏ/xám, danh sách cảnh báo có tiếng bíp, xem chi tiết, bấm “Đã xác minh”, xuất báo cáo CSV."],
        ["Quản trị", "`/quan-tri`", "Nhà trường", "Đặt tên phòng, chỉnh các ngưỡng thời gian (1–60 giây), xuất cấu hình JSON."],
    ], [2.4, 2.4, 2.4, 9.4])
    w.h2("2.1. Một ca thi diễn ra thế nào?")
    w.figure(figs["ca_thi"], "Trình tự một ca thi giữa máy học sinh, trung tâm LAN và màn hình giáo viên.")
    w.steps([
        "**Giáo viên** mở EXE, bấm “Vào phòng giám thị”. Màn hình hiện **mã kết nối 4 số** (ví dụ `4821`) và địa chỉ máy (ví dụ `http://192.168.1.10:8765`).",
        "**Học sinh** mở EXE trên máy mình, bấm “Bắt đầu kiểm tra thiết bị”, nhập họ tên, số báo danh, phòng, số máy.",
        "Học sinh gõ mã `4821`. Phần mềm tự tìm ra máy giáo viên trong mạng và **kiểm tra kết nối**. Chưa kết nối được thì **không cho bắt đầu**.",
        "Học sinh đọc thông báo, xác nhận đồng ý. Lúc này webcam mới bật và AI bắt đầu chạy.",
        "Cứ **2 giây** máy học sinh gửi một “nhịp tim” báo “máy tôi vẫn ổn” kèm vài con số.",
        "Khi có dấu hiệu kéo dài đủ lâu, máy học sinh gửi **cảnh báo**. Màn hình giáo viên đổi màu máy đó và kêu “bíp”.",
        "Giáo viên tới xem tận nơi, rồi bấm **“Đã xác minh”**.",
        "Cuối ca, giáo viên bấm **“Xuất báo cáo”** để lưu file CSV (mở được bằng Excel).",
    ])
    w.callout("canh", "Dữ liệu ca thi chỉ nằm trong **bộ nhớ** của máy giáo viên. Đóng EXE là mất hết, nên **phải xuất báo cáo trước khi tắt**.")


def part3(w, figs):
    w.h1("3. Nhìn toàn cảnh hệ thống")
    w.figure(figs["tong_quan"], "Toàn cảnh: nhiều máy thí sinh gửi cảnh báo qua mạng LAN về một máy giám thị.")
    w.p("Hệ thống có **hai loại máy** nhưng dùng **chung một phần mềm**:")
    w.bullets([
        "**Máy thí sinh**: có webcam, chạy AI, tự quyết định khi nào tạo cảnh báo, rồi gửi đi.",
        "**Máy giám thị**: chạy “trung tâm LAN” (một máy chủ nhỏ viết bằng Python) để **nhận và cất** cảnh báo từ mọi máy, và hiện màn hình Giám thị.",
    ])
    w.callout("nho", "Mọi việc “nặng” (xem ảnh, chạy AI, đếm thời gian) diễn ra ở **máy thí sinh**. Máy giám thị chỉ nhận vài con số và cảnh báo, nên một máy giáo viên bình thường vẫn theo dõi được cả phòng.")
    w.h2("3.1. Từ điển mini trước khi đi tiếp")
    w.p("Mười từ sau xuất hiện suốt tài liệu. Đọc kỹ một lần là đủ:")
    w.table(["Từ", "Hiểu đơn giản là"], [
        ["**Khung hình**", "Một tấm ảnh chụp từ webcam. Video thực chất là nhiều khung hình liên tiếp."],
        ["**Mô hình AI**", "Một file “bộ não” đã được dạy sẵn. Ở đây là mô hình của Google để tìm khuôn mặt."],
        ["**Điểm mốc**", "Các chấm AI đặt lên khuôn mặt (đầu mũi, khóe mắt, cằm…). Có 478 điểm."],
        ["**Ngưỡng**", "Mốc giới hạn. Ví dụ quay đầu quá 14° là vượt ngưỡng góc, kéo dài 3 giây là đủ ngưỡng thời gian."],
        ["**LAN**", "Mạng nội bộ: các máy cắm chung một mạng trong phòng, nói chuyện với nhau không cần Internet."],
        ["**Địa chỉ IP**", "“Số nhà” của một máy trong mạng, ví dụ `192.168.1.10`."],
        ["**Cổng (port)**", "“Số phòng” trong ngôi nhà đó. Phần mềm dùng cổng `8765` để nói chuyện và `8766` để tìm nhau."],
        ["**Máy chủ / hub**", "Chương trình đứng chờ và trả lời yêu cầu từ máy khác. Ở đây là “trung tâm LAN” trên máy giáo viên."],
        ["**API**", "Các “cửa giao dịch” mà máy chủ mở ra, ví dụ cửa `/api/events` để nộp cảnh báo."],
        ["**JSON**", "Cách viết dữ liệu dạng chữ mà cả người và máy đều đọc được, ví dụ `{\"type\": \"no_face\"}`."],
    ], [3.4, 13.2])


def part4(w, figs):
    w.h1("4. Cấu trúc dự án: mỗi thư mục làm gì?")
    w.figure(figs["cau_truc"], "Ba phần chính của dự án và cách chúng được gộp thành một file EXE.")
    w.callout("vi", "Nếu cả hệ thống là **một nhà hàng**: `web/` là **phòng ăn và đầu bếp** (cái khách nhìn thấy, và AI “nấu” ra cảnh báo); "
              "`desktop-hub/` là **quầy lễ tân kiêm tổng đài** (nhận và chuyển mọi cảnh báo); `shared/` là **bản thực đơn chung** mà cả hai bên phải đọc giống nhau.")
    w.h2("4.1. Cây thư mục chính")
    w.code("DUANDUNGAI/", """
DUANDUNGAI/
├── web/                    Giao diện + AI (TypeScript, Next.js)
│   ├── src/app/            4 trang: trang chủ, thi-sinh, giam-thi, quan-tri
│   ├── src/ai/             Tải mô hình AI, tính góc đầu/hướng mắt, vẽ điểm mốc
│   ├── src/domain/         "Luật chơi": ngưỡng, bộ đếm hành vi, danh mục cảnh báo
│   ├── src/features/       Giao diện + logic từng trang (candidate, proctor, admin, home)
│   ├── src/services/       Gửi/nhận dữ liệu: hub LAN, hộp thư đi, Firebase
│   ├── public/mediapipe/   Mô hình AI đóng kèm (chạy không cần Internet)
│   └── tests/              Kiểm thử tự động phía web
├── desktop-hub/            Máy chủ LAN + cửa sổ ứng dụng (Python)
│   ├── examguard_desktop/  Mã nguồn chính (server, http_handler, exam_store, discovery…)
│   └── tests/              Kiểm thử tự động phía Python
├── shared/hub-contract.json  "Hợp đồng" chung giữa hai phần
├── docs/                   Tài liệu
├── scripts/build-exe.ps1   Lệnh build ra file EXE (Windows)
└── release/                Các file EXE đã build
""", "cây thư mục")
    w.h2("4.2. Bản đồ “muốn tìm gì thì mở file nào”")
    w.p("Đây là bảng quan trọng nhất khi giám khảo hỏi “phần đó nằm ở đâu trong code?”:")
    w.table(["Muốn tìm / muốn sửa", "Mở file"], [
        ["Tải mô hình AI (MediaPipe)", "`web/src/ai/face-landmarker-loader.ts`"],
        ["Cửa tầng NHÌN + đường dự phòng thuật toán khác", "`web/src/ai/vision-provider.ts`"],
        ["Tính góc quay đầu, cúi/ngẩng, hướng mắt (MediaPipe)", "`web/src/ai/face-metrics.ts`"],
        ["Các ngưỡng (3 giây, 14°…)", "`web/src/domain/thresholds.ts`"],
        ["Bộ đếm thời gian (khi nào thì cảnh báo)", "`web/src/domain/behavior-engine.ts`"],
        ["Tên và mức độ (đỏ/vàng) của từng loại cảnh báo", "`web/src/domain/alert-catalog.ts`"],
        ["Màu xanh/vàng/đỏ tức thời của một máy", "`web/src/domain/station-health.ts`"],
        ["“Bộ não” phiên giám sát: bật webcam, vòng lặp AI, tạo cảnh báo, nhịp tim", "`web/src/features/candidate/hooks/use-monitoring-session.ts`"],
        ["Bắt rời cửa sổ, bấm Ctrl+C/V/X/P", "`web/src/features/candidate/hooks/use-browser-guard.ts`"],
        ["Cửa chính gửi/nhận dữ liệu", "`web/src/services/exam-sync.ts`"],
        ["Hộp thư đi (gửi lại khi mất mạng)", "`web/src/services/hub/outbox.ts`"],
        ["Màn hình giám thị nhận dữ liệu mỗi giây", "`web/src/features/proctor/hooks/use-proctor-feed.ts`"],
        ["Quá 7 giây coi là mất kết nối", "`web/src/features/proctor/event-filters.ts`"],
        ["Xuất báo cáo / biên bản đã xác nhận", "`web/src/features/proctor/csv-export.ts`"],
        ["Nút Xác nhận đúng / Báo nhầm", "`web/src/features/proctor/components/event-detail-drawer.tsx`"],
        ["Máy chủ Python: các API", "`desktop-hub/examguard_desktop/http_handler.py`"],
        ["Nơi cất cảnh báo trong bộ nhớ", "`desktop-hub/examguard_desktop/exam_store.py`"],
        ["Tìm máy bằng mã 4 số", "`desktop-hub/examguard_desktop/discovery.py`"],
        ["Khởi động EXE", "`desktop-hub/examguard_desktop/app.py`"],
        ["Cổng, phiên bản, giới hạn", "`desktop-hub/examguard_desktop/config.py` và `shared/hub-contract.json`"],
    ], [7.6, 9.0])
    w.callout("nho", "Có một quy tắc dễ nhớ: `ai/` **nhìn**, `domain/` **quyết định**, `services/` **gửi đi**, `features/` **hiển thị**. Phía Python: `http_handler` **nhận**, `exam_store` **cất**, `discovery` **tìm nhau**.")
    w.callout("canh", "Đầu mỗi file và mỗi hàm trong dự án đều có ghi chú tiếng Việt theo mẫu “Đây là gì / Mục tiêu / Chức năng / Đầu ra / Dùng ở đâu / Liên kết với”. "
              "Khi bí, em chỉ cần mở file và đọc phần ghi chú đó là hiểu hàm làm gì.")


def part5(w, figs):
    w.h1("5. Bên trong máy thí sinh: AI làm việc thế nào?")
    w.figure(figs["day_chuyen"], "Dây chuyền 6 bước trên máy thí sinh, từ webcam tới hộp thư đi.")
    w.p("Mọi thứ trên máy thí sinh chạy theo một **dây chuyền** lặp đi lặp lại khoảng **12 lần mỗi giây**. "
        "Ta lần lượt đi qua từng bước.")

    w.h2("5.1. Bước 1–2: Webcam và mô hình AI MediaPipe")
    w.p("Dự án dùng **MediaPipe Face Landmarker** của Google. Đây là mô hình AI **đã được Google huấn luyện sẵn**: "
        "đưa vào một khung hình, nó trả về các khuôn mặt tìm thấy, mỗi khuôn mặt gồm **478 điểm mốc** (tọa độ của đầu mũi, khóe mắt, tròng đen, cằm…).")
    w.p("File mô hình (`face_landmarker.task`) được **đóng kèm** trong `web/public/mediapipe/`, nên AI chạy được **không cần Internet**.")
    w.code("web/src/ai/face-landmarker-loader.ts", """
for (const modelAssetPath of MODEL_URLS) {
  for (const delegate of ['GPU', 'CPU'] as const) {
    if (isCancelled()) return null;
    try {
      detector = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate }, runningMode: 'VIDEO', numFaces: 2,
        minFaceDetectionConfidence: 0.55, minFacePresenceConfidence: 0.55, minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
      });
      break;
    } catch (error) { modelError = error; }
  }
  if (detector) break;
}
""", "TypeScript")
    w.explain([
        "`MODEL_URLS` là danh sách nơi lấy mô hình: **bản trên máy trước**, hỏng mới lấy bản trên Internet.",
        "Với mỗi nơi, thử chạy bằng **card đồ họa (GPU)** cho nhanh; máy không hỗ trợ thì chạy bằng **bộ xử lý (CPU)**.",
        "`numFaces: 2`: chỉ cần tìm **tối đa 2 khuôn mặt**, vì chỉ cần biết “có nhiều hơn 1 người” là đủ.",
        "`0.55`: AI phải **chắc chắn ít nhất 55%** đó là khuôn mặt thì mới tính, để bớt nhận nhầm.",
        "`runningMode: 'VIDEO'`: chế độ đọc video liên tục, nhanh hơn chế độ đọc từng ảnh rời.",
    ])

    w.h2("5.1b. Hai tầng quan trọng + đường dự phòng (đọc kỹ trước khi vấn đáp)")
    w.p("Nhiều bạn nhầm: “AI của em kết luận gian lận.” **Không đúng.** Hệ thống tách **hai tầng**:")
    w.table(["Tầng", "Ví von", "Làm gì", "File chính"], [
        ["**NHÌN**", "Người gác cổng quan sát", "MediaPipe đọc mặt/đầu/mắt → vài con số. **Không** kết luận sai phạm.", "`ai/vision-provider.ts`, `face-metrics.ts`"],
        ["**QUYẾT ĐỊNH CẢNH BÁO**", "Trọng tài bấm giờ", "Đếm thời gian, đủ ngưỡng thì tạo cảnh báo gọi giám thị.", "`domain/behavior-engine.ts`"],
        ["**CON NGƯỜI**", "Giám thị", "Tới tận nơi, bấm Xác nhận đúng / Báo nhầm.", "Trang `/giam-thi`"],
    ], [3.2, 3.4, 6.0, 4.0], size=10)
    w.p("**Đường dự phòng** nằm ở `vision-provider.ts`: giống **ổ cắm USB**. Hiện đang “cắm” MediaPipe. "
        "Sau này muốn thuật toán nhìn chính xác hơn (hoặc nhìn thêm thứ khác, nếu quy chế cho phép) thì gắn vào nhánh "
        "`future-custom`, **không phải viết lại** cả BehaviorEngine và trang giám thị. "
        "Nhánh đó **chưa có thuật toán thật** — cố ý để trống an toàn. Chi tiết từng bước gắn sau này: xem tài liệu phần cải tiến, mục 3.0b–3.0c.")
    w.callout("nho", "Câu nhớ: **MediaPipe nhìn — BehaviorEngine đếm giờ — Giám thị quyết định — vision-provider là ổ cắm để đổi cách nhìn sau này.**")
    w.h2("5.2. Bước 3: Từ 478 điểm thành vài con số")
    w.p("478 điểm thì quá nhiều để ra quyết định. File `face-metrics.ts` (qua cửa `vision-provider.ts`) rút gọn thành **5 con số**: "
        "số khuôn mặt, góc quay ngang (`headYaw`), góc cúi/ngẩng (`headPitch`), hướng mắt ngang (`gazeX`) và dọc (`gazeY`).")
    w.figure(figs["diem_moc"], "Ý tưởng tính góc quay đầu: so vị trí mũi với điểm giữa hai má.")
    w.code("web/src/ai/face-metrics.ts", """
const nose = point(landmarks, 1);
const leftCheek = point(landmarks, 234);
const rightCheek = point(landmarks, 454);
const forehead = point(landmarks, 10);
const chin = point(landmarks, 152);

const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
const headYaw = ((nose.x - average([leftCheek.x, rightCheek.x])) / Math.max(faceWidth, 0.01)) * 110;
const headPitch = (ratio(nose.y, forehead.y, chin.y) - 0.54) * 95;
""", "TypeScript")
    w.explain([
        "Mỗi điểm mốc có **số thứ tự cố định** trong lưới 478 điểm: điểm 1 là mũi, 234 và 454 là hai má, 10 là trán, 152 là cằm.",
        "`faceWidth` là bề rộng khuôn mặt (khoảng cách hai má).",
        "`headYaw`: lấy **vị trí mũi trừ điểm giữa hai má**, chia cho bề rộng mặt, nhân 110. Nhìn thẳng thì mũi nằm giữa nên kết quả gần 0. Quay đầu thì mũi lệch sang một bên nên con số lớn dần.",
        "Chia cho bề rộng mặt để **ngồi xa hay gần camera đều cho kết quả giống nhau**.",
        "`headPitch`: xem mũi nằm ở đâu giữa trán và cằm. Bình thường mũi ở khoảng 54% quãng đường; lệch nhiều là đang cúi hoặc ngẩng.",
        "Hướng mắt (`gazeX`, `gazeY`) tính bằng **vị trí tròng đen trong khóe mắt**, đổi ra thang từ −1 đến 1 (0 là nhìn giữa).",
    ])
    w.callout("hoi", "“Con số 110 và 95 ở đâu ra?” → Đây là **hệ số quy đổi** để kết quả có độ lớn gần giống “độ”. Đó là **ước tính gần đúng** chứ không phải số đo chính xác đã hiệu chỉnh bằng thiết bị. "
              "Em nên nói thật như vậy: dự án chỉ cần so con số với ngưỡng, không cần đo góc chính xác tuyệt đối.")

    w.h2("5.3. Bảy loại cảnh báo")
    w.table(["Mã trong code", "Tên hiển thị", "Màu", "Điều kiện trên mỗi khung hình", "Kéo dài bao lâu"], [
        ["`no_face`", "Không có mặt trước máy", "Đỏ", "Không thấy khuôn mặt nào", "5 giây"],
        ["`multiple_faces`", "Xuất hiện nhiều khuôn mặt", "Đỏ", "Thấy từ 2 khuôn mặt", "2 giây"],
        ["`head_turn`", "Quay đầu trái/phải kéo dài", "Vàng", "1 mặt, góc quay > 14°", "3 giây"],
        ["`head_pose`", "Cúi/ngẩng đầu bất thường", "Vàng", "1 mặt, góc cúi/ngẩng > 20°", "6 giây (tách riêng)"],
        ["`gaze_away`", "Hướng mắt lệch màn hình", "Vàng", "1 mặt, mắt lệch ngang > 0,55 hoặc dọc > 0,7", "5 giây"],
        ["`focus_lost`", "Rời khỏi cửa sổ bài thi", "Vàng", "Chuyển tab, thu nhỏ cửa sổ", "Ngay lập tức"],
        ["`restricted_input`", "Thao tác bàn phím bị hạn chế", "Vàng", "Bấm Ctrl/Cmd + C, V, X hoặc P", "Ngay lập tức"],
    ], [3.0, 3.8, 1.3, 5.3, 3.2], size=10)
    w.p("Năm loại đầu do **AI nhìn camera**, hai loại cuối do **trình duyệt** phát hiện. Các con số này nằm trong file `thresholds.ts`:")
    w.code("web/src/domain/thresholds.ts", """
export const DEFAULT_THRESHOLDS: BehaviorThresholds = {
  noFaceSeconds: 5,
  multipleFacesSeconds: 2,
  headTurnSeconds: 3,
  headPoseSeconds: 6,
  gazeAwaySeconds: 5,
  cooldownSeconds: 12,
};

export const VISION_LIMITS = { headYaw: 14, headPitch: 20, gazeX: 0.55, gazeY: 0.7 };
""", "TypeScript")
    w.explain([
        "`DEFAULT_THRESHOLDS`: **bao nhiêu giây** thì thành cảnh báo. Trang Quản trị có thể đổi (1–60 giây).",
        "`VISION_LIMITS`: **giới hạn góc** trên từng khung hình. Muốn đổi phải sửa code.",
        "`cooldownSeconds: 12`: sau khi báo, cùng một loại phải **nghỉ 12 giây** mới báo lại (xem mục 5.5).",
    ])

    w.h2("5.4. Bước 4: Bộ đếm thời gian, trái tim của dự án")
    w.p("Nếu cứ thấy quay đầu là báo, giám thị sẽ bị “dội bom” bởi hàng trăm cảnh báo vô nghĩa mỗi khi học sinh vươn vai. "
        "Vì vậy dự án có một **bộ đếm thời gian** (`BehaviorEngine`) cho từng loại dấu hiệu.")
    w.callout("vi", "Bộ đếm giống **trọng tài cầm đồng hồ bấm giờ**: chỉ khi một dấu hiệu **kéo dài liên tục đủ lâu** mới thổi còi. "
              "Thổi còi xong phải nghỉ 12 giây mới được thổi lại cùng lỗi đó. Còi chỉ để gọi giám thị tới xem, **không phải phán quyết**.")
    w.figure(figs["bo_dem"], "Ví dụ bộ đếm quay đầu: liếc về rất ngắn không làm mất thời gian đã đếm; đủ 3 giây thì tạo cảnh báo.")
    w.p("Bộ đếm có **ba luật chống báo nhầm**:")
    w.bullets([
        "**Chỉ cộng thời gian giữa hai khung hình liên tiếp cùng vi phạm.**",
        "**Nhiễu ngắn dưới 0,4 giây được bỏ qua**: AI lỡ nhận sai một hai khung hình, hoặc học sinh liếc về rất nhanh, thì bộ đếm **vẫn giữ**. Phải bình thường liên tục từ 0,4 giây trở lên thì bộ đếm mới về 0.",
        "**Camera đứng hình quá 1,5 giây thì mọi bộ đếm về 0**: không bao giờ tính khoảng thời gian máy bị treo là thời gian “đã quan sát thấy vi phạm”.",
    ])
    w.code("web/src/domain/behavior-engine.ts", """
const RECOVERY_MS = 400;        // phải yên ổn 0,4 giây mới xóa bộ đếm
const MAX_FRAME_GAP_MS = 1500;  // hai khung hình cách nhau quá 1,5 giây thì đếm lại

update(metrics: VisionMetrics, now: number, thresholds: BehaviorThresholds) {
  let delta = this.lastFrame === null ? 0 : now - this.lastFrame;
  if (delta < 0 || delta > MAX_FRAME_GAP_MS) { this.timers.clear(); delta = 0; }
  this.lastFrame = now;
  const singleFace = metrics.faceCount === 1;
  const conditions: Array<[AlertType, boolean, number]> = [
    ['no_face', metrics.faceCount === 0, thresholds.noFaceSeconds],
    ['multiple_faces', metrics.faceCount > 1, thresholds.multipleFacesSeconds],
    ['head_turn', singleFace && Math.abs(metrics.headYaw) > VISION_LIMITS.headYaw, thresholds.headTurnSeconds],
    // ... head_pose và gaze_away viết tương tự
  ];
  for (const [type, active, seconds] of conditions) {
    const timer = this.timers.get(type) ?? { activeMs: 0, quietMs: 0, wasActive: false };
    if (active) {
      if (timer.wasActive) timer.activeMs += delta;   // cộng thời gian nếu khung trước cũng vi phạm
      timer.quietMs = 0;
    } else {
      timer.quietMs += delta;                         // đang bình thường: đếm thời gian yên ổn
      if (timer.quietMs >= RECOVERY_MS) timer.activeMs = 0;
    }
    timer.wasActive = active;
    // ...
    if (active && timer.activeMs >= seconds * 1000) triggered.push(item);  // ĐỦ NGƯỠNG
  }
  return { progress, triggered };
}
""", "TypeScript, đã lược bớt và thêm chú thích")
    w.explain([
        "`delta` là số mili giây từ khung hình trước tới khung hình này (thường khoảng 80 ms).",
        "Mỗi loại dấu hiệu có một “đồng hồ” riêng (`timer`) gồm: thời gian đang vi phạm (`activeMs`), thời gian đã yên ổn (`quietMs`), và khung trước có vi phạm không (`wasActive`).",
        "`conditions` là danh sách “câu hỏi” cho từng khung hình, ví dụ: có đúng 1 mặt và góc quay vượt 14° không?",
        "Quay đầu, cúi/ngẩng và nhìn lệch **chỉ xét khi có đúng 1 khuôn mặt**: không có ai thì đã có cảnh báo “không có mặt” rồi.",
        "Khi `activeMs` vượt số giây quy định, loại đó được đưa vào `triggered`, tức là **đủ điều kiện tạo cảnh báo**.",
    ])
    w.callout("hoi", "“Nếu em quay đầu 2,9 giây rồi quay lại thì sao?” → Không có cảnh báo, vì chưa đủ 3 giây. Đây là **thiết kế có chủ đích** để tránh báo nhầm. "
              "Trang thí sinh còn hiện thanh “Tiến trình tạo cảnh báo” (ví dụ `1,8 / 3s`) để thấy AI đang đếm gì. Ngưỡng này nhà trường chỉnh được ở trang Quản trị.")

    w.h2("5.5. Bước 5: Tạo cảnh báo và “thời gian nghỉ” 12 giây")
    w.p("Khi bộ đếm báo đủ ngưỡng, hàm `emitAlert` tạo ra một cảnh báo đầy đủ thông tin:")
    w.code("web/src/features/candidate/hooks/use-monitoring-session.ts", """
const emitAlert = useCallback((type: AlertType, detail: string, source: ExamEvent['source'] = 'ai') => {
  const now = Date.now();
  const lastSent = cooldownsRef.current[type] ?? 0;
  if (source !== 'demo' && now - lastSent < thresholdsRef.current.cooldownSeconds * 1000) return;
  if (source !== 'demo') cooldownsRef.current[type] = now;
  alertCountRef.current += 1;
  const identity = identityRef.current;
  const severity = alertSeverity(type);
  const event: ExamEvent = {
    id: makeId(),
    ...identity,
    type,
    severity,
    title: ALERT_LABELS[type],
    detail,
    timestamp: now,
    reviewed: false,
    source,
  };
  publishEvent(event);
  // ...
}, [refreshPendingCount]);
""", "TypeScript")
    w.explain([
        "Dòng `if (... now - lastSent < cooldownSeconds * 1000) return;`: nếu cùng loại cảnh báo vừa gửi **chưa quá 12 giây** thì **bỏ qua**. Đây là “thời gian nghỉ” (cooldown), tính **riêng cho từng loại**.",
        "Cảnh báo thử (`source === 'demo'`, do bấm nút “Thử cảnh báo”) thì không bị giới hạn này.",
        "`id: makeId()`: mỗi cảnh báo có một **mã riêng không trùng**. Mã này giúp gửi lại nhiều lần mà không bị đếm trùng (mục 6.2).",
        "`...identity`: gắn **phòng, máy, số báo danh, họ tên** vào cảnh báo.",
        "`publishEvent(event)`: đưa cảnh báo sang phần gửi đi (phần 6).",
    ])

    w.h2("5.6. Canh trình duyệt: những thứ camera không thấy")
    w.p("Có những hành vi camera không thấy được, ví dụ chuyển sang cửa sổ khác hoặc bấm phím sao chép. File `use-browser-guard.ts` lo việc này:")
    w.code("web/src/features/candidate/hooks/use-browser-guard.ts", """
const onVisibility = () => {
  if (document.hidden) emitAlert('focus_lost', 'Thí sinh chuyển khỏi cửa sổ bài thi.', 'browser');
};
const onRestrictedInput = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'p'].includes(event.key.toLowerCase())) {
    emitAlert('restricted_input', `Phát hiện tổ hợp phím ${event.ctrlKey ? 'Ctrl' : 'Cmd'}+${event.key.toUpperCase()}.`, 'browser');
  }
};
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener('keydown', onRestrictedInput);
""", "TypeScript")
    w.explain([
        "`visibilitychange` là sự kiện trình duyệt tự báo khi trang **bị ẩn** (chuyển tab, thu nhỏ). `document.hidden` đúng nghĩa là trang đang bị ẩn.",
        "`keydown` là sự kiện **mỗi khi bấm một phím**. Nếu đang giữ Ctrl (Windows) hoặc Cmd (Mac) và bấm C, V, X, P thì tạo cảnh báo.",
        "Hai loại này báo **ngay lập tức**, không cần đếm thời gian, nhưng vẫn bị giới hạn 12 giây nghỉ.",
    ])

    w.h2("5.7. Vòng lặp AI và nhịp tim")
    w.p("Hàm `detectionLoop` trong `use-monitoring-session.ts` chạy lặp lại suốt giờ thi:")
    w.steps([
        "Lấy khung hình mới nhất từ webcam (nếu chưa có khung mới thì bỏ qua lượt này).",
        "Cho MediaPipe tìm điểm mốc (`detectForVideo`), vẽ các điểm lên màn hình cho thí sinh thấy.",
        "Tính 5 con số (`calculateMetrics`), rồi đưa vào bộ đếm (`evaluateBehavior`).",
        "Hẹn **80 mili giây** sau chạy lại (khoảng 12 lần/giây). Ở **chế độ máy yếu** thì 160 mili giây (khoảng 6 lần/giây) để đỡ nóng máy.",
    ])
    w.p("Song song đó, cứ **2 giây** hàm `updateStation` gửi một **nhịp tim** về máy giám thị, gồm: ai đang thi, máy đang màu gì, "
        "các con số mới nhất, AI có đang chạy không, và tiến trình bộ đếm.")
    w.table(["Trạng thái AI", "Ý nghĩa"], [
        ["`loading`", "Đang tải mô hình."],
        ["`ready`", "Có khung hình mới được phân tích trong 3 giây gần nhất."],
        ["`stalled`", "Camera mở nhưng 3 giây không có khung hình mới được phân tích (“AI đã tạm dừng”)."],
        ["`error`", "Không tải được mô hình (chỉ còn camera) hoặc lỗi webcam."],
        ["`stopped`", "Thí sinh bấm Dừng."],
    ], [3.4, 13.2])
    w.callout("nho", "**Camera có hình chưa chắc AI đang chạy.** Vì vậy nhịp tim gửi kèm trạng thái AI, để giám thị biết máy nào đang “bị mù”.")


def part6(w, figs):
    w.h1("6. Dữ liệu đi qua mạng như thế nào?")
    w.h2("6.1. Các “cửa giao dịch” (API) của trung tâm LAN")
    w.p("Máy thí sinh và màn hình giám thị nói chuyện với trung tâm LAN qua **giao thức HTTP** (giống cách trình duyệt mở trang web), ở cổng `8765`. "
        "Trung tâm mở 7 cửa:")
    w.table(["Cửa (API)", "Ai gọi", "Để làm gì"], [
        ["`GET /api/health`", "Trang thí sinh", "Hỏi “trung tâm còn sống không?” (nút Kiểm tra kết nối)."],
        ["`GET /api/runtime`", "Trang giám thị", "Lấy địa chỉ LAN, phiên bản, mã kết nối 4 số."],
        ["`GET /api/discover`", "Trang thí sinh", "Hỏi “đã nghe thấy máy giám thị nào có mã này?”."],
        ["`POST /api/stations`", "Máy thí sinh", "Gửi nhịp tim 2 giây/lần."],
        ["`POST /api/events`", "Máy thí sinh", "Nộp một cảnh báo."],
        ["`GET /api/snapshot`", "Trang giám thị", "Lấy toàn bộ cảnh báo và trạng thái các máy (1 giây/lần)."],
        ["`PATCH /api/events/{mã}`", "Trang giám thị", "Đánh dấu một cảnh báo “Đã xác minh”."],
    ], [4.6, 3.2, 8.8])
    w.callout("vi", "`GET` là **hỏi để lấy** thông tin, `POST` là **nộp** thứ mới, `PATCH` là **sửa một phần** thứ đã có. "
              "Giống quầy lễ tân: “cho tôi xem danh sách” (GET), “tôi nộp đơn” (POST), “sửa đơn số 5 thành đã duyệt” (PATCH).")
    w.h3("Một cảnh báo trông như thế nào khi gửi đi?")
    w.code("Dữ liệu JSON của một cảnh báo (ví dụ)", """
{
  "id": "event-3f2a9c1e-...",
  "roomId": "PHONG-01",
  "stationId": "MAY-07",
  "candidateId": "SBD001",
  "candidateName": "Nguyễn Văn A",
  "type": "head_turn",
  "severity": "warning",
  "title": "Quay đầu trái/phải kéo dài",
  "detail": "Quay đầu: chỉ số góc ước tính 22.4°, vượt ngưỡng trong 3.0 giây quan sát.",
  "timestamp": 1792046400000,
  "reviewed": false,
  "source": "ai"
}
""", "JSON")
    w.p("Không có ảnh, không có video, chỉ khoảng **vài trăm chữ**. Đây là lý do một máy giáo viên thường nhận được dữ liệu từ cả phòng mà mạng không bị nghẽn.")

    w.h2("6.2. Hộp thư đi: không để mất cảnh báo khi mạng chập chờn")
    w.figure(figs["hop_thu"], "Cảnh báo nằm trong hộp thư đi cho tới khi máy giám thị xác nhận đã nhận.")
    w.code("web/src/services/hub/outbox.ts", """
export function enqueueEvent(hubUrl: string, event: ExamEvent) {
  const pending = readOutbox();
  localStorage.setItem(OUTBOX_KEY, JSON.stringify([...pending.filter((item) => item.event.id !== event.id), { hubUrl, event }]));
}

export function flushPendingEvents(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const queue = readOutbox();
    const unavailableHubs = new Set<string>();
    for (const item of queue) {
      if (unavailableHubs.has(item.hubUrl)) continue;
      if (!await postToHub('/api/events', item.event, 'POST', item.hubUrl)) {
        unavailableHubs.add(item.hubUrl);
        continue;
      }
      const remaining = readOutbox()
        .filter((pending) => pending.event.id !== item.event.id || pending.hubUrl !== item.hubUrl);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
      emitDelivered(item.event.id);
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
""", "TypeScript")
    w.explain([
        "`enqueueEvent`: bỏ cảnh báo vào hộp thư đi. Hộp thư được cất trong `localStorage` (bộ nhớ nhỏ của trình duyệt, **tải lại trang vẫn còn**).",
        "`flushPendingEvents`: lấy từng cảnh báo ra gửi. **Gửi được** thì xóa khỏi hộp và báo “đã gửi tới nơi”; **không được** thì giữ lại.",
        "`if (flushing) return flushing;`: nếu đang có một lượt gửi chạy thì dùng chung, tránh **hai lượt gửi chồng nhau** làm gửi trùng.",
        "Hàm này được gọi lại **mỗi lần gửi nhịp tim (2 giây)**, nên mạng có lại là cảnh báo cũ tự đi tiếp.",
    ])
    w.callout("hoi", "“Mất mạng giữa giờ thi thì cảnh báo có mất không?” → Không. Cảnh báo nằm chờ trong hộp thư đi (kể cả khi tải lại trang) và tự gửi lại khi có mạng. "
              "Trung tâm LAN **bỏ qua cảnh báo trùng mã**, nên gửi lại nhiều lần không bị trùng và không làm mất dấu “đã xác minh”. "
              "Trên trang thí sinh, chữ “Giám thị đã nhận” chỉ hiện khi máy giám thị đã thật sự trả lời.")

    w.h2("6.3. Trung tâm LAN (Python) nhận và cất cảnh báo")
    w.p("Phía máy giáo viên, file `http_handler.py` nhận yêu cầu, kiểm tra dữ liệu, rồi giao cho `exam_store.py` cất vào bộ nhớ.")
    w.code("desktop-hub/examguard_desktop/http_handler.py", """
def do_POST(self):
    route = urllib.parse.urlparse(self.path).path
    payload = self.read_json()
    if not isinstance(payload, dict):
        self.send_json(400, {"ok": False, "error": "Dữ liệu không hợp lệ"})
        return

    if not all(is_non_empty_string(payload.get(field)) for field in IDENTITY_FIELDS):
        self.send_json(400, {"ok": False, "error": "Thiếu thông tin thí sinh hoặc máy thi"})
        return

    if route == "/api/events":
        if not is_non_empty_string(payload.get("id")):
            self.send_json(400, {"ok": False, "error": "Thiếu mã sự kiện"})
            return
        exam_store.add_event(payload)
        self.send_json(201, {"ok": True})
        return

    if route == "/api/stations":
        exam_store.save_station(payload)
        self.send_json(200, {"ok": True})
        return

    self.send_json(404, {"ok": False, "error": "Không tìm thấy API"})
""", "Python")
    w.explain([
        "`read_json()` đọc dữ liệu gửi lên. Dữ liệu **lớn hơn khoảng 1,5 MB** hoặc không đúng JSON thì bị từ chối, để máy chủ không bị treo.",
        "Bắt buộc có đủ 4 trường **phòng, máy, số báo danh, họ tên** (`IDENTITY_FIELDS`). Thiếu thì trả lỗi `400` (dữ liệu sai).",
        "Cảnh báo phải có `id`. Hợp lệ thì cất lại và trả `201` (đã tạo mới). Nhịp tim thì trả `200` (thành công).",
        "Các con số `200`, `201`, `400`, `404` là **mã trạng thái HTTP**: kiểu “mã kết quả” chuẩn của mọi trang web.",
    ])
    w.code("desktop-hub/examguard_desktop/exam_store.py", """
data_lock = threading.Lock()
exam_events = []
exam_stations = {}

def add_event(payload):
    with data_lock:
        if not any(item.get("id") == payload["id"] for item in exam_events):
            exam_events.insert(0, payload)
            del exam_events[EVENT_LIMIT:]
""", "Python")
    w.explain([
        "`exam_events` là danh sách cảnh báo, cái mới nhất ở đầu. Chỉ giữ tối đa **500** cái (`EVENT_LIMIT`).",
        "`if not any(... id ...)`: nếu đã có cảnh báo **cùng mã** thì **bỏ qua**. Đây là chỗ chống trùng khi máy thí sinh gửi lại.",
        "`with data_lock:` là **khóa**. Nhiều máy gửi cùng lúc thì máy chủ cho **lần lượt từng yêu cầu** sửa danh sách, không bị “giành nhau” làm hỏng dữ liệu.",
    ])
    w.callout("vi", "Khóa `data_lock` giống **chìa khóa nhà vệ sinh** ở quán cà phê: chỉ người cầm chìa mới được vào, xong trả chìa thì người sau mới vào. "
              "30 máy gửi cùng lúc cũng không ai “đè” lên dữ liệu của ai.")

    w.h2("6.4. Tìm máy giám thị bằng mã 4 số")
    w.figure(figs["tim_may"], "Máy giáo viên “hô” trên LAN; máy học sinh nghe được và tìm ra địa chỉ chỉ bằng mã 4 số.")
    w.p("Bắt học sinh gõ `http://192.168.1.10:8765` vừa dài vừa dễ sai. Vì vậy dự án có cách tìm máy bằng **mã 4 số**:")
    w.steps([
        "Mỗi lần bật, EXE tạo ngẫu nhiên một mã 4 số (`CONNECT_CODE`).",
        "Khi **trang Giám thị đang mở**, trung tâm trên máy giáo viên cứ **2 giây** “hô” một gói tin **quảng bá UDP** ở cổng `8766`: “tôi là examguard-hub, mã 4821, phòng 01, cổng 8765”.",
        "EXE trên máy học sinh cũng có một trung tâm nhỏ chạy ngầm, **nghe và ghi nhớ** các lời hô đó.",
        "Học sinh gõ `4821`, trang thí sinh hỏi trung tâm của chính máy mình (`/api/discover?code=4821`) và nhận về địa chỉ máy giáo viên.",
    ])
    w.code("desktop-hub/examguard_desktop/discovery.py", """
CONNECT_CODE = f"{secrets.randbelow(10000):04d}"

def announce_loop(http_port, stop):
    host = socket.gethostname()
    sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sender.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    while True:
        if proctor_active():
            with _lock:
                room = _proctor_room
            packet = build_announcement(http_port, room, host)
            for target in broadcast_targets():
                try:
                    sender.sendto(packet, (target, DISCOVERY_PORT))
                except OSError:
                    pass
        if stop.wait(ANNOUNCE_INTERVAL):
            break
""", "Python")
    w.explain([
        "`secrets.randbelow(10000):04d`: số ngẫu nhiên từ 0 tới 9999, luôn viết đủ 4 chữ số (ví dụ `0427`).",
        "`SOCK_DGRAM` là kiểu gửi **UDP**: gửi một gói tin ngắn, không cần bắt tay trước. `SO_BROADCAST` cho phép **gửi cho mọi máy trong mạng**.",
        "`if proctor_active()`: **chỉ hô khi trang Giám thị đang mở** (đã đọc dữ liệu trong 10 giây gần nhất). Nhờ vậy máy học sinh, dù chạy cùng EXE, không bao giờ tự hô.",
        "`stop.wait(ANNOUNCE_INTERVAL)`: nghỉ 2 giây rồi hô tiếp.",
    ])
    w.callout("vi", "UDP quảng bá giống **loa phát thanh của trường**: phát một lần, cả trường đều nghe, không cần gọi riêng từng lớp. "
              "Còn HTTP (dùng để gửi cảnh báo) giống **gọi điện thoại**: hai bên kết nối với nhau rồi mới nói, và biết chắc bên kia đã nghe.")
    w.callout("canh", "Mã 4 số **không phải mật khẩu**: nó được hô công khai trong mạng, chỉ để **phân biệt các phòng**. "
              "Nếu Wi-Fi chặn kiểu gói quảng bá (một số mạng trường có “client isolation”) thì học sinh gõ địa chỉ bằng tay như cũ.")


def part7(w, figs):
    w.h1("7. Màn hình giám thị")
    w.h2("7.1. Cập nhật mỗi giây")
    w.p("Trang Giám thị cứ **1 giây** hỏi trung tâm một lần (`GET /api/snapshot`) để lấy toàn bộ cảnh báo và trạng thái các máy. "
        "Cách “hỏi đều đặn” này gọi là **polling**. Nó đơn giản, dễ hiểu và đủ nhanh cho phòng thi.")
    w.h2("7.2. Tô màu từng máy")
    w.figure(figs["mau"], "Cách quyết định màu của một máy thí sinh trên sơ đồ phòng thi.")
    w.code("web/src/features/proctor/event-filters.ts", """
export function markOfflineStations(stations: StationStatus[], now: number) {
  return stations.map((station) => {
    const seenAt = station.serverSeenAt ?? station.lastSeen;
    return now - seenAt > 7000 ? { ...station, state: 'offline' as const } : station;
  });
}
""", "TypeScript")
    w.explain([
        "Máy thí sinh gửi nhịp tim 2 giây/lần. Nếu **quá 7 giây (7000 ms)** không nghe thấy, tức là lỡ khoảng 3 nhịp liên tiếp, máy đó bị coi là **mất kết nối** (màu xám).",
        "`serverSeenAt` là **giờ của máy chủ** lúc nhận nhịp tim. Ưu tiên dùng giờ máy chủ vì đồng hồ các máy học sinh có thể lệch nhau.",
    ])
    w.code("web/src/domain/station-health.ts", """
export function classifyMetrics(metrics: VisionMetrics): MetricsHealth {
  if (metrics.faceCount === 0 || metrics.faceCount > 1) return 'critical';
  if (exceedsVisionLimits(metrics)) return 'warning';
  return 'normal';
}
""", "TypeScript")
    w.callout("nho", "**Màu** phản ánh **khung hình hiện tại** (nhìn là biết ngay). **Cảnh báo** thì phải **kéo dài đủ lâu**. "
              "Một máy có thể chớp vàng một giây mà không tạo cảnh báo nào. Đó là đúng thiết kế.")
    w.h2("7.3. Tiếng bíp, xác minh và báo cáo")
    w.bullets([
        "**Dải cảnh báo mới**: khi có cảnh báo chưa xem vừa tới thì hiện dải đỏ để giám thị mở nhanh (không dùng âm thanh).",
        "**Xác nhận đúng / Báo nhầm**: hai nút trong bảng chi tiết → gửi `PATCH` kèm `verdict`. Đếm báo nhầm theo loại để chỉnh ngưỡng.",
        "**Xuất báo cáo** và **Biên bản đã xác nhận** (`csv-export.ts`): báo cáo đầy đủ có cột Kết luận; biên bản chỉ gồm cảnh báo đã xác nhận đúng. "
        "Đầu file có ký tự BOM để **Excel mở tiếng Việt không bị lỗi chữ**.",
    ])


def part8(w, figs):
    w.h1("8. Ứng dụng EXE: ghép mọi thứ lại")
    w.figure(figs["khoi_dong"], "Khi mở EXE: một máy chủ, một bộ tìm máy và một cửa sổ ứng dụng cùng khởi động.")
    w.code("desktop-hub/examguard_desktop/app.py", """
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
""", "Python")
    w.explain([
        "`create_server()`: tạo máy chủ web ở cổng 8765 (nếu cổng bận thì chọn cổng khác).",
        "`threading.Thread(...)`: chạy máy chủ trong một **luồng** riêng. Luồng giống **một “công nhân” làm việc song song**, để cửa sổ ứng dụng không bị đứng.",
        "`discovery.start(port)`: bật bộ tìm máy (một luồng nghe, một luồng hô).",
        "`open_main_window` và `run_gui`: mở cửa sổ ứng dụng (dùng **Edge WebView2** có sẵn trên Windows) và chờ tới khi người dùng đóng.",
        "`finally`: đóng cửa sổ thì **tắt máy chủ** gọn gàng.",
    ])
    w.h2("8.1. Vì sao học sinh phải dùng EXE, không mở bằng trình duyệt?")
    w.p("Vì lý do an toàn, trình duyệt **chỉ cho bật webcam** khi trang được mở từ địa chỉ an toàn: `localhost` (chính máy mình) hoặc `https://`. "
        "Nếu học sinh mở `http://192.168.1.10:8765` bằng Chrome, webcam sẽ **bị chặn**. "
        "EXE tải giao diện từ `127.0.0.1` (chính máy đó) nên webcam hoạt động bình thường.")
    w.p("Trang Giám thị **không cần webcam**, nên giáo viên có thể mở bằng trình duyệt thường qua `http://<IP máy giáo viên>:8765/giam-thi`.")
    w.h2("8.2. Cách build ra EXE")
    w.steps([
        "`cd web && npm run build`: biến mã TypeScript thành các file HTML/JS tĩnh trong `web/out/`, kèm mô hình AI.",
        "**PyInstaller** gói `web/out/` + mã Python + thư viện thành **một file EXE** duy nhất.",
        "Trên Windows chỉ cần một lệnh: `powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1`.",
    ])
    w.h2("8.3. Ngoài LAN còn chế độ nào?")
    w.p("File `web/src/services/exam-sync.ts` là **“cửa chính” duy nhất** để gửi/nhận dữ liệu. Mỗi lần gửi, nó tỏa ra mọi kênh đang có:")
    w.table(["Kênh", "Khi nào dùng", "Ghi chú"], [
        ["**LAN** (chính)", "Chạy bằng EXE, hoặc đã nhập địa chỉ máy giám thị", "Không cần Internet. Đây là chế độ dùng thật."],
        ["**Firebase**", "Khi build web có cấu hình Firebase", "Đồng bộ qua Internet. Chưa có bảo mật đầy đủ, chỉ để thử."],
        ["**Kênh cục bộ trong trình duyệt**", "Luôn chạy song song", "Chỉ các tab trong cùng một trình duyệt thấy nhau; dùng để trình diễn."],
    ], [4.0, 5.6, 7.0])


def part9(w):
    w.h1("9. Hợp đồng chung và kiểm thử")
    w.h2("9.1. Hợp đồng chung shared/hub-contract.json")
    w.p("Phần web (TypeScript) và phần máy chủ (Python) viết bằng hai ngôn ngữ khác nhau, nhưng phải **thống nhất** một số thứ: cổng mạng, tên các loại cảnh báo, các trường bắt buộc… "
        "Những thứ đó được ghi trong một file chung:")
    w.code("shared/hub-contract.json", """
{
  "appVersion": "2026.09.08.3",
  "defaultHubPort": 8765,
  "discoveryPort": 8766,
  "discoveryService": "examguard-hub",
  "maxBodyBytes": 1500000,
  "eventLimit": 500,
  "identityFields": ["roomId", "stationId", "candidateId", "candidateName"],
  "alertTypes": ["no_face", "multiple_faces", "head_turn", "head_pose", "gaze_away", "focus_lost", "restricted_input"],
  "endpoints": { "health": "GET /api/health", "snapshot": "GET /api/snapshot", "postEvent": "POST /api/events", "...": "..." }
}
""", "JSON, đã lược bớt")
    w.p("Mỗi bên vẫn giữ bản sao các giá trị trong code của mình, nhưng có **bài kiểm thử tự động ở cả hai phía** so sánh với file này. "
        "Lỡ ai sửa một bên mà quên bên kia, kiểm thử sẽ báo lỗi ngay.")
    w.callout("vi", "Giống **hợp đồng mua bán**: bên bán và bên mua mỗi người giữ một bản, nhưng nội dung phải giống hệt. Kiểm thử là người “đối chiếu hợp đồng” mỗi lần có thay đổi.")
    w.h2("9.2. Kiểm thử tự động")
    w.p("**Kiểm thử** (test) là những đoạn code nhỏ tự động kiểm tra code chính có chạy đúng không. Ví dụ: “cho bộ đếm thấy quay đầu 18,4° liên tục 3 giây thì phải ra cảnh báo”.")
    w.table(["File kiểm thử", "Kiểm tra gì"], [
        ["`web/tests/unit/behavior-engine.test.cjs`", "Bộ đếm: đủ 3 giây mới báo, nhiễu ngắn không làm mất thời gian, camera đứng hình thì đếm lại."],
        ["`web/tests/unit/domain.test.cjs`", "Các ngưỡng mặc định, cách đọc ngưỡng đã lưu, cách tô màu."],
        ["`web/tests/unit/face-metrics.test.cjs`", "Công thức tính góc đầu, hướng mắt."],
        ["`web/tests/unit/contract.test.cjs`", "Phía web khớp với `shared/hub-contract.json`."],
        ["`web/tests/unit/proctor.test.cjs`", "Đánh dấu mất kết nối, lọc cảnh báo, xuất CSV."],
        ["`desktop-hub/tests/test_hub_api.py`", "Các API của máy chủ Python trả lời đúng."],
        ["`desktop-hub/tests/test_hub_discovery.py`", "Tìm máy bằng mã 4 số."],
        ["`desktop-hub/tests/test_contract.py`", "Phía Python khớp với hợp đồng chung."],
        ["`web/tests/e2e/alert-flow.cjs`", "Chạy thử từ đầu tới cuối: thí sinh tạo cảnh báo → giám thị nhận được."],
    ], [6.8, 9.8])
    w.p("Lệnh chạy:")
    w.code("Terminal", """
cd web && npm test                                                  # kiểm thử phía web
cd desktop-hub && python3 -m unittest discover -s tests -p "test_[hc]*.py" -v   # phía Python (macOS)
cd desktop-hub && python -m unittest discover -s tests -v           # phía Python (Windows, đầy đủ)
""", "dòng lệnh")


def part10(w):
    w.h1("10. Tự chạy thử và tập sửa code")
    w.h2("10.1. Chạy thử trên máy tính cá nhân")
    w.p("Cần cài **Node.js** (bản 22 hoặc 24) và **Python 3.9+**.")
    w.code("Terminal", """
cd web && npm ci && npm run build      # build giao diện ra web/out
cd ../desktop-hub
python3 run_hub.py                     # bật trung tâm LAN ở cổng 8765
""", "dòng lệnh")
    w.steps([
        "Mở Chrome vào `http://localhost:8765/thi-sinh`. Ô **Địa chỉ máy giám thị** nhập `localhost:8765` → **Kiểm tra kết nối** → điền thông tin → **Kiểm tra webcam và bắt đầu**.",
        "Mở `http://localhost:8765/giam-thi` ở **một cửa sổ Chrome riêng** (không phải tab mới, vì chuyển tab bị tính là “rời màn hình thi”).",
        "Rời khỏi webcam khoảng 5 giây → màn hình giám thị nhận cảnh báo “Không có mặt trước máy” kèm tiếng báo động.",
    ])
    w.h2("10.2. Bài tập thực hành")
    w.callout("tay", [
        "**Bài 1. Đổi ngưỡng góc quay đầu.** Mở `web/src/domain/thresholds.ts`, đổi `headYaw: 14` thành `headYaw: 20`.",
        "Chạy `npm test`. Em sẽ thấy **một bài kiểm thử báo lỗi** trong `domain.test.cjs`, vì bài đó đang “canh” giá trị 14. "
        "Đây chính là tác dụng của kiểm thử: **không ai sửa nhầm mà không biết**. Muốn đổi thật thì phải sửa cả bài kiểm thử, và nói rõ lý do.",
        "Nhớ **đổi lại 14** sau khi thử xong.",
    ], "THỬ TAY · BÀI 1")
    w.callout("tay", [
        "**Bài 2. Thêm phím bị hạn chế.** Mở `web/src/features/candidate/hooks/use-browser-guard.ts`, tìm `['c', 'v', 'x', 'p']`, thêm `'a'` (Ctrl+A = chọn tất cả).",
        "Build lại và chạy thử: đang giám sát mà bấm Ctrl+A thì phải có cảnh báo “Thao tác bàn phím bị hạn chế”.",
        "Câu hỏi suy nghĩ: vì sao bấm Ctrl+A hai lần liền nhau chỉ thấy **một** cảnh báo? (Gợi ý: mục 5.5.)",
    ], "THỬ TAY · BÀI 2")
    w.callout("tay", [
        "**Bài 3. Đổi tên hiển thị cảnh báo.** Mở `web/src/domain/alert-catalog.ts`, đổi chữ `'Không có mặt trước máy'` thành câu em thấy rõ hơn.",
        "Chú ý: chỉ đổi **chữ bên phải** dấu hai chấm. Không đổi mã `no_face` bên trái, vì mã đó nằm trong hợp đồng chung với Python.",
    ], "THỬ TAY · BÀI 3")
    w.callout("tay", [
        "**Bài 4. Đọc một bài kiểm thử.** Mở `web/tests/unit/behavior-engine.test.cjs`, tìm bài kiểm thử cho quay đầu.",
        "Tự giải thích: vòng `for (let t = 0; t < 3000; t += 100)` đang giả lập điều gì? (Gợi ý: mỗi 100 ms một khung hình, trong 3 giây.)",
    ], "THỬ TAY · BÀI 4")
    w.h2("10.3. Quy tắc an toàn khi sửa code")
    w.bullets([
        "**Không đổi tên trường dữ liệu** trong `web/src/domain/exam-types.ts` (như `roomId`, `stationId`) nếu chưa sửa tương ứng bên Python, vì đó là “hợp đồng” giữa hai bên.",
        "Đổi cổng, phiên bản, loại cảnh báo → sửa **cả hai phía** và `shared/hub-contract.json`, rồi chạy kiểm thử cả hai phía.",
        "Sửa xong luôn chạy `npm test` (và kiểm thử Python nếu sửa phía Python).",
        "Dùng Git: sửa trên một nhánh riêng, thử xong mới gộp.",
    ])


def part11(w):
    w.h1("11. Những con số cần thuộc lòng")
    w.p("Giám khảo rất hay hỏi “bao nhiêu giây?”, “cổng nào?”. Bảng này gom tất cả lại:")
    w.table(["Con số", "Ý nghĩa", "Nằm ở đâu"], [
        ["**478**", "Số điểm mốc MediaPipe đặt trên một khuôn mặt", "MediaPipe"],
        ["**2**", "Số khuôn mặt tối đa AI tìm (đủ để biết “có thêm người”)", "`face-landmarker-loader.ts`"],
        ["**80 ms / 160 ms**", "Nhịp vòng lặp AI (khoảng 12 / 6 lần mỗi giây, chế độ thường / máy yếu)", "`use-monitoring-session.ts`"],
        ["**5 / 2 / 3 / 5 giây**", "Ngưỡng không có mặt / nhiều mặt / quay hoặc cúi đầu / nhìn lệch", "`thresholds.ts`"],
        ["**12 giây**", "Thời gian nghỉ trước khi báo lại cùng loại (cooldown)", "`thresholds.ts`"],
        ["**14° / 20°**", "Giới hạn góc quay ngang / cúi ngẩng", "`thresholds.ts`"],
        ["**0,55 / 0,7**", "Giới hạn lệch mắt ngang / dọc (thang −1 đến 1)", "`thresholds.ts`"],
        ["**0,4 giây**", "Phải yên ổn chừng này bộ đếm mới về 0 (lọc nhiễu)", "`behavior-engine.ts`"],
        ["**1,5 giây**", "Hai khung hình cách nhau quá chừng này thì đếm lại từ đầu", "`behavior-engine.ts`"],
        ["**1–60 giây**", "Khoảng ngưỡng được phép chỉnh ở trang Quản trị", "`admin-settings.ts`"],
        ["**2 giây**", "Nhịp tim máy thí sinh; nhịp hô tìm máy", "`use-monitoring-session.ts`, `discovery.py`"],
        ["**1 giây**", "Màn hình giám thị hỏi dữ liệu mới", "`exam-sync.ts`"],
        ["**3 giây**", "Không có khung hình mới quá chừng này thì AI bị coi là “tạm dừng”", "`use-monitoring-session.ts`"],
        ["**7 giây**", "Không nhận nhịp tim quá chừng này thì máy bị coi là mất kết nối", "`event-filters.ts`"],
        ["**8765**", "Cổng HTTP của trung tâm LAN", "`config.py`, `hub-contract.json`"],
        ["**8766**", "Cổng UDP để tìm máy bằng mã", "`config.py`, `hub-contract.json`"],
        ["**4 chữ số**", "Mã kết nối, tạo ngẫu nhiên mỗi lần bật EXE", "`discovery.py`"],
        ["**500**", "Số cảnh báo tối đa trung tâm giữ trong bộ nhớ", "`config.py`"],
        ["**1,5 MB**", "Dữ liệu gửi lên tối đa mỗi lần (đủ kèm đoạn hình ngắn)", "`config.py`"],
        ["**7**", "Số loại cảnh báo (5 từ camera, 2 từ trình duyệt)", "`alert-catalog.ts`"],
    ], [3.4, 8.4, 4.8])


def part12(w):
    w.h1("12. Hạn chế thật sự và hướng phát triển")
    w.p("Giám khảo đánh giá rất cao học sinh **biết rõ điểm yếu của sản phẩm mình**. Đừng giấu, hãy nói rõ và kèm hướng cải tiến.")
    w.h2("12.1. Hạn chế về AI")
    w.bullets([
        "Kết quả phụ thuộc **webcam, ánh sáng, khoảng cách, tư thế ngồi**. Phòng tối hoặc ngược sáng thì AI có thể không thấy mặt.",
        "Góc quay đầu, cúi/ngẩng, hướng mắt là **ước tính**, không phải bằng chứng để kết luận vi phạm.",
        "**Không nhận diện điện thoại, tài liệu.** Cúi đầu lâu có thể chỉ là đang viết nháp.",
        "Ngưỡng hiện tại là **ngưỡng để trình diễn**, chưa được thử nghiệm bài bản trên nhiều học sinh, nhiều loại webcam.",
    ])
    w.h2("12.2. Hạn chế về kỹ thuật")
    w.bullets([
        "Bản LAN **chưa có đăng nhập**. Chỉ dùng trong mạng tin cậy của phòng máy, không mở cổng 8765/8766 ra Internet.",
        "Dữ liệu ca thi nằm trong **bộ nhớ** máy giáo viên: đóng EXE là mất (cần xuất báo cáo trước).",
        "**Ngưỡng chỉnh ở trang Quản trị chỉ lưu trên máy đang chỉnh.** Máy học sinh đọc cài đặt của chính nó, nên chỉnh ở máy giáo viên không tự áp dụng cho máy học sinh.",
        "Mới thử kỹ trên macOS và một số máy; **cần thử thêm với nhiều máy Windows thật** cùng kết nối một máy giáo viên.",
    ])
    w.h2("12.2b. Giám khảo bảo “quay vài đoạn ~15 phút…” — hiểu thế nào?")
    w.callout("canh", [
        "**Không phải** quay sẵn một file rồi đưa cho AI nhận diện thay webcam.",
        "**Đúng ý:** viết kịch bản → **thử trực tiếp** trước webcam → đếm đúng / báo nhầm / bỏ sót → chỉnh ngưỡng → **thử lại đúng kịch bản**; "
        "đồng thời **quay lại quá trình** kiểm thử và chỉnh ngưỡng (màn hình / góc phòng) làm bằng chứng. Thử thêm thiếu sáng, đeo kính, ngồi lệch camera.",
    ])
    w.p("Chi tiết từng bước và mẫu bảng số liệu: xem tài liệu phần cải tiến / kế hoạch cải tiến.")
    w.callout("canh", [
        "**Điểm nhỏ giám khảo có thể hỏi:**",
        "• Công tắc “Lưu đoạn hình ngắn khi cảnh báo” đã **nối thật** (clip ~5 giây khi bật; nếu trình duyệt không ghi được video thì gửi chuỗi ảnh). Mặc định tắt vì quyền riêng tư.",
        "• Ô “đồng ý giám sát” trên trang thí sinh đang được **tích sẵn**. Thí sinh vẫn phải bấm nút bắt đầu thì webcam mới bật, nhưng cách làm chuẩn hơn là để trống cho thí sinh tự tích.",
    ])
    w.h2("12.3. Hướng phát triển")
    w.bullets([
        "Tiếp tục buổi thử trực tiếp theo kịch bản; đo tỉ lệ báo đúng / báo nhầm / bỏ sót ở nhiều webcam và điều kiện ánh sáng.",
        "Ngưỡng gửi từ máy giáo viên xuống mọi máy học sinh (hiện mỗi máy vẫn tự lưu ngưỡng của mình).",
        "Thêm **đăng nhập, phân quyền**, mã bí mật cho mỗi ca thi; lưu dữ liệu ra file để không mất khi tắt máy.",
        "Đếm **số lần liếc ngắn lặp lại** trong một khoảng thời gian (chống “lách” bằng cách liếc dưới ngưỡng nhiều lần).",
        "Cân nhắc gắn thuật toán nhìn khác vào đường dự phòng `future-custom` (xem mục 5.1b), cân nhắc kỹ quyền riêng tư và độ chính xác.",
    ])


def part13(w):
    w.h1("13. Bộ câu hỏi vấn đáp")
    w.p("Các câu trả lời dưới đây viết theo kiểu **nói**, ngắn gọn. Em nên tập nói lại **bằng lời của mình** chứ không đọc thuộc.")
    groups = [
        ("A. Tổng quan dự án", [
            ("Dự án của em giải quyết vấn đề gì?",
             "Trong phòng thi tin học, một giám thị phải trông hàng chục thí sinh nên dễ bỏ sót các dấu hiệu ngắn như rời chỗ, có người ngồi cùng, quay đầu lâu. "
             "AI ExamGuard là trợ lý quan sát: webcam mỗi máy dùng AI theo dõi khuôn mặt và báo cho giám thị khi một dấu hiệu kéo dài đủ lâu.", None),
            ("Sản phẩm khác gì một camera an ninh?",
             "Camera an ninh chỉ ghi hình, vẫn cần người ngồi xem. Sản phẩm của em **tự phân tích** và chỉ báo khi có dấu hiệu kéo dài. Nó cũng **không ghi, không gửi video**, chỉ gửi con số và cảnh báo.", None),
            ("AI có kết luận học sinh gian lận không?",
             "Không. AI chỉ đưa ra **nghi vấn**: “máy này cần xem”. Giám thị tới tận nơi và quyết định theo quy chế. Vì góc đầu, hướng mắt chỉ là ước tính, "
             "và quay đầu có thể vì lý do bình thường, nên con người phải là người kết luận.", "Câu này gần như chắc chắn bị hỏi. Hãy nhấn mạnh nguyên tắc “con người xác minh”."),
            ("Ai là người dùng sản phẩm?",
             "Ba nhóm: **thí sinh** (trang Thí sinh, bật webcam), **giám thị** (trang Giám thị, nhận cảnh báo) và **nhà trường** (trang Quản trị, chỉnh ngưỡng).", None),
        ]),
        ("B. Về trí tuệ nhân tạo", [
            ("Em dùng AI gì? Có tự huấn luyện mô hình không?",
             "Em dùng **MediaPipe Face Landmarker** của Google, một mô hình **đã được huấn luyện sẵn**, trả về 478 điểm mốc trên khuôn mặt. "
             "Nhóm em **không tự huấn luyện** mô hình. Phần nhóm tự làm là: dùng các điểm mốc để **tính góc đầu và hướng mắt**, và thiết kế **bộ luật thời gian** để quyết định khi nào cảnh báo.",
             "Nói thật phần nào dùng sẵn, phần nào tự làm. Giám khảo đánh giá cao sự trung thực."),
            ("Làm sao AI biết em đang quay đầu?",
             "AI lấy vị trí **mũi** so với **điểm giữa hai má**. Nhìn thẳng thì mũi nằm giữa; quay đầu thì mũi lệch sang một bên. Độ lệch được chia cho bề rộng mặt rồi quy ra góc ước tính. Vượt 14° là bất thường.", None),
            ("Làm sao biết nhìn ra ngoài màn hình?",
             "AI xem **tròng đen nằm ở đâu trong khóe mắt**. Ở giữa là nhìn thẳng; lệch hẳn về một phía là nhìn ra ngoài. Lệch ngang quá 0,55 hoặc dọc quá 0,7 (trên thang −1 đến 1) và kéo dài 5 giây thì cảnh báo.", None),
            ("Làm sao phát hiện có người thứ hai?",
             "AI được cài để tìm tối đa **2 khuôn mặt**. Thấy từ 2 khuôn mặt liên tục **2 giây** thì cảnh báo đỏ “Xuất hiện nhiều khuôn mặt”.", None),
            ("Tại sao không báo ngay khi vừa quay đầu?",
             "Để **tránh báo nhầm**. Học sinh vươn vai, liếc đồng hồ là chuyện bình thường. Bộ đếm chỉ báo khi dấu hiệu kéo dài liên tục đủ ngưỡng; "
             "nhiễu ngắn dưới 0,4 giây được bỏ qua; camera đứng hình quá 1,5 giây thì đếm lại; báo xong phải nghỉ 12 giây mới báo lại cùng loại.", None),
            ("Độ chính xác của AI là bao nhiêu phần trăm?",
             "Nhóm em **chưa đo bài bản** trên nhiều người nên không đưa ra con số phần trăm. Các góc chỉ là ước tính và ngưỡng hiện tại để trình diễn. "
             "Hướng tiếp theo là thử với nhiều học sinh, nhiều webcam, ghi lại tỉ lệ báo đúng và báo nhầm để chỉnh ngưỡng.",
             "Tuyệt đối **không bịa** con số. Nói “chưa đo” kèm kế hoạch đo là câu trả lời tốt."),
            ("Phòng tối, đeo kính, đeo khẩu trang thì sao?",
             "AI có thể không thấy mặt hoặc đo kém chính xác. Khi đó máy sẽ báo “không có mặt” và giám thị tới xem. "
             "Vì vậy trước giờ thi nên kiểm tra ánh sáng và đặt webcam ngang tầm mặt.", None),
            ("Có phát hiện điện thoại, tài liệu không?",
             "Không. AI chỉ phân tích khuôn mặt. Cúi đầu lâu thì có cảnh báo, nhưng đó có thể chỉ là viết nháp, nên giám thị cần tới xem.", None),
            ("AI chạy ở đâu? Máy yếu có chạy được không?",
             "AI chạy **ngay trong máy thí sinh**, ưu tiên card đồ họa, không có thì chạy bằng CPU. Có **chế độ máy yếu**: giảm từ khoảng 12 xuống khoảng 6 lần phân tích mỗi giây.", None),
            ("Không có Internet thì AI có chạy không?",
             "Có. File mô hình được đóng kèm trong phần mềm (`web/public/mediapipe`), nên không cần tải từ Internet.", None),
        ]),
        ("C. Về mạng và kỹ thuật", [
            ("Các máy nói chuyện với nhau bằng cách nào?",
             "Qua mạng LAN bằng giao thức **HTTP** ở cổng **8765**. Máy thí sinh gửi nhịp tim 2 giây/lần và gửi cảnh báo khi có. Màn hình giám thị hỏi dữ liệu mới mỗi giây.", None),
            ("Mã kết nối 4 số hoạt động thế nào?",
             "Khi trang Giám thị đang mở, máy giáo viên cứ 2 giây phát một **gói tin quảng bá UDP** ở cổng **8766**, chứa mã, tên phòng và cổng. "
             "EXE trên máy học sinh nghe được và ghi nhớ. Học sinh gõ đúng mã thì trang thí sinh biết ngay địa chỉ máy giáo viên.", None),
            ("Nếu Wi-Fi chặn gói quảng bá thì sao?",
             "Học sinh gõ địa chỉ máy giáo viên (ví dụ `http://192.168.1.10:8765`) thay cho mã. Địa chỉ này hiện sẵn trên màn hình giám thị.", None),
            ("Mất mạng giữa giờ thi thì cảnh báo có mất không?",
             "Không. Cảnh báo nằm trong **hộp thư đi** (lưu trong trình duyệt, tải lại trang vẫn còn) và tự gửi lại khi có mạng. "
             "Mỗi cảnh báo có mã riêng nên máy giám thị không nhận trùng.", None),
            ("Làm sao biết một máy bị tắt hoặc rút mạng?",
             "Máy thí sinh gửi nhịp tim 2 giây/lần. Quá **7 giây** không nhận được thì máy đó chuyển **màu xám, mất kết nối**.", None),
            ("Nhiều máy gửi cùng lúc có bị lỗi không?",
             "Máy chủ Python xử lý mỗi yêu cầu ở một **luồng** riêng, và dùng **khóa** (`data_lock`) để các luồng lần lượt sửa dữ liệu, không giành nhau. "
             "Mỗi cảnh báo thường nhẹ; khi bật lưu đoạn hình thì có thêm clip ngắn, giới hạn khoảng 1,5 MB mỗi lần gửi.", None),
            ("Vì sao phải dùng EXE mà không mở bằng trình duyệt?",
             "Trình duyệt chỉ cho bật webcam ở địa chỉ an toàn: `localhost` hoặc HTTPS. EXE mở giao diện từ `127.0.0.1` của chính máy đó nên webcam chạy được.", None),
            ("Tại sao dùng hai ngôn ngữ TypeScript và Python?",
             "TypeScript (Next.js, React) làm giao diện và chạy AI **ngay trong trình duyệt**. Python làm máy chủ LAN chỉ bằng **thư viện có sẵn**, và đóng gói thành EXE dễ dàng bằng PyInstaller.", None),
            ("Làm sao hai phần viết bằng hai ngôn ngữ không bị lệch nhau?",
             "Có file **hợp đồng chung** `shared/hub-contract.json` ghi cổng, phiên bản, loại cảnh báo, trường bắt buộc. Kiểm thử tự động ở **cả hai phía** đối chiếu với file này.", None),
            ("Dữ liệu được lưu ở đâu?",
             "Trong **bộ nhớ** của máy giáo viên (tối đa 500 cảnh báo mới nhất). Đóng EXE là mất, nên cuối ca phải bấm **Xuất báo cáo CSV**.", None),
            ("Em kiểm tra phần mềm chạy đúng bằng cách nào?",
             "Có kiểm thử tự động: phía web chạy `npm test` (bộ đếm, công thức góc, xuất CSV…), phía Python chạy `unittest` (các API, tìm máy, hợp đồng chung), "
             "và một bài chạy thử từ đầu tới cuối: thí sinh tạo cảnh báo, giám thị nhận được.", None),
        ]),
        ("D. Quyền riêng tư và an toàn", [
            ("Phần mềm có lưu video hay ảnh của học sinh không?",
             "Không. Ảnh từ webcam chỉ được AI phân tích ngay trên máy rồi bỏ đi. Thứ gửi đi chỉ là vài con số và cảnh báo.", None),
            ("Có nhận diện học sinh là ai bằng khuôn mặt không?",
             "Không. Phần mềm chỉ đếm khuôn mặt và đo hướng nhìn, không so sánh khuôn mặt với ai. Họ tên, số báo danh do thí sinh tự khai để giám thị đối chiếu.", None),
            ("Học sinh có thể qua mặt phần mềm không, ví dụ tắt EXE, che webcam?",
             "Không chặn được tuyệt đối, nhưng mọi thứ để lại dấu vết: tắt EXE hoặc rút mạng thì 7 giây sau máy chuyển xám; che webcam thì 5 giây sau báo “không có mặt”; "
             "chuyển cửa sổ thì báo ngay. Mục tiêu là giúp giám thị biết **nhìn vào đâu**, không thay giám thị.", None),
            ("Người xấu trong mạng có gửi cảnh báo giả được không?",
             "Có thể, vì bản LAN **chưa có đăng nhập**, mã 4 số cũng không phải mật khẩu. Vì vậy phần mềm chỉ dành cho mạng tin cậy của phòng máy, không mở ra Internet. "
             "Hướng phát triển là thêm mã bí mật cho mỗi ca thi và đăng nhập cho giám thị.", "Thừa nhận thẳng thắn + nêu hướng khắc phục."),
        ]),
        ("E. Câu hỏi “bẫy” và câu hỏi mở", [
            ("Nếu em liếc nhiều lần, mỗi lần 2 giây, thì sao?",
             "Mỗi lần dưới ngưỡng 3 giây nên chưa có cảnh báo. Đây là hạn chế em đã biết. Nhưng trang giám thị vẫn hiện **tiến trình bộ đếm** của từng máy, "
             "và giám thị vẫn đi lại trong phòng. Hướng cải tiến là đếm **số lần liếc lặp lại** trong một khoảng thời gian.", None),
            ("Hai bạn ngồi sát nhau, camera thấy cả mặt bạn bên cạnh thì sao?",
             "Sẽ báo “nhiều khuôn mặt”. Cần bố trí webcam và chỗ ngồi hợp lý; còn nếu vẫn báo thì giám thị tới xem và đánh dấu đã xác minh.", None),
            ("Sao không dùng máy chủ trên Internet (đám mây)?",
             "Dự án có hỗ trợ Firebase làm tùy chọn, nhưng chọn LAN làm chính vì phòng thi thường không có Internet, dữ liệu không ra khỏi trường, và không tốn chi phí máy chủ.", None),
            ("Em đã dùng công cụ AI để làm dự án như thế nào?",
             "Nhóm em chia dự án thành nhiều bước nhỏ, viết câu lệnh mô tả cho công cụ AI hỗ trợ lập trình ở từng bước, rồi **đọc hiểu, chạy thử, kiểm thử và sửa** kết quả. "
             "Mỗi bước được đối chiếu với code trong tài liệu `docs/ky-thuat/doi-chieu-32-buoc.md`.",
             "Tên công cụ AI phải **khớp với hồ sơ dự thi** đã nộp. Thống nhất với thầy cô trước ngày thi."),
            ("Nếu được làm tiếp 3 tháng, em sẽ làm gì?",
             "Thử nghiệm thật ở vài phòng máy để đo tỉ lệ báo đúng/báo nhầm và chỉnh ngưỡng; gửi ngưỡng từ máy giáo viên xuống máy học sinh; thêm đăng nhập và lưu dữ liệu ra file.", None),
            ("Phần nào trong dự án em thấy khó nhất?",
             "Gợi ý: **bộ đếm thời gian chống báo nhầm**: phải cân bằng giữa báo kịp thời và không làm phiền giám thị; "
             "hoặc **tìm máy bằng mã 4 số**: phải hiểu cách gói tin quảng bá đi trong mạng LAN.",
             "Chọn phần **chính em hiểu rõ nhất** để kể, kèm một khó khăn cụ thể và cách nhóm vượt qua."),
        ]),
    ]
    number = 0
    for title, items in groups:
        w.h2(title)
        for question, answer, tip in items:
            number += 1
            w.qa(number, question, answer, tip)


def part14(w):
    w.h1("14. Chuẩn bị cho buổi vấn đáp")
    w.h2("14.1. Gợi ý phân công trong nhóm")
    w.p("Mỗi bạn **nắm chắc một phần** để trả lời chính, nhưng ai cũng phải kể được phần tổng quan (phần 1–3).")
    w.table(["Vai trò", "Phần phụ trách", "File phải mở được ngay"], [
        ["Bạn 1: Tổng quan và trình diễn", "Bài toán, nguyên tắc, chạy demo, hạn chế", "`README.md`, trang Thí sinh và Giám thị"],
        ["Bạn 2: AI", "MediaPipe (chỉ nhìn), vision-provider (ổ cắm dự phòng), bộ đếm, ngưỡng", "`vision-provider.ts`, `face-metrics.ts`, `behavior-engine.ts`, `thresholds.ts`"],
        ["Bạn 3: Mạng và máy chủ", "API, hộp thư đi, máy chủ Python, mã 4 số, EXE", "`outbox.ts`, `http_handler.py`, `exam_store.py`, `discovery.py`"],
    ], [4.6, 6.0, 6.0])
    w.h2("14.2. Danh sách kiểm tra trước ngày thi")
    w.bullets([
        "Kể được dự án trong **30 giây** và trong **3 phút**.",
        "Tự vẽ lại được sơ đồ toàn cảnh (Hình 1) và dây chuyền 6 bước (Hình 3) ra giấy, không cần nhìn.",
        "Thuộc bảng **những con số** ở phần 11.",
        "Mở đúng file khi được hỏi “phần này nằm ở đâu?” (bảng mục 4.2).",
        "Chạy thử được demo: thí sinh rời webcam 5 giây → giám thị nhận cảnh báo và có tiếng bíp.",
        "Có phương án dự phòng: video quay sẵn màn hình demo, trường hợp phòng thi không có webcam hoặc mạng.",
        "Đã thống nhất với thầy cô tên công cụ AI ghi trong hồ sơ.",
        "Biết trả lời “em chưa đo / chưa làm, hướng phát triển là…” cho các câu về độ chính xác và bảo mật.",
    ])
    w.callout("nho", "Khi không biết câu trả lời: **đừng bịa**. Hãy nói “Phần này em chưa tìm hiểu sâu; theo em hiểu thì…, và em sẽ kiểm tra lại trong code ở file…”. "
              "Một câu trả lời trung thực luôn được đánh giá cao hơn một câu trả lời sai mà tự tin.")


def glossary(w):
    w.h1("Phụ lục: Từ điển thuật ngữ")
    w.table(["Thuật ngữ", "Giải thích dễ hiểu"], [
        ["AI (trí tuệ nhân tạo)", "Chương trình máy tính làm được việc giống con người, ở đây là “nhìn” và nhận ra khuôn mặt."],
        ["Mô hình AI", "File “bộ não” đã được dạy sẵn bằng rất nhiều ví dụ. Dự án dùng mô hình `face_landmarker.task` của Google."],
        ["MediaPipe", "Bộ công cụ AI miễn phí của Google; Face Landmarker tìm điểm mốc khuôn mặt. Chỉ tầng NHÌN — không kết luận gian lận."],
        ["Tầng NHÌN / perception", "Phần đọc camera thành con số (số mặt, góc đầu, hướng mắt). Hiện dùng MediaPipe."],
        ["Behavior Engine", "Tầng đếm thời gian + ngưỡng để tạo cảnh báo. Không phải MediaPipe."],
        ["vision-provider / đường dự phòng", "Cửa duy nhất từ mô hình nhìn → VisionMetrics. Có chỗ `future-custom` để sau này gắn thuật toán khác mà không viết lại cả hệ thống."],
        ["future-custom", "Nhánh dự phòng trong vision-provider: chưa gắn thuật toán thật; bật nhầm sẽ báo lỗi rõ ràng."],
        ["Điểm mốc (landmark)", "Một chấm có tọa độ trên khuôn mặt (mũi, mắt, cằm…). Có 478 điểm."],
        ["Khung hình (frame)", "Một tấm ảnh trong chuỗi video."],
        ["FPS", "Số khung hình xử lý mỗi giây."],
        ["GPU / CPU", "Card đồ họa / bộ xử lý chính của máy. GPU tính AI nhanh hơn."],
        ["Ngưỡng (threshold)", "Mốc giới hạn để quyết định: vượt góc 14°, kéo dài 3 giây…"],
        ["Cooldown", "Thời gian nghỉ (12 giây) trước khi báo lại cùng một loại cảnh báo."],
        ["Behavior Engine", "Bộ đếm thời gian hành vi, quyết định khi nào dấu hiệu đủ lâu để cảnh báo."],
        ["Nhịp tim (heartbeat)", "Tin nhắn ngắn máy thí sinh gửi mỗi 2 giây để báo “tôi vẫn đang chạy”."],
        ["LAN", "Mạng nội bộ của các máy trong cùng phòng hoặc cùng trường."],
        ["Địa chỉ IP", "“Số nhà” của máy trong mạng, ví dụ 192.168.1.10. `127.0.0.1` nghĩa là “chính máy này”."],
        ["Cổng (port)", "“Số phòng” trong một máy; mỗi chương trình nghe ở một cổng. Dự án dùng 8765 và 8766."],
        ["localhost", "Tên gọi khác của chính máy mình (127.0.0.1)."],
        ["HTTP / HTTPS", "Cách trình duyệt và máy chủ nói chuyện. HTTPS là bản có mã hóa."],
        ["UDP quảng bá (broadcast)", "Gửi một gói tin ngắn cho mọi máy trong mạng cùng lúc, như loa phát thanh."],
        ["Máy chủ / hub", "Chương trình đứng chờ và trả lời yêu cầu. Ở đây là trung tâm LAN trên máy giáo viên."],
        ["API", "Các “cửa giao dịch” mà máy chủ mở ra cho chương trình khác gọi tới."],
        ["GET / POST / PATCH", "Hỏi lấy dữ liệu / nộp dữ liệu mới / sửa một phần dữ liệu."],
        ["JSON", "Cách viết dữ liệu dạng chữ có cấu trúc: `{\"tên\": \"giá trị\"}`."],
        ["Polling", "Cách hỏi đều đặn theo nhịp (mỗi 1 giây) để lấy dữ liệu mới."],
        ["localStorage", "Ngăn nhớ nhỏ của trình duyệt; tắt trang, tải lại trang vẫn còn."],
        ["Hộp thư đi (outbox)", "Hàng chờ cảnh báo chưa gửi được, tự gửi lại khi có mạng."],
        ["Luồng (thread)", "Một “công nhân” trong chương trình, làm việc song song với các công nhân khác."],
        ["Khóa (lock)", "Cơ chế cho các luồng lần lượt sửa dữ liệu chung, tránh giành nhau."],
        ["Frontend / Backend", "Phần người dùng nhìn thấy (giao diện) / phần chạy phía sau (máy chủ)."],
        ["TypeScript", "Ngôn ngữ lập trình web, là JavaScript có thêm kiểm tra kiểu dữ liệu."],
        ["Next.js / React", "Bộ công cụ để làm giao diện web nhiều trang."],
        ["Hook (React)", "Hàm đặc biệt giúp màn hình nhớ dữ liệu và tự vẽ lại khi dữ liệu đổi, ví dụ `useMonitoringSession`."],
        ["Python", "Ngôn ngữ lập trình dùng cho máy chủ LAN."],
        ["PyInstaller", "Công cụ gói chương trình Python thành một file EXE."],
        ["Edge WebView2 / pywebview", "Thành phần hiển thị trang web bên trong cửa sổ ứng dụng Windows."],
        ["Firebase", "Dịch vụ lưu dữ liệu trên Internet của Google (tùy chọn trong dự án)."],
        ["CSV", "File bảng dạng chữ, mở được bằng Excel."],
        ["Kiểm thử (test)", "Đoạn code tự động kiểm tra code chính chạy đúng."],
        ["Hợp đồng (contract)", "File `shared/hub-contract.json` ghi các giá trị hai phần mềm phải giống nhau."],
        ["Build", "Biến mã nguồn thành sản phẩm chạy được (thư mục `web/out`, file EXE)."],
        ["Git", "Công cụ lưu lịch sử thay đổi của code."],
    ], [4.6, 12.0])


def build():
    figs = draw_all()
    w = Writer()
    cover(w)
    toc(w)
    part0(w)
    part1(w)
    part2(w, figs)
    part3(w, figs)
    part4(w, figs)
    part5(w, figs)
    part6(w, figs)
    part7(w, figs)
    part8(w, figs)
    part9(w)
    part10(w)
    part11(w)
    part12(w)
    part13(w)
    part14(w)
    glossary(w)
    return w.save()


if __name__ == "__main__":
    print(build())
