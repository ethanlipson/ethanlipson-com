import Shader from './shader';
import { mat4, vec3 } from 'gl-matrix';

const MAX_TEXTURE_WIDTH = 4096;

const SPHERE_ITERATIONS = 64;
const SPHERE_RADIUS = 0.08;

const sphereVertexShader = `#version 300 es

  in vec3 offset;

  uniform sampler2D spherePositionsAndRadii;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  out vec3 fragPos;
  out vec3 normal;

  void main() {
    vec4 spherePositionAndRadius = texelFetch(spherePositionsAndRadii, ivec2(gl_InstanceID % ${MAX_TEXTURE_WIDTH}, gl_InstanceID / ${MAX_TEXTURE_WIDTH}), 0);
    vec3 position = spherePositionAndRadius.xyz;
    float radius = spherePositionAndRadius.w;
    radius -= 0.001;

    gl_Position = projection * view * model * vec4(position + offset * radius, 1.);
    fragPos = vec3(model * vec4(position + offset * radius, 1.));
    normal = offset;
  }
`;

const sphereFragmentShader = `#version 300 es

  precision highp float;

  in vec3 fragPos;
  in vec3 normal;

  uniform sampler2D shadowMap;

  uniform mat4 shadowProjection;
  uniform mat4 shadowView;

  uniform vec3 lightDir;

  out vec4 FragColor;

  vec3 lightColor = vec3(1.);

  bool getInShadow(vec4 projected) {
    vec3 ndc = projected.xyz / projected.w;
    ndc = ndc * .5 + .5;

    float closestDepth = texture(shadowMap, ndc.xy).r;
    float currentDepth = ndc.z;

    float bias = .001;
    return currentDepth - bias > closestDepth;
  }

  void main() {
    vec3 objectColor = vec3(.5);

    vec4 projected = shadowProjection * shadowView * vec4(fragPos, 1.0);
    bool isInShadow = getInShadow(projected);

    float ambientStrength = .1;
    vec3 ambient = ambientStrength * lightColor;

    vec3 normalizedLightDir = normalize(-lightDir);
    vec3 diffuse = max(dot(normal, normalizedLightDir), 0.) * lightColor;

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

  in vec3 offset;

  uniform sampler2D spherePositionsAndRadii;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  void main() {
    vec4 spherePositionAndRadius = texelFetch(spherePositionsAndRadii, ivec2(gl_InstanceID % ${MAX_TEXTURE_WIDTH}, gl_InstanceID / ${MAX_TEXTURE_WIDTH}), 0);
    vec3 position = spherePositionAndRadius.xyz;
    float radius = spherePositionAndRadius.w;
    radius -= 0.001;

    gl_Position = projection * view * model * vec4(position + offset * radius, 1.);
  }
`;

const depthFragmentShader = `#version 300 es

  precision highp float;

  void main() {}
`;

class SphereRenderer {
  gl: WebGL2RenderingContext;
  sphereVAO: WebGLVertexArrayObject;
  sphereVertexBuffer: WebGLBuffer;
  sphereVertices: number[] = [];
  sphereShader: Shader;
  depthShader: Shader;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    for (let theta = 0; theta < Math.PI; theta += Math.PI / SPHERE_ITERATIONS) {
      for (let phi = 0; phi < 2 * Math.PI; phi += Math.PI / SPHERE_ITERATIONS) {
        const addVertex = ((theta: number, phi: number) => {
          const x = Math.cos(phi) * Math.sin(theta);
          const y = Math.cos(theta);
          const z = Math.sin(phi) * Math.sin(theta);
          this.sphereVertices.push(x, y, z);
        }).bind(this);

        addVertex(theta, phi);
        addVertex(theta, phi + Math.PI / SPHERE_ITERATIONS);
        addVertex(
          theta + Math.PI / SPHERE_ITERATIONS,
          phi + Math.PI / SPHERE_ITERATIONS
        );
        addVertex(theta, phi);
        addVertex(theta + Math.PI / SPHERE_ITERATIONS, phi);
        addVertex(
          theta + Math.PI / SPHERE_ITERATIONS,
          phi + Math.PI / SPHERE_ITERATIONS
        );
      }
    }

    /***************** Creating the sphere vertex buffers *****************/

    this.sphereVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.sphereVAO);

    this.sphereVertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.sphereVertices),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.sphereShader = new Shader(
      gl,
      sphereVertexShader,
      sphereFragmentShader
    );
    this.depthShader = new Shader(gl, depthVertexShader, depthFragmentShader);
  }

  render(
    projection: mat4,
    view: mat4,
    model: mat4,
    shadowProjection: mat4,
    shadowView: mat4,
    lightDir: vec3,
    numSpheres: number
  ) {
    this.gl.bindVertexArray(this.sphereVAO);
    this.sphereShader.use();

    this.sphereShader.setMat4('projection', projection);
    this.sphereShader.setMat4('view', view);
    this.sphereShader.setMat4('model', model);
    this.sphereShader.setMat4('shadowProjection', shadowProjection);
    this.sphereShader.setMat4('shadowView', shadowView);
    this.sphereShader.setVec3(
      'lightDir',
      lightDir[0],
      lightDir[1],
      lightDir[2]
    );
    this.sphereShader.setInt('spherePositionsAndRadii', 8);
    this.sphereShader.setInt('shadowMap', 9);

    this.gl.drawArraysInstanced(
      this.gl.TRIANGLES,
      0,
      this.sphereVertices.length / 3,
      numSpheres
    );
  }

  renderDepth(projection: mat4, view: mat4, model: mat4, numSpheres: number) {
    this.gl.bindVertexArray(this.sphereVAO);
    this.depthShader.use();
    this.depthShader.setMat4('projection', projection);
    this.depthShader.setMat4('view', view);
    this.depthShader.setMat4('model', model);
    this.depthShader.setInt('spherePositionsAndRadii', 8);

    this.gl.drawArraysInstanced(
      this.gl.TRIANGLES,
      0,
      this.sphereVertices.length / 3,
      numSpheres
    );
  }
}

export default SphereRenderer;
