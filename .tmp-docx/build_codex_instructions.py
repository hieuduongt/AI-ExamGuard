from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_1 = ROOT / "tai-lieu" / "Huong_Dan_Xay_Dung_AI_ExamGuard_Python_Cho_Codex.docx"
OUTPUT_2 = ROOT / "DU_AN_PYTHON" / "tai_lieu" / "Huong_Dan_Xay_Dung_AI_ExamGuard_Python_Cho_Codex.docx"

NAVY = "0B2545"
BLUE = "2E74B5"
DARK_BLUE = "1F4D78"
MUTED = "5C6B7A"
LIGHT_BLUE = "E8EEF5"
PALE_BLUE = "F2F7FC"
PALE_GREEN = "EDF8F2"
GREEN = "16794A"
GOLD = "A66A00"
BODY = "1F2937"
WHITE = "FFFFFF"
BORDER = "D5DDE8"


def set_run_font(run, name="Calibri", size=None, color=None, bold=None, italic=None):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = RGBColor.from_string(color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def set_cell_margins(cell, top=80, start=120, bottom=80, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for edge, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def shade_cell(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def configure_table(table, widths_dxa, header_fill=LIGHT_BLUE):
    assert sum(widths_dxa) == 9360
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    table.allow_autofit = False

    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), "9360")
    tbl_w.set(qn("w:type"), "dxa")

    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), "120")
    tbl_ind.set(qn("w:type"), "dxa")

    tbl_layout = tbl_pr.find(qn("w:tblLayout"))
    if tbl_layout is None:
        tbl_layout = OxmlElement("w:tblLayout")
        tbl_pr.append(tbl_layout)
    tbl_layout.set(qn("w:type"), "fixed")

    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), "4")
        tag.set(qn("w:color"), BORDER)

    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths_dxa:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)

    for row_index, row in enumerate(table.rows):
        for col_index, cell in enumerate(row.cells):
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cell.width = Inches(widths_dxa[col_index] / 1440)
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:w"), str(widths_dxa[col_index]))
            tc_w.set(qn("w:type"), "dxa")
            set_cell_margins(cell)
            if row_index == 0:
                shade_cell(cell, header_fill)
        if row_index == 0:
            set_repeat_table_header(row)


def add_numbering_definition(document, *, kind, marker):
    numbering = document.part.numbering_part.element
    abstract_ids = [int(node.get(qn("w:abstractNumId"))) for node in numbering.findall(qn("w:abstractNum"))]
    num_ids = [int(node.get(qn("w:numId"))) for node in numbering.findall(qn("w:num"))]
    abstract_id = max(abstract_ids, default=0) + 1
    num_id = max(num_ids, default=0) + 1

    abstract = OxmlElement("w:abstractNum")
    abstract.set(qn("w:abstractNumId"), str(abstract_id))
    multi = OxmlElement("w:multiLevelType")
    multi.set(qn("w:val"), "singleLevel")
    abstract.append(multi)
    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), "0")
    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")
    lvl.append(start)
    num_fmt = OxmlElement("w:numFmt")
    num_fmt.set(qn("w:val"), kind)
    lvl.append(num_fmt)
    lvl_text = OxmlElement("w:lvlText")
    lvl_text.set(qn("w:val"), marker)
    lvl.append(lvl_text)
    lvl_jc = OxmlElement("w:lvlJc")
    lvl_jc.set(qn("w:val"), "left")
    lvl.append(lvl_jc)
    p_pr = OxmlElement("w:pPr")
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "num")
    tab.set(qn("w:pos"), "540")
    tabs.append(tab)
    p_pr.append(tabs)
    ind = OxmlElement("w:ind")
    ind.set(qn("w:left"), "540")
    ind.set(qn("w:hanging"), "271")
    p_pr.append(ind)
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:after"), "80")
    spacing.set(qn("w:line"), "300")
    spacing.set(qn("w:lineRule"), "auto")
    p_pr.append(spacing)
    lvl.append(p_pr)
    if kind == "bullet":
        r_pr = OxmlElement("w:rPr")
        fonts = OxmlElement("w:rFonts")
        fonts.set(qn("w:ascii"), "Arial")
        fonts.set(qn("w:hAnsi"), "Arial")
        r_pr.append(fonts)
        lvl.append(r_pr)
    abstract.append(lvl)
    first_num = numbering.find(qn("w:num"))
    if first_num is None:
        numbering.append(abstract)
    else:
        numbering.insert(list(numbering).index(first_num), abstract)

    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))
    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), str(abstract_id))
    num.append(abstract_ref)
    numbering.append(num)
    return num_id


