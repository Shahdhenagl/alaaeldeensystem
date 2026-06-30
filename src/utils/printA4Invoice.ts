import { escapeHtml } from './escapeHtml';
import { printDocument } from './printWindow';

// ── A4 invoice/receipt design (shared by sale + purchase) ───────────────────
// A professional A4 layout used as the third print option alongside the thermal
// receipt. Callers build an A4InvoiceData object and call printA4Invoice().

export interface A4Line {
  index: number;
  name: string;
  qty: string;        // pre-formatted (supports units / fractional)
  price: number;
  total: number;
}

export interface A4SummaryRow {
  label: string;
  value: string;
  kind?: 'normal' | 'discount' | 'total' | 'danger' | 'success';
}

export interface A4InvoiceData {
  title: string;                 // "فاتورة بيع" / "فاتورة مشتريات" / "إيصال سداد"
  invoiceNo: string;
  date: string;
  store: {
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
    phone2?: string;
    currency: string;
    themeColor?: string;
  };
  party: {                       // العميل أو المورد
    role: string;                // "العميل" / "المورد"
    name?: string;
    phone?: string;
  };
  salesperson?: string;
  items: A4Line[];
  showItemsTable?: boolean;      // false للإيصالات بدون أصناف
  summary: A4SummaryRow[];       // صفوف الملخص (مجموع/خصم/إجمالي...)
  statusBanner?: { text: string; tone: 'paid' | 'debt' };
  payments?: { label: string; amount: number }[];
  notes?: string;
  qrUrl?: string;
  footer?: string;
}

function rowStyle(kind: A4SummaryRow['kind']): string {
  switch (kind) {
    case 'total': return 'font-size:20px;font-weight:900;border-top:2px solid #111;border-bottom:2px solid #111;padding:10px 4px;';
    case 'discount': return 'color:#dc2626;font-weight:800;';
    case 'danger': return 'color:#dc2626;font-weight:900;font-size:16px;';
    case 'success': return 'color:#059669;font-weight:900;font-size:16px;';
    default: return 'color:#334155;font-weight:700;';
  }
}

