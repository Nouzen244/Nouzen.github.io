/* ============================================================
   Свадебный сайт-приглашение — логика приложения
   1. Определяем гостя по URL-параметру ?guest=...
   2. Загружаем данные из guests.json (или из data.js, если fetch недоступен)
   3. Рисуем нужную страницу: персональная / список гостей / 404
   ============================================================ */

(function () {
    'use strict';

    // Корневой контейнер и фоновый слой
    const app = document.getElementById('app');
    const bgLayer = document.getElementById('bg-layer');

    /* ------------------------------------------------------------
       Загрузка данных гостей.
       Сначала пробуем fetch guests.json (работает на сервере/хостинге).
       Если не вышло (например, открыли index.html двойным кликом, file://),
       берём встроенную копию данных из data.js (window.GUESTS_DATA).
       ------------------------------------------------------------ */
    async function loadData() {
        try {
            const resp = await fetch('guests.json', { cache: 'no-store' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return await resp.json();
        } catch (err) {
            if (window.GUESTS_DATA) {
                console.warn('guests.json недоступен, используем встроенные данные из data.js', err);
                return window.GUESTS_DATA;
            }
            throw err;
        }
    }

    /* Получаем id гостя из строки запроса: ?guest=ivan -> "ivan" */
    function getGuestId() {
        return new URLSearchParams(window.location.search).get('guest');
    }

    /* Простейшее экранирование HTML — на случай спецсимволов в данных */
    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ------------------------------------------------------------
       Применяем персональную тему гостя:
       подставляем цвета и шрифт в CSS-переменные,
       вешаем фоновое изображение на #bg-layer.
       ------------------------------------------------------------ */
    function applyTheme(theme) {
        if (!theme) return;
        const root = document.documentElement;
        if (theme.primaryColor)    root.style.setProperty('--primary', theme.primaryColor);
        if (theme.backgroundColor) root.style.setProperty('--bg-color', theme.backgroundColor);
        if (theme.fontFamily)      root.style.setProperty('--font-accent', theme.fontFamily);
        if (theme.backgroundImage) {
            bgLayer.style.backgroundImage = 'url("' + theme.backgroundImage + '")';
        }
    }

    /* Лёгкий параллакс: фоновый слой движется медленнее контента.
       requestAnimationFrame — чтобы не дёргать стили на каждый пиксель скролла */
    function initParallax() {
        let ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                bgLayer.style.transform = 'translateY(' + window.scrollY * 0.25 + 'px)';
                ticking = false;
            });
        }, { passive: true });
    }

    /* Шапка с именами молодожёнов и датой — общая для всех страниц */
    function heroHTML(wedding) {
        return (
            '<header class="hero fade-in">' +
                '<div class="names">' + esc(wedding.groom) + ' &amp; ' + esc(wedding.bride) + '</div>' +
                '<div class="date">' + esc(wedding.dateText) + '</div>' +
            '</header>'
        );
    }

    /* Футер с хештегом и благодарностью — тоже общий */
    function footerHTML(wedding) {
        return (
            '<footer class="fade-in" style="--d:.5s">' +
                '<div class="hashtag">' + esc(wedding.hashtag) + '</div>' +
                '<div class="thanks">С любовью и нетерпением ждём встречи! ' +
                    esc(wedding.groom) + ' и ' + esc(wedding.bride) + '</div>' +
            '</footer>'
        );
    }

    /* ------------------------------------------------------------
       Персональная страница гостя (группы гостей)
       ------------------------------------------------------------ */
    function renderGuestPage(guest, wedding) {
        applyTheme(guest.theme);
        document.title = 'Приглашение — ' + guest.name;

        // Акцент в углу карточки: картинка, если задана, иначе эмодзи
        const accent = guest.theme && guest.theme.accentImage
            ? '<img src="' + esc(guest.theme.accentImage) + '" alt="">'
            : esc((guest.theme && guest.theme.accentEmoji) || '❤');

        app.innerHTML =
            '<div class="page">' +
                heroHTML(wedding) +
                '<section class="card fade-in" style="--d:.15s">' +
                    '<div class="accent">' + accent + '</div>' +

                    // Персональное приветствие: «Дорогой/Дорогая/Дорогие [Имена]!»
                    '<h1 class="salutation">' + esc(guest.salutation) + ' ' + esc(guest.name) + '!</h1>' +

                    // Личное сообщение от молодожёнов
                    '<p class="message">' + esc(guest.message) + '</p>' +

                    '<div class="divider">&#10087; &#10087; &#10087;</div>' +

                    // Фотография гостя (скрываем рамку, если картинка не загрузилась)
                    '<div class="photo-wrap fade-in" style="--d:.3s">' +
                        '<img class="photo" src="' + esc(guest.photo) + '" alt="Фото: ' + esc(guest.name) + '" ' +
                             'onerror="this.parentNode.style.display=\'none\'">' +
                    '</div>' +

                    '<div class="divider">&#10087; &#10087; &#10087;</div>' +

                    // Детали события
                    '<div class="details fade-in" style="--d:.4s">' +
                        '<div class="detail"><span class="icon">&#128338;</span>' +
                            '<span><b>Когда</b>' + esc(wedding.dateText) + ', сбор гостей в ' + esc(wedding.time) + '</span></div>' +
                        '<div class="detail"><span class="icon">&#128205;</span>' +
                            '<span><b>Где</b>' + esc(wedding.venue) + ', ' + esc(wedding.address) + '</span></div>' +
                    '</div>' +

                    // Кнопка подтверждения участия — открывает rsvpLink в новой вкладке
                    '<a class="btn fade-in" style="--d:.5s" href="' + esc(guest.rsvpLink || '#') + '" ' +
                       'target="_blank" rel="noopener">Подтвердить участие</a>' +
                '</section>' +
                footerHTML(wedding) +
            '</div>';
    }

    /* ------------------------------------------------------------
       Общая страница: список всех приглашённых со ссылками.
       Открывается, если зайти без параметра ?guest=
       (удобно молодожёнам — отсюда можно скопировать ссылку каждого).
       ------------------------------------------------------------ */
    function renderListPage(data) {
        document.title = 'Свадьба — список приглашённых';
        const links = data.guests.map(function (g, i) {
            return (
                '<a class="guest-link fade-in" style="--d:' + (0.05 * i).toFixed(2) + 's" ' +
                   'href="?guest=' + encodeURIComponent(g.id) + '">' +
                    '<span class="emoji">' + esc((g.theme && g.theme.accentEmoji) || '❤') + '</span>' +
                    '<span>' + esc(g.name) + '</span>' +
                '</a>'
            );
        }).join('');

        app.innerHTML =
            '<div class="page">' +
                heroHTML(data.wedding) +
                '<p class="list-intro fade-in" style="--d:.1s">Мы подготовили персональное приглашение для каждого из вас.<br>' +
                   'Выберите своё имя, чтобы открыть его:</p>' +
                '<div class="guest-grid">' + links + '</div>' +
                footerHTML(data.wedding) +
            '</div>';
    }

    /* ------------------------------------------------------------
       Красивая страница 404 — если гость с таким id не найден
       ------------------------------------------------------------ */
    function renderNotFound(wedding) {
        document.title = 'Приглашение не найдено';
        app.innerHTML =
            '<div class="page not-found fade-in">' +
                '<div class="big">Ой&hellip;</div>' +
                '<p>Мы не нашли приглашение по этой ссылке.<br>' +
                   'Возможно, в адресе опечатка — проверьте ссылку из сообщения.</p>' +
                '<a class="btn" href="?">Открыть общую страницу</a>' +
            '</div>';
    }

    /* Сообщение об ошибке загрузки данных */
    function renderError() {
        app.innerHTML =
            '<div class="page not-found">' +
                '<div class="big">Упс&hellip;</div>' +
                '<p>Не удалось загрузить данные приглашений.<br>' +
                   'Попробуйте обновить страницу.</p>' +
            '</div>';
    }

    /* ------------------------------------------------------------
       Точка входа
       ------------------------------------------------------------ */
    loadData()
        .then(function (data) {
            const id = getGuestId();
            if (!id) {
                renderListPage(data);          // без параметра — общий список
            } else {
                const guest = data.guests.find(function (g) { return g.id === id; });
                if (guest) {
                    renderGuestPage(guest, data.wedding); // персональная страница
                } else {
                    renderNotFound(data.wedding);         // гость не найден — 404
                }
            }
            initParallax();
        })
        .catch(function (err) {
            console.error('Ошибка загрузки данных гостей:', err);
            renderError();
        });
})();