def assign_numbering(paragraph, num_id):
    p_pr = paragraph._p.get_or_add_pPr()
    num_pr = p_pr.find(qn("w:numPr"))
    if num_pr is None:
        num_pr = OxmlElement("w:numPr")
        p_pr.append(num_pr)
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), "0")
    num_id_node = OxmlElement("w:numId")
    num_id_node.set(qn("w:val"), str(num_id))
    num_pr.append(ilvl)
    num_pr.append(num_id_node)


def add_bullet(document, num_id, text, bold_prefix=None):
    paragraph = document.add_paragraph()
    assign_numbering(paragraph, num_id)
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(4)
    paragraph.paragraph_format.line_spacing = 1.25
    if bold_prefix and text.startswith(bold_prefix):
        first = paragraph.add_run(bold_prefix)
        first.bold = True
        paragraph.add_run(text[len(bold_prefix):])
    else:
        paragraph.add_run(text)
    return paragraph


def add_numbered(document, num_id, title, detail):
    paragraph = document.add_paragraph()
    assign_numbering(paragraph, num_id)
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(4)
    paragraph.paragraph_format.line_spacing = 1.25
    title_run = paragraph.add_run(f"{title}: ")
    title_run.bold = True
    paragraph.add_run(detail)
    return paragraph


def set_paragraph_shading(paragraph, fill, left_border=None):
    p_pr = paragraph._p.get_or_add_pPr()
    shd = p_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        p_pr.append(shd)
    shd.set(qn("w:fill"), fill)
    if left_border:
        p_bdr = p_pr.find(qn("w:pBdr"))
        if p_bdr is None:
            p_bdr = OxmlElement("w:pBdr")
            p_pr.append(p_bdr)
        left = OxmlElement("w:left")
        left.set(qn("w:val"), "single")
        left.set(qn("w:sz"), "18")
        left.set(qn("w:space"), "8")
        left.set(qn("w:color"), left_border)
        p_bdr.append(left)


def add_callout(document, label, text, fill=PALE_BLUE, accent=BLUE):
    paragraph = document.add_paragraph(style="Callout")
    set_paragraph_shading(paragraph, fill, accent)
    lead = paragraph.add_run(f"{label}: ")
    lead.bold = True
    lead.font.color.rgb = RGBColor.from_string(accent)
    paragraph.add_run(text)
    return paragraph


def add_page_field(paragraph):
    run = paragraph.add_run()
    fld_char_begin = OxmlElement("w:fldChar")
    fld_char_begin.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char_end = OxmlElement("w:fldChar")
    fld_char_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_begin)
    run._r.append(instr_text)
    run._r.append(fld_char_end)
    set_run_font(run, size=9, color=MUTED)


def configure_styles(document):
    styles = document.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor.from_string(BODY)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.25

    title = styles["Title"]
    title.font.name = "Calibri"
    title._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    title._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    title.font.size = Pt(30)
    title.font.bold = True
    title.font.color.rgb = RGBColor.from_string(NAVY)
    title.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_before = Pt(0)
    title.paragraph_format.space_after = Pt(8)
    title_p_pr = title._element.get_or_add_pPr()
    title_border = title_p_pr.find(qn("w:pBdr"))
    if title_border is not None:
        title_p_pr.remove(title_border)

    subtitle = styles["Subtitle"]
    subtitle.font.name = "Calibri"
    subtitle._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    subtitle._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    subtitle.font.size = Pt(15)
    subtitle.font.color.rgb = RGBColor.from_string("2B5163")
    subtitle.font.italic = False
    subtitle.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(12)

    heading_specs = {
        "Heading 1": (16, BLUE, 18, 10),
        "Heading 2": (13, BLUE, 14, 7),
        "Heading 3": (12, DARK_BLUE, 10, 5),
    }
    for name, (size, color, before, after) in heading_specs.items():
        style = styles[name]
        style.font.name = "Calibri"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    lead = styles.add_style("Lead", 1)
    lead.base_style = normal
    lead.font.size = Pt(12.5)
    lead.font.color.rgb = RGBColor.from_string(NAVY)
    lead.paragraph_format.space_after = Pt(10)
    lead.paragraph_format.line_spacing = 1.25

    callout = styles.add_style("Callout", 1)
    callout.base_style = normal
    callout.font.size = Pt(10.5)
    callout.paragraph_format.left_indent = Inches(0.14)
    callout.paragraph_format.right_indent = Inches(0.08)
    callout.paragraph_format.space_before = Pt(5)
    callout.paragraph_format.space_after = Pt(10)
    callout.paragraph_format.line_spacing = 1.2


