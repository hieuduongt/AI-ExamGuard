type Props = { running: boolean; pendingCount: number; errorMessage: string };

// Shown only while monitoring, above the camera.
export function SessionNotices({ running, pendingCount, errorMessage }: Props) {
  return (
    <>
      {running && <div className="mb-5 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>Để kiểm tra trên cùng máy, bấm <b>Mở Giám thị ↗</b> ở phía trên. Webcam sẽ tiếp tục chạy ở cửa sổ này.</p>
        <p>{pendingCount > 0 ? `${pendingCount} cảnh báo đang chờ gửi lại. Hãy giữ ứng dụng mở.` : 'Cảnh báo sẽ ghi “Giám thị đã nhận” sau khi máy giám thị xác nhận.'}</p>
      </div>}
      {running && errorMessage && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{errorMessage}</p>}
    </>
  );
}
