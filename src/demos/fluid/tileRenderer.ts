import Shader from './shader';
import { mat4, vec3 } from 'gl-matrix';

const MAX_TEXTURE_WIDTH = 1024;

const SPHERE_ITERATIONS = 16;
const SPHERE_RADIUS = 0.08;

const tileVertexShader = `#version 300 es

in vec3 position;

uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

uniform int numTilesX;

out vec3 fragPos;
flat out int oddEven;

void main() {
  int tileZ = gl_InstanceID / numTilesX;
  oddEven = (gl_InstanceID + tileZ) % 2;

  vec3 offset = vec3(gl_InstanceID % numTilesX, 0, tileZ);
  gl_Position = projection * view * model * vec4(position + offset, 1.0);
  fragPos = vec3(model * vec4(position + offset, 1.0));
}
`;

const tileFragmentShader = `#version 300 es

precision highp float;

in vec3 fragPos;
flat in int oddEven;

uniform vec3 lightPos;
uniform vec3 normal;
uniform int swapColors;

out vec4 FragColor;

vec3 lightColor = vec3(1.0, 1.0, 1.0);

void main() {
  vec3 objectColor;
  if ((oddEven + swapColors) % 2 == 0) {
    objectColor = vec3(0.5, 0.5, 0.5);
  }
  else {
    objectColor = vec3(0.8, 0.8, 0.8);
  }

  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * lightColor;

  vec3 lightDir = normalize(lightPos - fragPos);
  vec3 diffuse = max(dot(normal, lightDir), 0.0) * lightColor;

  vec3 color = (ambient + diffuse) * objectColor;
  FragColor = vec4(color, 1.0);
}
`;

class TileRenderer {
  tileVAO: WebGLVertexArrayObject;
  tileVertexBuffer: WebGLBuffer;
  tileVertices: number[];
  tileShader: Shader;

  constructor(gl: WebGL2RenderingContext) {
    // prettier-ignore
    this.tileVertices = [
      0, 0, 0,
      1, 0, 0,
      1, 0, 1,
      0, 0, 0,
      0, 0, 1,
      1, 0, 1
    ];

    /***************** Creating the sphere vertex buffers *****************/

    this.tileVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.tileVAO);

    this.tileVertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tileVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.tileVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.tileShader = new Shader(gl, tileVertexShader, tileFragmentShader);
  }

  render(
    gl: WebGL2RenderingContext,
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3,
    numTilesX: number,
    numTilesZ: number,
    swapColors: boolean = false
  ) {
    gl.bindVertexArray(this.tileVAO);
    this.tileShader.use(gl);

    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.tileShader.program, 'projection'),
      false,
      projection
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.tileShader.program, 'view'),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.tileShader.program, 'model'),
      false,
      model
    );
    gl.uniform3f(gl.getUniformLocation(this.tileShader.program, 'normal'), 0, 1, 0);
    gl.uniform3fv(gl.getUniformLocation(this.tileShader.program, 'lightPos'), lightPos);
    gl.uniform1i(
      gl.getUniformLocation(this.tileShader.program, 'numTilesX'),
      numTilesX
    );
    gl.uniform1i(
      gl.getUniformLocation(this.tileShader.program, 'swapColors'),
      swapColors ? 1 : 0
    );

    gl.drawArraysInstanced(
      gl.TRIANGLES,
      0,
      this.tileVertices.length / 3,
      numTilesX * numTilesZ
    );
  }
}

export default TileRenderer;

// For safekeeping
// let edges = new Float32Array([
//   MIN_X, MIN_Y, MIN_Z,
//   MAX_X, MIN_Y, MIN_Z,
//   MIN_X, MAX_Y, MIN_Z,
//   MAX_X, MAX_Y, MIN_Z,
//   MIN_X, MIN_Y, MAX_Z,
//   MAX_X, MIN_Y, MAX_Z,
//   MIN_X, MAX_Y, MAX_Z,
//   MAX_X, MAX_Y, MAX_Z,

//   MIN_X, MIN_Y, MIN_Z,
//   MIN_X, MAX_Y, MIN_Z,
//   MAX_X, MIN_Y, MIN_Z,
//   MAX_X, MAX_Y, MIN_Z,
//   MIN_X, MIN_Y, MAX_Z,
//   MIN_X, MAX_Y, MAX_Z,
//   MAX_X, MIN_Y, MAX_Z,
//   MAX_X, MAX_Y, MAX_Z,

//   MIN_X, MIN_Y, MIN_Z,
//   MIN_X, MIN_Y, MAX_Z,
//   MAX_X, MIN_Y, MIN_Z,
//   MAX_X, MIN_Y, MAX_Z,
//   MIN_X, MAX_Y, MIN_Z,
//   MIN_X, MAX_Y, MAX_Z,
//   MAX_X, MAX_Y, MIN_Z,
//   MAX_X, MAX_Y, MAX_Z,
// ]);
