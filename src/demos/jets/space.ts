import Shader from './shader';

const fullscreenVertexShader = `#version 300 es

  out vec2 norm;

  void main() {
    switch (gl_VertexID) {
    case 0:
      gl_Position = vec4(-1, -1, 0, 1);
      norm = vec2(0., 0.);
      return;
    case 1:
      gl_Position = vec4(-1, 1, 0, 1);
      norm = vec2(0., 1.);
      return;
    case 2:
      gl_Position = vec4(1, 1, 0, 1);
      norm = vec2(1., 1.);
      return;
    case 3:
      gl_Position = vec4(-1, -1, 0, 1);
      norm = vec2(0., 0.);
      return;
    case 4:
      gl_Position = vec4(1, -1, 0, 1);
      norm = vec2(1., 0.);
      return;
    case 5:
      gl_Position = vec4(1, 1, 0, 1);
      norm = vec2(1., 1.);
      return;
    }
  }
`;

const resetVelocityFieldFragmentShader = `#version 300 es

  precision highp float;

  in vec2 norm;

  uniform vec2 numCells;
  uniform float jetSpeed;

  out vec4 velocity;

  void main() {
    vec2 rounded = vec2(ivec2(gl_FragCoord.xy));
    velocity = vec4(0., 0., 0., 1.);

    if (rounded.y < .495 * numCells.y || rounded.y > .505 * numCells.y) discard;

    if (rounded.x < .1 * numCells.x) velocity = vec4(jetSpeed, 0., 0., 1.);
    else if (rounded.x > .9 * numCells.x) velocity = vec4(-jetSpeed, 0., 0., 1.);
    else discard;
  }
`;

const resetTracerImageFragmentShader = `#version 300 es

  precision highp float;

  in vec2 norm;

  uniform vec2 screenSize;

  out vec4 color;

  void main() {
    vec2 rounded = vec2(ivec2(gl_FragCoord.xy));

    if (rounded.y < .495 * screenSize.y || rounded.y > .505 * screenSize.y) discard;

    if (rounded.x < .1 * screenSize.x) color = vec4(0., .25, 0., 1.);
    else if (rounded.x > .9 * screenSize.x) color = vec4(.1, .1, .4, 1.);
    else discard;
  }
`;

const advectVelocitiesFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D velocityField;

  in vec2 norm;

  uniform vec2 screenSize;
  uniform vec2 cellSize;
  uniform ivec2 numCells;
  uniform float dt;

  out vec4 velocityCopy;

  vec2 getInterpolatedVelocity(vec2 pos) {
    ivec2 lowerCell = ivec2((pos + cellSize / 2.) / cellSize);
    vec2 d = (pos - (vec2(lowerCell) * cellSize - cellSize / 2.)) / cellSize;

    vec2 c00 = texelFetch(velocityField, lowerCell + ivec2(0, 0), 0).xy;
    vec2 c01 = texelFetch(velocityField, lowerCell + ivec2(0, 1), 0).xy;
    vec2 c10 = texelFetch(velocityField, lowerCell + ivec2(1, 0), 0).xy;
    vec2 c11 = texelFetch(velocityField, lowerCell + ivec2(1, 1), 0).xy;

    vec2 c0 = c00 * (1. - d.x) + c01 * d.x;
    vec2 c1 = c10 * (1. - d.x) + c11 * d.x;

    vec2 c = c0 * (1. - d.y) + c1 * d.y;
    return c;
  }

  void main() {
    ivec2 rounded = ivec2(gl_FragCoord.xy);
    if (rounded.x == 0 || rounded.x == numCells.x + 1 || rounded.y == 0 || rounded.y == numCells.y + 1) {
      velocityCopy = vec4(0., 0., 0., 1.);
      return;
    }

    vec2 position = vec2(rounded) * cellSize - cellSize / 2.;
    vec2 velocity = texelFetch(velocityField, rounded, 0).xy;

    vec2 backwards = position - velocity * dt;
    vec2 newVelocity = getInterpolatedVelocity(backwards);
    velocityCopy = vec4(newVelocity, 0., 1.);
  }
