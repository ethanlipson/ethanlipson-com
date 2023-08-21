export default class vec2 {
  x: number;
  y: number;

  constructor(a: number);
  constructor(a: number, b: number);
  constructor(a: number, b?: number) {
    if (b === undefined) {
      this.x = a;
      this.y = a;
    } else {
      this.x = a;
      this.y = b;
    }
  }

  list(): number[] {
    return [this.x, this.y];
  }

  add(other: vec2): vec2 {
    return new vec2(this.x + other.x, this.y + other.y);
  }

  sub(other: vec2): vec2 {
    return new vec2(this.x - other.x, this.y - other.y);
  }

  mul(other: vec2): vec2 {
    return new vec2(this.x * other.x, this.y * other.y);
  }

  div(other: vec2): vec2 {
    return new vec2(this.x / other.x, this.y / other.y);
  }

  scale(scalar: number): vec2 {
    return new vec2(this.x * scalar, this.y * scalar);
  }

  dot(other: vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  length(): number {
    return Math.sqrt(this.dot(this));
  }

  length2(): number {
    return this.dot(this);
  }

  normalize(): vec2 {
    return this.scale(1 / this.length());
  }

  distance(other: vec2): number {
    return this.sub(other).length();
  }

  distance2(other: vec2): number {
    return this.sub(other).length2();
  }

  cross(other: vec2): number {
    return this.x * other.y - this.y * other.x;
  }
}
