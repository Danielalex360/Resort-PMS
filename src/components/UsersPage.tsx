import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Trash2, Shield, DollarSign, X, Mail, UserPlus, Check, Briefcase, UserCircle, Copy, ExternalLink } from 'lucide-react';
import { UserRole as Role, getRoleLabel, getRoleDescription, getRoleColor, getRoleBgColor } from '../utils/permissions';

interface UserRole {
  id: string;
  user_id: string;
  resort_id: string;
  role: Role;
  created_at: string;
  email?: string;
}

export function UsersPage({ resortId, currentUserId }: { resortId: string; currentUserId: string }) {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('frontdesk');
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');

  useEffect(() => {
    loadUsers();
  }, [resortId]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('resort_id', resortId)
      .order('created_at', { ascending: false });

    if (data) {
      const usersWithEmails = await Promise.all(
        data.map(async (user) => {
          try {
            const { data: authData } = await supabase.auth.admin.getUserById(user.user_id);
            return {
              ...user,
              email: authData?.user?.email || 'Unknown',
            };
          } catch {
            return {
              ...user,
              email: 'Unknown',
            };
          }
        })
      );
      setUsers(usersWithEmails);
    }
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setAddingUser(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setAddingUser(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-invitation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newUserEmail.trim().toLowerCase(),
            resort_id: resortId,
            role: newUserRole,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.details
          ? `${result.error}: ${result.details}`
          : result.error || 'Failed to send invitation';
        setError(errorMessage);
        setAddingUser(false);
        return;
      }

      const message = result.resent
        ? `Invitation resent to ${newUserEmail}!`
        : `Invitation created for ${newUserEmail}!`;
      setSuccess(message);
      setInvitationUrl(result.invitation_url);
      setNewUserEmail('');
      setNewUserRole('frontdesk');
      loadUsers();
    } catch (err) {
      setError('Failed to send invitation. Please try again.');
    }

    setAddingUser(false);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === currentUserId) {
      alert('You cannot remove yourself');
      return;
    }

    if (!confirm(`Remove ${userEmail} from this resort?`)) {
      return;
    }

    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('resort_id', resortId);

    if (error) {
      alert('Failed to remove user: ' + error.message);
    } else {
      loadUsers();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    if (userId === currentUserId) {
      alert('You cannot change your own role');
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('resort_id', resortId);

    if (error) {
      alert('Failed to update role: ' + error.message);
    } else {
      loadUsers();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="text-emerald-600" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                <p className="text-slate-600">Manage user access and roles for this resort</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add User
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">No users yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Add Your First User
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getRoleBgColor(user.role)}`}>
                      {user.role === 'admin' && <Shield size={24} className={getRoleColor(user.role)} />}
                      {user.role === 'manager' && <Briefcase size={24} className={getRoleColor(user.role)} />}
                      {user.role === 'accounts' && <DollarSign size={24} className={getRoleColor(user.role)} />}
                      {user.role === 'frontdesk' && <UserCircle size={24} className={getRoleColor(user.role)} />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{user.email}</div>
                      <div className="text-sm text-slate-500">
                        Added {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.user_id, e.target.value as Role)}
                      disabled={user.user_id === currentUserId}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="accounts">Accounts</option>
                      <option value="frontdesk">Front Desk</option>
                    </select>

                    <button
                      onClick={() => handleDeleteUser(user.user_id, user.email || 'User')}
                      disabled={user.user_id === currentUserId}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={user.user_id === currentUserId ? 'Cannot remove yourself' : 'Remove user'}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => !addingUser && setShowAddModal(false)}></div>

          <div className="absolute inset-x-0 top-1/4 mx-auto w-full max-w-md bg-white shadow-2xl rounded-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <UserPlus className="text-emerald-600" size={24} />
                <h2 className="text-xl font-bold text-slate-900">Add User</h2>
              </div>
              <button
                onClick={() => !addingUser && setShowAddModal(false)}
                disabled={addingUser}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <Check size={16} />
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail size={16} className="inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => {
                    setNewUserEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="user@example.com"
                  disabled={addingUser}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 mt-1">An invitation email will be sent</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewUserRole('admin')}
                    disabled={addingUser}
                    className={`p-4 border-2 rounded-lg transition-all disabled:opacity-50 ${
                      newUserRole === 'admin'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Shield size={24} className={newUserRole === 'admin' ? 'text-purple-600' : 'text-slate-400'} />
                    <div className="mt-2 font-medium text-slate-900">Admin</div>
                    <div className="text-xs text-slate-500">Full access</div>
                  </button>

                  <button
                    onClick={() => setNewUserRole('manager')}
                    disabled={addingUser}
                    className={`p-4 border-2 rounded-lg transition-all disabled:opacity-50 ${
                      newUserRole === 'manager'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Briefcase size={24} className={newUserRole === 'manager' ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="mt-2 font-medium text-slate-900">Manager</div>
                    <div className="text-xs text-slate-500">All except users</div>
                  </button>

                  <button
                    onClick={() => setNewUserRole('accounts')}
                    disabled={addingUser}
                    className={`p-4 border-2 rounded-lg transition-all disabled:opacity-50 ${
                      newUserRole === 'accounts'
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <DollarSign size={24} className={newUserRole === 'accounts' ? 'text-emerald-600' : 'text-slate-400'} />
                    <div className="mt-2 font-medium text-slate-900">Accounts</div>
                    <div className="text-xs text-slate-500">Financial only</div>
                  </button>

                  <button
                    onClick={() => setNewUserRole('frontdesk')}
                    disabled={addingUser}
                    className={`p-4 border-2 rounded-lg transition-all disabled:opacity-50 ${
                      newUserRole === 'frontdesk'
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <UserCircle size={24} className={newUserRole === 'frontdesk' ? 'text-orange-600' : 'text-slate-400'} />
                    <div className="mt-2 font-medium text-slate-900">Front Desk</div>
                    <div className="text-xs text-slate-500">Bookings & guests</div>
                  </button>
                </div>
              </div>
            </div>

            {invitationUrl && (
              <div className="px-6 py-4 bg-emerald-50 border-t border-emerald-200">
                <div className="flex items-start gap-3">
                  <Check className="text-emerald-600 mt-1 flex-shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-emerald-900 mb-2">Invitation Link Created</p>
                    <p className="text-sm text-emerald-700 mb-3">Copy this link and send it to the user:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={invitationUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(invitationUrl);
                          alert('Link copied to clipboard!');
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-2"
                      >
                        <Copy size={16} />
                        Copy
                      </button>
                      <button
                        onClick={() => window.open(invitationUrl, '_blank')}
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors flex items-center gap-2"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setInvitationUrl('');
                  setSuccess('');
                  setError('');
                }}
                disabled={addingUser}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {invitationUrl ? 'Close' : 'Cancel'}
              </button>
              {!invitationUrl && (
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newUserEmail.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Create Invitation
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
