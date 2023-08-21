import vec2 from './vecs/vec2';

export class Mass {
  position: vec2;
  velocity: vec2;
  mass: number;
  weight: number;
  nextPosition: vec2;
  gravity: boolean;

  constructor(position: vec2, velocity: vec2, mass: number, gravity: boolean = true) {
    this.position = position;
    this.velocity = velocity;
    this.mass = mass;
    this.weight = 1 / mass;
    this.nextPosition = position;
    this.gravity = gravity;
  }
}

class Constraint {
  m1: Mass;
  m2: Mass;
  length: number;

  constructor(m1: Mass, m2: Mass, length: number) {
    this.m1 = m1;
    this.m2 = m2;
    this.length = length;
  }

  solve() {
    const direction = this.m2.nextPosition.sub(this.m1.nextPosition).normalize();
    const distance = this.m2.nextPosition.distance(this.m1.nextPosition);

    const deltax1 = direction
      .scale(distance - this.length)
      .scale(this.m1.weight / (this.m1.weight + this.m2.weight));
    const deltax2 = direction
      .scale(distance - this.length)
      .scale(-this.m2.weight / (this.m1.weight + this.m2.weight));

    this.m1.nextPosition = this.m1.nextPosition.add(deltax1);
    this.m2.nextPosition = this.m2.nextPosition.add(deltax2);
  }
}

export default class Space {
  masses: Mass[] = [];
  constraints: Constraint[] = [];

  constructor() {}

  addMass(position: vec2, velocity: vec2, mass: number, gravity: boolean = true) {
    this.masses.push(new Mass(position, velocity, mass, gravity));
  }

  addConstraint(m1: number, m2: number, length: number) {
    this.constraints.push(new Constraint(this.masses[m1], this.masses[m2], length));
  }

  step(dt: number) {
    const numSubsteps = 1000;
    const dtSubstep = dt / numSubsteps;

    for (let i = 0; i < numSubsteps; i++) {
      this.masses.forEach(mass => {
        if (mass.gravity) {
          mass.velocity = mass.velocity.add(new vec2(0, -5000 * dtSubstep));
        }

        mass.nextPosition = mass.position;
        mass.nextPosition = mass.nextPosition.add(mass.velocity.scale(dtSubstep));
      });

      this.constraints.forEach(constraint => {
        constraint.solve();
      });

      this.masses.forEach(mass => {
        mass.velocity = mass.nextPosition.sub(mass.position).scale(1 / dtSubstep);
        mass.position = mass.nextPosition;
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.constraints.forEach(constraint => {
      ctx.beginPath();
      ctx.moveTo(
        constraint.m1.position.x,
        ctx.canvas.height - constraint.m1.position.y
      );
      ctx.lineTo(
        constraint.m2.position.x,
        ctx.canvas.height - constraint.m2.position.y
      );
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    this.masses.forEach(mass => {
      ctx.beginPath();
      ctx.arc(mass.position.x, ctx.canvas.height - mass.position.y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = '#f00';
      ctx.fill();
    });
  }
}
