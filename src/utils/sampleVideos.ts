import { VideoSource } from '../types';

export const SAMPLE_VIDEOS: VideoSource[] = [
  {
    id: 'cyber_city_hdr',
    title: 'Cyber City HDR Motion & Specular',
    description: 'Ultra-vibrant neon spectrum with intense specular highlights, deep blacks, and moving details. 100% local, no CORS.',
    url: '/sample_cyber_city.mp4',
  },
  {
    id: 'neon_test_motion',
    title: 'Neon Geometry & 60 FPS Optical Test',
    description: 'Color calibration patches, continuous circular motion, and clock timer ideal for testing 30 to 60 FPS Optical Flow.',
    url: '/sample_neon_test.webm',
  },
  {
    id: 'smpte_sdr_bars',
    title: 'SMPTE Standard Color Bars (BT.709)',
    description: 'Reference 75% and 100% saturation bars, IRE step staircase, and sub-black chips for precise HDR10+ calibration.',
    url: '/sample_sdr_bars.mp4',
  }
];

/**
 * Procedural Dynamic Video Frame Generator
 * Used for instant offline demo or fallback if external video network is throttled
 */
export function createSyntheticVideoCanvas(width = 1280, height = 720): {
  canvas: HTMLCanvasElement;
  renderFrame: (timeSec: number) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  function renderFrame(time: number) {
    // Background gradient: Dark twilight to sunset
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0d1a');
    grad.addColorStop(0.4, '#1e1b4b');
    grad.addColorStop(0.7, '#831843');
    grad.addColorStop(0.95, '#fb923c');
    grad.addColorStop(1, '#fef08a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Neon horizon city skyline
    ctx.fillStyle = '#090a0f';
    const buildingCount = 18;
    for (let i = 0; i < buildingCount; i++) {
      const bx = (i / buildingCount) * width;
      const bw = width / buildingCount + 2;
      const bh = 150 + Math.sin(i * 3.7) * 90;
      ctx.fillRect(bx, height - bh, bw, bh);

      // Windows
      ctx.fillStyle = (i % 2 === 0) ? '#fef08a' : '#38bdf8';
      for (let w = 0; w < 4; w++) {
        if ((i + w) % 2 === 0) {
          ctx.fillRect(bx + 10 + w * 12, height - bh + 25 + (w * 18), 6, 8);
        }
      }
      ctx.fillStyle = '#090a0f';
    }

    // Moving Specular Sun / Neon Orb (HDR Highlight test)
    const sunX = (width / 2) + Math.sin(time * 0.8) * 200;
    const sunY = (height * 0.45) + Math.cos(time * 0.8) * 40;
    
    // Intense specular core
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 160);
    sunGrad.addColorStop(0, '#ffffff'); // 1000+ nits specular
    sunGrad.addColorStop(0.2, '#fde047');
    sunGrad.addColorStop(0.5, '#f97316');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 160, 0, Math.PI * 2);
    ctx.fill();

    // Road reflection
    const roadGrad = ctx.createLinearGradient(0, height - 120, 0, height);
    roadGrad.addColorStop(0, '#0f172a');
    roadGrad.addColorStop(1, '#020617');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, height - 120, width, 120);

    // Dynamic light beam sweeps
    const beamAngle = Math.sin(time * 1.5) * 0.6;
    ctx.save();
    ctx.translate(sunX, height - 120);
    ctx.rotate(beamAngle);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.fillRect(-20, -300, 40, 300);
    ctx.restore();

    // HDR Test Watermark
    ctx.font = '600 24px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`HDR10+ MASTER CALIBRATION | T: ${time.toFixed(2)}s | BT.2020 PQ`, 32, 54);
  }

  return { canvas, renderFrame };
}
