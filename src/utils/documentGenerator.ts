import { supabase } from '../lib/supabase';

export async function generateNextDocumentNumber(
  resortId: string,
  documentType: 'invoice' | 'receipt' | 'folio' | 'registration_form' | 'cancellation_record' | 'refund_receipt',
  documentDate: string = new Date().toISOString().slice(0, 10)
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_next_document_number', {
      p_resort_id: resortId,
      p_document_type: documentType,
      p_document_date: documentDate,
    });

    if (error) throw error;
    return data || '';
  } catch (error) {
    console.error('Error generating document number:', error);
    throw error;
  }
}

export async function createDocumentRecord(
  resortId: string,
  documentType: 'invoice' | 'receipt' | 'folio' | 'registration_form' | 'cancellation_record' | 'refund_receipt',
  documentData: {
    booking_id?: string;
    payment_id?: string;
    guest_name: string;
    amount?: number;
    metadata?: any;
  }
): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const documentDate = new Date().toISOString().slice(0, 10);
    const documentNumber = await generateNextDocumentNumber(resortId, documentType, documentDate);

    const { data, error } = await supabase
      .from('documents')
      .insert({
        resort_id: resortId,
        booking_id: documentData.booking_id || null,
        payment_id: documentData.payment_id || null,
        document_type: documentType,
        document_number: documentNumber,
        document_date: documentDate,
        guest_name: documentData.guest_name,
        amount: documentData.amount || null,
        metadata: documentData.metadata || {},
        generated_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return documentNumber;
  } catch (error) {
    console.error('Error creating document record:', error);
    throw error;
  }
}

export function formatDocumentNumber(documentNumber: string): string {
  return documentNumber;
}

export function getDocumentTypeLabel(documentType: string): string {
  const labels: Record<string, string> = {
    invoice: 'Invoice',
    receipt: 'Receipt',
    folio: 'Guest Folio',
    registration_form: 'Registration Form',
    cancellation_record: 'Cancellation Record',
    refund_receipt: 'Refund Receipt',
  };
  return labels[documentType] || documentType;
}
