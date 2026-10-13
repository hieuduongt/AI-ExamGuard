import { useEffect } from 'react';
import type { EmitAlert } from './use-monitoring-session';

// While monitoring: leaving the exam window or pressing Ctrl/Cmd + C, V, X, P raises an alert.
export function useBrowserGuard(running: boolean, emitAlert: EmitAlert) {
  useEffect(() => {
    if (!running) return;
    const onVisibility = () => { if (document.hidden) emitAlert('focus_lost', 'Thí sinh chuyển khỏi cửa sổ bài thi.', 'browser'); };
    const onRestrictedInput = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'p'].includes(event.key.toLowerCase())) {
        emitAlert('restricted_input', `Phát hiện tổ hợp phím ${event.ctrlKey ? 'Ctrl' : 'Cmd'}+${event.key.toUpperCase()}.`, 'browser');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onRestrictedInput);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onRestrictedInput);
    };
  }, [emitAlert, running]);
}
