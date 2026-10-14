/**
 * File này quản lý kết nối từ máy thí sinh tới máy giám thị (hub: máy trung tâm của giám thị,
 * nơi mọi máy thí sinh gửi cảnh báo về) qua mạng LAN. Thuộc phần logic thí sinh
 * (web/src/features/candidate/hooks/).
 */
import { useEffect, useState } from 'react';
import { HUB_STATUS_SIGNAL } from '@/services/browser-signals';
import { getConfiguredHubUrl, hasFirebaseConfig, testHubConnection } from '@/services/exam-sync';

// Tình trạng kết nối máy giám thị: chưa kiểm tra, đang kiểm tra, đã kết nối, mất kết nối.
export type HubState = 'unchecked' | 'checking' | 'connected' | 'disconnected';

/**
 * Đây là gì: hook giữ địa chỉ máy giám thị và tình trạng kết nối.
 * Mục tiêu: biết máy thí sinh có liên lạc được với máy giám thị (hub trong mạng LAN) không.
 * Chức năng: nhớ địa chỉ đang gõ, tình trạng và lời nhắn kết nối; lúc mở trang, nếu đã có
 *   địa chỉ lưu từ trước thì tự kiểm tra lại; lắng nghe tin báo kết nối/mất kết nối trong lúc
 *   chạy. Nếu đã cấu hình Firebase (dịch vụ đám mây) thì không cần hub, nên tình trạng bắt
 *   đầu luôn là "đã kết nối".
 * Đầu ra: { hubAddress, hubState, hubMessage, changeHubAddress, connectTeacherHub, connectTo }.
 * Dùng ở đâu: CandidateScreen trong web/src/features/candidate/candidate-screen.tsx.
 * Liên kết với: getConfiguredHubUrl (web/src/services/hub/hub-url.ts), testHubConnection
 *   (web/src/services/hub/hub-client.ts), HUB_STATUS_SIGNAL (web/src/services/browser-signals.ts).
 */
export function useHubConnection() {
  const [hubAddress, setHubAddress] = useState(() => getConfiguredHubUrl());
  const [hubState, setHubState] = useState<HubState>(hasFirebaseConfig ? 'connected' : 'unchecked');
  const [hubMessage, setHubMessage] = useState(hasFirebaseConfig ? 'Đang đồng bộ qua Firebase.' : 'Nhập địa chỉ hiển thị trên máy giám thị.');

  useEffect(() => {
    if (hasFirebaseConfig) return;
    const savedAddress = getConfiguredHubUrl();
    if (!savedAddress) return;
    void testHubConnection(savedAddress).then((result) => {
      setHubAddress(result.hubUrl || savedAddress);
      setHubState(result.ok ? 'connected' : 'disconnected');
      setHubMessage(result.message);
    });
  }, []);

  useEffect(() => {
    if (hasFirebaseConfig) return;
    /**
     * Đây là gì: hàm con chạy mỗi khi có tin báo kết nối máy giám thị thay đổi.
     * Mục tiêu: màn hình thí sinh luôn biết đang nối hay đã mất kết nối.
     * Chức năng: đọc tình trạng mới ('connected' hoặc 'disconnected') rồi cập nhật tình
     *   trạng và lời nhắn tương ứng.
     * Đầu ra: không trả về gì.
     * Dùng ở đâu: gắn vào sự kiện HUB_STATUS_SIGNAL của cửa sổ ngay bên dưới.
     * Liên kết với: emitHubStatus (web/src/services/browser-signals.ts), được gọi từ
     *   web/src/services/hub/hub-transport.ts và hub-client.ts.
     */
    const onHubStatus = (event: Event) => {
      const status = (event as CustomEvent<'connected' | 'disconnected'>).detail;
      setHubState(status);
      setHubMessage(status === 'connected'
        ? 'Đang gửi trạng thái tới máy giám thị.'
        : 'Mất kết nối máy giám thị. Hãy kiểm tra mạng LAN/Wi-Fi.');
    };
    window.addEventListener(HUB_STATUS_SIGNAL, onHubStatus);
    return () => window.removeEventListener(HUB_STATUS_SIGNAL, onHubStatus);
  }, []);

  /**
   * Đây là gì: hàm đổi địa chỉ máy giám thị khi thí sinh gõ.
   * Mục tiêu: ghi nhận địa chỉ mới và nhắc rằng địa chỉ này chưa được kiểm tra.
   * Chức năng: lưu chữ vừa gõ và đặt tình trạng về "chưa kiểm tra".
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: ô nhập địa chỉ trong components/hub-connection-panel.tsx.
   * Liên kết với: connectTeacherHub (kiểm tra địa chỉ này).
   */
  function changeHubAddress(value: string) {
    setHubAddress(value);
    setHubState('unchecked');
  }

  /**
   * Đây là gì: hàm thử kết nối tới một địa chỉ máy giám thị.
   * Mục tiêu: xác nhận máy thí sinh nói chuyện được với máy giám thị trước khi thi.
   * Chức năng: báo "Đang kiểm tra kết nối…", chờ máy giám thị trả lời (việc cần chờ, như chờ
   *   mạng trả lời), rồi ghi địa chỉ đã chuẩn hóa, tình trạng và lời nhắn từ kết quả.
   * Đầu ra: true nếu kết nối được, false nếu không (trả về sau khi chờ xong).
   * Dùng ở đâu: connectTeacherHub ngay bên dưới; useHubDiscovery (use-hub-discovery.ts) khi
   *   tìm được máy giám thị bằng mã 4 số.
   * Liên kết với: testHubConnection (web/src/services/hub/hub-client.ts).
   */
  async function connectTo(address: string) {
    setHubAddress(address);
    setHubState('checking');
    setHubMessage('Đang kiểm tra kết nối…');
    const result = await testHubConnection(address);
    setHubAddress(result.hubUrl || address);
    setHubState(result.ok ? 'connected' : 'disconnected');
    setHubMessage(result.message);
    return result.ok;
  }

  /**
   * Đây là gì: hàm kiểm tra kết nối tới địa chỉ thí sinh đã gõ.
   * Mục tiêu: chạy khi thí sinh bấm nút "Kiểm tra kết nối" hoặc phím Enter.
   * Chức năng: gọi connectTo với địa chỉ đang có trong ô nhập.
   * Đầu ra: không trả về giá trị (chỉ chờ cho xong).
   * Dùng ở đâu: components/hub-connection-panel.tsx.
   * Liên kết với: connectTo ở trên.
   */
  async function connectTeacherHub() {
    await connectTo(hubAddress);
  }

  return { hubAddress, hubState, hubMessage, changeHubAddress, connectTeacherHub, connectTo };
}
