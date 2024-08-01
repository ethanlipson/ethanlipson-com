import { vec3, mat4 } from 'gl-matrix';
import Shader from './shader';
import SmoothRenderer from './smoothRenderer';
import SphereRenderer from './sphereRenderer';
import TileRenderer from './tileRenderer';

const GRAVITY = [0, -9.8, 0];
const KERNEL_RADIUS = 0.35;
const REST_DENSITY = 600;
const PRESSURE_EPSILON = 800;
const TENSION_DELTA_Q = 0.1 * KERNEL_RADIUS;
const TENSION_K = 0.01;
const TENSION_N = 4;
const VISCOSITY_C = 0.0002;
const VORTICITY_EPSILON = 0.015;
const COLLISION_RESTITUTION = 0.0;

const MIN_X = -4;
const MAX_X = 4;
const MIN_Y = -3;
const MAX_Y = 2;
const MIN_Z = -2;
const MAX_Z = 2;

const NUM_TILES_X = 50;
const NUM_TILES_Y = 10;
const NUM_TILES_Z = 20;

const MAX_TEXTURE_WIDTH = 1024;

const TENSION_KERNEL =
  (315 / (64 * Math.PI * Math.pow(KERNEL_RADIUS, 9))) *
  Math.pow(
    KERNEL_RADIUS * KERNEL_RADIUS - TENSION_DELTA_Q * TENSION_DELTA_Q,
    3
  );

const NUM_CELLS_X = Math.ceil((MAX_X - MIN_X) / KERNEL_RADIUS) + 2;
const NUM_CELLS_Y = Math.ceil((MAX_Y - MIN_Y) / KERNEL_RADIUS) + 2;
const NUM_CELLS_Z = Math.ceil((MAX_Z - MIN_Z) / KERNEL_RADIUS) + 2;

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

const applyExternalForcesFragmentShader = `#version 300 es

  precision highp float;

  uniform float dt;

  uniform sampler2D particleVelocities;

  out vec4 particleCopyVelocity;

  void main() {
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 gravity = vec3(float(${GRAVITY[0]}), float(${GRAVITY[1]}), float(${GRAVITY[2]}));
    particleCopyVelocity = vec4(velocity + gravity * dt, 1.0);
  }
`;

const predictPositionFragmentShader = `#version 300 es

  precision highp float;

  uniform float dt;
  
  uniform sampler2D particlePositions;
  uniform sampler2D particleVelocities;
  
  out vec4 particleNextPosition;

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_FragCoord.xy), 0).xyz;
    particleNextPosition = vec4(position + velocity * dt, 1.0);
  }
`;

const calculateDensityFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform int numParticles;

  uniform sampler2D particlePositions;
  uniform isampler2D cellStartIndices;

  out vec4 particleDensity;

  float poly6(vec3 r) {
    return ${315.0 / (64.0 * Math.PI * Math.pow(KERNEL_RADIUS, 9))} * pow(${
  KERNEL_RADIUS * KERNEL_RADIUS
} - dot(r, r), 3.0);
  }

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    int id = int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH} + int(gl_FragCoord.x);

    float density = 0.0;

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

            vec3 neighborPosition = texelFetch(particlePositions, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 r = position - neighborPosition;
            if (dot(r, r) >= ${KERNEL_RADIUS * KERNEL_RADIUS}) {
              continue;
            }

            density += poly6(r);
          }
        }
      }
    }

    particleDensity = vec4(density, 0.0, 0.0, 1.0);
  }
