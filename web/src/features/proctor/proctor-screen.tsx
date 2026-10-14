'use client';

// File này ghép toàn bộ trang giám thị (/giam-thi): lưới máy thí sinh, luồng cảnh báo,
// bảng chi tiết để xác minh, âm thanh báo động và nút xuất báo cáo CSV.

import { useEffect, useMemo, useState } from 'react';
import { ExamGuardHeader } from '@/components/layout/examguard-header';
import type { ExamEvent } from '@/domain/exam-types';
import { markEventReviewed, publishEvent } from '@/services/exam-sync';
import { EventDetailDrawer } from './components/event-detail-drawer';
import { EventDistribution } from './components/event-distribution';
import { EventFeed } from './components/event-feed';
import { HubAddressBanner } from './components/hub-address-banner';
import { NewAlertBanner } from './components/new-alert-banner';
import { ProctorHeading } from './components/proctor-heading';
import { StatCards } from './components/stat-cards';
import { StationGrid } from './components/station-grid';
import { VerificationPrinciple } from './components/verification-principle';
import { downloadEventsCsv } from './csv-export';
import { buildDemoAlert } from './demo-alert';
import { countStations, filterEvents, markOfflineStations, type FilterValue } from './event-filters';
import { useAlertSound } from './hooks/use-alert-sound';
import { useProctorFeed } from './hooks/use-proctor-feed';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình) của cả
 *   trang giám thị (/giam-thi).
 * Mục tiêu: giúp giám thị theo dõi mọi máy thí sinh, nhận cảnh báo, xác minh và xuất báo cáo.
 * Chức năng: lấy dữ liệu sống từ useProctorFeed và âm thanh từ useAlertSound; nhớ bộ lọc, từ khóa,
 *   cảnh báo đang chọn bằng state (dữ liệu màn hình đang nhớ); tính máy mất kết nối, danh sách
 *   đã lọc, số liệu tổng; kêu chuông khi có cảnh báo mới; ghép các khối giao diện con.
 * Đầu ra: giao diện trang giám thị hoàn chỉnh.
 * Dùng ở đâu: web/src/app/giam-thi/page.tsx.
 * Liên kết với: hooks/use-proctor-feed.ts, hooks/use-alert-sound.ts, event-filters.ts,
 *   csv-export.ts, demo-alert.ts, các khối trong components/, và markEventReviewed, publishEvent
 *   (web/src/services/exam-sync.ts).
 */
export function ProctorScreen() {
  const { events, setEvents, stations, clock, hubUrl, connectCode, hubConnected, latestAlert, setLatestAlert } = useProctorFeed();
  const { soundEnabled, soundBlocked, playAlertSound, onSoundButton } = useAlertSound();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [queryText, setQueryText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeStations = useMemo(() => markOfflineStations(stations, clock.getTime()), [clock, stations]);
  const filteredEvents = useMemo(() => filterEvents(events, filter, queryText), [events, filter, queryText]);

  const selectedEvent = events.find((event) => event.id === selectedId) ?? null;
  const counts = useMemo(() => countStations(activeStations, events), [activeStations, events]);

  // Có cảnh báo mới thì kêu chuông báo động.
  useEffect(() => {
    if (latestAlert) playAlertSound();
  }, [latestAlert, playAlertSound]);

  /**
   * Đây là gì: hàm con đánh dấu một cảnh báo là đã xác minh.
   * Mục tiêu: ghi nhận giám thị đã kiểm tra cảnh báo này.
   * Chức năng: báo cho nơi lưu dữ liệu (hub, Firebase hoặc bộ nhớ trình duyệt); sửa ngay trên màn
   *   hình thành "đã xem"; nếu đó là cảnh báo đang hiện ở dải báo mới thì ẩn dải báo.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: nút "Đánh dấu đã xác minh" trong components/event-detail-drawer.tsx.
   * Liên kết với: markEventReviewed (web/src/services/exam-sync.ts).
   */
  function reviewEvent(id: string) {
    markEventReviewed(id, true);
    setEvents((items) => items.map((item) => item.id === id ? { ...item, reviewed: true } : item));
    if (latestAlert?.id === id) setLatestAlert(null);
  }

  /**
   * Đây là gì: hàm con tạo một cảnh báo thử.
   * Mục tiêu: cho giám thị kiểm tra trang hoạt động đúng mà không cần thí sinh thật.
   * Chức năng: tạo cảnh báo mẫu, gửi nó đi như cảnh báo thật, rồi mở luôn bảng chi tiết của nó.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: nút "Tạo cảnh báo thử" trong components/proctor-heading.tsx.
   * Liên kết với: buildDemoAlert (demo-alert.ts), publishEvent (web/src/services/exam-sync.ts).
   */
  function addDemoAlert() {
    const event: ExamEvent = buildDemoAlert(events, activeStations);
    publishEvent(event);
    setSelectedId(event.id);
  }

  /**
   * Đây là gì: hàm con xuất báo cáo.
   * Mục tiêu: cho giám thị tải về danh sách mọi cảnh báo.
   * Chức năng: tải xuống file CSV gồm tất cả cảnh báo (không chỉ những cái đang lọc).
   * Đầu ra: không trả về gì; trình duyệt tải về một file .csv.
   * Dùng ở đâu: nút "Xuất báo cáo" trong components/proctor-heading.tsx.
   * Liên kết với: downloadEventsCsv (csv-export.ts).
   */
  function exportCsv() {
    downloadEventsCsv(events);
  }

  /**
   * Đây là gì: hàm con sao chép địa chỉ hub.
   * Mục tiêu: giám thị dán nhanh địa chỉ để gửi cho thí sinh.
   * Chức năng: chép hubUrl vào bộ nhớ tạm (clipboard) của máy; đây là việc cần chờ, như chờ mạng
   *   trả lời. Chép được thì hiện "Đã sao chép" trong 1,8 giây; lỗi thì không hiện.
   * Đầu ra: việc cần chờ, xong thì không trả về gì.
   * Dùng ở đâu: nút "Sao chép" trong components/hub-address-banner.tsx.
   * Liên kết với: hubUrl từ useProctorFeed (hooks/use-proctor-feed.ts).
   */
  async function copyHubUrl() {
    if (!hubUrl) return;
    try {
      await navigator.clipboard.writeText(hubUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="proctor" />
      <div className="mx-auto w-[min(1380px,calc(100%-28px))] py-6 sm:py-8">
        <ProctorHeading hubConnected={hubConnected} clock={clock} onDemoAlert={addDemoAlert} onExport={exportCsv} soundEnabled={soundEnabled} soundBlocked={soundBlocked} onSoundButton={onSoundButton} />

        {hubUrl && <HubAddressBanner hubUrl={hubUrl} connectCode={connectCode} copied={copied} onCopy={copyHubUrl} />}

        {latestAlert && <NewAlertBanner latestAlert={latestAlert} onOpen={() => { setSelectedId(latestAlert.id); setLatestAlert(null); }} />}

        <StatCards counts={counts} />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(420px,1.1fr)]">
          <StationGrid activeStations={activeStations} events={events} onSelectEvent={setSelectedId} />
          <EventFeed filteredEvents={filteredEvents} filter={filter} onFilterChange={setFilter} queryText={queryText} onQueryChange={setQueryText} selectedId={selectedId} onSelectEvent={setSelectedId} />
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <EventDistribution events={events} />
          <VerificationPrinciple />
        </section>
      </div>

      {selectedEvent && <EventDetailDrawer selectedEvent={selectedEvent} onClose={() => setSelectedId(null)} onReview={reviewEvent} />}
    </main>
  );
}
