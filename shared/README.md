# shared/ — Hợp đồng chung giữa web/ và desktop-hub/

## Đọc trong 1 phút

`web/` viết bằng TypeScript, `desktop-hub/` viết bằng Python. Hai bên "nói chuyện" với nhau qua mạng, nên phải
thống nhất một số điều: gọi nhau ở cổng nào, gửi những trường nào, có những loại cảnh báo gì…

Ví von: hai bạn ở hai lớp khác nhau chơi trò gửi thư mật mã. Muốn hiểu nhau thì cả hai phải dùng **chung một
bảng mật mã**. File [`hub-contract.json`](hub-contract.json) chính là bảng mật mã đó, và là **nguồn chuẩn duy nhất**.

## Trong hợp đồng có gì?

| Khóa | Ý nghĩa | Code tương ứng |
| --- | --- | --- |
| `appVersion` | Phiên bản phát hành | `desktop-hub/examguard_desktop/config.py` |
| `defaultHubPort` | Cổng TCP mặc định của trung tâm LAN (`8765`) | `config.py` và `web/src/services/hub/hub-url.ts` |
| `discoveryPort`, `discoveryService` | Cổng UDP (`8766`) và tên dịch vụ để tự tìm máy giám thị | `config.py`, `discovery.py` |
| `maxBodyBytes`, `eventLimit` | Giới hạn ~1,5 MB mỗi yêu cầu (đủ kèm đoạn hình ngắn) / giữ 500 cảnh báo mới nhất | `config.py` |
| `identityFields` | Trường bắt buộc khi gửi cảnh báo / trạng thái máy: phòng, máy, SBD, họ tên | `http_handler.py` và `web/src/domain/exam-types.ts` |
| `alertTypes` | Danh sách 7 loại cảnh báo | `web/src/domain/exam-types.ts`, `alert-catalog.ts` |
| `verdicts` | Kết luận giám thị: `confirmed`, `false_alarm` | `exam_store.py`, `exam-types.ts`, CSV biên bản |
| `endpoints` | Các API LAN (kể cả `settings`, `deleteStation`, `reviewEvent`) | `http_handler.py` và `web/src/services/hub/`; chi tiết ở [docs/ky-thuat/api-lan.md](../docs/ky-thuat/api-lan.md) |

## Vì sao code không đọc trực tiếp file này?

Bản EXE cần chạy độc lập, không phụ thuộc thêm file ngoài. Vì vậy mỗi bên **giữ bản sao** của các giá trị trong
code của mình, và **kiểm thử ở cả hai bên** so sánh bản sao đó với file hợp đồng:

- `web/tests/unit/contract.test.cjs` (chạy bằng `npm test` trong `web/`)
- `desktop-hub/tests/test_contract.py` (chạy bằng `python -m unittest` trong `desktop-hub/`)

Lệch một chỗ là test báo đỏ ngay, chỉ rõ giá trị nào sai.

## Khi muốn đổi một giá trị

1. Sửa `hub-contract.json` trước.
2. Chạy test của cả hai phần.
3. Sửa code ở đúng chỗ test báo lệch.

Nhớ rằng máy học sinh và máy giáo viên có thể chạy **hai bản EXE khác nhau**. Đổi hợp đồng phải giữ tương thích
ngược: thêm thì được, xóa hoặc đổi nghĩa thì phải cân nhắc kỹ.
