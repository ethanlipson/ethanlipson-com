import { vec3, mat4 } from "gl-matrix";
import DiffuseRenderer from "./diffuseRenderer";
import FlatRenderer from "./flatRenderer";
import Shader from "./shader";
import SphereRenderer from "./sphereRenderer";
import TileRenderer from "./tileRenderer";
import TriangleRenderer from "./triangleRenderer";

const MAX_TEXTURE_WIDTH = 4096;

const GRAVITY = [0, -20, 0];
const SIM_WIDTH = 22;
const SIM_DEPTH = 20;

const SHADOW_MAP_WIDTH = 4096;
const SHADOW_MAP_HEIGHT = 4096;

const fullscreenVertexShader = `#version 300 es

  void main() {
    switch (gl_VertexID) {
    case 0:
      gl_Position = vec4(-1, -1, 0, 1);
      return;
    case 1:
      gl_Position = vec4(-1, 1, 0, 1);
      return;
    case 2:
      gl_Position = vec4(1, 1, 0, 1);
      return;
    case 3:
      gl_Position = vec4(-1, -1, 0, 1);
      return;
    case 4:
      gl_Position = vec4(1, -1, 0, 1);
      return;
    case 5:
      gl_Position = vec4(1, 1, 0, 1);
      return;
    }
  }
`;

const detectGrabVertexShader = `#version 300 es

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  uniform sampler2D particlePositions;

  flat out int particleId;

  void main() {
    particleId = gl_VertexID;

    vec3 particle = texelFetch(particlePositions, ivec2(particleId % ${MAX_TEXTURE_WIDTH}, particleId / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec4 projected = projection * view * model * vec4(particle, 1.);

    gl_PointSize = 1.;
    gl_Position = vec4(0., 0., projected.z / projected.w, 1.);
  }
`;

const detectGrabFragmentShader = `#version 300 es

  precision highp float;

  flat in int particleId;

  uniform sampler2D particlePositions;
  uniform int numParticles;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  uniform vec3 rayOrigin;
  uniform vec3 rayDirection;
  uniform float grabDistance;

  uniform sampler2D grabDepthMap;

  out ivec4 outParticleId;

  bool getObstructed(vec4 projected) {
    vec3 ndc = projected.xyz / projected.w;
    ndc = ndc * .5 + .5;

    float closestDepth = texture(grabDepthMap, ndc.xy).r;
    float currentDepth = ndc.z;

    float bias = .001;
    return currentDepth - bias > closestDepth;
  }

  void main() {
    if (particleId >= numParticles) {
      discard;
    }

    vec3 particle = texelFetch(particlePositions, ivec2(particleId % ${MAX_TEXTURE_WIDTH}, particleId / ${MAX_TEXTURE_WIDTH}), 0).xyz;

    vec4 projected = projection * view * model * vec4(particle, 1.);
    bool obstructed = getObstructed(projected);

    if (obstructed) {
      discard;
    }

    float dist = length(cross(rayDirection, particle - rayOrigin)) / length(rayDirection);
    if (dist > grabDistance) {
      discard;
    }

    gl_FragDepth = dist;
    outParticleId = ivec4(particleId, 0, 0, 0);
  }
`;

const updatePositionFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D particlePositions;
  uniform sampler2D particleVelocities;

  uniform int numParticles;
  uniform float dt;

  uniform int grabbedParticleId;

  out vec4 copyPosition;

  void main() {
    int particleId = int(gl_FragCoord.x) + int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH};
    if (particleId >= numParticles) {
      discard;
    }
    
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord), 0).xyz;
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_FragCoord), 0).xyz;
    copyPosition = vec4(position + velocity * dt, 0.);
  }
`;

const setGrabbedParticlePositionVertexShader = `#version 300 es

  uniform int grabbedParticleId;
  uniform float numParticles;

  void main() {
    float x = float(grabbedParticleId % ${MAX_TEXTURE_WIDTH}) + .5;
    float y = float(grabbedParticleId / ${MAX_TEXTURE_WIDTH}) + .5;
    float ndcX = 2. * (x / float(${MAX_TEXTURE_WIDTH})) - 1.;
    float ndcY = 2. * (y / ceil(numParticles / float(${MAX_TEXTURE_WIDTH}))) - 1.;
    gl_PointSize = 1.;
    gl_Position = vec4(ndcX, ndcY, 0., 1.);
  }
