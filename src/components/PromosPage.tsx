import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateRange, getWeekdayLabel, applyPromosAndSurcharges } from '../utils/promoHelpers';
import { Tag, DollarSign, Plus, Edit2, Trash2, X, TestTube } from 'lucide-react';

export function PromosPage({ resortId }: { resortId: string }) {
  const [activeTab, setActiveTab] = useState<'promotions' | 'surcharges'>('promotions');
  const [promotions, setPromotions] = useState<any[]>([]);
  const [surcharges, setSurcharges] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: '',
    date_start: '',
    date_end: '',
    target_season: 'any',
    percent_off: 0,
    amount_per_pax: 0,
    min_days_in_advance: 0,
    applies_to: 'all',
    package_code: '',
    room_type_id: '',
    weekday_mask: '',
    notes: '',
    is_active: true,
  });

  const [previewData, setPreviewData] = useState({
    check_in: '',
    nights: 1,
    booking_created: new Date().toISOString().slice(0, 10),
    room_type_id: '',
    package_code: '',
    adults: 2,
    children: 0,
  });

  const [previewResult, setPreviewResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [resortId]);

  const loadData = async () => {
    setLoading(true);

    const { data: promoData } = await supabase
      .from('promotions')
      .select('*')
      .eq('resort_id', resortId)
      .order('date_start', { ascending: false });

    const { data: surchargeData } = await supabase
      .from('surcharges')
      .select('*')
      .eq('resort_id', resortId)
      .order('date_start', { ascending: false });

    const { data: roomData } = await supabase
      .from('room_types')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('order_index');

    setPromotions(promoData || []);
    setSurcharges(surchargeData || []);
    setRoomTypes(roomData || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);

    const payload = {
      ...formData,
      resort_id: resortId,
      room_type_id: formData.room_type_id || null,
      package_code: formData.package_code || null,
      weekday_mask: formData.weekday_mask || null,
      notes: formData.notes || null,
    };

    const table = activeTab === 'promotions' ? 'promotions' : 'surcharges';

    if (editingItem) {
      await supabase.from(table).update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from(table).insert(payload);
    }

    setShowDrawer(false);
    setEditingItem(null);
    resetForm();
    loadData();
    setLoading(false);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      date_start: item.date_start,
      date_end: item.date_end,
      target_season: item.target_season,
      percent_off: item.percent_off || 0,
      amount_per_pax: item.amount_per_pax || 0,
      min_days_in_advance: item.min_days_in_advance || 0,
      applies_to: item.applies_to,
      package_code: item.package_code || '',
      room_type_id: item.room_type_id || '',
      weekday_mask: item.weekday_mask || '',
      notes: item.notes || '',
      is_active: item.is_active,
    });
    setShowDrawer(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    setLoading(true);
    const table = activeTab === 'promotions' ? 'promotions' : 'surcharges';
    await supabase.from(table).delete().eq('id', id);
    loadData();
    setLoading(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    const table = activeTab === 'promotions' ? 'promotions' : 'surcharges';
    await supabase.from(table).update({ is_active: !currentStatus }).eq('id', id);
    loadData();
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date_start: '',
      date_end: '',
      target_season: 'any',
      percent_off: 0,
      amount_per_pax: 0,
      min_days_in_advance: 0,
      applies_to: 'all',
      package_code: '',
      room_type_id: '',
      weekday_mask: '',
      notes: '',
      is_active: true,
    });
  };

  const handleTestPricing = async () => {
    if (!previewData.check_in || !previewData.room_type_id) {
      alert('Please select check-in date and room type');
      return;
    }

    const basePrice = 500;

    const stayDates = [];
    const checkIn = new Date(previewData.check_in);
    for (let i = 0; i < previewData.nights; i++) {
      const d = new Date(checkIn);
      d.setDate(d.getDate() + i);
      stayDates.push(d.toISOString().slice(0, 10));
    }

    const seasonByDate: any = {};
    for (const date of stayDates) {
      seasonByDate[date] = 'mid';
    }

    const result = await applyPromosAndSurcharges({
      supabase,
      resort_id: resortId,
      room_type_id: previewData.room_type_id,
      package_code: previewData.package_code || '',
      stayDates,
      bookingCreatedAt: previewData.booking_created,
      seasonByDate,
      basePrice,
      paxAdult: previewData.adults,
      paxChild: previewData.children,
      roundToRM5: true,
    });

    setPreviewResult({
      basePrice,
      finalPrice: result.finalPrice,
      appliedPromos: result.appliedPromos,
      appliedSurcharges: result.appliedSurcharges,
      totalDiscount: result.appliedPromos.reduce((sum: number, p: any) => sum + p.discount, 0),
      totalSurcharge: result.appliedSurcharges.reduce((sum: number, s: any) => sum + s.total_amount, 0),
    });
  };

  const items = activeTab === 'promotions' ? promotions : surcharges;

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Tag className="text-emerald-600" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Promotions & Surcharges</h2>
                <p className="text-slate-600">Manage discounts and peak period fees</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <TestTube size={20} />
                Test Pricing
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setEditingItem(null);
                  setShowDrawer(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                New {activeTab === 'promotions' ? 'Promotion' : 'Surcharge'}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'promotions'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Promotions ({promotions.length})
            </button>
            <button
              onClick={() => setActiveTab('surcharges')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'surcharges'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Surcharges ({surcharges.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date Range</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Season</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    {activeTab === 'promotions' ? 'Discount' : 'Amount'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Applies To</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {item.notes && <div className="text-xs text-slate-500">{item.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatDateRange(item.date_start, item.date_end)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700 uppercase">
                        {item.target_season}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {activeTab === 'promotions'
                        ? `${item.percent_off}% off`
                        : `RM ${item.amount_per_pax}/pax`}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {item.applies_to === 'all' && 'All'}
                      {item.applies_to === 'package_code' && `Package: ${item.package_code}`}
                      {item.applies_to === 'room_type' &&
                        `Room: ${roomTypes.find((r) => r.id === item.room_type_id)?.name || 'N/A'}`}
                      {item.min_days_in_advance > 0 && (
                        <div className="text-xs text-blue-600">Early: {item.min_days_in_advance}d</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(item.id, item.is_active)}
                        className={`px-2 py-1 text-xs rounded font-medium ${
                          item.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No {activeTab === 'promotions' ? 'promotions' : 'surcharges'} defined yet
              </div>
            )}
          </div>
        </div>
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowDrawer(false)}></div>

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingItem ? 'Edit' : 'New'} {activeTab === 'promotions' ? 'Promotion' : 'Surcharge'}
              </h2>
              <button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Early Bird High Season"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.date_start}
                    onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.date_end}
                    onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Target Season</label>
                <select
                  value={formData.target_season}
                  onChange={(e) => setFormData({ ...formData, target_season: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="any">Any Season</option>
                  <option value="low">Low Season Only</option>
                  <option value="mid">Mid Season Only</option>
                  <option value="high">High Season Only</option>
                </select>
              </div>

              {activeTab === 'promotions' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Percent Off * (e.g., 10 for 10%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.percent_off}
                      onChange={(e) => setFormData({ ...formData, percent_off: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Min Days in Advance (for early booking)
                    </label>
                    <input
                      type="number"
                      value={formData.min_days_in_advance}
                      onChange={(e) => setFormData({ ...formData, min_days_in_advance: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      0 = no early booking requirement
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Amount per Pax * (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount_per_pax}
                    onChange={(e) => setFormData({ ...formData, amount_per_pax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Applies To</label>
                <select
                  value={formData.applies_to}
                  onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Bookings</option>
                  {activeTab === 'promotions' && <option value="room_only">Room Only</option>}
                  <option value="package_code">Specific Package</option>
                  <option value="room_type">Specific Room Type</option>
                </select>
              </div>

              {formData.applies_to === 'package_code' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Package Code</label>
                  <input
                    type="text"
                    value={formData.package_code}
                    onChange={(e) => setFormData({ ...formData, package_code: e.target.value })}
                    placeholder="e.g., RB, RBB, FB, FB3I"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {formData.applies_to === 'room_type' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Room Type</label>
                  <select
                    value={formData.room_type_id}
                    onChange={(e) => setFormData({ ...formData, room_type_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Room Type</option>
                    {roomTypes.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Weekday Mask (optional)
                </label>
                <input
                  type="text"
                  value={formData.weekday_mask}
                  onChange={(e) => setFormData({ ...formData, weekday_mask: e.target.value })}
                  placeholder="e.g., 12345 for Mon-Fri, 67 for weekends"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-xs text-slate-500 mt-1">
                  1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setShowDrawer(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowPreview(false)}></div>

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Test Pricing Preview</h2>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Check-in Date</label>
                  <input
                    type="date"
                    value={previewData.check_in}
                    onChange={(e) => setPreviewData({ ...previewData, check_in: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nights</label>
                  <input
                    type="number"
                    value={previewData.nights}
                    onChange={(e) => setPreviewData({ ...previewData, nights: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Booking Created</label>
                <input
                  type="date"
                  value={previewData.booking_created}
                  onChange={(e) => setPreviewData({ ...previewData, booking_created: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room Type</label>
                <select
                  value={previewData.room_type_id}
                  onChange={(e) => setPreviewData({ ...previewData, room_type_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Room Type</option>
                  {roomTypes.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Package Code</label>
                <input
                  type="text"
                  value={previewData.package_code}
                  onChange={(e) => setPreviewData({ ...previewData, package_code: e.target.value })}
                  placeholder="e.g., RB, FB3I"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Adults</label>
                  <input
                    type="number"
                    value={previewData.adults}
                    onChange={(e) => setPreviewData({ ...previewData, adults: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Children</label>
                  <input
                    type="number"
                    value={previewData.children}
                    onChange={(e) => setPreviewData({ ...previewData, children: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={handleTestPricing}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Calculate Pricing
              </button>

              {previewResult && (
                <div className="mt-6 space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Pricing Result</h3>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Base Price:</span>
                        <span className="font-medium text-slate-900">RM {previewResult.basePrice.toFixed(2)}</span>
                      </div>

                      {previewResult.appliedPromos.length > 0 && (
                        <div className="border-t border-slate-300 pt-2">
                          <div className="font-medium text-slate-900 mb-1">Applied Promotions:</div>
                          {previewResult.appliedPromos.map((promo: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm text-green-600">
                              <span>- {promo.name} ({promo.percent}%)</span>
                              <span>-RM {promo.discount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {previewResult.appliedSurcharges.length > 0 && (
                        <div className="border-t border-slate-300 pt-2">
                          <div className="font-medium text-slate-900 mb-1">Applied Surcharges:</div>
                          {previewResult.appliedSurcharges.map((surcharge: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm text-red-600">
                              <span>+ {surcharge.name} (RM{surcharge.amount_per_pax}/pax)</span>
                              <span>+RM {surcharge.total_amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-t-2 border-slate-400 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-lg font-bold text-slate-900">Final Price:</span>
                          <span className="text-lg font-bold text-emerald-600">
                            RM {previewResult.finalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
