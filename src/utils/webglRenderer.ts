import { ColorGamut, HDR10PlusMetadata, MonitoringMode } from '../types';
import { getGamutMatrix } from './colorScience';

const VS_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FS_SOURCE = `#version 300 es
precision highp float;
precision highp sampler3D;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_videoTexture;
uniform sampler2D u_prevVideoTexture;
uniform sampler3D u_lutTexture;
uniform bool u_useLut;
uniform float u_lutIntensity;
uniform int u_lutSize;

uniform mat3 u_gamutMatrix;
uniform float u_splitPosition;
uniform int u_monitoringMode;  // 0: Normal, 1: Split A/B, 2: False Color, 3: SDR Only, 4: HDR Tone Only
uniform vec2 u_texelSize;

// Brightness & Nits Controls
uniform float u_targetNits;       // e.g. 1000.0, 2000.0, 4000.0, 10000.0
uniform float u_diffuseWhiteNits; // e.g. 250.0 (default paper white level)
uniform float u_brightnessBoost;  // e.g. 1.0 to 4.0 (master nits multiplier)
uniform float u_midtoneLift;      // e.g. 1.0 to 1.8 (gamma lift to brighten midtones)
uniform float u_blackPedestal;    // e.g. -0.05 to 0.15 (shadow lift)
uniform float u_exposure;         // e.g. 1.0

// Tone Mapping Parameters
uniform float u_kneePointX;
uniform float u_kneePointY;
uniform float u_bezierWeight;
uniform float u_specularBoost;
uniform float u_shadowRollOff;
uniform float u_saturation;

// HDR Effect & Bloom Parameters
uniform bool u_hdrEffectEnabled;
uniform float u_hdrPopIntensity;
uniform float u_specularBloomIntensity;
uniform float u_bloomThreshold;
uniform float u_colorVibrance;

// Sharpness & Upscaling Parameters
uniform bool u_sharpnessEnabled;
uniform float u_sharpnessAmount;
uniform float u_upscaleFactor;

// Optical Flow 60 FPS Parameters
uniform bool u_opticalFlowEnabled;
uniform float u_flowTime; // 0.0 (prev frame) to 1.0 (current frame), 0.5 = interpolated
uniform float u_flowSensitivity;
uniform bool u_showMotionVectors;

// Convert SDR gamma to Linear light (BT.1886 / Rec.709 inverse)
vec3 sdrToLinear(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(2.4));
}

// Linear to SDR gamma
vec3 linearToSDR(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(1.0 / 2.4));
}

// Contrast Adaptive Sharpening (CAS Filter)
vec3 applyAdaptiveSharpening(sampler2D tex, vec2 uv, vec2 texel, float amount) {
  vec3 c = texture(tex, uv).rgb;
  if (amount <= 0.01) return c;

  vec3 n = texture(tex, uv + vec2(0.0, -texel.y)).rgb;
  vec3 s = texture(tex, uv + vec2(0.0,  texel.y)).rgb;
  vec3 e = texture(tex, uv + vec2( texel.x, 0.0)).rgb;
  vec3 w = texture(tex, uv + vec2(-texel.x, 0.0)).rgb;

  vec3 minNeighbor = min(c, min(min(n, s), min(e, w)));
  vec3 maxNeighbor = max(c, max(max(n, s), max(e, w)));

  // CAS High-Pass weight
  float weight = -0.125 * amount;
  vec3 sharpened = (c + weight * (n + s + e + w)) / (1.0 + 4.0 * weight);

  // Soft clamp to prevent ringing/haloing
  return clamp(sharpened, minNeighbor * 0.95, maxNeighbor * 1.05);
}

// Optical Flow Motion Estimation between prev frame and curr frame
vec2 estimateOpticalFlow(vec2 uv, vec2 texel) {
  // Sample local neighborhood in current and previous frame
  float cCurr = dot(texture(u_videoTexture, uv).rgb, vec3(0.299, 0.587, 0.114));
  float cPrev = dot(texture(u_prevVideoTexture, uv).rgb, vec3(0.299, 0.587, 0.114));

  // Spatial gradients on current frame
  float xCurrPlus  = dot(texture(u_videoTexture, uv + vec2(texel.x * 2.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float xCurrMinus = dot(texture(u_videoTexture, uv - vec2(texel.x * 2.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float yCurrPlus  = dot(texture(u_videoTexture, uv + vec2(0.0, texel.y * 2.0)).rgb, vec3(0.299, 0.587, 0.114));
  float yCurrMinus = dot(texture(u_videoTexture, uv - vec2(0.0, texel.y * 2.0)).rgb, vec3(0.299, 0.587, 0.114));

  float gradX = (xCurrPlus - xCurrMinus) * 0.5;
  float gradY = (yCurrPlus - yCurrMinus) * 0.5;
  float gradT = cCurr - cPrev;

  float denom = gradX * gradX + gradY * gradY + 0.001;
  vec2 flow = -vec2(gradX * gradT / denom, gradY * gradT / denom) * u_flowSensitivity;

  // Clamp motion vectors to reasonable maximum screen delta
  return clamp(flow * texel * 18.0, -texel * 24.0, texel * 24.0);
}

// Sample video with Optical Flow interpolation at u_flowTime (e.g. 0.5)
vec3 sampleWithOpticalFlow(vec2 uv, vec2 texel) {
  if (!u_opticalFlowEnabled || abs(u_flowTime) < 0.001) {
    if (u_sharpnessEnabled && u_sharpnessAmount > 0.01) {
      return applyAdaptiveSharpening(u_videoTexture, uv, texel, u_sharpnessAmount);
    }
    return texture(u_videoTexture, uv).rgb;
  }

  vec2 flow = estimateOpticalFlow(uv, texel);

  // If user requested visual motion vector mode
  if (u_showMotionVectors) {
    return vec3(abs(flow.x) / (texel.x * 15.0), abs(flow.y) / (texel.y * 15.0), 0.5);
  }

  // Bidirectional motion-compensated blending
  vec2 uvPrev = uv + flow * (1.0 - u_flowTime);
  vec2 uvCurr = uv - flow * u_flowTime;

  vec3 samplePrev = texture(u_prevVideoTexture, uvPrev).rgb;
  vec3 sampleCurr = texture(u_videoTexture, uvCurr).rgb;

  vec3 blended = mix(samplePrev, sampleCurr, u_flowTime);

  if (u_sharpnessEnabled && u_sharpnessAmount > 0.01) {
    // Apply sharpening on blended result
    vec3 n = mix(texture(u_prevVideoTexture, uvPrev + vec2(0.0, -texel.y)).rgb, texture(u_videoTexture, uvCurr + vec2(0.0, -texel.y)).rgb, u_flowTime);
    vec3 s = mix(texture(u_prevVideoTexture, uvPrev + vec2(0.0,  texel.y)).rgb, texture(u_videoTexture, uvCurr + vec2(0.0,  texel.y)).rgb, u_flowTime);
    vec3 e = mix(texture(u_prevVideoTexture, uvPrev + vec2( texel.x, 0.0)).rgb, texture(u_videoTexture, uvCurr + vec2( texel.x, 0.0)).rgb, u_flowTime);
    vec3 w = mix(texture(u_prevVideoTexture, uvPrev + vec2(-texel.x, 0.0)).rgb, texture(u_videoTexture, uvCurr + vec2(-texel.x, 0.0)).rgb, u_flowTime);
    float weight = -0.125 * u_sharpnessAmount;
    blended = (blended + weight * (n + s + e + w)) / (1.0 + 4.0 * weight);
  }

  return blended;
}

// HDR10+ Dynamic Tone Mapping with Master Nits & Diffuse White Gain
vec3 applyHDR10PlusToneMapping(vec3 rgbLinear) {
  // 1. Apply Diffuse White Scale & Master Brightness Nits Multiplier
  // Standard SDR 100 nits is scaled up to target diffuse paper white (e.g. 250 nits)
  float diffuseScale = max(1.0, u_diffuseWhiteNits / 100.0) * u_brightnessBoost;
  vec3 scaledLinear = rgbLinear * diffuseScale;

  // 2. Black pedestal shadow lift
  scaledLinear = max(vec3(0.0), scaledLinear + vec3(u_blackPedestal * 0.1));

  // 3. Midtone gamma lift (brightens scenes without blowing out highlights)
  if (u_midtoneLift != 1.0) {
    scaledLinear = pow(scaledLinear, vec3(1.0 / max(0.5, u_midtoneLift)));
  }

  // 4. Compute Luminance in BT.2020
  float lum = dot(scaledLinear, vec3(0.2627, 0.6780, 0.0593));
  if (lum < 0.00001) return scaledLinear;

  // 5. Shadow shaping & detail recovery
  float shadowMapped = pow(lum, 1.0 / max(0.5, u_shadowRollOff));

  // 6. Dynamic Knee & Shoulder tone mapping
  float mappedLum;
  if (shadowMapped <= u_kneePointX) {
    mappedLum = shadowMapped * (u_kneePointY / max(0.01, u_kneePointX));
  } else {
    float t = (shadowMapped - u_kneePointX) / max(0.001, (1.0 - u_kneePointX));
    float shoulder = mix(u_kneePointY, 1.0 * u_specularBoost, smoothstep(0.0, 1.0, t * u_bezierWeight));
    mappedLum = shoulder;
  }

  // Scale RGB by mapped luminance
  float scale = mappedLum / lum;
  vec3 mappedRGB = scaledLinear * scale;

  // 7. Wide Gamut Saturation & Smart Vibrance
  float newLum = dot(mappedRGB, vec3(0.2627, 0.6780, 0.0593));
  float satFactor = u_saturation * u_colorVibrance;
  mappedRGB = mix(vec3(newLum), mappedRGB, satFactor);

  return max(vec3(0.0), mappedRGB);
}

// HDR Effect: Micro-Contrast Pop and Specular Highlight Bloom
vec3 applyHDREffect(vec3 color, vec2 uv, vec2 texel) {
  if (!u_hdrEffectEnabled) return color;

  // 1. Local dynamic range / Micro-contrast HDR Pop
  if (u_hdrPopIntensity > 0.01) {
    vec3 blur = (
      texture(u_videoTexture, uv + vec2(-texel.x * 2.0, -texel.y * 2.0)).rgb +
      texture(u_videoTexture, uv + vec2( texel.x * 2.0, -texel.y * 2.0)).rgb +
      texture(u_videoTexture, uv + vec2(-texel.x * 2.0,  texel.y * 2.0)).rgb +
      texture(u_videoTexture, uv + vec2( texel.x * 2.0,  texel.y * 2.0)).rgb
    ) * 0.25;

    vec3 detail = color - blur;
    color = clamp(color + detail * (u_hdrPopIntensity * 0.8), 0.0, 2.0);
  }

  // 2. Radiant Specular Bloom on Highlights
  if (u_specularBloomIntensity > 0.01) {
    float luma = dot(color, vec3(0.2627, 0.6780, 0.0593));
    if (luma > u_bloomThreshold) {
      float bloomFactor = smoothstep(u_bloomThreshold, 1.0, luma) * u_specularBloomIntensity;
      vec3 bloomGlow = vec3(1.0, 0.95, 0.88) * bloomFactor * 0.45;
      color += bloomGlow;
    }
  }

  return color;
}

// False Color Exposure Mapping for HDR Monitoring
vec3 getFalseColor(float nits) {
  if (nits < 5.0) {
    return vec3(0.3, 0.1, 0.58);
  } else if (nits < 50.0) {
    return vec3(0.11, 0.31, 0.85);
  } else if (nits < 100.0) {
    return vec3(0.02, 0.71, 0.83);
  } else if (nits < 250.0) {
    return vec3(0.13, 0.77, 0.37);
  } else if (nits < 600.0) {
    return vec3(0.92, 0.70, 0.03);
  } else if (nits < 1000.0) {
    return vec3(0.98, 0.45, 0.09);
  } else {
    return vec3(0.94, 0.27, 0.27);
  }
}

void main() {
  vec2 uv = v_texCoord;
  vec2 texel = u_texelSize;

  // Split-Screen comparison mode check
  bool isLeftSplit = (u_monitoringMode == 1) && (uv.x < u_splitPosition);
  bool isSplitDivider = (u_monitoringMode == 1) && (abs(uv.x - u_splitPosition) < 0.002);

  if (isSplitDivider) {
    fragColor = vec4(1.0, 0.8, 0.1, 1.0); // Bright golden separator line
    return;
  }

  // Sample raw SDR (with optical flow or normal)
  vec3 rawSdrSample = texture(u_videoTexture, uv).rgb;
  vec3 sdrRgb = clamp(rawSdrSample * u_exposure, 0.0, 1.0);

  if (isLeftSplit || u_monitoringMode == 3) {
    // Show Raw SDR BT.709
    fragColor = vec4(sdrRgb, 1.0);
    return;
  }

  // 1. Sample Video with Optical Flow & Sharpness
  vec3 processedSdr = sampleWithOpticalFlow(uv, texel) * u_exposure;

  // If showing motion vector overlay directly
  if (u_showMotionVectors && u_opticalFlowEnabled) {
    fragColor = vec4(processedSdr, 1.0);
    return;
  }

  // 2. SDR to Linear Light
  vec3 linearRgb = sdrToLinear(clamp(processedSdr, 0.0, 1.0));

  // 3. Expand Gamut from BT.709 to Target Gamut (e.g. BT.2020)
  vec3 gamutRgb = max(vec3(0.0), u_gamutMatrix * linearRgb);

  // 4. HDR10+ Dynamic Tone Mapping (with Brightness Nits & Diffuse White scaling)
  vec3 hdrToneMapped = applyHDR10PlusToneMapping(gamutRgb);

  // Convert to intermediate display range
  vec3 displayRgb = linearToSDR(hdrToneMapped);

  // 5. Apply 3D LUT in gamut space if enabled
  vec3 lutGraded = displayRgb;
  if (u_useLut && u_monitoringMode != 4) {
    float halfTexel = 0.5 / float(u_lutSize);
    vec3 lutCoord = clamp(displayRgb, 0.0, 1.0) * ((float(u_lutSize) - 1.0) / float(u_lutSize)) + halfTexel;
    vec3 lutSample = texture(u_lutTexture, lutCoord).rgb;
    lutGraded = mix(displayRgb, lutSample, u_lutIntensity);
  }

  // 6. Apply HDR Effect (Micro-Contrast Pop & Specular Bloom)
  vec3 finalRgb = applyHDREffect(lutGraded, uv, texel);

  // 7. False Color Monitoring Mode
  if (u_monitoringMode == 2) {
    float estimatedNits = dot(hdrToneMapped, vec3(0.2627, 0.6780, 0.0593)) * (u_targetNits / 1.0);
    fragColor = vec4(getFalseColor(estimatedNits), 1.0);
    return;
  }

  fragColor = vec4(clamp(finalRgb, 0.0, 1.0), 1.0);
}
`;

