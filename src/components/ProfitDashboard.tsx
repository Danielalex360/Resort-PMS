import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';

export function ProfitDashboard({ resortId }: { resortId: string }) {
  const [monthlyOverhead, setMonthlyOverhead] = useState(77000);
  const [avgPackagePrice, setAvgPackagePrice] = useState(1500);
  const [avgProfitMargin, setAvgProfitMargin] = useState(25);
  const [totalRooms, setTotalRooms] = useState(10);
  const [stats, setStats] = useState({
    currentMonthRevenue: 0,
    currentMonthProfit: 0,
    currentMonthBookings: 0,
    ytdRevenue: 0,
    ytdProfit: 0,
    ytdBookings: 0,
  });

  useEffect(() => {
    loadStats();
    loadOverhead();
  }, [resortId]);

  const loadStats = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const { data: monthData } = await supabase
      .from('bookings')
      .select('price_total, profit_total')
      .eq('resort_id', resortId)
      .gte('check_in', monthStart.toISOString().slice(0, 10))
      .in('status', ['confirmed', 'pending']);

    const { data: yearData } = await supabase
      .from('bookings')
      .select('price_total, profit_total')
      .eq('resort_id', resortId)
      .gte('check_in', yearStart.toISOString().slice(0, 10))
      .in('status', ['confirmed', 'pending']);

    setStats({
      currentMonthRevenue: monthData?.reduce((sum, b) => sum + (b.price_total || 0), 0) || 0,
      currentMonthProfit: monthData?.reduce((sum, b) => sum + (b.profit_total || 0), 0) || 0,
      currentMonthBookings: monthData?.length || 0,
      ytdRevenue: yearData?.reduce((sum, b) => sum + (b.price_total || 0), 0) || 0,
      ytdProfit: yearData?.reduce((sum, b) => sum + (b.profit_total || 0), 0) || 0,
      ytdBookings: yearData?.length || 0,
    });
  };

  const loadOverhead = async () => {
    const now = new Date();
    const monthKey = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data } = await supabase
      .from('overheads')
      .select('overhead_monthly')
      .eq('resort_id', resortId)
      .eq('month', monthKey.toISOString().slice(0, 10))
      .maybeSingle();

    if (data) {
      setMonthlyOverhead(data.overhead_monthly);
    }

    const { data: roomData } = await supabase
      .from('room_types')
      .select('id')
      .eq('resort_id', resortId)
      .eq('is_active', true);

    setTotalRooms(roomData?.length || 10);
  };

  const calculateProjections = () => {
    const avgCost = avgPackagePrice * (1 - avgProfitMargin / 100);
    const profitPerPackage = avgPackagePrice - avgCost;

    const breakevenPackages = Math.ceil(monthlyOverhead / profitPerPackage);

    const daysInMonth = 30;
    const totalRoomDays = totalRooms * daysInMonth;

    const projections = [
      { occupancy: 50, packages: Math.floor(totalRoomDays * 0.5) },
      { occupancy: 75, packages: Math.floor(totalRoomDays * 0.75) },
      { occupancy: 100, packages: totalRoomDays },
    ];

    return projections.map((proj) => ({
      ...proj,
      revenue: proj.packages * avgPackagePrice,
      cost: proj.packages * avgCost + monthlyOverhead,
      profit: proj.packages * profitPerPackage - monthlyOverhead,
    }));
  };

  const projections = calculateProjections();
  const avgCost = avgPackagePrice * (1 - avgProfitMargin / 100);
  const profitPerPackage = avgPackagePrice - avgCost;
  const breakevenPackages = Math.ceil(monthlyOverhead / profitPerPackage);
  const breakevenOccupancy = (
    (breakevenPackages / (totalRooms * 30)) *
    100
  ).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="text-emerald-600" size={28} />
          <h2 className="text-2xl font-bold text-slate-900">Profit Projection Dashboard</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-6 border border-emerald-200">
            <div className="text-sm text-slate-600 mb-2">Current Month Revenue</div>
            <div className="text-3xl font-bold text-emerald-600">
              RM {stats.currentMonthRevenue.toFixed(0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.currentMonthBookings} bookings
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
            <div className="text-sm text-slate-600 mb-2">Current Month Profit</div>
            <div className="text-3xl font-bold text-blue-600">
              RM {stats.currentMonthProfit.toFixed(0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              After overhead: RM {(stats.currentMonthProfit - monthlyOverhead).toFixed(0)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
            <div className="text-sm text-slate-600 mb-2">YTD Performance</div>
            <div className="text-3xl font-bold text-purple-600">
              RM {stats.ytdRevenue.toFixed(0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Profit: RM {stats.ytdProfit.toFixed(0)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Input Parameters</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Monthly Overhead (RM)
              </label>
              <input
                type="number"
                step="100"
                value={monthlyOverhead}
                onChange={(e) => setMonthlyOverhead(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Average Package Price (RM)
              </label>
              <input
                type="number"
                step="10"
                value={avgPackagePrice}
                onChange={(e) => setAvgPackagePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Average Profit Margin (%)
              </label>
              <input
                type="number"
                step="1"
                value={avgProfitMargin}
                onChange={(e) => setAvgProfitMargin(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Total Rooms
              </label>
              <input
                type="number"
                step="1"
                value={totalRooms}
                onChange={(e) => setTotalRooms(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Breakeven Analysis</h3>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <Target className="text-orange-600" size={24} />
                <div className="text-sm font-medium text-slate-700">Breakeven Point</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Packages needed:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {breakevenPackages}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Occupancy required:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {breakevenOccupancy}%
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                  <span className="text-slate-600">Profit per package:</span>
                  <span className="text-lg font-semibold text-slate-900">
                    RM {profitPerPackage.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="font-medium text-slate-900">Quick Stats</div>
              <div className="flex justify-between">
                <span className="text-slate-600">Avg Cost per Package:</span>
                <span className="font-medium">RM {avgCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Avg Price per Package:</span>
                <span className="font-medium">RM {avgPackagePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Monthly Room-Days:</span>
                <span className="font-medium">{totalRooms * 30}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Occupancy Projections</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projections.map((proj) => (
              <div
                key={proj.occupancy}
                className={`rounded-lg p-6 border-2 ${
                  proj.profit >= 0
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-slate-900">{proj.occupancy}%</div>
                  <div className="text-sm text-slate-600">Occupancy</div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Packages:</span>
                    <span className="font-semibold">{proj.packages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Revenue:</span>
                    <span className="font-semibold text-emerald-600">
                      RM {proj.revenue.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Cost:</span>
                    <span className="font-semibold text-red-600">
                      RM {proj.cost.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-300">
                    <span className="text-slate-900 font-medium">Net Profit:</span>
                    <span
                      className={`font-bold text-lg ${
                        proj.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      RM {proj.profit.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="text-emerald-600" size={28} />
          <h3 className="text-xl font-bold text-slate-900">Visual Breakdown</h3>
        </div>

        <div className="space-y-6">
          {projections.map((proj) => (
            <div key={proj.occupancy}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {proj.occupancy}% Occupancy
                </span>
                <span className="text-sm text-slate-600">
                  Net: RM {proj.profit.toFixed(0)}
                </span>
              </div>
              <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-emerald-500"
                  style={{
                    width: `${(proj.revenue / (proj.revenue + proj.cost)) * 100}%`,
                  }}
                >
                  <div className="flex items-center justify-center h-full text-xs text-white font-medium">
                    Revenue
                  </div>
                </div>
                <div
                  className="absolute top-0 right-0 h-full bg-red-500"
                  style={{
                    width: `${(proj.cost / (proj.revenue + proj.cost)) * 100}%`,
                  }}
                >
                  <div className="flex items-center justify-center h-full text-xs text-white font-medium">
                    Cost + Overhead
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