`;

const solveDivergenceFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D velocityField;

  in vec2 norm;

  uniform ivec2 numCells;

  out vec4 updatedVelocity;

  void main() {
    ivec2 rounded = ivec2(gl_FragCoord.xy);
    if (rounded.x == 0 || rounded.x == numCells.x + 1 || rounded.y == 0 || rounded.y == numCells.y + 1) {
      updatedVelocity = vec4(0., 0., 0., 1.);
      return;
    }

    vec2 v00 = texelFetch(velocityField, rounded + ivec2(-1, -1), 0).xy;
    vec2 v01 = texelFetch(velocityField, rounded + ivec2(-1, 0), 0).xy;
    vec2 v02 = texelFetch(velocityField, rounded + ivec2(-1, 1), 0).xy;
    vec2 v10 = texelFetch(velocityField, rounded + ivec2(0, -1), 0).xy;
    vec2 v11 = texelFetch(velocityField, rounded + ivec2(0, 0), 0).xy;
    vec2 v12 = texelFetch(velocityField, rounded + ivec2(0, 1), 0).xy;
    vec2 v20 = texelFetch(velocityField, rounded + ivec2(1, -1), 0).xy;
    vec2 v21 = texelFetch(velocityField, rounded + ivec2(1, 0), 0).xy;
    vec2 v22 = texelFetch(velocityField, rounded + ivec2(1, 1), 0).xy;
    
    vec2 delta = (
      dot(v00 + v22, vec2(1, 1)) +
      dot(v02 + v20, vec2(1, -1)) * vec2(1, -1) +
      (v01 + v21 - v10 - v12) * vec2(2, -2) +
      v11 * -4.
    ) / 8.;
    updatedVelocity = vec4(v11 + delta, 0., 1.);
  }
`;

const advectTracerImageFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D velocityField;
  uniform sampler2D tracerImage;

  in vec2 norm;

  uniform vec2 screenSize;
  uniform vec2 cellSize;
  uniform float dt;
  
  out vec4 tracerColorCopy;
  
  vec2 getInterpolatedVelocity(vec2 pos) {
    ivec2 lowerCell = ivec2((pos + cellSize / 2.) / cellSize);
    vec2 d = (pos - (vec2(lowerCell) * cellSize - cellSize / 2.)) / cellSize;

    vec2 c00 = texelFetch(velocityField, lowerCell + ivec2(0, 0), 0).xy;
    vec2 c01 = texelFetch(velocityField, lowerCell + ivec2(0, 1), 0).xy;
    vec2 c10 = texelFetch(velocityField, lowerCell + ivec2(1, 0), 0).xy;
    vec2 c11 = texelFetch(velocityField, lowerCell + ivec2(1, 1), 0).xy;

    vec2 c0 = c00 * (1. - d.x) + c01 * d.x;
    vec2 c1 = c10 * (1. - d.x) + c11 * d.x;

    vec2 c = c0 * (1. - d.y) + c1 * d.y;
    return c;
  }
  
  void main() {
    vec2 position = gl_FragCoord.xy;
    vec2 velocity = getInterpolatedVelocity(position);

    vec2 backwards = position - velocity * dt;
    vec3 color = texture(tracerImage, backwards / screenSize).xyz;
    tracerColorCopy = vec4(color, 1.);
  }
`;

const renderFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D tracerImage;

  in vec2 norm;

  out vec4 FragColor;
  
  void main() {
    vec3 color = texture(tracerImage, norm).xyz;
    FragColor = vec4(color, 1.);
  }
`;

class Space {
  gl: WebGL2RenderingContext;

  numCellsX: number;
  numCellsY: number;
  cellSizeX: number;
  cellSizeY: number;

