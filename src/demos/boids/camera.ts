import { mat4, vec3 } from 'gl-matrix';

export enum Direction {
  UP,
  DOWN,
  FORWARD,
  BACKWARD,
  LEFT,
  RIGHT,
}

export default class Camera {
  pitch: number = 0;
  yaw: number = -90;
  fov: number = 70;
  sensitivity: number = 0.1;
  speed: number = 2.5;

  position: vec3 = [0, 0, 18];
  front: vec3 = [0, 0, 0];
  up: vec3 = [0, 1, 0];
  worldUp: vec3 = [0, 1, 0];
  right: vec3 = [1, 0, 0];

  constructor() {
    this.updateCameraVectors();
  }

  updateCameraVectors() {
    const tempFront: vec3 = [
      Math.cos((this.pitch * Math.PI) / 180) *
        Math.cos((this.yaw * Math.PI) / 180),
      Math.sin((this.pitch * Math.PI) / 180),
      Math.cos((this.pitch * Math.PI) / 180) *
        Math.sin((this.yaw * Math.PI) / 180),
    ];
    vec3.normalize(tempFront, tempFront);

    vec3.normalize(
      this.right,
      vec3.cross(vec3.create(), tempFront, this.worldUp)
    );

    vec3.normalize(this.up, vec3.cross(vec3.create(), this.right, tempFront));

    this.front = tempFront;
  }

  processMouseMovement(xoffset: number, yoffset: number) {
    this.yaw += xoffset * this.sensitivity;
    this.pitch += yoffset * this.sensitivity;

    if (this.pitch > 60) {
      this.pitch = 60;
    } else if (this.pitch < -60) {
      this.pitch = -60;
    }

    if (this.yaw > -90 + 60) {
      this.yaw = -90 + 60;
    } else if (this.yaw < -90 - 60) {
      this.yaw = -90 - 60;
    }

    this.updateCameraVectors();
  }

  zoom(delta: number) {
    this.fov -= delta;
  }

  getViewMatrix(out: mat4) {
    return mat4.lookAt(
      out,
      this.position,
      vec3.add(vec3.create(), this.position, this.front),
      this.up
    );
  }

  processKeyboard(direction: Direction, multiplier: number, deltaTime: number) {
    const scaledSpeed = this.speed * multiplier * deltaTime;

    switch (direction) {
      case Direction.FORWARD:
        vec3.add(
          this.position,
          this.position,
          vec3.scale(vec3.create(), this.front, scaledSpeed)
        );
        break;
      case Direction.BACKWARD:
        vec3.sub(
          this.position,
          this.position,
          vec3.scale(vec3.create(), this.front, scaledSpeed)
        );
        break;
      case Direction.LEFT:
        vec3.sub(
          this.position,
          this.position,
          vec3.scale(vec3.create(), this.right, scaledSpeed)
        );
        break;
      case Direction.RIGHT:
        vec3.add(
          this.position,
          this.position,
          vec3.scale(vec3.create(), this.right, scaledSpeed)
        );
        break;
      case Direction.UP:
        vec3.add(
          this.position,
          this.position,
          vec3.scale(vec3.create(), this.up, scaledSpeed)
        );
        break;
      case Direction.DOWN:
        vec3.sub(
          this.position,
          this.position,
          vec3.scale(vec3.create(), this.up, scaledSpeed)
        );
        break;
    }
  }
}
