import { vec2 } from 'gl-matrix';
import Shader from './shader';

const MAX_TEXTURE_WIDTH = 4096;

const fixedMod = (n: number, m: number) => ((n % m) + m) % m;

// https://stackoverflow.com/a/17243070
function hsvToRgb(h: number, s: number, v: number) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r: number;
  let g: number;
  let b: number;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default:
      r = v;
      g = p;
      b = q;
  }

  return [r, g, b];
}

const fullscreenVertexShader = `#version 300 es

  void main() {
    switch (gl_VertexID) {
    case 0:
      gl_Position = vec4(-1, -1, 0, 1);
      return;
    case 1:
      gl_Position = vec4(-1, 1, 0, 1);
      return;
    case 2:
      gl_Position = vec4(1, 1, 0, 1);
      return;
    case 3:
      gl_Position = vec4(-1, -1, 0, 1);
      return;
    case 4:
      gl_Position = vec4(1, -1, 0, 1);
      return;
    case 5:
      gl_Position = vec4(1, 1, 0, 1);
      return;
    }
  }
`;

const calculateNewPositionsFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D particlePositions;
  uniform sampler2D particlePrevPositions;

  uniform int numParticles;

  uniform vec2 gravityCenter;
  uniform float gravityStrength;
  uniform float accelerationCap;
  uniform float dt;

  out vec4 particleNextPosition;

  void main() {
    vec2 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xy;
    vec2 prevPosition = texelFetch(particlePrevPositions, ivec2(gl_FragCoord.xy), 0).xy;

    vec2 delta = gravityCenter - position;
    vec2 acceleration = gravityStrength * delta / pow(length(delta), 2.);
    if (dot(acceleration, acceleration) > accelerationCap * accelerationCap) {
      acceleration = normalize(acceleration) * accelerationCap;
    }

    vec2 nextPosition = 2. * position - prevPosition + acceleration * dt * dt;
    particleNextPosition = vec4(nextPosition, 0., 1.);
  }
`;

const particleVertexShader = `#version 300 es

  uniform sampler2D particlePositions;
  uniform sampler2D particleColors;

  uniform vec2 worldSize;

  out vec3 color;
  
  void main() {
    ivec2 index = ivec2(gl_VertexID % ${MAX_TEXTURE_WIDTH}, gl_VertexID / ${MAX_TEXTURE_WIDTH});
    vec2 position = texelFetch(particlePositions, index, 0).xy;
    color = texelFetch(particleColors, index, 0).xyz;
    
    gl_PointSize = 1.;
    gl_Position = vec4(position / worldSize, 0., 1.);
  }
`;

const particleFragmentShader = `#version 300 es

  precision highp float;

  in vec3 color;

  out vec4 FragColor;
  
  void main() {
    FragColor = vec4(color, 1.);
  }
