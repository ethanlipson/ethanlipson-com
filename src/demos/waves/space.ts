import Shader from './shader';

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

const updateDudtFragmentShader = `#version 300 es

  precision highp float;

  uniform ivec2 numCells;
  uniform float dt;
  uniform float c;

  uniform sampler2D u;

  out vec4 deltaDudt;

  const ivec2 neighbors[4] = ivec2[](
    ivec2(1, 0),
    ivec2(-1, 0),
    ivec2(0, 1),
    ivec2(0, -1)
  );

  void main() {
    ivec2 idx = ivec2(gl_FragCoord.xy);

    float laplacian = -4. * texelFetch(u, idx, 0).x;
    for (int i = 0; i < 4; i++) {
      ivec2 neighborU = (idx + neighbors[i] + numCells) % numCells;
      laplacian += texelFetch(u, neighborU, 0).x;
    }

    deltaDudt = vec4(dt * c * c * laplacian, 0., 0., 1.);
  }
`;

const updateUFragmentShader = `#version 300 es

  precision highp float;

  uniform ivec2 numCells;
  uniform float dt;

  uniform sampler2D dudt;

  out vec4 deltaU;

  void main() {
    ivec2 idx = ivec2(gl_FragCoord.xy);
    float dudt = texelFetch(dudt, idx, 0).x;

    deltaU = vec4(dt * dudt, 0., 0., 1.);
  }
`;

const addGaussianFragmentShader = `#version 300 es

  precision highp float;

  uniform vec2 numCells;
  uniform vec2 pulseCenter;

  uniform sampler2D u;

  out vec4 deltaU;

  void main() {
    vec2 cellCenter = gl_FragCoord.xy - vec2(0.5);
    if (cellCenter.x < pulseCenter.x - numCells.x / 2.) cellCenter.x += numCells.x;
    if (cellCenter.x > pulseCenter.x + numCells.x / 2.) cellCenter.x -= numCells.x;
    if (cellCenter.y < pulseCenter.y - numCells.y / 2.) cellCenter.y += numCells.y;
    if (cellCenter.y > pulseCenter.y + numCells.y / 2.) cellCenter.y -= numCells.y;

    float dist = distance(cellCenter, pulseCenter);
    float strength = exp(-dist * dist / 100.);

    deltaU = vec4(strength, 0., 0., 1.);
  }
`;

