import { mat4, vec3 } from 'gl-matrix';
import Shader from './shader';

const MAX_METABALLS = 16;

const functionComputeVertexSource = `#version 300 es

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

const functionComputeFragmentSource = `#version 300 es

  precision mediump float;
  precision mediump int;

  uniform int dim;
  uniform int numMetaballs;
  // uniform Metaballs {
  //   vec3 metaballPosition[16];
  //   float metaballRadius[16];
  //   vec3 metaballColor[16];
  // };
  uniform sampler2D metaballData;

  out vec4 FragColor;

  void main() {
    int x = int(gl_FragCoord.x);
    int y = int(gl_FragCoord.y) / dim;
    int z = int(gl_FragCoord.y) % dim;

    float sum = 0.0;

    for (int i = 0; i < numMetaballs; i++) {
      vec3 position = texelFetch(metaballData, ivec2(i, 0), 0).xyz;
      float radius = texelFetch(metaballData, ivec2(i, 1), 0).x;

      float distanceToMetaball = length((vec3(x, y, z) - position));
      sum += radius / pow(distanceToMetaball, 1.0);
    }

    FragColor = vec4(sum, 0.0, 0.0, 1.0);
  }
`;

const metaballVertexSource = `#version 300 es

  int cornerIndexAFromEdge[12] = int[12](
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    0,
    1,
    2,
    3
  );

  int cornerIndexBFromEdge[12] = int[12](
    1,
    2,
    3,
    0,
    5,
    6,
    7,
    4,
    4,
    5,
    6,
    7
  );

  precision lowp isampler2D;
  precision mediump float;

  uniform sampler2D functionTexture;
  uniform isampler2D triangulation;

  uniform int dim;
  uniform float isoLevel;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  uniform int numMetaballs;
  // uniform Metaballs {
  //   vec3 metaballPosition[16];
  //   float metaballRadius[16];
  //   vec3 metaballColor[16];
  // };
  uniform sampler2D metaballData;

  out float render;
  out vec3 normal;
  out vec3 fragPos;
  out vec3 weightedColor;

  vec3 vertexInterp(vec4 v1, vec4 v2) {
    float t = (isoLevel - v1.w) / (v2.w - v1.w);
    return v1.xyz + t * (v2.xyz - v1.xyz);
  }

  float getValue(int tx, int ty, int tz) {
    return texelFetch(functionTexture, ivec2(tx, ty * dim + tz), 0).r;
  }

  vec3 getGradient(int tx, int ty, int tz) {
    if (tx == 0) tx = 1;
    if (tx == dim - 1) tx = dim - 2;
    if (ty == 0) ty = 1;
    if (ty == dim - 1) ty = dim - 2;
    if (tz == 0) tz = 1;
    if (tz == dim - 1) tz = dim - 2;

    return vec3(
      getValue(tx + 1, ty, tz) - getValue(tx - 1, ty, tz),
      getValue(tx, ty + 1, tz) - getValue(tx, ty - 1, tz),
      getValue(tx, ty, tz + 1) - getValue(tx, ty, tz - 1)
    );
  }

  void main() {
    int id = gl_VertexID / 15;
    int faceId = (gl_VertexID % 15) / 3;
    int cornerId = gl_VertexID % 3;

    int x = id / ((dim - 1) * (dim - 1));
    int y = (id / (dim - 1)) % (dim - 1);
    int z = id % (dim - 1);

    vec4 cubeCorners[8] = vec4[8](
      vec4(x + 0, y + 0, z + 0, getValue(x + 0, y + 0, z + 0)),
      vec4(x + 1, y + 0, z + 0, getValue(x + 1, y + 0, z + 0)),
      vec4(x + 1, y + 0, z + 1, getValue(x + 1, y + 0, z + 1)),
      vec4(x + 0, y + 0, z + 1, getValue(x + 0, y + 0, z + 1)),
      vec4(x + 0, y + 1, z + 0, getValue(x + 0, y + 1, z + 0)),
      vec4(x + 1, y + 1, z + 0, getValue(x + 1, y + 1, z + 0)),
      vec4(x + 1, y + 1, z + 1, getValue(x + 1, y + 1, z + 1)),
      vec4(x + 0, y + 1, z + 1, getValue(x + 0, y + 1, z + 1))
    );

    int cubeIndex = 0;
    if (cubeCorners[0].w > isoLevel) cubeIndex += 1;
    if (cubeCorners[1].w > isoLevel) cubeIndex += 2;
    if (cubeCorners[2].w > isoLevel) cubeIndex += 4;
    if (cubeCorners[3].w > isoLevel) cubeIndex += 8;
    if (cubeCorners[4].w > isoLevel) cubeIndex += 16;
    if (cubeCorners[5].w > isoLevel) cubeIndex += 32;
    if (cubeCorners[6].w > isoLevel) cubeIndex += 64;
    if (cubeCorners[7].w > isoLevel) cubeIndex += 128;

    int edgeIndex = texelFetch(triangulation, ivec2(15 * cubeIndex + 3 * faceId + cornerId, 0), 0).r;
    if (edgeIndex == -1) {
      render = 0.0;
      return;
    }
    else {
      render = 1.0;
    }

    vec4 c1 = cubeCorners[cornerIndexAFromEdge[edgeIndex]];
    vec4 c2 = cubeCorners[cornerIndexBFromEdge[edgeIndex]];
    vec4 grad1 = vec4(getGradient(int(c1.x), int(c1.y), int(c1.z)), c1.w);
    vec4 grad2 = vec4(getGradient(int(c2.x), int(c2.y), int(c2.z)), c2.w);
    vec3 interpolatedPosition = vertexInterp(c1, c2);
    vec3 interpolatedGradient = vertexInterp(grad1, grad2);

    float total = 0.0;
    weightedColor = vec3(0.0, 0.0, 0.0);
    for (int i = 0; i < numMetaballs; i++) {
      vec3 position = texelFetch(metaballData, ivec2(i, 0), 0).xyz;
      vec3 color = texelFetch(metaballData, ivec2(i, 2), 0).xyz;

      vec3 offset = position - interpolatedPosition;
      float dist2 = 1.0 / dot(offset, offset);
      
      weightedColor += dist2 * color;
      total += dist2;
    }
    
    weightedColor /= total;
    gl_Position = projection * view * model * vec4(interpolatedPosition, 1.0);
    normal = normalize(-interpolatedGradient);
    fragPos = vec3(model * vec4(interpolatedPosition, 1.0));
  }
