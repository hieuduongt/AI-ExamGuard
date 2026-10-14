/**
 * File này là dòng lưu ý cuối trang thí sinh: AI chỉ hỗ trợ, không tự kết luận vi phạm.
 * Thuộc phần giao diện thí sinh (web/src/features/candidate/components/).
 */
import { Info } from 'lucide-react';

/**
 * Đây là gì: React component (một khối giao diện) hiện lời lưu ý về vai trò của AI.
 * Mục tiêu: nhắc rằng cảnh báo chỉ để giám thị tham khảo, giám thị mới là người quyết định.
 * Chức năng: vẽ một ô có biểu tượng chữ "i" và câu lưu ý cố định.
 * Đầu ra: khối giao diện lời lưu ý.
 * Dùng ở đâu: cuối trang trong candidate-screen.tsx.
 * Liên kết với: không phụ thuộc dữ liệu nào khác.
 */
export function AdvisoryNote() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-blue-500" /><p className="text-xs leading-5"><b className="text-slate-700">Lưu ý:</b> AI ExamGuard chỉ hỗ trợ giám sát và không tự kết luận vi phạm. Mọi cảnh báo cần được giám thị xem xét cùng bối cảnh thực tế.</p></div>
  );
}
