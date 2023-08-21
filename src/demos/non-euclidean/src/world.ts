import { mat4, vec2, vec3 } from 'gl-matrix';
import Camera, { Direction } from './camera';
import KeyboardManager, { Key } from './input/keyboardManager';
import MouseManager from './input/mouseManager';
import PlaneManager from './objects/planeManager';
import PortalPairManager from './objects/portalPairManager';

class World {
  gl: WebGL2RenderingContext;
  keyboardManager: KeyboardManager;
  mouseManager: MouseManager;
  camera: Camera;
  planeManager: PlaneManager;
  portalPairManager: PortalPairManager;
  prevCameraPosition: vec3;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    this.keyboardManager = new KeyboardManager(canvas);
    this.mouseManager = new MouseManager(canvas);
    this.camera = new Camera([0, 2, 18], -10, -90);
    this.planeManager = new PlaneManager(gl);
    this.portalPairManager = new PortalPairManager(gl, 2);
    this.prevCameraPosition = vec3.clone(this.camera.position);

    gl.enable(gl.DEPTH_TEST);
  }

  addPlane(
    pos: vec3,
    normal: vec3,
    up: vec3,
    size: vec2,
    lightColor: vec3,
    darkColor: vec3,
    numSquares: vec2,
    minDistance: number = 0.55
  ) {
    this.planeManager.addPlane(
      pos,
      normal,
      up,
      size,
      lightColor,
      darkColor,
      numSquares,
      minDistance
    );
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
    this.portalPairManager.addPortalPair(
      pos1,
      normal1,
      up1,
      size1,
      pos2,
      normal2,
      up2,
      size2
    );
  }

  render() {
    const projection = mat4.perspective(
      mat4.create(),
      (this.camera.fov * Math.PI) / 180,
      this.gl.canvas.width / this.gl.canvas.height,
      0.1,
      100
    );
    const view = this.camera.getViewMatrix(mat4.create());
    const model = mat4.create();

    this.renderRecursive(projection, view, model, 0, undefined);
  }

  renderRecursive(
    projection: mat4,
    view: mat4,
    model: mat4,
    portalRecursionLevel: number,
    renderedWithinPortalId?: number
  ) {
    this.gl.clearColor(0.8, 0.8, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const otherViewPos = vec3.create();
    const otherViewNormal = vec3.create();
    let clipBehindPortal = false;

    if (renderedWithinPortalId !== undefined) {
      const otherPortalId =
        2 * Math.floor(renderedWithinPortalId / 2) +
        ((renderedWithinPortalId + 1) % 2);
      const otherPortalPos =
        this.portalPairManager.portalPairs[Math.floor(otherPortalId / 2)]
          .portals[otherPortalId % 2].pos;
      const otherPortalNormal =
        this.portalPairManager.portalPairs[Math.floor(otherPortalId / 2)]
          .portals[otherPortalId % 2].normal;

      const modelView = mat4.mul(mat4.create(), view, model);
      const normalModelView = mat4.transpose(
        mat4.create(),
        mat4.invert(mat4.create(), modelView)
      );

      vec3.transformMat4(otherViewPos, otherPortalPos, modelView);
      vec3.transformMat4(otherViewNormal, otherPortalNormal, normalModelView);

      clipBehindPortal = true;
    }

    this.planeManager.render(
      projection,
      view,
      model,
      otherViewPos,
      otherViewNormal,
      clipBehindPortal
    );

    this.portalPairManager.render(
      projection,
      view,
      model,
      this.renderRecursive.bind(this),
      portalRecursionLevel,
      otherViewPos,
      otherViewNormal,
      clipBehindPortal,
      renderedWithinPortalId
    );
  }

  detectAndHandleIntersection() {
    const planeIntersectionResult =
      this.planeManager.detectAndHandleIntersection(
        this.camera.position,
        this.prevCameraPosition,
        this.camera.front,
        this.camera.up,
        0.2
      );
    if (planeIntersectionResult.newPos) {
      vec3.copy(this.camera.position, planeIntersectionResult.newPos);
    }

    const portalIntersectionResult =
      this.portalPairManager.detectAndHandleIntersection(
        this.camera.position,
        this.prevCameraPosition,
        this.camera.front,
        this.camera.up
      );
    if (portalIntersectionResult.newPos) {
      vec3.copy(this.camera.position, portalIntersectionResult.newPos);
      vec3.copy(this.prevCameraPosition, portalIntersectionResult.newPos);
    }
    if (portalIntersectionResult.newForward) {
      this.camera.setNewForward(portalIntersectionResult.newForward);
    }
  }

  loop(maxFps: number) {
    let lastTime = 0;

    const renderCallback = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      if (deltaTime < 1 / maxFps) {
        requestAnimationFrame(renderCallback);
        return;
      }

      this.processKeyboard(deltaTime);
      this.processMouse();

      this.detectAndHandleIntersection();

      this.render();

      lastTime = time;
      vec3.copy(this.prevCameraPosition, this.camera.position);

      requestAnimationFrame(renderCallback);
    };

    requestAnimationFrame(renderCallback);
  }

  processKeyboard(deltaTime: number) {
    const keyMapping = {
      w: Direction.FORWARD,
      s: Direction.BACKWARD,
      a: Direction.LEFT,
      d: Direction.RIGHT,
    } as const;

    const shiftPressed = this.keyboardManager.isPressed('shift');
    const multiplier = shiftPressed ? 3 : 1;

    const directions = Object.keys(keyMapping)
      .filter(key => this.keyboardManager.isPressed(key as Key))
      .map(key => keyMapping[key as keyof typeof keyMapping]);

    this.camera.processKeyboard(directions, multiplier, deltaTime);
  }

  processMouse() {
    this.camera.processMouseMovement(
      this.mouseManager.deltaX,
      this.mouseManager.deltaY
    );
    this.mouseManager.reset();
  }
}

export default World;
