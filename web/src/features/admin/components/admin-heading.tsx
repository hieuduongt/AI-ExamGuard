import { CheckCircle2, Download, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
type Props = {
    saved: boolean;
    saveSettings: () => void;
    exportConfig: () => void;
};
export function AdminHeading({ saved, saveSettings, exportConfig }: Props) {
    return (<div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><Badge className="mb-3 bg-violet-100 text-violet-700">QUẢN TRỊ HỆ THỐNG</Badge><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Cấu hình phòng thi & ngưỡng AI</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Điều chỉnh ngưỡng cảnh báo theo quy chế từng kỳ thi. Mọi thay đổi cần được thử nghiệm trước khi áp dụng chính thức.</p></div><div className="flex gap-2"><Button variant="outline" size="lg" onClick={exportConfig} className="h-10 bg-white"><Download /> Xuất cấu hình</Button><Button size="lg" onClick={saveSettings} className={`h-10 font-extrabold ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'}`}>{saved ? <CheckCircle2 /> : <Save />}{saved ? 'Đã lưu' : 'Lưu thay đổi'}</Button></div></div>);
}
