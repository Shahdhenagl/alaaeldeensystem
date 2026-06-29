-- ADRIA — الطباعة المباشرة عبر QZ Tray. شغّله مرة واحدة.
-- يخزّن تفعيل الطباعة المباشرة واسم طابعة الفواتير وطابعة الباركود.
alter table store_settings add column if not exists qz_enabled boolean default false;
alter table store_settings add column if not exists qz_invoice_printer text default '';
alter table store_settings add column if not exists qz_barcode_printer text default '';
