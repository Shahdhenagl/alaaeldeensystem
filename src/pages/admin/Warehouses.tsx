import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2, X, ArrowLeftRight, Search, History } from 'lucide-react';
import { normalizeArabic } from '../../utils/textUtils';
import { getUnitConfig, formatQty } from '../../utils/units';
import type { StockTransfer } from '../../store/useStore';

export default function Warehouses() {
  const {
    warehouses, products, storeSettings,
    addWarehouse, updateWarehouse, deleteWarehouse,
    transferStock, availableStock, stockTransfers,
  } = useStore();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [search, setSearch] = useState('');

  // نموذج التحويل
  const [showTransfer, setShowTransfer] = useState(false);
  const [tProductId, setTProductId] = useState('');
  const [tFrom, setTFrom] = useState('');
  const [tTo, setTTo] = useState('');
  const [tQty, setTQty] = useState(0);
  const [tNote, setTNote] = useState('');
  const [busy, setBusy] = useState(false);

  // تحميل سجل التحويلات الأخير
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('stock_transfers').select('*').order('created_at', { ascending: false }).limit(100);
      if (data) useStore.setState({ stockTransfers: data as StockTransfer[] });
    })();
  }, []);

  const visibleProducts = useMemo(() => {
    const terms = normalizeArabic(search).split(' ').filter(Boolean);
    return products.filter(p => !p.is_hidden).filter(p => {
      if (terms.length === 0) return true;
      const n = normalizeArabic(p.name);
      return terms.every(t => n.includes(t)) || (p.barcode && p.barcode.includes(search));
    });
  }, [products, search]);

  const tProduct = products.find(p => p.id === tProductId);
  const maxTransfer = tProduct && tFrom ? availableStock(tProduct, tFrom) : 0;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addWarehouse(newName.trim());
    setNewName('');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    await updateWarehouse(editingId, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`حذف المخزن "${name}"؟ سيتم حذف توزيع الكميات الخاص به (الكميات تبقى ضمن الإجمالي).`)) return;
    await deleteWarehouse(id);
  };

  const openTransfer = () => {
    setTProductId('');
    setTFrom(warehouses.find(w => w.is_default)?.id || warehouses[0]?.id || '');
    setTTo('');
    setTQty(0);
    setTNote('');
    setShowTransfer(true);
  };

  const handleTransfer = async () => {
    if (!tProductId || !tFrom || !tTo || tFrom === tTo || tQty <= 0) {
      alert('أكمل بيانات التحويل: المنتج، من مخزن، إلى مخزن مختلف، وكمية صحيحة.');
      return;
    }
    if (tQty > maxTransfer) { alert('الكمية أكبر من المتاح في المخزن المصدر.'); return; }
    setBusy(true);
    const ok = await transferStock(tProductId, tFrom, tTo, tQty, tNote.trim() || undefined);
    setBusy(false);
    if (ok) setShowTransfer(false);
  };

  return (
    <div className="p-8" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <WarehouseIcon size={28} className="text-indigo-600" />
          المخازن والتحويلات
        </h1>
        <button onClick={openTransfer} style={{ backgroundColor: storeSettings.themeColor }}
          className="text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
          <ArrowLeftRight size={20} /> تحويل بين المخازن
        </button>
      </div>

      {/* قائمة المخازن */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-8">
        <h2 className="text-lg font-black text-slate-800 mb-4">المخازن ({warehouses.length})</h2>
        <div className="flex gap-2 mb-5">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="اسم مخزن جديد (مثال: محل التجزئة، فرع المنصورة)..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={handleAdd} style={{ backgroundColor: storeSettings.themeColor }}
            className="text-white px-6 rounded-xl font-bold flex items-center gap-2"><Plus size={18} /> إضافة</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {warehouses.map(w => (
            <div key={w.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <WarehouseIcon size={18} className={w.is_default ? 'text-indigo-600' : 'text-slate-400'} />
              {editingId === w.id ? (
                <>
                  <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                    className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-sm" autoFocus />
                  <button onClick={handleSaveEdit} className="text-emerald-600 font-bold text-sm">حفظ</button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-bold text-slate-700">{w.name}
                    {w.is_default && <span className="text-[10px] text-indigo-400 mr-1">(رئيسي)</span>}</span>
                  <button onClick={() => { setEditingId(w.id); setEditName(w.name); }} className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg"><Edit2 size={15} /></button>
                  {!w.is_default && (
                    <button onClick={() => handleDelete(w.id, w.name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* جدول كميات المنتجات في كل مخزن */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-black text-slate-800">كميات المنتجات حسب المخزن</h2>
          <div className="relative w-72">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن منتج..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-white border-b border-slate-100 text-slate-400 font-medium">
              <tr>
                <th className="p-4">المنتج</th>
                {warehouses.map(w => (
                  <th key={w.id} className="p-4 text-center whitespace-nowrap">{w.name}</th>
                ))}
                <th className="p-4 text-center bg-slate-50">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {visibleProducts.slice(0, 300).map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold">{p.name}</td>
                  {warehouses.map(w => (
                    <td key={w.id} className="p-4 text-center">{formatQty(availableStock(p, w.id), p.unit)}</td>
                  ))}
                  <td className="p-4 text-center font-black text-indigo-700 bg-slate-50/50">
                    {formatQty(Number(p.stock_quantity) || 0, p.unit)} <span className="text-[10px] text-slate-400 font-normal">{getUnitConfig(p.unit).label}</span>
                  </td>
                </tr>
              ))}
              {visibleProducts.length === 0 && (
                <tr><td colSpan={warehouses.length + 2} className="p-8 text-center text-slate-400">لا توجد منتجات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* سجل التحويلات */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><History size={20} className="text-slate-500" /> آخر التحويلات</h2>
        </div>
        {stockTransfers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">لا توجد تحويلات بعد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-400 font-medium">
                <tr>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">المنتج</th>
                  <th className="p-4">من</th>
                  <th className="p-4">إلى</th>
                  <th className="p-4 text-center">الكمية</th>
                  <th className="p-4">ملاحظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stockTransfers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-500 whitespace-nowrap">{t.created_at ? new Date(t.created_at).toLocaleString('ar-EG') : ''}</td>
                    <td className="p-4 font-bold">{t.product_name}</td>
                    <td className="p-4">{t.from_warehouse_name}</td>
                    <td className="p-4">{t.to_warehouse_name}</td>
                    <td className="p-4 text-center font-bold">{t.quantity}</td>
                    <td className="p-4 text-slate-500">{t.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال التحويل */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ArrowLeftRight size={22} className="text-indigo-600" /> تحويل كمية بين المخازن</h2>
              <button onClick={() => setShowTransfer(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm border border-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">المنتج</label>
                <select value={tProductId} onChange={e => { setTProductId(e.target.value); setTQty(0); }}
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold">
                  <option value="">— اختر منتج —</option>
                  {products.filter(p => !p.is_hidden).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">من مخزن</label>
                  <select value={tFrom} onChange={e => { setTFrom(e.target.value); setTQty(0); }}
                    className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold">
                    <option value="">— اختر —</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">إلى مخزن</label>
                  <select value={tTo} onChange={e => setTTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold">
                    <option value="">— اختر —</option>
                    {warehouses.filter(w => w.id !== tFrom).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  الكمية {tProduct && tFrom && <span className="text-xs text-slate-400">(المتاح: {formatQty(maxTransfer, tProduct.unit)})</span>}
                </label>
                <input type="number" min="0" max={maxTransfer} step="0.001" value={tQty}
                  onChange={e => setTQty(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظة (اختياري)</label>
                <input value={tNote} onChange={e => setTNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={handleTransfer} disabled={busy} style={{ backgroundColor: storeSettings.themeColor }}
                className="w-full text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <ArrowLeftRight size={20} /> {busy ? '...جاري التحويل' : 'تنفيذ التحويل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
