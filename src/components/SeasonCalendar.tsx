import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Lock, Unlock, Save, Trash2 } from 'lucide-react';

type Season = 'low' | 'mid' | 'high';

interface SeasonAssignment {
  date: string;
  season: Season;
  is_holiday: boolean;
  locked?: boolean;
}

interface SeasonSettings {
  mult_low: number;
  mult_mid: number;
  mult_high: number;
  surcharge_weekend_pct: number;
  surcharge_holiday_pct: number;
  profit_margin_pct: number;
}

export function SeasonCalendar({ resortId }: { resortId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewDays, setViewDays] = useState<7 | 14 | 31>(31);
  const [assignments, setAssignments] = useState<Map<string, SeasonAssignment>>(new Map());
  const [settings, setSettings] = useState<Partial<SeasonSettings>>({
    mult_low: 0.9,
    mult_mid: 1.0,
    mult_high: 1.3,
    surcharge_weekend_pct: 5,
    surcharge_holiday_pct: 15,
    profit_margin_pct: 25,
  });
  const [selectedSeason, setSelectedSeason] = useState<Season>('mid');
  const [isPainting, setIsPainting] = useState(false);
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [resortId, currentMonth, viewDays]);

  const loadData = async () => {
    const startDate = new Date(currentMonth);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + viewDays);

    const { data: ssData } = await supabase
      .from('season_settings')
      .select('*')
      .eq('resort_id', resortId)
      .maybeSingle();

    if (ssData) {
      setSettings(ssData);
    }

    const { data: assignData } = await supabase
      .from('season_assignments')
      .select('*')
      .eq('resort_id', resortId)
      .gte('date', startDate.toISOString().slice(0, 10))
      .lte('date', endDate.toISOString().slice(0, 10));

    const assignMap = new Map<string, SeasonAssignment>();
    assignData?.forEach((a) => {
      assignMap.set(a.date, {
        date: a.date,
        season: a.season,
        is_holiday: a.is_holiday,
      });
    });
    setAssignments(assignMap);
  };

  const getDatesArray = () => {
    const dates: Date[] = [];
    const start = new Date(currentMonth);
    start.setDate(1);
    for (let i = 0; i < viewDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getSeasonColor = (season: Season) => {
    switch (season) {
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'mid':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800';
    }
  };

  const handleDateClick = (dateStr: string) => {
    if (lockedDates.has(dateStr)) return;

    const newAssignments = new Map(assignments);
    const existing = newAssignments.get(dateStr);
    newAssignments.set(dateStr, {
      date: dateStr,
      season: selectedSeason,
      is_holiday: existing?.is_holiday || false,
    });
    setAssignments(newAssignments);
  };

  const handleDateEnter = (dateStr: string) => {
    if (isPainting && !lockedDates.has(dateStr)) {
      handleDateClick(dateStr);
    }
  };

  const toggleHoliday = (dateStr: string) => {
    if (lockedDates.has(dateStr)) return;

    const newAssignments = new Map(assignments);
    const existing = newAssignments.get(dateStr) || {
      date: dateStr,
      season: 'mid' as Season,
      is_holiday: false,
    };
    newAssignments.set(dateStr, {
      ...existing,
      is_holiday: !existing.is_holiday,
    });
    setAssignments(newAssignments);
  };

  const toggleLockDate = (dateStr: string) => {
    const newLocked = new Set(lockedDates);
    if (newLocked.has(dateStr)) {
      newLocked.delete(dateStr);
    } else {
      newLocked.add(dateStr);
    }
    setLockedDates(newLocked);
  };

  const bulkFill = (season: Season) => {
    const dates = getDatesArray();
    const newAssignments = new Map(assignments);
    dates.forEach((date) => {
      const dateStr = date.toISOString().slice(0, 10);
      if (!lockedDates.has(dateStr)) {
        const existing = newAssignments.get(dateStr);
        newAssignments.set(dateStr, {
          date: dateStr,
          season,
          is_holiday: existing?.is_holiday || false,
        });
      }
    });
    setAssignments(newAssignments);
  };

  const clearAll = () => {
    const dates = getDatesArray();
    const newAssignments = new Map(assignments);
    dates.forEach((date) => {
      const dateStr = date.toISOString().slice(0, 10);
      if (!lockedDates.has(dateStr)) {
        newAssignments.delete(dateStr);
      }
    });
    setAssignments(newAssignments);
  };

  const handleSave = async () => {
    setLoading(true);

    const updates = Array.from(assignments.values()).map((a) => ({
      resort_id: resortId,
      date: a.date,
      season: a.season,
      is_holiday: a.is_holiday,
    }));

    for (const update of updates) {
      await supabase
        .from('season_assignments')
        .upsert(update, { onConflict: 'resort_id,date' });
    }

    const { data: ssSetting } = await supabase
      .from('season_settings')
      .select('id')
      .eq('resort_id', resortId)
      .maybeSingle();

    if (ssSetting) {
      await supabase.from('season_settings').update(settings).eq('id', ssSetting.id);
    } else {
      await supabase.from('season_settings').insert({ ...settings, resort_id: resortId });
    }

    setLoading(false);
    alert('Season assignments saved successfully!');
  };

  const dates = getDatesArray();

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-600" size={28} />
            <h2 className="text-2xl font-bold text-slate-900">Season Calendar</h2>
          </div>

          <div className="flex gap-2">
            {[7, 14, 31].map((days) => (
              <button
                key={days}
                onClick={() => setViewDays(days as 7 | 14 | 31)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewDays === days
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Low Season Multiplier
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.mult_low || ''}
              onChange={(e) => setSettings({ ...settings, mult_low: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mid Season Multiplier
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.mult_mid || ''}
              onChange={(e) => setSettings({ ...settings, mult_mid: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              High Season Multiplier
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.mult_high || ''}
              onChange={(e) => setSettings({ ...settings, mult_high: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Holiday Surcharge (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.surcharge_holiday_pct || ''}
              onChange={(e) =>
                setSettings({ ...settings, surcharge_holiday_pct: parseFloat(e.target.value) })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            <span className="text-sm font-medium text-slate-700">Paint:</span>
            {(['low', 'mid', 'high'] as const).map((season) => (
              <button
                key={season}
                onClick={() => setSelectedSeason(season)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors border-2 ${
                  selectedSeason === season
                    ? getSeasonColor(season) + ' ring-2 ring-emerald-500'
                    : getSeasonColor(season)
                }`}
              >
                {season.charAt(0).toUpperCase() + season.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => bulkFill(selectedSeason)}
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              Fill All
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <input
              type="month"
              value={`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <div className="text-sm text-slate-600">
              Click to paint, drag to paint multiple. Right-click to mark as holiday.
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dates.map((date) => {
              const dateStr = date.toISOString().slice(0, 10);
              const assignment = assignments.get(dateStr);
              const isLocked = lockedDates.has(dateStr);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={dateStr}
                  onMouseDown={() => setIsPainting(true)}
                  onMouseUp={() => setIsPainting(false)}
                  onMouseEnter={() => handleDateEnter(dateStr)}
                  onClick={() => handleDateClick(dateStr)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleHoliday(dateStr);
                  }}
                  className={`relative p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    assignment ? getSeasonColor(assignment.season) : 'bg-white border-slate-200'
                  } ${isLocked ? 'opacity-50' : 'hover:ring-2 hover:ring-emerald-500'} ${
                    isWeekend ? 'ring-1 ring-slate-300' : ''
                  }`}
                >
                  <div className="text-xs font-semibold mb-1">
                    {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </div>
                  {assignment && (
                    <div className="text-xs font-medium">
                      {assignment.season.toUpperCase()}
                    </div>
                  )}
                  {assignment?.is_holiday && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLockDate(dateStr);
                    }}
                    className="absolute bottom-1 right-1 p-1 hover:bg-white rounded"
                  >
                    {isLocked ? <Lock size={12} /> : <Unlock size={12} className="opacity-0 group-hover:opacity-100" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save All Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}
