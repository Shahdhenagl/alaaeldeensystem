import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { ClipboardCheck, Search, Save, FileDown } from 'lucide-react';
import { escapeHtml } from '../../utils/escapeHtml';
import { openPrintWindow } from '../../utils/printWindow';

export default function StockTake() {
  const { products, categories, warehouses, availableStock, storeSettings, adjustStock } = useStore();
  const cur = storeSettings.currency;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const hasWarehouses = warehouses.length > 0;
  // رصيد النظام لكل منتج: الإجمالي، أو كمية الفرع المختار.
  const systemQty = (p: any) => warehouseFilter === 'all'
    ? (Number(p.stock_quantity) || 0)
    : availableStock(p, warehouseFilter);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !p.is_hidden)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q))
      .filter((p) => categoryFilter === 'all' || p.category_id === categoryFilter)
      .filter((p) => warehouseFilter === 'all' || availableStock(p, warehouseFilter) > 0);
  }, [products, search, categoryFilter, warehouseFilter, availableStock]);

  const rows = list.map((p) => {
    const system = systemQty(p);
    const raw = counts[p.id];
    const counted = raw === undefined || raw === '' ? null : Number(raw);
    const diff = counted === null ? 0 : counted - system;
    const cost = Number(p.average_purchase_price ?? p.purchase_price) || 0;
    return { p, system, counted, diff, cost, diffValue: diff * cost };
  });

  const changed = rows.filter((r) => r.counted !== null && Math.abs(r.diff) > 0.0001);
  const totalShortageVal = changed.filter((r) => r.diff < 0).reduce((s, r) => s + Math.abs(r.diffValue), 0);
  const totalSurplusVal = changed.filter((r) => r.diff > 0).reduce((s, r) => s + r.diffValue, 0);

  // التسوية تعدّل إجمالي المخزون. عند اختيار فرع محدد يكون العرض/التصدير فقط
  // (تسوية كميات الفروع تتم من صفحة «المخازن» بالتحويل بينها).
  const canSettle = warehouseFilter === 'all';
  const selectedWhName = warehouseFilter === 'all' ? 'كل المخازن' : (warehouses.find(w => w.id === warehouseFilter)?.name || 'مخزن');
  const selectedCatName = categoryFilter === 'all' ? 'كل التصنيفات' : (categories.find(c => c.id === categoryFilter)?.name || '');

  const save = async () => {
    if (!canSettle) { alert('لتسوية كميات فرع محدد استخدم صفحة «المخازن». هنا التسوية على إجمالي المخزون (اختر «كل المخازن»).'); return; }
    if (changed.length === 0) { alert('لا توجد فروقات للتسوية. أدخل الكميات المجرودة المختلفة عن النظام.'); return; }
    if (!confirm(`تأكيد تسوية ${changed.length} صنف؟ سيتم تعديل المخزون للكميات المجرودة.`)) return;
    setSaving(true);
    const n = await adjustStock(changed.map((r) => ({ product_id: r.p.id, counted_qty: r.counted as number })), note.trim());
    setSaving(false);
    alert(`تمت تسوية ${n} صنف ✅`);
    setCounts({}); setNote('');
  };

  const exportPDF = () => {
    const date = new Date().toLocaleString('ar-EG', { calendar: 'gregory', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const theme = storeSettings.themeColor || '#4f46e5';
    const bodyRows = rows.map((r, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td class="r">${escapeHtml(r.p.name)}</td>
        <td class="c">${escapeHtml(r.p.barcode || '-')}</td>
        <td class="r">${escapeHtml(categories.find(c => c.id === r.p.category_id)?.name || '-')}</td>
        <td class="c">${r.system}</td>
        <td class="c">${r.counted === null ? '—' : r.counted}</td>
        <td class="c" style="font-weight:900;color:${r.counted === null || r.diff === 0 ? '#64748b' : r.diff < 0 ? '#dc2626' : '#059669'}">${r.counted === null ? '—' : (r.diff > 0 ? '+' : '') + r.diff}</td>
        <td class="l">${r.counted === null || r.diff === 0 ? '—' : `${r.diffValue.toFixed(2)} ${cur}`}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
<title>تقرير الجرد</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo',sans-serif;}
  body{color:#111;padding:12mm;}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${theme};padding-bottom:10px;margin-bottom:12px;}
  .store{font-size:24px;font-weight:900;}
  .sub{font-size:12px;color:#475569;font-weight:600;margin-top:2px;}
  .badge{background:${theme};color:#fff;padding:6px 16px;border-radius:10px;font-weight:900;font-size:15px;}
  .meta{font-size:12px;color:#334155;font-weight:700;margin-top:6px;text-align:left;line-height:1.7;}
  table{width:100%;border-collapse:collapse;margin-top:6px;}
  thead th{background:${theme};color:#fff;font-size:12px;font-weight:900;padding:8px 5px;}
  thead th.r{text-align:right;}thead th.l{text-align:left;}
  tbody td{font-size:12px;padding:6px 5px;border-bottom:1px solid #e2e8f0;font-weight:700;}
  td.c{text-align:center;}td.r{text-align:right;}td.l{text-align:left;}
  tbody tr:nth-child(even){background:#f8fafc;}
  .totals{display:flex;gap:16px;justify-content:flex-end;margin-top:14px;}
  .box{border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 16px;text-align:center;font-weight:900;}
  .red{color:#dc2626;border-color:#fca5a5;}.green{color:#059669;border-color:#6ee7b7;}
  @media print{@page{size:A4;margin:8mm;}body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
  <div class="head">
    <div>
      <div class="store">${escapeHtml(storeSettings.name)}</div>
      <div class="sub">تقرير الجرد والتسوية</div>
    </div>
    <div style="text-align:left">
      <div class="badge">جرد المخزون</div>
      <div class="meta">
        <div>التاريخ: <b>${date}</b></div>
        <div>التصنيف: <b>${escapeHtml(selectedCatName)}</b></div>
        ${hasWarehouses ? `<div>المخزن: <b>${escapeHtml(selectedWhName)}</b></div>` : ''}
      </div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th style="width:6%">#</th><th class="r">المنتج</th><th style="width:14%">الباركود</th>
      <th class="r" style="width:14%">التصنيف</th><th style="width:10%">رصيد النظام</th>
      <th style="width:10%">المجرود</th><th style="width:9%">الفرق</th><th class="l" style="width:13%">قيمة الفرق</th>
    </tr></thead>
    <tbody>${bodyRows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">لا توجد منتجات</td></tr>'}</tbody>
  </table>
  <div class="totals">
    <div class="box red">قيمة العجز: ${totalShortageVal.toFixed(2)} ${cur}</div>
    <div class="box green">قيمة الزيادة: ${totalSurplusVal.toFixed(2)} ${cur}</div>
  </div>
<script>window.onload=()=>{setTimeout(()=>{window.print();window.onafterprint=()=>window.close();},500);}<\/script>
</body></html>`;
    openPrintWindow(html);
  };

  return (
    <div className="p-6 md:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><ClipboardCheck className="text-indigo-600" size={30} /> الجرد والتسوية</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">أدخل الكمية الفعلية المجرودة لكل صنف، وراجع الفرق، ثم احفظ التسوية</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-2 text-center"><div className="text-[11px] font-bold text-red-600">قيمة العجز</div><div className="font-black text-red-700">{totalShortageVal.toFixed(2)} {cur}</div></div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-2 text-center"><div className="text-[11px] font-bold text-emerald-600">قيمة الزيادة</div><div className="font-black text-emerald-700">{totalSurplusVal.toFixed(2)} {cur}</div></div>
        </div>
      </div>

      {/* فلاتر: التصنيف + الفرع/المخزن */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 w-fit">
          <span className="text-xs font-bold text-slate-500 px-2">التصنيف:</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">كل التصنيفات</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {hasWarehouses && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 w-fit flex-wrap">
            <span className="text-xs font-bold text-slate-500 px-2">الفرع/المخزن:</span>
            <button onClick={() => setWarehouseFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${warehouseFilter === 'all' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>كل المخازن</button>
            {warehouses.map((w) => (
              <button key={w.id} onClick={() => setWarehouseFilter(w.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 ${warehouseFilter === w.id ? 'bg-purple-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {w.name}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${warehouseFilter === w.id ? 'bg-white/20 text-white' : w.is_default ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{w.is_default ? 'رئيسي' : 'فرعي'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المنتج أو الباركود..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة الجرد (اختياري)" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]" />
        <button onClick={exportPDF} className="bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2"><FileDown size={18} /> تصدير PDF</button>
        <button onClick={save} disabled={saving || !canSettle || changed.length === 0} title={!canSettle ? 'التسوية متاحة عند اختيار «كل المخازن»' : ''} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2"><Save size={18} /> {saving ? 'جاري...' : `حفظ التسوية (${changed.length})`}</button>
      </div>

      {!canSettle && (
        <p className="text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          أنت تعرض جرد فرع «{selectedWhName}» (عرض وتصدير فقط). لتسوية الكميات اختر «كل المخازن»، أو انقل الكميات بين الفروع من صفحة «المخازن».
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 sticky top-0">
              <tr>
                <th className="p-3">المنتج</th><th className="p-3">الباركود</th><th className="p-3">التصنيف</th>
                <th className="p-3 text-center">رصيد النظام{warehouseFilter !== 'all' ? ` (${selectedWhName})` : ''}</th><th className="p-3 text-center">المجرود فعلياً</th>
                <th className="p-3 text-center">الفرق</th><th className="p-3 text-center">قيمة الفرق</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-400 py-8">لا توجد منتجات</td></tr>
                : rows.map((r) => (
                  <tr key={r.p.id} className={`border-b border-slate-100 dark:border-slate-700/50 ${r.counted !== null && Math.abs(r.diff) > 0.0001 ? (r.diff < 0 ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-emerald-50/40 dark:bg-emerald-900/10') : ''}`}>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{r.p.name}</td>
                    <td className="p-3 font-mono text-xs text-slate-500">{r.p.barcode || '-'}</td>
                    <td className="p-3 text-xs text-slate-500">{categories.find(c => c.id === r.p.category_id)?.name || '-'}</td>
                    <td className="p-3 text-center font-bold">{r.system}</td>
                    <td className="p-3 text-center">
                      <input type="number" value={counts[r.p.id] ?? ''} onChange={(e) => setCounts((c) => ({ ...c, [r.p.id]: e.target.value }))} placeholder={String(r.system)} className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </td>
                    <td className={`p-3 text-center font-black ${r.counted === null ? 'text-slate-300' : r.diff === 0 ? 'text-slate-400' : r.diff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.counted === null ? '—' : (r.diff > 0 ? '+' : '') + r.diff}</td>
                    <td className={`p-3 text-center font-bold ${r.diffValue < 0 ? 'text-red-600' : r.diffValue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{r.counted === null || r.diff === 0 ? '—' : `${r.diffValue.toFixed(2)} ${cur}`}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[12px] text-slate-400">الأصناف اللي متكتبش ليها كمية بتفضل زي ما هي. الحفظ بيعدّل المخزون للكمية المجرودة ويسجّل الفرق في سجل التسويات.</p>
    </div>
  );
}