const drawFragmentShader = `#version 300 es

  precision highp float;

  uniform vec2 numCells;
  uniform vec2 screenSize;

  uniform sampler2D u;

  out vec4 FragColor;

  const int heatmapPalette[433] = int[](0x00000a, 0x000014, 0x00001e, 0x000025, 0x00002a, 0x00002e, 0x000032, 0x000036, 0x00003a, 0x00003e, 0x000042, 0x000046, 0x00004a, 0x00004f, 0x000052, 0x010055, 0x010057, 0x020059, 0x02005c, 0x03005e, 0x040061, 0x040063, 0x050065, 0x060067, 0x070069, 0x08006b, 0x09006e, 0x0a0070, 0x0b0073, 0x0c0074, 0x0d0075, 0x0d0076, 0x0e0077, 0x100078, 0x120079, 0x13007b, 0x15007c, 0x17007d, 0x19007e, 0x1b0080, 0x1c0081, 0x1e0083, 0x200084, 0x220085, 0x240086, 0x260087, 0x280089, 0x2a0089, 0x2c008a, 0x2e008b, 0x30008c, 0x32008d, 0x34008e, 0x36008e, 0x38008f, 0x390090, 0x3b0091, 0x3c0092, 0x3e0093, 0x3f0093, 0x410094, 0x420095, 0x440095, 0x450096, 0x470096, 0x490096, 0x4a0096, 0x4c0097, 0x4e0097, 0x4f0097, 0x510097, 0x520098, 0x540098, 0x560098, 0x580099, 0x5a0099, 0x5c0099, 0x5d009a, 0x5f009a, 0x61009b, 0x63009b, 0x64009b, 0x66009b, 0x68009b, 0x6a009b, 0x6c009c, 0x6d009c, 0x6f009c, 0x70009c, 0x71009d, 0x73009d, 0x75009d, 0x77009d, 0x78009d, 0x7a009d, 0x7c009d, 0x7e009d, 0x7f009d, 0x81009d, 0x83009d, 0x84009d, 0x86009d, 0x87009d, 0x89009d, 0x8a009d, 0x8b009d, 0x8d009d, 0x8f009c, 0x91009c, 0x93009c, 0x95009c, 0x96009b, 0x98009b, 0x99009b, 0x9b009b, 0x9c009b, 0x9d009b, 0x9f009b, 0xa0009b, 0xa2009b, 0xa3009b, 0xa4009b, 0xa6009a, 0xa7009a, 0xa8009a, 0xa90099, 0xaa0099, 0xab0099, 0xad0099, 0xae0198, 0xaf0198, 0xb00198, 0xb00198, 0xb10197, 0xb20197, 0xb30196, 0xb40296, 0xb50295, 0xb60295, 0xb70395, 0xb80395, 0xb90495, 0xba0495, 0xba0494, 0xbb0593, 0xbc0593, 0xbd0593, 0xbe0692, 0xbf0692, 0xbf0692, 0xc00791, 0xc00791, 0xc10890, 0xc10990, 0xc20a8f, 0xc30a8e, 0xc30b8e, 0xc40c8d, 0xc50c8c, 0xc60d8b, 0xc60e8a, 0xc70f89, 0xc81088, 0xc91187, 0xca1286, 0xca1385, 0xcb1385, 0xcb1484, 0xcc1582, 0xcd1681, 0xce1780, 0xce187e, 0xcf187c, 0xcf197b, 0xd01a79, 0xd11b78, 0xd11c76, 0xd21c75, 0xd21d74, 0xd31e72, 0xd32071, 0xd4216f, 0xd4226e, 0xd5236b, 0xd52469, 0xd62567, 0xd72665, 0xd82764, 0xd82862, 0xd92a60, 0xda2b5e, 0xda2c5c, 0xdb2e5a, 0xdb2f57, 0xdc2f54, 0xdd3051, 0xdd314e, 0xde324a, 0xde3347, 0xdf3444, 0xdf3541, 0xdf363d, 0xe0373a, 0xe03837, 0xe03933, 0xe13a30, 0xe23b2d, 0xe23c2a, 0xe33d26, 0xe33e23, 0xe43f20, 0xe4411d, 0xe4421c, 0xe5431b, 0xe54419, 0xe54518, 0xe64616, 0xe74715, 0xe74814, 0xe74913, 0xe84a12, 0xe84c10, 0xe84c0f, 0xe94d0e, 0xe94d0d, 0xea4e0c, 0xea4f0c, 0xeb500b, 0xeb510a, 0xeb520a, 0xeb5309, 0xec5409, 0xec5608, 0xec5708, 0xec5808, 0xed5907, 0xed5a07, 0xed5b06, 0xee5c06, 0xee5c05, 0xee5d05, 0xee5e05, 0xef5f04, 0xef6004, 0xef6104, 0xef6204, 0xf06303, 0xf06403, 0xf06503, 0xf16603, 0xf16603, 0xf16703, 0xf16803, 0xf16902, 0xf16a02, 0xf16b02, 0xf16b02, 0xf26c01, 0xf26d01, 0xf26e01, 0xf36f01, 0xf37001, 0xf37101, 0xf37201, 0xf47300, 0xf47400, 0xf47500, 0xf47600, 0xf47700, 0xf47800, 0xf47a00, 0xf57b00, 0xf57c00, 0xf57e00, 0xf57f00, 0xf68000, 0xf68100, 0xf68200, 0xf78300, 0xf78400, 0xf78500, 0xf78600, 0xf88700, 0xf88800, 0xf88800, 0xf88900, 0xf88a00, 0xf88b00, 0xf88c00, 0xf98d00, 0xf98d00, 0xf98e00, 0xf98f00, 0xf99000, 0xf99100, 0xf99200, 0xf99300, 0xfa9400, 0xfa9500, 0xfa9600, 0xfb9800, 0xfb9900, 0xfb9a00, 0xfb9c00, 0xfc9d00, 0xfc9f00, 0xfca000, 0xfca100, 0xfda200, 0xfda300, 0xfda400, 0xfda600, 0xfda700, 0xfda800, 0xfdaa00, 0xfdab00, 0xfdac00, 0xfdad00, 0xfdae00, 0xfeaf00, 0xfeb000, 0xfeb100, 0xfeb200, 0xfeb300, 0xfeb400, 0xfeb500, 0xfeb600, 0xfeb800, 0xfeb900, 0xfeb900, 0xfeba00, 0xfebb00, 0xfebc00, 0xfebd00, 0xfebe00, 0xfec000, 0xfec100, 0xfec200, 0xfec300, 0xfec400, 0xfec500, 0xfec600, 0xfec700, 0xfec800, 0xfec901, 0xfeca01, 0xfeca01, 0xfecb01, 0xfecc02, 0xfecd02, 0xfece03, 0xfecf04, 0xfecf04, 0xfed005, 0xfed106, 0xfed308, 0xfed409, 0xfed50a, 0xfed60a, 0xfed70b, 0xfed80c, 0xfed90d, 0xffda0e, 0xffda0e, 0xffdb10, 0xffdc12, 0xffdc14, 0xffdd16, 0xffde19, 0xffde1b, 0xffdf1e, 0xffe020, 0xffe122, 0xffe224, 0xffe226, 0xffe328, 0xffe42b, 0xffe42e, 0xffe531, 0xffe635, 0xffe638, 0xffe73c, 0xffe83f, 0xffe943, 0xffea46, 0xffeb49, 0xffeb4d, 0xffec50, 0xffed54, 0xffee57, 0xffee5b, 0xffee5f, 0xffef63, 0xffef67, 0xfff06a, 0xfff06e, 0xfff172, 0xfff177, 0xfff17b, 0xfff280, 0xfff285, 0xfff28a, 0xfff38e, 0xfff492, 0xfff496, 0xfff49a, 0xfff59e, 0xfff5a2, 0xfff5a6, 0xfff6aa, 0xfff6af, 0xfff7b3, 0xfff7b6, 0xfff8ba, 0xfff8bd, 0xfff8c1, 0xfff8c4, 0xfff9c7, 0xfff9ca, 0xfff9cd, 0xfffad1, 0xfffad4, 0xfffbd8, 0xfffcdb, 0xfffcdf, 0xfffde2, 0xfffde5, 0xfffde8, 0xfffeeb, 0xfffeee, 0xfffef1, 0xfffef4, 0xfffff6);

  vec3 heatmap(float val) {
    int index = int(clamp(abs(val), 0., 1.) * 432.);
    int hexColor = heatmapPalette[index];
    return vec3(hexColor >> 16, (hexColor >> 8) & 0xFF, hexColor & 0xFF) / 255.0;
  }
  
  vec3 redBlue(float val) {
    return val >= 0. ? mix(vec3(1.), vec3(1., 0., 0.), val) : mix(vec3(1.), vec3(0., 0., 1.), -val);
  }

  vec3 bullseye(float val) {
    float freq = 3.;
    vec3 c1 = vec3(250., 203., 35.) / 255.0;
    vec3 c2 = vec3(37., 209., 247.) / 255.0;
    vec3 color = val >= 0. ? c1 : c2;
    return mix(vec3(0.), color, 1. - abs(mod(val * freq + 2222., 2.) - 1.));
  }

  void main() {
    ivec2 idx = ivec2(gl_FragCoord.xy / screenSize * numCells);
    float val = texelFetch(u, idx, 0).x;

    vec3 color = bullseye(val * 6.);

    FragColor = vec4(color, 1.);
  }
`;

