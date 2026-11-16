export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function icon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const use = document.createElementNS(ns, "use");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", "#i-" + name);
  svg.append(use);
  return svg;
}

export function button(text, className, pictogram) {
  const control = element("button", className, text);
  control.type = "button";
  if (pictogram) control.append(" ", icon(pictogram));
  return control;
}

export function link(text, href, className, pictogram) {
  const anchor = element("a", className, text);
  anchor.href = href;
  if (/^https?:/i.test(href)) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  if (pictogram) anchor.append(" ", icon(pictogram));
  return anchor;
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard access may be restricted in an embedded preview.
    }
  }
  const parent = $("dialog[open]") || document.body;
  const field = element("textarea");
  const focused = document.activeElement;
  field.value = text;
  field.style.cssText = "position:fixed;left:-10000px";
  parent.append(field);
  field.select();
  try {
    return document.execCommand("copy");
  } finally {
    field.remove();
    focused?.focus({ preventScroll: true });
  }
}
