// File này vẽ thẻ "Vai trò & quyền hạn" trên trang quản trị: ai được làm gì trong hệ thống.

import { KeyRound, ServerCog, ShieldCheck, UsersRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Đây là gì: React component (một khối giao diện) thẻ vai trò.
 * Mục tiêu: giải thích ba vai trò: thí sinh, giám thị, quản trị.
 * Chức năng: liệt kê mỗi vai trò kèm biểu tượng và việc vai trò đó được làm.
 * Đầu ra: khối giao diện thẻ vai trò (chỉ để đọc, không có nút).
 * Dùng ở đâu: AdminScreen (web/src/features/admin/admin-screen.tsx), cột bên phải.
 * Liên kết với: ba màn hình /thi-sinh, /giam-thi, /quan-tri của trang web.
 */
export function RolesCard() {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><KeyRound className="size-4 text-amber-500" /> Vai trò & quyền hạn</CardTitle></CardHeader><CardContent className="grid gap-3 p-5">{[
      [UsersRound, 'Thí sinh', 'Bật camera, xem trạng thái máy của mình'],
      [ShieldCheck, 'Giám thị', 'Theo dõi, xác minh và xuất báo cáo'],
      [ServerCog, 'Quản trị', 'Cấu hình phòng, ngưỡng và thời hạn lưu'],
    ].map(([Icon, role, scope]) => <div key={String(role)} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon className="size-4" /></span><div><b className="text-xs">{String(role)}</b><p className="mt-1 text-[10px] leading-4 text-slate-400">{String(scope)}</p></div></div>)}</CardContent></Card>
  );
}
