import { dataUrl, draftKey, maxDocumentSize, parsePortfolio, primesThrough } from "./model.js";
import { $, $$, button, copyText, element, icon, link } from "./ui.js";
import { setupEditor } from "./editor.js";

const search = $("#project-search");
const filters = $("#filters");
const grid = $("#projects");
const dialog = $("#project-dialog");
const detail = $("#project-detail");
const detailPrefix = "#project/";
const posterPrimes = new Set(primesThrough(32));
let category = "";
let published;
let draft;
let draftError = "";
let previewing = false;
let openProjectId = "";
let detailOrigin = null;
let toastTimer;

function notify(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  toast.toggleAttribute("data-error", error);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

async function copyValue(value, label) {
  try {
    if (await copyText(value)) {
      if (dialog.open) {
        const status = $(".detail-status", dialog);
        status.hidden = false;
        status.textContent = label;
      } else {
        notify(label);
      }
      return;
    }
  } catch {
    // Fall through to a selectable value.
  }
  prompt("Скопируй вручную", value);
}

function visibleData() {
  return previewing && draft ? draft : published;
}

function visibleProjects() {
  return visibleData().projects.filter(project => !project.hidden);
}

function makeTags(tags) {
  const list = element("ul", "tags");
  list.setAttribute("aria-label", "Технологии");
  list.append(...tags.map(tag => element("li", "", tag)));
  return list;
}

function applyProfile(profile) {
  $("#profile-role").textContent = profile.role;
  $("#profile-intro").textContent = profile.intro;
  $("#profile-bio").textContent = profile.bio;
  $(".about-text").hidden = !profile.bio;
  $(".stack").hidden = !profile.stack.length;
  $("#about").hidden = !profile.bio && !profile.stack.length;
  $('.site-nav a[href="#about"]').hidden = $("#about").hidden;
  $("#profile-stack").replaceWith(Object.assign(makeTags(profile.stack), { id: "profile-stack" }));
  const github = $("[data-github]");
  github.hidden = !profile.github;
  github.href = profile.github || "#contact";
  const links = $("#contact-links");
  links.replaceChildren();
  if (profile.telegram) links.append(link("Telegram", profile.telegram, "button contact-primary", "out"));
  if (profile.kwork) links.append(link("Kwork", profile.kwork, "button contact-secondary", "out"));
  if (profile.github) {
    const githubStyle = profile.telegram ? "contact-secondary" : "contact-primary";
    const githubContact = link("GitHub", profile.github, "button " + githubStyle, "out");
    githubContact.prepend(icon("github"));
    links.append(githubContact);
  }
  if (profile.email) {
    const email = link("Написать", "mailto:" + profile.email, "button contact-secondary", "out");
    const copy = button("Почту в буфер", "button contact-secondary", "copy");
    copy.addEventListener("click", () => copyValue(profile.email, "Адрес скопирован."));
    links.append(email, copy);
  }
  $("#contact").hidden = !links.childElementCount;
  $$('a[href="#contact"]', $(".hero-actions")).forEach(control => { control.hidden = $("#contact").hidden; });
  $('.site-nav a[href="#contact"]').hidden = $("#contact").hidden;
}

function windowBar() {
  const bar = element("div", "mini-bar");
  bar.append(element("i"), element("i"), element("i"));
  return bar;
}

function recoveryArt() {
  const frame = element("div", "recovery-window");
  const body = element("div", "recovery-screen");
  const steps = element("div", "recovery-flow");
  steps.append(element("span", "", "ОТКАЗ"), icon("right"), element("span", "", "ПОВТОР"), icon("right"), element("strong", "", "ОПЛАТА"));
  body.append(element("b", "", "REVALY"), element("span", "recovery-caption", "PAYMENT RECOVERY"), steps);
  frame.append(windowBar(), body);
  return frame;
}

function dependencyArt() {
  const diagram = element("div", "dependency-diagram");
  const children = element("div", "dependency-nodes");
  children.append(...["AST", "SCORE", "CHECKS"].map(label => element("span", "", label)));
  diagram.append(element("span", "dependency-root", "git diff"), element("div", "dependency-branch"), children);
  return diagram;
}

function chatArt() {
  const phone = element("div", "chat-phone");
  const header = element("div", "chat-header");
  header.append(element("b", "", "SHROUD"), element("span", "", "E2EE"));
  phone.append(header, element("div", "chat-bubble"), element("div", "chat-bubble outgoing"), element("div", "chat-bubble"), element("div", "chat-compose"));
  return phone;
}

function statementArt() {
  const sheet = element("div", "statement-sheet");
  sheet.append(element("b", "", "FLOW"), element("span", "statement-caption", "РАЗБОР ВЫПИСКИ"));
  for (const label of ["Подписки", "Комиссии", "Дубли"]) {
    sheet.append(element("span", "statement-item", label));
  }
  return sheet;
}

function marketArt() {
  const board = element("div", "market-board");
  const header = element("div", "market-header");
  header.append(element("b", "", "P2P"), element("span", "", "MARKET FEED"));
  const rows = element("div", "market-rows");
  for (const label of ["BUY", "SELL"]) {
    const row = element("div", "market-row");
    row.append(element("span", "", label), element("i"));
    rows.append(row);
  }
  board.append(header, rows);
  return board;
}

function desktopAgentArt() {
  const monitor = element("div", "agent-monitor");
  const screen = element("div", "agent-screen");
  screen.append(element("span", "agent-caption", "VLA / WINDOWS"), element("span", "agent-selection"), element("span", "agent-cursor"));
  monitor.append(windowBar(), screen);
  return monitor;
}

function coverArt(project) {
  const cover = element("div", "project-cover cover-" + project.art);
  cover.setAttribute("aria-hidden", "true");
  const visual = element("div", "cover-visual");
  if (project.art === "recovery") {
    visual.append(recoveryArt());
  } else if (project.art === "dependencies") {
    visual.append(dependencyArt());
  } else if (project.art === "chat") {
    visual.append(chatArt());
  } else if (project.art === "statement") {
    visual.append(statementArt());
  } else if (project.art === "market") {
    visual.append(marketArt());
  } else if (project.art === "desktop-agent") {
    visual.append(desktopAgentArt());
  } else if (project.art === "browser") {
    const frame = element("div", "mini-window");
    const layout = element("div", "mini-layout");
    const heading = element("b", "", "NotThe");
    heading.append(element("br"), document.createTextNode("Adam"), element("span", "", "."));
    layout.append(heading, element("i"));
    frame.append(windowBar(), layout);
    visual.append(frame);
  } else if (project.art === "sieve") {
    const cells = element("div", "sieve-cells");
    for (let n = 1; n <= 32; n++) cells.append(element("i", posterPrimes.has(n) ? "is-prime" : "", String(n).padStart(2, "0")));
    visual.append(cells);
    visual.classList.add("sieve-visual");
  } else if (project.art === "terminal") {
    const terminal = element("div", "terminal-window");
    const code = element("code");
    code.append(element("b", "", "$"), " python main.py\n", element("b", "", "›"), " discord.py");
    terminal.append(windowBar(), code);
    visual.append(terminal);
  } else {
    visual.classList.add("type-visual");
    visual.textContent = project.title;
  }
  cover.append(visual);
  if (project.image) {
    const img = element("img");
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => img.remove(), { once: true });
    img.src = project.image;
    cover.append(img);
  }
  return cover;
}

