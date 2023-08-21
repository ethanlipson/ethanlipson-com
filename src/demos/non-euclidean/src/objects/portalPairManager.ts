import { mat4, vec2, vec3 } from 'gl-matrix';
import Shader from '../shader';
import PortalPair from './portalPair';

const vertexSource = `#version 300 es

  in vec3 pos;

  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  out vec3 viewFragPos;
  
  void main() {
    gl_Position = projection * view * model * vec4(pos, 1.);
    viewFragPos = vec3(view * model * vec4(pos, 1.));
  }
`;

const fragmentSource = `#version 300 es

  precision highp float;
  
  in vec3 viewFragPos;

  uniform sampler2D screenTexture;
  uniform vec2 screenSize;

  uniform vec3 color;

  uniform vec3 containingPortalViewPos;
  uniform vec3 containingPortalViewNorm;
  uniform int clipBehindContainingPortal;
  
  out vec4 FragColor;
  
  void main() {
    if (clipBehindContainingPortal == 1) {
      // If the fragment is on the same side of the portal as the camera, discard
      if (dot(viewFragPos - containingPortalViewPos, containingPortalViewNorm) * dot(containingPortalViewPos, containingPortalViewNorm) < 0.) {
        discard;
      }
    }

    vec2 normalized = gl_FragCoord.xy / screenSize;
    vec3 screenColor = texture(screenTexture, normalized).xyz;
    FragColor = vec4(screenColor, 1.);
  }
`;

class PortalPairManager {
  shader: Shader;
  gl: WebGL2RenderingContext;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  portalPairs: PortalPair[] = [];
  fbos: (WebGLFramebuffer | null)[] = [null];
  portalRecursionLevels: number;