export class WebGLHDRRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private videoTexture: WebGLTexture | null = null;
  private prevVideoTexture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private quadVao: WebGLVertexArrayObject | null = null;

  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private currentLutSize = 17;
  private hasLutLoaded = false;
  private hasPrevFrame = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGL();
  }

  private initGL() {
    this.gl = this.canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });

    if (!this.gl) {
      console.warn('WebGL2 not available');
      return;
    }

    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VS_SOURCE);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex Shader Error:', gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FS_SOURCE);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment Shader Error:', gl.getShaderInfoLog(fs));
    }

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program Link Error:', gl.getProgramInfoLog(this.program));
    }

    gl.useProgram(this.program);

    // Quad geometry
    const vertices = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
      -1,  1, 0, 0,
       1, -1, 1, 1,
       1,  1, 1, 0,
    ]);

    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

    const texLoc = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

    // Create Current Video Texture
    this.videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Create Previous Video Texture (for Optical Flow)
    this.prevVideoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.prevVideoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Create 3D LUT Texture
    this.lutTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Cache Uniform Locations
    const uniformNames = [
      'u_videoTexture',
      'u_prevVideoTexture',
      'u_lutTexture',
      'u_useLut',
      'u_lutIntensity',
      'u_lutSize',
      'u_gamutMatrix',
      'u_splitPosition',
      'u_monitoringMode',
      'u_texelSize',
      'u_targetNits',
      'u_diffuseWhiteNits',
      'u_brightnessBoost',
      'u_midtoneLift',
      'u_blackPedestal',
      'u_exposure',
      'u_kneePointX',
      'u_kneePointY',
      'u_bezierWeight',
      'u_specularBoost',
      'u_shadowRollOff',
      'u_saturation',
      'u_hdrEffectEnabled',
      'u_hdrPopIntensity',
      'u_specularBloomIntensity',
      'u_bloomThreshold',
      'u_colorVibrance',
      'u_sharpnessEnabled',
      'u_sharpnessAmount',
      'u_upscaleFactor',
      'u_opticalFlowEnabled',
      'u_flowTime',
      'u_flowSensitivity',
      'u_showMotionVectors'
    ];

    for (const name of uniformNames) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
  }

  public uploadLutData(cubeData: Float32Array, size: number) {
    if (!this.gl || !this.lutTexture) return;
    const gl = this.gl;

    this.currentLutSize = size;
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA32F,
      size,
      size,
      size,
      0,
      gl.RGBA,
      gl.FLOAT,
      cubeData
    );
    this.hasLutLoaded = true;
  }

  public renderFrame(
    videoSource: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
    options: {
      metadata: HDR10PlusMetadata;
      gamut: ColorGamut;
      monitoringMode: MonitoringMode;
      splitPosition: number;
      useLut: boolean;
      lutIntensity: number;
      exposure: number;
      flowInterpolationTime?: number; // 0.0 to 1.0 (0.5 for 60fps in-between)
    }
  ) {
    if (!this.gl || !this.program || !this.videoTexture) return;
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    // If optical flow enabled, copy last frame into prevVideoTexture before updating current
    if (options.metadata.opticalFlowEnabled && this.hasPrevFrame && this.prevVideoTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.prevVideoTexture);
      // Keep previous frame buffer active
    }

    // Upload Current Video Texture (Texture 0)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoSource);
    gl.uniform1i(this.uniforms['u_videoTexture'], 0);

    // If first time, initialize prevVideoTexture with same frame
    if (!this.hasPrevFrame && this.prevVideoTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.prevVideoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoSource);
      this.hasPrevFrame = true;
    }
    gl.uniform1i(this.uniforms['u_prevVideoTexture'], 1);

    // Bind 3D LUT Texture (Texture 2)
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.uniform1i(this.uniforms['u_lutTexture'], 2);

    // Texel size for CAS sharpness, upscaling and optical flow
    gl.uniform2f(this.uniforms['u_texelSize'], 1.0 / this.canvas.width, 1.0 / this.canvas.height);

    // Gamut matrix
    const matrix = getGamutMatrix(options.gamut);
    gl.uniformMatrix3fv(this.uniforms['u_gamutMatrix'], false, new Float32Array(matrix));

    // Monitoring Mode
    let modeCode = 0;
    if (options.monitoringMode === 'split_ab') modeCode = 1;
    else if (options.monitoringMode === 'false_color') modeCode = 2;
    else if (options.monitoringMode === 'sdr_only') modeCode = 3;
    else if (options.monitoringMode === 'hdr_only') modeCode = 4;

    gl.uniform1i(this.uniforms['u_monitoringMode'], modeCode);
    gl.uniform1f(this.uniforms['u_splitPosition'], options.splitPosition);
    gl.uniform1i(this.uniforms['u_useLut'], options.useLut && this.hasLutLoaded ? 1 : 0);
    gl.uniform1f(this.uniforms['u_lutIntensity'], options.lutIntensity);
    gl.uniform1i(this.uniforms['u_lutSize'], this.currentLutSize);

    // Brightness Nits & Tone Mapping Uniforms
    gl.uniform1f(this.uniforms['u_targetNits'], options.metadata.targetedNits);
    gl.uniform1f(this.uniforms['u_diffuseWhiteNits'], options.metadata.diffuseWhiteNits || 250.0);
    gl.uniform1f(this.uniforms['u_brightnessBoost'], options.metadata.brightnessBoost || 1.35);
    gl.uniform1f(this.uniforms['u_midtoneLift'], options.metadata.midtoneLift || 1.25);
    gl.uniform1f(this.uniforms['u_blackPedestal'], options.metadata.blackPedestal || 0.0);
    gl.uniform1f(this.uniforms['u_exposure'], options.exposure);

    gl.uniform1f(this.uniforms['u_kneePointX'], options.metadata.kneePointX);
    gl.uniform1f(this.uniforms['u_kneePointY'], options.metadata.kneePointY);
    gl.uniform1f(this.uniforms['u_bezierWeight'], options.metadata.bezierWeight);
    gl.uniform1f(this.uniforms['u_specularBoost'], options.metadata.specularBoost);
    gl.uniform1f(this.uniforms['u_shadowRollOff'], options.metadata.shadowRollOff);
    gl.uniform1f(this.uniforms['u_saturation'], options.metadata.saturationBoost);

    // HDR Effect Engine Uniforms
    gl.uniform1i(this.uniforms['u_hdrEffectEnabled'], options.metadata.hdrEffectEnabled ? 1 : 0);
    gl.uniform1f(this.uniforms['u_hdrPopIntensity'], options.metadata.hdrPopIntensity || 0.8);
    gl.uniform1f(this.uniforms['u_specularBloomIntensity'], options.metadata.specularBloomIntensity || 0.7);
    gl.uniform1f(this.uniforms['u_bloomThreshold'], options.metadata.bloomThreshold || 0.7);
    gl.uniform1f(this.uniforms['u_colorVibrance'], options.metadata.colorVibrance || 1.15);

    // Sharpness & Upscaling Uniforms
    gl.uniform1i(this.uniforms['u_sharpnessEnabled'], options.metadata.sharpnessEnabled ? 1 : 0);
    gl.uniform1f(this.uniforms['u_sharpnessAmount'], options.metadata.sharpnessAmount || 0.75);
    gl.uniform1f(this.uniforms['u_upscaleFactor'], options.metadata.upscaleFactor || 1.0);

    // Optical Flow 60 FPS Uniforms
    gl.uniform1i(this.uniforms['u_opticalFlowEnabled'], options.metadata.opticalFlowEnabled ? 1 : 0);
    gl.uniform1f(this.uniforms['u_flowTime'], options.flowInterpolationTime !== undefined ? options.flowInterpolationTime : 0.0);
    gl.uniform1f(this.uniforms['u_flowSensitivity'], options.metadata.flowSensitivity || 1.0);
    gl.uniform1i(this.uniforms['u_showMotionVectors'], options.metadata.showMotionVectors ? 1 : 0);

    // Draw full-screen quad
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Cycle previous frame texture for optical flow next tick
    if (options.metadata.opticalFlowEnabled && this.prevVideoTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.prevVideoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoSource);
    }
  }

  public getHistogramAndWaveform() {
    if (!this.gl) return null;
    const gl = this.gl;

    const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
    gl.readPixels(0, 0, this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const rHist = new Uint32Array(64);
    const gHist = new Uint32Array(64);
    const bHist = new Uint32Array(64);
    const lumaHist = new Uint32Array(64);

    const step = Math.max(1, Math.floor((this.canvas.width * this.canvas.height) / 10000));
    const totalPixels = this.canvas.width * this.canvas.height;

    for (let i = 0; i < totalPixels; i += step) {
      const idx = i * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const luma = Math.round(0.2627 * r + 0.6780 * g + 0.0593 * b);

      rHist[Math.min(63, Math.floor(r / 4))]++;
      gHist[Math.min(63, Math.floor(g / 4))]++;
      bHist[Math.min(63, Math.floor(b / 4))]++;
      lumaHist[Math.min(63, Math.floor(luma / 4))]++;
    }

    return { rHist, gHist, bHist, lumaHist };
  }

  public destroy() {
    if (!this.gl) return;
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.videoTexture) gl.deleteTexture(this.videoTexture);
    if (this.prevVideoTexture) gl.deleteTexture(this.prevVideoTexture);
    if (this.lutTexture) gl.deleteTexture(this.lutTexture);
    if (this.quadVao) gl.deleteVertexArray(this.quadVao);
  }
}