def configure_section_geometry(section):
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(1)
    section.right_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)


def configure_page(document):
    document.settings.odd_and_even_pages_header_footer = True
    section = document.sections[0]
    configure_section_geometry(section)
    section.different_first_page_header_footer = False
    section.header.paragraphs[0].text = ""
    section.even_page_header.paragraphs[0].text = ""
    section.footer.paragraphs[0].text = ""
    section.even_page_footer.paragraphs[0].text = ""


def populate_running_header(header):
    p = header.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run("AI EXAMGUARD  |  TÀI LIỆU MÔ TẢ HỆ THỐNG")
    set_run_font(run, size=8.5, color=MUTED, bold=True)


def populate_running_footer(footer):
    p = footer.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run("AI ExamGuard  •  Trang ")
    set_run_font(run, size=9, color=MUTED)
    add_page_field(p)


def start_body_section(document):
    section = document.add_section(WD_SECTION.NEW_PAGE)
    configure_section_geometry(section)
    section.different_first_page_header_footer = False
    section.header.is_linked_to_previous = False
    section.even_page_header.is_linked_to_previous = False
    section.footer.is_linked_to_previous = False
    section.even_page_footer.is_linked_to_previous = False
    populate_running_header(section.header)
    populate_running_header(section.even_page_header)
    populate_running_footer(section.footer)
    populate_running_footer(section.even_page_footer)


def add_cover(document):
    for _ in range(2):
        document.add_paragraph().paragraph_format.space_after = Pt(14)
    kicker = document.add_paragraph()
    kicker.alignment = WD_ALIGN_PARAGRAPH.CENTER
    kicker.paragraph_format.space_after = Pt(14)
    set_run_font(kicker.add_run("TÀI LIỆU HƯỚNG DẪN KỸ THUẬT & MẪU PROMPT CHO AI"), size=11, color=GOLD, bold=True)
    document.add_paragraph("AI EXAMGUARD PYTHON", style="Title")
    document.add_paragraph("Hướng dẫn chi tiết từng bước xây dựng ứng dụng bằng OpenAI Codex", style="Subtitle")
    tagline = document.add_paragraph()
    tagline.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tagline.paragraph_format.space_before = Pt(6)
    tagline.paragraph_format.space_after = Pt(40)
    set_run_font(tagline.add_run("Dành cho người không chuyên lập trình • Copy & Paste 5 bước • Đóng gói 1-Click .exe"), size=10.5, color=MUTED, italic=True)

    info = document.add_paragraph()
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    info.paragraph_format.space_after = Pt(6)
    set_run_font(info.add_run("Phiên bản tài liệu 1.0 (Python Desktop)"), size=10.5, color=NAVY, bold=True)
    date = document.add_paragraph()
    date.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date.paragraph_format.space_after = Pt(4)
    set_run_font(date.add_run("Ngày 01 tháng 09 năm 2026"), size=10, color=MUTED)


