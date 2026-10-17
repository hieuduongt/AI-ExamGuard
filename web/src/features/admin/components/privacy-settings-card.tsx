// File này vẽ thẻ "Quyền riêng tư & lưu trữ" trên trang quản trị: hai công tắc bật/tắt
// về việc xin xác nhận của thí sinh và việc lưu ảnh khi có cảnh báo.

import { LockKeyhole } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

// Props (thông tin khối cha truyền cho khối con): giá trị hai công tắc và việc cần làm khi gạt.
type Props = {
  requireConsent: boolean;
  storeSnapshots: boolean;
  onRequireConsentChange: (value: boolean) => void;
  onStoreSnapshotsChange: (value: boolean) => void;
};

/**
 * Đây là gì: React component (một khối giao diện) thẻ cài đặt quyền riêng tư.
 * Mục tiêu: cho người quản trị chọn mức thu thập dữ liệu, theo nguyên tắc thu ít nhất có thể.
 * Chức năng: công tắc "Yêu cầu thí sinh xác nhận thông báo giám sát" và công tắc
 *   "Lưu đoạn hình ngắn khi cảnh báo" (mặc định tắt); gạt công tắc thì báo lên khối cha.
 * Đầu ra: khối giao diện thẻ quyền riêng tư.
 * Dùng ở đâu: AdminScreen (web/src/features/admin/admin-screen.tsx).
 * Liên kết với: requireConsent, storeSnapshots được lưu bởi saveSettings trong admin-screen.tsx.
 */
export function PrivacySettingsCard({ requireConsent, storeSnapshots, onRequireConsentChange, onStoreSnapshotsChange }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><LockKeyhole className="size-5 text-emerald-600" /> Quyền riêng tư & lưu trữ</CardTitle><CardDescription>Thiết lập theo nguyên tắc tối thiểu hóa dữ liệu cá nhân.</CardDescription></CardHeader><CardContent className="grid gap-3 p-6"><div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"><Switch aria-label="Yêu cầu thí sinh xác nhận thông báo giám sát" checked={requireConsent} onCheckedChange={onRequireConsentChange} className="mt-1" /><span><b className="block text-xs">Yêu cầu thí sinh xác nhận thông báo giám sát</b><small className="mt-1 block text-[10px] leading-5 text-slate-400">Nút bắt đầu chỉ hoạt động sau khi thí sinh đọc và đồng ý.</small></span></div><div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"><Switch aria-label="Lưu đoạn hình ngắn khi cảnh báo" checked={storeSnapshots} onCheckedChange={onStoreSnapshotsChange} className="mt-1" /><span><b className="block text-xs">Lưu đoạn hình ngắn khi cảnh báo</b><small className="mt-1 block text-[10px] leading-5 text-slate-400">Mặc định tắt. Bấm “Lưu thay đổi” sẽ đẩy công tắc lên máy giám thị (hub). Máy thí sinh đọc lại khi bắt đầu phiên, rồi gửi kèm đoạn hình ~5 giây (hoặc lưới ảnh dự phòng). Giám thị mở chi tiết cảnh báo → nút “Xem lại đoạn hình ngắn”. Chỉ nằm trong bộ nhớ; đóng phần mềm là mất.</small></span></div></CardContent></Card>
  );
}
