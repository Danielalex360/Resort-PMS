import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, LogOut, FileText, DollarSign } from 'lucide-react';
import { createDocumentRecord } from '../utils/documentGenerator';

interface CheckOutModalProps {
  open: boolean;
  onClose: () => void;
  booking: any;
  resortId: string;
  onCheckOutComplete: () => void;
}

export function CheckOutModal({ open, onClose, booking, resortId, onCheckOutComplete }: CheckOutModalProps) {
  const [loading, setLoading] = useState(false);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [folioGenerated, setFolioGenerated] = useState(false);

  useEffect(() => {
    if (open && booking) {
      loadChargesAndPayments();
    }
  }, [open, booking]);

  const loadChargesAndPayments = async () => {
    const [itemsResult, paymentsResult] = await Promise.all([
      supabase
        .from('booking_line_items')
        .select('*, accounting_categories(category_name)')
        .eq('booking_id', booking.id)
        .order('item_date', { ascending: true }),

      supabase
        .from('payments')
        .select('*')
        .eq('booking_id', booking.id)
        .order('payment_date', { ascending: true }),
    ]);

    setLineItems(itemsResult.data || []);
    setPayments(paymentsResult.data || []);
  };

  const generateFolio = async () => {
    try {
      const folioNumber = await createDocumentRecord(resortId, 'folio', {
        booking_id: booking.id,
        guest_name: booking.guest_name,
        amount: booking.price_total,
        metadata: {
          check_in: booking.check_in,
          check_out: booking.check_out,
          nights: booking.nights,
          room_type: booking.room_type_name,
          charges: lineItems,
          payments: payments,
          balance: booking.balance_due,
        },
      });

      setFolioGenerated(true);
      alert(`Folio generated: ${folioNumber}`);
    } catch (error) {
      console.error('Error generating folio:', error);
      alert('Failed to generate folio');
    }
  };

  const handleCheckOut = async () => {
    if (booking.balance_due > 0) {
      const confirm = window.confirm(
        `Guest has an outstanding balance of RM ${booking.balance_due.toFixed(2)}. Proceed with check-out?`
      );
      if (!confirm) return;
    }

    if (!folioGenerated) {
      alert('Please generate the folio before checking out.');
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from('bookings')
        .update({
          status: 'completed',
          actual_check_out: new Date().toISOString(),
        })
        .eq('id', booking.id);

      alert('Guest checked out successfully!');
      onCheckOutComplete();
      onClose();
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Failed to check out guest');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const totalCharges = booking.price_total || 0;
  const totalPaid = booking.paid_total || 0;
  const balance = booking.balance_due || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <LogOut className="text-orange-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Check-Out Guest</h2>
              <p className="text-sm text-slate-600">{booking.guest_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Check-in Date:</span>
              <span className="font-semibold">{new Date(booking.check_in).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Check-out Date:</span>
              <span className="font-semibold">{new Date(booking.check_out).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Nights:</span>
              <span className="font-semibold">{booking.nights}</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText size={18} />
              Guest Folio
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <div className="grid grid-cols-3 text-sm font-semibold text-slate-700">
                  <div>Date</div>
                  <div>Description</div>
                  <div className="text-right">Amount</div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {lineItems.length > 0 ? (
                  lineItems.map((item) => (
                    <div key={item.id} className="px-4 py-2 grid grid-cols-3 text-sm">
                      <div className="text-slate-600">
                        {new Date(item.item_date).toLocaleDateString()}
                      </div>
                      <div className="text-slate-900">{item.description}</div>
                      <div className="text-right text-slate-900">
                        RM {parseFloat(item.total_amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    No itemized charges recorded
                  </div>
                )}

                <div className="px-4 py-2 grid grid-cols-3 text-sm bg-slate-50">
                  <div></div>
                  <div className="font-semibold text-slate-900">Room Total</div>
                  <div className="text-right font-semibold text-slate-900">
                    RM {totalCharges.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <DollarSign size={18} />
              Payments Received
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <div className="grid grid-cols-3 text-sm font-semibold text-slate-700">
                  <div>Date</div>
                  <div>Method</div>
                  <div className="text-right">Amount</div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <div key={payment.id} className="px-4 py-2 grid grid-cols-3 text-sm">
                      <div className="text-slate-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                      <div className="text-slate-900 capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </div>
                      <div className="text-right text-green-600 font-medium">
                        RM {parseFloat(payment.amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">No payments recorded</div>
                )}

                <div className="px-4 py-2 grid grid-cols-3 text-sm bg-slate-50">
                  <div></div>
                  <div className="font-semibold text-slate-900">Total Paid</div>
                  <div className="text-right font-semibold text-green-600">
                    RM {totalPaid.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold text-slate-900">Balance Due:</span>
              <span className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                RM {balance.toFixed(2)}
              </span>
            </div>
            {balance > 0 && (
              <p className="text-sm text-red-600 font-medium">
                Outstanding balance must be settled before check-out
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            {!folioGenerated && (
              <button
                type="button"
                onClick={generateFolio}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                Generate Folio
              </button>
            )}
            {folioGenerated && (
              <button
                type="button"
                onClick={handleCheckOut}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={loading}
              >
                <LogOut size={18} />
                {loading ? 'Processing...' : 'Complete Check-Out'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
