import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileText, Download, Calendar, TrendingUp, DollarSign,
  Users, Bed, Activity, UtensilsCrossed, Ship, XCircle
} from 'lucide-react';

interface ReportsPageProps {
  resortId: string;
}

export function ReportsPage({ resortId }: ReportsPageProps) {
  const [activeReport, setActiveReport] = useState<string>('room-sales');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ytdStats, setYtdStats] = useState<any>(null);

  useEffect(() => {
    loadYTDStats();
  }, [resortId]);

  useEffect(() => {
    if (activeReport) {
      loadReportData();
    }
  }, [activeReport, dateRange]);

  const loadYTDStats = async () => {
    const { data, error } = await supabase.rpc('calculate_ytd_stats', {
      p_resort_id: resortId,
      p_current_date: new Date().toISOString().slice(0, 10),
    });

    if (!error && data && data.length > 0) {
      setYtdStats(data[0]);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      switch (activeReport) {
        case 'room-sales':
          await loadRoomSalesReport();
          break;
        case 'daily-revenue':
          await loadDailyRevenueReport();
          break;
        case 'collection':
          await loadCollectionReport();
          break;
        case 'cancellations':
          await loadCancellationsReport();
          break;
        case 'no-shows':
          await loadNoShowsReport();
          break;
        default:
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRoomSalesReport = async () => {
    const { data, error } = await supabase.rpc('get_room_sales_report', {
      p_resort_id: resortId,
      p_start_date: dateRange.start,
      p_end_date: dateRange.end,
    });

    if (!error) {
      setReportData(data);
    }
  };

  const loadDailyRevenueReport = async () => {
    const { data, error } = await supabase.rpc('get_daily_revenue_report', {
      p_resort_id: resortId,
      p_report_date: dateRange.end,
    });

    if (!error) {
      setReportData(data);
    }
  };

  const loadCollectionReport = async () => {
    const { data, error } = await supabase.rpc('get_collection_report', {
      p_resort_id: resortId,
      p_start_date: dateRange.start,
      p_end_date: dateRange.end,
    });

    if (!error) {
      setReportData(data);
    }
  };

  const loadCancellationsReport = async () => {
    const { data, error } = await supabase
      .from('cancellation_logs')
      .select('*, bookings(*)')
      .eq('resort_id', resortId)
      .gte('cancelled_at', dateRange.start)
      .lte('cancelled_at', dateRange.end)
      .order('cancelled_at', { ascending: false });

    if (!error) {
      setReportData(data);
    }
  };

  const loadNoShowsReport = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('resort_id', resortId)
      .eq('status', 'no-show')
      .gte('check_in', dateRange.start)
      .lte('check_in', dateRange.end)
      .order('check_in', { ascending: false });

    if (!error) {
      setReportData(data);
    }
  };

  const reportTypes = [
    { id: 'room-sales', name: 'Room Sales Report', icon: Bed },
    { id: 'daily-revenue', name: 'Daily Revenue Report', icon: DollarSign },
    { id: 'collection', name: 'Collection Report', icon: TrendingUp },
    { id: 'cancellations', name: 'Cancellations & Refunds', icon: XCircle },
    { id: 'no-shows', name: 'No-Show Report', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Download size={18} />
          Export PDF
        </button>
      </div>

      {ytdStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">YTD Revenue</span>
              <DollarSign className="text-emerald-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              RM {parseFloat(ytdStats.ytd_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              LYTD: RM {parseFloat(ytdStats.lytd_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">YTD ADR</span>
              <Bed className="text-blue-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              RM {parseFloat(ytdStats.ytd_adr || 0).toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {ytdStats.ytd_nights} nights sold
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">MoM Growth</span>
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div className={`text-2xl font-bold ${parseFloat(ytdStats.mom_revenue_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(ytdStats.mom_revenue_change || 0) >= 0 ? '+' : ''}
              {parseFloat(ytdStats.mom_revenue_change || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Month on Month</div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">WoW Growth</span>
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <div className={`text-2xl font-bold ${parseFloat(ytdStats.wow_revenue_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(ytdStats.wow_revenue_change || 0) >= 0 ? '+' : ''}
              {parseFloat(ytdStats.wow_revenue_change || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Week on Week</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setActiveReport(type.id)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      activeReport === type.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon size={16} />
                    {type.name}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading report...</div>
          ) : !reportData || reportData.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No data available for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeReport === 'room-sales' && (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Room Type</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Revenue</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Nights Sold</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">ADR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-900">{row.room_type_name}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          RM {parseFloat(row.total_revenue || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.nights_sold}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          RM {parseFloat(row.adr || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">
                        RM {reportData.reduce((sum: number, row: any) => sum + parseFloat(row.total_revenue || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reportData.reduce((sum: number, row: any) => sum + parseInt(row.nights_sold || 0), 0)}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              )}

              {activeReport === 'daily-revenue' && (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-900">{row.category}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          RM {parseFloat(row.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeReport === 'collection' && (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Payment Method</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Transactions</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-900 capitalize">{row.payment_method.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.transaction_count}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          RM {parseFloat(row.total_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">
                        {reportData.reduce((sum: number, row: any) => sum + parseInt(row.transaction_count || 0), 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        RM {reportData.reduce((sum: number, row: any) => sum + parseFloat(row.total_amount || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {activeReport === 'cancellations' && (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Guest</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Reason</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Original Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Refund</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-900">{row.bookings?.guest_name}</td>
                        <td className="px-4 py-3 text-slate-700 capitalize">{row.cancellation_reason.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          RM {parseFloat(row.original_total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">
                          RM {parseFloat(row.refund_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {new Date(row.cancelled_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeReport === 'no-shows' && (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Guest</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Check-in</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Booking Value</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-900">{row.guest_name}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(row.check_in).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          RM {parseFloat(row.price_total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          RM {parseFloat(row.paid_total || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
