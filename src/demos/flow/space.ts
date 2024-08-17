import Shader from './shader';

const RELAXATION_RATE = 1.9;

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

const streamFragmentShader = `#version 300 es

  precision highp float;

  uniform ivec2 numCells;
  uniform vec2 u;

  uniform sampler2D f;

  out vec4 fStar;

  const float w[9] = float[](
    4. / 9.,
    1. / 9.,
    1. / 9.,
    1. / 9.,
    1. / 9.,
    1. / 36.,
    1. / 36.,
    1. / 36.,
    1. / 36.
  );

  const ivec2 c[9] = ivec2[](
    ivec2(0, 0),
    ivec2(1, 0),
    ivec2(0, 1),
    ivec2(-1, 0),
    ivec2(0, -1),
    ivec2(1, 1),
    ivec2(-1, 1),
    ivec2(-1, -1),
    ivec2(1, -1)
  );

  void main() {
    ivec2 textureRegion = ivec2(gl_FragCoord) / numCells;
    int i = textureRegion.y * 3 + textureRegion.x;

    int ix = int(gl_FragCoord.x) % numCells.x;
    int iy = int(gl_FragCoord.y) % numCells.y;
    int nx = (ix - c[i].x + numCells.x) % numCells.x;
    int ny = (iy - c[i].y + numCells.y) % numCells.y;

    // if (iy == 0 && (i == 2 || i == 5 || i == 6)) {
    //   if (i == 2) fStar = texelFetch(f, ivec2(ix, iy) + ivec2(1, 1) * numCells, 0);
    //   else if (i == 5) fStar = texelFetch(f, ivec2(ix, iy) + ivec2(2, 2) * numCells, 0);
    //   else if (i == 6) fStar = texelFetch(f, ivec2(ix, iy) + ivec2(1, 2) * numCells, 0);
    //   return;
    // } else if (iy == numCells.y - 1 && (i == 4 || i == 7 || i == 8)) {
    //   if (i == 4) fStar = texelFetch(f, ivec2(ix, iy) + ivec2(2, 0) * numCells, 0);
    //   else if (i == 7) fStar = texelFetch(f, ivec2(ix, iy) + ivec2(0, 2) * numCells, 0);
    //   else if (i == 8) fStar = texelFetch(f, ivec2(ix, iy) + ivec2(2, 1) * numCells, 0);
    //   return;
    if (ix == 0 || ix == numCells.x - 1 || iy == 0 || iy == numCells.y - 1) {
      float cu = dot(vec2(c[i]), u);
      float fEq = w[i] * (1. + 3. * cu + 9. / 2. * cu * cu - 3. / 2. * dot(u, u));
      fStar = vec4(fEq, 0., 0., 1.);
      return;
    }

    fStar = texelFetch(f, ivec2(nx, ny) + textureRegion * numCells, 0);
  }
`;

const collideFragmentShader = `#version 300 es

  precision highp float;

  uniform ivec2 numCells;

  uniform sampler2D fStar;
  uniform sampler2D betas;

  out vec4 f;

  const vec2 c[9] = vec2[](
    vec2(0, 0),
    vec2(1, 0),
    vec2(0, 1),
    vec2(-1, 0),
    vec2(0, -1),
    vec2(1, 1),
    vec2(-1, 1),
    vec2(-1, -1),
    vec2(1, -1)
  );

  const float w[9] = float[](
    4. / 9.,
    1. / 9.,
    1. / 9.,
    1. / 9.,
    1. / 9.,
    1. / 36.,
    1. / 36.,
    1. / 36.,
    1. / 36.
  );

  void main() {
    ivec2 textureRegion = ivec2(gl_FragCoord) / numCells;
    int i = textureRegion.y * 3 + textureRegion.x;

    int ix = int(gl_FragCoord.x) % numCells.x;
    int iy = int(gl_FragCoord.y) % numCells.y;

    float rho = 0.;
    vec2 u = vec2(0);
    for (int j = 0; j < 9; j++) {
      float val = texelFetch(fStar, ivec2(ix + (j % 3) * numCells.x, iy + (j / 3) * numCells.y), 0).x;
      rho += val;
      u += c[j] * val;
    }
    
    u /= rho;
    u *= (1. - texelFetch(betas, ivec2(ix, iy), 0).x);

    float cu = dot(c[i], u);
    float fEq = w[i] * rho * (1. + 3. * cu + 9. / 2. * cu * cu - 3. / 2. * dot(u, u));
    float current = texelFetch(fStar, ivec2(gl_FragCoord.xy), 0).x;

    f = vec4(current + (fEq - current) * ${RELAXATION_RATE}, 0., 0., 1.);
  }
`;

