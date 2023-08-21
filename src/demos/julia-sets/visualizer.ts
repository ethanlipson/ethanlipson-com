import Shader from './shader';

const fullscreenVertexShader = `#version 300 es

  out vec2 norm;

  void main() {
    switch (gl_VertexID) {
    case 0:
      norm = vec2(0, 0);
      gl_Position = vec4(-1, -1, 0, 1);
      return;
    case 1:
      norm = vec2(0, 1);
      gl_Position = vec4(-1, 1, 0, 1);
      return;
    case 2:
      norm = vec2(1, 1);
      gl_Position = vec4(1, 1, 0, 1);
      return;
    case 3:
      norm = vec2(0, 0);
      gl_Position = vec4(-1, -1, 0, 1);
      return;
    case 4:
      norm = vec2(1, 0);
      gl_Position = vec4(1, -1, 0, 1);
      return;
    case 5:
      norm = vec2(1, 1);
      gl_Position = vec4(1, 1, 0, 1);
      return;
    }
  }
`;

const juliaFragmentShader = `#version 300 es

  precision highp float;

  in vec2 norm;

  uniform vec2 bottomLeft;
  uniform vec2 topRight;
  uniform int maxIterations;
  uniform float escapeRadius;
  uniform vec2 c;

  out vec4 FragColor;

  vec3 palette[16] = vec3[](
    vec3( 66,  30,  15),
    vec3( 25,   7,  26),
    vec3(  9,   1,  47),
    vec3(  4,   4,  73),
    vec3(  0,   7, 100),
    vec3( 12,  44, 138),
    vec3( 24,  82, 177),
    vec3( 57, 125, 209),
    vec3(134, 181, 229),
    vec3(211, 236, 248),
    vec3(241, 233, 191),
    vec3(248, 201,  95),
    vec3(255, 170,   0),
    vec3(204, 128,   0),
    vec3(153,  87,   0),
    vec3(106,  52,   3)
  );

  void main() {
    vec2 z = norm * (topRight - bottomLeft) + bottomLeft;
    
    int iter = 0;
    while (iter < maxIterations && dot(z, z) < escapeRadius * escapeRadius) {
      z = vec2(
        z.x * z.x - z.y * z.y + c.x,
        2.0 * z.x * z.y + c.y
      );

      iter++;
    }

    // float shade = 1.0 - pow(1.0 - float(iter) / float(maxIterations), 50.0);
    // FragColor = vec4(vec3(shade), 1.0);

    if (iter == 0 || iter == maxIterations) FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    else FragColor = vec4(palette[iter % 16] / 255.0, 1.0);
  }

`;

class Visualizer {
  gl: WebGL2RenderingContext;
  shader: Shader;
  bottomLeft: [number, number] = [-2, -2];
  topRight: [number, number] = [2, 2];
  maxIterations: number = 1000;
  escapeRadius: number = 2;
  c: [number, number] = [0, 0];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    this.shader = new Shader(gl, fullscreenVertexShader, juliaFragmentShader);
  }

  compute() {
    this.shader.use(this.gl);
    this.gl.uniform2fv(
      this.gl.getUniformLocation(this.shader.program, 'bottomLeft'),
      this.bottomLeft
    );
    this.gl.uniform2fv(
      this.gl.getUniformLocation(this.shader.program, 'topRight'),
      this.topRight
    );
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.shader.program, 'maxIterations'),
      this.maxIterations
    );
    this.gl.uniform1f(
      this.gl.getUniformLocation(this.shader.program, 'escapeRadius'),
      this.escapeRadius
    );
    this.gl.uniform2fv(this.gl.getUniformLocation(this.shader.program, 'c'), this.c);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
}

export default Visualizer;
