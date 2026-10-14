// File này là "đường ống dữ liệu" của trang giám thị: liên tục nhận cảnh báo và trạng thái
// các máy thí sinh, theo dõi kết nối với hub, và phát hiện cảnh báo mới vừa đến.

import { useEffect, useRef, useState } from 'react';
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { SETTINGS_STORAGE_KEY } from '@/domain/thresholds';
import { HUB_STATUS_SIGNAL } from '@/services/browser-signals';
import {
  getConfiguredHubUrl,
  getDesktopRuntime,
  hasFirebaseConfig,
  setConfiguredHubUrl,
  setPageHubUrl,
  subscribeExamData,
} from '@/services/exam-sync';

/**
 * Đây là gì: hàm đọc tên phòng thi mà trang quản trị đã lưu.
 * Mục tiêu: báo cho hub biết màn hình giám thị đang mở là của phòng nào.
 * Chức năng: đọc cài đặt trong localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn) dưới
 *   khóa SETTINGS_STORAGE_KEY và lấy roomName, bỏ khoảng trắng thừa ở hai đầu.
 * Đầu ra: tên phòng, hoặc chuỗi rỗng "" nếu chưa lưu hay dữ liệu bị hỏng.
 * Dùng ở đâu: useProctorFeed bên dưới, khi gọi subscribeExamData.
 * Liên kết với: saveSettings trong web/src/features/admin/admin-screen.tsx (nơi lưu tên phòng);
 *   fetchHubSnapshot (web/src/services/hub/hub-client.ts) gửi tên phòng này lên hub.
 */
function savedRoomName() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as { roomName?: unknown };
    return typeof parsed.roomName === 'string' ? parsed.roomName.trim() : '';
  } catch {
    return '';
  }
}

/**
 * Đây là gì: hook (hàm đặc biệt của React giúp màn hình nhớ dữ liệu và tự vẽ lại khi dữ liệu
 *   đổi) cung cấp dữ liệu sống cho trang giám thị.
 * Mục tiêu: trang giám thị luôn có cảnh báo và trạng thái máy mới nhất, biết địa chỉ LAN và mã
 *   kết nối để chỉ cho thí sinh, và biết cảnh báo chưa xem mới nhất đến sau khi trang mở.
 * Chức năng:
 *   - Nếu địa chỉ trang có ?hub=... thì lưu địa chỉ hub đó.
 *   - Chạy đồng hồ, cập nhật mỗi giây.
 *   - Hỏi ứng dụng máy tính của giám thị (nếu trang do nó phục vụ). Khi trang được mở từ một hub
 *     mà không có ?hub=, trang đọc dữ liệu của chính hub đó và hiện địa chỉ LAN hiện tại của nó,
 *     bất kể trình duyệt này đã lưu địa chỉ nào trước đây. Mã kết nối chỉ hiện khi đang xem
 *     chính hub này và hub bật chế độ dò tìm trên LAN.
 *   - Đăng ký nhận dữ liệu thi liên tục, kèm tên phòng đã lưu.
 *   - Lắng nghe tín hiệu kết nối/mất kết nối với hub.
 *   - Lần đầu có dữ liệu thì chỉ ghi nhớ các cảnh báo cũ; những lần sau, cảnh báo nào chưa từng
 *     thấy và chưa xem thì đặt làm latestAlert.
 * Đầu ra: { events, setEvents, stations, clock, hubUrl, connectCode, hubConnected, latestAlert,
 *   setLatestAlert }.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 * Liên kết với: getDesktopRuntime, subscribeExamData, setConfiguredHubUrl, getConfiguredHubUrl,
 *   setPageHubUrl (web/src/services/exam-sync.ts và services/hub/); HUB_STATUS_SIGNAL
 *   (web/src/services/browser-signals.ts); savedRoomName ở trên.
 */
export function useProctorFeed() {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [clock, setClock] = useState(new Date(0));
  const [hubUrl, setHubUrl] = useState('');
  const [connectCode, setConnectCode] = useState('');
  const [hubConnected, setHubConnected] = useState(hasFirebaseConfig);
  const [latestAlert, setLatestAlert] = useState<ExamEvent | null>(null);
  const knownEventIdsRef = useRef<Set<string>>(new Set());
  const eventFeedReadyRef = useRef(false);

  // Khi trang mở: chạy đồng hồ, xác định hub, đăng ký nhận dữ liệu; khi đóng trang thì dọn dẹp.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    const requestedHub = new URLSearchParams(window.location.search).get('hub');
    if (requestedHub) setConfiguredHubUrl(requestedHub);
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    void getDesktopRuntime().then((runtime) => {
      if (cancelled) return;
      if (runtime) {
        const configured = getConfiguredHubUrl();
        const ownHub = !requestedHub || configured === window.location.origin;
        if (!requestedHub) setPageHubUrl(window.location.origin);
        setHubUrl(ownHub || !configured ? runtime.hubUrl : configured);
        setConnectCode(ownHub && runtime.discovery && runtime.connectCode ? runtime.connectCode : '');
      }
      unsubscribe = subscribeExamData(setEvents, setStations, { room: savedRoomName() });
    });
    /**
     * Đây là gì: hàm con nghe tín hiệu trạng thái kết nối với hub.
     * Mục tiêu: nhãn "Trung tâm LAN đang hoạt động / Mất kết nối" luôn đúng.
     * Chức năng: đọc nội dung tín hiệu; là 'connected' thì coi như đang kết nối, ngược lại là mất.
     * Đầu ra: không trả về gì; state hubConnected được cập nhật.
     * Dùng ở đâu: đăng ký với window ngay bên dưới, gỡ ra khi đóng trang.
     * Liên kết với: emitHubStatus (web/src/services/browser-signals.ts) phát tín hiệu này;
     *   ProctorHeading (components/proctor-heading.tsx) hiện nhãn trạng thái.
     */
    const onHubStatus = (event: Event) => {
      setHubConnected((event as CustomEvent<'connected' | 'disconnected'>).detail === 'connected');
    };
    window.addEventListener(HUB_STATUS_SIGNAL, onHubStatus);
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener(HUB_STATUS_SIGNAL, onHubStatus);
    };
  }, []);

  // Mỗi khi danh sách cảnh báo đổi: tìm cảnh báo mới (chưa từng thấy, chưa xem) để báo
  // cho giám thị.
  useEffect(() => {
    const currentIds = new Set(events.map((event) => event.id));
    if (!eventFeedReadyRef.current) {
      knownEventIdsRef.current = currentIds;
      eventFeedReadyRef.current = true;
      return;
    }
    const incoming = events.find((event) => !knownEventIdsRef.current.has(event.id) && !event.reviewed);
    if (incoming) {
      setLatestAlert(incoming);
    }
    knownEventIdsRef.current = currentIds;
  }, [events]);

  return { events, setEvents, stations, clock, hubUrl, connectCode, hubConnected, latestAlert, setLatestAlert };
}