class Space {
  gl: WebGL2RenderingContext;

  numCellsX: number;
  numCellsY: number;

  computeVAO: WebGLVertexArrayObject;
  uTexture: WebGLTexture;
  uFBO: WebGLFramebuffer;
  dudtTexture: WebGLTexture;
  dudtFBO: WebGLFramebuffer;
  updateDudtShader: Shader;
  updateUShader: Shader;
  addGaussianShader: Shader;

  renderVAO: WebGLVertexArrayObject;
  renderShader: Shader;

  substepsPerFrame: number = 5;
  prevClicking: boolean = false;

  constructor(
    gl: WebGL2RenderingContext,
    numCellsX: number,
    numCellsY: number
  ) {
    this.gl = gl;

    this.numCellsX = numCellsX;
    this.numCellsY = numCellsY;

    gl.blendFunc(gl.ONE, gl.ONE);

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.getExtension('EXT_color_buffer_float');

    /***************** Creating the compute shaders *****************/

    this.renderVAO = gl.createVertexArray()!;

    this.computeVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.computeVAO);

    const data = new Float32Array(numCellsX * numCellsY);
    for (let ix = 0; ix < numCellsX; ix++) {
      for (let iy = 0; iy < numCellsY; iy++) {
        // const dist = Math.hypot(ix - numCellsX / 2, iy - numCellsY / 2);
        // const val = Math.exp((-dist * dist) / 100);
        const val = 0;
        data[iy * numCellsX + ix] = val;
      }
    }

