import { mat4, vec3 } from 'gl-matrix';
import Shader from './shader';

const MAX_TEXTURE_WIDTH = 4096;

const triangleVertexShader = `#version 300 es

  precision highp sampler2D;

  uniform sampler2D particlePositions;
  
  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  uniform int numParticlesX;
  uniform int numParticlesZ;

  out vec3 fragPos;
  out vec3 normal;
  out vec2 texCoords;

  void main() {
    int squareId = gl_VertexID / 6;
    int localId = gl_VertexID % 6;

    int x = squareId % (numParticlesX - 1);
    int y = squareId / (numParticlesX - 1);

    switch (localId) {
      case 0:
        break;
      case 1:
        y++;
        break;
      case 2:
        x++;
        break;
      case 3:
        x++;
        break;
      case 4:
        y++;
        break;
      case 5:
        x++;
        y++;
        break;
    }

    int particleId = x + y * numParticlesX;
    int neighbor1Id = x + (y - 1) * numParticlesX;
    int neighbor2Id = x - 1 + y * numParticlesX;
    int neighbor3Id = x + (y + 1) * numParticlesX;
    int neighbor4Id = x + 1 + y * numParticlesX;

    vec3 position = texelFetch(particlePositions, ivec2(particleId % ${MAX_TEXTURE_WIDTH}, particleId / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 neighbor1 = y > 0 ? texelFetch(particlePositions, ivec2(neighbor1Id % ${MAX_TEXTURE_WIDTH}, neighbor1Id / ${MAX_TEXTURE_WIDTH}), 0).xyz : vec3(0.);
    vec3 neighbor2 = x > 0 ? texelFetch(particlePositions, ivec2(neighbor2Id % ${MAX_TEXTURE_WIDTH}, neighbor2Id / ${MAX_TEXTURE_WIDTH}), 0).xyz : vec3(0.);
    vec3 neighbor3 = y < numParticlesZ - 1 ? texelFetch(particlePositions, ivec2(neighbor3Id % ${MAX_TEXTURE_WIDTH}, neighbor3Id / ${MAX_TEXTURE_WIDTH}), 0).xyz : vec3(0.);
    vec3 neighbor4 = x < numParticlesX - 1 ? texelFetch(particlePositions, ivec2(neighbor4Id % ${MAX_TEXTURE_WIDTH}, neighbor4Id / ${MAX_TEXTURE_WIDTH}), 0).xyz : vec3(0.);
    
    vec3 normal1 = y > 0 && x > 0 ? normalize(cross(neighbor1 - position, neighbor2 - position)) : vec3(0.);
    vec3 normal2 = x > 0 && y < numParticlesZ - 1 ? normalize(cross(neighbor2 - position, neighbor3 - position)) : vec3(0.);
    vec3 normal3 = y < numParticlesZ - 1 && x < numParticlesX - 1 ? normalize(cross(neighbor3 - position, neighbor4 - position)) : vec3(0.);
    vec3 normal4 = x < numParticlesX - 1 && y > 0 ? normalize(cross(neighbor4 - position, neighbor1 - position)) : vec3(0.);
    normal = normalize(normal1 + normal2 + normal3 + normal4);

    gl_Position = projection * view * model * vec4(position, 1.);
    fragPos = vec3(model * vec4(position, 1.));
    texCoords = vec2(float(x) / float(numParticlesX - 1), float(y) / float(numParticlesZ - 1));
  }
`;

