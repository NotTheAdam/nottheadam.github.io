import { dataUrl, maxDocumentSize, parsePortfolio, parseProfile, parseProject, projectId } from "./model.js";
import { $, $$, button, element, icon } from "./ui.js";

const editor = $("#editor");
const projectForm = $("#project-form");
const profileForm = $("#profile-form");
const upload = $("#cover-file");
const imagePreview = $("#cover-preview");
const status = $("#editor-status");
const tabs = $$("[data-editor-tab]", editor);

function setStatus(message = "", error = false) {
  status.textContent = message;
  status.toggleAttribute("data-error", error);
  if (error) status.scrollIntoView({ block: "nearest" });
}

function saveFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const address = URL.createObjectURL(blob);
  const anchor = element("a");
  anchor.href = address;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(address), 10_000);
}

function repoFromPagesUrl() {
  const match = location.hostname.match(/^([a-z\d-]+)\.github\.io$/i);
  if (!match) return "";
  const name = new URL(".", dataUrl).pathname.split("/").filter(Boolean)[0] || location.hostname;
  return "https://github.com/" + match[1] + "/" + name;
}

async function resizeCover(file) {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 15_000_000) {
    throw new Error("Выбери PNG, JPEG, WebP или AVIF размером до 15 МБ.");
  }
  const image = await createImageBitmap(file);
  try {
    const canvas = element("canvas");
    const scale = Math.min(1, 1050 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.82, .65, .48]) {
      const result = canvas.toDataURL("image/webp", quality);
      if (result.length <= 450_000) return result;
    }
    throw new Error("Обложка слишком тяжёлая. Попробуй изображение меньшего размера.");
  } finally {
    image.close();
  }
}

