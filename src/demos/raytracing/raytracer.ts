import { vec3, vec4 } from 'gl-matrix';
import Shader from './shader';

const MAX_TEXTURE_SIZE = 1024;
const NUM_MULTISAMPLES = 1;

export enum Material {
  lambertian = 0,
  metallic = 1,
  dielectric = 2,
}

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

const raytracerFragmentShader = `#version 300 es

  #define PI 3.141592653589

  precision highp float;
  precision highp sampler2D;
  
  out vec4 FragColor;

  uniform sampler2D objectsTexture;
  uniform sampler2D randomTexture;
  uniform sampler2D materialsTexture;

  uniform float screenWidth;
  uniform float screenHeight;
  uniform int numSpheres;
  uniform int numTori;

  uniform vec3 cameraPos;
  uniform vec3 cameraFront;
  uniform float fov;
  uniform float focusDistance;
  uniform float aperture;

  uniform int time;
  int randState;

  uniform int rendersSinceLastViewChange;

  // const float infinity = uintBitsToFloat(0x7F800000u);
  const float infinity = pow(2., 20.);

  float rand() {
    randState = abs(1103515245 * randState + 12345) % (1 << 16);
    return float(randState) / float(1 << 16);
  }
  
  vec3 randomPointInSphere() {
    vec3 v = 2. * vec3(rand(), rand(), rand()) - 1.;

    while (dot(v, v) >= 1.) {
      v = 2. * vec3(rand(), rand(), rand()) - 1.;
    }

    return v;
  }

  vec3 randomPointInDisk() {
    vec3 v = 2. * vec3(rand(), rand(), 0.);

    while (dot(v, v) >= 1.) {
      v = 2. * vec3(rand(), rand(), 0.);
    }

    return v;
  }

  vec3 randomUnitVector() {
    return normalize(randomPointInSphere());
  }

  vec4 getSphereGeometry(int sphereId) {
    return texelFetch(objectsTexture, ivec2(sphereId * 2 + 0, 0), 0);
  }

  int getSphereMaterialId(int sphereId) {
    return int(texelFetch(objectsTexture, ivec2(sphereId * 2 + 1, 0), 0).w);
  }

  vec3 getTorusPosition(int torusId) {
    return texelFetch(objectsTexture, ivec2(torusId * 2 + 0, 1), 0).xyz;
  }

  vec2 getTorusRadii(int torusId) {
    return texelFetch(objectsTexture, ivec2(torusId * 2 + 1, 1), 0).xy;
  }

  int getTorusMaterialId(int torusId) {
    return int(texelFetch(objectsTexture, ivec2(torusId * 2 + 1, 1), 0).w);
  }

  int getMaterialType(int materialId) {
    return int(texelFetch(materialsTexture, ivec2(materialId * 2 + 0, 0), 0).w);
  }

  vec3 getMaterialColor(int materialId) {
    return texelFetch(materialsTexture, ivec2(materialId * 2 + 0, 0), 0).xyz;
  }

  vec4 getMaterialOptionalParams(int materialId) {
    return texelFetch(materialsTexture, ivec2(materialId * 2 + 1, 0), 0);
  }

  float reflectance(float cosTheta, float indexRatio) {
    float r0 = pow((1. - indexRatio) / (1. + indexRatio), 2.);
    return r0 + (1. - r0) * pow(1. - cosTheta, 5.);
  }

  bool isZero(float x) {
    return abs(x) < 0.0001;
  }

  float cbrt(float x) {
    if (x >= 0.) {
      return pow(x, 1./3.);
    }
    else {
      return -pow(-x, 1./3.);
    }
  }
  
  int solveQuadratic(float coeffs[3], out float sols[2]) {
    float p, q, D;

    p = coeffs[1] / (2. * coeffs[2]);
    q = coeffs[0] / coeffs[2];

    D = p * p - q;

    if (isZero(D)) {
      sols[0] = -p;
    }
    else if (D < 0.) {
      return 0;
    }
    else {
      float sqrtD = sqrt(D);

      sols[0] = sqrtD - p;
      sols[1] = -sqrtD - p;
      return 2;
    }
  }

  int solveCubic(float coeffs[4], out float sols[3]) {
    int i, num;
    float sub;
    float A, B, C;
    float sqA, p, q;
    float cbP, D;
    
    A = coeffs[2] / coeffs[3];
    B = coeffs[1] / coeffs[3];
    C = coeffs[0] / coeffs[3];

    sqA = A * A;
    p = 1./3. * (-1./3. * sqA + B);
    q = 1./2. * (2./27. * A * sqA - 1./3. * A * B + C);

    cbP = p * p * p;
    D = q * q + cbP;

    if (isZero(D)) {
      if (isZero(q)) {
        sols[0] = 0.;
        num = 1;
      }
      else {
        float u = cbrt(-q);
        sols[0] = 2. * u;
        sols[1] = -u;
        num = 2;
      }
    }
    else if (D < 0.) {
      float phi = 1./3. * acos(-q / sqrt(-cbP));
      float t = 2. * sqrt(-p);

      sols[0] = t * cos(phi);
      sols[1] = -t * cos(phi + PI / 3.);
      sols[2] = -t * cos(phi - PI / 3.);
      num = 3;
    }
    else {
      float sqrtD = sqrt(D);
      float u = cbrt(sqrtD - q);
      float v = -cbrt(sqrtD + q);

      sols[0] = u + v;
      num = 1;
    }

    sub = 1./3. * A;

    for (i = 0; i < num; i++) {
      sols[i] -= sub;
    }

    return num;
  }

  int solveQuartic(float coeffs[5], out float sols[4]) {
    float cubicCoeffs[4];
    float quadraticCoeffs[3];
    float z, u, v, sub;
    float A, B, C, D;
    float sqA, p, q, r;
    int i, num;

    A = coeffs[3] / coeffs[4];
    B = coeffs[2] / coeffs[4];
    C = coeffs[1] / coeffs[4];
    D = coeffs[0] / coeffs[4];

    sqA = A * A;
    p = -3./8. * sqA + B;
    q = 1./8. * sqA * A - 1./2. * A * B + C;
    r = -3./256. * sqA * sqA + 1./16. * sqA * B - 1./4. * A * C + D;

    if (isZero(r)) {
      cubicCoeffs[0] = q;
      cubicCoeffs[1] = p;
      cubicCoeffs[2] = 0.;
      cubicCoeffs[3] = 1.;

      float tempSols[3];
      num = solveCubic(cubicCoeffs, tempSols);
      for (int j = 0; j < num; j++) {
        sols[j] = tempSols[j];
      }
      num++;
      sols[num] = 0.;
    }
    else {
      cubicCoeffs[0] = 1./2. * r * p - 1./8. * q * q;
      cubicCoeffs[1] = -r;
      cubicCoeffs[2] = -1./2. * p;
      cubicCoeffs[3] = 1.;

      float cubicSols[3];
      num = solveCubic(cubicCoeffs, cubicSols);
      for (int j = 0; j < num; j++) {
        sols[j] = cubicSols[j];
      }
      z = sols[0];

      u = z * z - r;
      v = 2. * z - p;

      if (isZero(u)) {
        u = 0.;
      }
      else if (u > 0.) {
        u = sqrt(u);
      }
      else {
        return 0;
      }

      if (isZero(v)) {
        v = 0.;
      }
      else if (v > 0.) {
        v = sqrt(v);
      }
      else {
        return 0;
      }

      quadraticCoeffs[0] = z - u;
      quadraticCoeffs[1] = q < 0. ? -v : v;
      quadraticCoeffs[2] = 1.;

      float quadraticSols[2];
      num = solveQuadratic(quadraticCoeffs, quadraticSols);
      for (int j = 0; j < num; j++) {
        sols[j] = quadraticSols[j];
      }

      quadraticCoeffs[0] = z + u;
      quadraticCoeffs[1] = q < 0. ? v : -v;
      quadraticCoeffs[2] = 1.;

      int tempNum = solveQuadratic(quadraticCoeffs, quadraticSols);
      for (int j = 0; j < tempNum; j++) {
        sols[num + j] = quadraticSols[j];
      }

      num += tempNum;
    }

    sub = 1./4. * A;

    for (i = 0; i < num; i++) {
      sols[i] -= sub;
    }

    return num;
  }

  bool hitSphere(vec3 rayOrigin, vec3 rayDirection, inout float t, inout vec3 normal, inout int materialId, inout bool isFrontFace) {
    bool collided = false;

    for (int sphereId = 0; sphereId < numSpheres; sphereId++) {
      vec4 sphere = getSphereGeometry(sphereId);
      vec3 center = sphere.xyz;
      float r = sphere.w;
      
      vec3 co = rayOrigin - center;
      float a = dot(rayDirection, rayDirection);
      float halfB = dot(co, rayDirection);
      float c = dot(co, co) - r * r;
      float discriminant = halfB * halfB - a * c;
      
      if (discriminant >= 0.) {
        float newT = (-halfB - sqrt(discriminant)) / a;
        if (newT <= 0.01 || newT > 100.) {
          newT = (-halfB + sqrt(discriminant)) / a;
          if (newT <= 0.01 || newT > 100.) {
            continue;
          }
        }

        if (newT < t) {
          t = newT;

          normal = (rayOrigin + t * rayDirection - center) / r;
          if (dot(rayDirection, normal) > 0.) {
            normal *= -1.;
            isFrontFace = false;
          }
          else {
            isFrontFace = true;
          }

          materialId = getSphereMaterialId(sphereId);
        }

        collided = true;
      }
    }

    return collided;
  }

  bool hitTorus(vec3 rayOrigin, vec3 rayDirection, inout float t, inout vec3 normal, inout int materialId, inout bool isFrontFace) {
    bool collided = false;

    for (int torusId = 0; torusId < numTori; torusId++) {
      vec3 center = getTorusPosition(torusId);
      vec2 radii = getTorusRadii(torusId);
      float R = radii.x;
      float r = radii.y;
      
      rayOrigin -= center;
      float a = pow(dot(rayDirection, rayDirection), 2.);
      float b = 4. * dot(rayDirection, rayDirection) * dot(rayOrigin, rayDirection);
      float c = 2. * dot(rayDirection, rayDirection) * (dot(rayOrigin, rayOrigin) - (r * r + R * R)) + 4. * pow(dot(rayOrigin, rayDirection), 2.) + 4. * R * R * pow(rayDirection.y, 2.);
      float d = 4. * (dot(rayOrigin, rayOrigin) - (r * r + R * R)) * dot(rayOrigin, rayDirection) + 8. * R * R * rayOrigin.y * rayDirection.y;
      float e = pow(dot(rayOrigin, rayOrigin) - (r * r + R * R), 2.) - 4. * R * R * (r * r - pow(rayOrigin.y, 2.));
  
      float coeffs[5] = float[5](e, d, c, b, a);
      float sols[4];

      int numSols = solveQuartic(coeffs, sols);
      if (numSols == 0) {
        rayOrigin += center;
        continue;
      }

      float smallestPositive = t;
      for (int i = 0; i < numSols; i++) {
        if (sols[i] > 0.01 && sols[i] < smallestPositive) {
          smallestPositive = sols[i];
        }
      }
      
      if (smallestPositive < t) {
        t = smallestPositive;
        vec3 p = rayOrigin + t * rayDirection;

        float alpha = R / sqrt(p.x * p.x + p.z * p.z);
        normal = vec3((1. - alpha) * p.x, p.y, (1. - alpha) * p.z);
        normal = normalize(normal);

        if (dot(rayDirection, normal) > 0.) {
          normal *= -1.;
          isFrontFace = false;
        }
        else {
          isFrontFace = true;
        }

        materialId = getTorusMaterialId(torusId);
        collided = true;
      }

      rayOrigin += center;
    }

    return collided;
  }

  bool hitObject(vec3 rayOrigin, vec3 rayDirection, out float t, out vec3 normal, out int materialId, out bool isFrontFace) {
    t = infinity;
    
    bool collided = hitSphere(rayOrigin, rayDirection, t, normal, materialId, isFrontFace);
    collided = hitTorus(rayOrigin, rayDirection, t, normal, materialId, isFrontFace) || collided;

    return collided;
  }

  vec3 rayColor(vec3 rayOrigin, vec3 rayDirection) {
    vec3 attenuation = vec3(1.);
    
    // float coeffs[5] = float[](180., 84., -19., -6., 1.);
    // float sols[4];
    // int n = solveQuartic(coeffs, sols);
    // if (n == 0) return vec3(1., 0., 0.);

    int i;
    for (i = 0; i < 20; i++) {
      float t;
      vec3 normal;
      int materialId;
      bool isFrontFace;
      bool hit = hitObject(rayOrigin, rayDirection, t, normal, materialId, isFrontFace);
      if (hit) {
        if (materialId == 0) {
          // return vec3(t / 10.);
          // return vec3(1., 0., 0.);
        }
        
        int materialType = getMaterialType(materialId);
        vec3 materialColor = getMaterialColor(materialId);
        vec4 materialOptionalParams = getMaterialOptionalParams(materialId);
        
        if (materialType == 0) {
          vec3 p = rayOrigin + t * rayDirection;
          rayOrigin = p;
          rayDirection = normalize(normal + randomPointInSphere());
          attenuation *= materialColor;
        }
        else if (materialType == 1) {
          vec3 p = rayOrigin + t * rayDirection;
          rayOrigin = p;
          rayDirection = normalize(reflect(rayDirection, normal) + materialOptionalParams.x * randomPointInSphere());
          attenuation *= materialColor;
        }
        else if (materialType == 2) {
          attenuation *= materialColor;
          vec3 p = rayOrigin + t * rayDirection;
          float refractionRatio = isFrontFace ? (1. / materialOptionalParams.x) : materialOptionalParams.x;

          float cosTheta = min(dot(-rayDirection, normal), 1.);
          float sinTheta = sqrt(1. - cosTheta * cosTheta);

          bool cannotRefract = refractionRatio * sinTheta > 1.;
          vec3 newDirection;

          if (cannotRefract || rand() < reflectance(cosTheta, refractionRatio)) {
            newDirection = reflect(rayDirection, normal);
          }
          else {
            newDirection = refract(rayDirection, normal, refractionRatio);
          }

          rayOrigin = p;
          rayDirection = newDirection;
        }
      }
      else {
        break;
      }
    }

    float v = .5 * (rayDirection.y + 1.);
    return attenuation * ((1. - v) * vec3(1.) + v * vec3(.5, .7, 1.));
  }

  void main() {
    randState = int(texelFetch(randomTexture, ivec2(gl_FragCoord.xy), 0).x * 1000.) % 1000 + time % 1000;

    vec3 worldUp = vec3(0., 1., 0.);

    vec3 backwards = -normalize(cameraFront);
    vec3 cameraRight = normalize(cross(worldUp, backwards));
    vec3 cameraUp = normalize(cross(backwards, cameraRight));

    float h = tan(fov / 2.);
    float viewportHeight = 2. * h;
    float aspectRatio = screenWidth / screenHeight;
    float viewportWidth = viewportHeight * aspectRatio;
    vec3 horizontal = focusDistance * viewportWidth * cameraRight;
    vec3 vertical = focusDistance * viewportHeight * cameraUp;
    vec3 bottomLeft = cameraPos - horizontal / 2. - vertical / 2. - focusDistance * backwards;

    vec3 sumColor = vec3(0.);
    for (int i = 0; i < ${NUM_MULTISAMPLES}; i++) {
      vec3 r = aperture / 2. * randomPointInDisk();
      vec3 offset = cameraRight * r.x + cameraUp * r.y;
      vec3 rayOrigin = cameraPos + offset;

      float u = (gl_FragCoord.x + rand() - .5) / screenWidth;
      float v = (gl_FragCoord.y + rand() - .5) / screenHeight;
      vec3 rayDirection = normalize(bottomLeft + u * horizontal + v * vertical - rayOrigin);

      sumColor += rayColor(rayOrigin, rayDirection);
    }

    float gamma = 2.;

    vec3 avg = sumColor / float(${NUM_MULTISAMPLES});
    vec3 gammaCorrected = vec3(pow(avg.x, 1. / gamma), pow(avg.y, 1. / gamma), pow(avg.z, 1. / gamma));

    FragColor = vec4(gammaCorrected, 1. / float(rendersSinceLastViewChange + 1));
  }
`;

