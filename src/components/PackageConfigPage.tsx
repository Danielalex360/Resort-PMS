import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Plus, Save, Trash2, Check, X } from 'lucide-react';

export function PackageConfigPage({ resortId }: { resortId: string }) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    package_code: '',
    package_name: '',
    includes_room: true,
    includes_breakfast: false,
    includes_lunch: false,
    includes_dinner: false,
    includes_boat: false,
    includes_activities_3i: false,
  });

  useEffect(() => {
    loadPackages();
  }, [resortId]);

  const loadPackages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('package_configs')
      .select('*')
      .eq('resort_id', resortId)
      .order('sort_order');
    setPackages(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('package_configs').insert({
      ...formData,
      resort_id: resortId,
      sort_order: packages.length + 1,
    });

    if (error) {
      alert('Error creating package: ' + error.message);
    } else {
      setFormData({
        package_code: '',
        package_name: '',
        includes_room: true,
        includes_breakfast: false,
        includes_lunch: false,
        includes_dinner: false,
        includes_boat: false,
        includes_activities_3i: false,
      });
      setShowAdd(false);
      await loadPackages();
    }
    setLoading(false);
  };

  const handleToggleActive = async (pkg: any) => {
    await supabase
      .from('package_configs')
      .update({ is_active: !pkg.is_active })
      .eq('id', pkg.id);
    await loadPackages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this package configuration?')) return;
    setLoading(true);
    await supabase.from('package_configs').delete().eq('id', id);
    await loadPackages();
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="text-emerald-600" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Package Configuration</h2>
                <p className="text-slate-600">Configure which packages to offer</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              New Package
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Create New Package</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Package Code
                </label>
                <input
                  type="text"
                  value={formData.package_code}
                  onChange={(e) =>
                    setFormData({ ...formData, package_code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., RB, FB"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  value={formData.package_name}
                  onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                  placeholder="e.g., Room + Breakfast"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Package Includes
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'includes_room', label: 'Room' },
                  { key: 'includes_breakfast', label: 'Breakfast' },
                  { key: 'includes_lunch', label: 'Lunch' },
                  { key: 'includes_dinner', label: 'Dinner' },
                  { key: 'includes_boat', label: 'Boat Transfer' },
                  { key: 'includes_activities_3i', label: '3 Islands Activity' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData[item.key as keyof typeof formData] as boolean}
                      onChange={(e) =>
                        setFormData({ ...formData, [item.key]: e.target.checked })
                      }
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading || !formData.package_code || !formData.package_name}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                Save Package
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {packages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No packages configured yet. Click "New Package" to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    pkg.is_active
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-mono font-semibold rounded ${
                            pkg.is_active
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-400 text-white'
                          }`}
                        >
                          {pkg.package_code}
                        </span>
                        <h3 className="font-semibold text-slate-900">{pkg.package_name}</h3>
                        {!pkg.is_active && (
                          <span className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded">
                            Disabled
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {pkg.includes_room && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Room</span>
                        )}
                        {pkg.includes_breakfast && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                            Breakfast
                          </span>
                        )}
                        {pkg.includes_lunch && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                            Lunch
                          </span>
                        )}
                        {pkg.includes_dinner && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                            Dinner
                          </span>
                        )}
                        {pkg.includes_boat && (
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded">Boat</span>
                        )}
                        {pkg.includes_activities_3i && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            3 Islands
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(pkg)}
                        className={`p-2 rounded transition-colors ${
                          pkg.is_active
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-300 text-slate-600 hover:bg-slate-400'
                        }`}
                        title={pkg.is_active ? 'Disable package' : 'Enable package'}
                      >
                        {pkg.is_active ? <Check size={18} /> : <X size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete package"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
