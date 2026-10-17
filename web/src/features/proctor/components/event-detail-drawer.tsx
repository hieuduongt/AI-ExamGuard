import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImageIcon, UserRoundCheck, Video, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AlertVerdict, ExamEvent } from '@/domain/exam-types';
import { alertIcons, severityClasses } from '../alert-style';
import { verdictLabel } from '../csv-export';
type Props = {
    selectedEvent: ExamEvent;
    onClose: () => void;
    onVerdict: (id: string, verdict: AlertVerdict) => void;
};
export function EventDetailDrawer({ selectedEvent, onClose, onVerdict }: Props) {
    const Icon = alertIcons[selectedEvent.type];
    const tone = severityClasses(selectedEvent.severity);
    const clip = selectedEvent.clip?.trim() || '';
    const snapshots = selectedEvent.snapshots?.filter(Boolean) ?? [];
    const hasClip = Boolean(clip);
    const hasSnapshots = !hasClip && snapshots.length > 0;
    const done = selectedEvent.reviewed;
    const mediaRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showMedia, setShowMedia] = useState(hasClip || hasSnapshots);
    useEffect(() => {
        setShowMedia(hasClip || hasSnapshots);
    }, [selectedEvent.id, hasClip, hasSnapshots]);
    function openMedia() {
        setShowMedia(true);
        window.setTimeout(() => {
            mediaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (hasClip) {
                void videoRef.current?.play().catch(() => undefined);
            }
        }, 50);
    }
    return (<div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
      <aside className="h-full w-[min(460px,100%)] overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <small className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chi tiết cảnh báo</small>
            <h2 className="mt-1 text-lg font-black">{selectedEvent.roomId} · {selectedEvent.stationId}</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{selectedEvent.candidateName} · {selectedEvent.candidateId}</p>
          </div>
          <Button aria-label="Đóng chi tiết" variant="ghost" size="icon" onClick={() => onClose()}>×</Button>
        </div>
        <div className="p-6">
          <span className={`grid size-14 place-items-center rounded-2xl ${tone.surface} ${tone.text}`}><Icon className="size-7"/></span>
          <Badge className={`mt-5 border-0 ${tone.surface} ${tone.text}`}>{selectedEvent.severity === 'critical' ? 'ƯU TIÊN KIỂM TRA' : selectedEvent.severity === 'warning' ? 'CẢNH BÁO' : 'THÔNG TIN'}</Badge>
          <h3 className="mt-3 text-xl font-black tracking-tight">{selectedEvent.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">{selectedEvent.detail}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs">
            <div><small className="text-slate-400">Thời gian</small><b className="mt-1 block">{new Date(selectedEvent.timestamp).toLocaleString('vi-VN')}</b></div>
            <div><small className="text-slate-400">Nguồn</small><b className="mt-1 block">{selectedEvent.source === 'ai' ? 'AI tại máy thi' : selectedEvent.source === 'browser' ? 'Trình duyệt' : 'Dữ liệu minh họa'}</b></div>
            <div><small className="text-slate-400">Phòng thi</small><b className="mt-1 block">{selectedEvent.roomId}</b></div>
            <div><small className="text-slate-400">Số máy</small><b className="mt-1 block">{selectedEvent.stationId}</b></div>
            <div><small className="text-slate-400">Số báo danh</small><b className="mt-1 block">{selectedEvent.candidateId}</b></div>
            <div><small className="text-slate-400">Kết luận</small><b className={`mt-1 block ${selectedEvent.verdict === 'confirmed' ? 'text-emerald-600' : selectedEvent.verdict === 'false_alarm' ? 'text-rose-600' : 'text-amber-600'}`}>{verdictLabel(selectedEvent.verdict)}</b></div>
          </div>

          <div ref={mediaRef} className="mt-6 rounded-2xl border border-slate-200 p-4">
            <b className="flex items-center gap-2 text-xs text-slate-700">
              {hasClip || hasSnapshots ? <Video className="size-4 text-blue-600"/> : <ImageIcon className="size-4 text-slate-400"/>}
              Đoạn hình / ảnh quanh lúc xảy ra
            </b>

            {(hasClip || hasSnapshots) && (<Button type="button" onClick={openMedia} size="lg" className="mt-3 h-11 w-full bg-blue-600 font-extrabold hover:bg-blue-500">
                {hasClip ? <><Video /> Xem lại đoạn hình ngắn</> : <><ImageIcon /> Xem lưới ảnh ({snapshots.length} khung)</>}
              </Button>)}

            {showMedia && hasClip && (<video ref={videoRef} key={selectedEvent.id} src={clip} controls playsInline preload="metadata" className="mt-3 aspect-video w-full rounded-xl bg-slate-900 object-contain ring-1 ring-slate-200"/>)}

            {showMedia && hasSnapshots && (<div className="mt-3 grid grid-cols-3 gap-2">
                {snapshots.map((src, index) => (<img key={index} src={src} alt={`Khung ${index + 1}`} className="aspect-video w-full rounded-lg object-cover ring-1 ring-slate-200"/>))}
              </div>)}

            {!hasClip && !hasSnapshots && (<p className="mt-3 text-[11px] leading-5 text-slate-500">
                Cảnh báo này <b>không kèm</b> đoạn hình/ảnh. Để có bằng chứng xem lại: mở <b>/quan-tri</b> → bật
                “Lưu đoạn hình ngắn khi cảnh báo” → Lưu (đẩy lên hub) → trên máy thí sinh <b>bắt đầu lại phiên</b>
                rồi tạo cảnh báo AI mới.
              </p>)}

            {(hasClip || hasSnapshots) && (<p className="mt-2 text-[10px] leading-4 text-slate-400">
                Khoảng vài giây trước và trong lúc cảnh báo. Chỉ nằm trong bộ nhớ máy giám thị; đóng phần mềm là mất.
              </p>)}
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <b className="flex items-center gap-2 text-xs text-blue-900"><UserRoundCheck className="size-4"/> Gợi ý cho giám thị</b>
            <p className="mt-2 text-xs leading-5 text-blue-700/75">Quan sát trực tiếp {selectedEvent.roomId}, vị trí {selectedEvent.stationId}, thí sinh {selectedEvent.candidateName} ({selectedEvent.candidateId}). Không kết luận chỉ dựa trên cảnh báo AI.</p>
          </div>
          <div className="mt-6 grid gap-2">
            <Button disabled={done} onClick={() => onVerdict(selectedEvent.id, 'confirmed')} size="lg" className="h-11 bg-emerald-600 font-extrabold hover:bg-emerald-500">
              <CheckCircle2 /> {selectedEvent.verdict === 'confirmed' ? 'Đã xác nhận đúng' : 'Xác nhận đúng'}
            </Button>
            <Button disabled={done} onClick={() => onVerdict(selectedEvent.id, 'false_alarm')} size="lg" variant="outline" className="h-11 border-rose-200 font-extrabold text-rose-700 hover:bg-rose-50">
              <XCircle /> {selectedEvent.verdict === 'false_alarm' ? 'Đã ghi báo nhầm' : 'Báo nhầm'}
            </Button>
            <Button variant="outline" onClick={() => onClose()} size="lg" className="h-11">Đóng chi tiết</Button>
          </div>
        </div>
      </aside>
    </div>);
}