function projectCard(project) {
  const card = element("article", "project-card");
  const title = link(project.title, detailPrefix + project.id, "project-title");
  title.addEventListener("click", event => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    detailOrigin = title;
    history.pushState(null, "", detailPrefix + project.id);
    synchronizeRoute();
  });
  const body = element("div", "project-card-body");
  const meta = element("div", "card-meta");
  meta.append(element("span", "", project.category), element("span", "", project.year));
  const heading = element("h3");
  const arrow = element("span", "project-arrow");
  arrow.append(icon("out"));
  title.append(arrow);
  heading.append(title);
  body.append(meta, heading, element("p", "", project.summary));
  if (project.tags.length) body.append(makeTags(project.tags));
  card.append(coverArt(project), body);
  return card;
}

function paintFilters(projects) {
  const categories = [...new Set(projects.map(project => project.category))];
  if (!categories.includes(category)) category = "";
  const controls = ["", ...categories].map(value => {
    const control = button(value || "Все", "");
    control.setAttribute("aria-pressed", String(value === category));
    control.addEventListener("click", () => {
      category = value;
      for (const item of filters.children) item.setAttribute("aria-pressed", String(item === control));
      paintProjects();
    });
    return control;
  });
  filters.replaceChildren(...controls);
}

function paintProjects(projects = visibleProjects()) {
  const terms = search.value.trim().toLocaleLowerCase("ru").split(/\s+/).filter(Boolean);
  const results = projects.filter(project => {
    if (category && project.category !== category) return false;
    const haystack = [project.title, project.category, project.summary, project.description, project.year, ...project.tags].join(" ").toLocaleLowerCase("ru");
    return terms.every(term => haystack.includes(term));
  });
  grid.replaceChildren(...results.map(projectCard));
  const count = $("#work-count");
  const number = element("strong", "", String(results.length).padStart(2, "0"));
  count.replaceChildren(results.length === projects.length ? "РАБОТЫ / " : "НАЙДЕНО / ", number);
  const empty = $("#work-empty");
  empty.hidden = results.length > 0;
  $("#empty-text").textContent = projects.length ? "По этому запросу ничего не нашлось." : "Каталог пока пуст.";
  $("#reset-filters").hidden = !projects.length;
}

