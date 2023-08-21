import { vec3, mat4 } from 'gl-matrix';
import Shader from './shader';

const KERNEL_RADIUS = 1.0;

const SPHERE_ITERATIONS = 16;
const SPHERE_RADIUS = 0.06;

const MIN_X = -20;
const MAX_X = 20;
const MIN_Y = -20;
const MAX_Y = 20;
const MIN_Z = -20;
const MAX_Z = 20;

const NUM_CELLS_X = Math.ceil((MAX_X - MIN_X) / KERNEL_RADIUS) + 2;
const NUM_CELLS_Y = Math.ceil((MAX_Y - MIN_Y) / KERNEL_RADIUS) + 2;
const NUM_CELLS_Z = Math.ceil((MAX_Z - MIN_Z) / KERNEL_RADIUS) + 2;

const MAX_TEXTURE_WIDTH = 1024;

const edgeVertexShader = `#version 300 es

  in vec3 position;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  void main() {
    gl_Position = projection * view * model * vec4(position, 1.0);
  }
`;

const edgeFragmentShader = `#version 300 es

  precision highp float;
  
  out vec4 FragColor;

  void main() {
    FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

const sphereVertexShader = `#version 300 es

  precision highp sampler2D;

  in vec3 offsetPosition;
  in vec3 color;

  uniform sampler2D particlePositions;
  uniform sampler2D particleVelocities;
  
  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  out vec3 fragColor;

  void main() {
    vec3 center = texelFetch(particlePositions, ivec2(gl_InstanceID % ${MAX_TEXTURE_WIDTH}, gl_InstanceID / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_InstanceID % ${MAX_TEXTURE_WIDTH}, gl_InstanceID / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    // vec3 velocity = vec3(1.0, 0.0, 0.0);

    vec3 forward = normalize(velocity);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = normalize(cross(right, forward));

    // Transposed
    // https://www.khronos.org/opengl/wiki/Data_Type_(GLSL)
    // https://computergraphics.stackexchange.com/a/7581
    mat4 targetTo = mat4(
      right.x, right.y, right.z, 0.0,
      up.x, up.y, up.z, 0.0,
      forward.x, forward.y, forward.z, 0.0,
      0.0, 0.0, 0.0, 1.0);
    vec3 rotatedOffset = vec3(targetTo * vec4(offsetPosition, 1.0));

    gl_Position = projection * view * model * vec4(center + rotatedOffset, 1.0);
    fragColor = color;
  }
`;

const sphereFragmentShader = `#version 300 es

  precision highp float;

  in vec3 fragColor;

  out vec4 FragColor;

  void main() {
    FragColor = vec4(fragColor, 1.0);
  }
`;

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

const sortParticlePositionsFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform sampler2D particlePositions;
  uniform isampler2D sortedParticleIndices;

  out vec4 sortedParticlePosition;

  void main() {
    int particleIndex = texelFetch(sortedParticleIndices, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0).x;
    sortedParticlePosition = texelFetch(particlePositions, ivec2(particleIndex % ${MAX_TEXTURE_WIDTH}, particleIndex / ${MAX_TEXTURE_WIDTH}), 0);
  }
`;

const sortParticleVelocitiesFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform sampler2D particleVelocities;
  uniform isampler2D sortedParticleIndices;

  out vec4 sortedParticleVelocity;

  void main() {
    int particleIndex = texelFetch(sortedParticleIndices, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0).x;
    sortedParticleVelocity = texelFetch(particleVelocities, ivec2(particleIndex % ${MAX_TEXTURE_WIDTH}, particleIndex / ${MAX_TEXTURE_WIDTH}), 0);
  }
`;

const updateVelocityFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform float dt;
  uniform float alignmentCoefficient;
  uniform float cohesionCoefficient;
  uniform float separationCoefficient;
  uniform float targetSeparation;
  uniform float maxSpeed;
  uniform float viewAngle;
  
  uniform sampler2D sortedParticlePositions;
  uniform sampler2D sortedParticleVelocities;
  uniform isampler2D sortedParticleIndices;
  uniform isampler2D cellStartIndices;
  
  out vec4 particleVelocity;

  void main() {
    vec3 position = texelFetch(sortedParticlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(sortedParticleVelocities, ivec2(gl_FragCoord.xy), 0).xyz;
    int id = int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH} + int(gl_FragCoord.x);

    vec3 normalizedVelocity = normalize(velocity);

    vec3 averagePosition = vec3(0.0);
    vec3 averageVelocity = vec3(0.0);
    vec3 separationCorrection = vec3(0.0);
    int numNeighbors = 0;
    int numSeparationNeighbors = 0;

    int cellMinX = int(floor((position.x - float(${MIN_X})) / float(${KERNEL_RADIUS})));
    int cellMaxX = int(floor((position.x - float(${MIN_X})) / float(${KERNEL_RADIUS}))) + 2;
    int cellMinY = int(floor((position.y - float(${MIN_Y})) / float(${KERNEL_RADIUS})));
    int cellMaxY = int(floor((position.y - float(${MIN_Y})) / float(${KERNEL_RADIUS}))) + 2;
    int cellMinZ = int(floor((position.z - float(${MIN_Z})) / float(${KERNEL_RADIUS})));
    int cellMaxZ = int(floor((position.z - float(${MIN_Z})) / float(${KERNEL_RADIUS}))) + 2;

    for (int cellX = cellMinX; cellX <= cellMaxX; cellX++) {
      for (int cellY = cellMinY; cellY <= cellMaxY; cellY++) {
        for (int cellZ = cellMinZ; cellZ <= cellMaxZ; cellZ++) {
          int cellIndex = cellX * ${
            NUM_CELLS_Y * NUM_CELLS_Z
          } + cellY * ${NUM_CELLS_Z} + cellZ;

          int cellStartIndex = texelFetch(cellStartIndices, ivec2(cellIndex % ${MAX_TEXTURE_WIDTH}, cellIndex / ${MAX_TEXTURE_WIDTH}), 0).x;
          int cellEndIndex = texelFetch(cellStartIndices, ivec2((cellIndex + 1) % ${MAX_TEXTURE_WIDTH}, (cellIndex + 1) / ${MAX_TEXTURE_WIDTH}), 0).x;

          for (int neighbor = cellStartIndex; neighbor < cellEndIndex; neighbor++) {
            if (neighbor == id) {
              continue;
            }

            vec3 neighborPosition = texelFetch(sortedParticlePositions, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 r = position - neighborPosition;
            if (dot(r, r) >= float(${KERNEL_RADIUS * KERNEL_RADIUS})) {
              continue;
            }
            if (dot(normalizedVelocity, normalize(r)) < cos(viewAngle)) {
              continue;
            }

            vec3 neighborVelocity = texelFetch(sortedParticleVelocities, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            averageVelocity += neighborVelocity;
            averagePosition += neighborPosition;

            if (dot(r, r) < targetSeparation * targetSeparation) {
              vec3 correction = r / dot(r, r);
              separationCorrection += correction;
              numSeparationNeighbors++;
            }

            numNeighbors++;
          }
        }
      }
    }

    if (numNeighbors == 0) {
      particleVelocity = vec4(velocity, 1.0);
      return;
    }

    particleVelocity = vec4(velocity, 1.0);
    
    averagePosition /= float(numNeighbors);
    averageVelocity /= float(numNeighbors);
    
    vec3 alignmentSteer = normalize(averageVelocity) * maxSpeed - velocity;
    vec3 cohesionSteer = normalize(averagePosition - position) * maxSpeed - velocity;
    vec3 separationSteer = (numSeparationNeighbors != 0) ? (normalize(separationCorrection) * maxSpeed - velocity) : vec3(0.0);

    particleVelocity += vec4(alignmentSteer * alignmentCoefficient, 0.0) * dt;
    particleVelocity += vec4(cohesionSteer * cohesionCoefficient, 0.0) * dt;
    particleVelocity += vec4(separationSteer * separationCoefficient, 0.0) * dt;
  }
`;

const predictPositionFragmentShader = `#version 300 es

  precision highp float;

  uniform float dt;
  
  uniform sampler2D sortedParticlePositions;
  uniform sampler2D particleVelocities;
  
  out vec4 particleNextPosition;

  void main() {
    vec3 position = texelFetch(sortedParticlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_FragCoord.xy), 0).xyz;
    particleNextPosition = vec4(position + velocity * dt, 1.0);

    if (particleNextPosition.x > float(${MAX_X})) {
      particleNextPosition.x = float(${MIN_X});
    }
    else if (particleNextPosition.x < float(${MIN_X})) {
      particleNextPosition.x = float(${MAX_X});
    }

    if (particleNextPosition.y > float(${MAX_Y})) {
      particleNextPosition.y = float(${MIN_Y});
    }
    else if (particleNextPosition.y < float(${MIN_Y})) {
      particleNextPosition.y = float(${MAX_Y});
    }

    if (particleNextPosition.z > float(${MAX_Z})) {
      particleNextPosition.z = float(${MIN_Z});
    }
    else if (particleNextPosition.z < float(${MIN_Z})) {
      particleNextPosition.z = float(${MAX_Z});
    }
  }
`;

class Particle {
  position: vec3;
  velocity: vec3;

  constructor(position: vec3, velocity: vec3) {
    this.position = position;
    this.velocity = velocity;
  }
}

class Space {
  numParticles: number;
  maxParticles: number;

  alignmentCoefficient: number;
  cohesionCoefficient: number;
  separationCoefficient: number;
  targetSeparation: number;
  maxSpeed: number;
  viewAngle: number;

  particleVAO: WebGLVertexArrayObject;
  particleSphereVertexBuffer: WebGLBuffer;
  particleSphereVertices: number[];
  particleShader: Shader;

  particleComputeVAO: WebGLVertexArrayObject;
  particlePositions: WebGLTexture;
  particlePositionsFBO: WebGLFramebuffer;
  particleVelocities: WebGLTexture;
  particleVelocitiesFBO: WebGLFramebuffer;
  sortedParticleVelocities: WebGLTexture;
  sortedParticleVelocitiesFBO: WebGLFramebuffer;
  sortedParticlePositions: WebGLTexture;
  sortedParticlePositionsFBO: WebGLFramebuffer;
  sortedParticleIndices: WebGLTexture;
  sortedParticleIndicesCopyBuffer: Int32Array;
  cellStartIndices: WebGLTexture;
  cellStartIndicesCopyBuffer: Int32Array;
  sortParticlePositionsShader: Shader;
  sortParticleVelocitiesShader: Shader;
  updateVelocityShader: Shader;
  predictPositionShader: Shader;

  addedParticles: Particle[];
  positionsCopyBuffer: Float32Array;
  velocitiesCopyBuffer: Float32Array;

  edgeVAO: WebGLVertexArrayObject;
  edgeVBO: WebGLBuffer;
  edges: Float32Array;
  edgeShader: Shader;

  constructor(
    gl: WebGL2RenderingContext,
    maxParticles: number,
    alignmentCoefficient: number,
    cohesionCoefficient: number,
    separationCoefficient: number,
    targetSeparation: number,
    maxSpeed: number,
    viewAngle: number
  ) {
    this.numParticles = 0;
    this.maxParticles = maxParticles;

    this.alignmentCoefficient = alignmentCoefficient;
    this.cohesionCoefficient = cohesionCoefficient;
    this.separationCoefficient = separationCoefficient;
    this.targetSeparation = targetSeparation;
    this.maxSpeed = maxSpeed;
    this.viewAngle = viewAngle;

    this.addedParticles = [];
    this.positionsCopyBuffer = new Float32Array(
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH) * MAX_TEXTURE_WIDTH * 4
    );
    this.velocitiesCopyBuffer = new Float32Array(
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH) * MAX_TEXTURE_WIDTH * 4
    );
    this.sortedParticleIndicesCopyBuffer = new Int32Array(
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH) * MAX_TEXTURE_WIDTH * 4
    );
    this.cellStartIndicesCopyBuffer = new Int32Array(
      Math.ceil((NUM_CELLS_X * NUM_CELLS_Y * NUM_CELLS_Z) / MAX_TEXTURE_WIDTH) *
        MAX_TEXTURE_WIDTH
    );

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.getExtension('EXT_color_buffer_float');

    /***************** Creating the sphere vertices *****************/

    // prettier-ignore
    this.particleSphereVertices = [
      -0.05, -0.05, -0.1,
      0.5, 0.0, 1.0,
      0.05, -0.05, -0.1,
      0.5, 0.0, 1.0,
      0.0, 0.035, -0.1,
      0.5, 0.0, 1.0,

      -0.05, -0.05, -0.1,
      0.0, 1.0, 0.0,
      0.0, 0.035, -0.1,
      0.0, 1.0, 0.0,
      0.0, 0.0, 0.2,
      0.0, 1.0, 0.0,

      0.05, -0.05, -0.1,
      0.0, 1.0, 1.0,
      0.0, 0.035, -0.1,
      0.0, 1.0, 1.0,
      0.0, 0.0, 0.2,
      0.0, 1.0, 1.0,

      -0.05, -0.05, -0.1,
      0.0, 0.0, 1.0,
      0.05, -0.05, -0.1,
      0.0, 0.0, 1.0,
      0.0, 0.0, 0.2,
      0.0, 0.0, 1.0,
    ];

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
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 6 * 4, 0);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
    gl.enableVertexAttribArray(1);

    this.particleShader = new Shader(gl, sphereVertexShader, sphereFragmentShader);

    /***************** Creating the compute shaders *****************/

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
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
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

    this.particleVelocities = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particleVelocities);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
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

    this.sortedParticleVelocities = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.sortedParticleVelocities);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.sortedParticleVelocitiesFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortedParticleVelocitiesFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.sortedParticleVelocities,
      0
    );

    this.sortedParticlePositions = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.sortedParticlePositions);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.sortedParticlePositionsFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortedParticlePositionsFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.sortedParticlePositions,
      0
    );

    this.sortedParticleIndices = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, this.sortedParticleIndices);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RED_INTEGER,
      gl.INT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.cellStartIndices = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, this.cellStartIndices);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      MAX_TEXTURE_WIDTH,
      Math.ceil((NUM_CELLS_X * NUM_CELLS_Y * NUM_CELLS_Z) / MAX_TEXTURE_WIDTH),
      0,
      gl.RED_INTEGER,
      gl.INT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.sortParticlePositionsShader = new Shader(
      gl,
      fullscreenVertexShader,
      sortParticlePositionsFragmentShader
    );
    this.sortParticleVelocitiesShader = new Shader(
      gl,
      fullscreenVertexShader,
      sortParticleVelocitiesFragmentShader
    );
    this.updateVelocityShader = new Shader(
      gl,
      fullscreenVertexShader,
      updateVelocityFragmentShader
    );
    this.predictPositionShader = new Shader(
      gl,
      fullscreenVertexShader,
      predictPositionFragmentShader
    );

    /***************** Creating the edge buffers *****************/

    // prettier-ignore
    this.edges = new Float32Array([
      MIN_X, MIN_Y, MIN_Z,
      MAX_X, MIN_Y, MIN_Z,
      MIN_X, MAX_Y, MIN_Z, 
      MAX_X, MAX_Y, MIN_Z, 
      MIN_X, MIN_Y, MAX_Z,
      MAX_X, MIN_Y, MAX_Z, 
      MIN_X, MAX_Y, MAX_Z,
      MAX_X, MAX_Y, MAX_Z,
        
      MIN_X, MIN_Y, MIN_Z, 
      MIN_X, MAX_Y, MIN_Z, 
      MAX_X, MIN_Y, MIN_Z, 
      MAX_X, MAX_Y, MIN_Z, 
      MIN_X, MIN_Y, MAX_Z, 
      MIN_X, MAX_Y, MAX_Z, 
      MAX_X, MIN_Y, MAX_Z,
      MAX_X, MAX_Y, MAX_Z, 
         
      MIN_X, MIN_Y, MIN_Z, 
      MIN_X, MIN_Y, MAX_Z,
      MAX_X, MIN_Y, MIN_Z, 
      MAX_X, MIN_Y, MAX_Z, 
      MIN_X, MAX_Y, MIN_Z, 
      MIN_X, MAX_Y, MAX_Z, 
      MAX_X, MAX_Y, MIN_Z, 
      MAX_X, MAX_Y, MAX_Z,
    ]);

    this.edgeVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.edgeVAO);

    this.edgeVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.edges, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.edgeShader = new Shader(gl, edgeVertexShader, edgeFragmentShader);
  }

  addParticle(position: vec3, velocity: vec3) {
    if (this.numParticles + this.addedParticles.length >= this.maxParticles) {
      return;
    }

    const particle = { position, velocity };
    this.addedParticles.push(particle);
  }

  step(gl: WebGL2RenderingContext, dt: number) {
    // ------------------------------------------------------------
    // TODO:
    // DON'T COPY WHEN THERE ARE NO NEW PARTICLES
    // ------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsFBO);
    gl.readPixels(
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      gl.RGBA,
      gl.FLOAT,
      this.positionsCopyBuffer
    );
    for (let i = 0; i < this.addedParticles.length; i++) {
      this.positionsCopyBuffer[(this.numParticles + i) * 4 + 0] =
        this.addedParticles[i].position[0];
      this.positionsCopyBuffer[(this.numParticles + i) * 4 + 1] =
        this.addedParticles[i].position[1];
      this.positionsCopyBuffer[(this.numParticles + i) * 4 + 2] =
        this.addedParticles[i].position[2];
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      gl.RGBA,
      gl.FLOAT,
      this.positionsCopyBuffer
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleVelocitiesFBO);
    gl.readPixels(
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      gl.RGBA,
      gl.FLOAT,
      this.velocitiesCopyBuffer
    );
    for (let i = 0; i < this.addedParticles.length; i++) {
      this.velocitiesCopyBuffer[(this.numParticles + i) * 4 + 0] =
        this.addedParticles[i].velocity[0];
      this.velocitiesCopyBuffer[(this.numParticles + i) * 4 + 1] =
        this.addedParticles[i].velocity[1];
      this.velocitiesCopyBuffer[(this.numParticles + i) * 4 + 2] =
        this.addedParticles[i].velocity[2];
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      gl.RGBA,
      gl.FLOAT,
      this.velocitiesCopyBuffer
    );

    this.numParticles += this.addedParticles.length;
    this.addedParticles = [];

    gl.viewport(
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH)
    );
    gl.bindVertexArray(this.particleComputeVAO);

    const hashes: [number, number][] = [];
    for (let i = 0; i < this.numParticles; i++) {
      const x = this.positionsCopyBuffer[i * 4 + 0];
      const y = this.positionsCopyBuffer[i * 4 + 1];
      const z = this.positionsCopyBuffer[i * 4 + 2];

      const cellX = Math.floor((x - MIN_X) / KERNEL_RADIUS) + 1;
      const cellY = Math.floor((y - MIN_Y) / KERNEL_RADIUS) + 1;
      const cellZ = Math.floor((z - MIN_Z) / KERNEL_RADIUS) + 1;

      const hash = cellX * NUM_CELLS_Y * NUM_CELLS_Z + cellY * NUM_CELLS_Z + cellZ;
      hashes.push([i, hash]);
    }

    hashes.sort((a, b) => a[1] - b[1]);

    this.cellStartIndicesCopyBuffer[0] = 0;
    for (let i = 1; i < hashes.length; i++) {
      if (hashes[i - 1][1] !== hashes[i][1]) {
        for (let j = hashes[i - 1][1] + 1; j <= hashes[i][1]; j++) {
          this.cellStartIndicesCopyBuffer[j] = i;
        }
      }
    }
    for (
      let i = hashes[hashes.length - 1][1] + 1;
      i < NUM_CELLS_X * NUM_CELLS_Y * NUM_CELLS_Z;
      i++
    ) {
      this.cellStartIndicesCopyBuffer[i] = hashes.length - 1;
    }

    hashes.forEach(([particleIndex, hash], index) => {
      this.sortedParticleIndicesCopyBuffer[index] = particleIndex;
    });

    gl.activeTexture(gl.TEXTURE8);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      gl.RED_INTEGER,
      gl.INT,
      this.sortedParticleIndicesCopyBuffer
    );

    gl.activeTexture(gl.TEXTURE9);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil((NUM_CELLS_X * NUM_CELLS_Y * NUM_CELLS_Z) / MAX_TEXTURE_WIDTH),
      gl.RED_INTEGER,
      gl.INT,
      this.cellStartIndicesCopyBuffer
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortedParticlePositionsFBO);
    this.sortParticlePositionsShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(
        this.sortParticlePositionsShader.program,
        'particlePositions'
      ),
      0
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.sortParticlePositionsShader.program,
        'sortedParticleIndices'
      ),
      8
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortedParticleVelocitiesFBO);
    this.sortParticleVelocitiesShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(
        this.sortParticleVelocitiesShader.program,
        'particleVelocities'
      ),
      1
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.sortParticleVelocitiesShader.program,
        'sortedParticleIndices'
      ),
      8
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleVelocitiesFBO);
    this.updateVelocityShader.use(gl);
    gl.uniform1f(gl.getUniformLocation(this.updateVelocityShader.program, 'dt'), dt);
    gl.uniform1f(
      gl.getUniformLocation(this.updateVelocityShader.program, 'alignmentCoefficient'),
      this.alignmentCoefficient
    );
    gl.uniform1f(
      gl.getUniformLocation(this.updateVelocityShader.program, 'cohesionCoefficient'),
      this.cohesionCoefficient
    );
    gl.uniform1f(
      gl.getUniformLocation(this.updateVelocityShader.program, 'separationCoefficient'),
      this.separationCoefficient
    );
    gl.uniform1f(
      gl.getUniformLocation(this.updateVelocityShader.program, 'targetSeparation'),
      this.targetSeparation
    );
    gl.uniform1f(
      gl.getUniformLocation(this.updateVelocityShader.program, 'maxSpeed'),
      this.maxSpeed
    );
    gl.uniform1f(
      gl.getUniformLocation(this.updateVelocityShader.program, 'viewAngle'),
      this.viewAngle
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.updateVelocityShader.program,
        'sortedParticlePositions'
      ),
      3
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.updateVelocityShader.program,
        'sortedParticleVelocities'
      ),
      2
    );
    gl.uniform1i(
      gl.getUniformLocation(this.updateVelocityShader.program, 'sortedParticleIndices'),
      8
    );
    gl.uniform1i(
      gl.getUniformLocation(this.updateVelocityShader.program, 'cellStartIndices'),
      9
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionsFBO);
    this.predictPositionShader.use(gl);
    gl.uniform1f(gl.getUniformLocation(this.predictPositionShader.program, 'dt'), dt);
    gl.uniform1i(
      gl.getUniformLocation(
        this.predictPositionShader.program,
        'sortedParticlePositions'
      ),
      3
    );
    // particleVelocities is already "sorted" since it was copied from sortedParticleVelocities
    gl.uniform1i(
      gl.getUniformLocation(this.predictPositionShader.program, 'particleVelocities'),
      1
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  draw(
    gl: WebGL2RenderingContext,
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3
  ) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.drawParticles(gl, projection, view, model, lightPos);
    this.drawEdges(gl, projection, view, model);
  }

  drawParticles(
    gl: WebGL2RenderingContext,
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3
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
    gl.uniform1i(
      gl.getUniformLocation(this.particleShader.program, 'particleVelocities'),
      1
    );

    gl.drawArraysInstanced(
      gl.TRIANGLES,
      0,
      this.particleSphereVertices.length / 6,
      this.numParticles
    );
  }

  drawEdges(gl: WebGL2RenderingContext, projection: mat4, view: mat4, model: mat4) {
    gl.bindVertexArray(this.edgeVAO);

    this.edgeShader.use(gl);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.edgeShader.program, 'projection'),
      false,
      projection
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.edgeShader.program, 'view'),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.edgeShader.program, 'model'),
      false,
      model
    );

    gl.drawArrays(gl.LINES, 0, this.edges.length / 3);
  }
}

export default Space;
