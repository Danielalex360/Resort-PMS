import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  bulkApplyOverrides,
  bulkApplyRestrictions,
  filterDatesByWeekdays,
  generateDateRange,
  getRestriction,
} from '../utils/ratesHelpers';
import { X } from 'lucide-react';

export function AdjustPriceModal({
  resortId,
  roomTypes,
  selectedCell,
  onClose,
  onSaved,
}: any) {
  const [priceAdjustType, setPriceAdjustType] = useState<'set' | 'delta_amount' | 'delta_percent'>('set');
  const [priceValue, setPriceValue] = useState<number>(0);
  const [restrictions, setRestrictions] = useState({
    is_closed: false,
    close_to_arrival: false,
    close_to_departure: false,
    min_los: null as number | null,
    max_los: null as number | null,
    min_advance_days: null as number | null,
    max_advance_days: null as number | null,
  });
  const [applyPrice, setApplyPrice] = useState(true);
  const [applyRestrictions, setApplyRestrictions] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [dateFrom, setDateFrom] = useState(selectedCell.date);
  const [dateUntil, setDateUntil] = useState(selectedCell.date);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([selectedCell.roomTypeId]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentRestrictions();
  }, []);

  const loadCurrentRestrictions = async () => {
    const restriction = await getRestriction({
      supabase,
      resort_id: resortId,
      room_type_id: selectedCell.roomTypeId,
      date: selectedCell.date,
    });

    setRestrictions({
      is_closed: restriction.is_closed || false,
      close_to_arrival: restriction.close_to_arrival || false,
      close_to_departure: restriction.close_to_departure || false,
      min_los: restriction.min_los,
      max_los: restriction.max_los,
      min_advance_days: restriction.min_advance_days,
      max_advance_days: restriction.max_advance_days,
    });

    if (selectedCell.rateData) {
      setPriceValue(selectedCell.rateData.price);
    }
  };

  const toggleWeekday = (day: number) => {
    if (weekdays.includes(day)) {
      setWeekdays(weekdays.filter((d) => d !== day));
    } else {
      setWeekdays([...weekdays, day].sort());
    }
  };

  const selectAllWeekdays = () => {
    setWeekdays([1, 2, 3, 4, 5, 6, 7]);
  };

  const toggleRoomType = (roomTypeId: string) => {
    if (selectedRoomTypes.includes(roomTypeId)) {
      setSelectedRoomTypes(selectedRoomTypes.filter((id) => id !== roomTypeId));
    } else {
      setSelectedRoomTypes([...selectedRoomTypes, roomTypeId]);
    }
  };

  const handleApply = async () => {
    setLoading(true);

    const start = new Date(dateFrom);
    const end = new Date(dateUntil);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const allDates = generateDateRange(dateFrom, daysDiff);
    const filteredDates = filterDatesByWeekdays(allDates, weekdays);

    let overrideCount = 0;
    let restrictionCount = 0;

    if (applyPrice && priceValue > 0) {
      const result = await bulkApplyOverrides({
        supabase,
        resort_id: resortId,
        room_type_ids: selectedRoomTypes,
        dates: filteredDates,
        override_type: priceAdjustType,
        value: priceValue,
        note: null,
        created_by: null,
      });
      overrideCount = result.count;
    }

    if (applyRestrictions) {
      const result = await bulkApplyRestrictions({
        supabase,
        resort_id: resortId,
        room_type_ids: selectedRoomTypes,
        dates: filteredDates,
        restrictions,
      });
      restrictionCount = result.count;
    }

    alert(`Saved! Overrides: ${overrideCount} • Restrictions: ${restrictionCount}`);
    onSaved();
    setLoading(false);
  };

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Adjust Rate & Restrictions</h2>
            <p className="text-sm text-slate-600">
              {selectedCell.roomTypeName} • {selectedCell.date}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Restrictions</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restrictions.is_closed}
                    onChange={(e) =>
                      setRestrictions({ ...restrictions, is_closed: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Closed</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restrictions.close_to_arrival}
                    onChange={(e) =>
                      setRestrictions({ ...restrictions, close_to_arrival: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Close to Arrival</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restrictions.close_to_departure}
                    onChange={(e) =>
                      setRestrictions({ ...restrictions, close_to_departure: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Close to Departure</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Min LOS (nights)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restrictions.min_los ?? ''}
                    onChange={(e) =>
                      setRestrictions({
                        ...restrictions,
                        min_los: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max LOS (nights)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restrictions.max_los ?? ''}
                    onChange={(e) =>
                      setRestrictions({
                        ...restrictions,
                        max_los: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Min Advance (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={restrictions.min_advance_days ?? ''}
                    onChange={(e) =>
                      setRestrictions({
                        ...restrictions,
                        min_advance_days: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Advance (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={restrictions.max_advance_days ?? ''}
                    onChange={(e) =>
                      setRestrictions({
                        ...restrictions,
                        max_advance_days: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">ADJUST PRICE</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={priceAdjustType}
                    onChange={(e) => setPriceAdjustType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="set">Set to RM</option>
                    <option value="delta_amount">+ / - RM</option>
                    <option value="delta_percent">+ / - %</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {priceAdjustType === 'set' && 'Set to (RM)'}
                    {priceAdjustType === 'delta_amount' && 'Amount (RM)'}
                    {priceAdjustType === 'delta_percent' && 'Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceValue}
                    onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  {priceAdjustType !== 'set' && (
                    <div className="text-xs text-slate-500 mt-1">
                      Use negative values to decrease
                    </div>
                  )}
                </div>

                {selectedCell.rateData && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                    <div className="font-medium text-blue-900 mb-1">Current Rate:</div>
                    <div className="text-blue-700">
                      Base: RM {selectedCell.rateData.base.toFixed(2)} × {selectedCell.rateData.season} = RM {selectedCell.rateData.seasonPrice.toFixed(2)}
                    </div>
                    {selectedCell.rateData.overrideApplied && (
                      <div className="text-blue-700 mt-1">
                        Override: RM {selectedCell.rateData.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">REPEAT ON DATES</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyPrice}
                    onChange={(e) => setApplyPrice(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Apply Price</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyRestrictions}
                    onChange={(e) => setApplyRestrictions(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Apply Restrictions</span>
                </label>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Weekdays</label>
                    <button
                      onClick={selectAllWeekdays}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {weekdayNames.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => toggleWeekday(i + 1)}
                        className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                          weekdays.includes(i + 1)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Until Date</label>
                  <input
                    type="date"
                    value={dateUntil}
                    onChange={(e) => setDateUntil(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Room Types</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-300 rounded-lg p-2">
                    {roomTypes.map((rt: any) => (
                      <label key={rt.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRoomTypes.includes(rt.id)}
                          onChange={() => toggleRoomType(rt.id)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-700">{rt.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={loading || selectedRoomTypes.length === 0}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Applying...' : 'SET'}
          </button>
        </div>
      </div>
    </div>
  );
}
