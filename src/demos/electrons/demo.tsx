import type { NextPage } from 'next';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Space from './space';
import styles from './demo.module.css';

const electronStrength = 8;
const numElectrons = 2;
const dt = 0.016667;
const numSubsteps = 10;

const Demo: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const space = useRef<Space | null>(null);
  const mouseMoved = useRef(false);

  useEffect(() => {
    if (!canvas.current) return;
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.current.width / canvas.current.height,
      0.1,
      100
    );
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current });
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    camera.position.z = 3;

    space.current = new Space(scene);
    for (let i = 0; i < numElectrons; i++) {
      space.current.addElectron();
    }

    const pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(0, 3, 3);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    function animate() {
      if (!space.current) return;

      for (let i = 0; i < numSubsteps; i++) {
        space.current.step(dt / numSubsteps, electronStrength);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  });

  return (
    <div className={styles['electrons']}>
      <canvas
        ref={canvas}
        onMouseMove={() => {
          mouseMoved.current = true;
        }}
        onMouseDown={() => {
          mouseMoved.current = false;
        }}
        onMouseUp={event => {
          if (!space.current) return;

          if (mouseMoved.current) return;

          if (event.button === 0) space.current.addElectron();
          if (event.button === 2) space.current.removeElectron();
        }}
      />
    </div>
  );
};

export default Demo;
