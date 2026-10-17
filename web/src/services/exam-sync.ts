'use client';

/**
 * File này là "cửa chính" duy nhất mà các màn hình dùng để gửi và nhận dữ liệu thi
 * (cảnh báo, trạng thái máy thí sinh). Mỗi lần gửi, dữ liệu được tỏa ra mọi kênh đang có:
 * bộ nhớ chạy thử trong trình duyệt (local-demo), hub trong mạng LAN (máy trung tâm của
 * giám thị, chương trình desktop-hub/), và Firebase (dịch vụ đám mây) nếu đã cấu hình.
 */
import type { AlertVerdict, ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitHubStatus } from '@/services/browser-signals';
import { hasFirebaseConfig } from '@/services/firebase/firebase-client';
import {
  markFirestoreEventReviewed,
  saveEventToFirestore,
  saveStationToFirestore,
  subscribeFirestore,
} from '@/services/firebase/firestore-sync';
import { fetchHubSnapshot, type ProctorPresence } from '@/services/hub/hub-client';
import { postToHub } from '@/services/hub/hub-transport';
import { activeHubUrl } from '@/services/hub/hub-url';
import { enqueueEvent, flushPendingEvents } from '@/services/hub/outbox';
import {
  localEvents,
  localStations,
  markLocalEventReviewed,
  saveLocalEvent,
  saveLocalStation,
  subscribeLocalData,
} from '@/services/local-demo/local-store';

// Chuyển tiếp các hàm, kiểu dữ liệu từ những file con, để màn hình chỉ cần nhập (import)
// từ một chỗ là services/exam-sync.ts.
export { hasFirebaseConfig };
export type { HubStatus } from '@/services/browser-signals';
export { getDesktopRuntime, testHubConnection, type HubRuntime, type ProctorPresence } from '@/services/hub/hub-client';
export { fetchDiscoveredHubs, isConnectCode, sameRoom, type DiscoveredHub } from '@/services/hub/hub-discovery';
export { getConfiguredHubUrl, normalizeHubUrl, setConfiguredHubUrl, setPageHubUrl } from '@/services/hub/hub-url';
export { flushPendingEvents, getPendingEventCount } from '@/services/hub/outbox';
export { demoStations } from '@/services/local-demo/demo-data';

/**
 * Đây là gì: hàm tạo mã nhận diện (id) không trùng cho một cảnh báo.
 * Mục tiêu: mỗi cảnh báo có một mã riêng để gửi lại nhiều lần cũng không bị đếm trùng.
 * Chức năng: ghép tiền tố (mặc định "event") với một chuỗi ngẫu nhiên; nếu trình duyệt
 *   có crypto.randomUUID thì dùng, không thì ghép thời gian hiện tại với số ngẫu nhiên.
 * Đầu ra: chuỗi như "event-1a2b3c...".
 * Dùng ở đâu: features/candidate/hooks/use-monitoring-session.ts (cảnh báo thật),
 *   features/proctor/demo-alert.ts (cảnh báo thử, tiền tố "demo").
 * Liên kết với: publishEvent() (gửi cảnh báo mang mã này).
 */
