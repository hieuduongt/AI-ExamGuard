'use client';
/**
 * File này chứa "công tắc bật/tắt" (switch) dùng chung cho cả trang web.
 * Đây là một viên gạch giao diện dùng chung (theo mẫu shadcn/ui), dựng trên thư viện Base UI;
 * dòng đầu tiên của file báo cho Next.js biết khối này chạy trong trình duyệt (cần bấm được).
 */

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   công tắc gạt bật/tắt.
 * Mục tiêu: cho người dùng bật hoặc tắt một tùy chọn bằng một cú bấm.
 * Chức năng: vẽ rãnh công tắc và nút tròn trượt sang phải khi bật; có hai cỡ size
 *   ("default", "sm"); các props khác (checked, onCheckedChange...) chuyển cho Base UI.
 * Đầu ra: giao diện một công tắc.
 * Dùng ở đâu: session-form-card.tsx, live-signals-card.tsx (thí sinh),
 *   privacy-settings-card.tsx (quản trị).
 * Liên kết với: cn() (web/src/lib/utils.ts).
 */
function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
