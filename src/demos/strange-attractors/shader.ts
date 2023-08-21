import { mat2, mat3, mat4 } from 'gl-matrix';

export default class Shader {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;

  constructor(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ) {
    this.gl = gl;
    this.program = this.createProgram(
      this.createShader(gl.VERTEX_SHADER, vertexSource),
      this.createShader(gl.FRAGMENT_SHADER, fragmentSource)
    );
  }

  createShader(type: number, source: string) {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    const success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
    if (!success) {
      console.log(this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    var success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
    if (!success) {
      console.log(this.gl.getProgramInfoLog(program));
    }

    return program;
  }

  use() {
    this.gl.useProgram(this.program);
  }

  getUniformLocation(name: string) {
    return this.gl.getUniformLocation(this.program, name);
  }

  setFloat(name: string, x: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform1f(loc, x);
  }

  setInt(name: string, x: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform1i(loc, x);
  }

  setUInt(name: string, x: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform1ui(loc, x);
  }

  setVec2(name: string, x: number, y: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform2f(loc, x, y);
  }

  setIVec2(name: string, x: number, y: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform2i(loc, x, y);
  }

  setUIVec2(name: string, x: number, y: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform2ui(loc, x, y);
  }

  setVec3(name: string, x: number, y: number, z: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform3f(loc, x, y, z);
  }

  setIVec3(name: string, x: number, y: number, z: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform3i(loc, x, y, z);
  }

  setUIVec3(name: string, x: number, y: number, z: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform3ui(loc, x, y, z);
  }

  setVec4(name: string, x: number, y: number, z: number, w: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform4f(loc, x, y, z, w);
  }

  setIVec4(name: string, x: number, y: number, z: number, w: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform4i(loc, x, y, z, w);
  }

  setUIVec4(name: string, x: number, y: number, z: number, w: number) {
    const loc = this.getUniformLocation(name);
    this.gl.uniform4ui(loc, x, y, z, w);
  }

  setMat2(name: string, mat: mat2) {
    const loc = this.getUniformLocation(name);
    this.gl.uniformMatrix2fv(loc, false, mat);
  }

  setMat3(name: string, mat: mat3) {
    const loc = this.getUniformLocation(name);
    this.gl.uniformMatrix3fv(loc, false, mat);
  }

  setMat4(name: string, mat: mat4) {
    const loc = this.getUniformLocation(name);
    this.gl.uniformMatrix4fv(loc, false, mat);
  }
}
