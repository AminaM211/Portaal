import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0,0); }

    // Reset any scrollable containers (overflow:auto/scroll) to top
    try {
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        try {
          const style = getComputedStyle(el);
          const overflowY = style.overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && el.scrollTop) {
            el.scrollTop = 0;
          }
          // also handle elements that are scrollable via client/scrollHeight but have visible overflow
          if (el.scrollHeight > el.clientHeight && (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')) {
            el.scrollTop = 0;
          }
        } catch (e) {}
      }
    } catch (e) {}
  }, [pathname]);

  return null;
}
