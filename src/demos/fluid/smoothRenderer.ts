import Shader from './shader';
import { mat4, vec3 } from 'gl-matrix';

const MAX_TEXTURE_WIDTH = 1024;

const SPHERE_ITERATIONS = 32;
const SPHERE_RADIUS = 0.12;

const AIR_INDEX = 1;
const WATER_INDEX = 1.333;
const R_0 = ((AIR_INDEX - WATER_INDEX) / (AIR_INDEX + WATER_INDEX)) ** 2;

const SMOOTHING_ITERATIONS = 5;

const viewVertexShader = `#version 300 es

  precision highp sampler2D;

  in vec3 offsetPosition;

  uniform sampler2D particlePositions;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  out vec3 centerViewSpace;
  out vec2 texCoords;

  const vec2 offsets[6] = vec2[](
    vec2(-1, -1),
    vec2(1, -1),
    vec2(1, 1),
    vec2(-1, -1),
    vec2(-1, 1),
    vec2(1, 1)
  );

  void main() {
    vec3 center = texelFetch(particlePositions, ivec2(gl_InstanceID % ${MAX_TEXTURE_WIDTH}, gl_InstanceID / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 offset = vec3(offsets[gl_VertexID] * float(${SPHERE_RADIUS}), 0.0);

    centerViewSpace = vec3(view * model * vec4(center, 1.0));
    gl_Position = projection * vec4(centerViewSpace + offset, 1.0);
    texCoords = offsets[gl_VertexID];
  }
`;

const viewFragmentShader = `#version 300 es

  precision highp float;

  in vec3 centerViewSpace;
  in vec2 texCoords;

  uniform mat4 projection;

  out vec4 FragViewSpace;

  void main() {
    vec3 normal = vec3(texCoords, 0.0);

    float r2 = dot(normal.xy, normal.xy);
    if (r2 > 1.0) discard;
    normal.z = sqrt(1.0 - r2);
    
    vec4 fragPos = vec4(centerViewSpace + normal * float(${SPHERE_RADIUS}), 1.0);
    vec4 projected = projection * fragPos;
    gl_FragDepth = projected.z / projected.w;

    FragViewSpace = fragPos;
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

const smoothingFragmentShader = `#version 300 es

  precision highp float;
  precision highp sampler2D;

  uniform sampler2D viewTexture;

  uniform float screenWidth;
  uniform float screenHeight;

  uniform vec2 blurDir;

  out vec4 smoothedFragPos;

  vec3 getFragPos(vec2 pixel) {
    return texture(viewTexture, pixel / vec2(screenWidth, screenHeight)).xyz;
  }

  void main() {
    vec3 fragPos = getFragPos(gl_FragCoord.xy);
    if (fragPos == vec3(0.0)) {
      discard;
    }

    float filterRadius = 0.015 * screenHeight;
    float blurScale = 0.00003 * screenHeight * -fragPos.z;
    float blurDepthFalloff = 5.0;
    
    float sum = 0.0;
    float wsum = 0.0;

    for (float x = -filterRadius; x <= filterRadius; x++) {
      vec3 neighbor = getFragPos(gl_FragCoord.xy + x * blurDir);
      if (neighbor == vec3(0.0)) continue;

      float r1 = x * blurScale;
      float w = exp(-r1 * r1);

      float r2 = (neighbor.z - fragPos.z) * blurDepthFalloff;
      float g = exp(-r2 * r2);

      sum += neighbor.z * w * g;
      wsum += w * g;
    }

    if (wsum > 0.0) {
      sum /= wsum;
    }

    smoothedFragPos = vec4(fragPos.xy, sum, 1.0);
  }
