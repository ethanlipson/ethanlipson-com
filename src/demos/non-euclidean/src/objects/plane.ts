import { mat4, vec2, vec3 } from 'gl-matrix';

class Plane {
  pos: vec3;
  normal: vec3;
  up: vec3;
  side: vec3;
  size: vec2;
  modelMatrix: mat4;
  lightColor: vec3;
  darkColor: vec3;
  numSquares: vec2;
  minDistance: number;

  constructor(
    pos: vec3,
    normal: vec3,
    up: vec3,
    size: vec2,
    lightColor: vec3,
    darkColor: vec3,
    numSquares: vec2,
    minDistance: number
  ) {
    this.pos = pos;
    this.normal = normal;
    this.up = up;
    this.side = vec3.cross(vec3.create(), up, normal);
    this.size = size;
    this.lightColor = lightColor;
    this.darkColor = darkColor;
    this.numSquares = numSquares;
    this.minDistance = minDistance;

    this.modelMatrix = mat4.targetTo(
      mat4.create(),
      pos,
      vec3.add(vec3.create(), pos, normal),
      up
    );
    mat4.mul(
      this.modelMatrix,
      this.modelMatrix,
      mat4.scale(mat4.create(), mat4.create(), [this.size[0], this.size[1], 1])
    );
  }
}

export default Plane;
