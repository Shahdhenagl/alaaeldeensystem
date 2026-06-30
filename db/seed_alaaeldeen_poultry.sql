-- ============================================================
-- علاء الدين للدواجن — بيانات تجريبية (12 منتج موزّعين على المخازن)
-- يضبط اسم ولوجو المحل + تصنيفات + مخازن + 12 منتج دواجن مع توزيع الكميات.
--
-- ⚠️ شغّله بعد:
--    db/SETUP_ALL_FRESH.sql   (أو على الأقل add_warehouses_schema.sql)
-- في: Supabase > SQL Editor > New query > Run
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================

-- ─── 1) اسم ولوجو المحل + اللون ──────────────────────────────
update store_settings set
  name        = 'علاء الدين للدواجن',
  logo        = 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
  theme_color = '#ea580c',
  currency    = 'ج.م';

-- ─── 2) التصنيفات (تُضاف فقط إن لم تكن موجودة) ────────────────
insert into categories (name)
select v.name from (values ('دواجن طازجة'), ('مجمدات'), ('مشويات ومصنّعات'), ('بيض')) as v(name)
where not exists (select 1 from categories c where c.name = v.name);

-- ─── 3) المخازن: الرئيسي (موجود) + المحل + الثلاجة ────────────
insert into warehouses (name, is_default)
select 'المخزن الرئيسي', true
where not exists (select 1 from warehouses);

insert into warehouses (name, is_default)
select 'المحل', false
where not exists (select 1 from warehouses where name = 'المحل');

insert into warehouses (name, is_default)
select 'الثلاجة', false
where not exists (select 1 from warehouses where name = 'الثلاجة');

-- ─── 4) المنتجات (12 منتج) ───────────────────────────────────
-- barcode فريد → on conflict do nothing لإعادة التشغيل بأمان.
insert into products (name, barcode, unit, purchase_price, average_purchase_price, sale_price, stock_quantity, category_id)
select d.name, d.barcode, d.unit, d.purchase, d.purchase, d.sale, d.total,
       (select id from categories c where c.name = d.cat limit 1)
from (values
  ('صدور دجاج',            '700001', 'كيلو',   120, 160, 100, 'دواجن طازجة'),
  ('أوراك دجاج',           '700002', 'كيلو',    90, 120,  80, 'دواجن طازجة'),
  ('أجنحة دجاج',           '700003', 'كيلو',    70,  95,  60, 'دواجن طازجة'),
  ('فرخة بلدي',            '700004', 'قطعة',   130, 175,  50, 'دواجن طازجة'),
  ('دجاج كامل مجمد',       '700005', 'قطعة',   110, 150,  60, 'مجمدات'),
  ('شيش طاووق متبل',       '700006', 'كيلو',   140, 190,  40, 'مشويات ومصنّعات'),
  ('بانيه دجاج',           '700007', 'كيلو',   150, 200,  35, 'مشويات ومصنّعات'),
  ('كبد وقوانص',           '700008', 'كيلو',    80, 110,  45, 'دواجن طازجة'),
  ('سجق دجاج',             '700009', 'كيلو',    95, 130,  50, 'مشويات ومصنّعات'),
  ('ديك رومي',             '700010', 'كيلو',   160, 210,  30, 'دواجن طازجة'),
  ('بيض أحمر (كرتونة 30)', '700011', 'كرتونة', 130, 155,  40, 'بيض'),
  ('بيض بلدي',             '700012', 'قطعة',     4,   6, 600, 'بيض')
) as d(name, barcode, unit, purchase, sale, total, cat)
on conflict (barcode) do nothing;

-- ─── 5) توزيع الكميات على الفروع (المحل + الثلاجة) ────────────
-- المخزن الرئيسي = الإجمالي - (المحل + الثلاجة) ويُحسب تلقائياً في التطبيق.
-- on conflict do update → يضبط التوزيع حتى لو أعدت التشغيل.

-- المحل
insert into product_warehouse_stock (product_id, warehouse_id, quantity)
select (select id from products  p where p.barcode = d.barcode limit 1),
       (select id from warehouses w where w.name = 'المحل' limit 1),
       d.qty
from (values
  ('700001', 30), ('700002', 20), ('700003', 15), ('700004', 12),
  ('700005', 15), ('700006', 10), ('700007', 10), ('700008', 12),
  ('700009', 15), ('700010',  8), ('700011', 12), ('700012', 200)
) as d(barcode, qty)
where exists (select 1 from products p where p.barcode = d.barcode)
on conflict (product_id, warehouse_id) do update set quantity = excluded.quantity;

-- الثلاجة
insert into product_warehouse_stock (product_id, warehouse_id, quantity)
select (select id from products  p where p.barcode = d.barcode limit 1),
       (select id from warehouses w where w.name = 'الثلاجة' limit 1),
       d.qty
from (values
  ('700001', 25), ('700002', 20), ('700003', 15), ('700004', 10),
  ('700005', 20), ('700006',  8), ('700007', 10), ('700008',  8),
  ('700009', 10), ('700010',  7), ('700011',  8), ('700012', 100)
) as d(barcode, qty)
where exists (select 1 from products p where p.barcode = d.barcode)
on conflict (product_id, warehouse_id) do update set quantity = excluded.quantity;

-- ============================================================
-- تم. النتيجة المتوقعة لكل منتج: الرئيسي = الإجمالي - (المحل + الثلاجة).
-- مثال «صدور دجاج»: إجمالي 100 = رئيسي 45 + محل 30 + ثلاجة 25.
-- جرّب فلتر المخزن في شاشة الكاشير لرؤية الكمية المتاحة لكل مخزن.
-- ============================================================
