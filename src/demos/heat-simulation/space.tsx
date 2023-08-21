import Shader from './shader';

const screenTextureVertexSource = `#version 300 es

  out vec2 uv;
  
  void main() {
    switch (gl_VertexID) {
    case 0:
      gl_Position = vec4(-1, -1, 0, 1);
      uv = vec2(0, 0);
      return;
    case 1:
      gl_Position = vec4(-1, 1, 0, 1);
      uv = vec2(0, 1);
      return;
    case 2:
      gl_Position = vec4(1, 1, 0, 1);
      uv = vec2(1, 1);
      return;
    case 3:
      gl_Position = vec4(-1, -1, 0, 1);
      uv = vec2(0, 0);
      return;
    case 4:
      gl_Position = vec4(1, -1, 0, 1);
      uv = vec2(1, 0);
      return;
    case 5:
      gl_Position = vec4(1, 1, 0, 1);
      uv = vec2(1, 1);
      return;
    }
  }
`;

const screenTextureFragmentSource = `#version 300 es

  precision mediump float;

  uniform sampler2D uTexture;

  in vec2 uv;

  out vec4 FragColor;

  void main() {
    FragColor = vec4(texture(uTexture, uv).rrr, 1);
  }
`;

const temperatureVertexSource = `#version 300 es

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

const temperatureFragmentSource = `#version 300 es

  precision mediump float;

  uniform sampler2D uTexture;
  uniform int screenWidth;
  uniform int screenHeight;

  uniform int numAddHeatEvents;
  uniform AddHeatEvents {
    int eventx[5];
    int eventy[5];
    int eventr[5];
  };
  
  out vec4 FragColor;

  void main() {
    int x = int(gl_FragCoord.x);
    int y = int(gl_FragCoord.y);

    for (int event = 0; event < numAddHeatEvents; event++) {
      if (x < eventx[event] - eventr[event] || x > eventx[event] + eventr[event] ||
          y < eventy[event] - eventr[event] || y > eventy[event] + eventr[event]) {
        continue;
      }

      int distance2 = (x - eventx[event]) * (x - eventx[event]) + (y - eventy[event]) * (y - eventy[event]);
      if (distance2 <= eventr[event] * eventr[event]) {
        FragColor = vec4(1, 0, 0, 1);
        return;
      }
    }

    float currentValue = texelFetch(uTexture, ivec2(x, y), 0).r;
    float sum = 0.0;

    if (x > 0) {
      sum += texelFetch(uTexture, ivec2(x - 1, y), 0).r - currentValue;
    }
    if (x < screenWidth - 1) {
      sum += texelFetch(uTexture, ivec2(x + 1, y), 0).r - currentValue;
    }
    if (y > 0) {
      sum += texelFetch(uTexture, ivec2(x, y - 1), 0).r - currentValue;
    }
    if (y < screenHeight - 1) {
      sum += texelFetch(uTexture, ivec2(x, y + 1), 0).r - currentValue;
    }

    FragColor = vec4(currentValue + 0.2 * sum, 0, 0, 1);
  }
