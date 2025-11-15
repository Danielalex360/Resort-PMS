import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { computeMonthlyForecast } from '../utils/forecastEngine';
import {
  revenueByRoomType,
  seasonMix,
  avgPackageProfitByMonth,
  dailyOccupancy,
} from '../utils/analyticsQueries';
import { TrendingUp, DollarSign, Calendar, RefreshCw, Download } from 'lucide-react';

export function Dashboard({ resortId }: { resortId: string }) {
  const [forecast, setForecast] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [seasonData, setSeasonData] = useState<any[]>([]);
  const [profitByMonth, setProfitByMonth] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [resortId]);

  const loadDashboard = async () => {
    setLoading(true);
    await Promise.all([
      loadForecast(),
      loadRevenueByRoomType(),
      loadSeasonMix(),
      loadProfitByMonth(),
      loadOccupancy(),
    ]);
    setLoading(false);
  };

  const loadForecast = async () => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const result = await computeMonthlyForecast({
      supabase,
      resort_id: resortId,
      month: monthKey,
    });
    setForecast(result);
  };

  const loadRevenueByRoomType = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const data = await revenueByRoomType({
      supabase,
      resort_id: resortId,
      start: monthStart.toISOString().slice(0, 10),
      end: monthEnd.toISOString().slice(0, 10),
    });
    setRevenueData(data);
  };

  const loadSeasonMix = async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 90);

    const data = await seasonMix({
      supabase,
      resort_id: resortId,
      start: start.toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    });
    setSeasonData(data);
  };

  const loadProfitByMonth = async () => {
    const data = await avgPackageProfitByMonth({
      supabase,
      resort_id: resortId,
      year: new Date().getFullYear(),
    });
    setProfitByMonth(data);
  };

  const loadOccupancy = async () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 60);

    const data = await dailyOccupancy({
      supabase,
      resort_id: resortId,
      start: start.toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    });
    setOccupancyData(data);
  };

  const exportDashboard = () => {
    const csvData = [
      ['Resort Dashboard Export'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Monthly Forecast'],
      ['Metric', 'Value'],
      ['Total Bookings', forecast?.totalBookings || 0],
      ['Total Revenue', `RM ${forecast?.revenue?.toFixed(2) || 0}`],
      ['Total Profit', `RM ${forecast?.profit?.toFixed(2) || 0}`],
      ['Net Profit', `RM ${forecast?.netProfit?.toFixed(2) || 0}`],
      ['Avg Profit/Booking', `RM ${forecast?.avgProfitPerBooking?.toFixed(2) || 0}`],
      ['Breakeven Bookings', forecast?.breakevenBookings || 0],
      [''],
      ['Revenue by Room Type'],
      ['Room Type', 'Revenue'],
      ...revenueData.map((r) => [r.room_type, `RM ${r.revenue.toFixed(2)}`]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const maxRevenue = Math.max(...revenueData.map((r) => r.revenue), 1);
  const totalSeasonBookings = seasonData.reduce((sum, s) => sum + s.bookings, 1);
  const maxProfit = Math.max(...profitByMonth.map((p) => p.avg_profit), 1);
  const maxOccupancy = Math.max(...occupancyData.map((o) => o.occupancy_pct), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Overview and analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportDashboard}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Refresh Forecast
          </button>
        </div>
      </div>

      {forecast && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={20} className="text-emerald-600" />
                <div className="text-sm text-slate-600">Revenue</div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                RM {forecast.revenue.toFixed(0)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-blue-600" />
                <div className="text-sm text-slate-600">Net Profit</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                RM {forecast.netProfit.toFixed(0)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={20} className="text-purple-600" />
                <div className="text-sm text-slate-600">Bookings</div>
              </div>
              <div className="text-2xl font-bold text-purple-600">{forecast.totalBookings}</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={20} className="text-yellow-600" />
                <div className="text-sm text-slate-600">Avg Profit</div>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                RM {forecast.avgProfitPerBooking.toFixed(0)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-red-600" />
                <div className="text-sm text-slate-600">Breakeven</div>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {forecast.breakevenBookings} bookings
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Occupancy Projections</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                <div className="text-center mb-2">
                  <div className="text-2xl font-bold text-slate-900">50%</div>
                  <div className="text-xs text-slate-600">Occupancy</div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-xl font-bold ${
                      forecast.projection50 >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    RM {forecast.projection50.toFixed(0)}
                  </div>
                  <div className="text-xs text-slate-600">Net Profit</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
                <div className="text-center mb-2">
                  <div className="text-2xl font-bold text-slate-900">75%</div>
                  <div className="text-xs text-slate-600">Occupancy</div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-xl font-bold ${
                      forecast.projection75 >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    RM {forecast.projection75.toFixed(0)}
                  </div>
                  <div className="text-xs text-slate-600">Net Profit</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                <div className="text-center mb-2">
                  <div className="text-2xl font-bold text-slate-900">100%</div>
                  <div className="text-xs text-slate-600">Occupancy</div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-xl font-bold ${
                      forecast.projection100 >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    RM {forecast.projection100.toFixed(0)}
                  </div>
                  <div className="text-xs text-slate-600">Net Profit</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Revenue by Room Type (Current Month)
          </h3>
          <div className="space-y-3">
            {revenueData.map((item) => (
              <div key={item.room_type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.room_type}</span>
                  <span className="text-sm font-semibold text-emerald-600">
                    RM {item.revenue.toFixed(0)}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Season Mix (Last 90 Days)
          </h3>
          <div className="space-y-3">
            {seasonData.map((item) => (
              <div key={item.season}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 capitalize">
                    {item.season} Season
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {item.bookings} ({((item.bookings / totalSeasonBookings) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.season === 'low'
                        ? 'bg-blue-500'
                        : item.season === 'high'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${(item.bookings / totalSeasonBookings) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Avg Package Profit by Month
          </h3>
          <div className="h-48 flex items-end justify-between gap-1">
            {profitByMonth.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-green-400 rounded-t transition-all"
                  style={{ height: `${(item.avg_profit / maxProfit) * 100}%`, minHeight: '4px' }}
                />
                <div className="text-xs text-slate-600 mt-2">{item.monthName}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Daily Occupancy (Last 60 Days)
          </h3>
          <div className="h-48 relative">
            <div className="absolute inset-0 flex items-end">
              <div className="w-full h-full flex items-end gap-px">
                {occupancyData.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col justify-end">
                    <div
                      className={`w-full rounded-t transition-all ${
                        item.occupancy_pct >= 75
                          ? 'bg-emerald-500'
                          : item.occupancy_pct >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ height: `${item.occupancy_pct}%`, minHeight: '2px' }}
                      title={`${item.date}: ${item.occupancy_pct}%`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full border-t border-slate-200" />
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-slate-600">
            <span>60 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
