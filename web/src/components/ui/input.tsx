/**
 * File này chứa "ô nhập chữ" (input) dùng chung cho cả trang web.
 * Đây là một viên gạch giao diện dùng chung (theo mẫu shadcn/ui), dựng trên thư viện Base UI.
 */
import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from '@/lib/utils';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   ô nhập chữ hoặc số.
 * Mục tiêu: mọi ô nhập trông đồng đều, có viền sáng khi đang gõ và viền đỏ khi nhập sai.
 * Chức năng: gắn sẵn kiểu trang trí, ghép thêm className bằng cn(); các props khác (type,
 *   value, onChange...) được chuyển thẳng cho ô nhập gốc của Base UI.
 * Đầu ra: giao diện một ô nhập.
 * Dùng ở đâu: session-form-card.tsx, hub-connection-panel.tsx (thí sinh), event-feed.tsx
 *   (giám thị), room-settings-card.tsx, threshold-settings-card.tsx (quản trị).
 * Liên kết với: cn() (web/src/lib/utils.ts).
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
