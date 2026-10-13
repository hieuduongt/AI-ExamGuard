import { Info } from 'lucide-react';

export function AdvisoryNote() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-blue-500" /><p className="text-xs leading-5"><b className="text-slate-700">Lưu ý:</b> AI ExamGuard chỉ hỗ trợ giám sát và không tự kết luận vi phạm. Mọi cảnh báo cần được giám thị xem xét cùng bối cảnh thực tế.</p></div>
  );
}
