// File này lo tiếng báo động ở trang giám thị: phát âm thanh khi có cảnh báo mới và nhớ
// lựa chọn bật/tắt âm thanh của giám thị.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

// Đường dẫn file âm thanh báo động (nằm trong web/public/sounds/).
const SOUND_URL = '/sounds/alert-warning.mp3';
// Tên ô trong localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn) lưu chữ 'on' hoặc 'off'.
const SOUND_PREF_KEY = 'examguard:proctor-sound:v1';

// Danh sách những nơi đang "lắng nghe" để biết khi nào lựa chọn âm thanh thay đổi.
const prefListeners = new Set<() => void>();

/**
 * Đây là gì: hàm đăng ký theo dõi lựa chọn bật/tắt âm thanh.
 * Mục tiêu: để màn hình tự cập nhật khi lựa chọn âm thanh đổi, kể cả khi đổi ở thẻ trình
 *   duyệt khác.
 * Chức năng: thêm người nghe vào prefListeners và lắng nghe sự kiện 'storage' (trình duyệt báo
 *   localStorage đổi từ thẻ khác).
 * Đầu ra: một hàm "hủy đăng ký" để gỡ người nghe khi không cần nữa.
 * Dùng ở đâu: useAlertSound bên dưới (truyền cho useSyncExternalStore của React).
 * Liên kết với: writeSoundPref (báo cho prefListeners), readSoundPref.
 */
function subscribeSoundPref(listener: () => void) {
  prefListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    prefListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * Đây là gì: hàm đọc lựa chọn âm thanh đã lưu.
 * Mục tiêu: biết giám thị đang muốn bật hay tắt tiếng báo động.
 * Chức năng: đọc ô SOUND_PREF_KEY trong localStorage; chỉ khi ghi 'off' mới là tắt, còn chưa
 *   lưu gì thì coi như bật.
 * Đầu ra: true (bật) hoặc false (tắt).
 * Dùng ở đâu: useAlertSound, play và onSoundButton trong file này.
 * Liên kết với: writeSoundPref (ghi giá trị này).
 */
function readSoundPref() {
  return window.localStorage.getItem(SOUND_PREF_KEY) !== 'off';
}

/**
 * Đây là gì: hàm lưu lựa chọn bật/tắt âm thanh.
 * Mục tiêu: nhớ lựa chọn của giám thị cho những lần mở trang sau.
 * Chức năng: ghi 'on' hoặc 'off' vào localStorage rồi báo cho mọi người nghe trong prefListeners.
 * Đầu ra: không trả về gì.
 * Dùng ở đâu: onSoundButton trong useAlertSound.
 * Liên kết với: readSoundPref, subscribeSoundPref.
 */
function writeSoundPref(enabled: boolean) {
  window.localStorage.setItem(SOUND_PREF_KEY, enabled ? 'on' : 'off');
  prefListeners.forEach((listener) => listener());
}

/**
 * Đây là gì: hook (hàm đặc biệt của React giúp màn hình nhớ dữ liệu và tự vẽ lại khi dữ liệu
 *   đổi) quản lý tiếng báo động của trang giám thị.
 * Mục tiêu: kêu một tiếng báo khi có cảnh báo mới để giám thị không bỏ lỡ.
 * Chức năng: mặc định bật; lựa chọn bật/tắt được nhớ riêng cho từng trình duyệt. Chuẩn bị sẵn
 *   file âm thanh khi trang mở. Trình duyệt có thể chặn phát âm thanh cho tới khi trang được
 *   bấm vào ít nhất một lần, nên nếu bị chặn thì báo ra để giao diện nhắc giám thị bấm.
 * Đầu ra: { soundEnabled (đang bật?), soundBlocked (đang bị chặn?), playAlertSound (hàm phát
 *   tiếng), onSoundButton (hàm xử lý khi bấm nút âm thanh) }.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx).
 * Liên kết với: SoundButton trong components/proctor-heading.tsx; file
 *   web/public/sounds/alert-warning.mp3.
 */
export function useAlertSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabled = useSyncExternalStore(subscribeSoundPref, readSoundPref, () => true);
  const [blocked, setBlocked] = useState(false);

  // Khi trang mở: nạp sẵn file âm thanh; khi đóng trang: dừng tiếng và bỏ file.
  useEffect(() => {
    const audio = new Audio(SOUND_URL);
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  /**
   * Đây là gì: hàm con phát tiếng báo động.
   * Mục tiêu: kêu một lần khi có cảnh báo mới.
   * Chức năng: nếu chưa có file âm thanh hoặc giám thị đã tắt tiếng thì thôi; nếu không thì tua
   *   về đầu và phát; phát được thì bỏ dấu "bị chặn", bị trình duyệt từ chối thì bật dấu "bị chặn".
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: ProctorScreen (dưới tên playAlertSound) khi có latestAlert; onSoundButton bên dưới.
   * Liên kết với: readSoundPref, audioRef (file âm thanh đã chuẩn bị sẵn).
   */
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !readSoundPref()) return;
    audio.currentTime = 0;
    audio.play().then(() => setBlocked(false), () => setBlocked(true));
  }, []);

  /**
   * Đây là gì: hàm con xử lý khi giám thị bấm nút âm thanh.
   * Mục tiêu: bật hoặc tắt tiếng báo động bằng một nút.
   * Chức năng: nếu đang bật và không bị chặn thì tắt (lưu 'off', dừng tiếng đang kêu); còn lại
   *   (đang tắt, hoặc đang bị chặn) thì bật (lưu 'on') và phát thử một tiếng, nhờ cú bấm này mà
   *   trình duyệt cho phép phát âm thanh.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: SoundButton trong components/proctor-heading.tsx (qua ProctorScreen).
   * Liên kết với: writeSoundPref, readSoundPref, play.
   */
  const onSoundButton = useCallback(() => {
    if (readSoundPref() && !blocked) {
      writeSoundPref(false);
      audioRef.current?.pause();
      return;
    }
    writeSoundPref(true);
    play();
  }, [blocked, play]);

  return { soundEnabled: enabled, soundBlocked: enabled && blocked, playAlertSound: play, onSoundButton };
}
