import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fillTemplate, MESSAGE_TEMPLATES } from '../utils/notifyBookingEvents';
import { X, Save, DollarSign, Plus, Trash2, FileText, Send, Printer, Download, XCircle } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { PaymentRecordModal } from './PaymentRecordModal';
import { CancellationModal } from './CancellationModal';

interface BookingDrawerProps {
  open: boolean;
  onClose: () => void;
  resortId: string;
  booking?: any;
  newBookingData?: { roomTypeId: string; date: string } | null;
}

export function BookingDrawer({
  open,
  onClose,
  resortId,
  booking,
  newBookingData,
}: BookingDrawerProps) {
  const { hasPermission } = usePermissions(resortId);
  const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');
  const [formData, setFormData] = useState<any>({
    check_in: '',
    check_out: '',
    room_type_id: '',
    package_id: '',
    meal_plan_id: '',
    pax_adult: 2,
    pax_child: 0,
    pax_infant: 0,
    guest_name: '',
    email: '',
    phone: '',
    nationality: '',
    status: 'pending',
  });
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    txn_date: new Date().toISOString().slice(0, 10),
    method: 'cash',
    type: 'deposit',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (booking) {
        setFormData(booking);
        setActiveTab('details');
        loadPayments(booking.id);
      } else if (newBookingData) {
        setFormData({
          ...formData,
          room_type_id: newBookingData.roomTypeId,
          check_in: newBookingData.date,
          check_out: new Date(
            new Date(newBookingData.date).getTime() + 2 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10),
        });
        setActiveTab('details');
      }
    }
  }, [open, booking, newBookingData]);

  const loadOptions = async () => {
    const { data: roomData } = await supabase
      .from('room_types')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('order_index');
    setRoomTypes(roomData || []);

    const { data: pkgData } = await supabase
      .from('packages')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true);
    setPackages(pkgData || []);

    const { data: mealData } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true);
    setMealPlans(mealData || []);

    const { data: taxData } = await supabase
      .from('taxes')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('display_order');
    setTaxes(taxData || []);
  };

  const calculateTaxBreakdown = () => {
    if (!booking || !formData.price_total) return [];

    const priceBeforeTax = formData.price_total || 0;
    const taxBreakdown: any[] = [];
    let totalTax = 0;

    taxes.forEach((tax) => {
      let taxAmount = 0;
      const nights = formData.nights || 1;
      let paxCount = 0;

      if (tax.apply_to_adults) paxCount += formData.pax_adult || 0;
      if (tax.apply_to_children) paxCount += formData.pax_child || 0;

      switch (tax.application_type) {
        case 'per_total':
          if (tax.is_percentage) {
            taxAmount = priceBeforeTax * (tax.rate / 100);
          } else {
            taxAmount = tax.rate;
          }
          break;
        case 'per_room':
          if (tax.is_percentage) {
            taxAmount = priceBeforeTax * (tax.rate / 100);
          } else {
            taxAmount = tax.rate;
          }
          break;
        case 'per_pax':
          if (paxCount > 0) {
            if (tax.is_percentage) {
              taxAmount = (priceBeforeTax / paxCount) * (tax.rate / 100) * paxCount;
            } else {
              taxAmount = tax.rate * paxCount;
            }
          }
          break;
        case 'per_night':
          if (tax.is_percentage) {
            taxAmount = (priceBeforeTax / nights) * (tax.rate / 100) * nights;
          } else {
            taxAmount = tax.rate * nights;
          }
          break;
      }

      totalTax += taxAmount;
      taxBreakdown.push({
        name: tax.name,
        rate: tax.rate,
        isPercentage: tax.is_percentage,
        applicationType: tax.application_type,
        amount: taxAmount,
      });
    });

    return {
      taxes: taxBreakdown,
      totalTax,
      subtotal: priceBeforeTax - totalTax,
    };
  };

  const handlePrintInvoice = () => {
    const printContent = document.getElementById('invoice-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${booking.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            h1 { font-size: 32px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: 600; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .mb-4 { margin-bottom: 16px; }
            .mt-6 { margin-top: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .status-unpaid { color: #dc2626; font-weight: bold; }
            .total-row { font-weight: bold; font-size: 18px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const loadPayments = async (bookingId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('txn_date', { ascending: false });
    setPayments(data || []);
  };

  const handleSaveBooking = async () => {
    setLoading(true);
    const payload = {
      ...formData,
      resort_id: resortId,
      package_id: formData.package_id || null,
      meal_plan_id: formData.meal_plan_id || null,
    };

    if (booking) {
      const { error } = await supabase.from('bookings').update(payload).eq('id', booking.id);
      if (error) {
        alert('Error updating booking: ' + error.message);
      } else {
        alert('Booking updated successfully!');
        onClose();
      }
    } else {
      const { error } = await supabase.from('bookings').insert(payload);
      if (error) {
        alert('Error creating booking: ' + error.message);
      } else {
        alert('Booking created successfully!');
        onClose();
      }
    }
    setLoading(false);
  };

  const handleAddPayment = async () => {
    if (!booking) return;

    setLoading(true);
    const payload = {
      resort_id: resortId,
      booking_id: booking.id,
      ...paymentForm,
      status: 'cleared',
    };

    const { error } = await supabase.from('payments').insert(payload);
    if (error) {
      alert('Error adding payment: ' + error.message);
    } else {
      setPaymentForm({
        amount: 0,
        txn_date: new Date().toISOString().slice(0, 10),
        method: 'cash',
        type: 'deposit',
        notes: '',
      });
      setShowPaymentForm(false);
      loadPayments(booking.id);

      const { data: updated } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', booking.id)
        .single();
      if (updated) {
        setFormData(updated);
      }
    }
    setLoading(false);
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    setLoading(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id);

    if (error) {
      alert('Error cancelling booking: ' + error.message);
    } else {
      setShowCancelConfirm(false);
      onClose();
      window.location.reload();
    }
    setLoading(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment?')) return;

    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (!error) {
      loadPayments(booking.id);
      const { data: updated } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', booking.id)
        .single();
      if (updated) {
        setFormData(updated);
      }
    }
  };

  const handleSendReminder = async () => {
    if (!booking) return;

    const { data: resort } = await supabase
      .from('resorts')
      .select('name')
      .eq('id', resortId)
      .single();

    const { data: pkg } = await supabase
      .from('packages')
      .select('name')
      .eq('id', booking.package_id)
      .maybeSingle();

    const variables = {
      guest_name: booking.guest_name || 'Guest',
      check_in: new Date(booking.check_in).toLocaleDateString(),
      nights: booking.nights || 0,
      package_name: pkg?.name || 'Standard Package',
      balance_due: (booking.balance_due || 0).toFixed(2),
      phone: booking.phone || 'N/A',
      resort_name: resort?.name || 'Resort',
      balance_message:
        booking.balance_due > 0
          ? `Outstanding Balance: RM ${booking.balance_due.toFixed(2)}`
          : 'Your payment is complete. Thank you!',
    };

    let templateKey = 'balanceReminder';
    if (booking.balance_due > booking.price_total * 0.5) {
      templateKey = 'depositReminder';
    }

    const template = MESSAGE_TEMPLATES[templateKey];
    const subject = fillTemplate(template.subject, variables);
    const body = fillTemplate(template.body, variables);

    const { error } = await supabase.from('notifications').insert({
      resort_id: resortId,
      booking_id: booking.id,
      sent_to: booking.email || booking.guest_name,
      method: 'internal',
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    if (error) {
      alert('Failed to send reminder');
    } else {
      alert('Reminder sent successfully!');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {booking ? 'Edit Booking' : 'New Booking'}
          </h2>
          <div className="flex items-center gap-2">
            {booking && hasPermission('bookings', 'delete') && formData.status !== 'cancelled' && formData.status !== 'refunded' && (
              <button
                onClick={() => setShowCancellationModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <XCircle size={18} />
                Cancel Booking
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {booking && (
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Booking Details
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Payments
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={formData.check_in}
                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={formData.check_out}
                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room Type</label>
                <select
                  value={formData.room_type_id}
                  onChange={(e) => setFormData({ ...formData, room_type_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select room type</option>
                  {roomTypes.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Package</label>
                <select
                  value={formData.package_id || ''}
                  onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Adults</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.pax_adult}
                    onChange={(e) =>
                      setFormData({ ...formData, pax_adult: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Children</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.pax_child}
                    onChange={(e) =>
                      setFormData({ ...formData, pax_child: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Infants</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.pax_infant}
                    onChange={(e) =>
                      setFormData({ ...formData, pax_infant: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Guest Name</label>
                <input
                  type="text"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nationality
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Booking Type</label>
                <select
                  value={formData.booking_type || 'direct'}
                  onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="direct">Direct (Website/WhatsApp)</option>
                  <option value="walkin">Walk-in</option>
                  <option value="ota">OTA (Booking.com/Agoda)</option>
                  <option value="corporate">Corporate/Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Deposit Policy</label>
                <select
                  value={formData.deposit_policy || 'fifty_percent'}
                  onChange={(e) => setFormData({ ...formData, deposit_policy: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="none">No Deposit Required</option>
                  <option value="thirty_percent">30% Deposit</option>
                  <option value="fifty_percent">50% Deposit</option>
                  <option value="full_payment">Full Payment Required</option>
                  <option value="non_refundable">Non-Refundable</option>
                  <option value="custom">Custom Amount</option>
                </select>
              </div>

              {formData.deposit_policy === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Custom Deposit Amount (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.deposit_amount || 0}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter custom deposit amount"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Total booking amount: RM {formData.price_total?.toFixed(2) || '0.00'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="guaranteed">Guaranteed</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="checked-in">Checked In</option>
                  <option value="checked-out">Checked Out</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                  <option value="no-show">No Show</option>
                </select>
              </div>

              {booking && (() => {
                const breakdown = calculateTaxBreakdown();
                return (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-slate-900 mb-3">Pricing Summary</h3>

                    {breakdown && breakdown.taxes && breakdown.taxes.length > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal:</span>
                          <span className="font-medium text-slate-900">
                            RM {breakdown.subtotal?.toFixed(2) || '0.00'}
                          </span>
                        </div>

                        <div className="border-t border-slate-200 pt-2 space-y-1">
                          {breakdown.taxes.map((tax: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-slate-600">
                                {tax.name} ({tax.isPercentage ? `${tax.rate}%` : `RM ${tax.rate}`})
                              </span>
                              <span className="font-medium text-slate-700">
                                RM {tax.amount?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-900">Total Price:</span>
                      <span className="font-bold text-emerald-600 text-lg">
                        RM {formData.price_total?.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total Cost:</span>
                        <span className="font-semibold text-red-600">
                          RM {formData.cost_total?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-600">Profit:</span>
                        <span className="font-semibold text-green-600">
                          RM {formData.profit_total?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-6 border border-emerald-200">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Total Price</div>
                    <div className="text-2xl font-bold text-slate-900">
                      RM {formData.price_total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Paid</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      RM {formData.paid_total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Balance Due</div>
                    <div className="text-2xl font-bold text-red-600">
                      RM {formData.balance_due?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Payment Status</div>
                    <div className="text-lg font-semibold capitalize text-slate-900">
                      {formData.payment_status || 'unpaid'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Payment History</h3>
                <div className="flex gap-2">
                  {formData.balance_due > 0 ? (
                    <button
                      onClick={handleSendReminder}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Send size={16} />
                      Send Reminder
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                      Paid in Full
                    </div>
                  )}
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <DollarSign size={16} />
                    Record Payment
                  </button>
                </div>
              </div>

              {showPaymentForm && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-slate-900">New Payment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Amount (RM)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={paymentForm.txn_date}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, txn_date: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Method
                      </label>
                      <select
                        value={paymentForm.method}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, method: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="FPX">FPX</option>
                        <option value="QR">QR Code</option>
                        <option value="OTA">OTA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                      <select
                        value={paymentForm.type}
                        onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="deposit">Deposit</option>
                        <option value="balance">Balance</option>
                        <option value="full">Full Payment</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="refund">Refund</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddPayment}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
                    >
                      Save Payment
                    </button>
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-slate-900">
                          RM {payment.amount.toFixed(2)}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            payment.type === 'refund'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {payment.type}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{payment.method}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {new Date(payment.txn_date).toLocaleDateString()}
                        {payment.notes && ` · ${payment.notes}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          {activeTab === 'details' && (
            <div className="flex gap-3">
              <button
                onClick={handleSaveBooking}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {loading ? 'Saving...' : booking ? 'Update Booking' : 'Create Booking'}
              </button>
              {booking && (
                <button
                  onClick={() => setShowInvoice(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  Invoice
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && booking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Invoice</h2>
              <button
                onClick={() => setShowInvoice(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 bg-white" id="invoice-content">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-4">Invoice</h1>
                  <p className="text-slate-700 font-semibold">{formData.guest_name || 'Guest Name'}</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {formData.balance_due > 0 ? 'UNPAID' : 'PAID'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Invoice Number:</p>
                  <p className="font-semibold mb-3">{booking.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-slate-600">Invoice Date:</p>
                  <p className="font-semibold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Reservation Details */}
              <div className="mb-6">
                <p className="text-sm text-slate-600">Reservation Number: <span className="font-semibold text-slate-900">{booking.id}</span></p>
                <p className="text-sm text-slate-600">Reservation Status: <span className="font-semibold text-slate-900">Confirmed</span></p>
              </div>

              {/* Stay Details */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-slate-600">Arrival: <span className="font-semibold text-slate-900">{new Date(formData.check_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                  <p className="text-sm text-slate-600">Departure: <span className="font-semibold text-slate-900">{new Date(formData.check_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                  <p className="text-sm text-slate-600">Nights: <span className="font-semibold text-slate-900">{formData.nights}</span></p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Adults: <span className="font-semibold text-slate-900">{formData.pax_adult}</span></p>
                  <p className="text-sm text-slate-600">Children: <span className="font-semibold text-slate-900">{formData.pax_child}</span></p>
                  <p className="text-sm text-slate-600">Infants: <span className="font-semibold text-slate-900">{formData.pax_infant || 0}</span></p>
                </div>
              </div>

              {/* Charges Table */}
              {(() => {
                const breakdown = calculateTaxBreakdown();
                const roomType = roomTypes.find(r => r.id === formData.room_type_id);
                return (
                  <div className="mb-6">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">Date</th>
                          <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">Description</th>
                          <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">Room Number</th>
                          <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">Quantity</th>
                          <th className="border border-slate-300 px-4 py-2 text-right text-sm font-semibold">Item Total</th>
                          <th className="border border-slate-300 px-4 py-2 text-right text-sm font-semibold">Total</th>
                          <th className="border border-slate-300 px-4 py-2 text-right text-sm font-semibold">Payments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 px-4 py-2 text-sm">{new Date(formData.check_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">{roomType?.name || 'Room'}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-center">-</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-center">-</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-right">-</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-right">RM{breakdown.subtotal?.toFixed(0)}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-right">-</td>
                        </tr>
                        {breakdown && breakdown.taxes && breakdown.taxes.map((tax: any, idx: number) => (
                          <tr key={idx}>
                            <td className="border border-slate-300 px-4 py-2 text-sm">{new Date(formData.check_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm">{tax.name}</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-center">-</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-center">{tax.isPercentage ? `${tax.rate}%` : formData.pax_adult}</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-right">{tax.isPercentage ? '' : `RM${tax.rate}`}</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-right">RM{tax.amount?.toFixed(0)}</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-right">-</td>
                          </tr>
                        ))}
                        {payments.map((payment: any, idx: number) => (
                          <tr key={`payment-${idx}`}>
                            <td className="border border-slate-300 px-4 py-2 text-sm">{new Date(payment.txn_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm">{payment.type}: {payment.method}{payment.notes ? ` (${payment.notes})` : ''}</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-center">-</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-center">-</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-right">-</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-right">-</td>
                            <td className="border border-slate-300 px-4 py-2 text-sm text-right">RM{payment.amount?.toFixed(0)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td colSpan={5} className="border border-slate-300 px-4 py-2 text-sm text-right">Total</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-right">RM{formData.price_total?.toFixed(0)}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-right">RM{formData.paid_total?.toFixed(0)}</td>
                        </tr>
                        <tr className="font-bold bg-slate-50">
                          <td colSpan={6} className="border border-slate-300 px-4 py-2 text-sm text-right">Outstanding Balance</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-right text-red-600">RM{formData.balance_due?.toFixed(0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Footer */}
              <div className="text-sm text-slate-600 mt-8">
                <p className="font-semibold mb-2">Payment Policy:</p>
                <p>Thank you for your booking!</p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={handlePrintInvoice}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Print / Download
              </button>
              <button
                onClick={() => setShowInvoice(false)}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Cancel Booking</h3>
                <p className="text-sm text-slate-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-slate-700 mb-2">
                Are you sure you want to cancel this booking for <strong>{formData.guest_name}</strong>?
              </p>
              <div className="text-sm text-slate-600 space-y-1">
                <p>• Booking ID: {booking.id.slice(0, 8).toUpperCase()}</p>
                <p>• Check-in: {formData.check_in}</p>
                <p>• Total: RM {formData.price_total?.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
              >
                No, Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentRecordModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        bookingId={booking?.id}
        resortId={resortId}
        balanceDue={formData.balance_due || 0}
        onPaymentRecorded={() => {
          if (booking) {
            loadPayments(booking.id);
            setFormData({ ...formData });
          }
        }}
      />

      <CancellationModal
        open={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        booking={booking}
        resortId={resortId}
        onCancelled={() => {
          setShowCancellationModal(false);
          onClose();
        }}
      />
    </div>
  );
}
