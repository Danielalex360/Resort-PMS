import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  DoorOpen,
  Receipt,
  ShoppingCart,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
} from 'lucide-react';

interface PropertySetupPageProps {
  resortId: string;
}

interface RoomType {
  id: string;
  name: string;
  code: string;
}

interface RoomUnit {
  id: string;
  unit_number: string;
  room_type_id: string;
  floor?: number;
  max_adults: number;
  max_children: number;
  max_infants: number;
  is_active: boolean;
  notes?: string;
  room_types?: { name: string };
}

interface Tax {
  id: string;
  name: string;
  rate: number;
  application_type: 'per_room' | 'per_pax' | 'per_night' | 'per_total';
  is_percentage: boolean;
  apply_to_adults: boolean;
  apply_to_children: boolean;
  is_active: boolean;
  display_order: number;
  notes?: string;
}

interface ExtraCharge {
  id: string;
  name: string;
  category?: string;
  price: number;
  cost: number;
  charge_type: 'per_room' | 'per_night' | 'per_pax' | 'per_product';
  apply_to_adults: boolean;
  apply_to_children: boolean;
  is_active: boolean;
  display_order: number;
  description?: string;
  notes?: string;
}

type ActiveSection = 'rooms' | 'taxes' | 'charges';

export function PropertySetupPage({ resortId }: PropertySetupPageProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('rooms');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomUnits, setRoomUnits] = useState<RoomUnit[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoomTypes();
    loadRoomUnits();
    loadTaxes();
    loadExtraCharges();
  }, [resortId]);

  const loadRoomTypes = async () => {
    const { data } = await supabase
      .from('room_types')
      .select('id, name, code')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('order_index');
    setRoomTypes(data || []);
  };

  const loadRoomUnits = async () => {
    const { data } = await supabase
      .from('room_units')
      .select('*, room_types(name)')
      .eq('resort_id', resortId)
      .order('unit_number');
    setRoomUnits(data || []);
  };

  const loadTaxes = async () => {
    const { data } = await supabase
      .from('taxes')
      .select('*')
      .eq('resort_id', resortId)
      .order('display_order');
    setTaxes(data || []);
  };

  const loadExtraCharges = async () => {
    const { data } = await supabase
      .from('extra_charges')
      .select('*')
      .eq('resort_id', resortId)
      .order('display_order');
    setExtraCharges(data || []);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Property Setup</h1>
          <p className="text-slate-600">
            Configure your property's room inventory, taxes, and extra charges
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-3 border-b border-slate-200">
            <button
              onClick={() => setActiveSection('rooms')}
              className={`flex items-center justify-center gap-3 px-6 py-4 font-medium transition-colors ${
                activeSection === 'rooms'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <DoorOpen size={20} />
              Room Units
            </button>
            <button
              onClick={() => setActiveSection('taxes')}
              className={`flex items-center justify-center gap-3 px-6 py-4 font-medium transition-colors ${
                activeSection === 'taxes'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Receipt size={20} />
              Taxes
            </button>
            <button
              onClick={() => setActiveSection('charges')}
              className={`flex items-center justify-center gap-3 px-6 py-4 font-medium transition-colors ${
                activeSection === 'charges'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingCart size={20} />
              Extra Charges
            </button>
          </div>

          <div className="p-6">
            {activeSection === 'rooms' && (
              <RoomUnitsSection
                resortId={resortId}
                roomTypes={roomTypes}
                roomUnits={roomUnits}
                onReload={loadRoomUnits}
              />
            )}
            {activeSection === 'taxes' && (
              <TaxesSection
                resortId={resortId}
                taxes={taxes}
                onReload={loadTaxes}
              />
            )}
            {activeSection === 'charges' && (
              <ExtraChargesSection
                resortId={resortId}
                extraCharges={extraCharges}
                onReload={loadExtraCharges}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RoomUnitsSectionProps {
  resortId: string;
  roomTypes: RoomType[];
  roomUnits: RoomUnit[];
  onReload: () => void;
}

function RoomUnitsSection({
  resortId,
  roomTypes,
  roomUnits,
  onReload,
}: RoomUnitsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    unit_number: '',
    room_type_id: '',
    floor: '',
    max_adults: 2,
    max_children: 2,
    max_infants: 1,
    is_active: true,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      resort_id: resortId,
      floor: formData.floor ? parseInt(formData.floor) : null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('room_units')
        .update(payload)
        .eq('id', editingId);
      if (error) {
        console.error('Error updating room unit:', error);
        alert('Error updating room unit: ' + error.message);
        return;
      }
      setShowForm(false);
      setEditingId(null);
      onReload();
    } else {
      const { error } = await supabase.from('room_units').insert(payload);
      if (error) {
        console.error('Error creating room unit:', error);
        alert('Error creating room unit: ' + error.message);
        return;
      }
      setShowForm(false);
      onReload();
    }
    resetForm();
  };

  const handleEdit = (unit: RoomUnit) => {
    setFormData({
      unit_number: unit.unit_number,
      room_type_id: unit.room_type_id,
      floor: unit.floor?.toString() || '',
      max_adults: unit.max_adults,
      max_children: unit.max_children,
      max_infants: unit.max_infants,
      is_active: unit.is_active,
      notes: unit.notes || '',
    });
    setEditingId(unit.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room unit?')) return;
    const { error } = await supabase.from('room_units').delete().eq('id', id);
    if (!error) onReload();
  };

  const resetForm = () => {
    setFormData({
      unit_number: '',
      room_type_id: '',
      floor: '',
      max_adults: 2,
      max_children: 2,
      max_infants: 1,
      is_active: true,
      notes: '',
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Room Inventory</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Room Unit
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit' : 'New'} Room Unit
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Room Number / Name *
              </label>
              <input
                type="text"
                required
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 101, Villa A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Room Type *
              </label>
              <select
                required
                value={formData.room_type_id}
                onChange={(e) => setFormData({ ...formData, room_type_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select room type</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Floor</label>
              <input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Adults
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.max_adults}
                onChange={(e) =>
                  setFormData({ ...formData, max_adults: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Children
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.max_children}
                onChange={(e) =>
                  setFormData({ ...formData, max_children: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Infants
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.max_infants}
                onChange={(e) =>
                  setFormData({ ...formData, max_infants: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                Room #
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                Room Type
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                Floor
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                Max Capacity
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                Status
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {roomUnits.map((unit) => (
              <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm font-medium text-slate-900">
                  {unit.unit_number}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {unit.room_types?.name || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{unit.floor || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {unit.max_adults}A / {unit.max_children}C / {unit.max_infants}I
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      unit.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {unit.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {roomUnits.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No room units configured. Click "Add Room Unit" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

interface TaxesSectionProps {
  resortId: string;
  taxes: Tax[];
  onReload: () => void;
}

function TaxesSection({ resortId, taxes, onReload }: TaxesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rate: '0',
    application_type: 'per_total' as Tax['application_type'],
    is_percentage: true,
    apply_to_adults: true,
    apply_to_children: false,
    is_active: true,
    display_order: 0,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      resort_id: resortId,
      rate: parseFloat(formData.rate),
    };

    if (editingId) {
      const { error } = await supabase.from('taxes').update(payload).eq('id', editingId);
      if (!error) {
        setShowForm(false);
        setEditingId(null);
        onReload();
      }
    } else {
      const { error } = await supabase.from('taxes').insert(payload);
      if (!error) {
        setShowForm(false);
        onReload();
      }
    }
    resetForm();
  };

  const handleEdit = (tax: Tax) => {
    setFormData({
      name: tax.name,
      rate: tax.rate.toString(),
      application_type: tax.application_type,
      is_percentage: tax.is_percentage,
      apply_to_adults: tax.apply_to_adults,
      apply_to_children: tax.apply_to_children,
      is_active: tax.is_active,
      display_order: tax.display_order,
      notes: tax.notes || '',
    });
    setEditingId(tax.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tax?')) return;
    const { error } = await supabase.from('taxes').delete().eq('id', id);
    if (!error) onReload();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rate: '0',
      application_type: 'per_total',
      is_percentage: true,
      apply_to_adults: true,
      apply_to_children: false,
      is_active: true,
      display_order: 0,
      notes: '',
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tax Configuration</h2>
          <p className="text-sm text-slate-600 mt-1">
            Configure SST, Tourism Tax, and other taxes per Malaysia compliance
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Tax
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit' : 'New'} Tax
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., SST, Tourism Tax"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rate *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Application Type *
              </label>
              <select
                value={formData.application_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    application_type: e.target.value as Tax['application_type'],
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="per_total">Per Total Amount</option>
                <option value="per_room">Per Room</option>
                <option value="per_pax">Per Pax</option>
                <option value="per_night">Per Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rate Type *
              </label>
              <select
                value={formData.is_percentage ? 'percentage' : 'fixed'}
                onChange={(e) =>
                  setFormData({ ...formData, is_percentage: e.target.value === 'percentage' })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (RM)</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="apply_to_adults"
                checked={formData.apply_to_adults}
                onChange={(e) =>
                  setFormData({ ...formData, apply_to_adults: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="apply_to_adults" className="text-sm text-slate-700">
                Apply to Adults
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="apply_to_children"
                checked={formData.apply_to_children}
                onChange={(e) =>
                  setFormData({ ...formData, apply_to_children: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="apply_to_children" className="text-sm text-slate-700">
                Apply to Children
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tax_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="tax_is_active" className="text-sm text-slate-700">
                Active
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {taxes.map((tax) => (
          <div
            key={tax.id}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900">{tax.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      tax.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tax.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>
                    Rate: {tax.rate}
                    {tax.is_percentage ? '%' : ' RM'}
                  </span>
                  <span className="capitalize">{tax.application_type.replace('_', ' ')}</span>
                  {tax.apply_to_adults && <span>Adults</span>}
                  {tax.apply_to_children && <span>Children</span>}
                </div>
                {tax.notes && <p className="text-sm text-slate-500 mt-2">{tax.notes}</p>}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleEdit(tax)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(tax.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {taxes.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No taxes configured. Click "Add Tax" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

interface ExtraChargesSectionProps {
  resortId: string;
  extraCharges: ExtraCharge[];
  onReload: () => void;
}

function ExtraChargesSection({
  resortId,
  extraCharges,
  onReload,
}: ExtraChargesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '0',
    cost: '0',
    charge_type: 'per_product' as ExtraCharge['charge_type'],
    apply_to_adults: true,
    apply_to_children: true,
    is_active: true,
    display_order: 0,
    description: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      resort_id: resortId,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
    };

    if (editingId) {
      const { error } = await supabase
        .from('extra_charges')
        .update(payload)
        .eq('id', editingId);
      if (!error) {
        setShowForm(false);
        setEditingId(null);
        onReload();
      }
    } else {
      const { error } = await supabase.from('extra_charges').insert(payload);
      if (!error) {
        setShowForm(false);
        onReload();
      }
    }
    resetForm();
  };

  const handleEdit = (charge: ExtraCharge) => {
    setFormData({
      name: charge.name,
      category: charge.category || '',
      price: charge.price.toString(),
      cost: charge.cost.toString(),
      charge_type: charge.charge_type,
      apply_to_adults: charge.apply_to_adults,
      apply_to_children: charge.apply_to_children,
      is_active: charge.is_active,
      display_order: charge.display_order,
      description: charge.description || '',
      notes: charge.notes || '',
    });
    setEditingId(charge.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this extra charge?')) return;
    const { error } = await supabase.from('extra_charges').delete().eq('id', id);
    if (!error) onReload();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '0',
      cost: '0',
      charge_type: 'per_product',
      apply_to_adults: true,
      apply_to_children: true,
      is_active: true,
      display_order: 0,
      description: '',
      notes: '',
    });
    setEditingId(null);
  };

  const groupedCharges = extraCharges.reduce((acc, charge) => {
    const category = charge.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(charge);
    return acc;
  }, {} as Record<string, ExtraCharge[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Extra Charges & Products</h2>
          <p className="text-sm text-slate-600 mt-1">
            Configure activities, amenities, and other sellable items
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit' : 'New'} Extra Charge
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Island Hopping, BBQ Dinner"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Activity, F&B, Amenity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Selling Price (RM) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cost Price (RM)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Charge Type *
              </label>
              <select
                value={formData.charge_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    charge_type: e.target.value as ExtraCharge['charge_type'],
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="per_product">Per Product/Item</option>
                <option value="per_pax">Per Person</option>
                <option value="per_room">Per Room</option>
                <option value="per_night">Per Night</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="charge_apply_to_adults"
                checked={formData.apply_to_adults}
                onChange={(e) =>
                  setFormData({ ...formData, apply_to_adults: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="charge_apply_to_adults" className="text-sm text-slate-700">
                Apply to Adults
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="charge_apply_to_children"
                checked={formData.apply_to_children}
                onChange={(e) =>
                  setFormData({ ...formData, apply_to_children: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="charge_apply_to_children" className="text-sm text-slate-700">
                Apply to Children
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="charge_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="charge_is_active" className="text-sm text-slate-700">
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {Object.entries(groupedCharges).map(([category, charges]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">{category}</h3>
            <div className="space-y-3">
              {charges.map((charge) => (
                <div
                  key={charge.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{charge.name}</h4>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            charge.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {charge.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-2">
                        <span className="font-medium text-emerald-600">
                          RM {charge.price.toFixed(2)}
                        </span>
                        <span>Cost: RM {charge.cost.toFixed(2)}</span>
                        <span className="capitalize">
                          {charge.charge_type.replace('_', ' ')}
                        </span>
                      </div>
                      {charge.description && (
                        <p className="text-sm text-slate-500">{charge.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(charge)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(charge.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {extraCharges.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No extra charges configured. Click "Add Item" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