`;

const setGrabbedParticlePositionFragmentShader = `#version 300 es

  precision highp float;

  uniform vec3 grabbedParticlePosition;

  out vec4 outGrabbedParticlePosition;

  void main() {
    outGrabbedParticlePosition = vec4(grabbedParticlePosition, 1.);
  }
`;

const prepConstraintsFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D particlePositions;
  uniform sampler2D particleWeights;
  uniform sampler2D constraints;

  uniform int numConstraints;
  uniform int groupStart;
  uniform int groupSize;

  out vec4 correctedPosition;

  void main() {
    int constraintId = (int(gl_FragCoord.x) + int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH}) / 2;
    if (constraintId >= numConstraints) {
      discard;
    }

    if (constraintId < groupStart || constraintId >= groupStart + groupSize) {
      discard;
    }

    int subId = (int(gl_FragCoord.x) + int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH}) % 2;

    vec3 constraint = texelFetch(constraints, ivec2(constraintId % ${MAX_TEXTURE_WIDTH}, constraintId / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    int p1Id = int(constraint.x);
    int p2Id = int(constraint.y);
    float restLength = constraint.z;

    vec3 p1 = texelFetch(particlePositions, ivec2(p1Id % ${MAX_TEXTURE_WIDTH}, p1Id / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 p2 = texelFetch(particlePositions, ivec2(p2Id % ${MAX_TEXTURE_WIDTH}, p2Id / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    float currLength = distance(p1, p2);
    
    vec3 gradient = (p2 - p1) / currLength;
    float error = currLength - restLength;

    float w1 = texelFetch(particleWeights, ivec2(p1Id % ${MAX_TEXTURE_WIDTH}, p1Id / ${MAX_TEXTURE_WIDTH}), 0).x;
    float w2 = texelFetch(particleWeights, ivec2(p2Id % ${MAX_TEXTURE_WIDTH}, p2Id / ${MAX_TEXTURE_WIDTH}), 0).x;
    if (subId == 0) {
      correctedPosition = vec4(p1 + w1 / (w1 + w2) * gradient * error, 1.);
      // correctedPosition = vec4(p1, 1.);
    } else {
      correctedPosition = vec4(p2 - w2 / (w1 + w2) * gradient * error, 1.);
      // correctedPosition = vec4(p2, 1.);
    }
  }
`;

const solveConstraintsVertexShader = `#version 300 es

  uniform sampler2D constraints;

  uniform float numParticles;

  uniform int startConstraintId;

  flat out int constraintId;
  flat out int firstOrSecond;

  void main() {
    constraintId = startConstraintId + gl_VertexID / 2;
    ivec2 constraint = ivec2(texelFetch(constraints, ivec2(constraintId % ${MAX_TEXTURE_WIDTH}, constraintId / ${MAX_TEXTURE_WIDTH}), 0).xy);

    int particleId;
    if (gl_VertexID % 2 == 0) {
      particleId = constraint.x;
      firstOrSecond = 0;
    } else {
      particleId = constraint.y;
      firstOrSecond = 1;
    }

    float x = float(particleId % ${MAX_TEXTURE_WIDTH}) + .5;
    float y = float(particleId / ${MAX_TEXTURE_WIDTH}) + .5;
    float ndcX = 2. * (x / float(${MAX_TEXTURE_WIDTH})) - 1.;
    float ndcY = 2. * (y / ceil(numParticles / float(${MAX_TEXTURE_WIDTH}))) - 1.;

    gl_PointSize = 1.;
    gl_Position = vec4(ndcX, ndcY, 0., 1.);
  }
`;

const solveConstraintsFragmentShader = `#version 300 es

  precision highp float;

  flat in int constraintId;
  flat in int firstOrSecond;

  uniform sampler2D constraintsPrepInfo;

  out vec4 correctedPosition;

  void main() {
    int correctedPosLocation = 2 * constraintId + firstOrSecond;
    vec3 correctedPos = texelFetch(constraintsPrepInfo, ivec2(correctedPosLocation % ${MAX_TEXTURE_WIDTH}, correctedPosLocation / ${MAX_TEXTURE_WIDTH}), 0).xyz;

    correctedPosition = vec4(correctedPos, 1.);
  }
`;

const particleCollisionFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D particlePositions;
  uniform sampler2D spherePositionsAndRadii;

  uniform int numParticles;
  uniform int numSpheres;

  out vec4 particleCopyPosition;

  void main() {
    int particleId = int(gl_FragCoord.x) + int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH};
    if (particleId >= numParticles) {
      discard;
    }

    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord), 0).xyz;
    position.y = max(position.y, 0.);
    position.x = clamp(position.x, -float(${SIM_WIDTH / 2}), float(${
  SIM_WIDTH / 2
}));
        position.z = clamp(position.z, -float(${SIM_DEPTH / 2}), float(${
  SIM_DEPTH / 2
}));

    for (int sphereId = 0; sphereId < numSpheres; sphereId++) {
      vec4 spherePositionAndRadius = texelFetch(spherePositionsAndRadii, ivec2(sphereId % ${MAX_TEXTURE_WIDTH}, sphereId / ${MAX_TEXTURE_WIDTH}), 0);
      float radius = spherePositionAndRadius.w;
      vec3 center = spherePositionAndRadius.xyz;

      vec3 delta = position - center;
      if (dot(delta, delta) < radius * radius) {
        position = center + radius * normalize(delta);
      }
    }

    particleCopyPosition = vec4(position, 1.);
  }
`;

const updateVelocityFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D particlePositions;
  uniform sampler2D particlePrevPositions;
  uniform sampler2D spherePositionsAndRadii;

  uniform int numParticles;
  uniform int numSpheres;
  uniform float dt;

  out vec4 particleVelocity;

  void main() {
    int particleId = int(gl_FragCoord.x) + int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH};
    if (particleId >= numParticles) {
      discard;
    }

    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord), 0).xyz;
    vec3 prevPosition = texelFetch(particlePrevPositions, ivec2(gl_FragCoord), 0).xyz;

    vec3 velocity = (position - prevPosition) / dt;
    if (position.y == 0.) {
      velocity *= .99;
    }

    for (int sphereId = 0; sphereId < numSpheres; sphereId++) {
      vec4 spherePositionAndRadius = texelFetch(spherePositionsAndRadii, ivec2(sphereId % ${MAX_TEXTURE_WIDTH}, sphereId / ${MAX_TEXTURE_WIDTH}), 0);
      float radius = spherePositionAndRadius.w;
      vec3 center = spherePositionAndRadius.xyz;

      vec3 delta = position - center;
      if (dot(delta, delta) < radius * radius) {
        velocity *= .98;
      }
    }
    
    velocity *= .9995;

    vec3 gravity = vec3(float(${GRAVITY[0]}), float(${GRAVITY[1]}), float(${GRAVITY[2]}));

    particleVelocity = vec4(velocity + gravity * dt, 0.);
  }
`;

class Constraint {
  id1: number;
  id2: number;
  restLength: number;
  group: number;

  constructor(id1: number, id2: number, restLength: number, group: number) {
    this.id1 = id1;
    this.id2 = id2;
    this.restLength = restLength;
    this.group = group;
  }
}

class Space {
  gl: WebGL2RenderingContext;

  numParticles: number;
  numSpheres: number = 0;
  maxSpheres: number;

  constraints: Constraint[] = [];
  constraintGroupSizes: number[] = [];

  clothRenderer: TriangleRenderer;
  tileRenderer: TileRenderer;
  sphereRenderer: SphereRenderer;

  particleComputeVAO: WebGLVertexArrayObject;
  particlePositions: WebGLTexture;
  particlePositionsFBO: WebGLFramebuffer;
  particlePrevPositions: WebGLTexture;
  particlePrevPositionsFBO: WebGLFramebuffer;
  particleWeights: WebGLTexture;
  particleVelocities: WebGLTexture;
  particleVelocitiesFBO: WebGLFramebuffer;
  constraintsBuffer: WebGLTexture;
  constraintsPrepBuffer: WebGLTexture;
  constraintsPrepBufferFBO: WebGLFramebuffer;
  particleCopyBuffer: WebGLTexture;
  particleCopyBufferFBO: WebGLFramebuffer;
  spherePositionsAndRadii: WebGLTexture;

  updatePositionShader: Shader;
  setGrabbedParticlePositionShader: Shader;
  prepConstraintsShader: Shader;
  solveConstraintsShader: Shader;
  particleCollisionShader: Shader;
  updateVelocityShader: Shader;

  grabbedParticleId: number = -10000;
  grabbedParticleDistanceFromCamera: number = 10;
  grabbedParticleTexture: WebGLTexture;
  grabbedParticleDepthRenderbuffer: WebGLRenderbuffer;
  grabbedParticleTextureFBO: WebGLFramebuffer;
  detectGrabShader: Shader;
  prevClicking: boolean = false;
  grabDepthMap: WebGLTexture;
  grabDepthMapFBO: WebGLFramebuffer;