function paintSite() {
  const current = visibleData();
  applyProfile(current.profile);
  const projects = visibleProjects();
  paintFilters(projects);
  paintProjects(projects);
  $("#preview-bar").hidden = !previewing || !draft;
  if (openProjectId) synchronizeRoute(true);
}

function rememberPreview() {
  try { sessionStorage.setItem(draftKey, previewing ? "on" : "off"); } catch { /* Preview remains active for this page. */ }
}

function loadDraft() {
  try {
    const data = localStorage.getItem(draftKey);
    draft = data ? parsePortfolio(JSON.parse(data)) : undefined;
    draftError = "";
  } catch {
    draftError = "Локальный черновик не прочитан. Можно импортировать резервную копию или начать с опубликованной версии.";
    draft = undefined;
  }
}

const store = {
  working: () => draft || published,
  hasDraft: () => Boolean(draft),
  loadIssue: () => draftError,
  save(data) {
    const validated = parsePortfolio(data);
    const raw = JSON.stringify(validated, null, 2);
    if (new Blob([raw]).size + 1 > maxDocumentSize) {
      throw new Error("Черновик превысил 2 МБ. Используй ссылки для части обложек.");
    }
    try {
      localStorage.setItem(draftKey, raw);
    } catch {
      throw new Error("Браузер не сохранил черновик. Проверь доступ к хранилищу и размер обложек.");
    }
    draft = validated;
    draftError = "";
    if (previewing) paintSite();
  },
  discard() {
    localStorage.removeItem(draftKey);
    draft = undefined;
    draftError = "";
    store.preview(false);
  },
  preview(on) {
    previewing = on && Boolean(draft);
    rememberPreview();
    paintSite();
  },
};

function makeSieveDemo() {
  const box = element("section", "sieve-demo");
  const title = element("h3", "eyebrow", "Запустить решето");
  const form = element("form");
  const label = element("label", "", "Числа до");
  const input = element("input");
  input.type = "number";
  input.min = "2";
  input.max = "200";
  input.value = "30";
  input.required = true;
  input.id = "sieve-limit";
  label.htmlFor = input.id;
  const run = button("Найти простые", "button primary");
  run.type = "submit";
  const result = element("output");
  result.htmlFor.add(input.id);
  const go = () => { result.value = primesThrough(input.valueAsNumber).join(", "); };
  form.addEventListener("submit", event => {
    event.preventDefault();
    go();
  });
  form.append(label, input, run);
  box.append(title, form, result);
  go();
  return box;
}