export default class Raytracer {
  gl: WebGL2RenderingContext;
  raytracingVAO: WebGLVertexArrayObject;
  shader: Shader;
  objectsTexture: WebGLTexture;
  numSpheres: number = 0;
  randomTexture: WebGLTexture;
  rendersSinceLastViewChange: number = 0;
  prevCameraPosition: vec3 = [0, 0, 0];
  prevCameraFront: vec3 = [0, 0, 0];
  prevFov: number = 0;
  blendingRenderbuffer: WebGLRenderbuffer;
  materialsTexture: WebGLTexture;
  numMaterials: number = 0;
  numTori: number = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    this.raytracingVAO = gl.createVertexArray()!;

    this.objectsTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.objectsTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_SIZE,
      2,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const randomTextureData = new Float32Array(
      gl.canvas.width * gl.canvas.height * 4
    );
    for (let i = 0; i < gl.canvas.width * gl.canvas.height * 4; i++) {
      randomTextureData[i] = Math.random();
    }

    this.randomTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.randomTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.FLOAT,
      randomTextureData
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.materialsTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.materialsTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      MAX_TEXTURE_SIZE,
      1,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.blendingRenderbuffer = gl.createRenderbuffer()!;

    this.shader = new Shader(
      gl,
      fullscreenVertexShader,
      raytracerFragmentShader
    );
  }

  addSphere(pos: vec3, r: number, materialId: number) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.numSpheres * 2,
      0,
      2,
      1,
      this.gl.RGBA,
      this.gl.FLOAT,
      new Float32Array([pos[0], pos[1], pos[2], r, 0, 0, 0, materialId])
    );

    this.numSpheres++;
  }

  addTorus(
    pos: vec3,
    majorRadius: number,
    minorRadius: number,
    materialId: number
  ) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.numTori * 2,
      1,
      2,
      1,
      this.gl.RGBA,
      this.gl.FLOAT,
      new Float32Array([
        pos[0],
        pos[1],
        pos[2],
        0,
        majorRadius,
        minorRadius,
        0,
        materialId,
      ])
    );

    this.numTori++;
  }

  createLambertian(color: vec3) {
    this.createMaterial(color, Material.lambertian, [0, 0, 0, 0]);
    return this.numMaterials - 1;
  }

  createMetallic(color: vec3, fuzziness: number) {
    this.createMaterial(color, Material.metallic, [fuzziness, 0, 0, 0]);
    return this.numMaterials - 1;
  }

  createDielectric(color: vec3, indexOfRefraction: number) {
    this.createMaterial(color, Material.dielectric, [
      indexOfRefraction,
      0,
      0,
      0,
    ]);
    return this.numMaterials - 1;
  }

  createMaterial(color: vec3, material: Material, optionalParams: vec4) {
    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.numMaterials * 2,
      0,
      2,
      1,
      this.gl.RGBA,
      this.gl.FLOAT,
      new Float32Array([
        color[0],
        color[1],
        color[2],
        material,
        optionalParams[0],
        optionalParams[1],
        optionalParams[2],
        optionalParams[3],
      ])
    );

    this.numMaterials++;
  }

  render(position: vec3, front: vec3, fov: number) {
    if (
      !vec3.exactEquals(this.prevCameraPosition, position) ||
      !vec3.exactEquals(this.prevCameraFront, front) ||
      this.prevFov !== fov
    ) {
      this.rendersSinceLastViewChange = 0;
    }

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.bindVertexArray(this.raytracingVAO);
    this.shader.use();
    this.shader.setFloat('screenWidth', this.gl.canvas.width);
    this.shader.setFloat('screenHeight', this.gl.canvas.height);
    this.shader.setInt('numSpheres', this.numSpheres);
    this.shader.setInt('numTori', this.numTori);
    this.shader.setInt('objectsTexture', 0);
    this.shader.setInt('randomTexture', 1);
    this.shader.setInt('materialsTexture', 2);
    this.shader.setInt('time', Date.now());
    this.shader.setVec3('cameraPos', position[0], position[1], position[2]);
    this.shader.setVec3('cameraFront', front[0], front[1], front[2]);
    this.shader.setFloat('fov', fov);
    this.shader.setFloat('aperture', 0.0);
    this.shader.setFloat('focusDistance', 8.0);
    this.shader.setInt(
      'rendersSinceLastViewChange',
      this.rendersSinceLastViewChange
    );
    this.shader.setInt('numMaterials', this.numMaterials);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    this.rendersSinceLastViewChange++;
    vec3.copy(this.prevCameraPosition, position);
    vec3.copy(this.prevCameraFront, front);
    this.prevFov = fov;
  }
}