  particleComputeVAO: WebGLVertexArrayObject;
  velocityFieldFBO: WebGLFramebuffer;
  velocityFieldCopyFBO: WebGLFramebuffer;
  tracerImageFBO: WebGLFramebuffer;
  tracerImageCopyFBO: WebGLFramebuffer;

  resetVelocityFieldShader: Shader;
  resetTracerImageShader: Shader;
  advectVelocitiesShader: Shader;
  solveDivergenceShader: Shader;
  advectTracerImageShader: Shader;

  renderShader: Shader;

  clicking: boolean = false;
  prevClicking: boolean = false;

  constructor(
    gl: WebGL2RenderingContext,
    numCellsX: number,
    numCellsY: number
  ) {
    this.gl = gl;

    this.numCellsX = numCellsX;
    this.numCellsY = numCellsY;
    this.cellSizeX = gl.canvas.width / numCellsX;
    this.cellSizeY = gl.canvas.height / numCellsY;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.getExtension('EXT_color_buffer_float');

    /**************** Initialize buffers ****************/

    const tracerImageInit = new Uint8Array(
      gl.canvas.width * gl.canvas.height * 4
    );
    for (let x = 0; x < gl.canvas.width; x++) {
      for (let y = 0; y < gl.canvas.height; y++) {
        const id = y * gl.canvas.width + x;
        let val = [255, 255, 255, 255];

        // if (
        //   y > gl.canvas.height * 0.4 &&
        //   y < gl.canvas.height * 0.6 &&
        //   x > gl.canvas.width * 0.3 &&
        //   x < gl.canvas.width * 0.4
        // ) {
        //   val = [0, 40, 0, 255];
        // }

        // if (
        //   y > gl.canvas.height * 0.4 &&
        //   y < gl.canvas.height * 0.6 &&
        //   x > gl.canvas.width * 0.6 &&
        //   x < gl.canvas.width * 0.7
        // ) {
        //   val = [0, 0, 40, 255];
        // }

        for (let i = 0; i < 4; i++) {
          tracerImageInit[4 * id + i] = val[i];
        }
      }
    }

    const velocityFieldInit = new Float32Array(
      (numCellsX + 2) * (numCellsY + 2) * 4
    );
    for (let x = 0; x < numCellsX + 2; x++) {
      for (let y = 0; y < numCellsY + 2; y++) {
        const id = y * (numCellsX + 2) + x;
        let val = [0, 0, 0, 0];

        for (let i = 0; i < 4; i++) {
          velocityFieldInit[4 * id + i] = val[i];
        }

        // const rx = x - (numCellsX + 2) / 2;
        // const ry = y - (numCellsY + 2) / 2;
        // const norm = Math.sqrt(rx * rx + ry * ry);

        // velocityFieldInit[4 * id + 0] = (-ry / norm) * 2000;
        // velocityFieldInit[4 * id + 1] = (rx / norm) * 2000;
        // velocityFieldInit[4 * id + 2] = 0;
        // velocityFieldInit[4 * id + 3] = 0;
      }
    }

    this.particleComputeVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.particleComputeVAO);

