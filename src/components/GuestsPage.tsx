import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Download, X, User } from 'lucide-react';

export function GuestsPage({ resortId }: { resortId: string }) {
  const [guests, setGuests] = useState<any[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [guestBookings, setGuestBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGuests();
  }, [resortId]);

  useEffect(() => {
    filterGuests();
  }, [searchTerm, guests]);

  const loadGuests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('resort_id', resortId)
      .order('total_spent', { ascending: false });

    if (!error) {
      setGuests(data || []);
    }
    setLoading(false);
  };

  const filterGuests = () => {
    if (!searchTerm) {
      setFilteredGuests(guests);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = guests.filter(
      (guest) =>
        guest.name?.toLowerCase().includes(term) ||
        guest.email?.toLowerCase().includes(term) ||
        guest.phone?.includes(term) ||
        guest.nationality?.toLowerCase().includes(term)
    );
    setFilteredGuests(filtered);
  };

  const loadGuestBookings = async (guestId: string, guestEmail: string, guestPhone: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('*, room_types(name), packages(name)')
      .eq('resort_id', resortId)
      .or(`email.eq.${guestEmail},phone.eq.${guestPhone}`)
      .order('check_in', { ascending: false });

    setGuestBookings(data || []);
  };

  const handleGuestClick = (guest: any) => {
    setSelectedGuest(guest);
    loadGuestBookings(guest.id, guest.email, guest.phone);
  };

  const exportGuests = () => {
    const csvData = [
      ['Resort Guests Export'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Name', 'Email', 'Phone', 'Nationality', 'Total Stays', 'Total Spent', 'Last Check-in'],
      ...filteredGuests.map((guest) => [
        guest.name,
        guest.email || '',
        guest.phone || '',
        guest.nationality || '',
        guest.total_stays,
        guest.total_spent.toFixed(2),
        guest.last_check_in || '',
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Guest Management</h2>
              <p className="text-slate-600">Track customer relationships and history</p>
            </div>
            <button
              onClick={exportGuests}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Export CSV
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, or nationality..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Nationality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Stays
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Last Visit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredGuests.map((guest) => (
                <tr
                  key={guest.id}
                  onClick={() => handleGuestClick(guest)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{guest.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{guest.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{guest.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{guest.nationality || '-'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                    {guest.total_stays}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                    RM {guest.total_spent.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {guest.last_check_in
                      ? new Date(guest.last_check_in).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGuest && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSelectedGuest(null)}></div>

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedGuest.name}</h2>
                  <p className="text-sm text-slate-600">{selectedGuest.email || selectedGuest.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuest(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 border-b border-slate-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-slate-600 mb-1">Total Stays</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedGuest.total_stays}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="text-sm text-slate-600 mb-1">Total Spent</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    RM {selectedGuest.total_spent.toFixed(0)}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-slate-600 mb-1">Avg per Stay</div>
                  <div className="text-2xl font-bold text-purple-600">
                    RM{' '}
                    {selectedGuest.total_stays > 0
                      ? (selectedGuest.total_spent / selectedGuest.total_stays).toFixed(0)
                      : 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Booking History</h3>
              <div className="space-y-3">
                {guestBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {booking.room_types?.name || 'Room'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {booking.packages?.name || 'Standard Package'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Check-in:</span>
                        <span className="ml-2 font-medium text-slate-900">
                          {new Date(booking.check_in).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Nights:</span>
                        <span className="ml-2 font-medium text-slate-900">{booking.nights}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Price:</span>
                        <span className="ml-2 font-semibold text-emerald-600">
                          RM {booking.price_total?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Balance:</span>
                        <span className="ml-2 font-semibold text-red-600">
                          RM {booking.balance_due?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
