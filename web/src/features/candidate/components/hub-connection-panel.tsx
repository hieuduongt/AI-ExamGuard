import { Cable, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HubState } from '../hooks/use-hub-connection';

type Props = {
  hubAddress: string;
  hubState: HubState;
  hubMessage: string;
  changeHubAddress: (value: string) => void;
  connectTeacherHub: () => Promise<void>;
};

export function HubConnectionPanel({ hubAddress, hubState, hubMessage, changeHubAddress, connectTeacherHub }: Props) {
  return (
    <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2"><Cable className="size-4 text-blue-600" /><b className="text-xs text-slate-800">Kết nối máy giám thị</b></div><p className="mt-1 text-[10px] leading-5 text-slate-500">Nhập địa chỉ LAN đang hiển thị trên dashboard của giáo viên.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input aria-label="Địa chỉ máy giám thị" value={hubAddress} onChange={(event) => changeHubAddress(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void connectTeacherHub(); }} placeholder="Ví dụ: http://192.168.1.10:8765" className="h-11 bg-white font-mono text-xs" /><Button type="button" variant="outline" onClick={() => void connectTeacherHub()} disabled={hubState === 'checking' || !hubAddress.trim()} className="h-11 shrink-0 bg-white"><Wifi className="size-4" />{hubState === 'checking' ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}</Button></div><div className={`mt-3 flex items-center gap-2 text-[10px] font-bold ${hubState === 'connected' ? 'text-emerald-700' : hubState === 'disconnected' ? 'text-rose-700' : 'text-slate-500'}`}>{hubState === 'connected' ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{hubMessage}</div></div>
  );
}
