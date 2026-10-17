'use client';

// File này vẽ toàn bộ trang quản trị (/quan-tri): nơi người quản trị đặt tên phòng thi,
// số máy, các ngưỡng cảnh báo của AI và lựa chọn về quyền riêng tư.
// Mọi cài đặt chỉ được lưu trong trình duyệt đang mở trang này.

import { useEffect, useState } from 'react';
import { ExamGuardHeader } from '@/components/layout/examguard-header';
import type { BehaviorThresholds } from '@/domain/exam-types';
import { DEFAULT_THRESHOLDS, SETTINGS_STORAGE_KEY } from '@/domain/thresholds';
import { publishHubSettings } from '@/services/hub/hub-settings';
import { clampThresholdSeconds, downloadConfig, parseAdminSettings } from './admin-settings';
import { AdminHeading } from './components/admin-heading';
import { ArchitectureCard } from './components/architecture-card';
import { DataPolicyNote } from './components/data-policy-note';
import { PrivacySettingsCard } from './components/privacy-settings-card';
import { RolesCard } from './components/roles-card';
import { RoomSettingsCard } from './components/room-settings-card';
import { ThresholdSettingsCard } from './components/threshold-settings-card';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   của cả trang quản trị (/quan-tri).
 * Mục tiêu: cho người quản trị chỉnh tên phòng, số máy, ngưỡng cảnh báo và quyền riêng tư,
 *   rồi lưu lại trong chính trình duyệt này.
 * Chức năng: nhớ các cài đặt bằng state (dữ liệu màn hình đang nhớ); khi mở trang thì đọc
 *   cài đặt cũ từ localStorage (bộ nhớ nhỏ của trình duyệt, tắt máy vẫn còn); ghép các thẻ
 *   cài đặt con; có nút "Lưu thay đổi" và "Xuất cấu hình".
 * Đầu ra: giao diện trang quản trị hoàn chỉnh.
 * Dùng ở đâu: web/src/app/quan-tri/page.tsx.
 * Liên kết với: admin-settings.ts (đọc, kiểm tra, xuất cấu hình), domain/thresholds.ts
 *   (ngưỡng mặc định, khóa lưu SETTINGS_STORAGE_KEY; trang thí sinh đọc lại ngưỡng từ đó),
 *   các thẻ trong components/.
 */
export function AdminScreen() {
  const [settings, setSettings] = useState<BehaviorThresholds>(DEFAULT_THRESHOLDS);
  const [roomName, setRoomName] = useState('Phòng thi 01');
  const [stationCount, setStationCount] = useState(15);
  const [storeSnapshots, setStoreSnapshots] = useState(false);
  const [requireConsent, setRequireConsent] = useState(true);
  const [saved, setSaved] = useState(false);

  // Khi trang vừa mở: đọc cài đặt đã lưu (nếu có) và đổ vào các ô; đọc hỏng thì giữ mặc định.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = parseAdminSettings(raw);
        if (parsed) {
          if (parsed.thresholds) setSettings(parsed.thresholds);
          if (parsed.roomName) setRoomName(parsed.roomName);
          if (parsed.stationCount) setStationCount(parsed.stationCount);
          setStoreSnapshots(parsed.storeSnapshots);
          setRequireConsent(parsed.requireConsent);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  /**
   * Đây là gì: hàm con đổi một ngưỡng cảnh báo.
   * Mục tiêu: cập nhật ngay con số người quản trị vừa gõ vào ô ngưỡng.
   * Chức năng: bỏ dấu "Đã lưu"; ép số vào khoảng 1–60 giây rồi ghi vào đúng ngưỡng (key).
   * Đầu ra: không trả về gì; state settings được cập nhật.
   * Dùng ở đâu: truyền cho ThresholdSettingsCard (components/threshold-settings-card.tsx).
   * Liên kết với: clampThresholdSeconds trong admin-settings.ts.
   */
  function updateThreshold(key: keyof BehaviorThresholds, value: string) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: clampThresholdSeconds(value) }));
  }

  /**
   * Đây là gì: hàm con lưu cài đặt.
   * Mục tiêu: giữ lại cài đặt để lần sau mở trang (và trang thí sinh trên cùng trình duyệt)
   *   dùng được.
   * Chức năng: ghi tất cả cài đặt vào localStorage dưới khóa SETTINGS_STORAGE_KEY; bật dấu
   *   "Đã lưu" rồi tự tắt sau 3 giây.
   * Đầu ra: không trả về gì.
   * Dùng ở đâu: nút "Lưu thay đổi" trong AdminHeading (components/admin-heading.tsx).
   * Liên kết với: domain/thresholds.ts (SETTINGS_STORAGE_KEY, parseSavedThresholds đọc lại
   *   ngưỡng), parseAdminSettings trong admin-settings.ts.
   */
  function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ thresholds: settings, roomName, stationCount, storeSnapshots, requireConsent }));
    // Đẩy lên hub để máy thí sinh (máy khác) cũng nhận được công tắc lưu đoạn hình.
    void publishHubSettings({ storeSnapshots, requireConsent });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  /**
   * Đây là gì: hàm con xuất cấu hình ra file.
   * Mục tiêu: cho người quản trị tải cấu hình về máy để cất giữ hoặc chia sẻ.
   * Chức năng: gom các cài đặt hiện tại và nhờ downloadConfig tải file JSON xuống.
   * Đầu ra: không trả về gì; trình duyệt tải về file ai-examguard-config.json.
   * Dùng ở đâu: nút "Xuất cấu hình" trong AdminHeading (components/admin-heading.tsx).
   * Liên kết với: downloadConfig trong admin-settings.ts.
   */
  function exportConfig() {
    downloadConfig({ roomName, stationCount, settings, storeSnapshots, requireConsent });
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <ExamGuardHeader active="admin" />
      <div className="mx-auto w-[min(1240px,calc(100%-28px))] py-7 sm:py-9">
        <AdminHeading saved={saved} saveSettings={saveSettings} exportConfig={exportConfig} />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.55fr)]">
          <div className="grid gap-5">
            <RoomSettingsCard
              roomName={roomName}
              stationCount={stationCount}
              onRoomNameChange={(value) => { setRoomName(value); setSaved(false); }}
              onStationCountChange={(value) => { setStationCount(value); setSaved(false); }}
            />

            <ThresholdSettingsCard settings={settings} updateThreshold={updateThreshold} />

            <PrivacySettingsCard
              requireConsent={requireConsent}
              storeSnapshots={storeSnapshots}
              onRequireConsentChange={(value) => { setRequireConsent(value); setSaved(false); }}
              onStoreSnapshotsChange={(value) => { setStoreSnapshots(value); setSaved(false); }}
            />
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-24">
            <ArchitectureCard />

            <RolesCard />

            <DataPolicyNote />
          </aside>
        </div>
      </div>
    </main>
  );
}