const triangleFragmentShader = `#version 300 es

  precision highp float;

  in vec3 fragPos;
  in vec3 normal;
  in vec2 texCoords;

  uniform sampler2D shadowMap;

  uniform mat4 shadowProjection;
  uniform mat4 shadowView;

  uniform vec3 lightDir;
  uniform sampler2D image;

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
    vec3 objectColor = texture(image, texCoords).rgb;
    
    vec4 projected = shadowProjection * shadowView * vec4(fragPos, 1.0);
    bool isInShadow = getInShadow(projected);

    float ambientStrength = .1;
    vec3 ambient = ambientStrength * lightColor;

    vec3 normalizedLightDir = normalize(-lightDir);
    vec3 diffuse = abs(dot(normal, normalizedLightDir)) * lightColor;

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

  precision highp sampler2D;

  uniform sampler2D particlePositions;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  uniform int numParticlesX;

  void main() {
    int squareId = gl_VertexID / 6;
    int localId = gl_VertexID % 6;

    int x = squareId % (numParticlesX - 1);
    int y = squareId / (numParticlesX - 1);
    int particleId;

    switch (localId) {
      case 0:
        particleId = x + y * numParticlesX;
        break;
      case 1:
        particleId = x + (y + 1) * numParticlesX;
        break;
      case 2:
        particleId = (x + 1) + y * numParticlesX;
        break;
      case 3:
        particleId = (x + 1) + y * numParticlesX;
        break;
      case 4:
        particleId = x + (y + 1) * numParticlesX;
        break;
      case 5:
        particleId = (x + 1) + (y + 1) * numParticlesX;
        break;
    }

    vec3 position = texelFetch(particlePositions, ivec2(particleId % ${MAX_TEXTURE_WIDTH}, particleId / ${MAX_TEXTURE_WIDTH}), 0).xyz;

    gl_Position = projection * view * model * vec4(position, 1.);
  }
`;

const depthFragmentShader = `#version 300 es

  precision highp float;

  void main() {}
`;

export default class TriangleRenderer {
  gl: WebGL2RenderingContext;

  clothVAO: WebGLVertexArrayObject;
  shader: Shader;
  depthShader: Shader;

  numParticlesX: number;
  numParticlesZ: number;

  constructor(
    gl: WebGL2RenderingContext,
    numParticlesX: number,
    numParticlesZ: number
  ) {
    this.gl = gl;
    this.clothVAO = gl.createVertexArray()!;
    this.shader = new Shader(gl, triangleVertexShader, triangleFragmentShader);
    this.depthShader = new Shader(gl, depthVertexShader, depthFragmentShader);
    this.numParticlesX = numParticlesX;
    this.numParticlesZ = numParticlesZ;

    const image = new Image();
    image.src = '/media/demos/images/columbia.png';
    image.onload = () => {
      const texture = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE11);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.generateMipmap(gl.TEXTURE_2D);
    };
  }

  render(
    projection: mat4,
    view: mat4,
    model: mat4,
    shadowProjection: mat4,
    shadowView: mat4,
    lightDir: vec3
  ) {
    this.shader.use();
    this.shader.setMat4('projection', projection);
    this.shader.setMat4('view', view);
    this.shader.setMat4('model', model);
    this.shader.setMat4('shadowProjection', shadowProjection);
    this.shader.setMat4('shadowView', shadowView);
    this.shader.setVec3('lightDir', lightDir[0], lightDir[1], lightDir[2]);
    this.shader.setInt('particlePositions', 0);
    this.shader.setInt('numParticlesX', this.numParticlesX);
    this.shader.setInt('numParticlesZ', this.numParticlesZ);
    this.shader.setInt('shadowMap', 9);
    this.shader.setInt('image', 11);

    this.gl.drawArrays(
      this.gl.TRIANGLES,
      0,
      (this.numParticlesX - 1) * (this.numParticlesZ - 1) * 6
    );
  }

  renderDepth(projection: mat4, view: mat4, model: mat4) {
    this.depthShader.use();
    this.depthShader.setMat4('projection', projection);
    this.depthShader.setMat4('view', view);
    this.depthShader.setMat4('model', model);
    this.depthShader.setInt('particlePositions', 0);
    this.depthShader.setInt('numParticlesX', this.numParticlesX);

    this.gl.drawArrays(
      this.gl.TRIANGLES,
      0,
      (this.numParticlesX - 1) * (this.numParticlesZ - 1) * 6
    );
  }
}
