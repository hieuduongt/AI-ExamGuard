/**
 * File này "canh" trình duyệt của thí sinh trong giờ thi: rời cửa sổ bài thi hoặc bấm phím
 * tắt sao chép/dán/cắt/in sẽ tạo cảnh báo. Thuộc phần logic thí sinh
 * (web/src/features/candidate/hooks/).
 */
import { useEffect } from 'react';
import type { EmitAlert } from './use-monitoring-session';

/**
 * Đây là gì: hook (hàm đặc biệt của React giúp màn hình nhớ dữ liệu và tự vẽ lại khi dữ liệu
 *   đổi) canh trình duyệt.
 * Mục tiêu: phát hiện thao tác trên máy mà camera không thấy được.
 * Chức năng: chỉ khi đang giám sát: rời khỏi cửa sổ bài thi, hoặc bấm Ctrl/Cmd + C, V, X, P
 *   thì phát cảnh báo. Khi dừng giám sát thì gỡ bỏ việc theo dõi.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: useMonitoringSession trong use-monitoring-session.ts.
 * Liên kết với: emitAlert (use-monitoring-session.ts) với nguồn 'browser'; loại cảnh báo
 *   'focus_lost' và 'restricted_input' (web/src/domain/alert-catalog.ts).
 */
export function useBrowserGuard(running: boolean, emitAlert: EmitAlert) {
  useEffect(() => {
    if (!running) return;
    /**
     * Đây là gì: hàm con chạy mỗi khi trang bị ẩn hoặc hiện lại.
     * Mục tiêu: biết thí sinh chuyển sang tab hay cửa sổ khác.
     * Chức năng: nếu trang đang bị ẩn thì phát cảnh báo "rời khỏi cửa sổ bài thi".
     * Đầu ra: không trả về gì.
     * Dùng ở đâu: gắn vào sự kiện 'visibilitychange' của trang ngay bên dưới.
     * Liên kết với: emitAlert, loại cảnh báo 'focus_lost'.
     */
    const onVisibility = () => { if (document.hidden) emitAlert('focus_lost', 'Thí sinh chuyển khỏi cửa sổ bài thi.', 'browser'); };
    /**
     * Đây là gì: hàm con chạy mỗi khi thí sinh bấm một phím.
     * Mục tiêu: phát hiện phím tắt sao chép, dán, cắt, in.
     * Chức năng: nếu đang giữ Ctrl (Windows) hoặc Cmd (Mac) và bấm C, V, X hoặc P thì phát
     *   cảnh báo, ghi rõ tổ hợp phím đã bấm.
     * Đầu ra: không trả về gì.
     * Dùng ở đâu: gắn vào sự kiện 'keydown' của cửa sổ ngay bên dưới.
     * Liên kết với: emitAlert, loại cảnh báo 'restricted_input'.
     */
    const onRestrictedInput = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'p'].includes(event.key.toLowerCase())) {
        emitAlert('restricted_input', `Phát hiện tổ hợp phím ${event.ctrlKey ? 'Ctrl' : 'Cmd'}+${event.key.toUpperCase()}.`, 'browser');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onRestrictedInput);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onRestrictedInput);
    };
  }, [emitAlert, running]);
}