`;

export default class Space {
  screenWidth: number;
  screenHeight: number;
  simulationWidth: number;
  simulationHeight: number;

  screenTextureVAO: WebGLVertexArrayObject;
  screenTextureShader: Shader;
  currentScreenTexture: WebGLTexture;
  nextScreenTexture: WebGLTexture;
  nextScreenTextureFBO: WebGLFramebuffer;

  temperatureVAO: WebGLVertexArrayObject;
  temperatureShader: Shader;
  temperatureUBO: WebGLBuffer;
  UBOVariableOffsets: { x: number; y: number; r: number };

  addHeatEvents: { x: number; y: number; r: number }[] = [];

  constructor(
    gl: WebGL2RenderingContext,
    screenWidth: number,
    screenHeight: number,
    simulationWidth: number,
    simulationHeight: number
  ) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.simulationWidth = simulationWidth;
    this.simulationHeight = simulationHeight;

    gl.getExtension('EXT_color_buffer_float');

    /********************* Current screen texture **********************/
    this.screenTextureVAO = gl.createVertexArray()!;

    this.screenTextureShader = new Shader(
      gl,
      screenTextureVertexSource,
      screenTextureFragmentSource
    );

    const data = new Float32Array(simulationWidth * simulationHeight);

    // for (let x = 0; x < simulationWidth; x++) {
    //   for (let y = 0; y < simulationHeight; y++) {
    //     if (
    //       Math.pow(x - simulationWidth / 2, 2) +
    //         Math.pow(y - simulationHeight / 2, 2) <=
    //       50 * 50
    //     ) {
    //       data[x + y * simulationWidth] = 1;
    //     }
    //   }
    // }

    this.currentScreenTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.currentScreenTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      simulationWidth,
      simulationHeight,
      0,
      gl.RED,
      gl.FLOAT,
      data
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /********************* Next screen texture **********************/
    this.nextScreenTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.nextScreenTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      simulationWidth,
      simulationHeight,
      0,
      gl.RED,
      gl.FLOAT,
      null
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.nextScreenTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.nextScreenTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.nextScreenTexture,
      0
    );

    /********************* Temperature compute shader **********************/
    this.temperatureVAO = gl.createVertexArray()!;

    this.temperatureShader = new Shader(
      gl,
      temperatureVertexSource,
      temperatureFragmentSource
    );

    // Events uniform buffer
    const blockIndex = gl.getUniformBlockIndex(
      this.temperatureShader.program,
      'AddHeatEvents'
    );
    const blockSize = gl.getActiveUniformBlockParameter(
      this.temperatureShader.program,
      blockIndex,
      gl.UNIFORM_BLOCK_DATA_SIZE
    );

    this.temperatureUBO = gl.createBuffer()!;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.temperatureUBO);
    gl.bufferData(gl.UNIFORM_BUFFER, blockSize, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.temperatureUBO);

    const uboVariableIndices = Array.from(
      gl.getUniformIndices(this.temperatureShader.program, [
        'eventx',
        'eventy',
        'eventr',
      ])!
    );

    const uboVariableOffsets: number[] = Array.from(
      gl.getActiveUniforms(
        this.temperatureShader.program,
        uboVariableIndices,
        gl.UNIFORM_OFFSET
      )!
    );

    this.UBOVariableOffsets = {
      x: uboVariableOffsets[0],
      y: uboVariableOffsets[1],
      r: uboVariableOffsets[2],
    };

    const index = gl.getUniformBlockIndex(
      this.temperatureShader.program,
      'AddHeatEvents'
    );
    gl.uniformBlockBinding(this.temperatureShader.program, index, 0);
  }

  addHeat(x: number, y: number, r: number) {
    this.addHeatEvents.push({ x, y, r });
  }

  step(gl: WebGL2RenderingContext) {
    /********************* Use current texture to write to next texture **********************/
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.currentScreenTexture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.nextScreenTextureFBO);
    gl.bindVertexArray(this.temperatureVAO);
    this.temperatureShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.temperatureShader.program, 'uTexture'),
      0
    );
    gl.uniform1i(
      gl.getUniformLocation(this.temperatureShader.program, 'screenWidth'),
      this.simulationWidth
    );
    gl.uniform1i(
      gl.getUniformLocation(this.temperatureShader.program, 'screenHeight'),
      this.simulationHeight
    );
    gl.uniform1i(
      gl.getUniformLocation(this.temperatureShader.program, 'numAddHeatEvents'),
      this.addHeatEvents.length
    );

    const xData = new Int32Array(20);
    const yData = new Int32Array(20);
    const rData = new Int32Array(20);

    for (let i = 0; i < Math.min(5, this.addHeatEvents.length); i++) {
      xData[4 * i] = this.addHeatEvents[i].x;
      yData[4 * i] = this.addHeatEvents[i].y;
      rData[4 * i] = this.addHeatEvents[i].r;
    }

    this.addHeatEvents = [];

    gl.bindBuffer(gl.UNIFORM_BUFFER, this.temperatureUBO);
    gl.bufferSubData(gl.UNIFORM_BUFFER, this.UBOVariableOffsets.x, xData, 0);
    gl.bufferSubData(gl.UNIFORM_BUFFER, this.UBOVariableOffsets.y, yData, 0);
    gl.bufferSubData(gl.UNIFORM_BUFFER, this.UBOVariableOffsets.r, rData, 0);
    gl.viewport(0, 0, this.simulationWidth, this.simulationHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    /********************* Swap current and next textures **********************/
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      0,
      0,
      this.simulationWidth,
      this.simulationHeight,
      0
    );

    // gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.nextScreenTextureFBO);
    // gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.currentScreenTextureFBO);
    // gl.blitFramebuffer(
    //   0,
    //   0,
    //   this.screenWidth,
    //   this.screenHeight,
    //   0,
    //   0,
    //   this.screenWidth,
    //   this.screenHeight,
    //   gl.COLOR_BUFFER_BIT,
    //   gl.NEAREST
    // );
  }

  draw(gl: WebGL2RenderingContext) {
    /********************* Draw current texture to screen **********************/
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(this.screenTextureVAO);
    this.screenTextureShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.screenTextureShader.program, 'uTexture'),
      1
    );

    gl.viewport(0, 0, this.screenWidth, this.screenHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
