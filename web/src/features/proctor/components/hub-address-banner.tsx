// File này vẽ dải thông báo địa chỉ kết nối ở trang giám thị: địa chỉ mạng LAN (mạng nội bộ
// trong phòng) và mã kết nối 4 số để máy thí sinh nối vào máy giám thị.

import { Copy, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Props (thông tin khối cha truyền cho khối con): địa chỉ hub, mã kết nối, đã sao chép chưa,
// và việc sao chép (là việc cần chờ, như chờ trình duyệt ghi vào bộ nhớ tạm).
type Props = { hubUrl: string; connectCode: string; copied: boolean; onCopy: () => Promise<void> };

/**
 * Đây là gì: React component (một khối giao diện) dải địa chỉ kết nối.
 * Mục tiêu: cho thí sinh biết cách nối máy mình vào hub (máy trung tâm của giám thị, nơi mọi
 *   máy thí sinh gửi cảnh báo về).
 * Chức năng: hiện địa chỉ LAN mà thí sinh phải gõ trên máy của mình; nếu có mã kết nối thì hiện
 *   thêm mã đó, để ứng dụng của thí sinh tự tìm ra máy này trong mạng LAN; nút "Sao chép" địa chỉ.
 * Đầu ra: khối giao diện dải địa chỉ.
 * Dùng ở đâu: ProctorScreen (web/src/features/proctor/proctor-screen.tsx), chỉ khi đã có hubUrl.
 * Liên kết với: useProctorFeed (../hooks/use-proctor-feed.ts) cung cấp hubUrl và connectCode;
 *   copyHubUrl trong proctor-screen.tsx; hub tự hô trên mạng LAN bằng UDP cổng 8766 (desktop-hub/).
 */
export function HubAddressBanner({ hubUrl, connectCode, copied, onCopy }: Props) {
  return <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Wifi className="size-5" /></span><div className="min-w-0 flex-1"><b className="block text-xs text-blue-950">Địa chỉ kết nối dành cho máy thí sinh</b><p className="mt-1 text-[10px] leading-5 text-blue-700">{connectCode ? 'Máy thí sinh nhập mã kết nối để tự tìm máy này trong mạng LAN/Wi-Fi, hoặc nhập chính xác địa chỉ bên dưới.' : 'Cho các máy dùng cùng mạng LAN/Wi-Fi nhập chính xác địa chỉ này trước khi bắt đầu.'}</p><div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">{connectCode && <div className="shrink-0 rounded-lg bg-blue-600 px-4 py-1.5 text-white" aria-label="Mã kết nối"><span className="block text-[9px] font-bold uppercase tracking-wide text-blue-100">Mã kết nối</span><b className="block font-mono text-2xl leading-7 tracking-[0.3em]">{connectCode}</b></div>}<code className="block min-w-0 flex-1 select-all break-all rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-800 ring-1 ring-blue-100 sm:flex sm:items-center">{hubUrl}</code></div></div><Button type="button" variant="outline" onClick={() => void onCopy()} className="shrink-0 bg-white"><Copy className="size-4" />{copied ? 'Đã sao chép' : 'Sao chép'}</Button></section>;
}
