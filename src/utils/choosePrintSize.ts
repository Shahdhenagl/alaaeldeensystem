// Lightweight, framework-free print-size chooser.
// Injects a small RTL overlay with two options (A4 / receipt) and resolves with
// the chosen size, or null if cancelled. Reusable from any page without wiring
// React state — used wherever a sale/purchase invoice can be printed.

export type PrintSize = 'a4' | 'thermal';

export function choosePrintSize(title = 'اختر مقاس الطباعة'): Promise<PrintSize | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }

    const overlay = document.createElement('div');
    overlay.dir = 'rtl';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(15,23,42,.55);backdrop-filter:blur(3px);font-family:Cairo,system-ui,sans-serif;';

    const card = document.createElement('div');
    card.style.cssText =
      'background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.3);padding:24px;width:min(92vw,420px);text-align:center;';

    card.innerHTML = `
      <div style="font-size:19px;font-weight:900;color:#0f172a;margin-bottom:4px;">${title}</div>
      <div style="font-size:13px;color:#64748b;font-weight:600;margin-bottom:18px;">اختر شكل الفاتورة التي تريد طباعتها</div>
      <div style="display:flex;gap:12px;">
        <button data-size="a4" style="flex:1;cursor:pointer;border:2px solid #6366f1;background:#eef2ff;color:#4338ca;border-radius:16px;padding:18px 8px;font-weight:900;font-size:15px;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <span style="font-size:26px;">📄</span> A4
          <span style="font-size:11px;font-weight:700;color:#6366f1;">ورق عادي</span>
        </button>
        <button data-size="thermal" style="flex:1;cursor:pointer;border:2px solid #e2e8f0;background:#f8fafc;color:#0f172a;border-radius:16px;padding:18px 8px;font-weight:900;font-size:15px;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <span style="font-size:26px;">🧾</span> حرارية
          <span style="font-size:11px;font-weight:700;color:#64748b;">ريسيت 72مم</span>
        </button>
      </div>
      <button data-size="cancel" style="margin-top:16px;width:100%;cursor:pointer;border:none;background:transparent;color:#94a3b8;font-weight:800;font-size:13px;padding:8px;">إلغاء</button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const cleanup = (val: PrintSize | null) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(val);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cleanup(null); };
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === overlay) { cleanup(null); return; }
      const btn = target.closest('[data-size]') as HTMLElement | null;
      if (!btn) return;
      const v = btn.getAttribute('data-size');
      cleanup(v === 'a4' ? 'a4' : v === 'thermal' ? 'thermal' : null);
    });
  });
}