export function buildA4InvoiceHtml(d: A4InvoiceData): string {
  const theme = d.store.themeColor || '#4f46e5';
  const cur = d.store.currency || '';

  const itemsRows = d.items.map((it) => `
    <tr>
      <td class="c">${it.index}</td>
      <td class="r name">${escapeHtml(it.name)}</td>
      <td class="c">${escapeHtml(it.qty)}</td>
      <td class="c">${it.price.toFixed(2)}</td>
      <td class="l">${it.total.toFixed(2)}</td>
    </tr>`).join('');

  const summaryRows = d.summary.map((s) =>
    `<div class="srow" style="${rowStyle(s.kind)}"><span>${escapeHtml(s.label)}</span><span>${escapeHtml(s.value)}</span></div>`
  ).join('');

  const paymentsBlock = (d.payments && d.payments.filter(p => (p.amount || 0) > 0).length > 0)
    ? `<div class="pay-box">
         <div class="pay-title">طرق الدفع</div>
         ${d.payments.filter(p => (p.amount || 0) > 0).map(p =>
           `<div class="srow" style="font-size:13px;padding:3px 0;color:#334155;font-weight:700;"><span>${escapeHtml(p.label)}</span><span>${p.amount.toFixed(2)} ${cur}</span></div>`).join('')}
       </div>`
    : '';

  const statusBlock = d.statusBanner
    ? `<div class="status ${d.statusBanner.tone === 'paid' ? 'status-paid' : 'status-debt'}">${escapeHtml(d.statusBanner.text)}</div>`
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(d.title)} #${escapeHtml(d.invoiceNo)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo',sans-serif;}
  body{background:#fff;color:#111;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 14mm 12mm;display:flex;flex-direction:column;}

  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${theme};padding-bottom:12px;margin-bottom:14px;}
  .brand{display:flex;align-items:center;gap:12px;}
  .logo{max-height:70px;max-width:120px;object-fit:contain;}
  .store-name{font-size:26px;font-weight:900;color:#111;line-height:1.1;}
  .store-details{font-size:12px;color:#475569;margin-top:3px;line-height:1.5;font-weight:600;}
  .title-box{text-align:left;}
  .title-badge{display:inline-block;background:${theme};color:#fff;padding:6px 18px;border-radius:10px;font-weight:900;font-size:16px;}
  .title-meta{margin-top:8px;font-size:13px;color:#334155;font-weight:700;line-height:1.7;text-align:left;}
  .title-meta b{color:#111;}

  .party{display:flex;gap:24px;flex-wrap:wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:14px;}
  .party div{font-size:13px;color:#334155;font-weight:700;}
  .party b{color:#64748b;font-weight:700;margin-left:4px;}

  table{width:100%;border-collapse:collapse;margin-bottom:8px;}
  thead th{background:${theme};color:#fff;font-size:13px;font-weight:900;padding:10px 6px;}
  thead th.r{text-align:right;}
  thead th.l{text-align:left;}
  tbody td{font-size:13px;padding:9px 6px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e293b;}
  tbody tr:nth-child(even){background:#f8fafc;}
  td.c{text-align:center;}
  td.r{text-align:right;}
  td.l{text-align:left;font-weight:900;}
  td.name{font-weight:900;color:#0f172a;}

  .bottom{display:flex;justify-content:space-between;gap:24px;margin-top:10px;align-items:flex-start;}
  .left-col{flex:1;display:flex;flex-direction:column;gap:10px;}
  .summary{width:300px;}
  .srow{display:flex;justify-content:space-between;padding:5px 4px;font-size:14px;}

  .status{margin-top:6px;padding:10px;border-radius:8px;text-align:center;font-weight:900;font-size:15px;}
  .status-paid{background:#ecfdf5;color:#047857;border:1.5px solid #6ee7b7;}
  .status-debt{background:#fef2f2;color:#b91c1c;border:1.5px solid #fca5a5;}

  .pay-box{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#fff;}
  .pay-title{font-size:12px;font-weight:900;color:#64748b;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:4px;}
  .notes-box{border:1px dashed #cbd5e1;border-radius:10px;padding:10px 12px;font-size:13px;color:#334155;font-weight:600;}
  .notes-box b{color:#111;}

  .qr-box{display:flex;flex-direction:column;align-items:center;gap:4px;}
  .qr-box img{width:110px;height:110px;}
  .qr-box span{font-size:11px;font-weight:700;color:#64748b;}

  .foot{margin-top:auto;padding-top:14px;border-top:1px dashed #cbd5e1;text-align:center;font-size:12px;color:#64748b;font-weight:700;}

  @media print{
    @page{size:A4;margin:0;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{width:auto;min-height:auto;}
  }
</style>
</head>
<body>
<div class="page">
  <div class="top">
    <div class="brand">
      ${d.store.logo ? `<img class="logo" src="${escapeHtml(d.store.logo)}" onerror="this.style.display='none'"/>` : ''}
      <div>
        <div class="store-name">${escapeHtml(d.store.name)}</div>
        <div class="store-details">
          ${d.store.address ? `${escapeHtml(d.store.address)}<br/>` : ''}
          ${d.store.phone ? `${escapeHtml(d.store.phone)}` : ''}${d.store.phone2 ? ` | ${escapeHtml(d.store.phone2)}` : ''}
        </div>
      </div>
    </div>
    <div class="title-box">
      <div class="title-badge">${escapeHtml(d.title)}</div>
      <div class="title-meta">
        <div>رقم المستند: <b>#${escapeHtml(d.invoiceNo)}</b></div>
        <div>التاريخ: <b>${escapeHtml(d.date)}</b></div>
      </div>
    </div>
  </div>

  <div class="party">
    <div><b>${escapeHtml(d.party.role)}:</b> ${escapeHtml(d.party.name || 'غير محدد')}</div>
    ${d.party.phone ? `<div><b>الهاتف:</b> <span dir="ltr">${escapeHtml(d.party.phone)}</span></div>` : ''}
    ${d.salesperson ? `<div><b>مسؤول المبيعات:</b> ${escapeHtml(d.salesperson)}</div>` : ''}
  </div>

  ${d.showItemsTable !== false ? `
  <table>
    <thead><tr>
      <th style="width:7%">#</th>
      <th class="r">البيان</th>
      <th style="width:13%">الكمية</th>
      <th style="width:16%">السعر</th>
      <th class="l" style="width:18%">الإجمالي</th>
    </tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>` : ''}

  <div class="bottom">
    <div class="left-col">
      ${statusBlock}
      ${paymentsBlock}
      ${d.notes ? `<div class="notes-box"><b>ملاحظات:</b> ${escapeHtml(d.notes)}</div>` : ''}
      ${d.qrUrl ? `<div class="qr-box"><img src="${escapeHtml(d.qrUrl)}" alt="QR"/><span>امسح الكود لعرض الفاتورة</span></div>` : ''}
    </div>
    <div class="summary">
      ${summaryRows}
    </div>
  </div>

  <div class="foot">${escapeHtml(d.footer || `شكراً لتعاملكم مع ${d.store.name}`)}</div>
</div>
<script>window.onload=()=>{setTimeout(()=>{window.print();window.onafterprint=()=>window.close();},500);}<\/script>
</body></html>`;
}

/** Build + print an A4 invoice via the dedicated A4 printer kind (QZ) or browser. */
export function printA4Invoice(d: A4InvoiceData): void {
  void printDocument('invoiceA4', buildA4InvoiceHtml(d));
}
