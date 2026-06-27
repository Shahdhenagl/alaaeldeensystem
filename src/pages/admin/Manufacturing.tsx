import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Scissors, Plus, Trash2, Package, Factory } from 'lucide-react';

export default function Manufacturing() {
  const {
    materials, productionOrders, storeSettings,
    loadManufacturing, addMaterial, deleteMaterial, addProductionOrder,
  } = useStore();
  const cur = storeSettings.currency;

  useEffect(() => { loadManufacturing(); }, []);

  // ── Material form ──────────────────────────────────────────
  const [mName, setMName] = useState('');
  const [mUnit, setMUnit] = useState('متر');
  const [mCost, setMCost] = useState('');
  const [mStock, setMStock] = useState('');

  const submitMaterial = async () => {
    if (!mName.trim()) { alert('اسم الخامة مطلوب'); return; }
    await addMaterial({ name: mName.trim(), unit: mUnit || 'متر', cost_per_unit: Number(mCost) || 0, stock_quantity: Number(mStock) || 0 });
    setMName(''); setMCost(''); setMStock('');
  };

  // ── Production form ────────────────────────────────────────
  const [pName, setPName] = useState('');
  const [pColor, setPColor] = useState('');
  const [pCode, setPCode] = useState('');
  const [pQty, setPQty] = useState('');
  const [pSale, setPSale] = useState('');
  const [pExtra, setPExtra] = useState('');
  const [pNotes, setPNotes] = useState('');
  const [rows, setRows] = useState<{ material_id: string; quantity: string }[]>([{ material_id: '', quantity: '' }]);
  const [saving, setSaving] = useState(false);

  const materialsCost = rows.reduce((s, r) => {
    const mat = materials.find((m) => m.id === r.material_id);
    return s + (mat ? mat.cost_per_unit * (Number(r.quantity) || 0) : 0);
  }, 0);
  const qtyNum = Number(pQty) || 0;
  const totalCost = materialsCost + (Number(pExtra) || 0);
  const perPiece = qtyNum > 0 ? totalCost / qtyNum : 0;
  const profitPerPiece = (Number(pSale) || 0) - perPiece;

  const submitProduction = async () => {
    if (!pName.trim()) { alert('اسم المنتج مطلوب'); return; }
    if (qtyNum <= 0) { alert('عدد القطع المنتجة مطلوب'); return; }
    setSaving(true);
    const ok = await addProductionOrder({
      product_name: pName.trim(),
      color: pColor.trim(),
      code: pCode.trim(),
      quantity: qtyNum,
      sale_price: Number(pSale) || 0,
      extra_costs: Number(pExtra) || 0,
      notes: pNotes.trim(),
      materials: rows
        .filter((r) => r.material_id && Number(r.quantity) > 0)
        .map((r) => ({ material_id: r.material_id, quantity: Number(r.quantity) })),
    });
    setSaving(false);
    if (ok) {
      alert('تم حفظ أمر التصنيع وإضافة المنتج للمخزون ✅');
      setPName(''); setPColor(''); setPCode(''); setPQty(''); setPSale(''); setPExtra(''); setPNotes('');
      setRows([{ material_id: '', quantity: '' }]);
    }
  };

  const inputCls = 'w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none';

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <Scissors className="text-indigo-600" size={32} />
          التصنيع
        </h1>
        <p className="text-slate-500 mt-2 font-medium">إدارة الخامات وتصنيع المنتجات وحساب تكلفة القطعة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Materials ──────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Package size={20} className="text-amber-600" /> الخامات
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className={inputCls} placeholder="اسم الخامة" value={mName} onChange={(e) => setMName(e.target.value)} />
            <input className={inputCls} placeholder="الوحدة (متر/كيلو..)" value={mUnit} onChange={(e) => setMUnit(e.target.value)} />
            <input className={inputCls} type="number" placeholder={`سعر الوحدة (${cur})`} value={mCost} onChange={(e) => setMCost(e.target.value)} />
            <input className={inputCls} type="number" placeholder="الكمية المتاحة" value={mStock} onChange={(e) => setMStock(e.target.value)} />
          </div>
          <button onClick={submitMaterial} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition mb-4">
            <Plus size={18} /> إضافة خامة
          </button>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {materials.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">لا توجد خامات بعد</p>
            ) : materials.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{m.name}</p>
                  <p className="text-[11px] text-slate-500">{m.cost_per_unit} {cur}/{m.unit} · متاح: {m.stock_quantity} {m.unit}</p>
                </div>
                <button onClick={() => { if (confirm('حذف الخامة؟')) deleteMaterial(m.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Production ─────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Factory size={20} className="text-indigo-600" /> أمر تصنيع جديد
          </h2>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className={inputCls} placeholder="اسم المنتج" value={pName} onChange={(e) => setPName(e.target.value)} />
            <input className={inputCls} placeholder="اللون" value={pColor} onChange={(e) => setPColor(e.target.value)} />
            <input className={inputCls} placeholder="الكود / الباركود" value={pCode} onChange={(e) => setPCode(e.target.value)} />
            <input className={inputCls} type="number" placeholder="عدد القطع المنتجة" value={pQty} onChange={(e) => setPQty(e.target.value)} />
          </div>

          <p className="text-xs font-bold text-slate-500 mb-1">الخامات المستخدمة</p>
          <div className="space-y-2 mb-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className={inputCls + ' flex-1'}
                  value={r.material_id}
                  onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, material_id: e.target.value } : x)))}
                >
                  <option value="">اختر خامة</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.cost_per_unit} {cur}/{m.unit})</option>)}
                </select>
                <input
                  className={inputCls + ' w-24'}
                  type="number"
                  placeholder="الكمية"
                  value={r.quantity}
                  onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                />
                <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="text-red-500 px-2"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setRows((rs) => [...rs, { material_id: '', quantity: '' }])} className="text-indigo-600 text-xs font-bold mb-3">+ إضافة خامة للأمر</button>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className={inputCls} type="number" placeholder={`تكاليف إضافية (مصنعية..)`} value={pExtra} onChange={(e) => setPExtra(e.target.value)} />
            <input className={inputCls} type="number" placeholder={`سعر البيع للقطعة (${cur})`} value={pSale} onChange={(e) => setPSale(e.target.value)} />
          </div>
          <input className={inputCls + ' mb-3'} placeholder="ملاحظات (اختياري)" value={pNotes} onChange={(e) => setPNotes(e.target.value)} />

          {/* Live cost summary */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-center">
            <div className="bg-slate-100 dark:bg-slate-900/40 rounded-lg p-2">
              <div className="text-[10px] font-bold text-slate-500">تكلفة الخامات</div>
              <div className="font-black text-slate-800 dark:text-slate-100">{materialsCost.toFixed(2)}</div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-900/40 rounded-lg p-2">
              <div className="text-[10px] font-bold text-slate-500">إجمالي التكلفة</div>
              <div className="font-black text-slate-800 dark:text-slate-100">{totalCost.toFixed(2)}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400">تكلفة القطعة</div>
              <div className="font-black text-amber-700 dark:text-amber-400">{perPiece.toFixed(2)} {cur}</div>
            </div>
            <div className={`rounded-lg p-2 border ${profitPerPiece >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 border-red-200'}`}>
              <div className={`text-[10px] font-bold ${profitPerPiece >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>ربح القطعة</div>
              <div className={`font-black ${profitPerPiece >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>{profitPerPiece.toFixed(2)} {cur}</div>
            </div>
          </div>

          <button onClick={submitProduction} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition">
            <Factory size={18} /> {saving ? 'جاري الحفظ...' : 'تصنيع وإضافة للمخزون'}
          </button>
        </div>
      </div>

      {/* ── Production history ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4">سجل أوامر التصنيع</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="p-2">المنتج</th>
                <th className="p-2">اللون</th>
                <th className="p-2">الكود</th>
                <th className="p-2">العدد</th>
                <th className="p-2">إجمالي التكلفة</th>
                <th className="p-2">تكلفة القطعة</th>
                <th className="p-2">سعر البيع</th>
              </tr>
            </thead>
            <tbody>
              {productionOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-400 py-6">لا توجد أوامر تصنيع بعد</td></tr>
              ) : productionOrders.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="p-2 font-bold text-slate-800 dark:text-slate-100">{p.product_name}</td>
                  <td className="p-2">{p.color || '-'}</td>
                  <td className="p-2 font-mono text-xs">{p.code || '-'}</td>
                  <td className="p-2">{p.quantity}</td>
                  <td className="p-2">{Number(p.total_cost).toFixed(2)} {cur}</td>
                  <td className="p-2 font-bold text-amber-700">{Number(p.cost_per_piece).toFixed(2)} {cur}</td>
                  <td className="p-2 font-bold text-emerald-700">{Number(p.sale_price).toFixed(2)} {cur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
