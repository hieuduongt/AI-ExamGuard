'use client';
/**
 * File này chứa "thanh tiến độ" (progress): thanh dài được tô màu một phần, ví dụ để thể hiện
 * một hành vi đã kéo dài bao lâu so với ngưỡng. Đây là viên gạch giao diện dùng chung (theo
 * mẫu shadcn/ui), dựng trên thư viện Base UI; dòng đầu tiên của file báo cho Next.js biết
 * khối này chạy trong trình duyệt.
 */

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@/lib/utils';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   thanh tiến độ hoàn chỉnh.
 * Mục tiêu: cho người xem thấy nhanh một giá trị cao hay thấp bằng độ dài thanh màu.
 * Chức năng: nhận value (giá trị, thường từ 0 đến 100), vẽ nội dung children (ví dụ nhãn)
 *   rồi tới rãnh thanh và phần tô màu bên trong.
 * Đầu ra: giao diện thanh tiến độ.
 * Dùng ở đâu: web/src/features/candidate/components/live-signals-card.tsx (màn hình thí sinh:
 *   mỗi hành vi đáng ngờ đã kéo dài được bao nhiêu phần trăm thời gian ngưỡng).
 * Liên kết với: ProgressTrack, ProgressIndicator bên dưới; cn() (web/src/lib/utils.ts).
 */
function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn('flex flex-wrap gap-3', className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

/**
 * Đây là gì: React component rãnh nền (phần chưa tô) của thanh tiến độ.
 * Mục tiêu: cho thấy toàn bộ chiều dài tối đa của thanh.
 * Chức năng: vẽ dải xám mảnh, bo tròn, chứa phần tô màu bên trong.
 * Đầu ra: giao diện rãnh thanh.
 * Dùng ở đâu: bên trong Progress ngay trong file này.
 * Liên kết với: Progress, ProgressIndicator.
 */
function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        'bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden',
        className,
      )}
      data-slot="progress-track"
      {...props}
    />
  );
}

/**
 * Đây là gì: React component phần được tô màu của thanh tiến độ.
 * Mục tiêu: thể hiện giá trị hiện tại bằng độ dài.
 * Chức năng: tô màu chính, dài theo value; khi giá trị đổi thì co giãn mượt.
 * Đầu ra: giao diện phần tô màu.
 * Dùng ở đâu: bên trong ProgressTrack, trong Progress ngay trong file này.
 * Liên kết với: Progress, ProgressTrack.
 */
function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn('bg-primary h-full transition-all', className)}
      {...props}
    />
  );
}

/**
 * Đây là gì: React component nhãn chữ của thanh tiến độ.
 * Mục tiêu: cho biết thanh này đo cái gì.
 * Chức năng: hiện chữ cỡ nhỏ, đậm vừa.
 * Đầu ra: giao diện nhãn.
 * Dùng ở đâu: hiện chưa có màn hình nào dùng; có sẵn theo bộ mẫu shadcn/ui.
 * Liên kết với: Progress (đặt làm children).
 */
function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn('text-sm font-medium', className)}
      data-slot="progress-label"
      {...props}
    />
  );
}

/**
 * Đây là gì: React component hiện con số giá trị của thanh tiến độ.
 * Mục tiêu: cho biết giá trị chính xác bên cạnh thanh màu.
 * Chức năng: hiện số màu xám, căn phải, các chữ số rộng đều nhau để không bị nhảy.
 * Đầu ra: giao diện con số.
 * Dùng ở đâu: hiện chưa có màn hình nào dùng; có sẵn theo bộ mẫu shadcn/ui.
 * Liên kết với: Progress (đặt làm children).
 */
function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        'text-muted-foreground ml-auto text-sm tabular-nums',
        className,
      )}
      data-slot="progress-value"
      {...props}
    />
  );
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
};
