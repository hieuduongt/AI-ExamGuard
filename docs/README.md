# Tài liệu AI ExamGuard

Không cần đọc hết. Chọn lộ trình hợp với bạn ở dưới, mỗi lộ trình 2–4 tài liệu.

## Lộ trình đọc

**Học sinh, giáo viên sắp dùng phần mềm trong phòng thi**
1. [van-hanh/HUONG_DAN_CHAY_EXE.txt](van-hanh/HUONG_DAN_CHAY_EXE.txt): bấm gì, gõ gì, xử lý khi không kết nối được.
2. [nghiep-vu/quy-tac-canh-bao.md](nghiep-vu/quy-tac-canh-bao.md) (phần 1 và 4): khi nào máy báo vàng, báo đỏ.

**Người muốn hiểu hệ thống (ban giám khảo, phụ huynh, học sinh tò mò)**
1. [../README.md](../README.md): đọc trong 1 phút.
2. [tong-quan.md](tong-quan.md): bài toán, cách hoạt động, vì sao thiết kế như vậy, hạn chế.
3. [thuat-ngu.md](thuat-ngu.md): khi gặp từ lạ.
4. [ky-thuat/doi-chieu-32-buoc.md](ky-thuat/doi-chieu-32-buoc.md): mỗi bước trong tài liệu "32 câu lệnh" nằm ở file code nào.

**Học sinh ôn vấn đáp**
1. [tai-lieu-du-thi/AI_ExamGuard_Mo_ta_tinh_nang_vai_tro_va_cong_nghe.docx](tai-lieu-du-thi/AI_ExamGuard_Mo_ta_tinh_nang_vai_tro_va_cong_nghe.docx): cả dự án, dễ hiểu, có sơ đồ + câu hỏi.
2. [tai-lieu-du-thi/AI_ExamGuard_Tai_lieu_phan_cai_tien_theo_gop_y.docx](tai-lieu-du-thi/AI_ExamGuard_Tai_lieu_phan_cai_tien_theo_gop_y.docx): sâu phần cải tiến (mọi thành viên nắm như nhau).
3. (Tuỳ chọn) [tai-lieu-du-thi/AI_ExamGuard_Tai_lieu_hoc_tap_cho_hoc_sinh.docx](tai-lieu-du-thi/AI_ExamGuard_Tai_lieu_hoc_tap_cho_hoc_sinh.docx): học tập chi tiết hơn kèm đoạn code.

**Lập trình viên mới vào dự án**
1. [tong-quan.md](tong-quan.md), phần 4–7: luồng dữ liệu và vai trò từng phần.
2. README của phần mình sửa: [web/](../web/README.md), [desktop-hub/](../desktop-hub/README.md), [shared/](../shared/README.md).
3. [van-hanh/chay-va-build.md](van-hanh/chay-va-build.md): chạy thử (kể cả HTTPS LAN), kiểm thử, build EXE.
4. [van-de-ton-dong.md](van-de-ton-dong.md): các điểm đã biết nhưng chưa xử lý, đừng "sửa nhầm" thành lỗi mới.

## Toàn bộ tài liệu

| Thư mục / file | Nội dung | Dành cho |
| --- | --- | --- |
| [tong-quan.md](tong-quan.md) | Bài toán, mục tiêu, quy trình vận hành, luồng dữ liệu, vai trò từng phần, hạn chế | Mọi người |
| [thuat-ngu.md](thuat-ngu.md) | Giải thích thuật ngữ bằng lời thường (LAN, IP, cổng, hub, nhịp tim, verdict…) | Mọi người |
| [nghiep-vu/quy-tac-canh-bao.md](nghiep-vu/quy-tac-canh-bao.md) | Khi nào AI tạo cảnh báo, ngưỡng, màu trạng thái, trạng thái AI, kết luận giám thị | Giáo viên, ban giám khảo, lập trình viên |
| [van-hanh/HUONG_DAN_CHAY_EXE.txt](van-hanh/HUONG_DAN_CHAY_EXE.txt) | Hướng dẫn dùng EXE trong phòng thi | Giáo viên, học sinh |
| [van-hanh/chay-va-build.md](van-hanh/chay-va-build.md) | Chạy thử (cả macOS + HTTPS), kiểm thử, build EXE, triển khai web | Lập trình viên |
| [ky-thuat/api-lan.md](ky-thuat/api-lan.md) | API của trung tâm cảnh báo LAN (events, stations, settings, DELETE…), UDP discovery | Lập trình viên |
| [ky-thuat/du-lieu-trinh-duyet.md](ky-thuat/du-lieu-trinh-duyet.md) | Dữ liệu lưu trong trình duyệt, Firestore, tín hiệu nội bộ | Lập trình viên |
| [ky-thuat/doi-chieu-32-buoc.md](ky-thuat/doi-chieu-32-buoc.md) | Mỗi bước trong tài liệu "32 câu lệnh" nằm ở file code nào | Ban giám khảo, lập trình viên |
| [van-de-ton-dong.md](van-de-ton-dong.md) | Các vấn đề đã biết, chưa xử lý (và mục đã sửa) | Lập trình viên, người phụ trách |
| `tai-lieu-du-thi/` | Hồ sơ dự án, 32 câu lệnh, mô tả tính năng, tài liệu vấn đáp THCS (docx) | Ban giám khảo, học sinh |
| `tai-lieu-du-thi/AI_ExamGuard_Mo_ta_tinh_nang_vai_tro_va_cong_nghe.docx` | Mô tả cả dự án cho vấn đáp (dễ hiểu, có sơ đồ) | Học sinh dự thi |
| `tai-lieu-du-thi/AI_ExamGuard_Tai_lieu_phan_cai_tien_theo_gop_y.docx` | Ôn vấn đáp phần cải tiến (mọi thành viên nắm như nhau) | Học sinh dự thi |
| `tai-lieu-du-thi/AI_ExamGuard_Tai_lieu_hoc_tap_cho_hoc_sinh.docx` | Tài liệu học tập chi tiết hơn (sơ đồ, code, bài tập) | Học sinh dự thi |
| `tai-lieu-du-thi/AI_ExamGuard_Ke_hoach_cai_tien_nop_thu_7.docx` | Kế hoạch cải tiến trước hạn nộp | Người hướng dẫn + học sinh |
| `tools/` | Script Python sinh/cập nhật một số file docx (`build_mo_ta_tinh_nang.py`, `build_tai_lieu_cai_tien.py`, `build_tai_lieu_hoc_sinh.py`…). Script lịch sử (hồ sơ/32 câu lệnh) không chạy lại để đè — xem `van-de-ton-dong.md` | Người làm hồ sơ |
| `archive/du-an-python-cu/` | Phiên bản Python cũ, chỉ lưu tham khảo | — |
