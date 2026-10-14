"""
Các con số cài đặt chung của máy chủ trung tâm (hub) chạy trên máy giám thị.

Mọi file khác trong examguard_desktop/ lấy cổng mạng, giới hạn dữ liệu và số phiên bản từ đây.
"""
# Các giá trị này phải khớp với shared/hub-contract.json, tức "hợp đồng" chung giữa trang web
# và hub (được kiểm tra trong tests/test_contract.py).
# DEFAULT_PORT: cổng mặc định để trang web nói chuyện với hub.
DEFAULT_PORT = 8765
# DISCOVERY_PORT: cổng UDP dùng để hô to trên mạng LAN cho các máy khác tìm thấy hub.
DISCOVERY_PORT = 8766
# MAX_BODY_SIZE: dữ liệu gửi lên tối đa khoảng 1 MB; lớn hơn thì từ chối.
MAX_BODY_SIZE = 1_000_000
# EVENT_LIMIT: chỉ giữ tối đa 500 cảnh báo mới nhất trong bộ nhớ.
EVENT_LIMIT = 500
# APP_VERSION: số phiên bản ứng dụng, hiện trên tiêu đề cửa sổ và trong /api/runtime.
APP_VERSION = '2026.09.08.3'