`;

const normalFragmentShader = `#version 300 es

  precision highp float;
  precision highp sampler2D;

  uniform sampler2D viewTexture;
  
  uniform float screenWidth;
  uniform float screenHeight;

  out vec4 normal;

  vec3 getFragPos(vec2 pixel) {
    return texture(viewTexture, pixel / vec2(screenWidth, screenHeight)).xyz;
  }

  void main() {
    vec3 fragPos = getFragPos(gl_FragCoord.xy);
    if (fragPos == vec3(0.0)) {
      discard;
    }
    
    float ddx = getFragPos(gl_FragCoord.xy + vec2(1.0, 0.0)).z - fragPos.z;
    float ddx2 = fragPos.z - getFragPos(gl_FragCoord.xy - vec2(1.0, 0.0)).z;
    if (abs(ddx) > abs(ddx2)) {
      ddx = ddx2;
    }
    
    float ddy = getFragPos(gl_FragCoord.xy + vec2(0.0, 1.0)).z - fragPos.z;
    float ddy2 = fragPos.z - getFragPos(gl_FragCoord.xy - vec2(0.0, 1.0)).z;
    if (abs(ddy) > abs(ddy2)) {
      ddy = ddy2;
    }
    
    // normal = vec4(normalize(cross(ddx, ddy)), 1.0);

    // vec3 direction = vec3(-ddx, -ddy, 0.005);
    // vec3 direction = vec3(-ddx * screenWidth / -fragPos.z, -ddy * screenHeight / -fragPos.z, 1.0);
    vec3 direction = vec3(-ddx, -ddy, -fragPos.z / screenHeight);
    normal = vec4(normalize(direction), 1.0);
  }
`;

const thicknessVertexShader = `#version 300 es

  precision highp sampler2D;

  in vec3 offsetPosition;

  uniform sampler2D particlePositions;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  out vec2 texCoords;

  const vec2 offsets[6] = vec2[](
    vec2(-1, -1),
    vec2(1, -1),
    vec2(1, 1),
    vec2(-1, -1),
    vec2(-1, 1),
    vec2(1, 1)
  );

  void main() {
    vec3 center = texelFetch(particlePositions, ivec2(gl_InstanceID % ${MAX_TEXTURE_WIDTH}, gl_InstanceID / ${MAX_TEXTURE_WIDTH}), 0).xyz;
    vec3 offset = vec3(offsets[gl_VertexID] * float(${SPHERE_RADIUS}), 0.0);

    vec3 centerViewSpace = vec3(view * model * vec4(center, 1.0));
    gl_Position = projection * vec4(centerViewSpace + offset, 1.0);
    texCoords = offsets[gl_VertexID];
  }
