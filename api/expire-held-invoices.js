import { authorizeCron, getSupabase } from './_report-utils.js';

// Returns held (reserved) invoices that have been sitting for more than a week
// back to stock and deletes them. Runs daily via Vercel Cron (see vercel.json)
// so reservations are released even when no cashier has the app open. The same
// logic also runs client-side on app load (sweepExpiredHeldInvoices).
//
// This (multi-warehouse) build also restores the per-branch share
// (product_warehouse_stock) when the invoice was reserved from a non-default
// branch.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!authorizeCron(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    const { data: expired, error } = await supabase
      .from('held_invoices')
      .select('*')
      .lt('expires_at', nowIso);

    if (error) throw error;

    // Load warehouses to know which ids are non-default branches.
    let branchIds = new Set();
    try {
      const { data: whs } = await supabase.from('warehouses').select('id, is_default');
      branchIds = new Set((whs || []).filter((w) => !w.is_default).map((w) => w.id));
    } catch { /* warehouses table may not exist in this build */ }

    let restored = 0;
    for (const row of expired || []) {
      const { error: delErr } = await supabase.from('held_invoices').delete().eq('id', row.id);
      if (delErr) continue;
      const items = Array.isArray(row.items) ? row.items : [];
      for (const item of items) {
        if (!item?.id) continue;
        const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.id).single();
        const currentStock = Number(prod?.stock_quantity ?? 0);
        await supabase.from('products').update({ stock_quantity: currentStock + Number(item.quantity || 0) }).eq('id', item.id);
      }
      // Restore branch share when reserved from a non-default branch.
      if (row.warehouse_id && branchIds.has(row.warehouse_id)) {
        for (const item of items) {
          if (!item?.id) continue;
          const { data: bs } = await supabase
            .from('product_warehouse_stock')
            .select('quantity')
            .eq('product_id', item.id)
            .eq('warehouse_id', row.warehouse_id)
            .maybeSingle();
          const current = Number(bs?.quantity ?? 0);
          await supabase.from('product_warehouse_stock')
            .upsert({ product_id: item.id, warehouse_id: row.warehouse_id, quantity: current + Number(item.quantity || 0) }, { onConflict: 'product_id,warehouse_id' });
        }
      }
      restored += 1;
    }

    return res.status(200).json({ ok: true, restored });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
