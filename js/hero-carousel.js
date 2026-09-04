function updateToggle(button, paused) {
  button.setAttribute('aria-pressed', String(paused));
  button.setAttribute('aria-label', paused ? 'Reprendre les publicités' : 'Mettre les publicités en pause');
  button.innerHTML = paused
    ? '<i class="bi bi-play-fill" aria-hidden="true"></i><span>Lecture</span>'
    : '<i class="bi bi-pause-fill" aria-hidden="true"></i><span>Pause</span>';
}

export function initializeHeroCarousel(root, options = {}) {
  const carousel = root?.querySelector?.('#hero-carousel');
  if (!carousel || carousel.querySelectorAll('.carousel-item').length < 2) return null;
  const bootstrapApi = options.bootstrapApi || globalThis.bootstrap;
  if (!bootstrapApi?.Carousel) return null;
  const reduceMotion = options.reduceMotion ?? Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const instance = bootstrapApi.Carousel.getOrCreateInstance(carousel, {
    interval: 4000,
    pause: false,
    ride: false,
    touch: true,
    wrap: true,
  });
  const button = carousel.querySelector('[data-carousel-toggle]');
  let userPaused = reduceMotion;
  let hoverPaused = false;
  let playbackPaused = null;
  const syncPlayback = () => {
    const shouldPause = userPaused || hoverPaused;
    if (shouldPause === playbackPaused) return;
    playbackPaused = shouldPause;
    if (shouldPause) instance.pause();
    else instance.cycle();
  };
  updateToggle(button, userPaused);
  syncPlayback();
  carousel.addEventListener('mouseenter', () => { hoverPaused = true; syncPlayback(); });
  carousel.addEventListener('mouseleave', () => { hoverPaused = false; syncPlayback(); });
  button.addEventListener('click', () => {
    userPaused = !userPaused;
    updateToggle(button, userPaused);
    syncPlayback();
  });
  return instance;
}
