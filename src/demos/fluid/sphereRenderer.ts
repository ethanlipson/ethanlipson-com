import Shader from './shader';
import { mat4, vec3 } from 'gl-matrix';

const MAX_TEXTURE_WIDTH = 1024;

const SPHERE_ITERATIONS = 16;
const SPHERE_RADIUS = 0.08;

const sphereVertexShader = `#version 300 es

precision highp sampler2D;

in vec3 offsetPosition;

uniform sampler2D particlePositions;

uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

out vec3 normal;
out vec3 fragPos;

void main() {
  vec3 center = texelFetch(particlePositions, ivec2(gl_InstanceID % ${MAX_TEXTURE_WIDTH}, gl_InstanceID / ${MAX_TEXTURE_WIDTH}), 0).xyz;
  gl_Position = projection * view * model * vec4(center + offsetPosition, 1.0);
  fragPos = vec3(model * vec4(center + offsetPosition, 1.0));
  normal = normalize(offsetPosition);
}
`;

const sphereFragmentShader = `#version 300 es

precision highp float;

in vec3 normal;
in vec3 fragPos;

uniform vec3 lightPos;

out vec4 FragColor;

vec3 lightColor = vec3(1.0, 1.0, 1.0);
vec3 objectColor = vec3(0.0, 0.635, 1.0);

void main() {
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * lightColor;

  vec3 lightDir = normalize(lightPos - fragPos);
  vec3 diffuse = max(dot(normal, lightDir), 0.0) * lightColor;

  vec3 color = (ambient + diffuse) * objectColor;
  FragColor = vec4(color, 1.0);
}
`;

class SphereRenderer {
  particleVAO: WebGLVertexArrayObject;
  particleSphereVertexBuffer: WebGLBuffer;
  particleSphereVertices: number[];
  particleShader: Shader;

  constructor(gl: WebGL2RenderingContext) {
    /***************** Creating the sphere vertices *****************/

    this.particleSphereVertices = [];
    const pushCartesian = (radius: number, azimuth: number, elevation: number) => {
      this.particleSphereVertices.push(
        radius * Math.cos(azimuth) * Math.sin(elevation)
      );
      this.particleSphereVertices.push(
        radius * Math.sin(azimuth) * Math.sin(elevation)
      );
      this.particleSphereVertices.push(radius * Math.cos(elevation));
    };

    const azimuthStep = (Math.PI * 2) / SPHERE_ITERATIONS;
    const elevationStep = Math.PI / SPHERE_ITERATIONS;
    for (let azimuth = 0; azimuth <= Math.PI * 2; azimuth += azimuthStep) {
      for (let elevation = 0; elevation <= Math.PI; elevation += elevationStep) {
        pushCartesian(SPHERE_RADIUS, azimuth, elevation);
        pushCartesian(SPHERE_RADIUS, azimuth + azimuthStep, elevation);
        pushCartesian(SPHERE_RADIUS, azimuth + azimuthStep, elevation + elevationStep);

        pushCartesian(SPHERE_RADIUS, azimuth, elevation);
        pushCartesian(SPHERE_RADIUS, azimuth, elevation + elevationStep);
        pushCartesian(SPHERE_RADIUS, azimuth + azimuthStep, elevation + elevationStep);
      }
    }

    /***************** Creating the sphere vertex buffers *****************/

    this.particleVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.particleVAO);

    this.particleSphereVertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleSphereVertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.particleSphereVertices),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.particleShader = new Shader(gl, sphereVertexShader, sphereFragmentShader);
  }

  render(
    gl: WebGL2RenderingContext,
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3,
    numParticles: number
  ) {
    gl.bindVertexArray(this.particleVAO);
    this.particleShader.use(gl);

    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.particleShader.program, 'projection'),
      false,
      projection
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.particleShader.program, 'view'),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.particleShader.program, 'model'),
      false,
      model
    );
    gl.uniform3fv(
      gl.getUniformLocation(this.particleShader.program, 'lightPos'),
      lightPos
    );
    gl.uniform1i(
      gl.getUniformLocation(this.particleShader.program, 'particlePositions'),
      0
    );

    gl.drawArraysInstanced(
      gl.TRIANGLES,
      0,
      this.particleSphereVertices.length / 3,
      numParticles
    );
  }
}

export default SphereRenderer;
