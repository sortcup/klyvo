export function getItemsPerView(viewportWidth) {
  if (viewportWidth >= 992) {
    return 4;
  }

  if (viewportWidth >= 768) {
    return 2;
  }

  return 1;
}

export function moveFirstSlideToEnd(track) {
  if (track?.firstElementChild) {
    track.append(track.firstElementChild);
  }
}

export function shouldRunProductAutoplay({
  slideCount,
  itemsPerView,
  pageHidden,
  reduceMotion
}) {
  return slideCount > itemsPerView && !pageHidden;
}

export function initProductSlider(
  slider,
  options = {}
) {
  if (!slider) {
    return null;
  }

  const track = slider.querySelector(
    '.product-slider-track'
  );

  if (!track) {
    return null;
  }

  const originalSlides = Array.from(
    track.children
  );

  if (!originalSlides.length) {
    return null;
  }

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  const interval =
    Number(options.interval || slider.dataset.interval) ||
    3500;

  let autoplayTimer = null;
  let resizeTimer = null;
  let isAnimating = false;

  function currentItemsPerView() {
    return getItemsPerView(window.innerWidth);
  }

  function canAutoplay() {
    return shouldRunProductAutoplay({
      slideCount: originalSlides.length,
      itemsPerView: currentItemsPerView(),
      pageHidden: document.hidden,
      reduceMotion: reducedMotion.matches
    });
  }

  function stopAutoplay() {
    if (autoplayTimer !== null) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function advance() {
    if (!canAutoplay() || isAnimating) {
      return;
    }

    isAnimating = true;

    const movement =
      100 / currentItemsPerView();

    track.classList.add('is-animating');

    track.style.transform =
      `translate3d(-${movement}%, 0, 0)`;
  }

  function finishAdvance(event) {
    if (
      event.target !== track ||
      event.propertyName !== 'transform' ||
      !isAnimating
    ) {
      return;
    }

    track.classList.remove('is-animating');

    moveFirstSlideToEnd(track);

    track.style.transform =
      'translate3d(0, 0, 0)';

    isAnimating = false;
  }

  function startAutoplay() {
    stopAutoplay();

    if (!canAutoplay()) {
      return;
    }

    autoplayTimer = window.setInterval(
      advance,
      interval
    );
  }

  function resetSlider() {
    stopAutoplay();

    isAnimating = false;

    track.classList.remove('is-animating');

    originalSlides.forEach((slide) => {
      track.append(slide);
    });

    track.style.transform =
      'translate3d(0, 0, 0)';

    startAutoplay();
  }

  function handleResize() {
    window.clearTimeout(resizeTimer);

    resizeTimer = window.setTimeout(
      resetSlider,
      150
    );
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }

  track.addEventListener(
    'transitionend',
    finishAdvance
  );

  slider.addEventListener(
    'mouseenter',
    stopAutoplay
  );

  slider.addEventListener(
    'mouseleave',
    startAutoplay
  );

  slider.addEventListener(
    'pointerdown',
    stopAutoplay,
    { passive: true }
  );

  slider.addEventListener(
    'pointerup',
    startAutoplay,
    { passive: true }
  );

  slider.addEventListener(
    'pointercancel',
    startAutoplay,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    handleResize,
    { passive: true }
  );

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange
  );

  reducedMotion.addEventListener(
    'change',
    resetSlider
  );

  startAutoplay();
}