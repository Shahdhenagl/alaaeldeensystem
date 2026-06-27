/**
 * Prints the given HTML reliably on desktop AND mobile.
 *
 * Mobile browsers block window.open popups, which made printing silently fail.
 * So we always render into a hidden iframe and trigger printing ourselves
 * exactly once (any inline `window.print()` in the HTML is neutralized to avoid
 * a double print dialog).
 */
export function openPrintWindow(html: string, _features?: string): Window | null {
  // Neutralize the HTML's own auto-print so we control it from here.
  const cleaned = html.replace(/window\.print\(\)/g, 'void 0');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) { iframe.remove(); return null; }

  doc.open();
  doc.write(cleaned);
  doc.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try { win.focus(); win.print(); } catch { /* ignore */ }
  };

  // Trigger after load, with a timed backup in case onload already fired.
  win.onload = () => setTimeout(triggerPrint, 300);
  setTimeout(triggerPrint, 1200);
  setTimeout(() => iframe.remove(), 60000);

  return win;
}