const addBetasFragmentShader = `#version 300 es

  precision highp float;

  uniform vec2 lineStart;
  uniform vec2 lineEnd;

  out vec4 beta;

  float cross2d(vec2 a, vec2 b) {
    return a.x * b.y - a.y * b.x;
  }

  void main() {
    vec2 pos = gl_FragCoord.xy - vec2(0.5);

    float dist;
    if (distance(lineStart, lineEnd) < 1.) {
      dist = distance(pos, lineStart);
    } else {
      float distAlongLine = clamp(dot(normalize(lineEnd - lineStart), pos - lineStart), 0., distance(lineStart, lineEnd));
      vec2 closestPoint = lineStart + normalize(lineEnd - lineStart) * distAlongLine;
      dist = distance(pos, closestPoint);
    }

    if (dist < 10.) {
      beta = vec4(1., 0., 0., 1.);
    } else if (dist < 12.) {
      beta = vec4((dist - 10.) / 2., 0., 0., 1.);
    } else {
      discard;
    }
  }
`;

const drawFragmentShader = `#version 300 es

  precision highp float;

  uniform vec2 numCells;
  uniform vec2 screenSize;

  uniform sampler2D f;

  out vec4 FragColor;

  const vec2 c[9] = vec2[](
    vec2(0, 0),
    vec2(1, 0),
    vec2(0, 1),
    vec2(-1, 0),
    vec2(0, -1),
    vec2(1, 1),
    vec2(-1, 1),
    vec2(-1, -1),
    vec2(1, -1)
  );

  const int heatmapPalette[433] = int[](0x00000a, 0x000014, 0x00001e, 0x000025, 0x00002a, 0x00002e, 0x000032, 0x000036, 0x00003a, 0x00003e, 0x000042, 0x000046, 0x00004a, 0x00004f, 0x000052, 0x010055, 0x010057, 0x020059, 0x02005c, 0x03005e, 0x040061, 0x040063, 0x050065, 0x060067, 0x070069, 0x08006b, 0x09006e, 0x0a0070, 0x0b0073, 0x0c0074, 0x0d0075, 0x0d0076, 0x0e0077, 0x100078, 0x120079, 0x13007b, 0x15007c, 0x17007d, 0x19007e, 0x1b0080, 0x1c0081, 0x1e0083, 0x200084, 0x220085, 0x240086, 0x260087, 0x280089, 0x2a0089, 0x2c008a, 0x2e008b, 0x30008c, 0x32008d, 0x34008e, 0x36008e, 0x38008f, 0x390090, 0x3b0091, 0x3c0092, 0x3e0093, 0x3f0093, 0x410094, 0x420095, 0x440095, 0x450096, 0x470096, 0x490096, 0x4a0096, 0x4c0097, 0x4e0097, 0x4f0097, 0x510097, 0x520098, 0x540098, 0x560098, 0x580099, 0x5a0099, 0x5c0099, 0x5d009a, 0x5f009a, 0x61009b, 0x63009b, 0x64009b, 0x66009b, 0x68009b, 0x6a009b, 0x6c009c, 0x6d009c, 0x6f009c, 0x70009c, 0x71009d, 0x73009d, 0x75009d, 0x77009d, 0x78009d, 0x7a009d, 0x7c009d, 0x7e009d, 0x7f009d, 0x81009d, 0x83009d, 0x84009d, 0x86009d, 0x87009d, 0x89009d, 0x8a009d, 0x8b009d, 0x8d009d, 0x8f009c, 0x91009c, 0x93009c, 0x95009c, 0x96009b, 0x98009b, 0x99009b, 0x9b009b, 0x9c009b, 0x9d009b, 0x9f009b, 0xa0009b, 0xa2009b, 0xa3009b, 0xa4009b, 0xa6009a, 0xa7009a, 0xa8009a, 0xa90099, 0xaa0099, 0xab0099, 0xad0099, 0xae0198, 0xaf0198, 0xb00198, 0xb00198, 0xb10197, 0xb20197, 0xb30196, 0xb40296, 0xb50295, 0xb60295, 0xb70395, 0xb80395, 0xb90495, 0xba0495, 0xba0494, 0xbb0593, 0xbc0593, 0xbd0593, 0xbe0692, 0xbf0692, 0xbf0692, 0xc00791, 0xc00791, 0xc10890, 0xc10990, 0xc20a8f, 0xc30a8e, 0xc30b8e, 0xc40c8d, 0xc50c8c, 0xc60d8b, 0xc60e8a, 0xc70f89, 0xc81088, 0xc91187, 0xca1286, 0xca1385, 0xcb1385, 0xcb1484, 0xcc1582, 0xcd1681, 0xce1780, 0xce187e, 0xcf187c, 0xcf197b, 0xd01a79, 0xd11b78, 0xd11c76, 0xd21c75, 0xd21d74, 0xd31e72, 0xd32071, 0xd4216f, 0xd4226e, 0xd5236b, 0xd52469, 0xd62567, 0xd72665, 0xd82764, 0xd82862, 0xd92a60, 0xda2b5e, 0xda2c5c, 0xdb2e5a, 0xdb2f57, 0xdc2f54, 0xdd3051, 0xdd314e, 0xde324a, 0xde3347, 0xdf3444, 0xdf3541, 0xdf363d, 0xe0373a, 0xe03837, 0xe03933, 0xe13a30, 0xe23b2d, 0xe23c2a, 0xe33d26, 0xe33e23, 0xe43f20, 0xe4411d, 0xe4421c, 0xe5431b, 0xe54419, 0xe54518, 0xe64616, 0xe74715, 0xe74814, 0xe74913, 0xe84a12, 0xe84c10, 0xe84c0f, 0xe94d0e, 0xe94d0d, 0xea4e0c, 0xea4f0c, 0xeb500b, 0xeb510a, 0xeb520a, 0xeb5309, 0xec5409, 0xec5608, 0xec5708, 0xec5808, 0xed5907, 0xed5a07, 0xed5b06, 0xee5c06, 0xee5c05, 0xee5d05, 0xee5e05, 0xef5f04, 0xef6004, 0xef6104, 0xef6204, 0xf06303, 0xf06403, 0xf06503, 0xf16603, 0xf16603, 0xf16703, 0xf16803, 0xf16902, 0xf16a02, 0xf16b02, 0xf16b02, 0xf26c01, 0xf26d01, 0xf26e01, 0xf36f01, 0xf37001, 0xf37101, 0xf37201, 0xf47300, 0xf47400, 0xf47500, 0xf47600, 0xf47700, 0xf47800, 0xf47a00, 0xf57b00, 0xf57c00, 0xf57e00, 0xf57f00, 0xf68000, 0xf68100, 0xf68200, 0xf78300, 0xf78400, 0xf78500, 0xf78600, 0xf88700, 0xf88800, 0xf88800, 0xf88900, 0xf88a00, 0xf88b00, 0xf88c00, 0xf98d00, 0xf98d00, 0xf98e00, 0xf98f00, 0xf99000, 0xf99100, 0xf99200, 0xf99300, 0xfa9400, 0xfa9500, 0xfa9600, 0xfb9800, 0xfb9900, 0xfb9a00, 0xfb9c00, 0xfc9d00, 0xfc9f00, 0xfca000, 0xfca100, 0xfda200, 0xfda300, 0xfda400, 0xfda600, 0xfda700, 0xfda800, 0xfdaa00, 0xfdab00, 0xfdac00, 0xfdad00, 0xfdae00, 0xfeaf00, 0xfeb000, 0xfeb100, 0xfeb200, 0xfeb300, 0xfeb400, 0xfeb500, 0xfeb600, 0xfeb800, 0xfeb900, 0xfeb900, 0xfeba00, 0xfebb00, 0xfebc00, 0xfebd00, 0xfebe00, 0xfec000, 0xfec100, 0xfec200, 0xfec300, 0xfec400, 0xfec500, 0xfec600, 0xfec700, 0xfec800, 0xfec901, 0xfeca01, 0xfeca01, 0xfecb01, 0xfecc02, 0xfecd02, 0xfece03, 0xfecf04, 0xfecf04, 0xfed005, 0xfed106, 0xfed308, 0xfed409, 0xfed50a, 0xfed60a, 0xfed70b, 0xfed80c, 0xfed90d, 0xffda0e, 0xffda0e, 0xffdb10, 0xffdc12, 0xffdc14, 0xffdd16, 0xffde19, 0xffde1b, 0xffdf1e, 0xffe020, 0xffe122, 0xffe224, 0xffe226, 0xffe328, 0xffe42b, 0xffe42e, 0xffe531, 0xffe635, 0xffe638, 0xffe73c, 0xffe83f, 0xffe943, 0xffea46, 0xffeb49, 0xffeb4d, 0xffec50, 0xffed54, 0xffee57, 0xffee5b, 0xffee5f, 0xffef63, 0xffef67, 0xfff06a, 0xfff06e, 0xfff172, 0xfff177, 0xfff17b, 0xfff280, 0xfff285, 0xfff28a, 0xfff38e, 0xfff492, 0xfff496, 0xfff49a, 0xfff59e, 0xfff5a2, 0xfff5a6, 0xfff6aa, 0xfff6af, 0xfff7b3, 0xfff7b6, 0xfff8ba, 0xfff8bd, 0xfff8c1, 0xfff8c4, 0xfff9c7, 0xfff9ca, 0xfff9cd, 0xfffad1, 0xfffad4, 0xfffbd8, 0xfffcdb, 0xfffcdf, 0xfffde2, 0xfffde5, 0xfffde8, 0xfffeeb, 0xfffeee, 0xfffef1, 0xfffef4, 0xfffff6);

  vec3 heatmap(float val) {
    int index = int(clamp(abs(val), 0., 1.) * 432.);
    int hexColor = heatmapPalette[index];
    return vec3(hexColor >> 16, (hexColor >> 8) & 0xFF, hexColor & 0xFF) / 255.0;
  }

  void main() {
    ivec2 pos = ivec2(gl_FragCoord.xy / screenSize * numCells);
    float rho0 = 0.;
    float rho1 = 0.;
    float rho2 = 0.;
    float rho3 = 0.;
    vec2 u0 = vec2(0);
    vec2 u1 = vec2(0);
    vec2 u2 = vec2(0);
    vec2 u3 = vec2(0);

    for (int i = 0; i < 9; i++) {
      float val0 = texelFetch(f, ivec2(pos.x + 1 + (i % 3) * int(numCells.x), pos.y + (i / 3) * int(numCells.y)), 0).x;
      float val1 = texelFetch(f, ivec2(pos.x - 1 + (i % 3) * int(numCells.x), pos.y + (i / 3) * int(numCells.y)), 0).x;
      float val2 = texelFetch(f, ivec2(pos.x + (i % 3) * int(numCells.x), pos.y + 1 + (i / 3) * int(numCells.y)), 0).x;
      float val3 = texelFetch(f, ivec2(pos.x + (i % 3) * int(numCells.x), pos.y - 1 + (i / 3) * int(numCells.y)), 0).x;

      rho0 += val0;
      rho1 += val1;
      rho2 += val2;
      rho3 += val3;

      u0 += c[i] * val0;
      u1 += c[i] * val1;
      u2 += c[i] * val2;
      u3 += c[i] * val3;
    }

    u0 /= rho0;
    u1 /= rho1;
    u2 /= rho2;
    u3 /= rho3;

    float curl = (u0.y - u1.y - u2.x + u3.x) * 40.;
    vec3 color;
    // if (curl < 0.) color = mix(vec3(1), vec3(1, 0, 0), -curl);
    // else color = mix(vec3(1), vec3(0, 0, 1), curl);
    color = heatmap(curl);

    FragColor = vec4(color, 1.);
  }
`;

