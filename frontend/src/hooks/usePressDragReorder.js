import { useEffect, useRef, useState } from 'react';

/**
 * Drag-to-reorder for a grid of tiles that works with a mouse AND a finger.
 *
 * - Mouse: press and move a few pixels to start dragging.
 * - Touch: press and hold (~250 ms) until the tile lifts, then drag it.
 *   A quick swipe still scrolls the page as normal.
 *
 * Usage:
 *   const { dragIdx, bind } = usePressDragReorder((from, to) => move(from, to));
 *   <div {...bind(idx)} data-reorder-idx={idx}> … </div>
 *
 * Each tile must carry `data-reorder-idx` so the tile under the finger can be found.
 */
export default function usePressDragReorder(onMove, { holdMs = 250, mouseSlop = 5, touchSlop = 10 } = {}) {
  const [dragIdx, setDragIdx] = useState(null);
  const session = useRef(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const end = () => {
    const s = session.current;
    if (!s) return;
    clearTimeout(s.timer);
    window.removeEventListener('pointermove', s.move);
    window.removeEventListener('pointerup', s.up);
    window.removeEventListener('pointercancel', s.up);
    window.removeEventListener('touchmove', s.block);
    session.current = null;
    setDragIdx(null);
  };

  useEffect(() => end, []); // clean up if the component unmounts mid-drag

  const onPointerDown = (idx) => (e) => {
    if (e.button > 0) return; // left mouse button / touch / pen only
    if (e.target.closest && e.target.closest('button')) return; // let delete / arrow buttons work
    end();
    const s = { idx, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', active: false };
    const activate = () => {
      s.active = true;
      setDragIdx(s.idx);
      if (s.touch && navigator.vibrate) navigator.vibrate(10);
    };
    s.move = (ev) => {
      const dist = Math.hypot(ev.clientX - s.x, ev.clientY - s.y);
      if (!s.active) {
        if (s.touch) {
          if (dist > touchSlop) end(); // finger moved before the hold finished: it's a scroll
          return;
        }
        if (dist < mouseSlop) return;
        activate();
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const tile = el && el.closest ? el.closest('[data-reorder-idx]') : null;
      if (!tile) return;
      const to = Number(tile.getAttribute('data-reorder-idx'));
      if (Number.isInteger(to) && to !== s.idx) {
        onMoveRef.current(s.idx, to);
        s.idx = to;
        setDragIdx(to);
      }
    };
    s.up = () => end();
    // While a tile is lifted, stop the page from scrolling under the finger.
    s.block = (ev) => {
      if (s.active && ev.cancelable) ev.preventDefault();
    };
    if (s.touch) s.timer = setTimeout(activate, holdMs);
    window.addEventListener('pointermove', s.move);
    window.addEventListener('pointerup', s.up);
    window.addEventListener('pointercancel', s.up);
    window.addEventListener('touchmove', s.block, { passive: false });
    session.current = s;
  };

  const bind = (idx) => ({
    onPointerDown: onPointerDown(idx),
    onContextMenu: (e) => e.preventDefault(), // no "save image" menu on long press
    style: { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' },
  });

  return { dragIdx, bind };
}
