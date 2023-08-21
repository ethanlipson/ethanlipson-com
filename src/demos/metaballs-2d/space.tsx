import Shader from './shader';

const vertexSource = `#version 300 es

  uniform int gridWidth;
  uniform int gridHeight;

  uniform sampler2D uTexture;
  uniform float isoLevel;

  out float render;

  int marchingSquaresTable[64] = int[64](
    -1, -1, -1, -1,
     0,  1, -1, -1,
     0,  3, -1, -1,
     1,  3, -1, -1,
     2,  3, -1, -1,
     0,  3,  1,  2,
     0,  2, -1, -1,
     1,  2, -1, -1,
     1,  2, -1, -1,
     0,  2, -1, -1,
     0,  1,  2,  3,
     2,  3, -1, -1,
     1,  3, -1, -1,
     0,  3, -1, -1,
     0,  1, -1, -1,
    -1, -1, -1, -1
  );

  int edgeCornersA[4] = int[4](
    0, 3, 2, 1
  );

  int edgeCornersB[4] = int[4](
    1, 0, 3, 2
  );
  
  vec2 toNDC(int x, int y, int gridWidth, int gridHeight) {
    return vec2(
      2.0 * (float(x) / float(gridWidth - 1)) - 1.0,
      2.0 * (float(y) / float(gridHeight - 1)) - 1.0
    );
  }

  vec2 vertexInterp(vec3 v1, vec3 v2) {
    float t = (isoLevel - v1.z) / (v2.z - v1.z);
    return v1.xy + t * (v2.xy-v1.xy);
  }

  void main() {
    int id = gl_VertexID / 4;
    int edgeId = (gl_VertexID % 4) / 2;
    int cornerId = gl_VertexID % 2;

    int gridx = id / (gridHeight - 1);
    int gridy = id % (gridHeight - 1);

    vec3 corners[4] = vec3[4](
      vec3(toNDC(gridx + 0, gridy + 0, gridWidth, gridHeight), texelFetch(uTexture, ivec2(gridx + 0, gridy + 0), 0).r),
      vec3(toNDC(gridx + 1, gridy + 0, gridWidth, gridHeight), texelFetch(uTexture, ivec2(gridx + 1, gridy + 0), 0).r),
      vec3(toNDC(gridx + 1, gridy + 1, gridWidth, gridHeight), texelFetch(uTexture, ivec2(gridx + 1, gridy + 1), 0).r),
      vec3(toNDC(gridx + 0, gridy + 1, gridWidth, gridHeight), texelFetch(uTexture, ivec2(gridx + 0, gridy + 1), 0).r)
    );

    int squareIndex = 0;
    if (corners[0].z > isoLevel) squareIndex += 1;
    if (corners[1].z > isoLevel) squareIndex += 2;
    if (corners[2].z > isoLevel) squareIndex += 4;
    if (corners[3].z > isoLevel) squareIndex += 8;

    int edgeIndex = marchingSquaresTable[4 * squareIndex + 2 * edgeId + cornerId];
    if (edgeIndex == -1) {
      render = 0.0;
      return;
    }
    else {
      render = 1.0;
    }

    vec2 interpolated = vertexInterp(corners[edgeCornersA[edgeIndex]], corners[edgeCornersB[edgeIndex]]);
    gl_Position = vec4(interpolated, 0.0, 1.0);
  }
`;

const fragmentSource = `#version 300 es

  precision highp float;

  in float render;

  out vec4 FragColor;

  void main() {
    if (render == 0.0) {
      discard;
    }

    FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
`;

export default class Space {
  screenWidth: number;
  screenHeight: number;
  gridWidth: number;
  gridHeight: number;
  isoLevel: number;

  VAO: WebGLVertexArrayObject;
  texture: WebGLTexture;
  data: Float32Array;
  shader: Shader;

  metaballs: {
    x: number;
    y: number;
    xvel: number;
    yvel: number;
    radius: number;
  }[];

  clicking: boolean;
  clickX: number;
  clickY: number;
  draggedMetaballIndex: number;

  constructor(
    gl: WebGL2RenderingContext,
    screenWidth: number,
    screenHeight: number,
    gridSpacing: number
  ) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.VAO = gl.createVertexArray()!;
    this.shader = new Shader(gl, vertexSource, fragmentSource);

