function toNode(node: Node | string) {
  return typeof node === 'string' ? document.createTextNode(node) : node;
}

export function h(
  tagName: string,
  attrs?: ElementCreationOptions & Record<string, any>,
  ...children: Array<string | Node>
): HTMLElement;
export function h(tagName: string, ...children: Array<string | boolean | Node>): HTMLElement;
export function h<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: ElementCreationOptions,
  ...children: Array<string | Node>
): HTMLElementTagNameMap[K];
export function h(tagAndClass: string, attrs?: any, ...children: any[]): HTMLElement {
  const [tagName, ...classes] = tagAndClass.split('.');
  const el = document.createElement(tagName || 'div');
  el.className = classes.join(' ');
  if (attrs instanceof HTMLElement || typeof attrs === 'string') {
    el.append(toNode(attrs));
  } else if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (typeof v === 'function') {
        (el as any)[k] = v;
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
