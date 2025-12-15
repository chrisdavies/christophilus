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
export {
  h
};
