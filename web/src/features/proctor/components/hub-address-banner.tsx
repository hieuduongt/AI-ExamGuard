import { Copy, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { hubUrl: string; copied: boolean; onCopy: () => Promise<void> };

// LAN address students must type on their machines.
export function HubAddressBanner({ hubUrl, copied, onCopy }: Props) {
  return <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Wifi className="size-5" /></span><div className="min-w-0 flex-1"><b className="block text-xs text-blue-950">Địa chỉ kết nối dành cho máy thí sinh</b><p className="mt-1 text-[10px] leading-5 text-blue-700">Cho các máy dùng cùng mạng LAN/Wi-Fi nhập chính xác địa chỉ này trước khi bắt đầu.</p><code className="mt-2 block select-all break-all rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-800 ring-1 ring-blue-100">{hubUrl}</code></div><Button type="button" variant="outline" onClick={() => void onCopy()} className="shrink-0 bg-white"><Copy className="size-4" />{copied ? 'Đã sao chép' : 'Sao chép'}</Button></section>;
}
