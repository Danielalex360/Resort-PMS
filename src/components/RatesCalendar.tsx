import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  generateDateRange,
  getRatesForDateRange,
  getSeasonColorClass,
} from '../utils/ratesHelpers';
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { AdjustPriceModal } from './AdjustPriceModal';

export function RatesCalendar({ resortId }: { resortId: string }) {
  const [viewDays, setViewDays] = useState<7 | 14 | 31>(31);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all');
  const [ratesData, setRatesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<any>(null);

  useEffect(() => {
    loadRoomTypes();
  }, [resortId]);

  useEffect(() => {
    loadRates();
  }, [resortId, currentDate, viewDays, selectedRoomType]);

  const loadRoomTypes = async () => {
    const { data } = await supabase
      .from('room_types')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('order_index');

    setRoomTypes(data || []);
  };

  const loadRates = async () => {
    setLoading(true);

    const startDate = currentDate.toISOString().slice(0, 10);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + viewDays - 1);
    const endDateStr = endDate.toISOString().slice(0, 10);

    const roomTypeIds =
      selectedRoomType === 'all'
        ? roomTypes.map((rt) => rt.id)
        : [selectedRoomType];

    if (roomTypeIds.length > 0) {
      const data = await getRatesForDateRange({
        supabase,
        resort_id: resortId,
        room_type_ids: roomTypeIds,
        startDate,
        endDate: endDateStr,
      });

      setRatesData(data);
    }

    setLoading(false);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleCellClick = (roomTypeId: string, date: string, rateData: any) => {
    const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
    setSelectedCell({
      roomTypeId,
      roomTypeName: roomType?.name,
      date,
      rateData,
    });
    setShowAdjustModal(true);
  };

  const dates = generateDateRange(currentDate.toISOString().slice(0, 10), viewDays);

  const filteredRoomTypes =
    selectedRoomType === 'all'
      ? roomTypes
      : roomTypes.filter((rt) => rt.id === selectedRoomType);

  return (
    <div className="max-w-full mx-auto px-4 space-y-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Rates Calendar</h2>
              <p className="text-slate-600">Daily rate management and restrictions</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
              <select
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Room Types</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">View</label>
              <div className="flex gap-1 border border-slate-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewDays(7)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewDays === 7
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setViewDays(14)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-x border-slate-300 ${
                    viewDays === 14
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  14 Days
                </button>
                <button
                  onClick={() => setViewDays(31)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewDays === 31
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  31 Days
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Previous Week"
            >
              <ChevronsLeft size={20} />
            </button>
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Next Day"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Next Week"
            >
              <ChevronsRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-50 border border-green-200"></div>
              <span className="text-slate-700">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-50 border border-blue-200"></div>
              <span className="text-slate-700">Mid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-50 border border-red-200"></div>
              <span className="text-slate-700">High</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading rates...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-700 sticky left-0 bg-slate-100 z-10">
                    Room Type
                  </th>
                  {dates.map((date) => {
                    const d = new Date(date);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = d.getDate();
                    const monthName = d.toLocaleDateString('en-US', { month: 'short' });

                    return (
                      <th
                        key={date}
                        className="border border-slate-300 px-2 py-2 text-center text-xs min-w-[80px]"
                      >
                        <div className="font-semibold text-slate-900">{dayName}</div>
                        <div className="text-slate-600">
                          {monthName} {dayNum}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRoomTypes.map((roomType) => {
                  const roomRates = ratesData.find((rd) => rd.room_type_id === roomType.id);

                  return (
                    <tr key={roomType.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-medium text-slate-900 sticky left-0 bg-white z-10">
                        {roomType.name}
                      </td>
                      {dates.map((date) => {
                        const rateData = roomRates?.rates?.find((r: any) => r.date === date);

                        if (!rateData) {
                          return (
                            <td key={date} className="border border-slate-300 px-2 py-2 text-center">
                              <div className="text-xs text-slate-400">N/A</div>
                            </td>
                          );
                        }

                        const seasonClass = getSeasonColorClass(rateData.season);
                        const restriction = rateData.restriction;

                        return (
                          <td
                            key={date}
                            className={`border border-slate-300 px-2 py-2 cursor-pointer hover:ring-2 hover:ring-emerald-500 ${seasonClass}`}
                            onClick={() => handleCellClick(roomType.id, date, rateData)}
                          >
                            <div className="text-center">
                              <div className="text-sm font-semibold text-slate-900">
                                RM {rateData.price.toFixed(0)}
                              </div>
                              {rateData.overrideApplied && (
                                <div className="text-xs text-blue-600">Override</div>
                              )}
                              <div className="flex flex-wrap gap-1 justify-center mt-1">
                                {restriction.is_closed && (
                                  <span className="px-1 py-0.5 bg-red-600 text-white text-xs rounded">
                                    Closed
                                  </span>
                                )}
                                {restriction.close_to_arrival && (
                                  <span className="px-1 py-0.5 bg-orange-600 text-white text-xs rounded">
                                    CTA
                                  </span>
                                )}
                                {restriction.close_to_departure && (
                                  <span className="px-1 py-0.5 bg-orange-600 text-white text-xs rounded">
                                    CTD
                                  </span>
                                )}
                                {restriction.min_los && (
                                  <span className="px-1 py-0.5 bg-purple-600 text-white text-xs rounded">
                                    {restriction.min_los}N+
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRoomTypes.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No room types found
              </div>
            )}
          </div>
        )}
      </div>

      {showAdjustModal && selectedCell && (
        <AdjustPriceModal
          resortId={resortId}
          roomTypes={roomTypes}
          selectedCell={selectedCell}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedCell(null);
          }}
          onSaved={() => {
            loadRates();
            setShowAdjustModal(false);
            setSelectedCell(null);
          }}
        />
      )}
    </div>
  );
}