export function makeId(prefix = 'event') {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

/**
 * Đây là gì: hàm phát một cảnh báo ra mọi kênh.
 * Mục tiêu: đưa cảnh báo tới giám thị bằng mọi đường có thể.
 * Chức năng: cất vào trình duyệt (chạy thử); nếu có địa chỉ hub thì bỏ vào hộp thư đi rồi
 *   gửi ngay; và lưu lên Firebase nếu có. Chạy ngoài trình duyệt thì bỏ qua.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: features/candidate/hooks/use-monitoring-session.ts (máy thí sinh) và
 *   features/proctor/proctor-screen.tsx (nút tạo cảnh báo thử).
 * Liên kết với: saveLocalEvent() (local-demo/local-store.ts), enqueueEvent() và
 *   flushPendingEvents() (hub/outbox.ts), saveEventToFirestore() (firebase/firestore-sync.ts).
 */
export function publishEvent(event: ExamEvent) {
  if (typeof window === 'undefined') return;
  saveLocalEvent(event);
  const hubUrl = activeHubUrl();
  if (hubUrl) {
    const hasMedia = Boolean(event.clip || event.snapshots?.length);
    if (hasMedia) {
      // Clip/ảnh lớn: gửi thẳng, tránh nhét data-URL vào localStorage (dễ vượt hạn mức).
      void postToHub('/api/events', event, 'POST', hubUrl).then((ok) => {
        if (ok) return;
        const light: ExamEvent = { ...event };
        delete light.clip;
        delete light.snapshots;
        enqueueEvent(hubUrl, light);
        void flushPendingEvents();
      });
    } else {
      enqueueEvent(hubUrl, event);
      void flushPendingEvents();
    }
  }
  saveEventToFirestore(event);
}

/**
 * Đây là gì: hàm phát trạng thái mới nhất của một máy thí sinh ra mọi kênh.
 * Mục tiêu: giám thị luôn biết máy nào đang thi, bình thường hay có vấn đề.
 * Chức năng: cất vào trình duyệt; gửi tới /api/stations của hub; nhân tiện gửi lại các
 *   cảnh báo còn chờ trong hộp thư đi; và lưu lên Firebase nếu có. Chạy ngoài trình
 *   duyệt thì bỏ qua.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: features/candidate/hooks/use-monitoring-session.ts.
 * Liên kết với: saveLocalStation() (local-demo/local-store.ts), postToHub()
 *   (hub/hub-transport.ts), flushPendingEvents() (hub/outbox.ts), saveStationToFirestore()
 *   (firebase/firestore-sync.ts).
 */
export function publishStation(station: StationStatus) {
  if (typeof window === 'undefined') return;
  saveLocalStation(station);
  void postToHub('/api/stations', station);
  void flushPendingEvents();
  saveStationToFirestore(station);
}

/**
 * Đây là gì: hàm đánh dấu một cảnh báo là "đã xem" (hoặc bỏ dấu) trên mọi kênh.
 * Mục tiêu: giám thị ghi nhận đã kiểm tra, kèm kết luận "đúng" hoặc "báo nhầm".
 * Chức năng: sửa trong trình duyệt; gửi lệnh PATCH tới /api/events/<mã> của hub (kèm
 *   verdict nếu có); sửa trên Firebase nếu có. Chạy ngoài trình duyệt thì bỏ qua.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: features/proctor/proctor-screen.tsx.
 * Liên kết với: markLocalEventReviewed() (local-demo/local-store.ts), postToHub()
 *   (hub/hub-transport.ts), markFirestoreEventReviewed() (firebase/firestore-sync.ts).
 */
export function markEventReviewed(id: string, reviewed = true, verdict?: AlertVerdict) {
  if (typeof window === 'undefined') return;
  markLocalEventReviewed(id, reviewed, verdict);
  void postToHub(`/api/events/${encodeURIComponent(id)}`, { reviewed, ...(verdict ? { verdict } : {}) }, 'PATCH');
  markFirestoreEventReviewed(id, reviewed, verdict);
}

/**
 * Đây là gì: hàm đăng ký nhận dữ liệu thi liên tục cho màn hình giám thị.
 * Mục tiêu: màn hình giám thị luôn hiện danh sách cảnh báo và máy thí sinh mới nhất.
 * Chức năng: nghe cùng lúc ba kênh: bộ nhớ chạy thử trong trình duyệt, Firebase (nếu có)
 *   và hub (hỏi mỗi giây một lần). Một khi hub hoặc Firestore đã trả lời, dữ liệu của
 *   chúng được coi là chuẩn (authoritative) và bản chạy thử trong trình duyệt không còn
 *   được ghi đè lên nữa.
 * Đầu ra: một hàm "ngừng theo dõi" để gọi khi đóng màn hình.
 * Dùng ở đâu: features/proctor/hooks/use-proctor-feed.ts.
 * Liên kết với: subscribeLocalData() (local-demo/local-store.ts), subscribeFirestore()
 *   (firebase/firestore-sync.ts), fetchHubSnapshot() (hub/hub-client.ts),
 *   emitHubStatus() (browser-signals.ts).
 */
export function subscribeExamData(
  onEvents: (events: ExamEvent[]) => void,
  onStations: (stations: StationStatus[]) => void,
  proctor?: ProctorPresence,
) {
  let authoritative = false;
  const stopLocal = subscribeLocalData(
    () => { if (!authoritative) onEvents(localEvents()); },
    () => { if (!authoritative) onStations(localStations()); },
  );
  const stopFirestore = subscribeFirestore((events) => {
    authoritative = true;
    onEvents(events);
  }, onStations);

  let stopped = false;
  let polling = false;
  /**
   * Đây là gì: hàm con hỏi hub một lần để lấy dữ liệu mới nhất.
   * Mục tiêu: cập nhật màn hình giám thị theo dữ liệu trên máy giám thị.
   * Chức năng: bỏ qua nếu chưa có địa chỉ hub, đã ngừng theo dõi, hoặc lượt hỏi trước
   *   chưa xong; nếu hub trả lời thì đánh dấu dữ liệu hub là chuẩn, đưa cảnh báo và máy
   *   thí sinh cho màn hình, báo đã kết nối; lỗi thì báo mất kết nối.
   * Đầu ra: việc cần chờ, không cho ra giá trị.
   * Dùng ở đâu: gọi ngay một lần, rồi mỗi 1 giây bởi đồng hồ hubTimer bên dưới.
   * Liên kết với: fetchHubSnapshot() (hub/hub-client.ts), activeHubUrl() (hub/hub-url.ts).
   */
  const pollHub = async () => {
    const hubUrl = activeHubUrl();
    if (!hubUrl || stopped || polling) return;
    polling = true;
    try {
      const payload = await fetchHubSnapshot(hubUrl, proctor);
      if (stopped) return;
      authoritative = true;
      onEvents(Array.isArray(payload.events) ? payload.events : []);
      onStations(Array.isArray(payload.stations) ? payload.stations : []);
      emitHubStatus('connected');
    } catch {
      if (!stopped) emitHubStatus('disconnected');
    } finally {
      polling = false;
    }
  };
  void pollHub();
  const hubTimer = window.setInterval(() => void pollHub(), 1000);

  return () => {
    stopped = true;
    window.clearInterval(hubTimer);
    stopLocal();
    stopFirestore();
  };
}
