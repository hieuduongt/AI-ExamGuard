// File này vẽ thẻ "Thông tin phòng thi" trên trang quản trị: ô nhập tên phòng, số máy
// thí sinh và vài ô phòng mẫu để minh họa.

import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Props (thông tin khối cha truyền cho khối con): tên phòng, số máy và việc cần làm khi chúng đổi.
type Props = {
  roomName: string;
  stationCount: number;
  onRoomNameChange: (value: string) => void;
  onStationCountChange: (value: number) => void;
};

/**
 * Đây là gì: React component (một khối giao diện) thẻ thông tin phòng thi.
 * Mục tiêu: cho người quản trị đặt tên phòng và số máy thí sinh.
 * Chức năng: hai ô nhập (tên hiển thị; số máy từ 1 đến 80); gõ vào thì báo lên khối cha;
 *   bên dưới có 3 ô phòng mẫu (PHONG-01..03) chỉ để minh họa, không phải dữ liệu thật.
 * Đầu ra: khối giao diện thẻ phòng thi.
 * Dùng ở đâu: AdminScreen (web/src/features/admin/admin-screen.tsx).
 * Liên kết với: roomName được lưu vào SETTINGS_STORAGE_KEY; trang giám thị đọc lại tên phòng
 *   qua savedRoomName trong web/src/features/proctor/hooks/use-proctor-feed.ts.
 */
export function RoomSettingsCard({ roomName, stationCount, onRoomNameChange, onStationCountChange }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><Settings2 className="size-5 text-blue-600" /> Thông tin phòng thi</CardTitle><CardDescription>Cấu hình nhận diện dùng chung cho các máy trong phòng.</CardDescription></CardHeader><CardContent className="grid gap-5 p-6 sm:grid-cols-2"><label htmlFor="room-name" className="grid gap-2 text-xs font-bold text-slate-600">Tên hiển thị<Input id="room-name" value={roomName} onChange={(event) => onRoomNameChange(event.target.value)} className="h-11 bg-slate-50" /></label><label htmlFor="station-count" className="grid gap-2 text-xs font-bold text-slate-600">Số máy thí sinh<Input id="station-count" type="number" min={1} max={80} value={stationCount} onChange={(event) => onStationCountChange(Number(event.target.value))} className="h-11 bg-slate-50" /></label><div className="sm:col-span-2 grid gap-3 sm:grid-cols-3">{[['PHONG-01', 'Đang hoạt động', '15/15 máy'], ['PHONG-02', 'Sẵn sàng', '0/20 máy'], ['PHONG-03', 'Tạm đóng', '0/18 máy']].map(([code, status, machines], index) => <div key={code} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center justify-between"><b className="text-xs">{code}</b><span className={`size-2 rounded-full ${index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-blue-400' : 'bg-slate-300'}`} /></div><p className="mt-3 text-[10px] font-bold text-slate-500">{status}</p><small className="mt-1 block text-[9px] text-slate-400">{machines}</small></div>)}</div></CardContent></Card>
  );
}
