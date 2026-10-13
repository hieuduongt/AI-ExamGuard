import { LockKeyhole } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

type Props = {
  requireConsent: boolean;
  storeSnapshots: boolean;
  onRequireConsentChange: (value: boolean) => void;
  onStoreSnapshotsChange: (value: boolean) => void;
};

export function PrivacySettingsCard({ requireConsent, storeSnapshots, onRequireConsentChange, onStoreSnapshotsChange }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><LockKeyhole className="size-5 text-emerald-600" /> Quyền riêng tư & lưu trữ</CardTitle><CardDescription>Thiết lập theo nguyên tắc tối thiểu hóa dữ liệu cá nhân.</CardDescription></CardHeader><CardContent className="grid gap-3 p-6"><div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"><Switch aria-label="Yêu cầu thí sinh xác nhận thông báo giám sát" checked={requireConsent} onCheckedChange={onRequireConsentChange} className="mt-1" /><span><b className="block text-xs">Yêu cầu thí sinh xác nhận thông báo giám sát</b><small className="mt-1 block text-[10px] leading-5 text-slate-400">Nút bắt đầu chỉ hoạt động sau khi thí sinh đọc và đồng ý.</small></span></div><div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"><Switch aria-label="Lưu ảnh tại thời điểm cảnh báo" checked={storeSnapshots} onCheckedChange={onStoreSnapshotsChange} className="mt-1" /><span><b className="block text-xs">Lưu ảnh tại thời điểm cảnh báo</b><small className="mt-1 block text-[10px] leading-5 text-slate-400">Mặc định tắt. Chỉ bật khi quy chế, cơ sở pháp lý và thời hạn xóa dữ liệu đã được xác định.</small></span></div></CardContent></Card>
  );
}
