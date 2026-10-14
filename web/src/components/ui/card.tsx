/**
 * File này chứa "thẻ" (card): khung bo góc có nền trắng để gom một nhóm nội dung, cùng các
 * phần con của thẻ (đầu thẻ, tiêu đề, mô tả, nút góc phải, thân thẻ, chân thẻ).
 * Đây là một viên gạch giao diện dùng chung (theo mẫu shadcn/ui); các phần con được đánh dấu
 * bằng data-slot để thẻ tự căn lề cho đúng.
 */
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   khung thẻ ngoài cùng.
 * Mục tiêu: gom một nhóm nội dung liên quan vào một khung gọn, dễ nhìn.
 * Chức năng: vẽ khung bo góc có viền mờ; size "sm" thì khoảng cách bên trong nhỏ hơn;
 *   ghép thêm className bằng cn().
 * Đầu ra: giao diện khung thẻ, bên trong chứa các phần con.
 * Dùng ở đâu: nhiều thẻ ở màn hình thí sinh, giám thị, quản trị (ví dụ session-form-card.tsx,
 *   station-grid.tsx, threshold-settings-card.tsx).
 * Liên kết với: CardHeader, CardContent... bên dưới; cn() (web/src/lib/utils.ts).
 */
function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Đây là gì: React component phần đầu thẻ.
 * Mục tiêu: đặt tiêu đề và mô tả của thẻ ở trên cùng.
 * Chức năng: xếp tiêu đề, mô tả; nếu có CardAction thì chia thêm cột bên phải cho nó.
 * Đầu ra: giao diện phần đầu thẻ.
 * Dùng ở đâu: bên trong Card ở hầu hết các thẻ (ví dụ check-list-card.tsx, event-feed.tsx).
 * Liên kết với: Card, CardTitle, CardDescription, CardAction.
 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Đây là gì: React component tiêu đề của thẻ.
 * Mục tiêu: cho biết thẻ nói về chuyện gì.
 * Chức năng: hiện chữ đậm vừa; chữ nhỏ hơn khi thẻ có size "sm".
 * Đầu ra: giao diện dòng tiêu đề.
 * Dùng ở đâu: trong CardHeader ở hầu hết các thẻ (ví dụ live-signals-card.tsx, roles-card.tsx).
 * Liên kết với: CardHeader, Card.
 */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Đây là gì: React component dòng mô tả ngắn dưới tiêu đề thẻ.
 * Mục tiêu: giải thích thêm cho tiêu đề.
 * Chức năng: hiện chữ nhỏ màu xám.
 * Đầu ra: giao diện dòng mô tả.
 * Dùng ở đâu: session-form-card.tsx, check-list-card.tsx (thí sinh) và các thẻ cài đặt
 *   ở web/src/features/admin/.
 * Liên kết với: CardHeader, CardTitle.
 */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * Đây là gì: React component chỗ đặt nút nhỏ ở góc phải phần đầu thẻ.
 * Mục tiêu: để thao tác phụ (ví dụ nút "xem thêm") nằm gọn cạnh tiêu đề.
 * Chức năng: đặt nội dung vào cột phải, căn trên cùng.
 * Đầu ra: giao diện vùng nút góc phải.
 * Dùng ở đâu: hiện chưa có màn hình nào dùng; có sẵn theo bộ mẫu shadcn/ui.
 * Liên kết với: CardHeader (tự chia cột khi có khối này).
 */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Đây là gì: React component phần thân thẻ.
 * Mục tiêu: chứa nội dung chính của thẻ.
 * Chức năng: thêm khoảng cách hai bên cho đều với phần đầu thẻ.
 * Đầu ra: giao diện phần thân thẻ.
 * Dùng ở đâu: hầu hết các thẻ (ví dụ stat-cards.tsx, recent-events-card.tsx, roles-card.tsx).
 * Liên kết với: Card.
 */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-(--card-spacing)', className)}
      {...props}
    />
  );
}

/**
 * Đây là gì: React component phần chân thẻ.
 * Mục tiêu: đặt các nút hoặc ghi chú cuối thẻ, tách khỏi nội dung chính.
 * Chức năng: vẽ dải nền xám nhạt có đường kẻ phía trên.
 * Đầu ra: giao diện phần chân thẻ.
 * Dùng ở đâu: hiện chưa có màn hình nào dùng; có sẵn theo bộ mẫu shadcn/ui.
 * Liên kết với: Card (tự bỏ khoảng trống dưới cùng khi có chân thẻ).
 */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
