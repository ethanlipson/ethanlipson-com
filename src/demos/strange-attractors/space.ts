import { vec3, mat4 } from 'gl-matrix';
import Shader from './shader';

const MAX_TEXTURE_WIDTH = 4096;

// https://stackoverflow.com/a/17243070
function HSVtoRGB(h: number, s: number, v: number): [number, number, number] {
  let r: number;
  let g: number;
  let b: number;
  let i: number;
  let f: number;
  let p: number;
  let q: number;
  let t: number;

  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
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
    case 5:
      r = v;
      g = p;
      b = q;
      break;
    default:
      r = 0;
      g = 0;
      b = 0;
      break;
  }

  return [r, g, b];
}

type Attractor = {
  readonly id: number;
  readonly renderTransform: mat4;
  readonly particleScale: number;
  readonly particleOffset: vec3;
};

export const attractors = {
  lorenz: {
    id: 0,
    renderTransform: mat4.rotate(
      mat4.create(),
      mat4.rotate(
        mat4.create(),
        mat4.scale(
          mat4.create(),
          mat4.translate(mat4.create(), mat4.create(), [-5, 0, 0]),
          [0.2, 0.2, 0.2]
        ),
        Math.PI / 6,
        [1, 0, 0]
      ),
      Math.PI / 2,
      [0, 1, 0]
    ),
    particleScale: 0.01,
    particleOffset: vec3.fromValues(0, 1, 10),
  },
  aizawa: {
    id: 1,
    renderTransform: mat4.rotate(
      mat4.create(),
      mat4.scale(
        mat4.create(),
        mat4.translate(mat4.create(), mat4.create(), [2, 2, -2]),
        [4, 4, 4]
      ),
      (-4 * Math.PI) / 4,
      [1, 1, -1]
    ),
    particleScale: 0.01,
    particleOffset: vec3.fromValues(1, 0, 1.94),
  },
  sakarya: {
    id: 2,
    renderTransform: mat4.translate(
      mat4.create(),
      mat4.scale(
        mat4.create(),
        mat4.rotate(mat4.create(), mat4.create(), -Math.PI / 2, [0, 1, 0]),
        [0.1, 0.1, 0.1]
      ),
      [0, 0, 0]
    ),
    particleScale: 1,
    particleOffset: vec3.fromValues(0, 0, 0),
  },
} as const;

const stepVertexShader = `#version 300 es

  uniform int numParticles;
  uniform int stepId;

  flat out ivec2 particleReadPos;
  flat out int doStep;

  void main() {
    int particleId = gl_VertexID % numParticles;
    
    int particleWriteStepId;
    if (gl_VertexID < numParticles) {
      particleWriteStepId = stepId;
    }
    else {
      particleWriteStepId = stepId + 1;
    }

    int sectionHeight = particleId * (${MAX_TEXTURE_WIDTH} / numParticles);
    int x = particleWriteStepId % ${MAX_TEXTURE_WIDTH};
    int y = particleWriteStepId / ${MAX_TEXTURE_WIDTH} + sectionHeight;

    float ndcX = (float(x) + .5) / float(${MAX_TEXTURE_WIDTH}) * 2. - 1.;
    float ndcY = (float(y) + .5) / float(${MAX_TEXTURE_WIDTH}) * 2. - 1.;

    gl_PointSize = 1.;

    gl_Position = vec4(ndcX, ndcY, 0., 1.);
    particleReadPos = ivec2(stepId % ${MAX_TEXTURE_WIDTH}, stepId / ${MAX_TEXTURE_WIDTH} + sectionHeight);
    doStep = gl_VertexID >= numParticles ? 1 : 0;
  }
`;

