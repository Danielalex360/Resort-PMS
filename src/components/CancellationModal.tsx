import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, AlertTriangle, Upload } from 'lucide-react';

interface CancellationModalProps {
  open: boolean;
  onClose: () => void;
  booking: any;
  resortId: string;
  onCancelled: () => void;
}

export function CancellationModal({
  open,
  onClose,
  booking,
  resortId,
  onCancelled,
}: CancellationModalProps) {
  const [formData, setFormData] = useState({
    cancellation_reason: 'guest_request',
    cancellation_notes: '',
    refund_amount: 0,
    refund_method: 'bank_transfer',
    refund_reference: '',
  });
  const [refundProofFile, setRefundProofFile] = useState<File | null>(null);
  const [calculatedRefund, setCalculatedRefund] = useState(0);
  const [cancellationPolicy, setCancellationPolicy] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && booking) {
      loadCancellationPolicy();
      calculateRefund();
    }
  }, [open, booking]);

  const loadCancellationPolicy = async () => {
    const { data } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_default', true)
      .single();

    setCancellationPolicy(data);
  };

  const calculateRefund = () => {
    if (!booking) return;

    const checkInDate = new Date(booking.check_in);
    const today = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const amountPaid = booking.paid_total || 0;
    let refundPercentage = 0;

    if (cancellationPolicy?.is_non_refundable) {
      refundPercentage = 0;
    } else if (daysUntilCheckIn >= 7) {
      refundPercentage = 100;
    } else if (daysUntilCheckIn >= 3) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    const calculatedAmount = (amountPaid * refundPercentage) / 100;
    setCalculatedRefund(calculatedAmount);
    setFormData(prev => ({ ...prev, refund_amount: calculatedAmount }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRefundProofFile(e.target.files[0]);
    }
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!refundProofFile) return null;

    setUploading(true);
    try {
      const fileExt = refundProofFile.name.split('.').pop();
      const fileName = `${booking.id}_refund_${Date.now()}.${fileExt}`;
      const filePath = `${resortId}/refunds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resort-files')
        .upload(filePath, refundProofFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resort-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Failed to upload refund proof');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let refundProofUrl = null;
      if (refundProofFile) {
        refundProofUrl = await uploadProof();
        if (!refundProofUrl && refundProofFile) {
          setSaving(false);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('cancellation_logs').insert({
        resort_id: resortId,
        booking_id: booking.id,
        cancellation_reason: formData.cancellation_reason,
        cancellation_notes: formData.cancellation_notes || null,
        refund_amount: formData.refund_amount,
        refund_method: formData.refund_amount > 0 ? formData.refund_method : null,
        refund_reference: formData.refund_reference || null,
        refund_proof_url: refundProofUrl,
        cancelled_by: user?.id,
        original_total: booking.price_total,
        amount_paid: booking.paid_total || 0,
      });

      const updateData: any = {
        status: formData.refund_amount > 0 ? 'refunded' : 'cancelled',
        cancellation_reason: formData.cancellation_reason,
        cancellation_notes: formData.cancellation_notes || null,
        cancelled_by: user?.id,
        cancelled_at: new Date().toISOString(),
      };

      await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      onCancelled();
      onClose();

      setFormData({
        cancellation_reason: 'guest_request',
        cancellation_notes: '',
        refund_amount: 0,
        refund_method: 'bank_transfer',
        refund_reference: '',
      });
      setRefundProofFile(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !booking) return null;

  const checkInDate = new Date(booking.check_in);
  const today = new Date();
  const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={24} />
            <h2 className="text-xl font-semibold">Cancel Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2">Booking Details</h3>
            <div className="text-sm text-amber-800 space-y-1">
              <p><strong>Guest:</strong> {booking.guest_name}</p>
              <p><strong>Check-in:</strong> {new Date(booking.check_in).toLocaleDateString()} ({daysUntilCheckIn} days from now)</p>
              <p><strong>Total Amount:</strong> RM {booking.price_total?.toFixed(2)}</p>
              <p><strong>Amount Paid:</strong> RM {(booking.paid_total || 0).toFixed(2)}</p>
              <p><strong>Balance Due:</strong> RM {(booking.balance_due || 0).toFixed(2)}</p>
            </div>
          </div>

          {cancellationPolicy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Cancellation Policy</h3>
              <p className="text-sm text-blue-800">{cancellationPolicy.description}</p>
              <div className="mt-3 text-sm font-medium text-blue-900">
                Calculated Refund: RM {calculatedRefund.toFixed(2)}
                {daysUntilCheckIn >= 7 && ' (100% - Free cancellation)'}
                {daysUntilCheckIn >= 3 && daysUntilCheckIn < 7 && ' (50% - Within 7 days)'}
                {daysUntilCheckIn < 3 && ' (0% - Within 3 days)'}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cancellation Reason *
              </label>
              <select
                required
                value={formData.cancellation_reason}
                onChange={(e) => setFormData({ ...formData, cancellation_reason: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="guest_request">Guest Request</option>
                <option value="duplicate_booking">Duplicate Booking</option>
                <option value="wrong_date">Wrong Date</option>
                <option value="no_payment">No Payment Received</option>
                <option value="fraud">Fraud / Suspicious</option>
                <option value="weather">Weather Issue</option>
                <option value="medical">Medical Reason</option>
                <option value="admin_decision">Admin Decision</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.cancellation_notes}
                onChange={(e) => setFormData({ ...formData, cancellation_notes: e.target.value })}
                rows={3}
                placeholder="Additional details about the cancellation..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {(booking.paid_total || 0) > 0 && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Refund Details</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Refund Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.refund_amount}
                      onChange={(e) => setFormData({ ...formData, refund_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suggested: RM {calculatedRefund.toFixed(2)} | Max: RM {(booking.paid_total || 0).toFixed(2)}
                    </p>
                  </div>

                  {formData.refund_amount > 0 && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Refund Method *
                        </label>
                        <select
                          required
                          value={formData.refund_method}
                          onChange={(e) => setFormData({ ...formData, refund_method: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="qr_duitnow">QR / DuitNow</option>
                          <option value="card">Card Refund</option>
                          <option value="online_fpx">Online FPX</option>
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Refund Reference Number
                        </label>
                        <input
                          type="text"
                          value={formData.refund_reference}
                          onChange={(e) => setFormData({ ...formData, refund_reference: e.target.value })}
                          placeholder="Transaction ID, reference number..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Upload Refund Proof (Optional)
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <Upload size={18} className="text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {refundProofFile ? refundProofFile.name : 'Choose file...'}
                            </span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                          </label>
                          {refundProofFile && (
                            <button
                              type="button"
                              onClick={() => setRefundProofFile(null)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving || uploading ? 'Processing...' : 'Cancel Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
