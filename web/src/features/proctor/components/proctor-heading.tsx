import { BellRing, Download, Radio, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { hasFirebaseConfig } from '@/services/exam-sync';

type Props = {
  hubConnected: boolean;
  clock: Date;
  onDemoAlert: () => void;
  onExport: () => void;
  soundEnabled: boolean;
  soundBlocked: boolean;
  onSoundButton: () => void;
};

function SoundButton({ soundEnabled, soundBlocked, onSoundButton }: Pick<Props, 'soundEnabled' | 'soundBlocked' | 'onSoundButton'>) {
  if (soundBlocked) {
    return <Button variant="outline" size="lg" onClick={onSoundButton} className="h-10 animate-pulse border-amber-300 bg-amber-50 text-amber-800"><Volume2 /> Bấm để bật âm thanh</Button>;
  }
  return <Button variant="outline" size="lg" onClick={onSoundButton} aria-pressed={soundEnabled} title={soundEnabled ? 'Tắt âm thanh cảnh báo' : 'Bật âm thanh cảnh báo'} className="h-10 bg-white">{soundEnabled ? <Volume2 /> : <VolumeX />} {soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</Button>;
}

export function ProctorHeading({ hubConnected, clock, onDemoAlert, onExport, soundEnabled, soundBlocked, onSoundButton }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="mb-3 flex flex-wrap items-center gap-2"><Badge className="bg-blue-100 text-blue-700">DASHBOARD GIÁM THỊ</Badge><Badge variant="outline" className={hubConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>{hubConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />} {hasFirebaseConfig ? 'Firebase thời gian thực' : hubConnected ? 'Trung tâm LAN đang hoạt động' : 'Mất kết nối trung tâm'}</Badge></div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Giám sát phòng thi</h1><p className="mt-2 text-sm text-slate-500">Hiển thị đúng phòng, số máy, số báo danh và họ tên từ các máy thí sinh.</p></div>
      <div className="flex flex-wrap gap-2"><SoundButton soundEnabled={soundEnabled} soundBlocked={soundBlocked} onSoundButton={onSoundButton} /><Button variant="outline" size="lg" onClick={onDemoAlert} className="h-10 bg-white"><BellRing /> Tạo cảnh báo thử</Button><Button variant="outline" size="lg" onClick={onExport} className="h-10 bg-white"><Download /> Xuất báo cáo</Button><div className="flex h-10 items-center gap-2 rounded-xl bg-[#0a1b35] px-4 text-xs font-bold text-white"><Radio className="size-4 text-emerald-400" /><span className="text-slate-400">TRỰC TUYẾN</span><time>{clock.getTime() ? clock.toLocaleTimeString('vi-VN') : '—'}</time></div></div>
    </div>
  );
}
