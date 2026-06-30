-- ============================================================
-- نظام المخازن المتعددة (Multi-Warehouse)
-- العميل: علاء الدين (دواجن) — مستودع + محل/فروع
-- شغّل هذا الملف مرة واحدة في:
-- Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================
--
-- نموذج البيانات:
--   * products.stock_quantity يظل هو "الإجمالي" (مجموع كل المخازن).
--   * جدول product_warehouse_stock يخزّن كمية المخازن "غير الرئيسية" (الفروع/المحلات) فقط.
--   * المخزن الرئيسي (is_default = true) = stock_quantity - مجموع كميات الفروع.
--   هذا يحافظ على توافق كل الشاشات القديمة دون أي تعديل عليها.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) جدول المخازن
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz default now()
);

-- 2) كمية كل منتج داخل كل مخزن (للفروع غير الرئيسية)
create table if not exists product_warehouse_stock (
  product_id uuid not null references products(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  quantity numeric not null default 0,
  primary key (product_id, warehouse_id)
);
create index if not exists idx_pws_warehouse on product_warehouse_stock(warehouse_id);
create index if not exists idx_pws_product on product_warehouse_stock(product_id);

-- 3) سجل تحويلات المخزون بين المخازن
create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_name text,
  from_warehouse_id uuid references warehouses(id) on delete set null,
  to_warehouse_id uuid references warehouses(id) on delete set null,
  from_warehouse_name text,
  to_warehouse_name text,
  quantity numeric not null default 0,
  note text,
  created_at timestamptz default now()
);

-- 4) ربط الفاتورة بالمخزن الذي تم البيع منه (null = الكل / الإجمالي)
alter table orders add column if not exists warehouse_id uuid references warehouses(id) on delete set null;

-- 5) إنشاء المخزن الرئيسي الافتراضي إن لم يوجد أي مخزن
insert into warehouses (name, is_default)
select 'المخزن الرئيسي', true
where not exists (select 1 from warehouses);

-- 6) سياسات الأمان (RLS): متاحة للمستخدمين المسجّلين فقط — مثل باقي الجداول
alter table warehouses              enable row level security;
alter table product_warehouse_stock enable row level security;
alter table stock_transfers         enable row level security;

drop policy if exists "authenticated full access" on warehouses;
create policy "authenticated full access" on warehouses for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on product_warehouse_stock;
create policy "authenticated full access" on product_warehouse_stock for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on stock_transfers;
create policy "authenticated full access" on stock_transfers for all to authenticated using (true) with check (true);

-- ============================================================
-- ملاحظة: لا حاجة لترحيل (backfill) لأن كل الكميات الحالية
-- موجودة في products.stock_quantity وتُحسب تلقائيًا للمخزن الرئيسي.
-- ============================================================