    this.uTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.uTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, this.numCellsX, this.numCellsY);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.numCellsX,
      this.numCellsY,
      gl.RED,
      gl.FLOAT,
      data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.uFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.uFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.uTexture,
      0
    );

    this.dudtTexture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.dudtTexture);
    gl.texStorage2D(
      gl.TEXTURE_2D,
      1,
      gl.R32F,
      3 * this.numCellsX,
      3 * this.numCellsY
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.dudtFBO = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dudtFBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.dudtTexture,
      0
    );

    this.updateDudtShader = new Shader(
      gl,
      fullscreenVertexShader,
      updateDudtFragmentShader
    );
    this.updateUShader = new Shader(
      gl,
      fullscreenVertexShader,
      updateUFragmentShader
    );
    this.addGaussianShader = new Shader(
      gl,
      fullscreenVertexShader,
      addGaussianFragmentShader
    );
    this.renderShader = new Shader(
      gl,
      fullscreenVertexShader,
      drawFragmentShader
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  step(dt: number, mouseX: number, mouseY: number, clicking: boolean) {
    this.gl.bindVertexArray(this.computeVAO);
    this.gl.viewport(0, 0, this.numCellsX, this.numCellsY);
    this.gl.enable(this.gl.BLEND);

    if (clicking && !this.prevClicking) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.uFBO);
      this.addGaussianShader.use();
      this.addGaussianShader.setVec2(
        'numCells',
        this.numCellsX,
        this.numCellsY
      );
      this.addGaussianShader.setVec2(
        'pulseCenter',
        (mouseX / this.gl.canvas.width) * this.numCellsX,
        (mouseY / this.gl.canvas.height) * this.numCellsY
      );
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
      this.gl.finish();
    }

    for (let i = 0; i < this.substepsPerFrame; i++) {
      this.substep(dt, mouseX, mouseY, clicking);
    }

    this.prevClicking = clicking;
  }

  substep(dt: number, mouseX: number, mouseY: number, clicking: boolean) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.dudtFBO);
    this.updateDudtShader.use();
    this.updateDudtShader.setIVec2('numCells', this.numCellsX, this.numCellsY);
    this.updateDudtShader.setFloat('dt', dt);
    this.updateDudtShader.setFloat('c', 10);
    this.updateDudtShader.setInt('u', 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.finish();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.uFBO);
    this.updateUShader.use();
    this.updateUShader.setIVec2('numCells', this.numCellsX, this.numCellsY);
    this.updateUShader.setFloat('dt', dt);
    this.updateUShader.setInt('dudt', 1);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.finish();
  }

  render() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.bindVertexArray(this.renderVAO);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.disable(this.gl.BLEND);

    this.renderShader.use();
    this.renderShader.setInt('u', 0);
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
