import { pages } from './pages.js';
import { applyButtonPress } from './animations.js';
import { submitAnswers } from './api.js';

const pageList = document.getElementById('pageList');
const progressFill = document.getElementById('progressFill');
const progressCounter = document.getElementById('progressCounter');
const pageView = document.getElementById('pageView');
const swipeHint = document.getElementById('swipeHint');

let currentIndex = 0;
const pageCount = pages.length;

let startX = 0;
let isDragging = false;

function renderActionSection(page) {
  // Multiple-choice question UI
  if (page.questionType === 'mc' && Array.isArray(page.options)) {
    const qid = page.questionId || `q-${Math.random().toString(16).slice(2,8)}`;
    return `
      <div class="page-actions">
        <div class="mc-options" data-qid="${qid}">
          ${page.options
            .map((o) => `
              <button class="choice-button date-option" data-qid="${qid}" data-value="${o.value}">${o.label}</button>
            `)
            .join('')}
        </div>
        <p class="recorder-status" id="status-${qid}" aria-live="polite"></p>
      </div>
    `;
  }

  if (page.placeholder) {
    return `
      <div class="page-actions">
        <button class="button-secondary" disabled>
          Заглушка
        </button>
      </div>
    `;
  }

  if (page.options) {
    return `
      <div class="page-actions date-grid">
        ${page.options
          .map(
            (o) => `
            <button class="date-option">
              <strong>${o.label}</strong>
              <span>${o.detail}</span>
            </button>
          `,
          )
          .join('')}
      </div>
    `;
  }

  if (page.button || page.cta) {
    // include data-action attribute if page.action is provided
    const actionAttr = page.action ? ` data-action="${page.action}"` : '';
    return `
      <div class="page-actions">
        <button class="button-primary"${actionAttr}>
          ${page.button || page.cta}
        </button>
      </div>
    `;
  }

  return '';
}

function renderPages() {
  pageList.innerHTML = pages
    .map(
      (page, index) => `
      <section class="page">
        <article class="page-card">

          <div class="page-meta">
            <span class="page-number">
              Этап ${index + 1} / ${pageCount}
            </span>

            <span class="emoji">
              ${page.emoji}
            </span>
          </div>

<div class="gif-frame">
            ${(() => {
              if (page.photo) {
                return `<img class="media-image photo" src="${page.photo}" alt="" loading="lazy" />`;
              } else if (page.gif) {
                return `<img class="media-image gif" src="${page.gif}" alt="" loading="lazy" />`;
              }
              return `<span class="gif-icon">${page.emoji || '✨'}</span>`;
            })()}
          </div>

          <div>
            <h1 class="page-heading">${page.title}</h1>
            <p class="page-text">${page.subtitle}</p>
          </div>

          <p class="page-text">
            ${page.text}
          </p>

          ${renderActionSection(page)}

          <p class="page-legend">
            ${page.hint || ''}
          </p>

        </article>
      </section>
    `,
    )
    .join('');

  applyButtons();
}

function updateUI() {
  // Toggle helper class for CSS-based adaptive rules
  const appShell = document.querySelector('.app-shell');
  if (appShell) appShell.classList.toggle('first-page', currentIndex === 0);

  pageList.style.transform = `translateX(-${currentIndex * 100}%)`;

  progressCounter.textContent = `${currentIndex + 1} / ${pageCount}`;

  progressFill.style.width =
    `${((currentIndex + 1) / pageCount) * 100}%`;

  // hide swipe hint when at the end
  if (swipeHint) {
    swipeHint.classList.toggle('hide', currentIndex === pageCount - 1);
  }
}

function nextPage() {
  if (currentIndex >= pageCount - 1) return;

  currentIndex++;

  updateUI();
}

function prevPage() {
  if (currentIndex <= 0) return;

  currentIndex--;

  updateUI();
}


document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextPage();
  if (e.key === 'ArrowLeft') prevPage();
});

pageView.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
  isDragging = true;
});

pageView.addEventListener('touchend', (e) => {
  if (!isDragging) return;

  const delta = e.changedTouches[0].clientX - startX;

  if (delta < -60) {
    nextPage();
  }

  if (delta > 60) {
    prevPage();
  }

  isDragging = false;
});

// load persisted answers from localStorage (if any)
const STORAGE_KEY = 'yana_answers_v1';
const answers = (function () {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch (e) {
    console.warn('Failed to read stored answers', e);
    return {};
  }
})();

function persistAnswers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch (e) {
    console.warn('Failed to persist answers', e);
  }
}

function applyButtons() {
  // apply press animation to interactive controls
  document
    .querySelectorAll(
      '.nav-button,.button-primary,.button-secondary,.date-option,.choice-button',
    )
    .forEach(applyButtonPress);

  // mark already selected choices from answers
  document.querySelectorAll('.choice-button').forEach((btn) => {
    const qid = btn.dataset.qid;
    const val = btn.dataset.value;
    if (qid && answers[qid] && answers[qid] === val) {
      btn.classList.add('selected');
      const status = document.getElementById(`status-${qid}`);
      if (status) status.textContent = 'Выбрано';
    }
  });

  // choice buttons handling
  document.querySelectorAll('.choice-button').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const qid = btn.dataset.qid;
      const val = btn.dataset.value;
      if (!qid) return;
      // save
      answers[qid] = val;
      persistAnswers();
      // update UI
      document.querySelectorAll(`.choice-button[data-qid="${qid}"]`).forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      const status = document.getElementById(`status-${qid}`);
      if (status) status.textContent = 'Выбрано';
      console.log('Answer saved:', qid, val, answers);
    });
  });

  // primary button actions (submit)
  document.querySelectorAll('.button-primary').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const action = btn.dataset.action;
      if (action === 'submit') {
        try {
          btn.disabled = true;
          const originalText = btn.textContent;
          btn.textContent = 'Отправляю...';
          const payload = {
            answers,
            meta: {
              sentAt: new Date().toISOString(),
              userAgent: navigator.userAgent,
            },
          };
          const result = await submitAnswers(payload);
          if (result && result.ok) {
            btn.textContent = 'Отправлено';
            // clear local answers if desired
            // localStorage.removeItem(STORAGE_KEY);
            // show confirmation in page legend
            const legend = document.querySelector('.page-legend');
            if (legend) legend.textContent = 'Спасибо! Твой ответ сохранён.';
          } else {
            btn.textContent = originalText;
            btn.disabled = false;
            alert('Ошибка при отправке: ' + (result && result.error ? result.error : 'unknown'));
          }
        } catch (err) {
          console.error(err);
          btn.disabled = false;
          alert('Ошибка при отправке: ' + String(err));
        }
      }
    });
  });
}

renderPages();
updateUI();
