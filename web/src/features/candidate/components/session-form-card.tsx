/**
 * File này là thẻ "Thông tin phiên thi" trước giờ thi: thí sinh nhập họ tên, số báo danh,
 * phòng, máy, đồng ý giám sát rồi bấm bắt đầu. Thuộc phần giao diện thí sinh
 * (web/src/features/candidate/components/).
 */
import type { ReactNode } from 'react';
import { AlertTriangle, Play, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { hasFirebaseConfig } from '@/services/exam-sync';
import type { HubState } from '../hooks/use-hub-connection';
import type { ModelState } from '../hooks/use-monitoring-session';

// Props: từng ô thông tin kèm hàm đổi giá trị, ô đồng ý, tình trạng AI và kết nối,
// lời báo lỗi, hàm bắt đầu giám sát, và khối kết nối máy giám thị.
type Props = {
  candidateName: string;
  setCandidateName: (value: string) => void;
  candidateId: string;
  setCandidateId: (value: string) => void;
  roomId: string;
  setRoomId: (value: string) => void;
  stationId: string;
  setStationId: (value: string) => void;
  consented: boolean;
  setConsented: (value: boolean) => void;
  modelState: ModelState;
  hubState: HubState;
  errorMessage: string;
  startMonitoring: () => Promise<void>;
  // Khối được vẽ ở vị trí ô kết nối mạng LAN, chỉ khi chưa cấu hình Firebase.
  hubPanel: ReactNode;
  // Công cụ phụ (?thu-nghiem=1): chọn file video thay webcam. Không thay buổi thử trực tiếp theo góp ý giám khảo.
  experimentMode?: boolean;
  videoFile?: File | null;
  setVideoFile?: (file: File | null) => void;
};

/**
 * Đây là gì: React component thẻ "Thông tin phiên thi".
 * Mục tiêu: trước giờ thi, thu đủ thông tin thí sinh, kết nối máy giám thị và sự đồng ý giám
 *   sát rồi mới cho bắt đầu.
 * Chức năng: 4 ô nhập (họ tên; số báo danh, mã phòng, số máy tự đổi thành chữ in hoa); khối
 *   kết nối máy giám thị (chỉ khi không dùng Firebase, dịch vụ đám mây); công tắc "Tôi đã đọc
 *   thông báo giám sát"; nút bắt đầu chỉ bấm được khi đã đồng ý, nhập đủ thông tin, AI không
 *   đang tải và (nếu không dùng Firebase) đã nối được máy giám thị; dòng báo lỗi nếu có.
 * Đầu ra: khối giao diện biểu mẫu phiên thi.
 * Dùng ở đâu: candidate-screen.tsx, phần hiện khi chưa giám sát.
 * Liên kết với: hooks/use-monitoring-session.ts (các ô thông tin, startMonitoring),
 *   hasFirebaseConfig (web/src/services/firebase/firebase-client.ts), HubConnectionPanel.
 */
export function SessionFormCard({
  candidateName, setCandidateName, candidateId, setCandidateId, roomId, setRoomId, stationId, setStationId,
  consented, setConsented, modelState, hubState, errorMessage, startMonitoring, hubPanel,
  experimentMode = false, videoFile = null, setVideoFile,
}: Props) {
  const canStart = modelState !== 'loading' && consented && candidateName.trim() && candidateId.trim()
    && roomId.trim() && stationId.trim() && (hasFirebaseConfig || hubState === 'connected')
    && (!experimentMode || Boolean(videoFile));
  return (
    <Card className="border-0 bg-white py-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="border-b border-slate-100 px-6 py-5"><CardTitle className="flex items-center gap-2 font-extrabold"><UserRound className="size-5 text-blue-600" /> Thông tin phiên thi</CardTitle><CardDescription>Đối chiếu đúng phòng và số máy trước khi bắt đầu.</CardDescription></CardHeader>
      <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
        <label htmlFor="candidate-name" className="grid gap-2 text-xs font-bold text-slate-600">Họ và tên thí sinh<Input id="candidate-name" autoComplete="name" placeholder="Nhập đúng họ và tên" value={candidateName} onChange={(event) => setCandidateName(event.target.value)} className="h-11 bg-slate-50 text-sm font-medium" /></label>
        <label htmlFor="candidate-id" className="grid gap-2 text-xs font-bold text-slate-600">Số báo danh<Input id="candidate-id" placeholder="Ví dụ: SBD001" value={candidateId} onChange={(event) => setCandidateId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
        <label htmlFor="room-id" className="grid gap-2 text-xs font-bold text-slate-600">Mã phòng thi<Input id="room-id" value={roomId} onChange={(event) => setRoomId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
        <label htmlFor="station-id" className="grid gap-2 text-xs font-bold text-slate-600">Số máy / vị trí<Input id="station-id" value={stationId} onChange={(event) => setStationId(event.target.value.toUpperCase())} className="h-11 bg-slate-50 text-sm font-medium" /></label>
        {!hasFirebaseConfig && hubPanel}
        {experimentMode && setVideoFile && (
          <label htmlFor="experiment-video" className="sm:col-span-2 grid gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs font-bold text-amber-950">
            Công cụ phụ · chọn video thay webcam (không thay buổi thử trực tiếp)
            <Input id="experiment-video" type="file" accept="video/*" className="h-11 bg-white text-sm font-medium" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} />
            <small className="font-medium leading-5 text-amber-800/80">
              {videoFile ? `Đã chọn: ${videoFile.name}` : 'Chỉ dùng khi muốn phát lại một đoạn hình đã ghi. Góp ý giám khảo: thử trực tiếp theo kịch bản và quay lại quá trình chỉnh ngưỡng.'}
            </small>
          </label>
        )}
        <div className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><Switch aria-label="Xác nhận đã đọc thông báo giám sát" checked={consented} onCheckedChange={setConsented} className="mt-0.5" /><div><b className="block text-xs text-blue-950">Tôi đã đọc thông báo giám sát</b><p className="mt-1 text-xs leading-5 text-blue-700/75">Tôi đồng ý bật webcam trong thời gian thi và hiểu rằng AI chỉ tạo cảnh báo hỗ trợ giám thị.</p></div></div>
        <Button size="lg" disabled={!canStart} onClick={startMonitoring} className="h-12 rounded-xl bg-blue-600 font-extrabold hover:bg-blue-500 sm:col-span-2"><Play data-icon="inline-start" /> {modelState === 'loading' ? 'Đang chuẩn bị…' : experimentMode ? 'Chạy video thử nghiệm' : 'Kiểm tra webcam và bắt đầu'}</Button>
        {errorMessage && <p className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700"><AlertTriangle className="mr-2 inline size-4" />{errorMessage}</p>}
      </CardContent>
    </Card>
  );
}
