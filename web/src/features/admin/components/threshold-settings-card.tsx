import { BrainCircuit, TimerReset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BehaviorThresholds } from '@/domain/exam-types';

type Props = { settings: BehaviorThresholds; updateThreshold: (key: keyof BehaviorThresholds, value: string) => void };

export function ThresholdSettingsCard({ settings, updateThreshold }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><TimerReset className="size-5 text-violet-600" /> Bộ đệm & ngưỡng cảnh báo</CardTitle><CardDescription>Chỉ tạo sự kiện khi tín hiệu kéo dài liên tục quá ngưỡng.</CardDescription></CardHeader><CardContent className="grid gap-3 p-6 sm:grid-cols-2">{[
      ['noFaceSeconds', 'Không có mặt', 'Thời gian thí sinh rời khỏi khung hình', 'giây'],
      ['multipleFacesSeconds', 'Nhiều khuôn mặt', 'Thời gian xuất hiện người thứ hai', 'giây'],
      ['headTurnSeconds', 'Quay/cúi/ngẩng đầu', 'Tín hiệu tư thế bất thường kéo dài', 'giây'],
      ['gazeAwaySeconds', 'Hướng mắt lệch', 'Nhìn khỏi vùng màn hình liên tục', 'giây'],
      ['cooldownSeconds', 'Khoảng nghỉ cảnh báo', 'Không lặp cùng cảnh báo quá dày', 'giây'],
    ].map(([key, title, description, unit]) => <label htmlFor={`threshold-${key}`} key={key} className={`flex items-center gap-4 rounded-2xl border border-slate-200 p-4 ${key === 'cooldownSeconds' ? 'sm:col-span-2' : ''}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><BrainCircuit className="size-5" /></span><span className="min-w-0 flex-1"><b className="block text-xs">{title}</b><small className="mt-1 block text-[10px] leading-4 text-slate-400">{description}</small></span><span className="relative"><Input id={`threshold-${key}`} type="number" min={1} max={60} value={settings[key as keyof BehaviorThresholds]} onChange={(event) => updateThreshold(key as keyof BehaviorThresholds, event.target.value)} className="h-10 w-20 bg-slate-50 pr-9 text-center font-black" /><i className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold not-italic text-slate-400">{unit}</i></span></label>)}</CardContent></Card>
  );
}
