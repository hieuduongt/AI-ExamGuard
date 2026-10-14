/**
 * File này đổi các lỗi kỹ thuật khi mở webcam thành lời nhắn tiếng Việt dễ hiểu cho thí sinh.
 * Thuộc phần màn hình thí sinh (web/src/features/candidate/).
 */

/**
 * Đây là gì: hàm dịch lỗi mở camera thành câu tiếng Việt.
 * Mục tiêu: thí sinh đọc là biết phải làm gì (cho phép camera, cắm camera, tắt ứng dụng khác...).
 * Chức năng: xem tên lỗi trình duyệt báo (bị chặn quyền, không có camera, camera đang bận,
 *   camera không hỗ trợ cấu hình, bị dừng giữa chừng) và chọn câu nhắn tương ứng; lỗi khác
 *   thì dùng nội dung lỗi có sẵn hoặc một câu nhắn chung.
 * Đầu ra: một câu thông báo lỗi tiếng Việt.
 * Dùng ở đâu: startMonitoring trong hooks/use-monitoring-session.ts, khi mở webcam thất bại.
 * Liên kết với: navigator.mediaDevices.getUserMedia (lệnh xin quyền mở camera của trình duyệt).
 */
export function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Trình duyệt đang chặn quyền camera. Hãy cho phép Camera cho trang này rồi thử lại.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Không tìm thấy webcam trên thiết bị. Hãy kết nối camera rồi thử lại.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Không thể mở webcam. Camera có thể đang được ứng dụng khác sử dụng.';
      case 'OverconstrainedError':
        return 'Webcam không hỗ trợ cấu hình hình ảnh được yêu cầu.';
      case 'AbortError':
        return 'Trình duyệt đã dừng quá trình mở webcam. Vui lòng thử lại.';
    }
  }

  return error instanceof Error
    ? error.message
    : 'Không thể khởi động webcam. Vui lòng kiểm tra quyền camera trong trình duyệt.';
}