class Space {
  gl: WebGL2RenderingContext;

  numCellsX: number;
  numCellsY: number;

  computeVAO: WebGLVertexArrayObject;
  distributionsTexture: WebGLTexture;
  distributionsFBO: WebGLFramebuffer;
  streamedDistributionsTexture: WebGLTexture;
  streamedDistributionsFBO: WebGLFramebuffer;
  betasTexture: WebGLTexture;
  betasFBO: WebGLFramebuffer;
  streamShader: Shader;
  collideShader: Shader;
  addBetasShader: Shader;

  renderVAO: WebGLVertexArrayObject;
  renderShader: Shader;

  ux: number;
  uy: number;

  timestepsPerFrame: number;

  prevMouseX: number;
  prevMouseY: number;
  prevClicking: boolean;

  constructor(
    gl: WebGL2RenderingContext,
    timestepsPerFrame: number,
    numCellsX: number,
    numCellsY: number,
    ux: number,
    uy: number
  ) {
    this.gl = gl;

    this.numCellsX = numCellsX;
    this.numCellsY = numCellsY;

    this.ux = ux;
    this.uy = uy;

    this.timestepsPerFrame = timestepsPerFrame;

    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.prevClicking = false;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.getExtension('EXT_color_buffer_float');

    /***************** Creating the compute shaders *****************/

    this.renderVAO = gl.createVertexArray()!;

    this.computeVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.computeVAO);