  constructor(gl: WebGL2RenderingContext, portalRecursionLevels: number) {
    this.gl = gl;
    this.shader = new Shader(gl, vertexSource, fragmentSource);
    this.vao = gl.createVertexArray()!;
    this.vbo = gl.createBuffer()!;

    // prettier-ignore
    const vertices = new Float32Array([
      -0.5, -0.5, 1, -0.5, -0.5, 0, -0.5, 0.5, 0,
      -0.5, -0.5, 1, -0.5, 0.5, 1, -0.5, 0.5, 0,
      0.5, -0.5, 1, 0.5, -0.5, 0, 0.5, 0.5, 0,
      0.5, -0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0,

      -0.5, -0.5, 1, 0.5, -0.5, 1, 0.5, -0.5, 0,
      -0.5, -0.5, 1, -0.5, -0.5, 0, 0.5, -0.5, 0,
      -0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0,
      -0.5, 0.5, 1, -0.5, 0.5, 0, 0.5, 0.5, 0,

      -0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0,
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0,
      -0.5, -0.5, 1, -0.5, 0.5, 1, 0.5, 0.5, 1,
      -0.5, -0.5, 1, 0.5, -0.5, 1,0.5, 0.5, 1,
    ]);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.enableVertexAttribArray(0);

    this.portalRecursionLevels = portalRecursionLevels;

    for (let i = 0; i < portalRecursionLevels; i++) {
      const colorBuffer = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, colorBuffer);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.canvas.width,
        gl.canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      const depthBuffer = gl.createRenderbuffer()!;
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT16,
        gl.canvas.width,
        gl.canvas.height
      );

      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        colorBuffer,
        0
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        depthBuffer
      );

      this.fbos.push(fbo);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  addPortalPair(
    pos1: vec3,
    normal1: vec3,
    up1: vec3,
    size1: vec3,
    pos2: vec3,
    normal2: vec3,
    up2: vec3,
    size2: vec3
  ) {
    this.portalPairs.push(
      new PortalPair(pos1, normal1, up1, size1, pos2, normal2, up2, size2)
    );
  }

  getPortal(portalId: number) {
    return this.portalPairs[Math.floor(portalId / 2)].portals[portalId % 2];
  }

  detectAndHandleIntersection(
    cameraPos: vec3,
    cameraPrevPos: vec3,
    cameraForward: vec3,
    cameraUp: vec3
  ) {
    for (let ppId = 0; ppId < this.portalPairs.length; ppId++) {
      for (let idWithinPair = 0; idWithinPair < 2; idWithinPair++) {
        const portal = this.getPortal(2 * ppId + idWithinPair);
        const otherPortal = this.getPortal(2 * ppId + (1 - idWithinPair));

        const dot1 = vec3.dot(
          vec3.sub(vec3.create(), cameraPrevPos, portal.pos),
          portal.normal
        );
        const dot2 = vec3.dot(
          vec3.sub(vec3.create(), cameraPos, portal.pos),
          portal.normal
        );

        if (dot1 * dot2 > 0) {
          continue;
        }

        const w1 = Math.abs(dot2) / (Math.abs(dot1) + Math.abs(dot2));
        const w2 = Math.abs(dot1) / (Math.abs(dot1) + Math.abs(dot2));
        const intersectionPoint = vec3.add(
          vec3.create(),
          vec3.scale(vec3.create(), cameraPrevPos, w1),
          vec3.scale(vec3.create(), cameraPos, w2)
        );

        const deltaX = vec3.dot(
          vec3.sub(vec3.create(), intersectionPoint, portal.pos),
          portal.side
        );
        const deltaY = vec3.dot(
          vec3.sub(vec3.create(), intersectionPoint, portal.pos),
          portal.up
        );
        const intersectedX = Math.abs(deltaX) <= portal.size[0] / 2;
        const intersectedY = Math.abs(deltaY) <= portal.size[1] / 2;

        if (!intersectedX || !intersectedY) {
          continue;
        }

        const transformationMatrix = mat4.mul(
          mat4.create(),
          mat4.targetTo(
            mat4.create(),
            otherPortal.pos,
            vec3.add(
              vec3.create(),
              otherPortal.pos,
              vec3.scale(vec3.create(), otherPortal.normal, -1)
            ),
            otherPortal.up
          ),
          mat4.lookAt(
            mat4.create(),
            portal.pos,
            vec3.add(vec3.create(), portal.pos, portal.normal),
            portal.up
          )
        );

        const front = vec3.add(vec3.create(), cameraPos, cameraForward);
        const newPos = vec3.transformMat4(
          vec3.create(),
          cameraPos,
          transformationMatrix
        );
        const newFront = vec3.transformMat4(
          vec3.create(),
          front,
          transformationMatrix
        );
        const newForward = vec3.sub(vec3.create(), newFront, newPos);

        return { newPos, newForward };
      }
    }

    return {
      newPos: undefined,
      newForward: undefined,
    };
  }

  renderPortal(
    projection: mat4,
    view: mat4,
    model: mat4,
    portalId: number,
    otherPortalId: number,
    renderScene: (
      projection: mat4,
      view: mat4,
      model: mat4,
      portalRecursionLevel: number,
      portalId: number
    ) => void,
    portalRecursionLevel: number,
    color: vec3,
    containingPortalViewPos: vec3,
    containingPortalViewNormal: vec3,
    clipBehindContainingPortal: boolean
  ) {
    if (portalRecursionLevel === this.portalRecursionLevels) {
      return;
    }

    const portal = this.getPortal(portalId);
    const otherPortal = this.getPortal(otherPortalId);

    const pos = portal.pos;
    const normal = portal.normal;
    const up = portal.up;
    const otherPos = otherPortal.pos;
    const otherNormal = otherPortal.normal;
    const otherUp = otherPortal.up;

    // Ends up having a very small effect on performance
    // if (
    //   vec3.dot(
    //     containingPortalViewNormal,
    //     vec3.transformMat4(
    //       vec3.create(),
    //       normal,
    //       mat4.transpose(
    //         mat4.create(),
    //         mat4.invert(mat4.create(), mat4.mul(mat4.create(), view, model))
    //       )
    //     )
    //   ) < 0
    // ) {
    //   return;
    // }

    const transformedViewMatrix = mat4.clone(view);
    mat4.mul(
      transformedViewMatrix,
      transformedViewMatrix,
      mat4.targetTo(
        mat4.create(),
        pos,
        vec3.add(vec3.create(), pos, normal),
        up
      )
    );
    mat4.mul(
      transformedViewMatrix,
      transformedViewMatrix,
      mat4.lookAt(
        mat4.create(),
        otherPos,
        vec3.add(
          vec3.create(),
          otherPos,
          vec3.scale(vec3.create(), otherNormal, -1)
        ),
        otherUp
      )
    );

    this.gl.bindFramebuffer(
      this.gl.FRAMEBUFFER,
      this.fbos[portalRecursionLevel + 1]
    );
    renderScene(
      projection,
      transformedViewMatrix,
      model,
      portalRecursionLevel + 1,
      portalId
    );

    this.gl.bindVertexArray(this.vao);
    this.gl.bindFramebuffer(
      this.gl.FRAMEBUFFER,
      this.fbos[portalRecursionLevel]
    );
    this.shader.use();
    this.shader.setMat4('projection', projection);
    this.shader.setMat4('view', view);
    this.shader.setMat4(
      'model',
      mat4.mul(mat4.create(), model, portal.modelMatrix)
    );
    this.shader.setInt('screenTexture', portalRecursionLevel);
    this.shader.setVec2(
      'screenSize',
      this.gl.canvas.width,
      this.gl.canvas.height
    );
    this.shader.setVec3('color', color[0], color[1], color[2]);
    this.shader.setVec3(
      'containingPortalViewPos',
      containingPortalViewPos[0],
      containingPortalViewPos[1],
      containingPortalViewPos[2]
    );
    this.shader.setVec3(
      'containingPortalViewNorm',
      containingPortalViewNormal[0],
      containingPortalViewNormal[1],
      containingPortalViewNormal[2]
    );
    this.shader.setInt(
      'clipBehindContainingPortal',
      clipBehindContainingPortal ? 1 : 0
    );
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 36);
  }

  render(
    projection: mat4,
    view: mat4,
    model: mat4,
    renderScene: (
      projection: mat4,
      view: mat4,
      model: mat4,
      portalRecursionLevel: number,
      renderedWithinPortalId: number
    ) => void,
    portalRecursionLevel: number,
    containingPortalViewPos: vec3,
    containingPortalViewNorm: vec3,
    clipBehindContainingPortal: boolean,
    renderedWithinPortalId?: number
  ) {
    for (let ppId = 0; ppId < this.portalPairs.length; ppId++) {
      if (
        renderedWithinPortalId === undefined ||
        ppId !== Math.floor(renderedWithinPortalId / 2) ||
        renderedWithinPortalId % 2 !== 1
      ) {
        this.renderPortal(
          projection,
          view,
          model,
          2 * ppId,
          2 * ppId + 1,
          renderScene,
          portalRecursionLevel,
          [1, 0, 0],
          containingPortalViewPos,
          containingPortalViewNorm,
          clipBehindContainingPortal
        );
      }

      if (
        renderedWithinPortalId === undefined ||
        ppId !== Math.floor(renderedWithinPortalId / 2) ||
        renderedWithinPortalId % 2 !== 0
      ) {
        this.renderPortal(
          projection,
          view,
          model,
          2 * ppId + 1,
          2 * ppId,
          renderScene,
          portalRecursionLevel,
          [1, 1, 0],
          containingPortalViewPos,
          containingPortalViewNorm,
          clipBehindContainingPortal
        );
      }
    }
  }
}

export default PortalPairManager;
