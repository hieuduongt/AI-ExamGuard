/**
 * File này là thẻ "Tín hiệu thời gian thực" trên trang thí sinh trong lúc thi: các con số AI
 * đọc từ camera và tiến trình từng hành vi trước khi thành cảnh báo.
 * Thuộc phần giao diện thí sinh (web/src/features/candidate/components/).
 */
import { CircleGauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ALERT_LABELS } from '@/domain/alert-catalog';
import type { BehaviorProgress } from '@/domain/behavior-engine';
import type { BehaviorThresholds, VisionMetrics } from '@/domain/exam-types';
import { VISION_LIMITS } from '@/domain/thresholds';
import type { ModelState } from '../hooks/use-monitoring-session';

// Lấy sẵn ba giới hạn từ VISION_LIMITS: góc quay đầu, góc cúi/ngẩng (độ) và tỉ lệ lệch mắt ngang.
const { headYaw: HEAD_YAW_ALERT_DEGREES, headPitch: HEAD_PITCH_ALERT_DEGREES, gazeX: GAZE_X_ALERT_RATIO } = VISION_LIMITS;

// Props: các con số AI, tình trạng AI, tiến trình hành vi, ngưỡng đang dùng,
// và công tắc "chế độ máy cấu hình thấp".
type Props = {
  metrics: VisionMetrics;
  modelState: ModelState;
  analysisStalled: boolean;
  behaviorProgress: BehaviorProgress[];
  activeThresholds: BehaviorThresholds;
  lowPowerMode: boolean;
  setLowPowerMode: (value: boolean) => void;
};

/**
 * Đây là gì: React component thẻ "Tín hiệu thời gian thực".
 * Mục tiêu: cho thí sinh thấy chỉ số khuôn mặt/đầu/mắt hiện tại và mỗi hành vi còn cách bao
 *   xa mới thành cảnh báo, để tự điều chỉnh tư thế.
 * Chức năng: hiện 4 ô số (số khuôn mặt, góc quay đầu, góc cúi/ngẩng, độ lệch mắt) kèm nhận
 *   xét "Trong ngưỡng"/"Lệch"; hiện thanh tiến trình cho từng hành vi đang đếm (đã bao nhiêu
 *   giây / cần bao nhiêu giây); nếu AI chưa chạy hoặc tạm dừng thì báo rõ; có công tắc chế độ
 *   máy cấu hình thấp (AI phân tích thưa hơn cho đỡ nặng máy).
 * Đầu ra: khối giao diện thẻ tín hiệu.
 * Dùng ở đâu: candidate-screen.tsx, cột bên phải khi đang giám sát.
 * Liên kết với: metrics, behaviorProgress, activeThresholds, lowPowerMode từ
 *   hooks/use-monitoring-session.ts; ALERT_LABELS (web/src/domain/alert-catalog.ts);
 *   VISION_LIMITS (web/src/domain/thresholds.ts).
 */
export function LiveSignalsCard({ metrics, modelState, analysisStalled, behaviorProgress, activeThresholds, lowPowerMode, setLowPowerMode }: Props) {
  return (
    <Card className="border-0 py-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><CircleGauge className="size-4 text-blue-600" /> Tín hiệu thời gian thực</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 p-5">
        {[
          ['Khuôn mặt', String(metrics.faceCount), metrics.faceCount === 1 ? 'Tốt' : 'Kiểm tra'],
          ['Quay đầu', `${Math.abs(metrics.headYaw).toFixed(0)}°`, Math.abs(metrics.headYaw) <= HEAD_YAW_ALERT_DEGREES ? 'Trong ngưỡng' : 'Lệch'],
          ['Cúi/ngẩng', `${Math.abs(metrics.headPitch).toFixed(0)}°`, Math.abs(metrics.headPitch) <= HEAD_PITCH_ALERT_DEGREES ? 'Trong ngưỡng' : 'Lệch'],
          ['Hướng mắt', `${Math.abs(metrics.gazeX * 100).toFixed(0)}%`, Math.abs(metrics.gazeX) <= GAZE_X_ALERT_RATIO ? 'Trung tâm' : 'Lệch'],
        ].map(([label, value, hint]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><small className="text-[10px] font-semibold text-slate-400">{label}</small><b className="mt-1 block text-lg font-black tracking-tight">{value}</b><span className="mt-1 block text-[9px] font-bold text-slate-500">{hint}</span></div>)}
        <div className="col-span-2 border-t border-slate-100 pt-4" aria-live="polite">
          <b className="block text-sm text-slate-800">Tiến trình tạo cảnh báo</b>
          {modelState !== 'ready' || analysisStalled ? <p className="mt-2 text-sm text-amber-700">Chưa có AI phân tích. Camera mở chưa có nghĩa là đã nhận diện.</p> : behaviorProgress.length ? behaviorProgress.map((item) => <div key={item.type} className="mt-3"><div className="mb-1 flex justify-between gap-2 text-sm"><span>{ALERT_LABELS[item.type]}</span><b>{Math.min(item.elapsedSeconds, item.requiredSeconds).toFixed(1)} / {item.requiredSeconds}s</b></div><Progress value={Math.min(100, item.elapsedSeconds / item.requiredSeconds * 100)} /></div>) : <p className="mt-2 text-sm text-slate-500">Chưa có tín hiệu vượt ngưỡng. Quay đầu: trên {HEAD_YAW_ALERT_DEGREES}° ước tính trong {activeThresholds.headTurnSeconds}s.</p>}
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600"><span><CircleGauge className="mr-2 inline size-4 text-slate-400" /> Chế độ máy cấu hình thấp</span><Switch aria-label="Chế độ máy cấu hình thấp" size="sm" checked={lowPowerMode} onCheckedChange={setLowPowerMode} /></div>
      </CardContent>
    </Card>
  );
}
