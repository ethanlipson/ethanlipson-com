const keys = ['w', 's', 'a', 'd', 'e', 'q', 'shift'] as const;
export type Key = typeof keys[number];

class KeyboardManager {
  keysPressed: Set<Key> = new Set<Key>();

  constructor(element: HTMLElement) {
    element.setAttribute('tabIndex', '0');
    element.onkeydown = this.onKeyDown.bind(this);
    element.onkeyup = this.onKeyUp.bind(this);
  }

  onKeyDown(e: KeyboardEvent) {
    const lower = e.key.toLowerCase() as Key;
    if (!keys.includes(lower)) return;

    this.keysPressed.add(lower);
  }

  onKeyUp(e: KeyboardEvent) {
    const lower = e.key.toLowerCase() as Key;
    if (!keys.includes(lower)) return;

    this.keysPressed.delete(lower);
  }

  isPressed(key: Key) {
    return this.keysPressed.has(key);
  }
}

export default KeyboardManager;
