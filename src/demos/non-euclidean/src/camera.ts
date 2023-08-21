import { mat4, vec3 } from 'gl-matrix';

export enum Direction {
  FORWARD,
  BACKWARD,
  LEFT,
  RIGHT,
}

export default class Camera {
  pitch: number = 0;
  yaw: number = -90;
  fov: number = 70;
  sensitivity: number = 0.0017;
  speed: number = 4;
  viewBobbingPeriod: number = 1;
  viewBobbingHeight: number = 0.15;
  viewBobbingTime: number = 0;

  position: vec3 = [0, 0, 5];
  front: vec3 = [0, 0, 0];
  up: vec3 = [0, 1, 0];
  worldUp: vec3 = [0, 1, 0];
  right: vec3 = [1, 0, 0];

  constructor(position: vec3, pitch: number = 0, yaw: number = -90) {
    this.position = position;
    this.pitch = (pitch * Math.PI) / 180;
    this.yaw = (yaw * Math.PI) / 180;

    this.updateCameraVectors();
  }

  updateCameraVectors() {
    const tempFront: vec3 = [
      Math.cos(this.pitch) * Math.cos(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch) * Math.sin(this.yaw),
    ];
    vec3.normalize(tempFront, tempFront);

    vec3.normalize(
      this.right,
      vec3.cross(vec3.create(), tempFront, this.worldUp)
    );

    vec3.normalize(this.up, vec3.cross(vec3.create(), this.right, tempFront));

    // this.front = tempFront;
    this.front = vec3.clone(tempFront);
  }

  processMouseMovement(xoffset: number, yoffset: number) {
    this.yaw += xoffset * this.sensitivity;
    this.pitch += yoffset * this.sensitivity;

    this.pitch = Math.min(
      Math.max(this.pitch, -Math.PI / 2 + 0.01),
      Math.PI / 2 - 0.01
    );

    this.updateCameraVectors();
  }

  setNewForward(newForward: vec3) {
    this.pitch = Math.asin(newForward[1]);
    this.yaw = Math.atan2(newForward[2], newForward[0]);
    this.updateCameraVectors();
  }

  zoom(delta: number) {
    this.fov -= delta;
  }

  getViewMatrix(out: mat4) {
    const viewBobbedPosition = vec3.clone(this.position);
    viewBobbedPosition[1] +=
      this.viewBobbingHeight *
      Math.sin((this.viewBobbingTime / this.viewBobbingPeriod) * 2 * Math.PI);

    return mat4.lookAt(
      out,
      viewBobbedPosition,
      vec3.add(vec3.create(), viewBobbedPosition, this.front),
      this.up
    );
  }

  processKeyboard(
    directions: Direction[],
    multiplier: number,
    deltaTime: number
  ) {
    if (directions.length === 0) {
      return;
    }

    const scaledSpeed = this.speed * multiplier * deltaTime;
    const delta = vec3.fromValues(0, 0, 0);

    for (const direction of directions) {
      switch (direction) {
        case Direction.FORWARD:
          vec3.add(delta, delta, this.front);
          break;
        case Direction.BACKWARD:
          vec3.sub(delta, delta, this.front);
          break;
        case Direction.LEFT:
          vec3.sub(delta, delta, this.right);
          break;
        case Direction.RIGHT:
          vec3.add(delta, delta, this.right);
          break;
      }
    }

    delta[1] = 0;
    vec3.normalize(delta, delta);
    vec3.scaleAndAdd(this.position, this.position, delta, scaledSpeed);

    this.viewBobbingTime += deltaTime;
  }
}