    const velocityField = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocityField);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      numCellsX + 2,
      numCellsY + 2,
      0,
      gl.RGBA,
      gl.FLOAT,
      velocityFieldInit
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.velocityFieldFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFieldFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      velocityField,
      0
    );

    const velocityFieldCopy = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocityFieldCopy);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      numCellsX + 2,
      numCellsY + 2,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.velocityFieldCopyFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFieldCopyFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      velocityFieldCopy,
      0
    );

    const tracerImage = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tracerImage);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      tracerImageInit
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.tracerImageFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tracerImageFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tracerImage,
      0
    );

    const tracerImageCopy = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, tracerImageCopy);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.tracerImageCopyFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tracerImageCopyFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tracerImageCopy,
      0
    );

    this.resetVelocityFieldShader = new Shader(
      gl,
      fullscreenVertexShader,
      resetVelocityFieldFragmentShader
    );
    this.resetTracerImageShader = new Shader(
      gl,
      fullscreenVertexShader,
      resetTracerImageFragmentShader
    );
    this.advectVelocitiesShader = new Shader(
      gl,
      fullscreenVertexShader,
      advectVelocitiesFragmentShader
    );
    this.advectTracerImageShader = new Shader(
      gl,
      fullscreenVertexShader,
      advectTracerImageFragmentShader
    );
    this.solveDivergenceShader = new Shader(
      gl,
      fullscreenVertexShader,
      solveDivergenceFragmentShader
    );
    this.renderShader = new Shader(
      gl,
      fullscreenVertexShader,
      renderFragmentShader
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  reset() {}

  handleClick(clicking: boolean, mouseX: number, mouseY: number) {
    if (clicking && !this.prevClicking) {
      this.clickStart(mouseX, mouseY);
    }

    if (!clicking && this.prevClicking) {
      this.clickEnd();
    }

    this.prevClicking = clicking;
  }

  clickStart(mouseX: number, mouseY: number) {}

  clickEnd() {}

  step(dt: number, divergenceIters: number) {
    const gl = this.gl;

    // Advect velocities

    gl.viewport(0, 0, this.numCellsX + 2, this.numCellsY + 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFieldCopyFBO);
    this.advectVelocitiesShader.use();
    this.advectVelocitiesShader.setVec2(
      'cellSize',
      this.cellSizeX,
      this.cellSizeY
    );
    this.advectVelocitiesShader.setVec2(
      'screenSize',
      gl.canvas.width,
      gl.canvas.height
    );
    this.advectVelocitiesShader.setIVec2(
      'numCells',
      this.numCellsX,
      this.numCellsY
    );
    this.advectVelocitiesShader.setInt('velocityField', 0);
    this.advectVelocitiesShader.setFloat('dt', dt);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE0);
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      0,
      0,
      this.numCellsX + 2,
      this.numCellsY + 2,
      0
    );

    let writeToCopyBuffer = false;
    for (let i = 0; i < divergenceIters; i++) {
      const targetFramebuffer = writeToCopyBuffer
        ? this.velocityFieldCopyFBO
        : this.velocityFieldFBO;
      const sourceVelocityField = writeToCopyBuffer ? 0 : 1;

      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
      this.solveDivergenceShader.use();
      this.solveDivergenceShader.setInt('velocityField', sourceVelocityField);
      this.solveDivergenceShader.setIVec2(
        'numCells',
        this.numCellsX,
        this.numCellsY
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      writeToCopyBuffer = !writeToCopyBuffer;
    }

    // Advect tracer image

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tracerImageCopyFBO);
    this.advectTracerImageShader.use();
    this.advectTracerImageShader.setVec2(
      'cellSize',
      this.cellSizeX,
      this.cellSizeY
    );
    this.advectTracerImageShader.setVec2(
      'screenSize',
      gl.canvas.width,
      gl.canvas.height
    );
    this.advectTracerImageShader.setInt('tracerImage', 2);
    this.advectTracerImageShader.setFloat('dt', dt);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE2);
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      0,
      0,
      gl.canvas.width,
      gl.canvas.height,
      0
    );

    // Reset velocity field and tracer image

    gl.viewport(0, 0, this.numCellsX + 2, this.numCellsY + 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFieldFBO);
    this.resetVelocityFieldShader.use();
    this.resetVelocityFieldShader.setVec2(
      'numCells',
      this.numCellsX + 2,
      this.numCellsY + 2
    );
    this.resetVelocityFieldShader.setFloat(
      'jetSpeed',
      gl.canvas.width * 2 * Math.exp(-gl.canvas.width / 2500)
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tracerImageFBO);
    this.resetTracerImageShader.use();
    this.resetTracerImageShader.setVec2(
      'screenSize',
      gl.canvas.width,
      gl.canvas.height
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  render() {
    const gl = this.gl;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.renderShader.use();
    this.renderShader.setInt('tracerImage', 2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

export default Space;
