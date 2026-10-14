/**
 * File này giúp máy thí sinh tự tìm máy giám thị trong mạng LAN, nhất là bằng mã kết nối 4 số,
 * thay vì phải gõ địa chỉ. Thuộc phần logic thí sinh (web/src/features/candidate/hooks/).
 * Máy giám thị tự "hô" trên mạng (UDP broadcast: hô to cho mọi máy trong cùng mạng nghe thấy)
 * kèm mã 4 số; hub chạy trên máy này nghe được và kể lại cho trang web.
 */
import { useEffect, useState } from 'react';
import { fetchDiscoveredHubs, hasFirebaseConfig, isConnectCode, type DiscoveredHub } from '@/services/exam-sync';

// Cứ 2 giây hỏi lại danh sách máy giám thị một lần.
const POLL_MS = 2000;
// Máy giám thị hô mỗi 2 giây, nên hỏi vài lượt là đủ bắt được cả máy giám thị vừa mới mở.
const SEARCH_ATTEMPTS = 3;

// Kết quả tìm bằng mã: chưa tìm, đang tìm, không thấy, hoặc thấy nhiều máy (kèm danh sách).
export type CodeSearch =
  | { state: 'idle' }
  | { state: 'searching' }
  | { state: 'none' }
  | { state: 'many'; hubs: DiscoveredHub[] };

/**
 * Đây là gì: hàm nhỏ "đợi một lúc".
 * Mục tiêu: nghỉ giữa các lượt tìm máy giám thị.
 * Chức năng: tạo một việc cần chờ, xong sau đúng ms mili giây.
 * Đầu ra: một việc cần chờ (Promise), không mang giá trị gì.
 * Dùng ở đâu: searchByCode bên dưới.
 * Liên kết với: POLL_MS (thời gian chờ giữa các lượt).
 */
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Đây là gì: hook tìm máy giám thị trong mạng LAN.
 * Mục tiêu: thí sinh chỉ cần gõ mã 4 số là nối được với máy giám thị.
 * Chức năng: danh sách máy giám thị đang hô trên mạng LAN do chính hub phục vụ trang này nghe
 *   được (chỉ có ở ứng dụng máy tính). Khi được bật thì cứ 2 giây hỏi lại danh sách máy gần
 *   đây; cho gõ mã, tìm theo mã, chọn một máy khi có nhiều máy cùng mã. Ở nơi khác
 *   `available` luôn là false, và ô kết nối chỉ còn cách gõ địa chỉ.
 * Đầu ra: { available, nearby, code, search, changeCode, searchByCode, chooseHub }.
 * Dùng ở đâu: CandidateScreen (candidate-screen.tsx), bật khi chưa giám sát và chưa kết nối;
 *   kết quả hiển thị trong components/hub-connection-panel.tsx.
 * Liên kết với: fetchDiscoveredHubs, isConnectCode (web/src/services/hub/hub-discovery.ts);
 *   API /api/discover của desktop-hub (desktop-hub/examguard_desktop/http_handler.py,
 *   discovery.py); connectTo trong use-hub-connection.ts.
 */
export function useHubDiscovery(active: boolean, connectTo: (address: string) => Promise<boolean>) {
  const [available, setAvailable] = useState(false);
  const [nearby, setNearby] = useState<DiscoveredHub[]>([]);
  const [code, setCode] = useState('');
  const [search, setSearch] = useState<CodeSearch>({ state: 'idle' });

  useEffect(() => {
    if (hasFirebaseConfig || !active) return;
    let cancelled = false;
    /**
     * Đây là gì: hàm con hỏi một lượt danh sách máy giám thị trong mạng.
     * Mục tiêu: cập nhật danh sách máy giám thị đang thấy.
     * Chức năng: hỏi hub danh sách máy nghe được; nếu đã tắt việc tìm thì bỏ qua kết quả;
     *   nếu hub trả lời được thì đánh dấu "có tính năng tìm" và lưu danh sách.
     * Đầu ra: việc cần chờ, không mang giá trị.
     * Dùng ở đâu: gọi ngay một lần rồi cứ POLL_MS lại gọi trong hiệu ứng này.
     * Liên kết với: fetchDiscoveredHubs (web/src/services/hub/hub-discovery.ts).
     */
    const poll = async () => {
      const hubs = await fetchDiscoveredHubs();
      if (cancelled) return;
      setAvailable(hubs !== null);
      setNearby(hubs ?? []);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active]);

  /**
   * Đây là gì: hàm tìm máy giám thị theo mã kết nối 4 số.
   * Mục tiêu: tự nối với đúng máy giám thị mà không cần gõ địa chỉ.
   * Chức năng: nếu mã không đủ 4 chữ số thì thôi; tìm tối đa SEARCH_ATTEMPTS lượt, cách nhau
   *   POLL_MS: thấy đúng 1 máy thì kết nối luôn; thấy nhiều máy thì để thí sinh chọn; hết
   *   lượt mà không thấy thì báo "không tìm thấy".
   * Đầu ra: việc cần chờ, không mang giá trị; kết quả nằm trong `search`.
   * Dùng ở đâu: changeCode ngay bên dưới (khi gõ đủ 4 số); nút "Tìm máy giám thị" và phím Enter
   *   trong components/hub-connection-panel.tsx.
   * Liên kết với: isConnectCode, fetchDiscoveredHubs, wait, connectTo.
   */
  async function searchByCode(value = code) {
    if (!isConnectCode(value)) return;
    setSearch({ state: 'searching' });
    for (let attempt = 0; attempt < SEARCH_ATTEMPTS; attempt += 1) {
      if (attempt) await wait(POLL_MS);
      const hubs = await fetchDiscoveredHubs(value) ?? [];
      if (hubs.length === 1) {
        setSearch({ state: 'idle' });
        await connectTo(hubs[0].hubUrl);
        return;
      }
      if (hubs.length > 1) {
        setSearch({ state: 'many', hubs });
        return;
      }
    }
    setSearch({ state: 'none' });
  }

  /**
   * Đây là gì: hàm xử lý khi thí sinh gõ vào ô mã kết nối.
   * Mục tiêu: chỉ nhận chữ số và tự tìm ngay khi gõ đủ mã.
   * Chức năng: bỏ mọi ký tự không phải chữ số, giữ tối đa 4 số, xóa kết quả tìm cũ; nếu đủ
   *   4 số thì bắt đầu tìm luôn.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: ô "Mã kết nối" trong components/hub-connection-panel.tsx.
   * Liên kết với: searchByCode ở trên.
   */
  function changeCode(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setCode(digits);
    setSearch({ state: 'idle' });
    if (digits.length === 4) void searchByCode(digits);
  }

  /**
   * Đây là gì: hàm chọn một máy giám thị khi có nhiều máy cùng mã.
   * Mục tiêu: nối đúng với máy giám thị của phòng mình.
   * Chức năng: xóa kết quả tìm rồi kết nối tới địa chỉ của máy được chọn.
   * Đầu ra: việc cần chờ, không mang giá trị.
   * Dùng ở đâu: nút chọn máy trong CodeSearchStatus (components/hub-connection-panel.tsx).
   * Liên kết với: connectTo (use-hub-connection.ts).
   */
  async function chooseHub(hub: DiscoveredHub) {
    setSearch({ state: 'idle' });
    await connectTo(hub.hubUrl);
  }

  return { available, nearby, code, search, changeCode, searchByCode, chooseHub };
}
