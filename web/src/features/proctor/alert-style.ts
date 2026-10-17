import { Eye, MonitorCheck, RefreshCw, ShieldAlert, SlidersHorizontal, UsersRound } from 'lucide-react';
import type { AlertSeverity, AlertType } from '@/domain/exam-types';
export const alertIcons: Record<AlertType, typeof Eye> = {
    no_face: ShieldAlert,
    multiple_faces: UsersRound,
    head_turn: RefreshCw,
    head_pose: RefreshCw,
    gaze_away: Eye,
    focus_lost: MonitorCheck,
    restricted_input: SlidersHorizontal,
};
export function severityClasses(severity: AlertSeverity) {
    if (severity === 'critical')
        return { dot: 'bg-rose-500', text: 'text-rose-700', surface: 'bg-rose-50', ring: 'ring-rose-200' };
    if (severity === 'warning')
        return { dot: 'bg-amber-400', text: 'text-amber-700', surface: 'bg-amber-50', ring: 'ring-amber-200' };
    return { dot: 'bg-cyan-500', text: 'text-cyan-700', surface: 'bg-cyan-50', ring: 'ring-cyan-200' };
}
