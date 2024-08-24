import Shader from './shader';

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

const updateDudtFragmentShader = `#version 300 es

  precision highp float;

  uniform ivec2 numCells;
  uniform float dt;
  uniform float c;

  uniform sampler2D u;
  uniform sampler2D dudt;

  out vec4 newDudt;

  const ivec2 neighbors[4] = ivec2[](
    ivec2(1, 0),
    ivec2(-1, 0),
    ivec2(0, 1),
    ivec2(0, -1)
  );

  void main() {
    ivec2 idx = ivec2(gl_FragCoord.xy);
    float oldDudt = texelFetch(dudt, idx, 0).x;

    float laplacian = -4. * texelFetch(u, idx, 0).x;
    for (int i = 0; i < 4; i++) {
      ivec2 neighborU = (idx + neighbors[i] + numCells) % numCells;
      laplacian += texelFetch(u, neighborU, 0).x;
    }

    newDudt = vec4(oldDudt + dt * c * c * laplacian, 0., 0., 1.);
  }
`;

const updateUFragmentShader = `#version 300 es

  precision highp float;

  uniform ivec2 numCells;
  uniform float dt;

  uniform sampler2D u;
  uniform sampler2D dudt;

  out vec4 newU;

  void main() {
    ivec2 idx = ivec2(gl_FragCoord.xy);
    float oldU = texelFetch(u, idx, 0).x;
    float oldDudt = texelFetch(dudt, idx, 0).x;

    newU = vec4(oldU + dt * oldDudt, 0., 0., 1.);
  }
`;

const addGaussianFragmentShader = `#version 300 es

  precision highp float;

  uniform vec2 numCells;
  uniform vec2 pulseCenter;

  uniform sampler2D u;

  out vec4 newU;

  void main() {
    float oldU = texelFetch(u, ivec2(gl_FragCoord.xy), 0).x;

    vec2 cellCenter = gl_FragCoord.xy - vec2(0.5);
    if (cellCenter.x < pulseCenter.x - numCells.x / 2.) cellCenter.x += numCells.x;
    if (cellCenter.x > pulseCenter.x + numCells.x / 2.) cellCenter.x -= numCells.x;
    if (cellCenter.y < pulseCenter.y - numCells.y / 2.) cellCenter.y += numCells.y;
    if (cellCenter.y > pulseCenter.y + numCells.y / 2.) cellCenter.y -= numCells.y;

    float dist = distance(cellCenter, pulseCenter);
    float strength = exp(-dist * dist / 100.);

    newU = vec4(oldU + strength, 0., 0., 1.);
  }
`;

const drawFragmentShader = `#version 300 es

  precision highp float;

  uniform vec2 numCells;
  uniform vec2 screenSize;

  uniform sampler2D u;

  out vec4 FragColor;
  
  vec3 redBlue(float val) {
    return val >= 0. ? mix(vec3(1.), vec3(1., 0., 0.), val) : mix(vec3(1.), vec3(0., 0., 1.), -val);
  }

  vec3 bullseye(float val) {
    float freq = 3.;
    vec3 c1 = vec3(250., 203., 35.) / 255.0;
    vec3 c2 = vec3(37., 209., 247.) / 255.0;
    vec3 color = val >= 0. ? c1 : c2;
    return mix(vec3(0.), color, 1. - abs(mod(val * freq + 2222., 2.) - 1.));
  }

  void main() {
    ivec2 idx = ivec2(gl_FragCoord.xy / screenSize * numCells);
    float val = texelFetch(u, idx, 0).x;

    vec3 color = bullseye(val * 6.);

    FragColor = vec4(color, 1.);
  }
`;

class Space {
  gl: WebGL2RenderingContext;

  numCellsX: number;
  numCellsY: number;

  computeVAO: WebGLVertexArrayObject;
  uTexture1: WebGLTexture;
  uFBO1: WebGLFramebuffer;
  uTexture2: WebGLTexture;
  uFBO2: WebGLFramebuffer;
  dudtTexture1: WebGLTexture;
  dudtFBO1: WebGLFramebuffer;
  dudtTexture2: WebGLTexture;
  dudtFBO2: WebGLFramebuffer;
  updateDudtShader: Shader;
  updateUShader: Shader;
  addGaussianShader: Shader;

  renderVAO: WebGLVertexArrayObject;
  renderShader: Shader;

  substepsPerFrame: number = 5;
  prevClicking: boolean = false;
  currentUTexture: number = 0;

  constructor(
    gl: WebGL2RenderingContext,
    numCellsX: number,
    numCellsY: number
  ) {
    this.gl = gl;

    this.numCellsX = numCellsX;
    this.numCellsY = numCellsY;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.getExtension('EXT_color_buffer_float');

    /***************** Creating the compute shaders *****************/

    this.renderVAO = gl.createVertexArray()!;

    this.computeVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.computeVAO);

