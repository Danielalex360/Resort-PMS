import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  getRoomRates,
  bulkUpsertRoomRates,
  parseQuickPasteText,
  applyQuickPaste,
  applyPercentageMarkup,
  generateCSV,
  parseCSVImport,
} from '../utils/roomRatesHelpers';
import { Save, Download, Upload, Percent, AlertCircle, FileUp } from 'lucide-react';

export function BulkRoomRatesEditor({ resortId }: { resortId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState<any[]>([]);
  const [originalRates, setOriginalRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState('');
  const [quickPasteApplyTo, setQuickPasteApplyTo] = useState<'price' | 'cost' | 'both'>('price');
  const [quickPasteSeason, setQuickPasteSeason] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [seasonMode, setSeasonMode] = useState<'single' | 'three'>('three');
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [parseSummary, setParseSummary] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRates();
  }, [resortId, year]);

  useEffect(() => {
    const changed = JSON.stringify(rates) !== JSON.stringify(originalRates);
    setHasChanges(changed);
  }, [rates, originalRates]);

  const loadRates = async () => {
    setLoading(true);
    const data = await getRoomRates({ supabase, resort_id: resortId, year });
    setRates(data);
    setOriginalRates(JSON.parse(JSON.stringify(data)));
    setLoading(false);
  };

  const handleSaveAll = async () => {
    setLoading(true);

    const updates: any[] = [];

    for (const rate of rates) {
      for (const season of ['low', 'mid', 'high']) {
        updates.push({
          room_type_id: rate.room_type_id,
          season,
          year,
          cost_per_night: rate[season].cost_per_night,
          price_per_night: rate[season].price_per_night,
        });
      }
    }

    const result = await bulkUpsertRoomRates({ supabase, updates });

    if (result.successCount > 0) {
      alert(`✓ ${result.successCount} rates saved successfully!`);
      loadRates();
    }

    if (result.errorCount > 0) {
      alert(`⚠ ${result.errorCount} errors occurred. Check console for details.`);
      console.error('Errors:', result.errors);
    }

    setLoading(false);
  };

  const handleQuickPaste = () => {
    const parsed = parseQuickPasteText(quickPasteText, seasonMode);

    if (parsed.errors.length > 0) {
      alert('Errors found:\n' + parsed.errors.join('\n'));
      return;
    }

    if (parsed.results.length === 0) {
      alert('No valid data found. Check format.');
      return;
    }

    const seasons = quickPasteSeason === 'all' ? ['low', 'mid', 'high'] : [quickPasteSeason];
    const result = applyQuickPaste({
      rates,
      parsedData: parsed.results,
      applyTo: quickPasteApplyTo,
      seasons,
      seasonMode,
    });

    setRates(result.updatedRates);

    let summary = `${result.matchedCount} rooms parsed • ${result.cellsUpdated} cells updated`;
    if (result.unknownRooms.length > 0) {
      summary += `\n⚠ Unknown rooms: ${result.unknownRooms.join(', ')}`;
    }
    setParseSummary(summary);

    setTimeout(() => setParseSummary(''), 5000);
  };

  const handleApplyMarkup = () => {
    const updated = applyPercentageMarkup({
      rates,
      percentage: markupPercent,
      seasons: ['low', 'mid', 'high'],
    });
    setRates(updated);
    setShowMarkupModal(false);
    setMarkupPercent(0);
  };

  const handleExportCSV = () => {
    const csv = generateCSV({ rates, year });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-rates-${year}.csv`;
    a.click();
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const result = parseCSVImport(csvText, rates);

      if (result.error) {
        alert('CSV Import Error: ' + result.error);
        return;
      }

      if (result.updates && result.updates.length > 0) {
        const updatedRates = [...rates];

        for (const update of result.updates) {
          const rateIndex = updatedRates.findIndex((r) => r.room_type_id === update.room_type_id);
          if (rateIndex >= 0) {
            updatedRates[rateIndex] = {
              ...updatedRates[rateIndex],
              low: update.low,
              mid: update.mid,
              high: update.high,
            };
          }
        }

        setRates(updatedRates);

        let summary = `${result.updates.length} rooms imported`;
        if (result.unknownRooms && result.unknownRooms.length > 0) {
          summary += `\n⚠ Unknown rooms: ${result.unknownRooms.join(', ')}`;
        }
        alert(summary);
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const updateRate = (roomIndex: number, season: string, field: string, value: number) => {
    const updated = [...rates];
    updated[roomIndex][season][field] = value;
    setRates(updated);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Room Type Rates (Bulk Editor)</h2>
            <p className="text-slate-600">Manage pricing across all rooms, seasons, and years</p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
              <AlertCircle size={20} />
              <span className="font-medium">Unsaved changes</span>
            </div>
          )}
        </div>

        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex-1"></div>

          <div className="flex gap-2">
            <button
              onClick={handleImportCSV}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Upload size={20} />
              Import CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Export CSV
            </button>
            <button
              onClick={() => setShowMarkupModal(true)}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Percent size={20} />
              Apply % Markup
            </button>
            <button
              onClick={handleSaveAll}
              disabled={loading || !hasChanges}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              Save All
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-700">
                    Room Type
                  </th>
                  <th
                    colSpan={2}
                    className="border border-slate-300 px-4 py-2 text-center font-semibold text-blue-700"
                  >
                    LOW Season
                  </th>
                  <th
                    colSpan={2}
                    className="border border-slate-300 px-4 py-2 text-center font-semibold text-yellow-700"
                  >
                    MID Season
                  </th>
                  <th
                    colSpan={2}
                    className="border border-slate-300 px-4 py-2 text-center font-semibold text-red-700"
                  >
                    HIGH Season
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 px-4 py-1 text-xs"></th>
                  <th className="border border-slate-300 px-2 py-1 text-xs text-slate-600">Cost</th>
                  <th className="border border-slate-300 px-2 py-1 text-xs text-slate-600">
                    Price
                  </th>
                  <th className="border border-slate-300 px-2 py-1 text-xs text-slate-600">Cost</th>
                  <th className="border border-slate-300 px-2 py-1 text-xs text-slate-600">
                    Price
                  </th>
                  <th className="border border-slate-300 px-2 py-1 text-xs text-slate-600">Cost</th>
                  <th className="border border-slate-300 px-2 py-1 text-xs text-slate-600">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, index) => (
                  <tr key={rate.room_type_id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-4 py-2 font-medium text-slate-900">
                      {rate.room_type_name}
                    </td>

                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={rate.low.cost_per_night}
                        onChange={(e) =>
                          updateRate(index, 'low', 'cost_per_night', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={rate.low.price_per_night}
                        onChange={(e) =>
                          updateRate(index, 'low', 'price_per_night', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </td>

                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={rate.mid.cost_per_night}
                        onChange={(e) =>
                          updateRate(index, 'mid', 'cost_per_night', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={rate.mid.price_per_night}
                        onChange={(e) =>
                          updateRate(index, 'mid', 'price_per_night', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </td>

                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={rate.high.cost_per_night}
                        onChange={(e) =>
                          updateRate(index, 'high', 'cost_per_night', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={rate.high.price_per_night}
                        onChange={(e) =>
                          updateRate(index, 'high', 'price_per_night', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">Quick Paste</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Season Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSeasonMode('three')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      seasonMode === 'three'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Three Seasons
                  </button>
                  <button
                    onClick={() => setSeasonMode('single')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      seasonMode === 'single'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Single Season
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Paste Data (one per line)
                </label>
                <textarea
                  value={quickPasteText}
                  onChange={(e) => setQuickPasteText(e.target.value)}
                  placeholder={
                    seasonMode === 'three'
                      ? 'SeaView: 400, 440, 520\nPoolView | 350 | 390 | 470\nGarden View low=300 mid=330 high=420'
                      : 'SeaView - 400\nPoolView - 350\nGardenView - 300'
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                />
                <div className="text-xs text-slate-500 mt-1">
                  {seasonMode === 'three'
                    ? 'Formats: Name: L,M,H or Name | L | M | H or Name low=L mid=M high=H'
                    : 'Formats: "Name - Value", "Name, Value", or "Name Value"'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apply To</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setQuickPasteApplyTo('price')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      quickPasteApplyTo === 'price'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Price
                  </button>
                  <button
                    onClick={() => setQuickPasteApplyTo('cost')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      quickPasteApplyTo === 'cost'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Cost
                  </button>
                  <button
                    onClick={() => setQuickPasteApplyTo('both')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      quickPasteApplyTo === 'both'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              {seasonMode === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Season</label>
                  <select
                    value={quickPasteSeason}
                    onChange={(e) => setQuickPasteSeason(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="all">All Seasons</option>
                    <option value="low">Low Only</option>
                    <option value="mid">Mid Only</option>
                    <option value="high">High Only</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleQuickPaste}
                disabled={!quickPasteText.trim()}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Parse & Fill
              </button>

              {parseSummary && (
                <div className="text-xs p-2 bg-blue-50 text-blue-800 rounded whitespace-pre-line">
                  {parseSummary}
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">Quick Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Edit cells directly in the grid</li>
              <li>• Use Quick Paste for bulk updates</li>
              <li>• Three Seasons mode: paste all 3 values per room</li>
              <li>• Changes aren't saved until you click "Save All"</li>
              <li>• Import/Export CSV for Excel editing</li>
            </ul>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {showMarkupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMarkupModal(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Apply Percentage Markup</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Markup Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-slate-600">%</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Example: Enter 10 for 10% markup on all prices
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowMarkupModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyMarkup}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
