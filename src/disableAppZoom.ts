/**
 * iOS Safari ignores user-scalable=no in regular Safari.
 * Block pinch, double-tap and gesture zoom so the page feels like an app.
 */
export function disableAppZoom() {
  const block = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener("gesturestart", block, { passive: false });
  document.addEventListener("gesturechange", block, { passive: false });
  document.addEventListener("gestureend", block, { passive: false });

  document.addEventListener(
    "touchmove",
    (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 350) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );
}
