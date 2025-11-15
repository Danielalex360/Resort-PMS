import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, DollarSign } from 'lucide-react';
import { createDocumentRecord } from '../utils/documentGenerator';

interface PaymentRecordModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  resortId: string;
  balanceDue: number;
  onPaymentRecorded: () => void;
}

export function PaymentRecordModal({
  open,
  onClose,
  bookingId,
  resortId,
  balanceDue,
  onPaymentRecorded,
}: PaymentRecordModalProps) {
  const [formData, setFormData] = useState({
    amount: balanceDue,
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    notes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null;

    setUploading(true);
    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${bookingId}_${Date.now()}.${fileExt}`;
      const filePath = `${resortId}/receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resort-files')
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resort-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Failed to upload receipt');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let receiptUrl = null;
      if (receiptFile) {
        receiptUrl = await uploadReceipt();
        if (!receiptUrl && receiptFile) {
          setSaving(false);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          resort_id: resortId,
          booking_id: bookingId,
          amount: formData.amount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          reference_number: formData.reference_number || null,
          receipt_url: receiptUrl,
          notes: formData.notes || null,
          recorded_by: user?.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      const { data: booking } = await supabase
        .from('bookings')
        .select('paid_total, price_total, guest_name')
        .eq('id', bookingId)
        .single();

      if (booking) {
        const newPaidTotal = (booking.paid_total || 0) + formData.amount;
        const newBalanceDue = booking.price_total - newPaidTotal;

        let newPaymentStatus = 'partial';
        if (newBalanceDue <= 0) {
          newPaymentStatus = 'paid';
        } else if (newPaidTotal === 0) {
          newPaymentStatus = 'unpaid';
        }

        await supabase
          .from('bookings')
          .update({
            paid_total: newPaidTotal,
            balance_due: newBalanceDue,
            payment_status: newPaymentStatus,
          })
          .eq('id', bookingId);

        if (paymentData) {
          await createDocumentRecord(resortId, 'receipt', {
            booking_id: bookingId,
            payment_id: paymentData.id,
            guest_name: booking.guest_name,
            amount: formData.amount,
            metadata: {
              payment_method: formData.payment_method,
              reference_number: formData.reference_number,
              payment_date: formData.payment_date,
            },
          });
        }
      }

      onPaymentRecorded();
      onClose();

      setFormData({
        amount: balanceDue,
        payment_method: 'cash',
        payment_date: new Date().toISOString().slice(0, 10),
        reference_number: '',
        notes: '',
      });
      setReceiptFile(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={24} />
            <h2 className="text-xl font-semibold">Record Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">Balance due: RM {balanceDue.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Method *
            </label>
            <select
              required
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="qr_duitnow">QR / DuitNow</option>
              <option value="card">Card</option>
              <option value="online_fpx">Online FPX</option>
              <option value="ota_virtual_card">OTA Virtual Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Transaction ID, cheque number, etc."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Upload Receipt (Optional)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <Upload size={18} className="text-slate-400" />
                <span className="text-sm text-slate-600">
                  {receiptFile ? receiptFile.name : 'Choose file...'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {receiptFile && (
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || uploading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