const stepFragmentShader = `#version 300 es

  precision highp float;

  flat in ivec2 particleReadPos;
  flat in int doStep;

  uniform sampler2D srcParticlePositions;

  uniform int attractorType;
  uniform float dt;
  uniform int substeps;

  out vec4 dstParticlePosition;

  vec4 lorenzStep(vec4 curr) {
    const float rho = 28.;
    const float sigma = 10.;
    const float beta = 8. / 3.;

    return vec4(
      sigma * (curr.y - curr.x),
      curr.x * (rho - curr.z) - curr.y,
      curr.x * curr.y - beta * curr.z,
      0.
    );
  }
  
  vec4 aizawaStep(vec4 curr) {
    const float a = .95;
    const float b = .7;
    const float c = .6;
    const float d = 3.5;
    const float e = .25;
    const float f = .1;
    
    return vec4(
      (curr.z - b) * curr.x - d * curr.y,
      d * curr.x + (curr.z - b) * curr.y,
      c + a * curr.z - (curr.z * curr.z * curr.z) / 3. - (curr.x * curr.x + curr.y * curr.y) * (1. + e * curr.z) + f * curr.z * curr.x * curr.x * curr.x,
      0.
    );
  }

  vec4 sakaryaStep(vec4 curr) {
    const float alpha = .4;
    const float beta = .3;

    return vec4(
      -curr.x + curr.y + curr.y * curr.z,
      -curr.x - curr.y + alpha * curr.x * curr.z,
      curr.z - beta * curr.x * curr.y,
      0.
    );
  }

  void main() {
    vec4 curr = texelFetch(srcParticlePositions, particleReadPos, 0);

    if (doStep == 0) {
      dstParticlePosition = curr;
      return;
    }
    
    for (int i = 0; i < substeps; i++) {
      vec4 step;
      switch (attractorType) {
        case 0:
          step = lorenzStep(curr);
          break;
        case 1:
          step = aizawaStep(curr);
          break;
        case 2:
          step = sakaryaStep(curr);
          break;
      }

      curr = curr + (dt / float(substeps)) * step;
    }
    
    dstParticlePosition = curr;
  }
`;

const lineVertexShader = `#version 300 es

  uniform sampler2D particlePositions;

  uniform int numParticles;
  uniform int particleId;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  void main() {
    int sectionHeight = particleId * (${MAX_TEXTURE_WIDTH} / numParticles);
    int x = gl_VertexID % ${MAX_TEXTURE_WIDTH};
    int y = gl_VertexID / ${MAX_TEXTURE_WIDTH} + sectionHeight;

    vec3 pos = texelFetch(particlePositions, ivec2(x, y), 0).xyz;
    gl_Position = projection * view * model * vec4(pos, 1.);
  }
`;

const lineFragmentShader = `#version 300 es

  precision highp float;

  uniform vec3 color;

  out vec4 FragColor;
  
  void main() {
    FragColor = vec4(color, 1.);
  }
`;

const skyboxVertexShader = `#version 300 es

  out vec4 ndc;

  void main() {

    switch (gl_VertexID) {
    case 0:
      ndc = vec4(-1, -1, 0, 1);
      break;
    case 1:
      ndc = vec4(-1, 1, 0, 1);
      break;
    case 2:
      ndc = vec4(1, 1, 0, 1);
      break;
    case 3:
      ndc = vec4(-1, -1, 0, 1);
      break;
    case 4:
      ndc = vec4(1, -1, 0, 1);
      break;
    case 5:
      ndc = vec4(1, 1, 0, 1);
      break;
    }

    gl_Position = vec4(ndc.xy, .999, 1.);
  }
`;

const skyboxFragmentShader = `#version 300 es

  precision highp float;

  in vec4 ndc;
  
  uniform samplerCube skyboxTexture;
  
  uniform mat4 inverseProjectionView;
  
  out vec4 FragColor;
  
  void main() {
    vec4 unprojected = inverseProjectionView * ndc;
    FragColor = texture(skyboxTexture, normalize(unprojected.xyz / unprojected.w));
  }
`;

class Space {
  gl: WebGL2RenderingContext;

  attractor: Attractor;
  numParticles: number;

  particleComputeVAO: WebGLVertexArrayObject;
  particlePositionsOdd: WebGLTexture;
  particlePositionsOddFBO: WebGLFramebuffer;
  particlePositionsEven: WebGLTexture;
  particlePositionsEvenFBO: WebGLFramebuffer;

  stepShader: Shader;
  currStep: number = 0;

  skyboxVAO: WebGLVertexArrayObject;
  skyboxTexture: WebGLTexture;
  skyboxShader: Shader;

  lineVAO: WebGLVertexArrayObject;
  lineShader: Shader;

