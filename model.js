export const dataUrl = new URL("./portfolio.json", import.meta.url);
export const draftKey = "nottheadam:portfolio:v1:" + dataUrl.pathname;
export const maxDocumentSize = 2_000_000;
const artStyles = new Set([
  "type", "browser", "sieve", "terminal", "recovery", "dependencies", "chat",
  "statement", "market", "desktop-agent",
]);

function asObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Ожидался объект «${label}».`);
  }
  return value;
}

function cleanText(value, limit, label, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > limit || (required && !result)) {
    throw new Error(`Проверь поле «${label}» (до ${limit} символов).`);
  }
  return result;
}

function cleanTags(value, label) {
  const parts = typeof value === "string" ? value.split(",") : value ?? [];
  if (!Array.isArray(parts) || parts.length > 18 || parts.some(tag => typeof tag !== "string")) {
    throw new Error(`В поле «${label}» можно указать до 18 значений.`);
  }
  return [...new Set(parts.map(tag => cleanText(tag, 45, label)).filter(Boolean))];
}

function httpLink(value, label, allowAnchor = false) {
  const text = cleanText(value, 500, label);
  if (!text || (allowAnchor && /^#[a-z][a-z0-9-]*$/i.test(text))) return text;
  const url = URL.canParse(text) ? new URL(text) : null;
  if (!url || !["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(`Для поля «${label}» нужна ссылка на http:// или https://.`);
  }
  return text;
}

function imageLink(value) {
  const image = cleanText(value, 450_000, "Обложка");
  if (/^data:image\/(webp|jpeg|png|avif);base64,[a-z0-9+/]+=*$/i.test(image)) return image;
  if (/^\.?\/?assets\/[\w./%-]+$/i.test(image)) {
    const relative = image.replace(/^\.?\//, "");
    if (new URL(relative, dataUrl).href.startsWith(new URL("./assets/", dataUrl).href)) {
      return "./" + relative;
    }
  }
  return httpLink(image, "Обложка");
}

export function parseProfile(value) {
  const profile = asObject(value, "Профиль");
  const email = cleanText(profile.email, 240, "Почта");
  if (email && !/^[^\s@<>,;:?#]+@[^\s@<>,;:?#]+\.[^\s@<>,;:?#]+$/.test(email)) {
    throw new Error("Укажи почту в формате name@example.com.");
  }
  return {
    role: cleanText(profile.role, 60, "Роль", true),
    intro: cleanText(profile.intro, 220, "Вступление", true),
    bio: cleanText(profile.bio, 2000, "Обо мне"),
    stack: cleanTags(profile.stack, "Технологии"),
    github: httpLink(profile.github, "GitHub"),
    telegram: httpLink(profile.telegram, "Telegram"),
    kwork: httpLink(profile.kwork, "Kwork"),
    email,
  };
}

export function parseProject(value) {
  const project = asObject(value, "Проект");
  const id = cleanText(project.id, 72, "Идентификатор проекта", true);
  const year = cleanText(project.year, 4, "Год");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Недопустимый идентификатор проекта.");
  if (year && !/^\d{4}$/.test(year)) throw new Error("Год должен состоять из четырёх цифр.");
  return {
    id,
    title: cleanText(project.title, 80, "Название", true),
    category: cleanText(project.category, 32, "Категория", true),
    summary: cleanText(project.summary, 220, "Короткое описание", true),
    description: cleanText(project.description, 4000, "Подробности"),
    tags: cleanTags(project.tags, "Технологии"),
    year,
    repo: httpLink(project.repo, "Ссылка на код"),
    demo: httpLink(project.demo, "Ссылка на демо", true),
    art: artStyles.has(project.art) ? project.art : "type",
    image: imageLink(project.image),
    hidden: project.hidden === true,
    ...(project.interaction === "sieve" ? { interaction: "sieve" } : {}),
  };
}

export function parsePortfolio(value) {
  const document = asObject(value, "Портфолио");
  if (document.version !== 1 || !Array.isArray(document.projects)) {
    throw new Error("Ожидался JSON портфолио версии 1 со списком projects.");
  }
  const projects = document.projects.map(parseProject);
  if (new Set(projects.map(project => project.id)).size !== projects.length) {
    throw new Error("Идентификаторы проектов должны быть уникальными.");
  }
  return { version: 1, profile: parseProfile(document.profile), projects };
}

export function projectId(title, projects) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 51).replace(/^-|-$/g, "");
  const nonce = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  return slug && !projects.some(project => project.id === slug) ? slug : `${slug || "project"}-${nonce}`;
}

export function primesThrough(limit) {
  const composite = new Uint8Array(limit + 1);
  for (let prime = 2; prime * prime <= limit; prime++) {
    if (composite[prime]) continue;
    for (let multiple = prime * prime; multiple <= limit; multiple += prime) composite[multiple] = 1;
  }
  return Array.from({ length: limit - 1 }, (_, index) => index + 2).filter(number => !composite[number]);
}
