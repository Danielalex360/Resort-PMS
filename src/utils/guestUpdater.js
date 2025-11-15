export async function syncGuestOnBooking({ supabase, booking }) {
  if (!booking.resort_id) return;

  const findGuestQuery = supabase
    .from('guests')
    .select('*')
    .eq('resort_id', booking.resort_id);

  if (booking.email && booking.email.trim()) {
    findGuestQuery.eq('email', booking.email.trim().toLowerCase());
  } else if (booking.phone && booking.phone.trim()) {
    findGuestQuery.eq('phone', booking.phone.trim());
  } else if (booking.guest_name && booking.guest_name.trim()) {
    findGuestQuery.eq('name', booking.guest_name.trim());
  } else {
    return;
  }

  const { data: existingGuests } = await findGuestQuery;
  let guest = existingGuests && existingGuests.length > 0 ? existingGuests[0] : null;

  if (!guest) {
    const { data: newGuest, error } = await supabase
      .from('guests')
      .insert({
        resort_id: booking.resort_id,
        name: booking.guest_name || 'Guest',
        email: booking.email?.trim().toLowerCase() || null,
        phone: booking.phone?.trim() || null,
        nationality: booking.nationality || null,
        total_stays: 0,
        total_spent: 0,
        last_check_in: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating guest:', error);
      return;
    }
    guest = newGuest;
  }

  const isNewConfirmation = booking.status === 'confirmed';
  const incrementStays = isNewConfirmation ? 1 : 0;

  const updatedStays = (guest.total_stays || 0) + incrementStays;
  const updatedSpent = (guest.total_spent || 0) + (booking.price_total || 0);
  const lastCheckIn =
    booking.check_in && (!guest.last_check_in || booking.check_in > guest.last_check_in)
      ? booking.check_in
      : guest.last_check_in;

  const { error: updateError } = await supabase
    .from('guests')
    .update({
      name: booking.guest_name || guest.name,
      email: booking.email?.trim().toLowerCase() || guest.email,
      phone: booking.phone?.trim() || guest.phone,
      nationality: booking.nationality || guest.nationality,
      total_stays: updatedStays,
      total_spent: updatedSpent,
      last_check_in: lastCheckIn,
    })
    .eq('id', guest.id);

  if (updateError) {
    console.error('Error updating guest:', updateError);
  }

  return guest;
}