  initialParticlePositions: Float32Array;
  initialParticleVelocities: Float32Array;

  shadowMap: WebGLTexture;
  shadowMapFBO: WebGLFramebuffer;

  constructor(
    gl: WebGL2RenderingContext,
    width: number,
    depth: number,
    numParticlesX: number,
    numParticlesZ: number,
    maxSpheres: number
  ) {
    this.gl = gl;

    this.numParticles = numParticlesX * numParticlesZ;
    this.maxSpheres = maxSpheres;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.getExtension("EXT_color_buffer_float");

    this.clothRenderer = new TriangleRenderer(gl, numParticlesX, numParticlesZ);
    this.tileRenderer = new TileRenderer(gl);
    this.sphereRenderer = new SphereRenderer(gl);

    /***************** Creating the compute shaders *****************/

    this.initialParticlePositions = new Float32Array(
      MAX_TEXTURE_WIDTH * Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH) * 4
    );
    for (let i = 0; i < this.numParticles; i++) {
      this.initialParticlePositions[4 * i + 0] =
        -width / 2 + ((i % numParticlesX) / (numParticlesX - 1)) * width;
      this.initialParticlePositions[4 * i + 1] = 6;
      this.initialParticlePositions[4 * i + 2] =
        -depth / 2 +
        (Math.floor(i / numParticlesX) / (numParticlesZ - 1)) * depth;
      this.initialParticlePositions[4 * i + 3] = 0;
    }

