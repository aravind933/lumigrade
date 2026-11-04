/**
 * Universal .cube 3D LUT Parser & Serializer
 * Supports DaVinci Resolve, Adobe Premiere, ARRI, and Sony 3D LUT specifications.
 */

export interface ParsedCubeLUT {
  title: string;
  size: number;
  data: Float32Array; // RGBA texture data of length size^3 * 4
  domainMin: [number, number, number];
  domainMax: [number, number, number];
}

export function parseCubeFile(cubeText: string, fileName = 'Custom_LUT'): ParsedCubeLUT {
  const lines = cubeText.split(/\r?\n/);
  let size = 0;
  let title = fileName.replace(/\.[^/.]+$/, '');
  const domainMin: [number, number, number] = [0, 0, 0];
  const domainMax: [number, number, number] = [1, 1, 1];
  const rgbValues: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#')) {
      continue;
    }

    if (rawLine.startsWith('TITLE')) {
      title = rawLine.replace(/^TITLE\s*"?|"?$/g, '').trim();
      continue;
    }

    if (rawLine.startsWith('LUT_3D_SIZE')) {
      const parts = rawLine.split(/\s+/);
      size = parseInt(parts[1], 10);
      continue;
    }

    if (rawLine.startsWith('DOMAIN_MIN')) {
      const parts = rawLine.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3) {
        domainMin[0] = parts[0];
        domainMin[1] = parts[1];
        domainMin[2] = parts[2];
      }
      continue;
    }

    if (rawLine.startsWith('DOMAIN_MAX')) {
      const parts = rawLine.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3) {
        domainMax[0] = parts[0];
        domainMax[1] = parts[1];
        domainMax[2] = parts[2];
      }
      continue;
    }

    // Number lines: r g b
    const parts = rawLine.split(/\s+/).map(Number);
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      rgbValues.push(parts[0], parts[1], parts[2]);
    }
  }

  if (size === 0) {
    // If no size header, guess cube root of RGB entries
    const count = rgbValues.length / 3;
    const guessed = Math.round(Math.cbrt(count));
    if (guessed * guessed * guessed === count) {
      size = guessed;
    } else {
      throw new Error('Invalid .cube format: missing LUT_3D_SIZE and could not determine 3D dimensions.');
    }
  }

  const expectedValues = size * size * size * 3;
  if (rgbValues.length < expectedValues) {
    throw new Error(`Incomplete .cube data. Expected ${expectedValues} numbers for ${size}x${size}x${size}, got ${rgbValues.length}.`);
  }

  // Format into RGBA Float32Array (size^3 * 4)
  const totalVoxels = size * size * size;
  const data = new Float32Array(totalVoxels * 4);

  for (let i = 0; i < totalVoxels; i++) {
    const srcIndex = i * 3;
    const destIndex = i * 4;

    const r = (rgbValues[srcIndex] - domainMin[0]) / (domainMax[0] - domainMin[0] || 1);
    const g = (rgbValues[srcIndex + 1] - domainMin[1]) / (domainMax[1] - domainMin[1] || 1);
    const b = (rgbValues[srcIndex + 2] - domainMin[2]) / (domainMax[2] - domainMin[2] || 1);

    data[destIndex] = Math.max(0, Math.min(1, r));
    data[destIndex + 1] = Math.max(0, Math.min(1, g));
    data[destIndex + 2] = Math.max(0, Math.min(1, b));
    data[destIndex + 3] = 1.0;
  }

  return {
    title,
    size,
    data,
    domainMin,
    domainMax
  };
}

/**
 * Exports a 3D LUT Float32Array to standard .cube text string
 */
export function exportCubeString(data: Float32Array, size: number, title: string): string {
  let output = `# Exported by LumiGrad HDR10+ Studio\n`;
  output += `TITLE "${title}"\n`;
  output += `LUT_3D_SIZE ${size}\n`;
  output += `DOMAIN_MIN 0.0 0.0 0.0\n`;
  output += `DOMAIN_MAX 1.0 1.0 1.0\n\n`;

  const totalVoxels = size * size * size;
  for (let i = 0; i < totalVoxels; i++) {
    const idx = i * 4;
    const r = data[idx].toFixed(6);
    const g = data[idx + 1].toFixed(6);
    const b = data[idx + 2].toFixed(6);
    output += `${r} ${g} ${b}\n`;
  }

  return output;
}
