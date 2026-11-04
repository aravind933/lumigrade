import { ColorGamut, HDR10PlusMetadata, VideoExportOptions } from '../types';
import { generateHDR10PlusJSON } from './colorScience';
import { WebGLHDRRenderer } from './webglRenderer';

export interface ExportProgress {
  progressPercent: number;
  currentSecond: number;
  totalDuration: number;
  isCompleted: boolean;
  isError: boolean;
  errorMessage?: string;
  blobUrl?: string;
  fileSizeMb?: number;
  currentFps?: number;
  upscaledResolution?: string;
}

export const EXPORT_PRESETS = [
  {
    presetName: '4K_UHD',
    label: '4K Ultra HD (2160p)',
    width: 3840,
    height: 2160,
    aspectRatio: '16:9',
    description: 'Broadcast Master / YouTube HDR 4K',
    recommendedBitrate: 35
  },
  {
    presetName: 'QHD_2K',
    label: '2K Quad HD (1440p)',
    width: 2560,
    height: 1440,
    aspectRatio: '16:9',
    description: 'Crisp High-Fidelity Desktop & Tablet',
    recommendedBitrate: 22
  },
  {
    presetName: 'FHD_1080P',
    label: 'Full HD (1080p)',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    description: 'Standard High Definition Streaming',
    recommendedBitrate: 14
  },
  {
    presetName: 'HD_720P',
    label: 'HD Ready (720p)',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    description: 'Fast Android & Mobile Social sharing',
    recommendedBitrate: 8
  },
  {
    presetName: 'SD_480P',
    label: 'SD Compact (480p)',
    width: 854,
    height: 480,
    aspectRatio: '16:9',
    description: 'Lightweight preview & messaging',
    recommendedBitrate: 4
  },
  {
    presetName: 'CINEMA_21_9',
    label: 'Cinema Scope (21:9 Ultrawide)',
    width: 2560,
    height: 1080,
    aspectRatio: '21:9',
    description: 'Anamorphic Widescreen Feature Look',
    recommendedBitrate: 18
  },
  {
    presetName: 'VERTICAL_9_16',
    label: 'Vertical Story / Reels (9:16)',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: 'Instagram Reels, TikTok, YouTube Shorts',
    recommendedBitrate: 14
  },
  {
    presetName: 'SQUARE_1_1',
    label: 'Square Post (1:1)',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    description: 'Square Social Feed Showcase',
    recommendedBitrate: 10
  }
];

function getSafeMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];

  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'video/webm';
}

function waitForVideoSeek(video: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise((resolve) => {
    // If already at target time within tolerance
    if (Math.abs(video.currentTime - targetTime) < 0.05) {
      resolve();
      return;
    }

    let timeoutId: any;
    const onSeeked = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = targetTime;

    // Safety timeout in case seeked doesn't fire or completes instantly
    timeoutId = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }, 120);
  });
}

export class VideoExporter {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async exportVideo(
    sourceVideo: HTMLVideoElement,
    options: VideoExportOptions,
    renderSettings: {
      metadata: HDR10PlusMetadata;
      gamut: ColorGamut;
      useLut: boolean;
      lutData?: Float32Array;
      lutSize: number;
      lutIntensity: number;
      exposure: number;
    },
    onProgress: (prog: ExportProgress) => void
  ): Promise<{ videoBlobUrl: string; jsonMetadataUrl?: string; fileSizeMb: number }> {
    this.isCancelled = false;

    // 1. Calculate Guaranteed Even Dimensions (crucial for hardware video encoders)
    const upscaleScale = options.enableUpscaling ? (options.upscaleFactor || 1.0) : 1.0;
    const exportWidth = Math.max(128, Math.floor((options.width * upscaleScale) / 2) * 2);
    const exportHeight = Math.max(128, Math.floor((options.height * upscaleScale) / 2) * 2);

    // 2. Create off-screen export canvas and attach off-screen to DOM
    // (Attaching to document.body ensures Chromium compositor paints frames without throttling captureStream!)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    exportCanvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:120px;height:120px;opacity:0;pointer-events:none;z-index:-9999;';
    document.body.appendChild(exportCanvas);

    const renderer = new WebGLHDRRenderer(exportCanvas);
    if (renderSettings.lutData) {
      renderer.uploadLutData(renderSettings.lutData, renderSettings.lutSize);
    }

    // 3. Prepare dedicated, isolated video element for export
    // (Prevents interference from UI player state, pause/play toggles, or ended status)
    const exportVideo = document.createElement('video');
    exportVideo.src = sourceVideo.src || sourceVideo.currentSrc;
    exportVideo.crossOrigin = 'anonymous';
    exportVideo.muted = true;
    exportVideo.playsInline = true;
    exportVideo.preload = 'auto';

    // Wait for video metadata to be fully loaded
    await new Promise<void>((resolve, reject) => {
      if (exportVideo.readyState >= 2 && exportVideo.duration > 0) {
        resolve();
        return;
      }
      exportVideo.onloadeddata = () => resolve();
      exportVideo.onerror = (e) => reject(new Error('Failed to load video source for export. Check CORS or video format.'));
      // Timeout safeguard
      setTimeout(() => {
        if (exportVideo.readyState >= 1) resolve();
        else if (sourceVideo.readyState >= 2) resolve();
        else reject(new Error('Timed out waiting for video data to initialize'));
      }, 3500);
    });

    const duration = (exportVideo.duration && isFinite(exportVideo.duration) && exportVideo.duration > 0)
      ? exportVideo.duration
      : (sourceVideo.duration && isFinite(sourceVideo.duration) ? sourceVideo.duration : 5);

    const targetFps = options.enableOpticalFlow60Fps ? 60 : (options.fps || 30);
    const mimeType = getSafeMimeType();

    // 4. Initial frame render BEFORE starting recorder
    // (Ensures the canvas stream has valid pixel data ready before the first packet is encoded)
    await waitForVideoSeek(exportVideo, 0);
    renderer.renderFrame(exportVideo, {
      metadata: {
        ...renderSettings.metadata,
        sharpnessEnabled: options.enableSharpness,
        sharpnessAmount: options.sharpnessAmount,
        upscaleFactor: upscaleScale,
        opticalFlowEnabled: options.enableOpticalFlow60Fps
      },
      gamut: renderSettings.gamut,
      monitoringMode: 'normal',
      splitPosition: 0.5,
      useLut: renderSettings.useLut,
      lutIntensity: renderSettings.lutIntensity,
      exposure: renderSettings.exposure,
      flowInterpolationTime: 0.0
    });

    // 5. Initialize MediaRecorder on Canvas Stream
    const stream = exportCanvas.captureStream(targetFps);
    const videoTrack = stream.getVideoTracks()[0];

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options.bitrateMbps * 1000 * 1000,
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        try {
          if (document.body.contains(exportCanvas)) {
            document.body.removeChild(exportCanvas);
          }
          renderer.destroy();
          exportVideo.src = '';
        } catch (e) {
          console.warn('Cleanup warning:', e);
        }
      };