def add_intro(document):
    document.add_heading("1. Tổng quan & Mục đích tài liệu", level=1)
    document.add_paragraph(
        "Tài liệu này được biên soạn nhằm cung cấp toàn bộ quy trình, kiến trúc kỹ thuật và đặc biệt là 5 mẫu câu lệnh (Prompt) chuẩn "
        "để bạn chỉ cần sao chép và dán trực tiếp vào OpenAI Codex hoặc trợ lý AI nhằm tự động xây dựng hệ thống giám sát thi AI ExamGuard bằng Python."
    ).style = "Lead"
    add_callout(
        document,
        "Nguyên tắc thực hiện",
        "Bạn không cần biết lập trình. Hãy mở một khung chat mới với Codex/AI, gửi lần lượt từ Bước 1 đến Bước 5. AI sẽ tự động sinh mã nguồn, tải tài nguyên AI ngoại tuyến và đóng gói thành file .exe hoàn chỉnh.",
        fill=PALE_GREEN,
        accent=GREEN,
    )
    document.add_heading("1.1. Kiến trúc hệ thống Python Desktop", level=2)
    add_bullet(document, BULLET_ID, "Python App Runner (main.py): Khởi tạo cửa sổ Desktop chuẩn Windows bằng Microsoft Edge WebView2 qua thư viện pywebview, tự động cấp cổng localhost và quản lý tiến trình.", "Python App Runner:")
    add_bullet(document, BULLET_ID, "Local HTTP Server: Web server nội bộ đa luồng hỗ trợ Clean URL (/thi-sinh, /giam-thi, /quan-tri) và phân giải đúng MIME type cho .wasm, .js, .css.", "Local HTTP Server:")
    add_bullet(document, BULLET_ID, "Edge AI Offline 100%: Mô hình Google MediaPipe Face Landmarker lưu trữ trực tiếp trong thư mục ui/mediapipe/ giúp máy không có mạng Internet vẫn chạy AI 60 FPS.", "Edge AI Offline:")
    add_bullet(document, BULLET_ID, "Đóng gói 1-Click .exe: Sử dụng PyInstaller để tạo ra đúng 1 file duy nhất AI_ExamGuard_Portable.exe cắm USB sang máy khác chạy ngay.", "Đóng gói 1-Click .exe:")


def add_prompt_block(document, step_num, title, prompt_text):
    document.add_heading(f"Bước {step_num}: {title}", level=2)
    p_desc = document.add_paragraph()
    p_desc.paragraph_format.space_after = Pt(3)
    r_desc = p_desc.add_run("👉 Câu lệnh (Prompt) sao chép và dán vào Codex / AI:")
    set_run_font(r_desc, size=10.5, color=DARK_BLUE, bold=True)

    p_box = document.add_paragraph()
    set_paragraph_shading(p_box, "F4F6F8", BLUE)
    p_box.paragraph_format.left_indent = Inches(0.18)
    p_box.paragraph_format.right_indent = Inches(0.1)
    p_box.paragraph_format.space_before = Pt(3)
    p_box.paragraph_format.space_after = Pt(12)
    p_box.paragraph_format.line_spacing = 1.15
    r_text = p_box.add_run(prompt_text.strip())
    set_run_font(r_text, name="Consolas", size=9.5, color="0A2540")