`;

const metaballFragmentSource = `#version 300 es

  precision highp float;
  
  in float render;
  in vec3 normal;
  in vec3 fragPos;
  in vec3 weightedColor;

  uniform vec3 lightPos;

  out vec4 FragColor;
  
  vec3 lightColor = vec3(1.0, 1.0, 1.0);
  vec3 objectColor = vec3(0.5, 0.5, 0.5);
  
  void main() {
    if (render == 0.0) {
      discard;
    }

    float ambientStrength = 0.1;
    vec3 ambient = ambientStrength * lightColor;

    vec3 lightDir = normalize(lightPos - fragPos);
    vec3 diffuse = abs(dot(normal, lightDir)) * lightColor;

    // vec3 color = (ambient + diffuse) * objectColor;
    // FragColor = vec4(color, 1.0);

    vec3 blended = (ambient + diffuse) * weightedColor;
    FragColor = vec4(blended, 1.0);
  }
`;

// prettier-ignore
const triangulation = new Int32Array([
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  8,  3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  1,  9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  8,  3,  9,  8,  1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  8,  3,  1,  2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   9,  2, 10,  0,  2,  9, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   2,  8,  3,  2, 10,  8, 10,  9,  8, -1, -1, -1, -1, -1, -1,
   3, 11,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0, 11,  2,  8, 11,  0, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  9,  0,  2,  3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1, 11,  2,  1,  9, 11,  9,  8, 11, -1, -1, -1, -1, -1, -1,
   3, 10,  1, 11, 10,  3, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0, 10,  1,  0,  8, 10,  8, 11, 10, -1, -1, -1, -1, -1, -1,
   3,  9,  0,  3, 11,  9, 11, 10,  9, -1, -1, -1, -1, -1, -1,
   9,  8, 10, 10,  8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4,  7,  8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4,  3,  0,  7,  3,  4, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  1,  9,  8,  4,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4,  1,  9,  4,  7,  1,  7,  3,  1, -1, -1, -1, -1, -1, -1,
   1,  2, 10,  8,  4,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   3,  4,  7,  3,  0,  4,  1,  2, 10, -1, -1, -1, -1, -1, -1,
   9,  2, 10,  9,  0,  2,  8,  4,  7, -1, -1, -1, -1, -1, -1,
   2, 10,  9,  2,  9,  7,  2,  7,  3,  7,  9,  4, -1, -1, -1,
   8,  4,  7,  3, 11,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  11,  4,  7, 11,  2,  4,  2,  0,  4, -1, -1, -1, -1, -1, -1,
   9,  0,  1,  8,  4,  7,  2,  3, 11, -1, -1, -1, -1, -1, -1,
   4,  7, 11,  9,  4, 11,  9, 11,  2,  9,  2,  1, -1, -1, -1,
   3, 10,  1,  3, 11, 10,  7,  8,  4, -1, -1, -1, -1, -1, -1,
   1, 11, 10,  1,  4, 11,  1,  0,  4,  7, 11,  4, -1, -1, -1,
   4,  7,  8,  9,  0, 11,  9, 11, 10, 11,  0,  3, -1, -1, -1,
   4,  7, 11,  4, 11,  9,  9, 11, 10, -1, -1, -1, -1, -1, -1,
   9,  5,  4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   9,  5,  4,  0,  8,  3, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  5,  4,  1,  5,  0, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   8,  5,  4,  8,  3,  5,  3,  1,  5, -1, -1, -1, -1, -1, -1,
   1,  2, 10,  9,  5,  4, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   3,  0,  8,  1,  2, 10,  4,  9,  5, -1, -1, -1, -1, -1, -1,
   5,  2, 10,  5,  4,  2,  4,  0,  2, -1, -1, -1, -1, -1, -1,
   2, 10,  5,  3,  2,  5,  3,  5,  4,  3,  4,  8, -1, -1, -1,
   9,  5,  4,  2,  3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0, 11,  2,  0,  8, 11,  4,  9,  5, -1, -1, -1, -1, -1, -1,
   0,  5,  4,  0,  1,  5,  2,  3, 11, -1, -1, -1, -1, -1, -1,
   2,  1,  5,  2,  5,  8,  2,  8, 11,  4,  8,  5, -1, -1, -1,
  10,  3, 11, 10,  1,  3,  9,  5,  4, -1, -1, -1, -1, -1, -1,
   4,  9,  5,  0,  8,  1,  8, 10,  1,  8, 11, 10, -1, -1, -1,
   5,  4,  0,  5,  0, 11,  5, 11, 10, 11,  0,  3, -1, -1, -1,
   5,  4,  8,  5,  8, 10, 10,  8, 11, -1, -1, -1, -1, -1, -1,
   9,  7,  8,  5,  7,  9, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   9,  3,  0,  9,  5,  3,  5,  7,  3, -1, -1, -1, -1, -1, -1,
   0,  7,  8,  0,  1,  7,  1,  5,  7, -1, -1, -1, -1, -1, -1,
   1,  5,  3,  3,  5,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   9,  7,  8,  9,  5,  7, 10,  1,  2, -1, -1, -1, -1, -1, -1,
  10,  1,  2,  9,  5,  0,  5,  3,  0,  5,  7,  3, -1, -1, -1,
   8,  0,  2,  8,  2,  5,  8,  5,  7, 10,  5,  2, -1, -1, -1,
   2, 10,  5,  2,  5,  3,  3,  5,  7, -1, -1, -1, -1, -1, -1,
   7,  9,  5,  7,  8,  9,  3, 11,  2, -1, -1, -1, -1, -1, -1,
   9,  5,  7,  9,  7,  2,  9,  2,  0,  2,  7, 11, -1, -1, -1,
   2,  3, 11,  0,  1,  8,  1,  7,  8,  1,  5,  7, -1, -1, -1,
  11,  2,  1, 11,  1,  7,  7,  1,  5, -1, -1, -1, -1, -1, -1,
   9,  5,  8,  8,  5,  7, 10,  1,  3, 10,  3, 11, -1, -1, -1,
   5,  7,  0,  5,  0,  9,  7, 11,  0,  1,  0, 10, 11, 10,  0,
  11, 10,  0, 11,  0,  3, 10,  5,  0,  8,  0,  7,  5,  7,  0,
  11, 10,  5,  7, 11,  5, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  10,  6,  5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  8,  3,  5, 10,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   9,  0,  1,  5, 10,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  8,  3,  1,  9,  8,  5, 10,  6, -1, -1, -1, -1, -1, -1,
   1,  6,  5,  2,  6,  1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  6,  5,  1,  2,  6,  3,  0,  8, -1, -1, -1, -1, -1, -1,
   9,  6,  5,  9,  0,  6,  0,  2,  6, -1, -1, -1, -1, -1, -1,
   5,  9,  8,  5,  8,  2,  5,  2,  6,  3,  2,  8, -1, -1, -1,
   2,  3, 11, 10,  6,  5, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  11,  0,  8, 11,  2,  0, 10,  6,  5, -1, -1, -1, -1, -1, -1,
   0,  1,  9,  2,  3, 11,  5, 10,  6, -1, -1, -1, -1, -1, -1,
   5, 10,  6,  1,  9,  2,  9, 11,  2,  9,  8, 11, -1, -1, -1,
   6,  3, 11,  6,  5,  3,  5,  1,  3, -1, -1, -1, -1, -1, -1,
   0,  8, 11,  0, 11,  5,  0,  5,  1,  5, 11,  6, -1, -1, -1,
   3, 11,  6,  0,  3,  6,  0,  6,  5,  0,  5,  9, -1, -1, -1,
   6,  5,  9,  6,  9, 11, 11,  9,  8, -1, -1, -1, -1, -1, -1,
   5, 10,  6,  4,  7,  8, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4,  3,  0,  4,  7,  3,  6,  5, 10, -1, -1, -1, -1, -1, -1,
   1,  9,  0,  5, 10,  6,  8,  4,  7, -1, -1, -1, -1, -1, -1,
  10,  6,  5,  1,  9,  7,  1,  7,  3,  7,  9,  4, -1, -1, -1,
   6,  1,  2,  6,  5,  1,  4,  7,  8, -1, -1, -1, -1, -1, -1,
   1,  2,  5,  5,  2,  6,  3,  0,  4,  3,  4,  7, -1, -1, -1,
   8,  4,  7,  9,  0,  5,  0,  6,  5,  0,  2,  6, -1, -1, -1,
   7,  3,  9,  7,  9,  4,  3,  2,  9,  5,  9,  6,  2,  6,  9,
   3, 11,  2,  7,  8,  4, 10,  6,  5, -1, -1, -1, -1, -1, -1,
   5, 10,  6,  4,  7,  2,  4,  2,  0,  2,  7, 11, -1, -1, -1,
   0,  1,  9,  4,  7,  8,  2,  3, 11,  5, 10,  6, -1, -1, -1,
   9,  2,  1,  9, 11,  2,  9,  4, 11,  7, 11,  4,  5, 10,  6,
   8,  4,  7,  3, 11,  5,  3,  5,  1,  5, 11,  6, -1, -1, -1,
   5,  1, 11,  5, 11,  6,  1,  0, 11,  7, 11,  4,  0,  4, 11,
   0,  5,  9,  0,  6,  5,  0,  3,  6, 11,  6,  3,  8,  4,  7,
   6,  5,  9,  6,  9, 11,  4,  7,  9,  7, 11,  9, -1, -1, -1,
  10,  4,  9,  6,  4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4, 10,  6,  4,  9, 10,  0,  8,  3, -1, -1, -1, -1, -1, -1,
  10,  0,  1, 10,  6,  0,  6,  4,  0, -1, -1, -1, -1, -1, -1,
   8,  3,  1,  8,  1,  6,  8,  6,  4,  6,  1, 10, -1, -1, -1,
   1,  4,  9,  1,  2,  4,  2,  6,  4, -1, -1, -1, -1, -1, -1,
   3,  0,  8,  1,  2,  9,  2,  4,  9,  2,  6,  4, -1, -1, -1,
   0,  2,  4,  4,  2,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   8,  3,  2,  8,  2,  4,  4,  2,  6, -1, -1, -1, -1, -1, -1,
  10,  4,  9, 10,  6,  4, 11,  2,  3, -1, -1, -1, -1, -1, -1,
   0,  8,  2,  2,  8, 11,  4,  9, 10,  4, 10,  6, -1, -1, -1,
   3, 11,  2,  0,  1,  6,  0,  6,  4,  6,  1, 10, -1, -1, -1,
   6,  4,  1,  6,  1, 10,  4,  8,  1,  2,  1, 11,  8, 11,  1,
   9,  6,  4,  9,  3,  6,  9,  1,  3, 11,  6,  3, -1, -1, -1,
   8, 11,  1,  8,  1,  0, 11,  6,  1,  9,  1,  4,  6,  4,  1,
   3, 11,  6,  3,  6,  0,  0,  6,  4, -1, -1, -1, -1, -1, -1,
   6,  4,  8, 11,  6,  8, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   7, 10,  6,  7,  8, 10,  8,  9, 10, -1, -1, -1, -1, -1, -1,
   0,  7,  3,  0, 10,  7,  0,  9, 10,  6,  7, 10, -1, -1, -1,
  10,  6,  7,  1, 10,  7,  1,  7,  8,  1,  8,  0, -1, -1, -1,
  10,  6,  7, 10,  7,  1,  1,  7,  3, -1, -1, -1, -1, -1, -1,
   1,  2,  6,  1,  6,  8,  1,  8,  9,  8,  6,  7, -1, -1, -1,
   2,  6,  9,  2,  9,  1,  6,  7,  9,  0,  9,  3,  7,  3,  9,
   7,  8,  0,  7,  0,  6,  6,  0,  2, -1, -1, -1, -1, -1, -1,
   7,  3,  2,  6,  7,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   2,  3, 11, 10,  6,  8, 10,  8,  9,  8,  6,  7, -1, -1, -1,
   2,  0,  7,  2,  7, 11,  0,  9,  7,  6,  7, 10,  9, 10,  7,
   1,  8,  0,  1,  7,  8,  1, 10,  7,  6,  7, 10,  2,  3, 11,
  11,  2,  1, 11,  1,  7, 10,  6,  1,  6,  7,  1, -1, -1, -1,
   8,  9,  6,  8,  6,  7,  9,  1,  6, 11,  6,  3,  1,  3,  6,
   0,  9,  1, 11,  6,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   7,  8,  0,  7,  0,  6,  3, 11,  0, 11,  6,  0, -1, -1, -1,
   7, 11,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   7,  6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   3,  0,  8, 11,  7,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  1,  9, 11,  7,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   8,  1,  9,  8,  3,  1, 11,  7,  6, -1, -1, -1, -1, -1, -1,
  10,  1,  2,  6, 11,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  2, 10,  3,  0,  8,  6, 11,  7, -1, -1, -1, -1, -1, -1,
   2,  9,  0,  2, 10,  9,  6, 11,  7, -1, -1, -1, -1, -1, -1,
   6, 11,  7,  2, 10,  3, 10,  8,  3, 10,  9,  8, -1, -1, -1,
   7,  2,  3,  6,  2,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   7,  0,  8,  7,  6,  0,  6,  2,  0, -1, -1, -1, -1, -1, -1,
   2,  7,  6,  2,  3,  7,  0,  1,  9, -1, -1, -1, -1, -1, -1,
   1,  6,  2,  1,  8,  6,  1,  9,  8,  8,  7,  6, -1, -1, -1,
  10,  7,  6, 10,  1,  7,  1,  3,  7, -1, -1, -1, -1, -1, -1,
  10,  7,  6,  1,  7, 10,  1,  8,  7,  1,  0,  8, -1, -1, -1,
   0,  3,  7,  0,  7, 10,  0, 10,  9,  6, 10,  7, -1, -1, -1,
   7,  6, 10,  7, 10,  8,  8, 10,  9, -1, -1, -1, -1, -1, -1,
   6,  8,  4, 11,  8,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   3,  6, 11,  3,  0,  6,  0,  4,  6, -1, -1, -1, -1, -1, -1,
   8,  6, 11,  8,  4,  6,  9,  0,  1, -1, -1, -1, -1, -1, -1,
   9,  4,  6,  9,  6,  3,  9,  3,  1, 11,  3,  6, -1, -1, -1,
   6,  8,  4,  6, 11,  8,  2, 10,  1, -1, -1, -1, -1, -1, -1,
   1,  2, 10,  3,  0, 11,  0,  6, 11,  0,  4,  6, -1, -1, -1,
   4, 11,  8,  4,  6, 11,  0,  2,  9,  2, 10,  9, -1, -1, -1,
  10,  9,  3, 10,  3,  2,  9,  4,  3, 11,  3,  6,  4,  6,  3,
   8,  2,  3,  8,  4,  2,  4,  6,  2, -1, -1, -1, -1, -1, -1,
   0,  4,  2,  4,  6,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  9,  0,  2,  3,  4,  2,  4,  6,  4,  3,  8, -1, -1, -1,
   1,  9,  4,  1,  4,  2,  2,  4,  6, -1, -1, -1, -1, -1, -1,
   8,  1,  3,  8,  6,  1,  8,  4,  6,  6, 10,  1, -1, -1, -1,
  10,  1,  0, 10,  0,  6,  6,  0,  4, -1, -1, -1, -1, -1, -1,
   4,  6,  3,  4,  3,  8,  6, 10,  3,  0,  3,  9, 10,  9,  3,
  10,  9,  4,  6, 10,  4, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4,  9,  5,  7,  6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  8,  3,  4,  9,  5, 11,  7,  6, -1, -1, -1, -1, -1, -1,
   5,  0,  1,  5,  4,  0,  7,  6, 11, -1, -1, -1, -1, -1, -1,
  11,  7,  6,  8,  3,  4,  3,  5,  4,  3,  1,  5, -1, -1, -1,
   9,  5,  4, 10,  1,  2,  7,  6, 11, -1, -1, -1, -1, -1, -1,
   6, 11,  7,  1,  2, 10,  0,  8,  3,  4,  9,  5, -1, -1, -1,
   7,  6, 11,  5,  4, 10,  4,  2, 10,  4,  0,  2, -1, -1, -1,
   3,  4,  8,  3,  5,  4,  3,  2,  5, 10,  5,  2, 11,  7,  6,
   7,  2,  3,  7,  6,  2,  5,  4,  9, -1, -1, -1, -1, -1, -1,
   9,  5,  4,  0,  8,  6,  0,  6,  2,  6,  8,  7, -1, -1, -1,
   3,  6,  2,  3,  7,  6,  1,  5,  0,  5,  4,  0, -1, -1, -1,
   6,  2,  8,  6,  8,  7,  2,  1,  8,  4,  8,  5,  1,  5,  8,
   9,  5,  4, 10,  1,  6,  1,  7,  6,  1,  3,  7, -1, -1, -1,
   1,  6, 10,  1,  7,  6,  1,  0,  7,  8,  7,  0,  9,  5,  4,
   4,  0, 10,  4, 10,  5,  0,  3, 10,  6, 10,  7,  3,  7, 10,
   7,  6, 10,  7, 10,  8,  5,  4, 10,  4,  8, 10, -1, -1, -1,
   6,  9,  5,  6, 11,  9, 11,  8,  9, -1, -1, -1, -1, -1, -1,
   3,  6, 11,  0,  6,  3,  0,  5,  6,  0,  9,  5, -1, -1, -1,
   0, 11,  8,  0,  5, 11,  0,  1,  5,  5,  6, 11, -1, -1, -1,
   6, 11,  3,  6,  3,  5,  5,  3,  1, -1, -1, -1, -1, -1, -1,
   1,  2, 10,  9,  5, 11,  9, 11,  8, 11,  5,  6, -1, -1, -1,
   0, 11,  3,  0,  6, 11,  0,  9,  6,  5,  6,  9,  1,  2, 10,
  11,  8,  5, 11,  5,  6,  8,  0,  5, 10,  5,  2,  0,  2,  5,
   6, 11,  3,  6,  3,  5,  2, 10,  3, 10,  5,  3, -1, -1, -1,
   5,  8,  9,  5,  2,  8,  5,  6,  2,  3,  8,  2, -1, -1, -1,
   9,  5,  6,  9,  6,  0,  0,  6,  2, -1, -1, -1, -1, -1, -1,
   1,  5,  8,  1,  8,  0,  5,  6,  8,  3,  8,  2,  6,  2,  8,
   1,  5,  6,  2,  1,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  3,  6,  1,  6, 10,  3,  8,  6,  5,  6,  9,  8,  9,  6,
  10,  1,  0, 10,  0,  6,  9,  5,  0,  5,  6,  0, -1, -1, -1,
   0,  3,  8,  5,  6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  10,  5,  6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  11,  5, 10,  7,  5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  11,  5, 10, 11,  7,  5,  8,  3,  0, -1, -1, -1, -1, -1, -1,
   5, 11,  7,  5, 10, 11,  1,  9,  0, -1, -1, -1, -1, -1, -1,
  10,  7,  5, 10, 11,  7,  9,  8,  1,  8,  3,  1, -1, -1, -1,
  11,  1,  2, 11,  7,  1,  7,  5,  1, -1, -1, -1, -1, -1, -1,
   0,  8,  3,  1,  2,  7,  1,  7,  5,  7,  2, 11, -1, -1, -1,
   9,  7,  5,  9,  2,  7,  9,  0,  2,  2, 11,  7, -1, -1, -1,
   7,  5,  2,  7,  2, 11,  5,  9,  2,  3,  2,  8,  9,  8,  2,
   2,  5, 10,  2,  3,  5,  3,  7,  5, -1, -1, -1, -1, -1, -1,
   8,  2,  0,  8,  5,  2,  8,  7,  5, 10,  2,  5, -1, -1, -1,
   9,  0,  1,  5, 10,  3,  5,  3,  7,  3, 10,  2, -1, -1, -1,
   9,  8,  2,  9,  2,  1,  8,  7,  2, 10,  2,  5,  7,  5,  2,
   1,  3,  5,  3,  7,  5, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  8,  7,  0,  7,  1,  1,  7,  5, -1, -1, -1, -1, -1, -1,
   9,  0,  3,  9,  3,  5,  5,  3,  7, -1, -1, -1, -1, -1, -1,
   9,  8,  7,  5,  9,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   5,  8,  4,  5, 10,  8, 10, 11,  8, -1, -1, -1, -1, -1, -1,
   5,  0,  4,  5, 11,  0,  5, 10, 11, 11,  3,  0, -1, -1, -1,
   0,  1,  9,  8,  4, 10,  8, 10, 11, 10,  4,  5, -1, -1, -1,
  10, 11,  4, 10,  4,  5, 11,  3,  4,  9,  4,  1,  3,  1,  4,
   2,  5,  1,  2,  8,  5,  2, 11,  8,  4,  5,  8, -1, -1, -1,
   0,  4, 11,  0, 11,  3,  4,  5, 11,  2, 11,  1,  5,  1, 11,
   0,  2,  5,  0,  5,  9,  2, 11,  5,  4,  5,  8, 11,  8,  5,
   9,  4,  5,  2, 11,  3, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   2,  5, 10,  3,  5,  2,  3,  4,  5,  3,  8,  4, -1, -1, -1,
   5, 10,  2,  5,  2,  4,  4,  2,  0, -1, -1, -1, -1, -1, -1,
   3, 10,  2,  3,  5, 10,  3,  8,  5,  4,  5,  8,  0,  1,  9,
   5, 10,  2,  5,  2,  4,  1,  9,  2,  9,  4,  2, -1, -1, -1,
   8,  4,  5,  8,  5,  3,  3,  5,  1, -1, -1, -1, -1, -1, -1,
   0,  4,  5,  1,  0,  5, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   8,  4,  5,  8,  5,  3,  9,  0,  5,  0,  3,  5, -1, -1, -1,
   9,  4,  5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4, 11,  7,  4,  9, 11,  9, 10, 11, -1, -1, -1, -1, -1, -1,
   0,  8,  3,  4,  9,  7,  9, 11,  7,  9, 10, 11, -1, -1, -1,
   1, 10, 11,  1, 11,  4,  1,  4,  0,  7,  4, 11, -1, -1, -1,
   3,  1,  4,  3,  4,  8,  1, 10,  4,  7,  4, 11, 10, 11,  4,
   4, 11,  7,  9, 11,  4,  9,  2, 11,  9,  1,  2, -1, -1, -1,
   9,  7,  4,  9, 11,  7,  9,  1, 11,  2, 11,  1,  0,  8,  3,
  11,  7,  4, 11,  4,  2,  2,  4,  0, -1, -1, -1, -1, -1, -1,
  11,  7,  4, 11,  4,  2,  8,  3,  4,  3,  2,  4, -1, -1, -1,
   2,  9, 10,  2,  7,  9,  2,  3,  7,  7,  4,  9, -1, -1, -1,
   9, 10,  7,  9,  7,  4, 10,  2,  7,  8,  7,  0,  2,  0,  7,
   3,  7, 10,  3, 10,  2,  7,  4, 10,  1, 10,  0,  4,  0, 10,
   1, 10,  2,  8,  7,  4, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4,  9,  1,  4,  1,  7,  7,  1,  3, -1, -1, -1, -1, -1, -1,
   4,  9,  1,  4,  1,  7,  0,  8,  1,  8,  7,  1, -1, -1, -1,
   4,  0,  3,  7,  4,  3, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   4,  8,  7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   9, 10,  8, 10, 11,  8, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   3,  0,  9,  3,  9, 11, 11,  9, 10, -1, -1, -1, -1, -1, -1,
   0,  1, 10,  0, 10,  8,  8, 10, 11, -1, -1, -1, -1, -1, -1,
   3,  1, 10, 11,  3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  2, 11,  1, 11,  9,  9, 11,  8, -1, -1, -1, -1, -1, -1,
   3,  0,  9,  3,  9, 11,  1,  2,  9,  2, 11,  9, -1, -1, -1,
   0,  2, 11,  8,  0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   3,  2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   2,  3,  8,  2,  8, 10, 10,  8,  9, -1, -1, -1, -1, -1, -1,
   9, 10,  2,  0,  9,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   2,  3,  8,  2,  8, 10,  0,  1,  8,  1, 10,  8, -1, -1, -1,
   1, 10,  2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   1,  3,  8,  9,  1,  8, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  9,  1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  3,  8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1
]);

export default class Space {
  dim: number;

  functionTexture: WebGLTexture;
  functionTextureFBO: WebGLFramebuffer;

  triangulationTexture: WebGLTexture;

  functionComputeVAO: WebGLVertexArrayObject;
  metaballVAO: WebGLVertexArrayObject;

  functionComputeShader: Shader;
  metaballShader: Shader;

  metaballDataTexture: WebGLTexture;

  metaballs: {
    x: number;
    y: number;
    z: number;
    xvel: number;
    yvel: number;
    zvel: number;
    radius: number;
    r: number;
    g: number;
    b: number;
  }[] = [];

  constructor(gl: WebGL2RenderingContext, dim: number) {
    this.dim = dim;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.getExtension('EXT_color_buffer_float');

    /*********** Metaball function texture ***********/
    this.functionComputeVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.functionComputeVAO);
    this.functionComputeShader = new Shader(
      gl,
      functionComputeVertexSource,
      functionComputeFragmentSource
    );

    this.functionTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.functionTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R16F,
      this.dim,
      this.dim * this.dim,
      0,
      gl.RED,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.functionTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.functionTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.functionTexture,
      0
    );

    /*********** Metaball marching cubes ***********/
    this.metaballVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.metaballVAO);
    this.metaballShader = new Shader(
      gl,
      metaballVertexSource,
      metaballFragmentSource
    );

    this.triangulationTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.triangulationTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      256 * 5 * 3,
      1,
      0,
      gl.RED_INTEGER,
      gl.INT,
      triangulation
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /*********** Metaballs data texture ***********/
    this.metaballDataTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.metaballDataTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_METABALLS,
      3,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  addMetaball(
    x: number,
    y: number,
    z: number,
    xvel: number,
    yvel: number,
    zvel: number,
    radius: number,
    r: number,
    g: number,
    b: number
  ) {
    this.metaballs.push({ x, y, z, xvel, yvel, zvel, radius, r, g, b });
  }

  step(gl: WebGL2RenderingContext) {
    this.metaballs.forEach(metaball => {
      metaball.x += metaball.xvel;
      metaball.y += metaball.yvel;
      metaball.z += metaball.zvel;

      if (metaball.x < metaball.radius) {
        metaball.x = metaball.radius;
        metaball.xvel *= -1;
      }
      if (metaball.x > this.dim - metaball.radius) {
        metaball.x = this.dim - metaball.radius;
        metaball.xvel *= -1;
      }
      if (metaball.y < metaball.radius) {
        metaball.y = metaball.radius;
        metaball.yvel *= -1;
      }
      if (metaball.y > this.dim - metaball.radius) {
        metaball.y = this.dim - metaball.radius;
        metaball.yvel *= -1;
      }
      if (metaball.z < metaball.radius) {
        metaball.z = metaball.radius;
        metaball.zvel *= -1;
      }
      if (metaball.z > this.dim - metaball.radius - this.dim / 4) {
        metaball.z = this.dim - metaball.radius - this.dim / 4;
        metaball.zvel *= -1;
      }
    });

    gl.bindVertexArray(this.functionComputeVAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.functionTextureFBO);

    this.functionComputeShader.use(gl);

    gl.uniform1i(
      gl.getUniformLocation(this.functionComputeShader.program, 'dim'),
      this.dim
    );

    gl.uniform1i(
      gl.getUniformLocation(this.functionComputeShader.program, 'numMetaballs'),
      this.metaballs.length
    );

    const positionData = new Float32Array(4 * MAX_METABALLS);
    const radiusData = new Float32Array(4 * MAX_METABALLS);
    const colorData = new Float32Array(4 * MAX_METABALLS);

    for (let i = 0; i < Math.min(16, this.metaballs.length); i++) {
      positionData[4 * i + 0] = this.metaballs[i].x;
      positionData[4 * i + 1] = this.metaballs[i].y;
      positionData[4 * i + 2] = this.metaballs[i].z;
      radiusData[4 * i] = this.metaballs[i].radius;
      colorData[4 * i + 0] = this.metaballs[i].r;
      colorData[4 * i + 1] = this.metaballs[i].g;
      colorData[4 * i + 2] = this.metaballs[i].b;
    }

    // gl.bindBuffer(gl.UNIFORM_BUFFER, this.functionComputeShaderUBO);
    // gl.bufferSubData(
    //   gl.UNIFORM_BUFFER,
    //   this.UBOVariableOffsets.position,
    //   positionData,
    //   0
    // );
    // gl.bufferSubData(gl.UNIFORM_BUFFER, this.UBOVariableOffsets.radius, radiusData, 0);
    // gl.bufferSubData(gl.UNIFORM_BUFFER, this.UBOVariableOffsets.color, colorData, 0);

    gl.activeTexture(gl.TEXTURE2);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      MAX_METABALLS,
      1,
      gl.RGBA,
      gl.FLOAT,
      positionData
    );
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      1,
      MAX_METABALLS,
      1,
      gl.RGBA,
      gl.FLOAT,
      radiusData
    );
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      2,
      MAX_METABALLS,
      1,
      gl.RGBA,
      gl.FLOAT,
      colorData
    );
    gl.uniform1i(
      gl.getUniformLocation(this.functionComputeShader.program, 'metaballData'),
      2
    );

    gl.viewport(0, 0, this.dim, this.dim * this.dim);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  draw(
    gl: WebGL2RenderingContext,
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3
  ) {
    gl.bindVertexArray(this.metaballVAO);

    this.metaballShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.metaballShader.program, 'dim'),
      this.dim
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.metaballShader.program, 'projection'),
      false,
      projection
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.metaballShader.program, 'view'),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.metaballShader.program, 'model'),
      false,
      model
    );
    gl.uniform1i(
      gl.getUniformLocation(this.metaballShader.program, 'triangulation'),
      1
    );
    gl.uniform1f(
      gl.getUniformLocation(this.metaballShader.program, 'isoLevel'),
      1.0
    );
    gl.uniform3fv(
      gl.getUniformLocation(this.metaballShader.program, 'lightPos'),
      lightPos
    );
    gl.uniform1i(
      gl.getUniformLocation(this.metaballShader.program, 'numMetaballs'),
      this.metaballs.length
    );
    gl.uniform1i(
      gl.getUniformLocation(this.metaballShader.program, 'metaballData'),
      2
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 15 * Math.pow(this.dim - 1, 3));
  }
}