    this.metaballs = [];

    this.clicking = false;
    this.clickX = 0;
    this.clickY = 0;
    this.draggedMetaballIndex = -1;

    this.gridWidth = Math.floor(this.screenWidth / gridSpacing) + 1;
    this.gridHeight = Math.floor(this.screenHeight / gridSpacing) + 1;

    this.isoLevel = 1;

    this.data = new Float32Array(this.gridWidth * this.gridHeight);

    this.texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      this.gridWidth,
      this.gridHeight,
      0,
      gl.RED,
      gl.FLOAT,
      this.data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  onClick(x: number, y: number) {
    const clickRadius = 200;

    this.clicking = true;
    this.clickX = x;
    this.clickY = y;

    let metaballsWithDistances = this.metaballs.map((metaball, index) => {
      const distance = Math.sqrt(
        Math.pow(metaball.x - x, 2) + Math.pow(metaball.y - y, 2)
      );

      return {
        metaball: metaball,
        distance: distance,
        index: index,
      };
    });

    metaballsWithDistances.sort((a, b) => a.distance - b.distance);

    if (metaballsWithDistances[0].distance < clickRadius) {
      this.draggedMetaballIndex = metaballsWithDistances[0].index;
    }
  }

  onMove(x: number, y: number) {
    this.clickX = x;
    this.clickY = y;
  }

  onRelease() {
    this.clicking = false;
    this.draggedMetaballIndex = -1;
  }

  addMetaball(
    x: number,
    y: number,
    xvel: number,
    yvel: number,
    radius: number
  ) {
    this.metaballs.push({
      x,
      y,
      xvel,
      yvel,
      radius,
    });
  }

  step() {
    for (let i = 0; i < this.metaballs.length; i++) {
      const ball = this.metaballs[i];

      if (this.draggedMetaballIndex === i) {
        const newX = 0.1 * this.clickX + 0.9 * ball.x;
        const newY = 0.1 * this.clickY + 0.9 * ball.y;

        ball.xvel = newX - ball.x;
        ball.yvel = newY - ball.y;

        ball.x = newX;
        ball.y = newY;
      } else {
        ball.x += ball.xvel;
        ball.y += ball.yvel;
      }

      if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.xvel = -ball.xvel;
      }
      if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.yvel = -ball.yvel;
      }
      if (ball.x > this.screenWidth - ball.radius) {
        ball.x = this.screenWidth - ball.radius;
        ball.xvel = -ball.xvel;
      }
      if (ball.y > this.screenHeight - ball.radius) {
        ball.y = this.screenHeight - ball.radius;
        ball.yvel = -ball.yvel;
      }
    }
  }

  draw(gl: WebGL2RenderingContext, gridSpacing: number, radius: number) {
    // Write metaball data to texture
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const xpos = x * gridSpacing;
        const ypos = y * gridSpacing;
        let sum = 0;

        for (let i = 0; i < this.metaballs.length; i++) {
          const dist = Math.sqrt(
            Math.pow(xpos - this.metaballs[i].x, 2) +
              Math.pow(ypos - this.metaballs[i].y, 2)
          );

          // sum += this.metaballs[i].radius / dist;

          const r = this.metaballs[i].radius;
          const l = 3 * r;

          if (dist < l) {
            sum += r / dist - (r * (dist - l)) / (l * (l - r)) - r / l;
          }
        }

        this.data[y * this.gridWidth + x] = sum;
      }
    }

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      this.gridWidth,
      this.gridHeight,
      0,
      gl.RED,
      gl.FLOAT,
      this.data
    );

    // Draw
    gl.bindVertexArray(this.VAO);
    this.shader.use(gl);

    gl.uniform1i(
      gl.getUniformLocation(this.shader.program, 'gridWidth'),
      this.gridWidth
    );
    gl.uniform1i(
      gl.getUniformLocation(this.shader.program, 'gridHeight'),
      this.gridHeight
    );
    gl.uniform1f(
      gl.getUniformLocation(this.shader.program, 'isoLevel'),
      this.isoLevel
    );

    gl.drawArrays(
      gl.LINES,
      0,
      4 * (this.gridWidth - 1) * (this.gridHeight - 1)
    );
  }
}