`;

const calculateLambdaFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform int numParticles;

  uniform sampler2D particlePositions;
  uniform sampler2D particleDensities;
  uniform isampler2D cellStartIndices;

  out vec4 particleLambda;

  vec3 spikyGradient(vec3 r) {
    return ${
      -45.0 / (Math.PI * Math.pow(KERNEL_RADIUS, 6))
    } * pow(${KERNEL_RADIUS} - length(r), 2.0) * normalize(r);
  }

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    float density = texelFetch(particleDensities, ivec2(gl_FragCoord.xy), 0).x;
    int id = int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH} + int(gl_FragCoord.x);

    vec3 selfGradient = vec3(0.0, 0.0, 0.0);
    float dotProduct = 0.0;


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

            vec3 neighborPosition = texelFetch(particlePositions, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 r = position - neighborPosition;
            if (dot(r, r) >= ${KERNEL_RADIUS * KERNEL_RADIUS}) {
              continue;
            }

            vec3 gradient = spikyGradient(r);

            vec3 neighborGradient = -gradient / float(${REST_DENSITY});
            dotProduct += dot(neighborGradient, neighborGradient);

            selfGradient += gradient;
          }
        }
      }
    }

    selfGradient /= float(${REST_DENSITY});
    dotProduct += dot(selfGradient, selfGradient);
    float lambda = -(density / float(${REST_DENSITY}) - 1.0) / (dotProduct + float(${PRESSURE_EPSILON}));

    particleLambda = vec4(lambda, 0.0, 0.0, 1.0);
  }
`;

const calculateDeltaPFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform int numParticles;

  uniform sampler2D particlePositions;
  uniform sampler2D particleLambdas;
  uniform isampler2D cellStartIndices;

  out vec4 particleDeltaP;

  float poly6(vec3 r) {
    return ${315.0 / (64.0 * Math.PI * Math.pow(KERNEL_RADIUS, 9))} * pow(${
  KERNEL_RADIUS * KERNEL_RADIUS
} - dot(r, r), 3.0);
  }

  vec3 spikyGradient(vec3 r) {
    return ${
      -45.0 / (Math.PI * Math.pow(KERNEL_RADIUS, 6))
    } * pow(${KERNEL_RADIUS} - length(r), 2.0) * normalize(r);
  }

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    float lambda = texelFetch(particleLambdas, ivec2(gl_FragCoord.xy), 0).x;
    int id = int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH} + int(gl_FragCoord.x);

    vec3 deltaP = vec3(0.0, 0.0, 0.0);

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

            vec3 neighborPosition = texelFetch(particlePositions, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 r = position - neighborPosition;
            if (dot(r, r) >= ${KERNEL_RADIUS * KERNEL_RADIUS}) {
              continue;
            }

            float tensileCorrection = float(${-TENSION_K}) * pow(poly6(r) / float(${TENSION_KERNEL}), float(${TENSION_N}));

            float neighborLambda = texelFetch(particleLambdas, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).x;
            deltaP += (lambda + neighborLambda + tensileCorrection) * spikyGradient(r);
          }
        }
      }
    }

    deltaP /= float(${REST_DENSITY});
    particleDeltaP = vec4(deltaP, 1.0);
  }
