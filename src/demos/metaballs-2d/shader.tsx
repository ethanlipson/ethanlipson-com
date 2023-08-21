export default class Shader {
  program: WebGLProgram;

  constructor(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ) {
    this.program = this.createProgram(
      gl,
      this.createShader(gl, gl.VERTEX_SHADER, vertexSource),
      this.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
    );
  }

  createShader(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      console.log(gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  createProgram(
    gl: WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ) {
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      console.log(gl.getProgramInfoLog(program));
    }

    return program;
  }

  use(gl: WebGL2RenderingContext) {
    gl.useProgram(this.program);
  }

  getAttribLocation(gl: WebGL2RenderingContext, name: string) {
    return gl.getAttribLocation(this.program, name);
  }
}