  constructor(
    gl: WebGL2RenderingContext,
    attractor: Attractor,
    numParticles: number
  ) {
    this.gl = gl;

    this.attractor = attractor;
    this.numParticles = numParticles;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.getExtension('EXT_color_buffer_float');

    this.particleComputeVAO = gl.createVertexArray()!;
    this.lineVAO = gl.createVertexArray()!;
    this.skyboxVAO = gl.createVertexArray()!;

    this.particlePositionsOdd = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionsOdd);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      MAX_TEXTURE_WIDTH,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particlePositionsOddFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsOddFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particlePositionsOdd,
      0
    );

    this.particlePositionsEven = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionsEven);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      MAX_TEXTURE_WIDTH,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particlePositionsEvenFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsEvenFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particlePositionsEven,
      0
    );

    this.skyboxTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

    const cubemapFaces: { target: number; src: string }[] = [
      { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: '/skybox/space/nx.png' },
      { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: '/skybox/space/px.png' },
      { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: '/skybox/space/ny.png' },
      { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: '/skybox/space/py.png' },
      { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: '/skybox/space/nz.png' },
      { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: '/skybox/space/pz.png' },
    ];

    let facesLoaded = 0;
    cubemapFaces.forEach(face => {
      const img = new Image();
      img.src = face.src;
      img.onload = () => {
        gl.activeTexture(gl.TEXTURE2);
        gl.texImage2D(face.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        facesLoaded++;
        if (facesLoaded === 6) {
          gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
          gl.texParameteri(
            gl.TEXTURE_CUBE_MAP,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR
          );
        }
      };
    });

    this.stepShader = new Shader(gl, stepVertexShader, stepFragmentShader);
    this.lineShader = new Shader(gl, lineVertexShader, lineFragmentShader);
    this.skyboxShader = new Shader(
      gl,
      skyboxVertexShader,
      skyboxFragmentShader
    );

    gl.activeTexture(gl.TEXTURE0);
    for (let i = 0; i < numParticles; i++) {
      const sectionHeight = i * Math.floor(MAX_TEXTURE_WIDTH / numParticles);

      const result = vec3.scaleAndAdd(
        vec3.create(),
        attractor.particleOffset,
        vec3.fromValues(Math.random(), Math.random(), Math.random()),
        attractor.particleScale
      );

      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        sectionHeight,
        1,
        1,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array([
          result[0],
          result[1],
          result[2],
          0,
          // 0, 0, 0, 0,
        ])
      );
    }
  }
  step(dt: number, substeps: number) {
    const gl = this.gl;

    gl.bindVertexArray(this.particleComputeVAO);
    gl.viewport(0, 0, MAX_TEXTURE_WIDTH, MAX_TEXTURE_WIDTH);

    const srcTexId = this.currStep % 2;
    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      this.currStep % 2 === 0
        ? this.particlePositionsEvenFBO
        : this.particlePositionsOddFBO
    );
    this.stepShader.use();
    this.stepShader.setInt('attractorType', this.attractor.id);
    this.stepShader.setInt('numParticles', this.numParticles);
    this.stepShader.setInt('stepId', this.currStep);
    this.stepShader.setInt('srcParticlePositions', srcTexId);
    this.stepShader.setFloat('dt', dt);
    this.stepShader.setInt('substeps', substeps);
    gl.drawArrays(gl.POINTS, 0, this.numParticles * 2);

    this.currStep++;
  }

  render(projection: mat4, view: mat4, model: mat4, trailLength: number) {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.bindVertexArray(this.lineVAO);
    gl.lineWidth(2);

    for (let particleId = 0; particleId < this.numParticles; particleId++) {
      const color = HSVtoRGB(particleId / this.numParticles, 1, 1);

      this.lineShader.use();
      this.lineShader.setInt('particlePositions', this.currStep % 2);
      this.lineShader.setInt('numParticles', this.numParticles);
      this.lineShader.setInt('particleId', particleId);
      this.lineShader.setVec3('color', color[0], color[1], color[2]);
      this.lineShader.setMat4('projection', projection);
      this.lineShader.setMat4('view', view);
      this.lineShader.setMat4(
        'model',
        mat4.mul(mat4.create(), model, this.attractor.renderTransform)
      );
      gl.drawArrays(
        gl.LINE_STRIP,
        Math.max(0, this.currStep - trailLength),
        Math.min(this.currStep + 1, trailLength + 1)
      );
    }

    gl.bindVertexArray(this.skyboxVAO);

    const viewWithoutTranslation = mat4.clone(view);
    viewWithoutTranslation[12] = 0;
    viewWithoutTranslation[13] = 0;
    viewWithoutTranslation[14] = 0;

    const inverseProjectionView = mat4.invert(
      mat4.create(),
      mat4.mul(mat4.create(), projection, viewWithoutTranslation)
    );

    this.skyboxShader.use();
    this.skyboxShader.setMat4('inverseProjectionView', inverseProjectionView);
    this.skyboxShader.setInt('skyboxTexture', 2);
    // gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

export default Space;
