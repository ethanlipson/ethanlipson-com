import { mat4, vec2, vec3 } from 'gl-matrix';

class Portal {
  pos: vec3;
  normal: vec3;
  up: vec3;
  side: vec3;
  size: vec3;
  modelMatrix: mat4;

  constructor(pos: vec3, normal: vec3, up: vec3, size: vec3) {
    this.pos = pos;
    this.normal = normal;
    this.up = up;
    this.side = vec3.cross(vec3.create(), up, normal);
    this.size = size;

    this.modelMatrix = mat4.targetTo(
      mat4.create(),
      pos,
      vec3.add(vec3.create(), pos, normal),
      up
    );
    mat4.mul(
      this.modelMatrix,
      this.modelMatrix,
      mat4.scale(mat4.create(), mat4.create(), size)
    );
  }
}

export default Portal;
