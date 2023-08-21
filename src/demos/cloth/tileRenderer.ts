import Shader from './shader';
import { mat4, vec3 } from 'gl-matrix';

const MAX_TEXTURE_WIDTH = 4096;

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

  uniform sampler2D shadowMap;

  uniform mat4 shadowProjection;
  uniform mat4 shadowView;

  uniform vec3 lightDir;
  uniform vec3 normal;
  uniform int swapColors;

  out vec4 FragColor;

  vec3 lightColor = vec3(1.0, 1.0, 1.0);

  bool getInShadow(vec4 projected) {
    vec3 ndc = projected.xyz / projected.w;
    ndc = ndc * .5 + .5;

    float closestDepth = texture(shadowMap, ndc.xy).r;
    float currentDepth = ndc.z;

    float bias = .001;
    return currentDepth - bias > closestDepth;
  }

  void main() {
    vec3 objectColor;
    if ((oddEven + swapColors) % 2 == 0) {
      objectColor = vec3(0.5, 0.5, 0.5);
    }
    else {
      objectColor = vec3(0.8, 0.8, 0.8);
    }

    vec4 projected = shadowProjection * shadowView * vec4(fragPos, 1.0);
    bool isInShadow = getInShadow(projected);

    float ambientStrength = 0.1;
    vec3 ambient = ambientStrength * lightColor;

    vec3 normalizedLightDir = normalize(-lightDir);
    vec3 diffuse = max(dot(normal, normalizedLightDir), 0.0) * lightColor;

    vec3 color;
    if (isInShadow) {
      color = ambient * objectColor;
    }
    else {
      color = (ambient + diffuse) * objectColor;
    }

    FragColor = vec4(color, 1.0);
  }
`;

const depthVertexShader = `#version 300 es

  in vec3 position;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  uniform int numTilesX;

  void main() {
    int tileZ = gl_InstanceID / numTilesX;

    vec3 offset = vec3(gl_InstanceID % numTilesX, 0, tileZ);
    gl_Position = projection * view * model * vec4(position + offset, 1.0);
  }
`;

const depthFragmentShader = `#version 300 es

  precision highp float;

  void main() {}
`;

class TileRenderer {
  gl: WebGL2RenderingContext;
  tileVAO: WebGLVertexArrayObject;
  tileVertexBuffer: WebGLBuffer;
  tileVertices: number[];
  tileShader: Shader;
  depthShader: Shader;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.tileVertices),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.tileShader = new Shader(gl, tileVertexShader, tileFragmentShader);
    this.depthShader = new Shader(gl, depthVertexShader, depthFragmentShader);
  }

  render(
    projection: mat4,
    view: mat4,
    model: mat4,
    shadowProjection: mat4,
    shadowView: mat4,
    lightDir: vec3,
    numTilesX: number,
    numTilesZ: number,
    swapColors: boolean = false
  ) {
    this.gl.bindVertexArray(this.tileVAO);
    this.tileShader.use();

    this.tileShader.setMat4('projection', projection);
    this.tileShader.setMat4('view', view);
    this.tileShader.setMat4('model', model);
    this.tileShader.setMat4('shadowProjection', shadowProjection);
    this.tileShader.setMat4('shadowView', shadowView);
    this.tileShader.setVec3('normal', 0, 1, 0);
    this.tileShader.setVec3('lightDir', lightDir[0], lightDir[1], lightDir[2]);
    this.tileShader.setInt('numTilesX', numTilesX);
    this.tileShader.setInt('swapColors', swapColors ? 1 : 0);
    this.tileShader.setInt('shadowMap', 9);

    this.gl.drawArraysInstanced(
      this.gl.TRIANGLES,
      0,
      this.tileVertices.length / 3,
      numTilesX * numTilesZ
    );
  }

  renderDepth(
    projection: mat4,
    view: mat4,
    model: mat4,
    numTilesX: number,
    numTilesZ: number
  ) {
    this.gl.bindVertexArray(this.tileVAO);
    this.depthShader.use();

    this.depthShader.setMat4('projection', projection);
    this.depthShader.setMat4('view', view);
    this.depthShader.setMat4('model', model);
    this.depthShader.setVec3('normal', 0, 1, 0);
    this.depthShader.setInt('numTilesX', numTilesX);

    this.gl.drawArraysInstanced(
      this.gl.TRIANGLES,
      0,
      this.tileVertices.length / 3,
      numTilesX * numTilesZ
    );
  }
}

export default TileRenderer;