    const c = [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    const w = [
      4 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 36,
      1 / 36,
      1 / 36,
      1 / 36,
    ];

    const data = new Float32Array(numCellsX * numCellsY * 9);
    for (let ix = 0; ix < numCellsX * 3; ix++) {
      for (let iy = 0; iy < numCellsY * 3; iy++) {
        const i = Math.floor(iy / numCellsY) * 3 + Math.floor(ix / numCellsX);
        const rho = 1;
        const cu = c[i][0] * ux + c[i][1] * uy;
        const uu = ux * ux + uy * uy;
        const fEq =
          w[i] * rho * (1 + 3 * cu + (9 / 2) * cu * cu - (3 / 2) * uu);
        data[iy * numCellsX * 3 + ix] = fEq;
      }
    }

    this.distributionsTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.distributionsTexture);
    gl.texStorage2D(
      gl.TEXTURE_2D,
      1,
      gl.R32F,
      3 * this.numCellsX,
      3 * this.numCellsY
    );
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      3 * this.numCellsX,
      3 * this.numCellsY,
      gl.RED,
      gl.FLOAT,
      data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.distributionsFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.distributionsFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.distributionsTexture,
      0
    );

    this.streamedDistributionsTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.streamedDistributionsTexture);
    gl.texStorage2D(
      gl.TEXTURE_2D,
      1,
      gl.R32F,
      3 * this.numCellsX,
      3 * this.numCellsY
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.streamedDistributionsFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.streamedDistributionsFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.streamedDistributionsTexture,
      0
    );

    const betasCanvas = document.createElement('canvas');
    betasCanvas.width = numCellsX;
    betasCanvas.height = numCellsY;
    const betasCtx = betasCanvas.getContext('2d')!;
    betasCtx.translate(0, numCellsY);
    betasCtx.scale(1, -1);
    betasCtx.fillStyle = 'black';
    betasCtx.fillRect(0, 0, numCellsX, numCellsY);
    betasCtx.fillStyle = 'white';
    betasCtx.font = 'bold 40px Arial';
    betasCtx.fillText('DRAW', numCellsX / 4, (numCellsY * 2) / 5);
    const betasData = betasCtx.getImageData(0, 0, numCellsX, numCellsY).data;
    let minX = numCellsX;
    let minY = numCellsY;
    let maxX = 0;
    let maxY = 0;
    for (let ix = 0; ix < numCellsX; ix++) {
      for (let iy = 0; iy < numCellsY; iy++) {
        const i = (ix + iy * numCellsX) * 4;
        if (betasData[i] > 0) {
          minX = Math.min(minX, ix);
          minY = Math.min(minY, iy);
          maxX = Math.max(maxX, ix);
          maxY = Math.max(maxY, iy);
        }
      }
    }

    const betas = new Float32Array(numCellsX * numCellsY);
    for (let i = 0; i < betasData.length; i++) {
      betas[i] = 0;
    }
    for (let ix = 0; ix <= maxX - minX; ix++) {
      for (let iy = 0; iy <= maxY - minY; iy++) {
        const i = ix + minX + (iy + minY) * numCellsX;
        const cx = ix + Math.floor(numCellsX / 2 - (maxX - minX) / 2);
        const cy = iy + Math.floor(numCellsY / 2 - (maxY - minY) / 2);
        const ci = cx + cy * numCellsX;
        betas[ci] = betasData[i * 4] / 255;
      }
    }

    this.betasTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.betasTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, numCellsX, numCellsY);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      numCellsX,
      numCellsY,
      gl.RED,
      gl.FLOAT,
      betas
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.betasFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.betasFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.betasTexture,
      0
    );

    this.streamShader = new Shader(
      gl,
      fullscreenVertexShader,
      streamFragmentShader
    );
    this.collideShader = new Shader(
      gl,
      fullscreenVertexShader,
      collideFragmentShader
    );
    this.addBetasShader = new Shader(
      gl,
      fullscreenVertexShader,
      addBetasFragmentShader
    );
    this.renderShader = new Shader(
      gl,
      fullscreenVertexShader,
      drawFragmentShader
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  step(mouseX: number, mouseY: number, clicking: boolean) {
    this.gl.bindVertexArray(this.computeVAO);

    if (clicking && !this.prevClicking) {
      this.prevMouseX = mouseX;
      this.prevMouseY = mouseY;
    }

    if (clicking) {
      this.gl.viewport(0, 0, this.numCellsX, this.numCellsY);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.betasFBO);
      this.addBetasShader.use();
      this.addBetasShader.setVec2(
        'lineStart',
        (this.prevMouseX / this.gl.canvas.width) * this.numCellsX,
        ((this.gl.canvas.height - this.prevMouseY) / this.gl.canvas.height) *
          this.numCellsY
      );
      this.addBetasShader.setVec2(
        'lineEnd',
        (mouseX / this.gl.canvas.width) * this.numCellsX,
        ((this.gl.canvas.height - mouseY) / this.gl.canvas.height) *
          this.numCellsY
      );
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    for (let i = 0; i < this.timestepsPerFrame; i++) {
      this.substep();
    }

    this.prevMouseX = mouseX;
    this.prevMouseY = mouseY;
    this.prevClicking = clicking;
  }

  substep() {
    this.gl.viewport(0, 0, this.numCellsX * 3, this.numCellsY * 3);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.streamedDistributionsFBO);
    this.streamShader.use();
    this.streamShader.setIVec2('numCells', this.numCellsX, this.numCellsY);
    this.streamShader.setInt('f', 0);
    this.streamShader.setVec2('u', this.ux, this.uy);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.finish();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.distributionsFBO);
    this.collideShader.use();
    this.collideShader.setIVec2('numCells', this.numCellsX, this.numCellsY);
    this.collideShader.setInt('fStar', 1);
    this.collideShader.setInt('betas', 2);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.finish();
  }

  render() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.bindVertexArray(this.renderVAO);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.renderShader.use();
    this.renderShader.setInt('f', 0);
    this.renderShader.setVec2('numCells', this.numCellsX, this.numCellsY);
    this.renderShader.setVec2(
      'screenSize',
      this.gl.canvas.width,
      this.gl.canvas.height
    );
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
}

export default Space;
