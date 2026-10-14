/**
 * File này gửi và nhận dữ liệu thi qua Firestore (kho dữ liệu đám mây của Firebase).
 * Đây là kênh tùy chọn: chỉ chạy khi đã cấu hình Firebase.
 */
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { ExamEvent, StationStatus } from '@/domain/exam-types';
import { emitDelivered, emitHubStatus } from '@/services/browser-signals';
import { getFirebaseDb } from './firebase-client';

// Kênh đám mây tùy chọn (hai ngăn dữ liệu examEvents: cảnh báo, examStations: máy thí
// sinh). Mọi hàm trong file này không làm gì cả khi chưa cấu hình Firebase.

/**
 * Đây là gì: hàm lưu một cảnh báo lên đám mây.
 * Mục tiêu: để giám thị ở bất kỳ đâu cũng thấy cảnh báo.
 * Chức năng: ghi cảnh báo vào ngăn examEvents theo mã (id); ghi xong thì hô "đã gửi tới
 *   nơi", lỗi thì báo mất kết nối. Không chờ kết quả.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: publishEvent() trong services/exam-sync.ts.
 * Liên kết với: getFirebaseDb() trong ./firebase-client.ts; emitDelivered(),
 *   emitHubStatus() trong services/browser-signals.ts.
 */
export function saveEventToFirestore(event: ExamEvent) {
  const db = getFirebaseDb();
  if (db) void setDoc(doc(db, 'examEvents', event.id), event).then(() => {
    emitDelivered(event.id);
  }).catch(() => emitHubStatus('disconnected'));
}

/**
 * Đây là gì: hàm lưu trạng thái một máy thí sinh lên đám mây.
 * Mục tiêu: giám thị thấy máy nào đang thi, đang bình thường hay có vấn đề.
 * Chức năng: ghi vào ngăn examStations với tên "phòng__máy" (thay "/" bằng "_" vì tên
 *   không được chứa "/"); lỗi thì bỏ qua.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: publishStation() trong services/exam-sync.ts.
 * Liên kết với: getFirebaseDb() trong ./firebase-client.ts.
 */
export function saveStationToFirestore(station: StationStatus) {
  const db = getFirebaseDb();
  if (db) {
    const documentId = `${station.roomId}__${station.stationId}`.replaceAll('/', '_');
    void setDoc(doc(db, 'examStations', documentId), station).catch(() => undefined);
  }
}

/**
 * Đây là gì: hàm đánh dấu một cảnh báo trên đám mây là "đã xem" hoặc "chưa xem".
 * Mục tiêu: giám thị ghi nhận mình đã xem xét cảnh báo đó.
 * Chức năng: sửa trường reviewed của cảnh báo có mã id; lỗi thì bỏ qua.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: markEventReviewed() trong services/exam-sync.ts.
 * Liên kết với: getFirebaseDb() trong ./firebase-client.ts.
 */
export function markFirestoreEventReviewed(id: string, reviewed: boolean) {
  const db = getFirebaseDb();
  if (db) void updateDoc(doc(db, 'examEvents', id), { reviewed }).catch(() => undefined);
}

/**
 * Đây là gì: hàm đăng ký theo dõi dữ liệu trên đám mây.
 * Mục tiêu: màn hình giám thị tự cập nhật ngay khi có cảnh báo hoặc máy thí sinh mới.
 * Chức năng: lắng nghe ngăn examEvents (500 cảnh báo mới nhất, mới trước) và ngăn
 *   examStations; mỗi lần đổi thì gọi onEvents / onStations với danh sách mới. Lỗi thì bỏ qua.
 * Đầu ra: một hàm "ngừng theo dõi" để gọi khi đóng màn hình.
 * Dùng ở đâu: subscribeExamData() trong services/exam-sync.ts.
 * Liên kết với: getFirebaseDb() trong ./firebase-client.ts.
 */
export function subscribeFirestore(
  onEvents: (events: ExamEvent[]) => void,
  onStations: (stations: StationStatus[]) => void,
) {
  const unsubscribes: Array<() => void> = [];
  const db = getFirebaseDb();
  if (db) {
    unsubscribes.push(onSnapshot(query(collection(db, 'examEvents'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => {
      onEvents(snapshot.docs.map((item) => item.data() as ExamEvent));
    }, () => undefined));
    unsubscribes.push(onSnapshot(collection(db, 'examStations'), (snapshot) => {
      onStations(snapshot.docs.map((item) => item.data() as StationStatus));
    }, () => undefined));
  }
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
