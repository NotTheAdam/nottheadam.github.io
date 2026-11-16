# NotTheAdam

Личное портфолио Ильи на HTML, CSS и JavaScript. В корне уже лежат все файлы для GitHub Pages. Сборка и установка пакетов не нужны.

## Запуск на компьютере

В терминале из каталога сайта выполни:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Открой [сайт](http://127.0.0.1:4173/) или [редактор](http://127.0.0.1:4173/?edit=1). Для остановки сервера нажми `Ctrl+C`.

## Правки через браузер

1. Нажми **Редактор** в подвале. Можно сразу открыть сайт с `?edit=1`.
2. В **Проектах** добавь работу, заполни категорию, краткое описание и подробности. При желании укажи год, технологии, ссылки на код и демо. Обложку можно выбрать из встроенных вариантов, загрузить с компьютера или указать ссылкой.
3. Стрелки рядом с проектами меняют их порядок в каталоге. Для незаконченной карточки отметь **Скрыть проект при публикации**.
4. В **Профиле** можно поменять роль, вступление, биографию, стек и контакты. В контактном блоке отображаются заполненные GitHub, Telegram, Kwork и почта.
5. Нажми **Сохранить** в форме. Затем открой **Публикация → Смотреть черновик**. Поиск, фильтры и карточки в предпросмотре работают с сохранёнными правками.

Черновик хранится в браузере по адресу сайта. У локального предпросмотра и GitHub Pages будут отдельные черновики. Чтобы перенести правки на другой компьютер, скачай резервную копию и загрузи её через **Импорт JSON**.

## Первая публикация

1. Создай репозиторий на GitHub. Название `nottheadam.github.io` даст адрес `https://nottheadam.github.io/`. Для обычного репозитория, например `portfolio`, адрес будет `https://nottheadam.github.io/portfolio/`.
2. Загрузи содержимое этой папки в корень ветки `main`. Проверь, что рядом с `index.html` лежат `.nojekyll`, `portfolio.json`, папка `assets` и файлы CSS и JavaScript.
3. В настройках репозитория открой **Settings → Pages**. В **Source** выбери **Deploy from a branch**, укажи **main** и **/(root)**, затем нажми **Save**.
4. Когда деплой завершится, ссылка появится в разделе **Pages**. [Документация GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Как обновить опубликованный сайт

В редакторе выбери **Публикация → Скачать portfolio.json**. Замени этим файлом `portfolio.json` в репозитории и сделай коммит в ветку, с которой публикуется сайт. Если обложка указана путём вида `./assets/cover.webp`, добавь этот файл в репозиторий вместе с JSON. Обложки, загруженные с компьютера через редактор, уже входят в JSON.

В файл для публикации попадают видимые работы. Для хранения скрытых проектов скачай **резервную копию**. Гитхаб принимает изменения в репозитории под твоей учётной записью. Редактор сохраняет локальные правки и экспортирует файл.

## Файлы и источники

- `portfolio.json` содержит профиль, список проектов и их порядок. Его также можно менять вручную. Существующий `id` лучше сохранять, чтобы ссылка вида `#project/prism` продолжила работать.
- `index.html` содержит структуру страницы, название и метаданные. `style.css` задаёт внешний вид. `app.js` отвечает за публичный каталог, `editor.js` — за редактор, `model.js` — за формат данных.
- В каталоге представлены Revaly (Retryly), Project Prism, Shroud, FLOW (VERRA), BybitEye и CarteBlancheAI. Обложки иллюстрируют работу проектов.
- Шрифты Geist и IBM Plex Mono хранятся в `assets/` вместе с текстами лицензий OFL. В той же папке находится иллюстрация `after-hours.webp`, созданная встроенным ImageGen и сжатая для сайта.

<details>
<summary>Промпт для иллюстрации</summary>

> Use case: stylized-concept. Create a single hero image for an underground Moscow programmer's editorial portfolio, a realistic photographed grunge photocopy and screenprint collage. Tall portrait aspect 4:5. A single ordinary person in black heavyweight hoodie, hood up, seen from behind at 3/4, sitting at a vintage CRT computer desk, leaning a little forward, private nighttime basement. Anonymous face hidden, no weapons. Visually bold coarse acid chartreuse / black two-ink halftone printing, huge near-black shadows with rich visible dot texture. Saturated acid chartreuse solid outer background #c6ff38 with distressed but largely flat paper corners. Subject begins just below upper quarter and is concentrated at center and lower right; top left is less busy. CRT screen to the left of person with a few thin horizontal bars. Distinct silhouette, controlled graphic shapes, photoreal base, punk zine independent designer cover, elegant minimal graphic execution. Extend background edge to edge. No text, no letters, no numbers, no white, no logos, no overlay graphics, no borders, no red or purple.

</details>
