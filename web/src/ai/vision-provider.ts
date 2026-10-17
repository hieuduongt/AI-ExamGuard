import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { VisionMetrics } from '@/domain/exam-types';
import { EMPTY_METRICS, calculateMetrics as calculateMediaPipeMetrics } from './face-metrics';
export type VisionProviderId = 'mediapipe-face-landmarker' | 'future-custom';
export interface VisionProviderInfo {
    id: VisionProviderId;
    displayName: string;
    does: string;
    doesNot: string;
}
export const ACTIVE_VISION_PROVIDER: VisionProviderInfo = {
    id: 'mediapipe-face-landmarker',
    displayName: 'MediaPipe Face Landmarker (Google)',
    does: 'Tìm khuôn mặt và 478 điểm mốc; ước lượng số mặt, góc quay đầu, cúi/ngẩng, hướng mắt.',
    doesNot: 'Không nhận diện danh tính, không phát hiện điện thoại/tài liệu, không kết luận gian lận.',
};
export function metricsFromVisionResult(result: FaceLandmarkerResult, fps: number, provider: VisionProviderId = ACTIVE_VISION_PROVIDER.id): VisionMetrics {
    if (provider === 'mediapipe-face-landmarker') {
        return calculateMediaPipeMetrics(result, fps);
    }
    throw new Error('Nhà cung cấp nhận diện future-custom chưa được gắn thuật toán.');
}
export { EMPTY_METRICS };
