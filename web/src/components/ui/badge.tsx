/**
 * File này chứa "nhãn" (badge): ô chữ nhỏ bo tròn, ví dụ "Đang giám sát", "Cảnh báo".
 * Đây là một viên gạch giao diện dùng chung (theo mẫu shadcn/ui), dựng trên thư viện Base UI.
 */
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Bộ "kiểu dáng" của nhãn: kiểu chung cho mọi nhãn, cộng thêm màu theo biến thể variant
 * (default, secondary, destructive = màu báo lỗi, outline = chỉ viền, ghost = trong suốt, link).
 */
const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost:
          'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình) nhãn nhỏ.
 * Mục tiêu: hiện một trạng thái hay con số ngắn gọn, nổi bật.
 * Chức năng: chọn màu theo variant, ghép thêm lớp trang trí riêng (className) bằng cn();
 *   mặc định là thẻ <span>, có thể đổi thành thẻ khác qua props render.
 * Đầu ra: giao diện một nhãn.
 * Dùng ở đâu: các màn hình thí sinh, giám thị, quản trị (ví dụ candidate-heading.tsx,
 *   proctor-heading.tsx, event-detail-drawer.tsx, admin-heading.tsx).
 * Liên kết với: badgeVariants ở trên, cn() (web/src/lib/utils.ts), useRender của Base UI.
 */
function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
