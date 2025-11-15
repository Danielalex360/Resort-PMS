import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { monthlyExpenseSummary } from '../utils/expensesRollup';
import { uploadFile } from '../utils/fileHelpers';
import { linkExpenseBills } from '../utils/paymentReceiptLink';
import { Receipt, Plus, Download, X, Upload, Trash2 } from 'lucide-react';

export function ExpensesPage({ resortId }: { resortId: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    vendor: '',
    category: 'misc',
    description: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    payment_method: 'bank_transfer',
    status: 'paid',
    reference_no: '',
  });
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    'utilities',
    'salary',
    'maintenance',
    'fuel',
    'boat_vendor',
    'supplies',
    'marketing',
    'tax',
    'rent',
    'insurance',
    'misc',
  ];

  useEffect(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(monthKey);
    loadExpenses(monthKey);
  }, [resortId]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, selectedCategory]);

  const loadExpenses = async (month: string) => {
    setLoading(true);
    const start = new Date(month + '-01');
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('resort_id', resortId)
      .gte('expense_date', start.toISOString().slice(0, 10))
      .lt('expense_date', end.toISOString().slice(0, 10))
      .order('expense_date', { ascending: false });

    if (!error) {
      setExpenses(data || []);
    }

    const summaryData = await monthlyExpenseSummary({ supabase, resort_id: resortId, month });
    setSummary(summaryData);

    setLoading(false);
  };

  const filterExpenses = () => {
    if (selectedCategory.length === 0) {
      setFilteredExpenses(expenses);
      return;
    }

    const filtered = expenses.filter((exp) => selectedCategory.includes(exp.category));
    setFilteredExpenses(filtered);
  };

  const handleSave = async () => {
    setLoading(true);

    const total = (formData.subtotal || 0) + (formData.tax || 0);
    const payload = {
      ...formData,
      total,
      resort_id: resortId,
    };

    let expenseId = selectedExpense?.id;

    if (selectedExpense) {
      const { error } = await supabase.from('expenses').update(payload).eq('id', selectedExpense.id);
      if (error) {
        alert('Error updating expense: ' + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from('expenses').insert(payload).select().single();
      if (error) {
        alert('Error creating expense: ' + error.message);
        setLoading(false);
        return;
      }
      expenseId = data.id;
    }

    if (uploadFiles && uploadFiles.length > 0 && expenseId) {
      const urls = [];
      for (let i = 0; i < uploadFiles.length; i++) {
        const url = await uploadFile({
          supabase,
          bucket: 'expense_bills',
          file: uploadFiles[i],
          path: resortId,
        });
        if (url) urls.push(url);
      }

      if (urls.length > 0) {
        await linkExpenseBills({ supabase, expense_id: expenseId, urls });
      }
    }

    setShowModal(false);
    setSelectedExpense(null);
    setFormData({
      expense_date: new Date().toISOString().slice(0, 10),
      vendor: '',
      category: 'misc',
      description: '',
      subtotal: 0,
      tax: 0,
      total: 0,
      payment_method: 'bank_transfer',
      status: 'paid',
      reference_no: '',
    });
    setUploadFiles(null);
    loadExpenses(selectedMonth);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;

    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      loadExpenses(selectedMonth);
    }
  };

  const exportExpenses = () => {
    const csvData = [
      ['Expenses Export'],
      ['Month:', selectedMonth],
      ['Generated:', new Date().toLocaleString()],
      [''],
      [
        'Date',
        'Vendor',
        'Category',
        'Description',
        'Subtotal',
        'Tax',
        'Total',
        'Payment Method',
        'Status',
        'Reference',
      ],
      ...filteredExpenses.map((exp) => [
        exp.expense_date,
        exp.vendor || '',
        exp.category,
        exp.description || '',
        exp.subtotal.toFixed(2),
        exp.tax.toFixed(2),
        exp.total.toFixed(2),
        exp.payment_method,
        exp.status,
        exp.reference_no || '',
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${selectedMonth}.csv`;
    a.click();
  };

  const avgBill = summary ? (summary.count > 0 ? summary.total / summary.count : 0) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Receipt className="text-emerald-600" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Expense Management</h2>
                <p className="text-slate-600">Track business expenses and bills</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportExpenses}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={20} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedExpense(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                New Expense
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-6 border border-red-200">
              <div className="text-sm text-slate-600 mb-1">Total This Month</div>
              <div className="text-3xl font-bold text-red-600">
                RM {summary?.total.toFixed(2) || '0.00'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
              <div className="text-sm text-slate-600 mb-1">Number of Bills</div>
              <div className="text-3xl font-bold text-blue-600">{summary?.count || 0}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
              <div className="text-sm text-slate-600 mb-1">Avg Bill</div>
              <div className="text-3xl font-bold text-purple-600">RM {avgBill.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                loadExpenses(e.target.value);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />

            <select
              multiple
              value={selectedCategory}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setSelectedCategory(selected);
              }}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Subtotal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Tax
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{expense.vendor || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                    {expense.category.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="max-w-xs truncate">{expense.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    RM {expense.subtotal.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    RM {expense.tax.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-600">
                    RM {expense.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        expense.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : expense.status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {expense.bill_urls && expense.bill_urls.length > 0
                      ? `${expense.bill_urls.length} file(s)`
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setFormData(expense);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowModal(false)}
          ></div>

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedExpense ? 'Edit Expense' : 'New Expense'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subtotal (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) =>
                      setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tax (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) =>
                      setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Total (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={(formData.subtotal || 0) + (formData.tax || 0)}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="FPX">FPX</option>
                    <option value="QR">QR</option>
                    <option value="OTA">OTA</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Attach Bills
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="hidden"
                    id="bill-upload"
                  />
                  <label
                    htmlFor="bill-upload"
                    className="cursor-pointer text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Choose files to upload
                  </label>
                  {uploadFiles && uploadFiles.length > 0 && (
                    <div className="mt-2 text-sm text-slate-600">
                      {uploadFiles.length} file(s) selected
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : selectedExpense ? 'Update Expense' : 'Create Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
