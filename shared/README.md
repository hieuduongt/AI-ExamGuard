# shared/ — Hợp đồng chung giữa web/ và desktop-hub/

`web/` (TypeScript) và `desktop-hub/` (Python) là hai ngôn ngữ khác nhau nhưng phải thống nhất một số
giá trị. File [`hub-contract.json`](hub-contract.json) là **nguồn chuẩn duy nhất** của các giá trị đó:

| Khóa | Ý nghĩa | Code tương ứng |
| --- | --- | --- |
| `appVersion` | Phiên bản phát hành | `desktop-hub/examguard_desktop/config.py` |
| `defaultHubPort` | Cổng mặc định của trung tâm LAN | `config.py` và `web/src/services/hub/hub-url.ts` |
| `discoveryPort`, `discoveryService` | Cổng UDP và tên dịch vụ để tự tìm máy giám thị | `config.py`, `discovery.py` |
| `maxBodyBytes`, `eventLimit` | Giới hạn 1 MB / 500 sự kiện | `config.py` |
| `identityFields` | Trường bắt buộc khi gửi sự kiện / trạng thái máy | `http_handler.py` và `web/src/domain/exam-types.ts` |
| `alertTypes` | Danh sách loại cảnh báo | `web/src/domain/exam-types.ts`, `alert-catalog.ts` |
| `endpoints` | Các API LAN | `http_handler.py` và `web/src/services/hub/`; chi tiết ở `docs/ky-thuat/api-lan.md` |

Code **không đọc** file này khi chạy (mỗi bên giữ bản sao của mình để bản EXE không phụ thuộc thêm file).
Thay vào đó, kiểm thử ở cả hai bên so sánh code với file này:

- `web/tests/unit/contract.test.cjs` (`npm test`)
- `desktop-hub/tests/test_contract.py` (`python -m unittest`)

**Khi đổi một giá trị:** sửa `hub-contract.json` trước, chạy test của cả hai phần, rồi sửa code ở chỗ nào test báo lệch.
Nhớ rằng máy học sinh và máy giáo viên có thể chạy hai bản EXE khác nhau, nên đổi hợp đồng phải giữ tương thích ngược.