export function setupEditor(store) {
  let activeTab = "projects";
  let editingId = "";
  let imageData = "";
  let formDirty = false;
  let uploadVersion = 0;

  function allowLeaving() {
    return !formDirty || confirm("Отменить несохранённые изменения в форме?");
  }

  function paintManager() {
    const projects = store.working().projects;
    const categories = [...new Set(projects.map(project => project.category))];
    $("#category-options").replaceChildren(...categories.map(category => {
      const option = element("option");
      option.value = category;
      return option;
    }));
    const list = $("#manager-list");
    if (!projects.length) {
      list.replaceChildren(element("p", "muted", "Здесь появится первая работа."));
      return;
    }
    list.replaceChildren(...projects.map((project, index) => {
      const row = element("div", "manager-item");
      const edit = button(project.title, "manager-edit");
      edit.append(element("span", "", project.category + (project.hidden ? " · Черновик" : " · В каталоге")));
      edit.addEventListener("click", () => showProject(project));
      const order = element("div", "manager-order");
      const directions = [
        { offset: -1, icon: "up", label: "выше" },
        { offset: 1, icon: "down", label: "ниже" },
      ];
      for (const direction of directions) {
        const target = index + direction.offset;
        const control = button("", "icon-button", direction.icon);
        control.disabled = target < 0 || target >= projects.length;
        control.setAttribute("aria-label", `Переместить «${project.title}» ${direction.label}`);
        control.addEventListener("click", () => {
          attempt(() => {
            const current = store.working();
            const reordered = [...current.projects];
            const from = reordered.findIndex(item => item.id === project.id);
            const to = from + direction.offset;
            if (from < 0 || to < 0 || to >= reordered.length) return;
            [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
            store.save({ ...current, projects: reordered });
            paintManager();
            list.children[to]?.querySelector(".manager-edit")?.focus();
            setStatus("Порядок сохранён в черновике.");
          });
        });
        order.append(control);
      }
      row.append(edit, order);
      return row;
    }));
  }

  function showList() {
    uploadVersion++;
    formDirty = false;
    projectForm.hidden = true;
    $("#manager").hidden = false;
    paintManager();
  }

  function showProject(project) {
    uploadVersion++;
    projectForm.reset();
    editingId = project?.id || "";
    imageData = project?.image.startsWith("data:") ? project.image : "";
    for (const field of ["title", "category", "summary", "description", "year", "repo", "demo"]) {
      projectForm.elements[field].value = project?.[field] || "";
    }
    projectForm.elements.art.value = project?.art || "type";
    projectForm.elements.tags.value = project?.tags.join(", ") || "";
    projectForm.elements.image.value = imageData ? "" : project?.image || "";
    projectForm.elements.hidden.checked = project?.hidden === true;
    $("#project-form-title").textContent = project?.title || "Новый проект";
    $("#delete-project").hidden = !editingId;
    $("#manager").hidden = true;
    projectForm.hidden = false;
    $('button[type="submit"]', projectForm).disabled = false;
    paintCover();
    formDirty = false;
    setStatus();
    projectForm.elements.title.focus();
  }

  function paintCover() {
    imagePreview.hidden = !imageData;
    const image = $("img", imagePreview);
    if (imageData) image.src = imageData;
    else image.removeAttribute("src");
  }

  function paintProfile() {
    const profile = store.working().profile;
    for (const [field, value] of Object.entries(profile)) {
      profileForm.elements[field].value = Array.isArray(value) ? value.join(", ") : value;
    }
  }

  function paintPublish() {
    const repoUrl = repoFromPagesUrl();
    const repo = $("#repo-upload");
    repo.hidden = !repoUrl;
    if (repoUrl) repo.href = repoUrl;
    $("#discard-draft").hidden = !store.hasDraft() && !store.loadIssue();
    $("#preview-draft").disabled = !store.hasDraft();
  }

  function changeTab(tab) {
    uploadVersion++;
    activeTab = tab;
    formDirty = false;
    for (const control of tabs) {
      const selected = control.dataset.editorTab === tab;
      control.setAttribute("aria-pressed", String(selected));
      $("#edit-" + control.dataset.editorTab).hidden = !selected;
    }
    setStatus();
    if (tab === "projects") showList();
    if (tab === "profile") paintProfile();
    if (tab === "publish") paintPublish();
  }

  function attempt(action) {
    try {
      action();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function open() {
    if (editor.open) return;
    changeTab("projects");
    editor.showModal();
    if (store.loadIssue()) setStatus(store.loadIssue(), true);
  }

  tabs.forEach(control => control.addEventListener("click", () => {
    if (control.dataset.editorTab !== activeTab && allowLeaving()) changeTab(control.dataset.editorTab);
  }));
  editor.addEventListener("cancel", event => {
    if (!allowLeaving()) event.preventDefault();
  });
  $("[data-close]", editor).addEventListener("click", () => {
    if (allowLeaving()) editor.close();
  });
  editor.addEventListener("close", () => { uploadVersion++; });
  [projectForm, profileForm].forEach(form => form.addEventListener("input", () => { formDirty = true; }));
  $("#add-project").addEventListener("click", () => showProject(null));
  $("#back-to-list").addEventListener("click", () => {
    if (!allowLeaving()) return;
    showList();
    setStatus();
    $("#add-project").focus();
  });

  upload.addEventListener("change", async () => {
    const file = upload.files[0];
    if (!file) return;
    const version = ++uploadVersion;
    const submit = $('button[type="submit"]', projectForm);
    submit.disabled = true;
    setStatus("Обрабатываю обложку…");
    try {
      const resized = await resizeCover(file);
      if (version !== uploadVersion) return;
      imageData = resized;
      projectForm.elements.image.value = "";
      formDirty = true;
      paintCover();
      setStatus("Обложка готова.");
    } catch (error) {
      if (version === uploadVersion) setStatus(error.message || "Не удалось прочитать обложку.", true);
    } finally {
      if (version === uploadVersion) {
        upload.value = "";
        submit.disabled = false;
      }
    }
  });
  projectForm.elements.image.addEventListener("input", () => {
    if (!projectForm.elements.image.value.trim()) return;
    uploadVersion++;
    upload.value = "";
    $('button[type="submit"]', projectForm).disabled = false;
    imageData = "";
    paintCover();
    setStatus();
  });
  $("#clear-cover").addEventListener("click", () => {
    uploadVersion++;
    upload.value = "";
    $('button[type="submit"]', projectForm).disabled = false;
    imageData = "";
    formDirty = true;
    paintCover();
    upload.focus();
  });

  projectForm.addEventListener("submit", event => {
    event.preventDefault();
    attempt(() => {
      const current = store.working();
      const values = Object.fromEntries(new FormData(projectForm));
      const previous = current.projects.find(project => project.id === editingId);
      const project = parseProject({
        ...previous,
        ...values,
        id: editingId || projectId(values.title, current.projects),
        hidden: projectForm.elements.hidden.checked,
        image: values.image.trim() || imageData,
      });
      const projects = previous
        ? current.projects.map(item => item.id === editingId ? project : item)
        : [...current.projects, project];
      store.save({ ...current, projects });
      showList();
      $("#add-project").focus();
      setStatus("Проект сохранён в черновике.");
    });
  });
  $("#delete-project").addEventListener("click", () => {
    const current = store.working();
    const project = current.projects.find(item => item.id === editingId);
    if (!project || !confirm(`Удалить проект «${project.title}» из черновика?`)) return;
    attempt(() => {
      store.save({ ...current, projects: current.projects.filter(item => item.id !== editingId) });
      showList();
      $("#add-project").focus();
      setStatus("Проект удалён из черновика.");
    });
  });
  profileForm.addEventListener("submit", event => {
    event.preventDefault();
    attempt(() => {
      const profile = parseProfile(Object.fromEntries(new FormData(profileForm)));
      store.save({ ...store.working(), profile });
      formDirty = false;
      paintProfile();
      setStatus("Профиль сохранён в черновике.");
    });
  });

  $("#preview-draft").addEventListener("click", () => {
    store.preview(true);
    editor.close();
    $("#preview-bar").scrollIntoView({ block: "start" });
    $("[data-end-preview]").focus({ preventScroll: true });
  });
  $("#export-public").addEventListener("click", () => {
    const current = store.working();
    saveFile("portfolio.json", { ...current, projects: current.projects.filter(project => !project.hidden) });
    setStatus("Новый portfolio.json скачан.");
  });
  $("#export-backup").addEventListener("click", () => {
    saveFile("nottheadam-backup.json", store.working());
    setStatus("Резервная копия скачана.");
  });
  $("#import-button").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", async event => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > maxDocumentSize) throw new Error("Файл должен весить до 2 МБ.");
      const data = parsePortfolio(JSON.parse(await file.text()));
      if (!editor.open || activeTab !== "publish") return;
      if (!confirm("Заменить локальный черновик данными из этого файла?")) return;
      store.save(data);
      paintPublish();
      setStatus("JSON импортирован в черновик.");
    } catch (error) {
      setStatus(error instanceof SyntaxError ? "Файл содержит некорректный JSON." : error.message, true);
    }
  });
  $("#discard-draft").addEventListener("click", () => {
    if (!confirm("Удалить локальный черновик и вернуться к опубликованной версии?")) return;
    attempt(() => {
      store.discard();
      paintPublish();
      setStatus("Локальный черновик удалён.");
    });
  });
  return { open };
}
