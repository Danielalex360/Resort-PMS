import { attachFiles } from './fileHelpers.js';

export async function linkPaymentReceipts({ supabase, payment_id, urls }) {
  return attachFiles({
    supabase,
    table: 'payments',
    id: payment_id,
    urlsField: 'receipt_urls',
    urls,
  });
}

export async function linkExpenseBills({ supabase, expense_id, urls }) {
  return attachFiles({
    supabase,
    table: 'expenses',
    id: expense_id,
    urlsField: 'bill_urls',
    urls,
  });
}

export async function linkGuestDocuments({ supabase, guest_id, urls }) {
  return attachFiles({
    supabase,
    table: 'guests',
    id: guest_id,
    urlsField: 'id_doc_urls',
    urls,
  });
}