      mediaRecorder.onstop = () => {
        cleanup();

        if (recordedChunks.length === 0) {
          reject(new Error('MediaRecorder produced 0 bytes. Hardware encoder could not encode this resolution or video was blocked.'));
          return;
        }

        const videoBlob = new Blob(recordedChunks, { type: mimeType });
        if (videoBlob.size < 5000) { // Less than 5KB is likely a header without frames
          reject(new Error(`Export produced corrupt file (${(videoBlob.size / 1024).toFixed(1)} KB). Please try standard 1080p or check the video source.`));
          return;
        }

        const videoBlobUrl = URL.createObjectURL(videoBlob);
        const fileSizeMb = Number((videoBlob.size / (1024 * 1024)).toFixed(2));

        let jsonMetadataUrl: string | undefined;
        if (options.exportSidecarJSON) {
          const hdrJson = generateHDR10PlusJSON(renderSettings.metadata, options.presetName);
          const jsonBlob = new Blob([JSON.stringify(hdrJson, null, 2)], { type: 'application/json' });
          jsonMetadataUrl = URL.createObjectURL(jsonBlob);
        }

        onProgress({
          progressPercent: 100,
          currentSecond: duration,
          totalDuration: duration,
          isCompleted: true,
          isError: false,
          blobUrl: videoBlobUrl,
          fileSizeMb,
          currentFps: targetFps,
          upscaledResolution: `${exportWidth}×${exportHeight}`
        });

        resolve({ videoBlobUrl, jsonMetadataUrl, fileSizeMb });
      };

      mediaRecorder.onerror = (err) => {
        cleanup();
        reject(err);
      };

      // Start recording
      mediaRecorder.start(250);

      // 6. Deterministic Frame-by-Frame Stepped Render Loop
      // (Guarantees every frame is rendered in sequence without relying on unstable background timers!)
      const totalFrames = Math.max(15, Math.round(duration * targetFps));
      const frameDelta = duration / totalFrames;
      const stepIntervalMs = Math.max(12, Math.floor(1000 / targetFps));

      let currentFrameIndex = 0;

      const stepFrame = async () => {
        if (this.isCancelled) {
          if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
          cleanup();
          reject(new Error('Export cancelled by user'));
          return;
        }

        if (currentFrameIndex >= totalFrames) {
          // Finished all frames! Flush data and finalize recording
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              try {
                mediaRecorder.requestData();
              } catch (e) {
                // requestData might throw if inactive
              }
              setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') {
                  mediaRecorder.stop();
                }
              }, 150);
            }
          }, 100);
          return;
        }

        const time = Math.min(duration - 0.01, currentFrameIndex * frameDelta);

        // Seek video to exact frame timestamp
        await waitForVideoSeek(exportVideo, time);

        // If optical flow 60fps is enabled, alternate interpolation
        const flowTime = options.enableOpticalFlow60Fps && (currentFrameIndex % 2 === 1) ? 0.5 : 0.0;

        // Render to WebGL HDR Canvas
        renderer.renderFrame(exportVideo, {
          metadata: {
            ...renderSettings.metadata,
            sharpnessEnabled: options.enableSharpness,
            sharpnessAmount: options.sharpnessAmount,
            upscaleFactor: upscaleScale,
            opticalFlowEnabled: options.enableOpticalFlow60Fps
          },
          gamut: renderSettings.gamut,
          monitoringMode: 'normal',
          splitPosition: 0.5,
          useLut: renderSettings.useLut,
          lutIntensity: renderSettings.lutIntensity,
          exposure: renderSettings.exposure,
          flowInterpolationTime: flowTime
        });

        // Request stream frame capture if supported by browser track
        try {
          (videoTrack as any)?.requestFrame?.();
        } catch (e) {
          // fallback
        }

        currentFrameIndex++;
        const percent = Math.min(99, Math.round((currentFrameIndex / totalFrames) * 100));

        onProgress({
          progressPercent: percent,
          currentSecond: Number(time.toFixed(1)),
          totalDuration: duration,
          isCompleted: false,
          isError: false,
          currentFps: targetFps,
          upscaledResolution: `${exportWidth}×${exportHeight}`
        });

        setTimeout(stepFrame, stepIntervalMs);
      };

      // Kick off the stepped export loop
      stepFrame();
    });
  }
}