`;

const applyDeltaPFragmentShader = `#version 300 es

  precision highp float;

  uniform sampler2D particlePositions;
  uniform sampler2D particleNextPositions;
  uniform sampler2D particleDeltaPs;

  out vec4 particleNextPositionCopy;

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 nextPosition = texelFetch(particleNextPositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 deltaP = texelFetch(particleDeltaPs, ivec2(gl_FragCoord.xy), 0).xyz;

    ivec2 nextParticleId = ivec2(gl_FragCoord.xy) + ivec2(1, 0);
    if (nextParticleId.x >= ${MAX_TEXTURE_WIDTH}) {
      nextParticleId.x = 0;
      nextParticleId.y++;
    }
    vec3 neighborPosition = texelFetch(particlePositions, nextParticleId, 0).xyz;

    nextPosition += deltaP;

    if (nextPosition.x > float(${MAX_X}) || nextPosition.x < float(${MIN_X})) {
      nextPosition.x = position.x + float(${COLLISION_RESTITUTION}) * (position.x - nextPosition.x);
    }
    if (nextPosition.y > float(${MAX_Y}) || nextPosition.y < float(${MIN_Y})) {
      nextPosition.y = position.y + float(${COLLISION_RESTITUTION}) * (position.y - nextPosition.y);
    }
    if (nextPosition.z > float(${MAX_Z}) || nextPosition.z < float(${MIN_Z})) {
      nextPosition.z = position.z + float(${COLLISION_RESTITUTION}) * (position.z - nextPosition.z);
    }
    
    if (nextPosition.x >= -0.5 && position.y >= 0.0 && nextPosition.y < 0.0) {
      nextPosition.y = position.y + float(${COLLISION_RESTITUTION}) * (position.y - nextPosition.y);
    }
    if (nextPosition.x <= 0.5 && position.y >= -2.0 && nextPosition.y < -2.0) {
      nextPosition.y = position.y + float(${COLLISION_RESTITUTION}) * (position.y - nextPosition.y);
    }

    if (nextPosition.y <= -2.85) {
      nextPosition.y += 4.85;
      // nextPosition -= vec3(0.5, -3.0, 0.0);
      // nextPosition = vec3(-nextPosition.y, nextPosition.x, nextPosition.z);
      // nextPosition += vec3(-3.85, -2.0, 0.0);
      // nextPosition.y = (0.5 - nextPosition.y) * 0.5 + nextPosition.y;
      // nextPosition.z *= 0.5;
    }

    particleNextPositionCopy = vec4(nextPosition, 1.0);
  }
`;

const updateVelocityFragmentShader = `#version 300 es

  precision highp float;

  uniform float dt;

  uniform sampler2D particlePositions;
  uniform sampler2D particleNextPositions;

  out vec4 particleVelocity;

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 nextPosition = texelFetch(particleNextPositions, ivec2(gl_FragCoord.xy), 0).xyz;

    bool teleported = false;
    if (nextPosition.y >= -1.0 && position.y < -2.0) {
      position.y += 4.85;
      // position -= vec3(0.5, -3.0, 0.0);
      // position = vec3(-position.y, position.x, position.z);
      // position += vec3(-3.85, -2.0, 0.0);
      // position.y = (0.5 - position.y) * 0.5 + position.y;
      // position.z *= 0.5;
      // teleported = true;
    }

    vec3 velocity = (nextPosition - position) / dt;
    if (teleported) velocity = vec3(6.0, 3.0, 0.0);
    particleVelocity = vec4(velocity, 1.0);
  }
`;

const applyViscosityFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform int numParticles;

  uniform sampler2D particlePositions;
  uniform sampler2D particleVelocities;
  uniform isampler2D cellStartIndices;

  out vec4 particleVelocityCopy;

  float poly6(vec3 r) {
    return ${315.0 / (64.0 * Math.PI * Math.pow(KERNEL_RADIUS, 9))} * pow(${
  KERNEL_RADIUS * KERNEL_RADIUS
} - dot(r, r), 3.0);
  }

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_FragCoord.xy), 0).xyz;
    int id = int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH} + int(gl_FragCoord.x);

    vec3 viscosity = vec3(0.0, 0.0, 0.0);

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

            vec3 neighborPosition = texelFetch(particlePositions, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 r = position - neighborPosition;
            if (dot(r, r) >= ${KERNEL_RADIUS * KERNEL_RADIUS}) {
              continue;
            }

            vec3 neighborVelocity = texelFetch(particleVelocities, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 v_ij = neighborVelocity - velocity;
            viscosity += v_ij * poly6(r);
          }
        }
      }
    }

    viscosity *= float(${VISCOSITY_C});
    particleVelocityCopy = vec4(velocity + viscosity, 1.0);
  }
`;

const calculateOmegaFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;
  
  uniform int numParticles;

  uniform sampler2D particlePositions;
  uniform sampler2D particleVelocities;
  uniform isampler2D cellStartIndices;

  out vec4 particleOmega;

  vec3 spikyGradient(vec3 r) {
    return ${
      -45.0 / (Math.PI * Math.pow(KERNEL_RADIUS, 6))
    } * pow(${KERNEL_RADIUS} - length(r), 2.0) * normalize(r);
  }

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_FragCoord.xy), 0).xyz;
    int id = int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH} + int(gl_FragCoord.x);

    vec3 omega = vec3(0.0, 0.0, 0.0);

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

            vec3 neighborPosition = texelFetch(particlePositions, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 r = position - neighborPosition;
            if (dot(r, r) >= ${KERNEL_RADIUS * KERNEL_RADIUS}) {
              continue;
            }

            vec3 neighborVelocity = texelFetch(particleVelocities, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 v_ij = neighborVelocity - velocity;
            omega += cross(v_ij, spikyGradient(r));
          }
        }
      }
    }

    particleOmega = vec4(omega, 1.0);
  }
`;

const applyVorticityFragmentShader = `#version 300 es

  precision highp float;
  precision highp isampler2D;

  uniform float dt;
  uniform int numParticles;

  uniform sampler2D particlePositions;
  uniform sampler2D particleVelocities;
  uniform sampler2D particleOmegas;
  uniform isampler2D cellStartIndices;

  out vec4 particleVelocityCopy;

  vec3 spikyGradient(vec3 r) {
    return ${
      -45.0 / (Math.PI * Math.pow(KERNEL_RADIUS, 6))
    } * pow(${KERNEL_RADIUS} - length(r), 2.0) * normalize(r);
  }

  void main() {
    vec3 position = texelFetch(particlePositions, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(particleVelocities, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 omega = texelFetch(particleOmegas, ivec2(gl_FragCoord.xy), 0).xyz;
    int id = int(gl_FragCoord.y) * ${MAX_TEXTURE_WIDTH} + int(gl_FragCoord.x);

    vec3 eta = vec3(0.0, 0.0, 0.0);


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

            vec3 neighborPosition = texelFetch(particlePositions, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            vec3 r = position - neighborPosition;
            if (dot(r, r) >= ${KERNEL_RADIUS * KERNEL_RADIUS}) {
              continue;
            }

            vec3 neighborOmega = texelFetch(particleOmegas, ivec2(neighbor % ${MAX_TEXTURE_WIDTH}, neighbor / ${MAX_TEXTURE_WIDTH}), 0).xyz;
            eta += length(neighborOmega) * spikyGradient(r);
          }
        }
      }
    }

    if (eta == vec3(0.0, 0.0, 0.0)) {
      particleVelocityCopy = vec4(velocity, 1.0);
      return;
    }
    
    vec3 vorticity = float(${VORTICITY_EPSILON}) * cross(normalize(eta), omega);
    particleVelocityCopy = vec4(velocity + vorticity * dt, 1.0);
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

  fluidRenderer: SphereRenderer;
  tileRenderer: TileRenderer;

  particleComputeVAO: WebGLVertexArrayObject;
  particlePositions: WebGLTexture;
  particlePositionsFBO: WebGLFramebuffer;
  particleVelocities: WebGLTexture;
  particleVelocitiesFBO: WebGLFramebuffer;
  particleCopyBuffer: WebGLTexture;
  particleCopyBufferFBO: WebGLFramebuffer;
  particleNextPositions: WebGLTexture;
  particleNextPositionsFBO: WebGLFramebuffer;
  particleDensities: WebGLTexture;
  particleDensitiesFBO: WebGLFramebuffer;
  particleLambdas: WebGLTexture;
  particleLambdasFBO: WebGLFramebuffer;
  particleDeltaPs: WebGLTexture;
  particleDeltaPsFBO: WebGLFramebuffer;
  particleOmegas: WebGLTexture;
  particleOmegasFBO: WebGLFramebuffer;
  sortedParticleIndices: WebGLTexture;
  sortedParticlePositions: WebGLTexture;
  sortedParticlePositionsFBO: WebGLFramebuffer;
  sortedParticleVelocities: WebGLTexture;
  sortedParticleVelocitiesFBO: WebGLFramebuffer;
  sortedParticleIndicesCopyBuffer: Int32Array;
  cellStartIndices: WebGLTexture;
  cellStartIndicesCopyBuffer: Int32Array;
  sortParticlePositionsShader: Shader;
  sortParticleVelocitiesShader: Shader;
  applyExternalForcesShader: Shader;
  predictPositionShader: Shader;
  calculateDensityShader: Shader;
  calculateLambdaShader: Shader;
  calculateDeltaPShader: Shader;
  applyDeltaPShader: Shader;
  updateVelocityShader: Shader;
  applyViscosityShader: Shader;
  calculateOmegaShader: Shader;
  applyVorticityShader: Shader;

  addedParticles: Particle[];
  positionsCopyBuffer: Float32Array;
  velocitiesCopyBuffer: Float32Array;

  constructor(gl: WebGL2RenderingContext, maxParticles: number) {
    this.numParticles = 0;
    this.maxParticles = maxParticles;

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

    this.fluidRenderer = new SphereRenderer(gl);
    this.tileRenderer = new TileRenderer(gl);

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

    this.sortedParticlePositions = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE10);
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

    this.sortedParticleVelocities = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE11);
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

    this.particleCopyBuffer = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.particleCopyBuffer);
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

    this.particleCopyBufferFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleCopyBuffer,
      0
    );

    this.particleNextPositions = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.particleNextPositions);
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

    this.particleNextPositionsFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleNextPositionsFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleNextPositions,
      0
    );

    this.particleDensities = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.particleDensities);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RED,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particleDensitiesFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleDensitiesFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleDensities,
      0
    );

    this.particleLambdas = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.particleLambdas);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0,
      gl.RED,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.particleLambdasFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleLambdasFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleLambdas,
      0
    );

    this.particleDeltaPs = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.particleDeltaPs);
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

    this.particleDeltaPsFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleDeltaPsFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleDeltaPs,
      0
    );

    this.particleOmegas = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, this.particleOmegas);
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

    this.particleOmegasFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleOmegasFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleOmegas,
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
    this.applyExternalForcesShader = new Shader(
      gl,
      fullscreenVertexShader,
      applyExternalForcesFragmentShader
    );
    this.predictPositionShader = new Shader(
      gl,
      fullscreenVertexShader,
      predictPositionFragmentShader
    );
    this.calculateDensityShader = new Shader(
      gl,
      fullscreenVertexShader,
      calculateDensityFragmentShader
    );
    this.calculateLambdaShader = new Shader(
      gl,
      fullscreenVertexShader,
      calculateLambdaFragmentShader
    );
    this.calculateDeltaPShader = new Shader(
      gl,
      fullscreenVertexShader,
      calculateDeltaPFragmentShader
    );
    this.applyDeltaPShader = new Shader(
      gl,
      fullscreenVertexShader,
      applyDeltaPFragmentShader
    );
    this.updateVelocityShader = new Shader(
      gl,
      fullscreenVertexShader,
      updateVelocityFragmentShader
    );
    this.applyViscosityShader = new Shader(
      gl,
      fullscreenVertexShader,
      applyViscosityFragmentShader
    );
    this.calculateOmegaShader = new Shader(
      gl,
      fullscreenVertexShader,
      calculateOmegaFragmentShader
    );
    this.applyVorticityShader = new Shader(
      gl,
      fullscreenVertexShader,
      applyVorticityFragmentShader
    );
  }

  static poly6(r: vec3) {
    return (
      (315 / (64 * Math.PI * Math.pow(KERNEL_RADIUS, 9))) *
      Math.pow(KERNEL_RADIUS * KERNEL_RADIUS - vec3.squaredLength(r), 3)
    );
  }

  static poly6Gradient(r: vec3) {
    return vec3.scale(
      vec3.create(),
      r,
      (-945 / (32 * Math.PI * Math.pow(KERNEL_RADIUS, 9))) *
        Math.pow(KERNEL_RADIUS * KERNEL_RADIUS - vec3.squaredLength(r), 2)
    );
  }

  addParticle(position: vec3, velocity: vec3) {
    if (this.numParticles + this.addedParticles.length >= this.maxParticles) {
      return;
    }

    const particle = { position, velocity };
    this.addedParticles.push(particle);
  }

  step(gl: WebGL2RenderingContext, dt: number) {
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

      const hash =
        cellX * NUM_CELLS_Y * NUM_CELLS_Z + cellY * NUM_CELLS_Z + cellZ;
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    this.applyExternalForcesShader.use(gl);
    gl.uniform1f(
      gl.getUniformLocation(this.applyExternalForcesShader.program, 'dt'),
      dt
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyExternalForcesShader.program,
        'particleVelocities'
      ),
      11
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE11);
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleNextPositionsFBO);
    this.predictPositionShader.use(gl);
    gl.uniform1f(
      gl.getUniformLocation(this.predictPositionShader.program, 'dt'),
      dt
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.predictPositionShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.predictPositionShader.program,
        'particleVelocities'
      ),
      11
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleDensitiesFBO);
    this.calculateDensityShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateDensityShader.program,
        'numParticles'
      ),
      this.numParticles
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateDensityShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateDensityShader.program,
        'cellStartIndices'
      ),
      9
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleLambdasFBO);
    this.calculateLambdaShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.calculateLambdaShader.program, 'numParticles'),
      this.numParticles
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateLambdaShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateLambdaShader.program,
        'particleDensities'
      ),
      4
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateLambdaShader.program,
        'cellStartIndices'
      ),
      9
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleDeltaPsFBO);
    this.calculateDeltaPShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.calculateDeltaPShader.program, 'numParticles'),
      this.numParticles
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateDeltaPShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateDeltaPShader.program,
        'particleLambdas'
      ),
      5
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateDeltaPShader.program,
        'cellStartIndices'
      ),
      9
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    this.applyDeltaPShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyDeltaPShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyDeltaPShader.program,
        'particleNextPositions'
      ),
      3
    );
    gl.uniform1i(
      gl.getUniformLocation(this.applyDeltaPShader.program, 'particleDeltaPs'),
      6
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE3);
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sortedParticleVelocitiesFBO);
    this.updateVelocityShader.use(gl);
    gl.uniform1f(
      gl.getUniformLocation(this.updateVelocityShader.program, 'dt'),
      dt
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.updateVelocityShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.updateVelocityShader.program,
        'particleNextPositions'
      ),
      3
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    this.applyViscosityShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.applyViscosityShader.program, 'numParticles'),
      this.numParticles
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyViscosityShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyViscosityShader.program,
        'particleVelocities'
      ),
      11
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyViscosityShader.program,
        'cellStartIndices'
      ),
      9
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE11);
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleOmegasFBO);
    this.calculateOmegaShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.calculateOmegaShader.program, 'numParticles'),
      this.numParticles
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateOmegaShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateOmegaShader.program,
        'particleVelocities'
      ),
      11
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.calculateOmegaShader.program,
        'cellStartIndices'
      ),
      9
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleCopyBufferFBO);
    this.applyVorticityShader.use(gl);
    gl.uniform1f(
      gl.getUniformLocation(this.applyVorticityShader.program, 'dt'),
      dt
    );
    gl.uniform1i(
      gl.getUniformLocation(this.applyVorticityShader.program, 'numParticles'),
      this.numParticles
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyVorticityShader.program,
        'particlePositions'
      ),
      10
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyVorticityShader.program,
        'particleVelocities'
      ),
      11
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyVorticityShader.program,
        'particleOmegas'
      ),
      7
    );
    gl.uniform1i(
      gl.getUniformLocation(
        this.applyVorticityShader.program,
        'cellStartIndices'
      ),
      9
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE1);
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleNextPositionsFBO);
    gl.activeTexture(gl.TEXTURE0);
    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      0,
      0,
      MAX_TEXTURE_WIDTH,
      Math.ceil(this.maxParticles / MAX_TEXTURE_WIDTH),
      0
    );
  }

  draw(
    gl: WebGL2RenderingContext,
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3,
    cameraPos: vec3
  ) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.translate(mat4.create(), model, [-25, MIN_Y, MIN_Z]),
        [0.5, 1, 0.5]
      ),
      lightPos,
      51,
      40
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.translate(mat4.create(), model, [0.5, MIN_Y, MAX_Z]),
        [0.5, 1, 0.5]
      ),
      lightPos,
      7,
      32,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.translate(mat4.create(), model, [4, MIN_Y, MIN_Z]),
        [0.5, 1, 0.5]
      ),
      lightPos,
      42,
      40
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateX(
          mat4.create(),
          mat4.translate(mat4.create(), model, [-50 / 2, MIN_Y, MIN_Z]),
          -Math.PI / 2
        ),
        [0.5, 1, 0.5]
      ),
      lightPos,
      100,
      20,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.translate(mat4.create(), model, [-0.5, -1, -2]),
        [0.25, 1, 0.25]
      ),
      lightPos,
      18,
      16
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.translate(mat4.create(), model, [-0.5, -1.25, -2]),
        [0.25, 1, 0.25]
      ),
      lightPos,
      18,
      16
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateX(
          mat4.create(),
          mat4.translate(mat4.create(), model, [-0.5, -1, 2]),
          Math.PI / 2
        ),
        [0.25, 1, 0.25]
      ),
      lightPos,
      18,
      1,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateZ(
          mat4.create(),
          mat4.translate(mat4.create(), model, [-0.5, -1.25, -2]),
          Math.PI / 2
        ),
        [0.25, 1, 0.25]
      ),
      lightPos,
      1,
      16
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateZ(
          mat4.create(),
          mat4.translate(mat4.create(), model, [4, -1.25, -2]),
          Math.PI / 2
        ),
        [0.25, 1, 0.25]
      ),
      lightPos,
      1,
      16,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateX(
          mat4.create(),
          mat4.translate(mat4.create(), model, [0.5, MIN_Y, MIN_Z]),
          Math.PI / 2
        ),
        [0.5, 1, 0.5]
      ),
      lightPos,
      7,
      2,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateX(
          mat4.create(),
          mat4.translate(mat4.create(), model, [0.5, MIN_Y, MAX_Z]),
          Math.PI / 2
        ),
        [0.5, 1, 0.5]
      ),
      lightPos,
      7,
      2,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateZ(
          mat4.create(),
          mat4.translate(mat4.create(), model, [0.5, -4, MIN_Z]),
          Math.PI / 2
        ),
        [0.5, 1, 0.5]
      ),
      lightPos,
      2,
      8,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.rotateZ(
          mat4.create(),
          mat4.translate(mat4.create(), model, [4, MIN_Y - 1, MIN_Z]),
          Math.PI / 2
        ),
        [0.5, 1, 0.5]
      ),
      lightPos,
      2,
      8,
      true
    );
    this.tileRenderer.render(
      gl,
      projection,
      view,
      mat4.scale(
        mat4.create(),
        mat4.translate(mat4.create(), model, [0.5, MIN_Y - 1, MIN_Z]),
        [0.5, 1, 0.5]
      ),
      lightPos,
      7,
      8
    );

    this.fluidRenderer.render(
      gl,
      projection,
      view,
      mat4.translate(mat4.create(), model, [0, -1, 0]),
      lightPos,
      this.numParticles
    );
  }
}

export default Space;
