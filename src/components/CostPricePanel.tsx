import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  getBaseRates,
  bulkUpsertBaseRates,
  parseQuickPasteBase,
  applyQuickPasteBase,
  generateBaseCSV,
  parseBaseCSVImport,
  getMealPlans,
  bulkUpsertMealPlans,
  calculateComposite,
  getActivities,
  bulkUpsertActivities,
} from '../utils/baseRatesHelpers';
import { Settings, Save, Download, Upload, AlertCircle, RefreshCw, Undo } from 'lucide-react';

export function CostPricePanel({ resortId }: { resortId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState<any[]>([]);
  const [originalRates, setOriginalRates] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [originalMeals, setOriginalMeals] = useState<any[]>([]);
  const [mealBackup, setMealBackup] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [originalActivities, setOriginalActivities] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState('');
  const [parseSummary, setParseSummary] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [resortId, year]);

  useEffect(() => {
    const ratesChanged = JSON.stringify(rates) !== JSON.stringify(originalRates);
    const mealsChanged = JSON.stringify(meals) !== JSON.stringify(originalMeals);
    const activitiesChanged = JSON.stringify(activities) !== JSON.stringify(originalActivities);
    setHasChanges(ratesChanged || mealsChanged || activitiesChanged);
  }, [rates, meals, activities, originalRates, originalMeals, originalActivities]);

  const loadData = async () => {
    setLoading(true);

    const baseRates = await getBaseRates({ supabase, resort_id: resortId, year });
    setRates(baseRates);
    setOriginalRates(JSON.parse(JSON.stringify(baseRates)));

    const mealData = await getMealPlans({ supabase, resort_id: resortId });
    setMeals(mealData);
    setOriginalMeals(JSON.parse(JSON.stringify(mealData)));

    const activityData = await getActivities({ supabase, resort_id: resortId });
    setActivities(activityData);
    setOriginalActivities(JSON.parse(JSON.stringify(activityData)));

    const { data: config } = await supabase
      .from('pricing_configs')
      .select('*')
      .eq('resort_id', resortId)
      .maybeSingle();

    setPricingConfig(config || {});
    setLoading(false);
  };

  const handleSaveRooms = async () => {
    setLoading(true);

    const updates = rates.map((rate) => ({
      room_type_id: rate.room_type_id,
      year,
      cost: rate.cost,
      price: rate.price,
    }));

    const result = await bulkUpsertBaseRates({ supabase, updates });

    if (result.successCount > 0) {
      alert(`✓ ${result.successCount} rates saved successfully!`);
      loadData();
    }

    if (result.errorCount > 0) {
      alert(`⚠ ${result.errorCount} errors occurred.`);
    }

    setLoading(false);
  };

  const handleSaveBoat = async () => {
    setLoading(true);

    const coerceNumber = (v: any) => Number((v ?? 0).toString().replace(/,/g, '').trim() || 0);

    const { data: existing } = await supabase
      .from('pricing_configs')
      .select('*')
      .eq('resort_id', resortId)
      .maybeSingle();

    const payload = {
      ...existing,
      resort_id: resortId,
      boat_cost_return_trip: coerceNumber(pricingConfig.boat_cost_return_trip),
      price_boat_adult: coerceNumber(pricingConfig.price_boat_adult),
      price_boat_child: coerceNumber(pricingConfig.price_boat_child),
    };

    const { error } = await supabase
      .from('pricing_configs')
      .upsert(payload, { onConflict: 'resort_id' });

    if (error) {
      console.error('Boat save error:', error);
      alert(`⚠ Error saving boat: ${error.message}`);
    } else {
      alert('✓ Boat pricing saved!');
      loadData();
    }

    setLoading(false);
  };

  const handleSaveMeals = async () => {
    setLoading(true);

    const result = await bulkUpsertMealPlans({ supabase, resort_id: resortId, plans: meals });

    if (result.errorCount > 0 && result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => `${e.code}: ${e.error}`).join('\n');
      alert(`⚠ ${result.errorCount} errors occurred:\n${errorMessages}`);
    } else if (result.successCount > 0) {
      alert(`✓ ${result.successCount} meal plans saved!`);
      loadData();
    }

    setLoading(false);
  };

  const handleSaveAddOns = async () => {
    setLoading(true);

    const coerceNumber = (v: any) => Number((v ?? 0).toString().replace(/,/g, '').trim() || 0);

    const { data: existing } = await supabase
      .from('pricing_configs')
      .select('*')
      .eq('resort_id', resortId)
      .maybeSingle();

    const payload = {
      ...existing,
      resort_id: resortId,
      bbq_cost_adult: coerceNumber(pricingConfig.bbq_cost_adult),
      bbq_cost_child: coerceNumber(pricingConfig.bbq_cost_child),
      bbq_price_adult: coerceNumber(pricingConfig.bbq_price_adult),
      bbq_price_child: coerceNumber(pricingConfig.bbq_price_child),
      cld_cost_adult: coerceNumber(pricingConfig.cld_cost_adult),
      cld_cost_child: coerceNumber(pricingConfig.cld_cost_child),
      cld_price_adult: coerceNumber(pricingConfig.cld_price_adult),
      cld_price_child: coerceNumber(pricingConfig.cld_price_child),
      hmoon_cost_adult: coerceNumber(pricingConfig.hmoon_cost_adult),
      hmoon_cost_child: coerceNumber(pricingConfig.hmoon_cost_child),
      hmoon_price_adult: coerceNumber(pricingConfig.hmoon_price_adult),
      hmoon_price_child: coerceNumber(pricingConfig.hmoon_price_child),
    };

    const { error } = await supabase
      .from('pricing_configs')
      .upsert(payload, { onConflict: 'resort_id' });

    if (error) {
      console.error('Add-ons save error:', error);
      alert(`⚠ Error saving add-ons: ${error.message}`);
    } else {
      alert('✓ Add-ons saved!');
      loadData();
    }

    setLoading(false);
  };

  const handleSavePricingRules = async () => {
    setLoading(true);

    const coerceNumber = (v: any) => Number((v ?? 0).toString().replace(/,/g, '').trim() || 0);

    const { data: existing } = await supabase
      .from('pricing_configs')
      .select('*')
      .eq('resort_id', resortId)
      .maybeSingle();

    const payload = {
      ...existing,
      resort_id: resortId,
      profit_margin_pct: coerceNumber(pricingConfig.profit_margin_pct),
    };

    const { error } = await supabase
      .from('pricing_configs')
      .upsert(payload, { onConflict: 'resort_id' });

    if (error) {
      console.error('Pricing rules save error:', error);
      alert(`⚠ Error saving pricing rules: ${error.message}`);
    } else {
      alert('✓ Pricing rules saved!');
      loadData();
    }

    setLoading(false);
  };

  const handleQuickPaste = () => {
    const parsed = parseQuickPasteBase(quickPasteText);

    if (parsed.errors.length > 0) {
      alert('Errors found:\n' + parsed.errors.join('\n'));
      return;
    }

    if (parsed.results.length === 0) {
      alert('No valid data found. Format: RoomName Cost Price');
      return;
    }

    const result = applyQuickPasteBase({ rates, parsedData: parsed.results });
    setRates(result.updatedRates);

    let summary = `${result.matchedCount} rooms updated`;
    if (result.unknownRooms.length > 0) {
      summary += `\n⚠ Unknown rooms: ${result.unknownRooms.join(', ')}`;
    }
    setParseSummary(summary);
    setTimeout(() => setParseSummary(''), 5000);
  };

  const handleExportCSV = () => {
    const csv = generateBaseCSV({ rates, year });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-base-rates-${year}.csv`;
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
      const result = parseBaseCSVImport(csvText, rates);

      if (result.error) {
        alert('CSV Import Error: ' + result.error);
        return;
      }

      if (result.updates && result.updates.length > 0) {
        const updatedRates = [...rates];

        for (const update of result.updates) {
          const rateIndex = updatedRates.findIndex((r) => r.room_type_id === update.room_type_id);
          if (rateIndex >= 0) {
            updatedRates[rateIndex].cost = update.cost;
            updatedRates[rateIndex].price = update.price;
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

  const handleRecalculateFB = () => {
    const backup = JSON.parse(JSON.stringify(meals));
    setMealBackup(backup);

    const composite = calculateComposite(meals, ['BO', 'LO', 'DO']);
    const updatedMeals = meals.map((m) =>
      m.code === 'FB' ? { ...m, ...composite } : m
    );
    setMeals(updatedMeals);
    alert('FB recalculated from BO+LO+DO. Remember to Save.');
  };

  const handleRecalculateFBA = () => {
    const backup = JSON.parse(JSON.stringify(meals));
    setMealBackup(backup);

    const fb = meals.find((m) => m.code === 'FB');
    const ht = meals.find((m) => m.code === 'HT');

    if (fb && ht) {
      const composite = {
        cost_adult: (parseFloat(fb.cost_adult) || 0) + (parseFloat(ht.cost_adult) || 0),
        cost_child: (parseFloat(fb.cost_child) || 0) + (parseFloat(ht.cost_child) || 0),
        price_adult: (parseFloat(fb.price_adult) || 0) + (parseFloat(ht.price_adult) || 0),
        price_child: (parseFloat(fb.price_child) || 0) + (parseFloat(ht.price_child) || 0),
      };

      const updatedMeals = meals.map((m) =>
        m.code === 'FBA' ? { ...m, ...composite } : m
      );
      setMeals(updatedMeals);
      alert('FBA recalculated from FB+HT. Remember to Save.');
    }
  };

  const handleRecalculateFBB = () => {
    const backup = JSON.parse(JSON.stringify(meals));
    setMealBackup(backup);

    const fba = meals.find((m) => m.code === 'FBA');
    const su = meals.find((m) => m.code === 'SU');

    if (fba && su) {
      const composite = {
        cost_adult: (parseFloat(fba.cost_adult) || 0) + (parseFloat(su.cost_adult) || 0),
        cost_child: (parseFloat(fba.cost_child) || 0) + (parseFloat(su.cost_child) || 0),
        price_adult: (parseFloat(fba.price_adult) || 0) + (parseFloat(su.price_adult) || 0),
        price_child: (parseFloat(fba.price_child) || 0) + (parseFloat(su.price_child) || 0),
      };

      const updatedMeals = meals.map((m) =>
        m.code === 'FBB' ? { ...m, ...composite } : m
      );
      setMeals(updatedMeals);
      alert('FBB recalculated from FBA+SU. Remember to Save.');
    }
  };

  const handleRecalculateAll = () => {
    const backup = JSON.parse(JSON.stringify(meals));
    setMealBackup(backup);

    let updatedMeals = [...meals];

    const fb = calculateComposite(meals, ['BO', 'LO', 'DO']);
    updatedMeals = updatedMeals.map((m) => (m.code === 'FB' ? { ...m, ...fb } : m));

    const fbMeal = updatedMeals.find((m) => m.code === 'FB');
    const ht = meals.find((m) => m.code === 'HT');
    if (fbMeal && ht) {
      const fba = {
        cost_adult: (parseFloat(fbMeal.cost_adult) || 0) + (parseFloat(ht.cost_adult) || 0),
        cost_child: (parseFloat(fbMeal.cost_child) || 0) + (parseFloat(ht.cost_child) || 0),
        price_adult: (parseFloat(fbMeal.price_adult) || 0) + (parseFloat(ht.price_adult) || 0),
        price_child: (parseFloat(fbMeal.price_child) || 0) + (parseFloat(ht.price_child) || 0),
      };
      updatedMeals = updatedMeals.map((m) => (m.code === 'FBA' ? { ...m, ...fba } : m));
    }

    const fbaMeal = updatedMeals.find((m) => m.code === 'FBA');
    const su = meals.find((m) => m.code === 'SU');
    if (fbaMeal && su) {
      const fbb = {
        cost_adult: (parseFloat(fbaMeal.cost_adult) || 0) + (parseFloat(su.cost_adult) || 0),
        cost_child: (parseFloat(fbaMeal.cost_child) || 0) + (parseFloat(su.cost_child) || 0),
        price_adult: (parseFloat(fbaMeal.price_adult) || 0) + (parseFloat(su.price_adult) || 0),
        price_child: (parseFloat(fbaMeal.price_child) || 0) + (parseFloat(su.price_child) || 0),
      };
      updatedMeals = updatedMeals.map((m) => (m.code === 'FBB' ? { ...m, ...fbb } : m));
    }

    setMeals(updatedMeals);
    alert('All presets recalculated (FB, FBA, FBB). Remember to Save.');
  };

  const handleUndoPreset = () => {
    if (mealBackup.length > 0) {
      setMeals(mealBackup);
      setMealBackup([]);
      alert('Undo complete.');
    }
  };

  const updateRate = (index: number, field: string, value: number) => {
    const updated = [...rates];
    updated[index][field] = value;
    setRates(updated);
  };

  const updateMeal = (index: number, field: string, value: any) => {
    const updated = [...meals];
    updated[index][field] = value;
    setMeals(updated);
  };

  const handleSaveActivities = async () => {
    setLoading(true);

    const result = await bulkUpsertActivities({ supabase, resort_id: resortId, activities });

    if (result.successCount > 0) {
      alert(`✓ ${result.successCount} activities saved!`);
      loadData();
    }

    if (result.errorCount > 0) {
      alert(`⚠ ${result.errorCount} errors occurred.`);
    }

    setLoading(false);
  };

  const updateActivity = (index: number, field: string, value: any) => {
    const updated = [...activities];
    updated[index][field] = value;
    setActivities(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      {hasChanges && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span className="font-medium">You have unsaved changes. Remember to Save each section.</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="text-emerald-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Cost & Price</h2>
              <p className="text-slate-600">Base rates, boat, meals, add-ons, and rules</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">A) Room Types (Base per night)</h3>
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium text-slate-700">Year:</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="px-3 py-1 border border-slate-300 rounded-lg w-24"
                />
                <button
                  onClick={handleImportCSV}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                >
                  <Upload size={16} />
                  Import
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm flex items-center gap-1"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={handleSaveRooms}
                  disabled={loading}
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <Save size={16} />
                  Save All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 px-4 py-2 text-left">Room Type</th>
                      <th className="border border-slate-300 px-4 py-2 text-center">Cost (RM/night)</th>
                      <th className="border border-slate-300 px-4 py-2 text-center">Price (RM/night)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate, index) => (
                      <tr key={rate.room_type_id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 px-4 py-2 font-medium">{rate.room_type_name}</td>
                        <td className="border border-slate-300 px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={rate.cost}
                            onChange={(e) => updateRate(index, 'cost', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                        <td className="border border-slate-300 px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={rate.price}
                            onChange={(e) => updateRate(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Quick Paste</h4>
                <textarea
                  value={quickPasteText}
                  onChange={(e) => setQuickPasteText(e.target.value)}
                  placeholder="SeaView 400 500&#10;PoolView 350 450&#10;GardenView 300 420"
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono mb-2"
                />
                <div className="text-xs text-slate-500 mb-2">Format: RoomName Cost Price</div>
                <button
                  onClick={handleQuickPaste}
                  disabled={!quickPasteText.trim()}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
                >
                  Parse & Fill
                </button>
                {parseSummary && (
                  <div className="text-xs p-2 bg-blue-50 text-blue-800 rounded mt-2 whitespace-pre-line">
                    {parseSummary}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">B) Boat</h3>
              <button
                onClick={handleSaveBoat}
                disabled={loading}
                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
            </div>
            <div className="text-xs text-slate-500 mb-3">Cost is once per booking; Price is per pax.</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost (Return Trip)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.boat_cost_return_trip || 0}
                  onChange={(e) =>
                    setPricingConfig({ ...pricingConfig, boat_cost_return_trip: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price per Adult</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.price_boat_adult || 0}
                  onChange={(e) =>
                    setPricingConfig({ ...pricingConfig, price_boat_adult: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price per Child</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.price_boat_child || 0}
                  onChange={(e) =>
                    setPricingConfig({ ...pricingConfig, price_boat_child: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">C) Meals (per pax / per day)</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleRecalculateFB}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  FB
                </button>
                <button
                  onClick={handleRecalculateFBA}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  FBA
                </button>
                <button
                  onClick={handleRecalculateFBB}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  FBB
                </button>
                <button
                  onClick={handleRecalculateAll}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  All
                </button>
                {mealBackup.length > 0 && (
                  <button
                    onClick={handleUndoPreset}
                    className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm flex items-center gap-1"
                  >
                    <Undo size={14} />
                    Undo
                  </button>
                )}
                <button
                  onClick={handleSaveMeals}
                  disabled={loading}
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <Save size={16} />
                  Save All
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              Presets sum Adult/Child cost & price from BO/LO/DO/HT/SU. Review, then Save.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-3 py-2 text-left">Code</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">Name</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Cost Adult</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Cost Child</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Price Adult</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Price Child</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {meals.map((meal, index) => (
                    <tr key={meal.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-3 py-2 font-mono text-sm font-semibold">
                        {meal.code}
                      </td>
                      <td className="border border-slate-300 px-3 py-2">{meal.name}</td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={meal.cost_adult}
                          onChange={(e) => updateMeal(index, 'cost_adult', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={meal.cost_child}
                          onChange={(e) => updateMeal(index, 'cost_child', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={meal.price_adult}
                          onChange={(e) => updateMeal(index, 'price_adult', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={meal.price_child}
                          onChange={(e) => updateMeal(index, 'price_child', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={meal.is_active}
                          onChange={(e) => updateMeal(index, 'is_active', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">D) Activities (island hopping)</h3>
              <button
                onClick={handleSaveActivities}
                disabled={loading}
                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              Cost per Trip is <strong>per return trip</strong> (once per activity run). Price is <strong>per pax</strong>.<br />
              Select Resort/Vendor to decide which 'Cost per Trip' is used by default in pricing.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-3 py-2 text-left">Code</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">Name</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Cost Source</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Cost/Trip (Resort)</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Cost/Trip (Vendor)</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Cost Adult</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Cost Child</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Price Adult</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Price Child</th>
                    <th className="border border-slate-300 px-3 py-2 text-center">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <tr key={activity.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-3 py-2 font-mono text-sm font-semibold">
                        {activity.code}
                      </td>
                      <td className="border border-slate-300 px-3 py-2">{activity.name}</td>
                      <td className="border border-slate-300 px-3 py-2">
                        <div className="flex gap-2 justify-center">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`cost_source_${activity.code}`}
                              checked={activity.default_cost_source === 'resort'}
                              onChange={() => updateActivity(index, 'default_cost_source', 'resort')}
                              className="w-3 h-3"
                            />
                            <span className="text-xs">Resort</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`cost_source_${activity.code}`}
                              checked={activity.default_cost_source === 'vendor'}
                              onChange={() => updateActivity(index, 'default_cost_source', 'vendor')}
                              className="w-3 h-3"
                            />
                            <span className="text-xs">Vendor</span>
                          </label>
                        </div>
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={activity.cost_trip_resort}
                          onChange={(e) => updateActivity(index, 'cost_trip_resort', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={activity.cost_trip_vendor}
                          onChange={(e) => updateActivity(index, 'cost_trip_vendor', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={activity.cost_adult}
                          onChange={(e) => updateActivity(index, 'cost_adult', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={activity.cost_child}
                          onChange={(e) => updateActivity(index, 'cost_child', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={activity.price_adult}
                          onChange={(e) => updateActivity(index, 'price_adult', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={activity.price_child}
                          onChange={(e) => updateActivity(index, 'price_child', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={activity.is_active}
                          onChange={(e) => updateActivity(index, 'is_active', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">E) Add-ons (per pax)</h3>
              <button
                onClick={handleSaveAddOns}
                disabled={loading}
                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="font-medium text-slate-900 mb-2">BBQ</div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cost Adult</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.bbq_cost_adult || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, bbq_cost_adult: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cost Child</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.bbq_cost_child || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, bbq_cost_child: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Price Adult</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.bbq_price_adult || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, bbq_price_adult: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Price Child</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.bbq_price_child || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, bbq_price_child: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="font-medium text-slate-900 mb-2">Candlelight Dinner</div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cost Adult</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.cld_cost_adult || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, cld_cost_adult: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cost Child</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.cld_cost_child || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, cld_cost_child: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Price Adult</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.cld_price_adult || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, cld_price_adult: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Price Child</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.cld_price_child || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, cld_price_child: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="font-medium text-slate-900 mb-2">Honeymoon</div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cost Adult</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.hmoon_cost_adult || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, hmoon_cost_adult: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cost Child</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.hmoon_cost_child || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, hmoon_cost_child: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Price Adult</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.hmoon_price_adult || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, hmoon_price_adult: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Price Child</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.hmoon_price_child || 0}
                      onChange={(e) =>
                        setPricingConfig({ ...pricingConfig, hmoon_price_child: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">F) Pricing Rules</h3>
              <button
                onClick={handleSavePricingRules}
                disabled={loading}
                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Profit Margin (%)</label>
              <input
                type="number"
                step="0.01"
                value={pricingConfig.profit_margin_pct || 0}
                onChange={(e) =>
                  setPricingConfig({ ...pricingConfig, profit_margin_pct: parseFloat(e.target.value) || 0 })
                }
                className="w-48 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <div className="text-xs text-slate-500 mt-1">
                Applied after promos (% off) and before surcharges (RM/pax), then optional round to RM5.
              </div>
            </div>
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
    </div>
  );
}
