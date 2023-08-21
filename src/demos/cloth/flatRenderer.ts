import { mat4, vec3 } from 'gl-matrix';
import Shader from './shader';

const MAX_TEXTURE_WIDTH = 4096;

const flatVertexShader = `#version 300 es

  precision highp sampler2D;

  uniform sampler2D particlePositions;
  uniform sampler2D constraints;
  
  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  void main() {
    int edgeId = gl_VertexID / 2;
    ivec2 edge = ivec2(texelFetch(constraints, ivec2(edgeId % ${MAX_TEXTURE_WIDTH}, edgeId / ${MAX_TEXTURE_WIDTH}), 0).xy);
    
    vec3 p1 = texelFetch(particlePositions, ivec2(edge.x % ${MAX_TEXTURE_WIDTH}, edge.x / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 p2 = texelFetch(particlePositions, ivec2(edge.y % ${MAX_TEXTURE_WIDTH}, edge.y / ${MAX_TEXTURE_WIDTH}), 0).xyz;

    int particleId;
    if (gl_VertexID % 2 == 0) {
      particleId = edge.x;
    } else {
      particleId = edge.y;
    }

    vec3 position = texelFetch(particlePositions, ivec2(particleId % ${MAX_TEXTURE_WIDTH}, particleId / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    gl_Position = projection * view * model * vec4(position, 1.);
  }
`;

const flatFragmentShader = `#version 300 es

  precision highp float;

  out vec4 FragColor;

  void main() {
    FragColor = vec4(1., 0., 0., 1.);
  }
`;

export default class FlatRenderer {
  gl: WebGL2RenderingContext;

  clothVAO: WebGLVertexArrayObject;
  shader: Shader;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.clothVAO = gl.createVertexArray()!;
    this.shader = new Shader(gl, flatVertexShader, flatFragmentShader);
  }

  render(projection: mat4, view: mat4, model: mat4, numConstraints: number) {
    this.shader.use();
    this.shader.setMat4('projection', projection);
    this.shader.setMat4('view', view);
    this.shader.setMat4('model', model);
    this.shader.setInt('particlePositions', 0);
    this.shader.setInt('constraints', 4);

    this.gl.drawArrays(this.gl.LINES, 0, numConstraints * 2);
  }
}