def add_steps_for_codex(document):
    document.add_heading("2. Lộ trình 5 bước giao việc cho Codex / AI", level=1)

    step1 = (
        "Tôi muốn bạn tạo một dự án Python Desktop có tên là \"AI_ExamGuard\" (Hệ thống giám sát thi thông minh bằng AI) có thể chạy trên Windows và đóng gói thành file .exe độc lập.\n\n"
        "Trước tiên, hãy:\n"
        "1. Tạo cấu trúc thư mục dự án gồm:\n"
        "   - Thư mục gốc: chứa main.py, requirements.txt, các file .bat khởi chạy\n"
        "   - Thư mục ui/: chứa toàn bộ giao diện HTML, CSS, Javascript và mô hình AI\n"
        "   - Thư mục ui/mediapipe/: chứa tài nguyên mô hình AI ngoại tuyến (Offline)\n"
        "   - Thư mục dist/: chứa file .exe sau khi đóng gói\n"
        "2. Tạo file requirements.txt chứa các thư viện:\n"
        "   pywebview>=6.2.0\n"
        "   pythonnet>=3.0.0\n"
        "   pyinstaller>=6.20.0\n"
        "   python-docx>=1.2.0\n"
        "3. Hướng dẫn tôi câu lệnh Terminal để cài đặt các thư viện này."
    )
    add_prompt_block(document, 1, "Khởi tạo cấu trúc thư mục & Danh sách thư viện", step1)

    step2 = (
        "Bây giờ, hãy viết file mã nguồn main.py hoàn chỉnh để chạy ứng dụng Desktop:\n\n"
        "Yêu cầu kỹ thuật trong file main.py:\n"
        "1. Sử dụng thư viện pywebview để mở cửa sổ Desktop chuẩn Windows (dùng engine Edge WebView2 với độ phân giải 1380x880).\n"
        "2. Tích hợp một Web Server cục bộ đa luồng (http.server.HTTPServer) chạy trên cổng localhost ngẫu nhiên đang rảnh (127.0.0.1:<free_port>).\n"
        "3. Web Server phải phục vụ thư mục ui/, hỗ trợ Clean URL (tự động mở /thi-sinh -> ui/thi-sinh.html, /giam-thi -> ui/giam-thi.html), định dạng đúng MIME type cho .wasm, .js, .css, .json, và không lưu cache.\n"
        "4. Viết hàm get_resource_path() thông minh để khi đóng gói thành file .exe qua PyInstaller (dùng sys._MEIPASS hoặc _internal) vẫn load được toàn bộ giao diện và mô hình AI.\n"
        "5. Tự động dọn dẹp và tắt sạch tiến trình ngầm khi người dùng đóng cửa sổ ứng dụng."
    )
    add_prompt_block(document, 2, "Viết mã nguồn Python Desktop & Web Server nội bộ (main.py)", step2)

    step3 = (
        "Hãy viết cho tôi một script Python nhỏ download_ai_models.py và chạy nó để tự động tải toàn bộ tài nguyên AI Google MediaPipe về lưu cục bộ vào thư mục ui/mediapipe/ (giúp ứng dụng chạy được ngay cả khi máy không có mạng Internet):\n\n"
        "1. Tải 6 file WASM từ npm @mediapipe/tasks-vision/wasm lưu vào ui/mediapipe/wasm/.\n"
        "2. Tải file mô hình nhận diện khuôn mặt 478 điểm mốc:\n"
        "   https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task\n"
        "   lưu vào ui/mediapipe/face_landmarker.task."
    )
    add_prompt_block(document, 3, "Tự động tải mô hình AI Google MediaPipe để chạy Offline", step3)

    step4 = (
        "Bây giờ hãy tạo đầy đủ các file giao diện HTML/CSS/Javascript hiện đại (giao diện tối Dark Mode công nghệ cao, dùng Tailwind CSS, icon Lucide và Canvas AI) trong thư mục ui/:\n\n"
        "1. File ui/index.html (Trang chủ):\n"
        "   - Giới thiệu hệ thống AI ExamGuard.\n"
        "   - Nút bấm điều hướng vào 3 phân hệ: Thí sinh, Giám thị, Quản trị.\n\n"
        "2. File ui/thi-sinh.html (Phân hệ Thí sinh):\n"
        "   - Form khai báo họ tên, số máy (PC-01, PC-02...), phòng thi và cam kết quy chế.\n"
        "   - Luồng video Webcam hiển thị trực tiếp.\n"
        "   - Chạy mô hình MediaPipe Face Landmarker từ file cục bộ ui/mediapipe/ để vẽ khung xanh/đỏ quanh khuôn mặt và các điểm mốc mắt/mũi.\n"
        "   - Thuật toán Behavior Engine tính toán: góc quay đầu (Yaw), góc cúi/ngẩng (Pitch), hướng mắt (Gaze), phát hiện vắng mặt hoặc có người thứ hai.\n"
        "   - Bắt sự kiện chuyển tab và phím tắt cấm (Ctrl+C, Ctrl+V, PrintScreen).\n"
        "   - Đồng bộ sự kiện qua BroadcastChannel sang màn hình Giám thị.\n\n"
        "3. File ui/giam-thi.html (Dashboard Giám thị):\n"
        "   - Sơ đồ phòng thi với các ô máy thi đổi màu theo thời gian thực (Xanh: Ổn định, Vàng: Cảnh báo, Đỏ: Nguy cơ).\n"
        "   - Luồng sự kiện cảnh báo trực tiếp (Live Alert Stream) có bộ lọc và tìm kiếm.\n"
        "   - Bảng xem chi tiết vi phạm và nút \"Đánh dấu đã xác minh\".\n"
        "   - Nút \"Xuất báo cáo\" tải file CSV danh sách vi phạm của ca thi.\n\n"
        "4. File ui/quan-tri.html (Cấu hình hệ thống):\n"
        "   - Cho phép chỉnh sửa ngưỡng thời gian cảnh báo (số giây vắng mặt, quay đầu, lệch mắt, cooldown).\n"
        "   - Tùy chọn quyền riêng tư và xuất cấu hình JSON."
    )
    add_prompt_block(document, 4, "Thiết kế toàn bộ 4 màn hình giao diện (ui/)", step4)

    step5 = (
        "Hãy tạo cho tôi 2 file batch script trên Windows để tôi có thể sử dụng chỉ bằng 1 cú nhấp đúp chuột:\n\n"
        "1. File chay_ung_dung.bat:\n"
        "   - Lệnh tự động chạy python main.py để tôi xem trước ứng dụng.\n\n"
        "2. File dong_goi_exe.bat:\n"
        "   - Lệnh tự động chạy PyInstaller:\n"
        "     pyinstaller --onefile --noconsole --name \"AI_ExamGuard_Portable\" --add-data \"ui;ui\" --clean -y main.py\n"
        "   - Đóng gói toàn bộ code Python, giao diện và mô hình AI thành đúng 1 file duy nhất dist/AI_ExamGuard_Portable.exe.\n\n"
        "Sau đó hãy chạy thử file dong_goi_exe.bat và báo cho tôi vị trí file .exe đã tạo thành công."
    )
    add_prompt_block(document, 5, "Tạo file khởi chạy & Đóng gói file .exe 1-Click", step5)


