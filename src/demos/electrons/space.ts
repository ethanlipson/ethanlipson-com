import { Scene, Vector3 } from 'three';
import * as THREE from 'three';

const electronRadius = 0.07;

class Electron {
  velocity: Vector3;
  mesh: THREE.Mesh;

  constructor(pos: Vector3, i: number) {
    this.velocity = new Vector3(0, 0, 0);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(electronRadius, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x00a2ff })
    );
    this.mesh.position.copy(pos);
  }

  get position() {
    return this.mesh.position;
  }

  set position(pos: Vector3) {
    this.mesh.position.copy(pos);
  }
}

export default class Space {
  electrons: Electron[] = [];
  scene: Scene;

  constructor(scene: THREE.Scene) {
    const baseSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 20),
      new THREE.MeshBasicMaterial({ color: 'hsl(0, 0%, 30%)', wireframe: true })
    );
    scene.add(baseSphere);

    this.scene = scene;
  }

  addElectron() {
    this.electrons.push(
      new Electron(
        new Vector3().setFromSphericalCoords(
          1,
          Math.random() * 2 * Math.PI,
          Math.random() * Math.PI
        ),
        this.electrons.length
      )
    );

    this.scene.add(this.electrons[this.electrons.length - 1].mesh);
  }

  removeElectron() {
    if (this.electrons.length === 0) return;

    this.scene.remove(this.electrons[this.electrons.length - 1].mesh);
    this.electrons.pop();
  }

  step(dt: number, electronStrength: number) {
    this.electrons.forEach((electron, i) => {
      const totalForce = new Vector3(0, 0, 0);
      this.electrons.forEach((otherElectron, j) => {
        if (i == j) return;

        const forceDirection = new Vector3()
          .subVectors(electron.position, otherElectron.position)
          .normalize();
        const forceMagnitude =
          electronStrength /
          new Vector3()
            .subVectors(electron.position, otherElectron.position)
            .lengthSq();
        const force = forceDirection.clone().multiplyScalar(forceMagnitude);

        const normal = electron.position;
        const projectedForce = force
          .clone()
          .sub(normal.clone().multiplyScalar(force.dot(normal)));

        totalForce.add(projectedForce);
      });

      electron.velocity.add(totalForce.multiplyScalar(dt));
    });

    this.electrons.forEach(electron => {
      electron.position.addVectors(
        electron.position,
        electron.velocity.clone().multiplyScalar(dt)
      );

      electron.position.normalize();
    });
  }
}
