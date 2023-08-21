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

  uniform int numParticles;
  uniform int numParticlesX;

  out vec3 fragPos;
  out vec3 normal;

  void main() {
    int edgeId = gl_VertexID / 2;
    ivec2 edge = ivec2(texelFetch(constraints, ivec2(edgeId % ${MAX_TEXTURE_WIDTH}, edgeId / ${MAX_TEXTURE_WIDTH}), 0).xy);

    int particleId;
    if (gl_VertexID % 2 == 0) {
      particleId = edge.x;
    } else {
      particleId = edge.y;
    }
    
    int neighbor1Id = particleId < numParticlesX ? particleId + numParticlesX : particleId - numParticlesX;
    int neighbor2Id = (particleId % numParticlesX == 0) ? particleId + 1 : particleId - 1;

    vec3 position = texelFetch(particlePositions, ivec2(particleId % ${MAX_TEXTURE_WIDTH}, particleId / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 neighbor1 = texelFetch(particlePositions, ivec2(neighbor1Id % ${MAX_TEXTURE_WIDTH}, neighbor1Id / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 neighbor2 = texelFetch(particlePositions, ivec2(neighbor2Id % ${MAX_TEXTURE_WIDTH}, neighbor2Id / ${MAX_TEXTURE_WIDTH}), 0).xyz;

    gl_Position = projection * view * model * vec4(position, 1.);
    fragPos = vec3(model * vec4(position, 1.));
    normal = normalize(cross(neighbor1 - position, neighbor2 - position));
  }
`;

const flatFragmentShader = `#version 300 es

  precision highp float;

  in vec3 normal;
  in vec3 fragPos;

  uniform vec3 lightDir;

  out vec4 FragColor;

  vec3 lightColor = vec3(1.);
  vec3 objectColor = vec3(1., 0., 0.);

  void main() {
    float ambientStrength = .1;
    vec3 ambient = ambientStrength * lightColor;

    vec3 normalizedLightDir = normalize(-lightDir);
    vec3 diffuse = abs(dot(normal, normalizedLightDir)) * lightColor;

    vec3 color = (ambient + diffuse) * objectColor;
    FragColor = vec4(color, 1.);
  }
`;

export default class DiffuseRenderer {
  gl: WebGL2RenderingContext;

  clothVAO: WebGLVertexArrayObject;
  shader: Shader;

  numParticles: number;
  numParticlesX: number;

  constructor(
    gl: WebGL2RenderingContext,
    numParticles: number,
    numParticlesX: number
  ) {
    this.gl = gl;
    this.clothVAO = gl.createVertexArray()!;
    this.shader = new Shader(gl, flatVertexShader, flatFragmentShader);
    this.numParticles = numParticles;
    this.numParticlesX = numParticlesX;
  }

  render(
    projection: mat4,
    view: mat4,
    model: mat4,
    lightDir: vec3,
    numConstraints: number
  ) {
    this.shader.use();
    this.shader.setMat4('projection', projection);
    this.shader.setMat4('view', view);
    this.shader.setMat4('model', model);
    this.shader.setVec3('lightDir', lightDir[0], lightDir[1], lightDir[2]);
    this.shader.setInt('particlePositions', 0);
    this.shader.setInt('constraints', 4);
    this.shader.setInt('numParticles', this.numParticles);
    this.shader.setInt('numParticlesX', this.numParticlesX);

    this.gl.drawArrays(this.gl.LINES, 0, numConstraints * 2);
  }
}
