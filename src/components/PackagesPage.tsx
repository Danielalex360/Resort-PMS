import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { buildPackagesMatrix } from '../utils/buildPackagesMatrix';
import { Package, RefreshCw, Download, ChevronDown, ChevronUp, X } from 'lucide-react';

export function PackagesPage({ resortId }: { resortId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [paxOptions, setPaxOptions] = useState([1, 2, 3, 4]);
  const [selectedNights, setSelectedNights] = useState(2);
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPackage, setExpandedPackage] = useState<string | null>('RB');
  const [selectedCell, setSelectedCell] = useState<any>(null);

  useEffect(() => {
    loadMatrix();
  }, [resortId, year, paxOptions, selectedNights]);

  const loadMatrix = async () => {
    setLoading(true);
    const data = await buildPackagesMatrix({
      supabase,
      resort_id: resortId,
      year,
      paxOptions,
      nights: selectedNights,
    });
    setMatrix(data);
    setLoading(false);
  };

  const getPackageData = (packageCode: string) => {
    return matrix.filter((row) => row.PackageCode === packageCode);
  };

  const groupByRoomAndSeason = (data: any[]) => {
    const grouped: any = {};
    data.forEach((row) => {
      const key = `${row.RoomType}_${row.Season}`;
      if (!grouped[key]) {
        grouped[key] = {
          roomType: row.RoomType,
          roomTypeId: row.RoomTypeId,
          season: row.Season,
          paxData: [],
        };
      }
      grouped[key].paxData.push({
        pax: row.Pax,
        cost: row.Cost,
        price: row.Price,
        profit: row.Profit,
        breakdown: row.Breakdown,
      });
    });
    return Object.values(grouped);
  };

  const exportCSV = () => {
    const csvData = [
      ['Package Pricing Matrix'],
      ['Year:', year],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Package', 'Room Type', 'Season', 'Pax', 'Cost (RM)', 'Price (RM)', 'Profit (RM)'],
      ...matrix.map((row) => [
        row.Package,
        row.RoomType,
        row.Season,
        row.Pax,
        row.Cost.toFixed(2),
        row.Price.toFixed(2),
        row.Profit.toFixed(2),
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packages-matrix-${year}.csv`;
    a.click();
  };

  const packageTypes = [
    { code: 'RB', name: 'Room & Breakfast' },
    { code: 'RBB', name: 'Room + Breakfast + Boat' },
    { code: 'RB3I', name: 'Room + Breakfast + 3 Islands' },
    { code: 'FB', name: 'Fullboard (B,L,D) + Boat' },
    { code: 'FB3I', name: 'Fullboard + Boat + 3 Islands' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="text-emerald-600" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Package Pricing Matrix</h2>
                <p className="text-slate-600">Dynamic pricing across room types and seasons</p>
                <p className="text-xs text-slate-500 mt-1">Note: Boat transfer is mandatory in all packages</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={20} />
                Export CSV
              </button>
              <button
                onClick={loadMatrix}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nights</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((nights) => (
                  <button
                    key={nights}
                    onClick={() => setSelectedNights(nights)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedNights === nights
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {nights}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pax Options
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((pax) => (
                  <button
                    key={pax}
                    onClick={() => {
                      if (paxOptions.includes(pax)) {
                        setPaxOptions(paxOptions.filter((p) => p !== pax));
                      } else {
                        setPaxOptions([...paxOptions, pax].sort());
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      paxOptions.includes(pax)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pax}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {packageTypes.map((pkgType) => {
            const pkgData = getPackageData(pkgType.code);
            const grouped = groupByRoomAndSeason(pkgData);
            const isExpanded = expandedPackage === pkgType.code;

            return (
              <div key={pkgType.code} className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => setExpandedPackage(isExpanded ? null : pkgType.code)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package size={20} className="text-emerald-600" />
                    <span className="font-semibold text-slate-900">{pkgType.name}</span>
                    <span className="text-sm text-slate-500">({pkgData.length} variants)</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-white">
                            <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-700">
                              Room Type
                            </th>
                            <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                              LOW
                            </th>
                            <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                              MID
                            </th>
                            <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                              HIGH
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(new Set(grouped.map((g: any) => g.roomType))).map(
                            (roomType) => (
                              <tr key={roomType} className="bg-white">
                                <td className="border border-slate-300 px-4 py-2 font-medium text-slate-900">
                                  {roomType}
                                </td>
                                {['LOW', 'MID', 'HIGH'].map((season) => {
                                  const cellData = grouped.find(
                                    (g: any) => g.roomType === roomType && g.season === season
                                  );

                                  return (
                                    <td
                                      key={season}
                                      className="border border-slate-300 px-2 py-2 cursor-pointer hover:bg-emerald-50 transition-colors"
                                      onClick={() =>
                                        cellData && setSelectedCell({ ...cellData, packageName: pkgType.name })
                                      }
                                    >
                                      {cellData ? (
                                        <div className="space-y-1">
                                          {cellData.paxData.map((pd: any) => (
                                            <div
                                              key={pd.pax}
                                              className="text-xs p-1 bg-white rounded border border-slate-200"
                                            >
                                              <div className="font-medium text-slate-900">
                                                {pd.pax} pax: RM {pd.price.toFixed(0)}
                                              </div>
                                              <div className="text-slate-600">
                                                Cost: {pd.cost.toFixed(0)} | Profit:{' '}
                                                {pd.profit.toFixed(0)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center text-slate-400">-</div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedCell && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSelectedCell(null)}
          ></div>

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedCell.packageName}</h2>
                <p className="text-sm text-slate-600">
                  {selectedCell.roomType} - {selectedCell.season} Season
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedCell.paxData.map((pd: any) => (
                <div key={pd.pax} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">{pd.pax} Person(s)</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600">
                        RM {pd.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-600">Selling Price</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900 mb-2">Cost Breakdown</h4>

                    {pd.breakdown.room_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Room Cost:</span>
                        <span className="font-medium text-red-600">
                          RM {pd.breakdown.room_cost.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {pd.breakdown.boat_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Boat Cost (return trip):</span>
                        <span className="font-medium text-red-600">
                          RM {pd.breakdown.boat_cost.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {pd.breakdown.meal_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Meal Cost:</span>
                        <span className="font-medium text-red-600">
                          RM {pd.breakdown.meal_cost.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {pd.breakdown.activities_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Activities Cost:</span>
                        <span className="font-medium text-red-600">
                          RM {pd.breakdown.activities_cost.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-300">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-slate-900">Total Cost:</span>
                        <span className="text-red-600">RM {pd.cost.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-300">
                      <h4 className="font-medium text-slate-900 mb-2">Price Breakdown</h4>

                      {pd.breakdown.room_price > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Room Price (seasonal):</span>
                          <span className="font-medium text-emerald-600">
                            RM {pd.breakdown.room_price.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {pd.breakdown.boat_price > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Boat Price ({pd.pax} pax):</span>
                          <span className="font-medium text-emerald-600">
                            RM {pd.breakdown.boat_price.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {pd.breakdown.meal_price > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Meal Price:</span>
                          <span className="font-medium text-emerald-600">
                            RM {pd.breakdown.meal_price.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {pd.breakdown.activities_price > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Activities Price:</span>
                          <span className="font-medium text-emerald-600">
                            RM {pd.breakdown.activities_price.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t-2 border-slate-400">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-slate-900">Profit:</span>
                        <span className="text-lg font-bold text-green-600">
                          RM {pd.profit.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 text-right mt-1">
                        Margin: {((pd.profit / pd.price) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