function paintDetail(project) {
  const body = element("div", "detail-body");
  const title = element("h2", "", project.title);
  title.id = "detail-title";
  const meta = element("p", "eyebrow accent", [project.category, project.year].filter(Boolean).join(" / "));
  body.append(meta, title, element("p", "", project.description || project.summary));
  if (project.tags.length) body.append(makeTags(project.tags));
  if (project.interaction === "sieve") body.append(makeSieveDemo());
  const actions = element("div", "detail-links");
  if (project.repo) actions.append(link("Исходный код", project.repo, "button primary", "out"));
  if (project.demo) actions.append(link("Открыть демо", project.demo, "button primary", "out"));
  const copy = button("Копировать ссылку", "button outline", "copy");
  copy.addEventListener("click", () => copyValue(new URL(detailPrefix + project.id, location.href).href, "Ссылка скопирована."));
  actions.append(copy);
  const status = element("p", "detail-status");
  status.setAttribute("role", "status");
  status.hidden = true;
  body.append(actions, status);
  detail.replaceChildren(coverArt(project), body);
}

function returnToCatalog() {
  if (location.hash.startsWith(detailPrefix)) history.replaceState(null, "", "#work");
  if (!detailOrigin?.isConnected) {
    $("#work").scrollIntoView({ block: "start" });
    search.focus({ preventScroll: true });
  }
}

function synchronizeRoute(refresh = false) {
  const hash = location.hash;
  if (!hash.startsWith(detailPrefix)) {
    if (dialog.open) dialog.close();
    return;
  }
  const project = visibleProjects().find(item => hash === detailPrefix + item.id);
  if (!project) {
    if (dialog.open) dialog.close();
    returnToCatalog();
    notify("Проект отсутствует в этом каталоге.", true);
    return;
  }
  if (!dialog.open || refresh || project.id !== openProjectId) {
    paintDetail(project);
    openProjectId = project.id;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
}

$("[data-close]", dialog).addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});
dialog.addEventListener("close", () => {
  openProjectId = "";
  if (location.hash.startsWith(detailPrefix)) returnToCatalog();
  if (detailOrigin?.isConnected) detailOrigin.focus({ preventScroll: true });
  detailOrigin = null;
});

async function start() {
  try {
    const response = await fetch(dataUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error("Не удалось загрузить portfolio.json.");
    published = parsePortfolio(await response.json());
  } catch (error) {
    const message = $("#load-error");
    message.textContent = location.protocol === "file:" ? "Открой сайт через локальный HTTP-сервер. Команда есть в README.md." : "Каталог недоступен. Проверь файл portfolio.json и обнови страницу.";
    message.hidden = false;
    $(".work-tools").hidden = true;
    $("[data-open-editor]").hidden = true;
    console.error(error);
    return;
  }
  loadDraft();
  try { previewing = Boolean(draft) && sessionStorage.getItem(draftKey) === "on"; } catch { /* Use the public view. */ }
  paintSite();

  const editor = setupEditor(store);
  $("[data-open-editor]").addEventListener("click", editor.open);
  $("[data-end-preview]").addEventListener("click", () => {
    store.preview(false);
    $(".hero-actions a").focus({ preventScroll: true });
    notify("Открыта опубликованная версия.");
  });
  search.addEventListener("input", () => paintProjects());
  $("#reset-filters").addEventListener("click", () => {
    search.value = "";
    category = "";
    const projects = visibleProjects();
    paintFilters(projects);
    paintProjects(projects);
    search.focus();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !event.altKey && !event.ctrlKey && !event.metaKey &&
      !event.target.closest("input, textarea, select, [contenteditable]") && !$("dialog[open]")) {
      event.preventDefault();
      search.focus();
    }
  });
  window.addEventListener("hashchange", () => synchronizeRoute());
  window.addEventListener("storage", event => {
    if (event.key === draftKey || event.key === null) {
      loadDraft();
      if (previewing) store.preview(Boolean(draft));
    }
  });
  synchronizeRoute();
  if (new URLSearchParams(location.search).get("edit") === "1" && !dialog.open) editor.open();
}

start();
