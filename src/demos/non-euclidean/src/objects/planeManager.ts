import { mat4, vec2, vec3 } from 'gl-matrix';
import Shader from '../shader';
import Plane from './plane';

const vertexSource = `#version 300 es

  in vec3 pos;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  out vec3 viewFragPos;
  out vec2 textureCoords;
  
  void main() {
    gl_Position = projection * view * model * vec4(pos, 1.);
    viewFragPos = vec3(view * model * vec4(pos, 1.));
    textureCoords = pos.xy + .5;
  }
`;

const fragmentSource = `#version 300 es

  precision highp float;
  
  in vec3 viewFragPos;
  in vec2 textureCoords;

  uniform vec3 lightColor;
  uniform vec3 darkColor;
  uniform vec2 numSquares;

  uniform vec3 portalPos;
  uniform vec3 portalNorm;
  uniform int clipBehindPortal;
  
  out vec4 FragColor;
  
  void main() {
    if (clipBehindPortal == 1) {
      // If the fragment is on the same side of the portal as the camera, discard
      if (dot(viewFragPos - portalPos, portalNorm) * dot(portalPos, portalNorm) < 0.) {
        discard;
      }
    }

    bool light = (int(textureCoords.x * numSquares.x) + int(textureCoords.y * numSquares.y)) % 2 == 0;
    vec3 color = light ? lightColor : darkColor;
    FragColor = vec4(color, 1.);
  }
`;

class PlaneManager {
  shader: Shader;
  gl: WebGL2RenderingContext;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  planes: Plane[] = [];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.shader = new Shader(gl, vertexSource, fragmentSource);
    this.vao = gl.createVertexArray()!;
    this.vbo = gl.createBuffer()!;

    const vertices = new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5, 0.5, 0,
      0.5, 0.5, 0,
    ]);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.enableVertexAttribArray(0);
  }

  addPlane(
    pos: vec3,
    normal: vec3,
    up: vec3,
    size: vec2,
    lightColor: vec3,
    darkColor: vec3,
    numSquares: vec2,
    minDistance: number
  ) {
    this.planes.push(
      new Plane(
        pos,
        normal,
        up,
        size,
        lightColor,
        darkColor,
        numSquares,
        minDistance
      )
    );
  }

  detectAndHandleIntersection(
    cameraPos: vec3,
    cameraPrevPos: vec3,
    cameraForward: vec3,
    cameraUp: vec3,
    border: number
  ) {
    const pos = vec3.clone(cameraPos);

    for (const plane of this.planes) {
      const dot = vec3.dot(
        vec3.sub(vec3.create(), pos, plane.pos),
        plane.normal
      );

      if (Math.abs(dot) > plane.minDistance) {
        continue;
      }

      const deltaX = vec3.dot(
        vec3.sub(vec3.create(), pos, plane.pos),
        plane.side
      );
      const deltaY = vec3.dot(
        vec3.sub(vec3.create(), pos, plane.pos),
        plane.up
      );
      const intersectedX = Math.abs(deltaX) <= plane.size[0] / 2 + border;
      const intersectedY = Math.abs(deltaY) <= plane.size[1] / 2 + border;

      if (!intersectedX || !intersectedY) {
        continue;
      }

      const newDot = (dot / Math.abs(dot)) * plane.minDistance;
      vec3.add(pos, pos, vec3.scale(vec3.create(), plane.normal, newDot - dot));
    }

    return { newPos: pos };
  }

  render(
    projection: mat4,
    view: mat4,
    model: mat4,
    portalViewPos: vec3,
    portalViewNormal: vec3,
    clipBehindPortal: boolean
  ) {
    this.gl.bindVertexArray(this.vao);
    this.shader.use();

    this.shader.setMat4('projection', projection);
    this.shader.setMat4('view', view);
    this.shader.setVec3(
      'portalPos',
      portalViewPos[0],
      portalViewPos[1],
      portalViewPos[2]
    );
    this.shader.setVec3(
      'portalNorm',
      portalViewNormal[0],
      portalViewNormal[1],
      portalViewNormal[2]
    );
    this.shader.setInt('clipBehindPortal', clipBehindPortal ? 1 : 0);

    for (const plane of this.planes) {
      this.shader.setMat4(
        'model',
        mat4.mul(mat4.create(), model, plane.modelMatrix)
      );
      this.shader.setVec3(
        'lightColor',
        plane.lightColor[0],
        plane.lightColor[1],
        plane.lightColor[2]
      );
      this.shader.setVec3(
        'darkColor',
        plane.darkColor[0],
        plane.darkColor[1],
        plane.darkColor[2]
      );
      this.shader.setVec2(
        'numSquares',
        plane.numSquares[0],
        plane.numSquares[1]
      );

      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
  }
}

export default PlaneManager;
