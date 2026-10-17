import type { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { VisionMetrics } from '@/domain/exam-types';
export const EMPTY_METRICS: VisionMetrics = { faceCount: 0, gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, fps: 0 };
function average(values: number[]) {
    return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
export function point(landmarks: NormalizedLandmark[], index: number) {
    return landmarks[index] ?? { x: 0.5, y: 0.5, z: 0, visibility: 0 };
}
function ratio(value: number, min: number, max: number) {
    return (value - min) / Math.max(max - min, 0.001);
}
export function calculateMetrics(result: FaceLandmarkerResult, fps: number): VisionMetrics {
    const faceCount = result.faceLandmarks.length;
    if (!faceCount)
        return { ...EMPTY_METRICS, fps };
    const landmarks = result.faceLandmarks[0];
    const nose = point(landmarks, 1);
    const leftCheek = point(landmarks, 234);
    const rightCheek = point(landmarks, 454);
    const forehead = point(landmarks, 10);
    const chin = point(landmarks, 152);
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
    const headYaw = ((nose.x - average([leftCheek.x, rightCheek.x])) / Math.max(faceWidth, 0.01)) * 110;
    const headPitch = (ratio(nose.y, forehead.y, chin.y) - 0.54) * 95;
    const leftIris = point(landmarks, 468);
    const rightIris = point(landmarks, 473);
    const leftX = ratio(leftIris.x, point(landmarks, 33).x, point(landmarks, 133).x);
    const rightX = ratio(rightIris.x, point(landmarks, 362).x, point(landmarks, 263).x);
    const leftY = ratio(leftIris.y, point(landmarks, 159).y, point(landmarks, 145).y);
    const rightY = ratio(rightIris.y, point(landmarks, 386).y, point(landmarks, 374).y);
    return {
        faceCount,
        gazeX: (average([leftX, rightX]) - 0.5) * 2,
        gazeY: (average([leftY, rightY]) - 0.5) * 2,
        headYaw,
        headPitch,
        fps,
    };
}
