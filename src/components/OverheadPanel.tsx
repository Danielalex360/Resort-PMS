import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, Save } from 'lucide-react';

interface Overhead {
  id: string;
  resort_id: string;
  month: string;
  overhead_monthly: number;
  overhead_daily: number | null;
  overhead_per_room_day: number | null;
  allocation_mode: 'per_room_day' | 'fixed_per_package';
  fixed_per_package: number | null;
  notes: string | null;
}

export function OverheadPanel({ resortId }: { resortId: string }) {
  const [overheads, setOverheads] = useState<Overhead[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [formData, setFormData] = useState<Partial<Overhead>>({
    overhead_monthly: 0,
    overhead_daily: null,
    overhead_per_room_day: null,
    allocation_mode: 'per_room_day',
    fixed_per_package: null,
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOverheads();
  }, [resortId]);

  const loadOverheads = async () => {
    const { data, error } = await supabase
      .from('overheads')
      .select('*')
      .eq('resort_id', resortId)
      .order('month', { ascending: false });

    if (error) {
      console.error('Error loading overheads:', error);
    } else {
      setOverheads(data || []);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    const existing = overheads.find((o) => o.month === month);
    if (existing) {
      setFormData(existing);
    } else {
      setFormData({
        overhead_monthly: 0,
        overhead_daily: null,
        overhead_per_room_day: null,
        allocation_mode: 'per_room_day',
        fixed_per_package: null,
        notes: '',
      });
    }
  };

  const calculateDailyFromMonthly = () => {
    if (formData.overhead_monthly) {
      const daysInMonth = 30;
      const daily = formData.overhead_monthly / daysInMonth;
      setFormData({ ...formData, overhead_daily: Math.round(daily * 100) / 100 });
    }
  };

  const handleSave = async () => {
    if (!selectedMonth) return;

    setLoading(true);
    const existing = overheads.find((o) => o.month === selectedMonth);

    const payload = {
      resort_id: resortId,
      month: selectedMonth,
      overhead_monthly: formData.overhead_monthly || 0,
      overhead_daily: formData.overhead_daily,
      overhead_per_room_day: formData.overhead_per_room_day,
      allocation_mode: formData.allocation_mode || 'per_room_day',
      fixed_per_package: formData.fixed_per_package,
      notes: formData.notes,
    };

    if (existing) {
      const { error } = await supabase.from('overheads').update(payload).eq('id', existing.id);
      if (error) {
        console.error('Error updating overhead:', error);
        alert('Failed to update overhead');
      } else {
        loadOverheads();
      }
    } else {
      const { error } = await supabase.from('overheads').insert(payload);
      if (error) {
        console.error('Error creating overhead:', error);
        alert('Failed to create overhead');
      } else {
        loadOverheads();
      }
    }
    setLoading(false);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    handleMonthChange(monthStr);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-emerald-600" size={28} />
          <h2 className="text-2xl font-bold text-slate-900">Overhead Management</h2>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Month</label>
          <div className="flex gap-2">
            <input
              type="month"
              value={selectedMonth ? selectedMonth.slice(0, 7) : ''}
              onChange={(e) => handleMonthChange(`${e.target.value}-01`)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={setCurrentMonth}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Current Month
            </button>
          </div>
        </div>

        {selectedMonth && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monthly Overhead (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.overhead_monthly || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, overhead_monthly: parseFloat(e.target.value) || 0 })
                  }
                  onBlur={calculateDailyFromMonthly}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Daily Overhead (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.overhead_daily || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, overhead_daily: parseFloat(e.target.value) || null })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Per Room Day (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.overhead_per_room_day || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overhead_per_room_day: parseFloat(e.target.value) || null,
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Allocation Mode
                </label>
                <select
                  value={formData.allocation_mode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allocation_mode: e.target.value as 'per_room_day' | 'fixed_per_package',
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="per_room_day">Per Room Day</option>
                  <option value="fixed_per_package">Fixed Per Package</option>
                </select>
              </div>
            </div>

            {formData.allocation_mode === 'fixed_per_package' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fixed Per Package (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fixed_per_package || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fixed_per_package: parseFloat(e.target.value) || null,
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Saving...' : 'Save Overhead'}
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Overheads</h3>
          <div className="space-y-2">
            {overheads.slice(0, 5).map((overhead) => (
              <div
                key={overhead.id}
                className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => handleMonthChange(overhead.month)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">
                      {new Date(overhead.month).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </div>
                    <div className="text-sm text-slate-600">
                      Mode: {overhead.allocation_mode.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600">
                      RM {overhead.overhead_monthly.toFixed(2)}
                    </div>
                    {overhead.overhead_per_room_day && (
                      <div className="text-sm text-slate-600">
                        RM {overhead.overhead_per_room_day.toFixed(2)}/room/day
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