`;

const thicknessFragmentShader = `#version 300 es

  precision highp float;

  in vec2 texCoords;

  out vec4 thicknessAdition;

  void main() {
    float r2 = dot(texCoords, texCoords);
    if (r2 > 1.0) discard;
    
    thicknessAdition = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const fluidFragmentShader = `#version 300 es

  precision highp float;
  precision highp sampler2D;

  uniform sampler2D viewTexture;
  uniform sampler2D normalTexture;
  uniform sampler2D thicknessTexture;
  
  uniform float screenWidth;
  uniform float screenHeight;

  uniform mat4 projection;

  uniform vec3 cameraPos;
  uniform vec3 lightPos;

  out vec4 fluidColor;

  vec3 getFragPos(vec2 pixel) {
    return texture(viewTexture, pixel / vec2(screenWidth, screenHeight)).xyz;
  }

  vec3 getNormal(vec2 pixel) {
    return texture(normalTexture, pixel / vec2(screenWidth, screenHeight)).xyz;
  }

  float getThickness(vec2 pixel) {
    return texture(thicknessTexture, pixel / vec2(screenWidth, screenHeight)).x;
  }

  float fresnel(float cosTheta) {
    return float(${R_0}) + float(${1.0 - R_0}) * pow(1.0 - cosTheta, 5.0);
  }

  void main() {
    vec3 fragPos = getFragPos(gl_FragCoord.xy);
    if (fragPos == vec3(0.0)) {
      discard;
    }
    
    vec4 projected = projection * vec4(fragPos, 1.0);
    gl_FragDepth = (projected.z / projected.w + 1.0) / 2.0;
  
    vec3 normal = getNormal(gl_FragCoord.xy);
    // fluidColor = vec4(vec3(0.1 * -fragPos.z), 1.0);
    // fluidColor = vec4(normal, 1.0);
    // return;
    
    vec3 viewDir = normalize(cameraPos - fragPos);
    vec3 lightDir = normalize(lightPos - fragPos);
    vec3 halfway = normalize(viewDir + lightDir);

    float fresnelResult = fresnel(max(dot(normal, viewDir), 0.3));
    vec3 refracted = vec3(0.0, 0.2, 0.6) * (1.0 - fresnelResult);
    vec3 reflected = vec3(0.6, 0.6, 0.6) * fresnelResult;
    vec3 specular = vec3(0.4, 0.4, 0.4) * pow(max(dot(normal, halfway), 0.0), 5.0);
    
    float thickness = getThickness(gl_FragCoord.xy);
    float alpha = 1.0 - exp(-0.1 * thickness);
    fluidColor = vec4(refracted + reflected + specular, alpha);
  }
`;

const thicknessSmoothingFragmentShader = `#version 300 es

  precision highp float;
  precision highp sampler2D;

  uniform sampler2D thicknessTexture;

  uniform float screenWidth;
  uniform float screenHeight;

  uniform vec2 blurDir;

  out vec4 smoothedThickness;

  float getThickness(vec2 pixel) {
    return texture(thicknessTexture, pixel / vec2(screenWidth, screenHeight)).x;
  }

  void main() {
    float thickness = getThickness(gl_FragCoord.xy);
    if (thickness == 0.0) {
      discard;
    }

    float filterRadius = 0.02 * screenHeight;
    float blurScale = 0.00003 * screenHeight;
    float blurDepthFalloff = 2.0;
    
    float sum = 0.0;
    float wsum = 0.0;

    for (float x = -filterRadius; x <= filterRadius; x++) {
      float neighbor = getThickness(gl_FragCoord.xy + x * blurDir);
      if (neighbor == 0.0) continue;

      float r1 = x * blurScale;
      float w = exp(-r1 * r1);

      float r2 = (neighbor - thickness) * blurDepthFalloff;
      r2 = 0.0;
      float g = exp(-r2 * r2);

      sum += neighbor * w * g;
      wsum += w * g;
    }

    if (wsum > 0.0) {
      sum /= wsum;
    }

    smoothedThickness = vec4(sum, 0.0, 0.0, 1.0);
  }
`;

class SmoothRenderer {
  particleVAO: WebGLVertexArrayObject;
  particleSphereVertexBuffer: WebGLBuffer;
  particleSphereVertices: number[];

  viewTexture: WebGLTexture;
  viewDepthRenderbuffer: WebGLRenderbuffer;
  viewTextureFBO: WebGLFramebuffer;
  viewSwapTexture: WebGLTexture;
  viewSwapTextureFBO: WebGLFramebuffer;
  normalTexture: WebGLTexture;
  normalTextureFBO: WebGLFramebuffer;
  thicknessTexture: WebGLTexture;
  thicknessTextureFBO: WebGLFramebuffer;
  thicknessSwapTexture: WebGLTexture;
  thicknessSwapTextureFBO: WebGLFramebuffer;
  viewShader: Shader;
  normalShader: Shader;
  smoothingShader: Shader;
  thicknessShader: Shader;
  thicknessSmoothingShader: Shader;
  fluidShader: Shader;

  constructor(gl: WebGL2RenderingContext) {
    /***************** Creating the sphere vertices *****************/

    this.particleSphereVertices = [];
    const pushCartesian = (
      radius: number,
      azimuth: number,
      elevation: number
    ) => {
      this.particleSphereVertices.push(
        radius * Math.cos(azimuth) * Math.sin(elevation)
      );
      this.particleSphereVertices.push(
        radius * Math.sin(azimuth) * Math.sin(elevation)
      );
      this.particleSphereVertices.push(radius * Math.cos(elevation));
    };

    const azimuthStep = (Math.PI * 2) / SPHERE_ITERATIONS / 2;
    const elevationStep = Math.PI / SPHERE_ITERATIONS;
    for (let azimuth = 0; azimuth <= Math.PI * 2; azimuth += azimuthStep) {
      for (
        let elevation = 0;
        elevation <= Math.PI;
        elevation += elevationStep
      ) {
        pushCartesian(SPHERE_RADIUS, azimuth, elevation);
        pushCartesian(SPHERE_RADIUS, azimuth + azimuthStep, elevation);
        pushCartesian(
          SPHERE_RADIUS,
          azimuth + azimuthStep,
          elevation + elevationStep
        );

        pushCartesian(SPHERE_RADIUS, azimuth, elevation);
        pushCartesian(SPHERE_RADIUS, azimuth, elevation + elevationStep);
        pushCartesian(
          SPHERE_RADIUS,
          azimuth + azimuthStep,
          elevation + elevationStep
        );
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

    /***************** Creating the textures *****************/

    this.viewTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE20);
    gl.bindTexture(gl.TEXTURE_2D, this.viewTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.viewDepthRenderbuffer = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.viewDepthRenderbuffer);
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT24,
      gl.canvas.width,
      gl.canvas.height
    );

    this.viewTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.viewTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.viewTexture,
      0
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this.viewDepthRenderbuffer
    );

    this.viewSwapTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE21);
    gl.bindTexture(gl.TEXTURE_2D, this.viewSwapTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.viewSwapTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.viewSwapTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.viewSwapTexture,
      0
    );

    this.normalTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE22);
    gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.normalTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.normalTexture,
      0
    );

    this.thicknessTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE23);
    gl.bindTexture(gl.TEXTURE_2D, this.thicknessTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RED,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.thicknessTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thicknessTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.thicknessTexture,
      0
    );

    this.thicknessSwapTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE24);
    gl.bindTexture(gl.TEXTURE_2D, this.thicknessSwapTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RED,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.thicknessSwapTextureFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thicknessSwapTextureFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.thicknessSwapTexture,
      0
    );

    this.viewShader = new Shader(gl, viewVertexShader, viewFragmentShader);
    this.normalShader = new Shader(
      gl,
      fullscreenVertexShader,
      normalFragmentShader
    );
    this.smoothingShader = new Shader(
      gl,
      fullscreenVertexShader,
      smoothingFragmentShader
    );
    this.thicknessShader = new Shader(
      gl,
      thicknessVertexShader,
      thicknessFragmentShader
    );
    this.thicknessSmoothingShader = new Shader(
      gl,
      fullscreenVertexShader,
      thicknessSmoothingFragmentShader
    );
    this.fluidShader = new Shader(
      gl,
      fullscreenVertexShader,
      fluidFragmentShader
    );
  }

  render(
    gl: WebGL2RenderingContext,
    projection: mat4,
    view: mat4,
    model: mat4,
    lightPos: vec3,
    cameraPos: vec3,
    numParticles: number
  ) {
    gl.bindVertexArray(this.particleVAO);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.viewSwapTextureFBO);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.viewTextureFBO);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.viewShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.viewShader.program, 'particlePositions'),
      0
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.viewShader.program, 'projection'),
      false,
      projection
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.viewShader.program, 'view'),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.viewShader.program, 'model'),
      false,
      model
    );
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, numParticles);

    gl.disable(gl.DEPTH_TEST);
    for (let i = 0; i < SMOOTHING_ITERATIONS; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.viewSwapTextureFBO);
      this.smoothingShader.use(gl);
      gl.uniform1i(
        gl.getUniformLocation(this.smoothingShader.program, 'viewTexture'),
        20
      );
      gl.uniform1f(
        gl.getUniformLocation(this.smoothingShader.program, 'screenWidth'),
        gl.canvas.width
      );
      gl.uniform1f(
        gl.getUniformLocation(this.smoothingShader.program, 'screenHeight'),
        gl.canvas.height
      );
      gl.uniform2f(
        gl.getUniformLocation(this.smoothingShader.program, 'blurDir'),
        1,
        0
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.viewTextureFBO);
      this.smoothingShader.use(gl);
      gl.uniform1i(
        gl.getUniformLocation(this.smoothingShader.program, 'viewTexture'),
        21
      );
      gl.uniform1f(
        gl.getUniformLocation(this.smoothingShader.program, 'screenWidth'),
        gl.canvas.width
      );
      gl.uniform1f(
        gl.getUniformLocation(this.smoothingShader.program, 'screenHeight'),
        gl.canvas.height
      );
      gl.uniform2f(
        gl.getUniformLocation(this.smoothingShader.program, 'blurDir'),
        0,
        1
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.enable(gl.DEPTH_TEST);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalTextureFBO);
    this.normalShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.normalShader.program, 'viewTexture'),
      20
    );
    gl.uniform1f(
      gl.getUniformLocation(this.normalShader.program, 'screenWidth'),
      gl.canvas.width
    );
    gl.uniform1f(
      gl.getUniformLocation(this.normalShader.program, 'screenHeight'),
      gl.canvas.height
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thicknessTextureFBO);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.thicknessShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.thicknessShader.program, 'particlePositions'),
      0
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.thicknessShader.program, 'projection'),
      false,
      projection
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.thicknessShader.program, 'view'),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.thicknessShader.program, 'model'),
      false,
      model
    );
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, numParticles);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thicknessSwapTextureFBO);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.thicknessSmoothingShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(
        this.thicknessSmoothingShader.program,
        'thicknessTexture'
      ),
      23
    );
    gl.uniform1f(
      gl.getUniformLocation(
        this.thicknessSmoothingShader.program,
        'screenWidth'
      ),
      gl.canvas.width
    );
    gl.uniform1f(
      gl.getUniformLocation(
        this.thicknessSmoothingShader.program,
        'screenHeight'
      ),
      gl.canvas.height
    );
    gl.uniform2f(
      gl.getUniformLocation(this.thicknessSmoothingShader.program, 'blurDir'),
      1,
      0
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thicknessTextureFBO);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.thicknessSmoothingShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(
        this.thicknessSmoothingShader.program,
        'thicknessTexture'
      ),
      24
    );
    gl.uniform1f(
      gl.getUniformLocation(
        this.thicknessSmoothingShader.program,
        'screenWidth'
      ),
      gl.canvas.width
    );
    gl.uniform1f(
      gl.getUniformLocation(
        this.thicknessSmoothingShader.program,
        'screenHeight'
      ),
      gl.canvas.height
    );
    gl.uniform2f(
      gl.getUniformLocation(this.thicknessSmoothingShader.program, 'blurDir'),
      0,
      1
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fluidShader.use(gl);
    gl.uniform1i(
      gl.getUniformLocation(this.fluidShader.program, 'viewTexture'),
      20
    );
    gl.uniform1i(
      gl.getUniformLocation(this.fluidShader.program, 'normalTexture'),
      22
    );
    gl.uniform1i(
      gl.getUniformLocation(this.fluidShader.program, 'thicknessTexture'),
      23
    );
    gl.uniform1f(
      gl.getUniformLocation(this.fluidShader.program, 'screenWidth'),
      gl.canvas.width
    );
    gl.uniform1f(
      gl.getUniformLocation(this.fluidShader.program, 'screenHeight'),
      gl.canvas.height
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.fluidShader.program, 'projection'),
      false,
      projection
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
  }
}

export default SmoothRenderer;
