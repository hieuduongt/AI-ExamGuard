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