    this.initialParticleVelocities = new Float32Array(
      MAX_TEXTURE_WIDTH * Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH) * 4
    );
    for (let i = 0; i < this.numParticles; i++) {
      this.initialParticleVelocities[4 * i + 0] = 0;
      this.initialParticleVelocities[4 * i + 1] = 0;
      this.initialParticleVelocities[4 * i + 2] = 0;
      this.initialParticleVelocities[4 * i + 3] = 0;
    }

    const particleWeightsBuffer = new Float32Array(
      MAX_TEXTURE_WIDTH * Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH)
    );
    for (let i = 0; i < this.numParticles; i++) {
      particleWeightsBuffer[i] = 1;
    }
    particleWeightsBuffer[this.grabbedParticleId] = 0;

    const xDistanceBetweenParticles = width / (numParticlesX - 1);
    const zDistanceBetweenParticles = depth / (numParticlesZ - 1);
    const xzDistanceBetweenParticles = Math.sqrt(
      xDistanceBetweenParticles * xDistanceBetweenParticles +
        zDistanceBetweenParticles * zDistanceBetweenParticles
    );

    this.constraintGroupSizes.push(0);
    this.constraintGroupSizes.push(0);
    for (let z = 0; z < numParticlesZ; z++) {
      for (let x = 0; x < numParticlesX - 1; x++) {
        const id1 = x + z * numParticlesX;
        const id2 = x + 1 + z * numParticlesX;
        this.constraints.push(
          new Constraint(id1, id2, xDistanceBetweenParticles, x % 2)
        );
        this.constraintGroupSizes[x % 2]++;
      }
    }

    this.constraintGroupSizes.push(0);
    this.constraintGroupSizes.push(0);
    for (let x = 0; x < numParticlesX; x++) {
      for (let z = 0; z < numParticlesZ - 1; z++) {
        const id1 = x + z * numParticlesX;
        const id2 = x + (z + 1) * numParticlesX;
        this.constraints.push(
          new Constraint(id1, id2, zDistanceBetweenParticles, 2 + (z % 2))
        );
        this.constraintGroupSizes[2 + (z % 2)]++;
      }
    }

    this.constraintGroupSizes.push(0);
    this.constraintGroupSizes.push(0);
    for (let z = 0; z < numParticlesZ - 1; z++) {
      for (let x = 0; x < numParticlesX - 1; x++) {
        const id1 = x + (z + 1) * numParticlesX;
        const id2 = x + 1 + z * numParticlesX;
        this.constraints.push(
          new Constraint(id1, id2, xzDistanceBetweenParticles, 4 + (z % 2))
        );
        this.constraintGroupSizes[4 + (z % 2)]++;
      }
    }

    this.constraints.sort((a, b) => a.group - b.group);

    const constraintsBuffer = new Float32Array(
      MAX_TEXTURE_WIDTH *
        Math.ceil(this.constraints.length / MAX_TEXTURE_WIDTH) *
        4
    );
    for (let i = 0; i < this.constraints.length; i++) {
      constraintsBuffer[4 * i + 0] = this.constraints[i].id1;
      constraintsBuffer[4 * i + 1] = this.constraints[i].id2;
      constraintsBuffer[4 * i + 2] = this.constraints[i].restLength;
      constraintsBuffer[4 * i + 3] = 0;
    }

    this.particleComputeVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.particleComputeVAO);

    this.particlePositions = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositions);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      this.initialParticlePositions
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particlePositionsFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particlePositions,
      0
    );

    this.particlePrevPositions = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePrevPositions);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particlePrevPositionsFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePrevPositionsFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particlePrevPositions,
      0
    );

    this.particleWeights = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.particleWeights);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RED,
      gl.FLOAT,
      particleWeightsBuffer
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particleVelocities = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.particleVelocities);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      this.initialParticleVelocities
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particleVelocitiesFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleVelocitiesFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleVelocities,
      0
    );

    this.constraintsBuffer = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.constraintsBuffer);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.constraints.length / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      constraintsBuffer
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.constraintsPrepBuffer = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.constraintsPrepBuffer);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil((this.constraints.length * 2) / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.constraintsPrepBufferFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.constraintsPrepBufferFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.constraintsPrepBuffer,
      0
    );

    this.particleCopyBuffer = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.particleCopyBuffer);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particleCopyBufferFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleCopyBuffer,
      0
    );

    this.grabbedParticleTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, this.grabbedParticleTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      1,
      0,
      gl.RED_INTEGER,
      gl.INT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.grabbedParticleDepthRenderbuffer = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.grabbedParticleDepthRenderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, 1, 1);

    this.grabbedParticleTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.grabbedParticleTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.grabbedParticleTexture,
      0
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this.grabbedParticleDepthRenderbuffer
    );

    this.spherePositionsAndRadii = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, this.spherePositionsAndRadii);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxSpheres / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.shadowMap = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT32F,
      SHADOW_MAP_WIDTH,
      SHADOW_MAP_HEIGHT,
      0,
      gl.DEPTH_COMPONENT,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    this.shadowMapFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.shadowMap,
      0
    );

    this.grabDepthMap = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, this.grabDepthMap);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT32F,
      this.gl.canvas.width,
      this.gl.canvas.height,
      0,
      gl.DEPTH_COMPONENT,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    this.grabDepthMapFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.grabDepthMapFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.grabDepthMap,
      0
    );

    this.updatePositionShader = new Shader(
      gl,
      fullscreenVertexShader,
      updatePositionFragmentShader
    );
    this.setGrabbedParticlePositionShader = new Shader(
      gl,
      setGrabbedParticlePositionVertexShader,
      setGrabbedParticlePositionFragmentShader
    );
    this.prepConstraintsShader = new Shader(
      gl,
      fullscreenVertexShader,
      prepConstraintsFragmentShader
    );
    this.solveConstraintsShader = new Shader(
      gl,
      solveConstraintsVertexShader,
      solveConstraintsFragmentShader
    );
    this.particleCollisionShader = new Shader(
      gl,
      fullscreenVertexShader,
      particleCollisionFragmentShader
    );
    this.updateVelocityShader = new Shader(
      gl,
      fullscreenVertexShader,
      updateVelocityFragmentShader
    );
    this.detectGrabShader = new Shader(
      gl,
      detectGrabVertexShader,
      detectGrabFragmentShader
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  resetCloth() {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      this.gl.RGBA,
      this.gl.FLOAT,
      this.initialParticlePositions
    );

    this.gl.activeTexture(this.gl.TEXTURE3);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      this.gl.RGBA,
      this.gl.FLOAT,
      this.initialParticleVelocities
    );
  }

  addSphere(position: vec3, radius: number) {
    this.gl.activeTexture(this.gl.TEXTURE8);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.numSpheres % MAX_TEXTURE_WIDTH,
      Math.floor(this.numSpheres / MAX_TEXTURE_WIDTH),
      1,
      1,
      this.gl.RGBA,
      this.gl.FLOAT,
      new Float32Array([position[0], position[1], position[2], radius])
    );

    this.numSpheres++;
  }

  step(
    dt: number,
    substeps: number,
    mouseX: number,
    mouseY: number,
    projection: mat4,
    view: mat4,
    model: mat4,
    clicking: boolean
  ) {
    this.handleClick(clicking, mouseX, mouseY, projection, view, model);

    this.gl.disable(this.gl.DEPTH_TEST);
    const substepSize = dt / substeps;
    for (let i = 0; i < substeps; i++) {
      this.substep(substepSize, mouseX, mouseY, projection, view, model);
    }
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  handleClick(
    clicking: boolean,
    mouseX: number,
    mouseY: number,
    projection: mat4,
    view: mat4,
    model: mat4
  ) {
    if (clicking && !this.prevClicking) {
      this.clickStart(mouseX, mouseY, projection, view, model);
    }

    if (!clicking) {
      this.clickEnd();
    }

    this.prevClicking = clicking;
  }

  clickStart(
    mouseX: number,
    mouseY: number,
    projection: mat4,
    view: mat4,
    model: mat4
  ) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.grabDepthMapFBO);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

    this.renderClothDepth(projection, view, model);
    this.renderFloorDepth(projection, view, model, SIM_WIDTH, SIM_DEPTH);
    this.renderSpheresDepth(projection, view, model);

    const { rayOrigin, rayDirection } = this.getMouseRay(
      mouseX,
      mouseY,
      projection,
      view,
      model
    );

    this.gl.activeTexture(this.gl.TEXTURE7);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      0,
      0,
      1,
      1,
      this.gl.RED_INTEGER,
      this.gl.INT,
      new Int32Array([-1])
    );
    this.gl.bindFramebuffer(
      this.gl.FRAMEBUFFER,
      this.grabbedParticleTextureFBO
    );
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
    this.gl.viewport(0, 0, 1, 1);
    this.detectGrabShader.use();
    this.detectGrabShader.setMat4("projection", projection);
    this.detectGrabShader.setMat4("view", view);
    this.detectGrabShader.setMat4("model", model);
    this.detectGrabShader.setInt("particlePositions", 0);
    this.detectGrabShader.setInt("grabDepthMap", 10);
    this.detectGrabShader.setInt("numParticles", this.numParticles);
    this.detectGrabShader.setVec3(
      "rayOrigin",
      rayOrigin[0],
      rayOrigin[1],
      rayOrigin[2]
    );
    this.detectGrabShader.setVec3(
      "rayDirection",
      rayDirection[0],
      rayDirection[1],
      rayDirection[2]
    );
    this.detectGrabShader.setFloat("grabDistance", 0.1);
    this.gl.drawArrays(this.gl.POINTS, 0, this.numParticles);

    const idBuf = new Int32Array(1);
    this.gl.readPixels(0, 0, 1, 1, this.gl.RED_INTEGER, this.gl.INT, idBuf);

    if (idBuf[0] !== -1) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.particlePositionsFBO);
      this.grabbedParticleId = idBuf[0];

      const positionBuf = new Float32Array(4);
      this.gl.readPixels(
        this.grabbedParticleId % MAX_TEXTURE_WIDTH,
        Math.floor(this.grabbedParticleId / MAX_TEXTURE_WIDTH),
        1,
        1,
        this.gl.RGBA,
        this.gl.FLOAT,
        positionBuf
      );
      const position = vec3.fromValues(
        positionBuf[0],
        positionBuf[1],
        positionBuf[2]
      );

      this.grabbedParticleDistanceFromCamera = vec3.dot(
        vec3.sub(vec3.create(), position, rayOrigin),
        rayDirection
      );
      // console.log(
      //   position,
      //   vec3.scaleAndAdd(vec3.create(), rayOrigin, rayDirection, this.grabbedParticleDistanceFromCamera)
      // );

      this.gl.activeTexture(this.gl.TEXTURE2);
      this.gl.texSubImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.grabbedParticleId % MAX_TEXTURE_WIDTH,
        Math.floor(this.grabbedParticleId / MAX_TEXTURE_WIDTH),
        1,
        1,
        this.gl.RED,
        this.gl.FLOAT,
        new Float32Array([0])
      );
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  clickEnd() {
    if (this.grabbedParticleId < 0) {
      return;
    }

    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.grabbedParticleId % MAX_TEXTURE_WIDTH,
      Math.floor(this.grabbedParticleId / MAX_TEXTURE_WIDTH),
      1,
      1,
      this.gl.RED,
      this.gl.FLOAT,
      new Float32Array([1])
    );

    this.grabbedParticleId = -10000;
  }

  getMouseRay(
    mouseX: number,
    mouseY: number,
    projection: mat4,
    view: mat4,
    model: mat4
  ) {
    const x = (2 * mouseX) / this.gl.canvas.width - 1;
    const y = 1 - (2 * mouseY) / this.gl.canvas.height;

    const mvp = mat4.mul(
      mat4.create(),
      mat4.mul(mat4.create(), projection, view),
      model
    );
    const mvpInv = mat4.invert(mat4.create(), mvp);

    const rayOrigin = vec3.transformMat4(
      vec3.create(),
      vec3.fromValues(x, y, -1),
      mvpInv
    );
    const rayEnd = vec3.transformMat4(
      vec3.create(),
      vec3.fromValues(x, y, 1),
      mvpInv
    );
    const rayDirection = vec3.sub(vec3.create(), rayEnd, rayOrigin);
    vec3.normalize(rayDirection, rayDirection);

    return { rayOrigin, rayDirection };
  }

  substep(
    dt: number,
    mouseX: number,
    mouseY: number,
    projection: mat4,
    view: mat4,
    model: mat4
  ) {
    this.gl.bindVertexArray(this.particleComputeVAO);
    this.gl.viewport(
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH)
    );

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.particlePositionsFBO);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.copyTexImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0
    );

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    this.updatePositionShader.use();
    this.updatePositionShader.setInt("particlePositions", 0);
    this.updatePositionShader.setInt("particleVelocities", 3);
    this.updatePositionShader.setInt("numParticles", this.numParticles);
    this.updatePositionShader.setFloat("dt", dt);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.copyTexImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0
    );

    const { rayOrigin, rayDirection } = this.getMouseRay(
      mouseX,
      mouseY,
      projection,
      view,
      model
    );
    const grabbedParticlePosition = vec3.scaleAndAdd(
      vec3.create(),
      rayOrigin,
      rayDirection,
      this.grabbedParticleDistanceFromCamera
    );
    if (grabbedParticlePosition[1] < 0) {
      vec3.scaleAndAdd(
        grabbedParticlePosition,
        rayOrigin,
        rayDirection,
        rayOrigin[1] / -rayDirection[1]
      );
    }
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.particlePositionsFBO);
    this.setGrabbedParticlePositionShader.use();
    this.setGrabbedParticlePositionShader.setInt(
      "grabbedParticleId",
      this.grabbedParticleId
    );
    this.setGrabbedParticlePositionShader.setFloat(
      "numParticles",
      this.numParticles
    );
    this.setGrabbedParticlePositionShader.setVec3(
      "grabbedParticlePosition",
      grabbedParticlePosition[0],
      grabbedParticlePosition[1],
      grabbedParticlePosition[2]
    );
    this.gl.drawArrays(this.gl.POINTS, 0, 1);

    let groupStart = 0;
    for (const groupSize of this.constraintGroupSizes) {
      if (groupSize == 0) continue;

      this.gl.bindFramebuffer(
        this.gl.FRAMEBUFFER,
        this.constraintsPrepBufferFBO
      );
      this.gl.viewport(
        0,
        0,
        MAX_TEXTURE_WIDTH,
        Math.ceil((this.constraints.length * 2) / MAX_TEXTURE_WIDTH)
      );
      this.prepConstraintsShader.use();
      this.prepConstraintsShader.setInt("particlePositions", 0);
      this.prepConstraintsShader.setInt("particleWeights", 2);
      this.prepConstraintsShader.setInt("constraints", 4);
      this.prepConstraintsShader.setInt(
        "numConstraints",
        this.constraints.length
      );
      this.prepConstraintsShader.setInt("groupStart", groupStart);
      this.prepConstraintsShader.setInt("groupSize", groupSize);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.particlePositionsFBO);
      this.gl.viewport(
        0,
        0,
        MAX_TEXTURE_WIDTH,
        Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH)
      );
      this.solveConstraintsShader.use();
      this.solveConstraintsShader.setInt("constraints", 4);
      this.solveConstraintsShader.setInt("constraintsPrepInfo", 5);
      this.solveConstraintsShader.setFloat("numParticles", this.numParticles);
      this.solveConstraintsShader.setInt("startConstraintId", groupStart);
      this.solveConstraintsShader.setFloat("dt", dt);
      this.gl.drawArrays(this.gl.POINTS, 0, groupSize * 2);

      groupStart += groupSize;
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    this.particleCollisionShader.use();
    this.particleCollisionShader.setInt("particlePositions", 0);
    this.particleCollisionShader.setInt("spherePositionsAndRadii", 8);
    this.particleCollisionShader.setInt("numParticles", this.numParticles);
    this.particleCollisionShader.setInt("numSpheres", this.numSpheres);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.copyTexImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.numParticles / MAX_TEXTURE_WIDTH),
      0
    );

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.particleVelocitiesFBO);
    this.updateVelocityShader.use();
    this.updateVelocityShader.setInt("particlePositions", 0);
    this.updateVelocityShader.setInt("particlePrevPositions", 1);
    this.updateVelocityShader.setInt("spherePositionsAndRadii", 8);
    this.updateVelocityShader.setInt("numParticles", this.numParticles);
    this.updateVelocityShader.setInt("numSpheres", this.numSpheres);
    this.updateVelocityShader.setFloat("dt", dt);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  render(projection: mat4, view: mat4, model: mat4, lightDir: vec3) {
    const lightPos: vec3 = [20, 20, 20];
    this.renderShadowMap(model, lightPos, lightDir);
    this.renderColor(projection, view, model, lightPos, lightDir);
  }

  renderShadowMap(model: mat4, lightPos: vec3, lightDir: vec3) {
    const projection = mat4.orthoNO(mat4.create(), -22, 22, -13, 13, 1, 100);
    const view = mat4.lookAt(
      mat4.create(),
      lightPos,
      vec3.add(vec3.create(), lightPos, lightDir),
      vec3.fromValues(0, 1, 0)
    );

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.shadowMapFBO);
    this.gl.viewport(0, 0, SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT);
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

    this.renderClothDepth(projection, view, model);
    this.renderFloorDepth(
      projection,
      view,
      model,
      Math.ceil(SIM_WIDTH),
      Math.ceil(SIM_DEPTH)
    );
    this.renderSpheresDepth(projection, view, model);
  }

  renderColor(
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3,
    lightDir: vec3
  ) {
    const shadowProjection = mat4.orthoNO(
      mat4.create(),
      -22,
      22,
      -13,
      13,
      1,
      100
    );
    const shadowView = mat4.lookAt(
      mat4.create(),
      lightPos,
      vec3.add(vec3.create(), lightPos, lightDir),
      vec3.fromValues(0, 1, 0)
    );

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.renderClothColor(
      projection,
      view,
      model,
      shadowProjection,
      shadowView,
      lightDir
    );
    this.renderFloorColor(
      projection,
      view,
      model,
      shadowProjection,
      shadowView,
      lightDir,
      Math.ceil(SIM_WIDTH),
      Math.ceil(SIM_DEPTH)
    );
    this.renderSpheresColor(
      projection,
      view,
      model,
      shadowProjection,
      shadowView,
      lightDir
    );
  }

  renderClothDepth(projection: mat4, view: mat4, model: mat4) {
    this.clothRenderer.renderDepth(projection, view, model);
  }

  renderClothColor(
    projection: mat4,
    view: mat4,
    model: mat4,
    shadowProjection: mat4,
    shadowView: mat4,
    lightDir: vec3
  ) {
    this.clothRenderer.render(
      projection,
      view,
      model,
      shadowProjection,
      shadowView,
      lightDir
    );
  }

  renderFloorDepth(
    projection: mat4,
    view: mat4,
    model: mat4,
    numTilesX: number,
    numTilesZ: number
  ) {
    const composed = mat4.translate(
      mat4.create(),
      model,
      vec3.fromValues(-numTilesX / 2, -0.001, -numTilesZ / 2)
    );
    this.tileRenderer.renderDepth(
      projection,
      view,
      composed,
      numTilesX,
      numTilesZ
    );
  }

  renderFloorColor(
    projection: mat4,
    view: mat4,
    model: mat4,
    shadowProjection: mat4,
    shadowView: mat4,
    lightDir: vec3,
    numTilesX: number,
    numTilesZ: number
  ) {
    const composed = mat4.translate(
      mat4.create(),
      model,
      vec3.fromValues(-numTilesX / 2, -0.001, -numTilesZ / 2)
    );
    this.tileRenderer.render(
      projection,
      view,
      composed,
      shadowProjection,
      shadowView,
      lightDir,
      numTilesX,
      numTilesZ
    );
  }

  renderSpheresDepth(projection: mat4, view: mat4, model: mat4) {
    this.sphereRenderer.renderDepth(projection, view, model, this.numSpheres);
  }

  renderSpheresColor(
    projection: mat4,
    view: mat4,
    model: mat4,
    shadowProjection: mat4,
    shadowView: mat4,
    lightDir: vec3
  ) {
    this.sphereRenderer.render(
      projection,
      view,
      model,
      shadowProjection,
      shadowView,
      lightDir,
      this.numSpheres
    );
  }
}

export default Space;
