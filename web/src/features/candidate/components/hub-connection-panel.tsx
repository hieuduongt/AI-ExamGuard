import { Cable, Search, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sameRoom, type DiscoveredHub } from '@/services/exam-sync';
import type { HubState } from '../hooks/use-hub-connection';
import type { useHubDiscovery } from '../hooks/use-hub-discovery';

type Props = {
  hubAddress: string;
  hubState: HubState;
  hubMessage: string;
  changeHubAddress: (value: string) => void;
  connectTeacherHub: () => Promise<void>;
  discovery: ReturnType<typeof useHubDiscovery>;
  roomId: string;
};

function HubLabel({ hub, roomId }: { hub: DiscoveredHub; roomId: string }) {
  return <><b className="text-slate-800">{hub.room || 'Chưa đặt tên phòng'}</b>{hub.host && <span className="text-slate-500"> · {hub.host}</span>}<span className="font-mono text-slate-500"> · {hub.hubUrl}</span>{sameRoom(hub.room, roomId) && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">Trùng phòng của bạn</span>}</>;
}

function CodeSearchStatus({ discovery, roomId }: { discovery: Props['discovery']; roomId: string }) {
  const { search, nearby, code } = discovery;
  if (search.state === 'searching') return <p className="text-[10px] font-bold text-slate-500">Đang tìm máy giám thị có mã {code}…</p>;
  if (search.state === 'none') return <p className="text-[10px] font-bold text-rose-700">Không tìm thấy máy giám thị có mã này. Kiểm tra lại mã, mạng LAN/Wi-Fi, hoặc nhập địa chỉ bên dưới.</p>;
  if (search.state === 'many') {
    return <div className="grid gap-1.5"><p className="text-[10px] font-bold text-amber-700">Có {search.hubs.length} máy giám thị cùng mã này. Chọn đúng phòng của bạn:</p>{search.hubs.map((hub) => <button key={hub.hubUrl} type="button" onClick={() => void discovery.chooseHub(hub)} className="rounded-lg bg-white px-3 py-2 text-left text-[10px] ring-1 ring-slate-200 hover:ring-blue-400"><HubLabel hub={hub} roomId={roomId} /></button>)}</div>;
  }
  if (!nearby.length) return <p className="text-[10px] text-slate-500">Chưa thấy máy giám thị nào trong mạng. Máy giám thị cần mở trang Giám thị; nếu Wi-Fi chặn tìm kiếm, hãy nhập địa chỉ bên dưới.</p>;
  return <div className="grid gap-1"><p className="text-[10px] text-slate-500">Đang thấy {nearby.length} máy giám thị trong mạng:</p>{nearby.map((hub) => <p key={hub.hubUrl} className="text-[10px]"><HubLabel hub={hub} roomId={roomId} /></p>)}</div>;
}

export function HubConnectionPanel({ hubAddress, hubState, hubMessage, changeHubAddress, connectTeacherHub, discovery, roomId }: Props) {
  const showCode = discovery.available && hubState !== 'connected';
  return (
    <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2"><Cable className="size-4 text-blue-600" /><b className="text-xs text-slate-800">Kết nối máy giám thị</b></div><p className="mt-1 text-[10px] leading-5 text-slate-500">{showCode ? 'Nhập mã kết nối 4 số, hoặc địa chỉ LAN, đang hiển thị trên dashboard của giáo viên.' : 'Nhập địa chỉ LAN đang hiển thị trên dashboard của giáo viên.'}</p>{showCode && <div className="mt-3 grid gap-2"><div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Mã kết nối" inputMode="numeric" autoComplete="off" maxLength={4} value={discovery.code} onChange={(event) => discovery.changeCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void discovery.searchByCode(); }} placeholder="Mã 4 số, ví dụ: 4821" className="h-11 bg-white font-mono text-base font-black tracking-[0.3em] placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal sm:w-56" /><Button type="button" variant="outline" onClick={() => void discovery.searchByCode()} disabled={discovery.code.length !== 4 || discovery.search.state === 'searching' || hubState === 'checking'} className="h-11 shrink-0 bg-white"><Search className="size-4" />Tìm máy giám thị</Button></div><CodeSearchStatus discovery={discovery} roomId={roomId} /><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">hoặc nhập địa chỉ</p></div>}<div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input aria-label="Địa chỉ máy giám thị" value={hubAddress} onChange={(event) => changeHubAddress(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void connectTeacherHub(); }} placeholder="Ví dụ: http://192.168.1.10:8765" className="h-11 bg-white font-mono text-xs" /><Button type="button" variant="outline" onClick={() => void connectTeacherHub()} disabled={hubState === 'checking' || !hubAddress.trim()} className="h-11 shrink-0 bg-white"><Wifi className="size-4" />{hubState === 'checking' ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}</Button></div><div className={`mt-3 flex items-center gap-2 text-[10px] font-bold ${hubState === 'connected' ? 'text-emerald-700' : hubState === 'disconnected' ? 'text-rose-700' : 'text-slate-500'}`}>{hubState === 'connected' ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{hubMessage}</div></div>
  );
}
