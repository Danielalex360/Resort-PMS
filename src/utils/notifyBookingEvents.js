const MESSAGE_TEMPLATES = {
  depositReminder: {
    subject: 'Deposit Reminder - {resort_name}',
    body: `Dear {guest_name},

This is a friendly reminder about your upcoming reservation at {resort_name}.

Check-in Date: {check_in}
Duration: {nights} nights
Package: {package_name}

Outstanding Balance: RM {balance_due}

Please complete your deposit payment at your earliest convenience.

Contact us: {phone}

Thank you for choosing {resort_name}!`,
  },
  balanceReminder: {
    subject: 'Balance Due Reminder - {resort_name}',
    body: `Dear {guest_name},

Your check-in at {resort_name} is approaching!

Check-in Date: {check_in}
Duration: {nights} nights
Package: {package_name}

Remaining Balance: RM {balance_due}

Please settle the balance before your arrival.

Contact us: {phone}

We look forward to welcoming you!`,
  },
  checkInWelcome: {
    subject: 'Welcome to {resort_name}!',
    body: `Dear {guest_name},

Welcome! We're excited to have you at {resort_name} today.

Your Reservation:
Check-in: {check_in}
Duration: {nights} nights
Package: {package_name}

{balance_message}

If you have any questions, please don't hesitate to contact us at {phone}.

Enjoy your stay!`,
  },
};

function fillTemplate(template, variables) {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}

async function sendMessage({ supabase, resort_id, booking_id, method, to, subject, body }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      resort_id,
      booking_id,
      sent_to: to,
      method,
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
}

export async function notifyBookingEvents({ supabase, resort_id, date }) {
  const { data: resort } = await supabase
    .from('resorts')
    .select('name')
    .eq('id', resort_id)
    .single();

  const resort_name = resort?.name || 'Our Resort';

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, room_types(name), packages(name)')
    .eq('resort_id', resort_id)
    .eq('check_in', date)
    .in('status', ['pending', 'confirmed']);

  const notifications = [];

  for (const booking of bookings || []) {
    const variables = {
      guest_name: booking.guest_name || 'Guest',
      check_in: new Date(booking.check_in).toLocaleDateString(),
      nights: booking.nights || 0,
      package_name: booking.packages?.name || 'Standard Package',
      balance_due: (booking.balance_due || 0).toFixed(2),
      phone: booking.phone || 'N/A',
      resort_name,
      balance_message:
        booking.balance_due > 0
          ? `Outstanding Balance: RM ${booking.balance_due.toFixed(2)}`
          : 'Your payment is complete. Thank you!',
    };

    let templateKey = 'checkInWelcome';
    if (booking.balance_due > booking.price_total * 0.5) {
      templateKey = 'depositReminder';
    } else if (booking.balance_due > 0) {
      templateKey = 'balanceReminder';
    }

    const template = MESSAGE_TEMPLATES[templateKey];
    const subject = fillTemplate(template.subject, variables);
    const body = fillTemplate(template.body, variables);

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('subject', subject)
      .gte('sent_at', new Date(date).toISOString())
      .maybeSingle();

    if (!existing) {
      const notification = await sendMessage({
        supabase,
        resort_id,
        booking_id: booking.id,
        method: 'internal',
        to: booking.email || booking.guest_name,
        subject,
        body,
      });

      if (notification) {
        notifications.push(notification);
      }
    }
  }

  return notifications;
}

export { MESSAGE_TEMPLATES, fillTemplate };
