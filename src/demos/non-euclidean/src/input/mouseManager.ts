class MouseManager {
  deltaX: number = 0;
  deltaY: number = 0;
  element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    element.onmousemove = this.onMouseMove.bind(this);
    element.onclick = this.onClick.bind(this);
  }

  onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement === this.element) {
      this.deltaX += e.movementX;
      this.deltaY -= e.movementY;
    }
  }

  onClick() {
    if (document.pointerLockElement !== this.element) {
      this.element.requestPointerLock();
    }
  }

  reset() {
    this.deltaX = 0;
    this.deltaY = 0;
  }
}

export default MouseManager;
