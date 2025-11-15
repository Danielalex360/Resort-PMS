import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, RefreshCw, Mail, MessageSquare, Send } from 'lucide-react';

export function NotificationsLog({ resortId }: { resortId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'queued' | 'failed'>('all');

  useEffect(() => {
    loadNotifications();
  }, [resortId, filter]);

  const loadNotifications = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from('notifications')
      .select('*, bookings(guest_name, check_in)')
      .eq('resort_id', resortId)
      .gte('sent_at', thirtyDaysAgo.toISOString())
      .order('sent_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (!error) {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const handleResend = async (notification: any) => {
    const { error } = await supabase.from('notifications').insert({
      resort_id: notification.resort_id,
      booking_id: notification.booking_id,
      sent_to: notification.sent_to,
      method: notification.method,
      subject: notification.subject,
      body: notification.body,
      status: 'queued',
      sent_at: new Date().toISOString(),
    });

    if (!error) {
      alert('Notification queued for resending');
      loadNotifications();
    } else {
      alert('Failed to resend notification');
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail size={16} />;
      case 'whatsapp':
      case 'sms':
        return <MessageSquare size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="text-emerald-600" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Notifications Log</h2>
                <p className="text-slate-600">Last 30 days of communication</p>
              </div>
            </div>
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="flex gap-2">
            {['all', 'sent', 'queued', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  filter === status
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Guest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Sent To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {notifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {new Date(notification.sent_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {notification.bookings?.guest_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    <div className="max-w-xs truncate">{notification.subject}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getMethodIcon(notification.method)}
                      <span className="text-sm text-slate-600 capitalize">
                        {notification.method}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {notification.sent_to || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        notification.status
                      )}`}
                    >
                      {notification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleResend(notification)}
                      className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-1"
                    >
                      <Send size={14} />
                      Resend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {notifications.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <Bell className="mx-auto mb-4 text-slate-300" size={48} />
            <p>No notifications found</p>
          </div>
        )}
      </div>
    </div>
  );
}
