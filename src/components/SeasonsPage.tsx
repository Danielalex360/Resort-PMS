import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  setSeasonRange,
  getSeasonAssignments,
  getSeasonRanges,
  generateCalendarMonths,
  getSeasonColor,
  deleteSeasonRange,
} from '../utils/seasonHelpers';
import { Calendar, Save, Plus, Trash2 } from 'lucide-react';

export function SeasonsPage({ resortId }: { resortId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [assignments, setAssignments] = useState<any>({});
  const [ranges, setRanges] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    mult_low: 0.9,
    mult_mid: 1.0,
    mult_high: 1.3,
    round_to_rm5: true,
  });

  const [displayPct, setDisplayPct] = useState({
    low: '-10',
    mid: '0',
    high: '30',
  });
  const [formData, setFormData] = useState({
    date_start: '',
    date_end: '',
    season: 'mid',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [resortId, year]);

  const loadData = async () => {
    setLoading(true);

    const assignmentsData = await getSeasonAssignments({ supabase, resort_id: resortId, year });
    const assignmentsMap: any = {};
    for (const a of assignmentsData) {
      assignmentsMap[a.date] = a;
    }
    setAssignments(assignmentsMap);

    const rangesData = await getSeasonRanges({ supabase, resort_id: resortId, year });
    setRanges(rangesData);

    const { data: settingsData } = await supabase
      .from('season_settings')
      .select('*')
      .eq('resort_id', resortId)
      .maybeSingle();

    if (settingsData) {
      const pctLow = settingsData.mult_low != null ? parseFloat(settingsData.mult_low) : -10;
      const pctMid = settingsData.mult_mid != null ? parseFloat(settingsData.mult_mid) : 0;
      const pctHigh = settingsData.mult_high != null ? parseFloat(settingsData.mult_high) : 30;

      setSettings({
        mult_low: 1 + pctLow / 100,
        mult_mid: 1 + pctMid / 100,
        mult_high: 1 + pctHigh / 100,
        round_to_rm5: settingsData.round_to_rm5 || false,
      });

      setDisplayPct({
        low: pctLow.toString(),
        mid: pctMid.toString(),
        high: pctHigh.toString(),
      });
    }

    setLoading(false);
  };

  const handleAddRange = async () => {
    if (!formData.date_start || !formData.date_end) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);

    const result = await setSeasonRange({
      supabase,
      resort_id: resortId,
      date_start: formData.date_start,
      date_end: formData.date_end,
      season: formData.season as any,
      description: formData.description,
    });

    if (result.error) {
      alert('Error creating season range: ' + result.error.message);
    } else {
      setFormData({ date_start: '', date_end: '', season: 'mid', description: '' });
      loadData();
    }

    setLoading(false);
  };

  const handleDeleteRange = async (id: string) => {
    if (!confirm('Delete this season range?')) return;

    setLoading(true);
    await deleteSeasonRange({ supabase, id });
    loadData();
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setLoading(true);

    console.log('=== SAVE SETTINGS DEBUG ===');
    console.log('displayPct:', displayPct);
    console.log('settings:', settings);

    const updateData = {
      mult_low: parseFloat(displayPct.low),
      mult_mid: parseFloat(displayPct.mid),
      mult_high: parseFloat(displayPct.high),
      round_to_rm5: settings.round_to_rm5,
    };

    console.log('Update data being sent to DB:', updateData);
    console.log('Resort ID:', resortId);

    const { data: existing } = await supabase
      .from('season_settings')
      .select('id')
      .eq('resort_id', resortId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('season_settings')
        .update(updateData)
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating settings:', error);
        alert('Error saving settings: ' + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('season_settings')
        .insert({ ...updateData, resort_id: resortId });

      if (error) {
        console.error('Error inserting settings:', error);
        alert('Error saving settings: ' + error.message);
        setLoading(false);
        return;
      }
    }

    await loadData();
    alert('Settings saved successfully!');
    setLoading(false);
  };

  const months = generateCalendarMonths(year);

  const handleQuickRange = (range: string) => {
    const y = year;
    switch (range) {
      case 'Q1':
        setFormData({ ...formData, date_start: `${y}-01-01`, date_end: `${y}-03-31` });
        break;
      case 'Q2':
        setFormData({ ...formData, date_start: `${y}-04-01`, date_end: `${y}-06-30` });
        break;
      case 'Q3':
        setFormData({ ...formData, date_start: `${y}-07-01`, date_end: `${y}-09-30` });
        break;
      case 'Q4':
        setFormData({ ...formData, date_start: `${y}-10-01`, date_end: `${y}-12-31` });
        break;
      case 'YEAR':
        setFormData({ ...formData, date_start: `${y}-01-01`, date_end: `${y}-12-31` });
        break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Season Management</h2>
              <p className="text-slate-600">Manage season date ranges and multipliers</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Create Season Range</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={formData.date_start}
                    onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={formData.date_end}
                    onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Season</label>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'mid', 'high'].map((season) => {
                    const colors = getSeasonColor(season);
                    return (
                      <button
                        key={season}
                        onClick={() => setFormData({ ...formData, season })}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                          formData.season === season
                            ? `${colors.bg} ${colors.text} border-2 ${colors.border}`
                            : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {season}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Summer vacation period"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleQuickRange('Q1')}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Q1
                </button>
                <button
                  onClick={() => handleQuickRange('Q2')}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Q2
                </button>
                <button
                  onClick={() => handleQuickRange('Q3')}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Q3
                </button>
                <button
                  onClick={() => handleQuickRange('Q4')}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Q4
                </button>
                <button
                  onClick={() => handleQuickRange('YEAR')}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Full Year
                </button>
              </div>

              <button
                onClick={handleAddRange}
                disabled={loading}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={20} />
                Add Season Range
              </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Season Ranges</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {ranges.map((range) => {
                  const colors = getSeasonColor(range.season);
                  return (
                    <div key={range.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs rounded ${colors.bg} ${colors.text}`}>
                            {range.season.toUpperCase()}
                          </span>
                          <span className="text-sm text-slate-900">
                            {new Date(range.date_start).toLocaleDateString()} -{' '}
                            {new Date(range.date_end).toLocaleDateString()}
                          </span>
                        </div>
                        {range.description && (
                          <div className="text-sm text-slate-600">{range.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteRange(range.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
                {ranges.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No season ranges defined yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Season Multipliers</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Low Season Multiplier
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={displayPct.low}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.-]/g, '');
                        setDisplayPct({ ...displayPct, low: val });
                        const pct = parseFloat(val) || 0;
                        setSettings({ ...settings, mult_low: 1 + pct / 100 });
                      }}
                      className="w-full px-4 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Default: -10% (10% discount)</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mid Season Multiplier
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={displayPct.mid}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.-]/g, '');
                        setDisplayPct({ ...displayPct, mid: val });
                        const pct = parseFloat(val) || 0;
                        setSettings({ ...settings, mult_mid: 1 + pct / 100 });
                      }}
                      className="w-full px-4 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Default: 0% (base price)</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    High Season Multiplier
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={displayPct.high}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.-]/g, '');
                        setDisplayPct({ ...displayPct, high: val });
                        const pct = parseFloat(val) || 0;
                        setSettings({ ...settings, mult_high: 1 + pct / 100 });
                      }}
                      className="w-full px-4 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="30"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Default: 30% (30% premium)</div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.round_to_rm5}
                      onChange={(e) =>
                        setSettings({ ...settings, round_to_rm5: e.target.checked })
                      }
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Round to RM 5</span>
                  </label>
                  <div className="text-xs text-slate-500 mt-1 ml-6">
                    Round final prices to nearest RM 5
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  <Save size={20} />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Calendar View - {year}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((month) => (
            <div key={month.month} className="border border-slate-200 rounded-lg p-3">
              <div className="font-semibold text-slate-900 mb-2">{month.name}</div>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-xs text-center text-slate-500 font-medium">
                    {day}
                  </div>
                ))}
                {month.days.map((day, i) => {
                  if (!day) {
                    return <div key={`empty-${i}`} className="aspect-square"></div>;
                  }

                  const assignment = assignments[day.date];
                  const colors = assignment ? getSeasonColor(assignment.season) : getSeasonColor(null);

                  return (
                    <div
                      key={day.date}
                      title={assignment?.description || ''}
                      className={`aspect-square flex items-center justify-center text-xs rounded cursor-pointer transition-colors ${
                        assignment ? `${colors.bg} ${colors.text} border ${colors.border}` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {day.day}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
            <span className="text-slate-700">Low Season</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
            <span className="text-slate-700">Mid Season</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
            <span className="text-slate-700">High Season</span>
          </div>
        </div>
      </div>
    </div>
  );
}
