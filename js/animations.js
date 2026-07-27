export function applyButtonPress(button) {
  button.addEventListener('pointerdown', () => {
    button.style.transform = 'scale(0.96)';
  });
  button.addEventListener('pointerup', () => {
    button.style.transform = '';
  });
  button.addEventListener('pointerleave', () => {
    button.style.transform = '';
  });
}

export function animateCard(card) {
  card.classList.add('page-animate');
  setTimeout(() => {
    card.classList.remove('page-animate');
  }, 700);
}
