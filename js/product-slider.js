export function getItemsPerView(width) {
  return width >= 992 ? 4 : width >= 768 ? 2 : 1;
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
  return slideCount > itemsPerView && !pageHidden && !reduceMotion;
}
export function initProductSlider(slider, options = {}) {
  const track = slider?.querySelector('.product-slider-track');

  if (!track?.children.length) return null;

  slider._productSlider?.destroy();

  const count = track.children.length;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();

  const listen = (target, type, handler) =>
    target.addEventListener(type, handler, {
      signal: events.signal
    });

  const delay = Math.max(
    100,
    Number(options.interval || slider.dataset.interval) || 2500
  );

  let timer = null;
  let animation = null;
  let hovered = false;
  let touching = false;
  let touchStart = null;
  let suppressClick = false;
  let userPaused = false;

  slider.insertAdjacentHTML('beforeend', `
    <div class="product-slider-controls">
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        data-product-prev
        aria-label="Produits précédents"
      >&#8592;</button>

      <div class="space"><button
        type="button"
        class="btn btn-outline-primary btn-sm hidden"
        data-product-toggle
        aria-pressed="false"
        style="display: none;"
      >Pause</button></div>

      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        data-product-next
        aria-label="Produits suivants"
      >&#8594;</button>
    </div>
  `);

  const controls = slider.querySelector('.product-slider-controls');
  const toggle = controls.querySelector('[data-product-toggle]');

  const canMove = () =>
    count > getItemsPerView(window.innerWidth);

  const reduceMotion = () =>
    options.reduceMotion ?? motion.matches;

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function sync() {
    stop();

    controls.hidden = !canMove();

    
    const paused = userPaused || reduceMotion();

    toggle.textContent = paused ? 'Lecture' : 'Pause';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute(
      'aria-label',
      paused
        ? 'Reprendre les produits'
        : 'Mettre les produits en pause'
    );

    const autoplayAllowed = shouldRunProductAutoplay({
      slideCount: count,
      itemsPerView: getItemsPerView(window.innerWidth),
      pageHidden: document.hidden,
      reduceMotion: reduceMotion()
    });

    if (
      autoplayAllowed &&
      !paused &&
      !hovered &&
      !touching &&
      !slider.contains(document.activeElement)
    ) {
      timer = setInterval(() => move(1), delay);
    }
  }

  function finish() {
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
      animation = null;
    }

    sync();
  }

  function move(direction) {
    if (!canMove() || animation) return;

    stop();

    const step = track.firstElementChild.getBoundingClientRect().width;

    let from = 0;
    let to = -step;

    if (direction < 0) {
      track.prepend(track.lastElementChild);
      from = -step;
      to = 0;
    }

    const complete = () => {
      if (direction > 0) {
        moveFirstSlideToEnd(track);
      }

      finish();
    };

    if (reduceMotion() || !track.animate) {
      complete();
      return;
    }

    animation = track.animate(
      [
        { transform: `translateX(${from}px)` },
        { transform: `translateX(${to}px)` }
      ],
      {
        duration: 400,
        easing: 'ease-in-out'
      }
    );

    animation.onfinish = complete;
  }

  listen(
    controls.querySelector('[data-product-prev]'),
    'click',
    () => move(-1)
  );

  listen(
    controls.querySelector('[data-product-next]'),
    'click',
    () => move(1)
  );

  listen(toggle, 'click', () => {
    userPaused = !(userPaused || reduceMotion());

    if (reduceMotion()) {
      options.reduceMotion = false;
    }

    sync();
  });

  listen(slider, 'mouseenter', () => {
    hovered = true;
    sync();
  });

  listen(slider, 'mouseleave', () => {
    hovered = false;
    sync();
  });

  listen(slider, 'focusin', stop);
  listen(slider, 'focusout', () => queueMicrotask(sync));

  // السحب بالإصبع على الهاتف
  listen(track, 'pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;

    touchStart = {
      x: event.clientX,
      y: event.clientY
    };

    touching = true;
    stop();
  });

  listen(window, 'pointerup', (event) => {
    if (!touchStart) return;

    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;

    touchStart = null;
    touching = false;

    if (
      Math.abs(dx) > 40 &&
      Math.abs(dx) > Math.abs(dy) &&
      canMove()
    ) {
      suppressClick = true;

      setTimeout(() => {
        suppressClick = false;
      }, 400);

      move(dx < 0 ? 1 : -1);
    } else {
      sync();
    }
  });

  // ما يفتحش رابط المنتج بعد السحب
  track.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, {
    capture: true,
    signal: events.signal
  });

  listen(window, 'pointercancel', () => {
    touchStart = null;
    touching = false;
    sync();
  });

  listen(window, 'resize', finish);
  listen(document, 'visibilitychange', sync);
  listen(motion, 'change', finish);

  const api = {
    next: () => move(1),
    prev: () => move(-1),

    destroy() {
      stop();
      events.abort();

      if (animation) {
        animation.onfinish = null;
        animation.cancel();
      }

      controls.remove();

      Array.from(track.children).forEach((slide) => {
        slide.inert = false;
      });

      delete slider._productSlider;
    }
  };

  slider._productSlider = api;

  sync();

  return api;
}