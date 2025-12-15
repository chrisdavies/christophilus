// games/gamepad-diagnostic/h.ts
function toNode(node) {
  return typeof node === "string" ? document.createTextNode(node) : node;
}
function h(tagAndClass, attrs, ...children) {
  const [tagName, ...classes] = tagAndClass.split(".");
  const el = document.createElement(tagName || "div");
  el.className = classes.join(" ");
  if (attrs instanceof HTMLElement || typeof attrs === "string") {
    el.append(toNode(attrs));
  } else if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (typeof v === "function") {
        el[k] = v;
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  for (const child of children) {
    if (child) {
      el.appendChild(toNode(child));
    }
  }
  return el;
}

// games/gamepad-diagnostic/index.ts
class GamepadDiagnostic extends HTMLElement {
  index;
  constructor(index, title) {
    super();
    this.index = index;
    this.append(h("xc-controller-wrapper", h("xc-controller-header", title), h("xc-controller", h("xc-dpad", h("xc-dpad-up"), h("xc-dpad-right"), h("xc-dpad-down"), h("xc-dpad-left")), h("xc-select"), h("xc-start"), h("xc-buttons", h("xc-button-up"), h("xc-button-right"), h("xc-button-down"), h("xc-button-left")), h("xc-stick-left"), h("xc-stick-right"), h("xc-trigger-bottom-left"), h("xc-trigger-bottom-right"), h("xc-trigger-top-left"), h("xc-trigger-top-right"))));
  }
  connectedCallback() {
    const toggleButton = (gamepad, selector, ...index) => {
      this.querySelector(selector)?.classList.toggle("xc-active", index.some((i) => gamepad.buttons[i]?.pressed));
    };
    const setAxis = (selector, x, y) => {
      const el = this.querySelector(selector);
      el.style.setProperty("--x", `${x}`);
      el.style.setProperty("--y", `${y}`);
    };
    const tick = () => {
      const gamepad = navigator.getGamepads()[this.index];
      if (!gamepad?.connected) {
        return;
      }
      if (this.isConnected) {
        window.requestAnimationFrame(tick);
      }
      this.querySelector("xc-controller-header").textContent = gamepad.id;
      toggleButton(gamepad, "xc-button-down", 0);
      toggleButton(gamepad, "xc-button-right", 1);
      toggleButton(gamepad, "xc-button-left", 2);
      toggleButton(gamepad, "xc-button-up", 3);
      toggleButton(gamepad, "xc-trigger-top-left", 4);
      toggleButton(gamepad, "xc-trigger-bottom-left", 6);
      toggleButton(gamepad, "xc-trigger-top-right", 5);
      toggleButton(gamepad, "xc-trigger-bottom-right", 7);
      toggleButton(gamepad, "xc-select", 8);
      toggleButton(gamepad, "xc-start", 9);
      toggleButton(gamepad, "xc-stick-left", 10);
      toggleButton(gamepad, "xc-stick-right", 11);
      toggleButton(gamepad, "xc-dpad-up", 12);
      toggleButton(gamepad, "xc-dpad-down", 13);
      toggleButton(gamepad, "xc-dpad-left", 14);
      toggleButton(gamepad, "xc-dpad-right", 15);
      setAxis("xc-stick-left", gamepad.axes[0], gamepad.axes[1]);
      setAxis("xc-stick-right", gamepad.axes[2], gamepad.axes[3]);
    };
    window.requestAnimationFrame(tick);
  }
  disconnectedCallback() {}
}
customElements.define("xc-gamepad-diagnostic", GamepadDiagnostic);

class Page extends HTMLElement {
  instructions = h("xc-instructions", "Connect one or more controllers and press any button to get started...");
  constructor() {
    super();
    this.append(this.instructions);
  }
  onGamepadConnected = (e) => {
    this.instructions.remove();
    this.append(new GamepadDiagnostic(e.gamepad.index, e.gamepad.id));
  };
  onGamepadDisconnected = (e) => {
    const gamepads = this.querySelectorAll("xc-gamepad-diagnostic");
    for (const child of gamepads) {
      if (child.index === e.gamepad.index) {
        child.remove();
        break;
      }
    }
    if (!this.querySelector("xc-gamepad-diagnostic")) {
      this.append(this.instructions);
    }
  };
  connectedCallback() {
    window.addEventListener("gamepadconnected", this.onGamepadConnected);
    window.addEventListener("gamepaddisconnected", this.onGamepadDisconnected);
  }
  disconnectedCallback() {
    window.removeEventListener("gamepadconnected", this.onGamepadConnected);
    window.removeEventListener("gamepaddisconnected", this.onGamepadDisconnected);
  }
}
customElements.define("xc-controllers", Page);
document.querySelector("main").append(new Page);
