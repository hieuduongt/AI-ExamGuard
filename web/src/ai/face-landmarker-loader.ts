import type { FaceLandmarker } from '@mediapipe/tasks-vision';

// Bundled copies (public/mediapipe) are tried first so the app works offline.
const WASM_LOCAL = '/mediapipe/wasm';
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URLS = [
  '/mediapipe/face_landmarker.task',
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
];

// Returns null when `isCancelled` reports the session ended while loading.
export async function loadFaceLandmarker(isCancelled: () => boolean): Promise<FaceLandmarker | null> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
  } catch {
    fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
  }

  let detector: FaceLandmarker | null = null;
  let modelError: unknown;
  for (const modelAssetPath of MODEL_URLS) {
    for (const delegate of ['GPU', 'CPU'] as const) {
      if (isCancelled()) return null;
      try {
        detector = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate }, runningMode: 'VIDEO', numFaces: 2,
          minFaceDetectionConfidence: 0.55, minFacePresenceConfidence: 0.55, minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        });
        break;
      } catch (error) { modelError = error; }
    }
    if (detector) break;
  }
  if (!detector) throw modelError ?? new Error('Không tải được mô hình nhận diện');
  return detector;
}
