/**
 * File này theo dõi việc gửi cảnh báo từ máy thí sinh: cảnh báo nào máy giám thị đã xác nhận
 * nhận được, và còn bao nhiêu cảnh báo đang xếp hàng chờ gửi. Thuộc phần logic thí sinh
 * (web/src/features/candidate/hooks/).
 */
import { useCallback, useEffect, useState } from 'react';
import { DELIVERY_SIGNAL } from '@/services/browser-signals';
import { getPendingEventCount } from '@/services/exam-sync';

/**
 * Đây là gì: hook theo dõi tình trạng gửi cảnh báo.
 * Mục tiêu: cho thí sinh biết cảnh báo nào máy giám thị đã nhận và còn bao nhiêu cái chờ gửi.
 * Chức năng: nhớ danh sách mã cảnh báo đã được máy giám thị xác nhận (tối đa 500 mã gần nhất)
 *   và số cảnh báo còn trong hàng chờ; tự cập nhật mỗi khi có tin báo "đã giao".
 * Đầu ra: { deliveredIds, pendingCount, refreshPendingCount }.
 * Dùng ở đâu: CandidateScreen trong web/src/features/candidate/candidate-screen.tsx.
 * Liên kết với: DELIVERY_SIGNAL (web/src/services/browser-signals.ts), tin báo do
 *   web/src/services/hub/outbox.ts phát ra khi gửi thành công; getPendingEventCount (outbox.ts).
 */
export function useDeliveryStatus() {
  const [deliveredIds, setDeliveredIds] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Đây là gì: hàm con chạy mỗi khi nhận tin báo "cảnh báo đã được máy giám thị nhận".
    // Mục tiêu: đánh dấu cảnh báo đó là "Giám thị đã nhận" trên màn hình.
    // Chức năng: lấy mã cảnh báo trong tin báo, đưa xuống cuối danh sách (bỏ bản trùng, giữ
    //   500 mã mới nhất), rồi đếm lại số cảnh báo còn chờ gửi.
    // Đầu ra: không trả về gì; dữ liệu màn hình đang nhớ (state) được cập nhật.
    // Dùng ở đâu: gắn vào sự kiện DELIVERY_SIGNAL của cửa sổ ngay bên dưới.
    // Liên kết với: emitDelivered (web/src/services/browser-signals.ts), getPendingEventCount.
    const onDelivery = (event: Event) => {
      const { id } = (event as CustomEvent<{ id: string }>).detail;
      setDeliveredIds((items) => [...items.filter((item) => item !== id), id].slice(-500));
      setPendingCount(getPendingEventCount());
    };
    window.addEventListener(DELIVERY_SIGNAL, onDelivery);
    return () => window.removeEventListener(DELIVERY_SIGNAL, onDelivery);
  }, []);

  /**
   * Đây là gì: hàm đếm lại số cảnh báo còn chờ gửi.
   * Mục tiêu: số trên màn hình luôn đúng ngay sau khi tạo cảnh báo mới.
   * Chức năng: hỏi hàng chờ gửi còn bao nhiêu cảnh báo rồi ghi vào pendingCount.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: được truyền vào useMonitoringSession (use-monitoring-session.ts), gọi sau mỗi
   *   cảnh báo và mỗi nhịp gửi trạng thái máy.
   * Liên kết với: getPendingEventCount (web/src/services/hub/outbox.ts).
   */
  const refreshPendingCount = useCallback(() => setPendingCount(getPendingEventCount()), []);

  return { deliveredIds, pendingCount, refreshPendingCount };
}