    const initialU = new Float32Array(numCellsX * numCellsY);
    const initialDudt = new Float32Array(numCellsX * numCellsY);
    for (let ix = 0; ix < numCellsX; ix++) {
      for (let iy = 0; iy < numCellsY; iy++) {
        // const dist = Math.hypot(ix - numCellsX / 2, iy - numCellsY / 2);
        // const val = Math.exp((-dist * dist) / 100);
        initialU[iy * numCellsX + ix] = 0;
        initialDudt[iy * numCellsX + ix] = 0;
      }
    }

    this.uTexture1 = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.uTexture1);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, this.numCellsX, this.numCellsY);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.numCellsX,
      this.numCellsY,
      gl.RED,
      gl.FLOAT,
      initialU
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.uFBO1 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.uFBO1);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.uTexture1,
      0
    );

    this.uTexture2 = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.uTexture2);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, this.numCellsX, this.numCellsY);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.numCellsX,
      this.numCellsY,
      gl.RED,
      gl.FLOAT,
      initialU
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.uFBO2 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.uFBO2);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.uTexture2,
      0
    );

    this.dudtTexture1 = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.dudtTexture1);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, this.numCellsX, this.numCellsY);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.numCellsX,
      this.numCellsY,
      gl.RED,
      gl.FLOAT,
      initialDudt
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.dudtFBO1 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dudtFBO1);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.dudtTexture1,
      0
    );

    this.dudtTexture2 = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.dudtTexture2);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, this.numCellsX, this.numCellsY);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.numCellsX,
      this.numCellsY,
      gl.RED,
      gl.FLOAT,
      initialDudt
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.dudtFBO2 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dudtFBO2);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.dudtTexture2,
      0
    );

    this.updateDudtShader = new Shader(
      gl,
      fullscreenVertexShader,
      updateDudtFragmentShader
    );
    this.updateUShader = new Shader(
      gl,
      fullscreenVertexShader,
      updateUFragmentShader
    );
    this.addGaussianShader = new Shader(
      gl,
      fullscreenVertexShader,
      addGaussianFragmentShader
    );
    this.renderShader = new Shader(
      gl,
      fullscreenVertexShader,
      drawFragmentShader
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  step(dt: number, mouseX: number, mouseY: number, clicking: boolean) {
    this.gl.bindVertexArray(this.computeVAO);
    this.gl.viewport(0, 0, this.numCellsX, this.numCellsY);

    if (clicking && !this.prevClicking) {
      this.gl.bindFramebuffer(
        this.gl.FRAMEBUFFER,
        this.currentUTexture === 0 ? this.uFBO2 : this.uFBO1
      );
      this.addGaussianShader.use();
      this.addGaussianShader.setVec2(
        'numCells',
        this.numCellsX,
        this.numCellsY
      );
      this.addGaussianShader.setVec2(
        'pulseCenter',
        (mouseX / this.gl.canvas.width) * this.numCellsX,
        (mouseY / this.gl.canvas.height) * this.numCellsY
      );
      this.addGaussianShader.setInt('u', this.currentUTexture);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
      this.gl.finish();

      this.currentUTexture = this.currentUTexture === 0 ? 1 : 0;
    }

    for (let i = 0; i < this.substepsPerFrame; i++) {
      this.substep(dt, mouseX, mouseY, clicking);
    }

    this.prevClicking = clicking;
  }

  substep(dt: number, mouseX: number, mouseY: number, clicking: boolean) {
    this.gl.bindFramebuffer(
      this.gl.FRAMEBUFFER,
      this.currentUTexture === 0 ? this.dudtFBO2 : this.dudtFBO1
    );
    this.updateDudtShader.use();
    this.updateDudtShader.setIVec2('numCells', this.numCellsX, this.numCellsY);
    this.updateDudtShader.setFloat('dt', dt);
    this.updateDudtShader.setFloat('c', 10);
    this.updateDudtShader.setInt('u', this.currentUTexture);
    this.updateDudtShader.setInt('dudt', this.currentUTexture + 2);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.finish();

    this.gl.bindFramebuffer(
      this.gl.FRAMEBUFFER,
      this.currentUTexture === 0 ? this.uFBO2 : this.uFBO1
    );
    this.updateUShader.use();
    this.updateUShader.setIVec2('numCells', this.numCellsX, this.numCellsY);
    this.updateUShader.setFloat('dt', dt);
    this.updateUShader.setInt('u', this.currentUTexture);
    this.updateUShader.setInt('dudt', 1 - this.currentUTexture + 2);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.finish();

    this.currentUTexture = this.currentUTexture === 0 ? 1 : 0;
  }

  render() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.bindVertexArray(this.renderVAO);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.renderShader.use();
    this.renderShader.setInt('u', this.currentUTexture);
    this.renderShader.setVec2('numCells', this.numCellsX, this.numCellsY);
    this.renderShader.setVec2(
      'screenSize',
      this.gl.canvas.width,
      this.gl.canvas.height
    );
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
}

export default Space;
