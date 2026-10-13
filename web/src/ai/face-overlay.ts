import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { point } from './face-metrics';

export function drawOverlay(canvas: HTMLCanvasElement, result: FaceLandmarkerResult) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  result.faceLandmarks.forEach((landmarks, faceIndex) => {
    const xs = landmarks.map((item) => item.x * canvas.width);
    const ys = landmarks.map((item) => item.y * canvas.height);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    context.strokeStyle = faceIndex === 0 ? '#34d399' : '#fb7185';
    context.lineWidth = 3;
    context.setLineDash([10, 7]);
    context.strokeRect(left - 10, top - 10, width + 20, height + 20);
    context.setLineDash([]);
    [1, 33, 133, 362, 263, 468, 473].forEach((index) => {
      const landmark = point(landmarks, index);
      context.fillStyle = index >= 468 ? '#22d3ee' : '#60a5fa';
      context.beginPath();
      context.arc(landmark.x * canvas.width, landmark.y * canvas.height, index >= 468 ? 4 : 2.5, 0, Math.PI * 2);
      context.fill();
    });
  });
}
