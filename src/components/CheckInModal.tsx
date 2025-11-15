import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, UserCheck, Upload } from 'lucide-react';
import { createDocumentRecord } from '../utils/documentGenerator';

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  booking: any;
  resortId: string;
  onCheckInComplete: () => void;
}

export function CheckInModal({ open, onClose, booking, resortId, onCheckInComplete }: CheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    guest_passport: '',
    guest_address: '',
    emergency_contact: '',
    emergency_phone: '',
    special_requests: '',
  });
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdPhoto(e.target.files[0]);
    }
  };

  const uploadIdPhoto = async (): Promise<string | null> => {
    if (!idPhoto) return null;

    try {
      const fileExt = idPhoto.name.split('.').pop();
      const fileName = `${resortId}/${booking.id}/id-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('guest-documents')
        .upload(fileName, idPhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('guest-documents')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading ID photo:', error);
      return null;
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const idPhotoUrl = await uploadIdPhoto();

      await supabase
        .from('bookings')
        .update({
          status: 'checked-in',
          actual_check_in: new Date().toISOString(),
        })
        .eq('id', booking.id);

      await supabase
        .from('guests')
        .update({
          passport_number: formData.guest_passport || null,
          address: formData.guest_address || null,
          emergency_contact: formData.emergency_contact || null,
          emergency_phone: formData.emergency_phone || null,
          id_photo_url: idPhotoUrl,
        })
        .eq('email', booking.guest_email)
        .eq('resort_id', resortId);

      if (formData.special_requests) {
        await supabase
          .from('bookings')
          .update({
            notes: (booking.notes || '') + '\n\nCheck-in notes: ' + formData.special_requests,
          })
          .eq('id', booking.id);
      }

      await createDocumentRecord(resortId, 'registration_form', {
        booking_id: booking.id,
        guest_name: booking.guest_name,
        metadata: {
          check_in_date: new Date().toISOString(),
          room_number: booking.room_number || 'TBA',
          nights: booking.nights,
          pax: booking.num_guests,
          passport: formData.guest_passport,
        },
      });

      alert('Guest checked in successfully! Registration form generated.');
      onCheckInComplete();
      onClose();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCheck className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Check-In Guest</h2>
              <p className="text-sm text-slate-600">{booking.guest_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleCheckIn} className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Check-in Date:</span>
              <span className="font-semibold">{new Date(booking.check_in).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Check-out Date:</span>
              <span className="font-semibold">{new Date(booking.check_out).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Nights:</span>
              <span className="font-semibold">{booking.nights}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Guests:</span>
              <span className="font-semibold">{booking.num_guests}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Passport / IC Number
            </label>
            <input
              type="text"
              value={formData.guest_passport}
              onChange={(e) => setFormData({ ...formData, guest_passport: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="A12345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.guest_address}
              onChange={(e) => setFormData({ ...formData, guest_address: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Guest address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Emergency Phone
              </label>
              <input
                type="text"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload ID / Passport Photo
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="id-upload"
              />
              <label htmlFor="id-upload" className="cursor-pointer">
                <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-sm text-slate-600">
                  {idPhoto ? idPhoto.name : 'Click to upload photo'}
                </p>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Special Requests / Notes
            </label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any special requests or notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={loading}
            >
              <UserCheck size={18} />
              {loading ? 'Processing...' : 'Complete Check-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