def add_commands_and_presentation(document):
    document.add_heading("3. Bảng tổng hợp các câu lệnh Terminal chính", level=1)
    table = document.add_table(rows=1, cols=3)
    headers = ["Mục đích", "Câu lệnh thực thi", "Ghi chú"]
    for index, text in enumerate(headers):
        p = table.rows[0].cells[index].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        set_run_font(p.add_run(text), size=10, color=NAVY, bold=True)
    cmd_rows = [
        ("Cài đặt thư viện", "pip install -r requirements.txt", "Cài đặt pywebview, pyinstaller, pythonnet..."),
        ("Chạy ứng dụng Python", "python main.py", "Mở cửa sổ Desktop kiểm tra trực tiếp"),
        ("Đóng gói 1 file .exe", "pyinstaller --onefile --noconsole --name AI_ExamGuard_Portable --add-data \"ui;ui\" --clean -y main.py", "Tạo file dist/AI_ExamGuard_Portable.exe gửi máy khác"),
        ("Đóng gói dạng thư mục", "pyinstaller --noconsole --name AI_ExamGuard --add-data \"ui;ui\" --clean -y main.py", "Tạo thư mục dist/AI_ExamGuard/ mở tức thì"),
    ]
    for purpose, command, note in cmd_rows:
        cells = table.add_row().cells
        for index, text in enumerate((purpose, command, note)):
            p = cells[index].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            if index == 0:
                set_run_font(p.add_run(text), size=9.7, color=DARK_BLUE, bold=True)
            elif index == 1:
                set_run_font(p.add_run(text), name="Consolas", size=9, color=NAVY, bold=True)
            else:
                set_run_font(p.add_run(text), size=9.5, color=BODY)
    configure_table(table, [1800, 4760, 2800])

    document.add_heading("4. Kinh nghiệm thuyết trình khi đi thi", level=1)
    add_callout(
        document,
        "Lời khuyên thuyết trình",
        "Khi ban giám khảo hỏi về kỹ thuật, hãy nhấn mạnh 3 điểm chính: 1) Toàn bộ AI chạy trực tiếp trên máy thí sinh (Edge AI) bảo vệ quyền riêng tư; 2) Hệ thống hoạt động 100% Offline không cần mạng; 3) Ứng dụng đã được đóng gói thành file .exe tiêu chuẩn Windows có thể cắm USB chạy ngay.",
        fill="FFF8E8",
        accent=GOLD,
    )


def build_document():
    global BULLET_ID, WORKFLOW_ID, ARCHITECTURE_ID
    document = Document()
    document.core_properties.title = "AI ExamGuard Python - Hướng dẫn xây dựng bằng Codex"
    document.core_properties.subject = "Lộ trình 5 bước giao việc cho Codex xây dựng ứng dụng Python Desktop"
    document.core_properties.author = "AI ExamGuard Team"
    configure_styles(document)
    configure_page(document)
    BULLET_ID = add_numbering_definition(document, kind="bullet", marker="•")
    WORKFLOW_ID = add_numbering_definition(document, kind="decimal", marker="%1.")
    ARCHITECTURE_ID = add_numbering_definition(document, kind="decimal", marker="%1.")

    add_cover(document)
    start_body_section(document)
    add_intro(document)
    add_steps_for_codex(document)
    add_commands_and_presentation(document)

    OUTPUT_1.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_2.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT_1)
    document.save(OUTPUT_2)
    print("Exported successfully to:", OUTPUT_1, "and", OUTPUT_2)


if __name__ == "__main__":
    build_document()

