import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User, CreditCard, Globe, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InvitationData {
  id: string;
  email: string;
  resort_id: string;
  role: string;
  token: string;
}

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [nationality, setNationality] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    checkForInvitation();
  }, []);

  const checkForInvitation = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      try {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .maybeSingle();

        if (data && !error) {
          const now = new Date();
          const expiresAt = new Date(data.expires_at);

          if (expiresAt > now) {
            setInvitation(data);
            setEmail(data.email);
            setIsSignUp(true);
          } else {
            setError('This invitation has expired');
          }
        }
      } catch (err) {
        console.error('Error loading invitation:', err);
      }
    }
    setLoadingInvitation(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username || !fullName || !email || !password) {
          throw new Error('Please fill in all required fields');
        }

        await signUp(
          email,
          password,
          username,
          fullName,
          icNumber,
          nationality,
          phoneNumber,
          invitation
        );
      } else {
        await signIn(usernameOrEmail, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Resort Pricing System
          </h1>
          <p className="text-slate-600">
            {invitation
              ? 'Complete your registration'
              : isSignUp
              ? 'Create your account'
              : 'Sign in to continue'}
          </p>
          {invitation && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              You've been invited to join as <strong>{invitation.role}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp ? (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                  <User size={16} className="inline mr-1" />
                  Username *
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                  <User size={16} className="inline mr-1" />
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="icNumber" className="block text-sm font-medium text-slate-700 mb-1">
                  <CreditCard size={16} className="inline mr-1" />
                  IC Number / Passport
                </label>
                <input
                  id="icNumber"
                  type="text"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="123456-78-9012"
                />
              </div>

              <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 mb-1">
                  <Globe size={16} className="inline mr-1" />
                  Nationality
                </label>
                <input
                  id="nationality"
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Malaysian"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-1">
                  <Phone size={16} className="inline mr-1" />
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="+60 12-345 6789"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  <Mail size={16} className="inline mr-1" />
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!invitation}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  <Lock size={16} className="inline mr-1" />
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="usernameOrEmail" className="block text-sm font-medium text-slate-700 mb-1">
                  Username or Email
                </label>
                <input
                  id="usernameOrEmail"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="username or email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Please wait...
              </>
            ) : isSignUp ? (
              <>
                <UserPlus size={20} />
                Sign Up
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        {!invitation && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