`;

class Space {
  gl: WebGL2RenderingContext;

  numParticles: number;
  maxRadius: number;
  worldSize: vec2;

  particleComputeVAO: WebGLVertexArrayObject;
  particleRenderVAO: WebGLVertexArrayObject;
  particlePositions1: WebGLTexture;
  particlePositionsFBO1: WebGLFramebuffer;
  particlePositions2: WebGLTexture;
  particlePositionsFBO2: WebGLFramebuffer;
  particlePositions3: WebGLTexture;
  particlePositionsFBO3: WebGLFramebuffer;
  particleColors: WebGLTexture;

  calculateNewPositionsShader: Shader;
  particleRenderShader: Shader;

  nextCurrentPositions: number = 2;

  constructor(gl: WebGL2RenderingContext, numParticles: number) {
    this.gl = gl;

    this.numParticles = numParticles;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.getExtension('EXT_color_buffer_float');

    if (gl.canvas.width > gl.canvas.height) {
      this.worldSize = [gl.canvas.width / gl.canvas.height, 1];
      this.maxRadius = Math.sqrt(this.worldSize[0] ** 2 + 1);
    } else {
      this.worldSize = [1, gl.canvas.height / gl.canvas.width];
      this.maxRadius = Math.sqrt(this.worldSize[1] ** 2 + 1);
    }

    const initialParticlePositions = new Float32Array(
      MAX_TEXTURE_WIDTH * Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH) * 4
    );
    const particleColors = new Float32Array(
      MAX_TEXTURE_WIDTH * Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH) * 4
    );
    for (let i = 0; i < numParticles; i++) {
      const r = Math.sqrt(Math.random() * this.maxRadius ** 2);
      const theta = Math.random() * 2 * Math.PI;

      initialParticlePositions[4 * i + 0] = r * Math.cos(theta);
      initialParticlePositions[4 * i + 1] = r * Math.sin(theta);
      initialParticlePositions[4 * i + 2] = 0;
      initialParticlePositions[4 * i + 3] = 0;

      const rgb = hsvToRgb(r / 2 + 0.7, 0.7, 1);
      particleColors[4 * i + 0] = rgb[0];
      particleColors[4 * i + 1] = rgb[1];
      particleColors[4 * i + 2] = rgb[2];
      particleColors[4 * i + 3] = 0;
    }

    this.particleComputeVAO = gl.createVertexArray()!;
    this.particleRenderVAO = gl.createVertexArray()!;

    this.particlePositions1 = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositions1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      initialParticlePositions
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particlePositionsFBO1 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsFBO1);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particlePositions1,
      0
    );

    this.particlePositions2 = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositions2);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      initialParticlePositions
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particlePositionsFBO2 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsFBO2);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particlePositions2,
      0
    );

    this.particlePositions3 = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositions3);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      initialParticlePositions
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particlePositionsFBO3 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsFBO3);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particlePositions3,
      0
    );

    this.particleColors = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.particleColors);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      particleColors
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.calculateNewPositionsShader = new Shader(
      gl,
      fullscreenVertexShader,
      calculateNewPositionsFragmentShader
    );
    this.particleRenderShader = new Shader(
      gl,
      particleVertexShader,
      particleFragmentShader
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  step(dt: number, gravityCenter: [number, number]) {
    const normalizedGravityCenter = [
      (2 * gravityCenter[0]) / this.gl.canvas.width - 1,
      (2 * gravityCenter[1]) / this.gl.canvas.height - 1,
    ];
    const scaledGravityCenter = [
      this.worldSize[0] * normalizedGravityCenter[0],
      this.worldSize[1] * normalizedGravityCenter[1],
    ];

    const targetFBO = [
      this.particlePositionsFBO1,
      this.particlePositionsFBO2,
      this.particlePositionsFBO3,
    ][this.nextCurrentPositions];

    this.gl.viewport(
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH)
    );
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, targetFBO);
    this.gl.bindVertexArray(this.particleComputeVAO);
    this.calculateNewPositionsShader.use();
    this.calculateNewPositionsShader.setInt(
      'particlePositions',
      fixedMod(this.nextCurrentPositions - 1, 3)
    );
    this.calculateNewPositionsShader.setInt(
      'particlePrevPositions',
      fixedMod(this.nextCurrentPositions - 2, 3)
    );
    this.calculateNewPositionsShader.setInt('numParticles', this.numParticles);
    this.calculateNewPositionsShader.setVec2(
      'gravityCenter',
      scaledGravityCenter[0],
      scaledGravityCenter[1]
    );
    this.calculateNewPositionsShader.setFloat('gravityStrength', 0.05);
    this.calculateNewPositionsShader.setFloat('accelerationCap', 0.1);
    this.calculateNewPositionsShader.setFloat('dt', dt);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    this.nextCurrentPositions = fixedMod(this.nextCurrentPositions + 1, 3);
  }

  render() {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.bindVertexArray(this.particleRenderVAO);
    this.particleRenderShader.use();
    this.particleRenderShader.setInt(
      'particlePositions',
      fixedMod(this.nextCurrentPositions - 1, 3)
    );
    this.particleRenderShader.setInt('particleColors', 3);
    this.particleRenderShader.setVec2(
      'worldSize',
      this.worldSize[0],
      this.worldSize[1]
    );
    this.gl.drawArrays(this.gl.POINTS, 0, this.numParticles);
  }
}

export default Space;
