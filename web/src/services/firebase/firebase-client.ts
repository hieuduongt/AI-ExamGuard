/**
 * File này kết nối trang web với Firebase (dịch vụ đám mây của Google, chỉ dùng nếu có
 * cấu hình). Nếu không điền thông tin Firebase thì hệ thống bỏ qua đám mây và chỉ dùng
 * máy giám thị trong mạng LAN hoặc bộ nhớ cục bộ.
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Thông tin để kết nối Firebase, đọc từ các biến môi trường NEXT_PUBLIC_FIREBASE_...
 * (người cài đặt điền vào file cấu hình trước khi chạy web).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * true nếu đã điền đủ 4 thông tin bắt buộc của Firebase; khi đó cả hệ thống chuyển sang
 * đồng bộ qua đám mây. Nhiều màn hình đọc giá trị này (qua services/exam-sync.ts).
 */
export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

/**
 * Đây là gì: hàm lấy "cơ sở dữ liệu" Firestore (kho dữ liệu đám mây của Firebase).
 * Mục tiêu: cho các hàm khác có chỗ để lưu và đọc cảnh báo trên đám mây.
 * Chức năng: nếu chưa cấu hình Firebase thì trả về null; nếu có thì dùng lại ứng dụng
 *   Firebase đã khởi tạo (hoặc khởi tạo mới lần đầu) rồi lấy Firestore.
 * Đầu ra: đối tượng Firestore, hoặc null nếu không dùng Firebase.
 * Dùng ở đâu: mọi hàm trong web/src/services/firebase/firestore-sync.ts.
 * Liên kết với: firebaseConfig và hasFirebaseConfig ngay phía trên.
 */
export function getFirebaseDb() {
  if (!hasFirebaseConfig) return null;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}
