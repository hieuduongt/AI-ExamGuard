import { useEffect, useState } from 'react';
import { HUB_STATUS_SIGNAL } from '@/services/browser-signals';
import { getConfiguredHubUrl, hasFirebaseConfig, testHubConnection } from '@/services/exam-sync';

export type HubState = 'unchecked' | 'checking' | 'connected' | 'disconnected';

// Address of the proctor machine (LAN hub) and whether this candidate can reach it.
// With Firebase configured there is no hub, so the state starts as connected.
export function useHubConnection() {
  const [hubAddress, setHubAddress] = useState(() => getConfiguredHubUrl());
  const [hubState, setHubState] = useState<HubState>(hasFirebaseConfig ? 'connected' : 'unchecked');
  const [hubMessage, setHubMessage] = useState(hasFirebaseConfig ? 'Đang đồng bộ qua Firebase.' : 'Nhập địa chỉ hiển thị trên máy giám thị.');

  useEffect(() => {
    if (hasFirebaseConfig) return;
    const savedAddress = getConfiguredHubUrl();
    if (!savedAddress) return;
    void testHubConnection(savedAddress).then((result) => {
      setHubAddress(result.hubUrl || savedAddress);
      setHubState(result.ok ? 'connected' : 'disconnected');
      setHubMessage(result.message);
    });
  }, []);

  useEffect(() => {
    if (hasFirebaseConfig) return;
    const onHubStatus = (event: Event) => {
      const status = (event as CustomEvent<'connected' | 'disconnected'>).detail;
      setHubState(status);
      setHubMessage(status === 'connected'
        ? 'Đang gửi trạng thái tới máy giám thị.'
        : 'Mất kết nối máy giám thị. Hãy kiểm tra mạng LAN/Wi-Fi.');
    };
    window.addEventListener(HUB_STATUS_SIGNAL, onHubStatus);
    return () => window.removeEventListener(HUB_STATUS_SIGNAL, onHubStatus);
  }, []);

  function changeHubAddress(value: string) {
    setHubAddress(value);
    setHubState('unchecked');
  }

  async function connectTeacherHub() {
    setHubState('checking');
    setHubMessage('Đang kiểm tra kết nối…');
    const result = await testHubConnection(hubAddress);
    setHubAddress(result.hubUrl || hubAddress);
    setHubState(result.ok ? 'connected' : 'disconnected');
    setHubMessage(result.message);
  }

  return { hubAddress, hubState, hubMessage, changeHubAddress, connectTeacherHub };
}
