import { vec2, vec3 } from 'gl-matrix';
import Portal from './portal';

class PortalPair {
  portals: [Portal, Portal];

  constructor(
    pos1: vec3,
    normal1: vec3,
    up1: vec3,
    size1: vec3,
    pos2: vec3,
    normal2: vec3,
    up2: vec3,
    size2: vec3
  ) {
    this.portals = [
      new Portal(pos1, normal1, up1, size1),
      new Portal(pos2, normal2, up2, size2),
    ];
  }
}

export default PortalPair;
