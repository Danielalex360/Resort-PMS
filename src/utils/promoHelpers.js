export async function getActivePromos({
  supabase,
  resort_id,
  stay_date,
  created_at,
  season,
  room_type_id,
  package_code,
}) {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('is_active', true)
    .lte('date_start', stay_date)
    .gte('date_end', stay_date);

  if (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }

  const filtered = (data || []).filter((promo) => {
    if (promo.target_season !== 'any' && promo.target_season !== season) {
      return false;
    }

    if (promo.room_type_id && promo.room_type_id !== room_type_id) {
      return false;
    }

    if (promo.package_code && promo.package_code !== package_code) {
      return false;
    }

    if (promo.min_days_in_advance > 0) {
      const createdDate = new Date(created_at || new Date());
      const stayDateObj = new Date(stay_date);
      const diffDays = Math.ceil((stayDateObj - createdDate) / (1000 * 60 * 60 * 24));
      if (diffDays < promo.min_days_in_advance) {
        return false;
      }
    }

    if (promo.weekday_mask) {
      const stayDateObj = new Date(stay_date);
      const dayOfWeek = ((stayDateObj.getDay() + 6) % 7) + 1;
      if (!promo.weekday_mask.includes(String(dayOfWeek))) {
        return false;
      }
    }

    return true;
  });

  return filtered;
}

export async function getActiveSurcharges({
  supabase,
  resort_id,
  stay_date,
  season,
  room_type_id,
  package_code,
}) {
  const { data, error } = await supabase
    .from('surcharges')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('is_active', true)
    .lte('date_start', stay_date)
    .gte('date_end', stay_date);

  if (error) {
    console.error('Error fetching surcharges:', error);
    return [];
  }

  const filtered = (data || []).filter((surcharge) => {
    if (surcharge.target_season !== 'any' && surcharge.target_season !== season) {
      return false;
    }

    if (surcharge.room_type_id && surcharge.room_type_id !== room_type_id) {
      return false;
    }

    if (surcharge.package_code && surcharge.package_code !== package_code) {
      return false;
    }

    if (surcharge.weekday_mask) {
      const stayDateObj = new Date(stay_date);
      const dayOfWeek = ((stayDateObj.getDay() + 6) % 7) + 1;
      if (!surcharge.weekday_mask.includes(String(dayOfWeek))) {
        return false;
      }
    }

    return true;
  });

  return filtered;
}

export async function applyPromosAndSurcharges({
  supabase,
  resort_id,
  room_type_id,
  package_code,
  stayDates,
  bookingCreatedAt,
  seasonByDate,
  basePrice,
  paxAdult,
  paxChild,
  roundToRM5,
}) {
  let price = basePrice;
  const totalPax = (paxAdult || 0) + (paxChild || 0);
  const appliedPromos = [];
  const appliedSurcharges = [];

  for (const dateIso of stayDates) {
    const season = seasonByDate[dateIso] || 'mid';

    const promos = await getActivePromos({
      supabase,
      resort_id,
      stay_date: dateIso,
      created_at: bookingCreatedAt,
      season,
      room_type_id,
      package_code,
    });

    for (const promo of promos) {
      const discount = price * (parseFloat(promo.percent_off) / 100);
      price -= discount;
      appliedPromos.push({
        name: promo.name,
        percent: promo.percent_off,
        discount,
        date: dateIso,
      });
    }

    const surcharges = await getActiveSurcharges({
      supabase,
      resort_id,
      stay_date: dateIso,
      season,
      room_type_id,
      package_code,
    });

    for (const surcharge of surcharges) {
      const amount = parseFloat(surcharge.amount_per_pax) * totalPax;
      price += amount;
      appliedSurcharges.push({
        name: surcharge.name,
        amount_per_pax: surcharge.amount_per_pax,
        total_amount: amount,
        date: dateIso,
      });
    }
  }

  if (roundToRM5) {
    price = Math.round(price / 5) * 5;
  }

  return {
    finalPrice: Math.max(0, Math.round(price)),
    appliedPromos,
    appliedSurcharges,
  };
}

export function formatDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${startStr} - ${endStr}`;
}

export function getWeekdayLabel(mask) {
  if (!mask) return 'All days';

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const selected = mask.split('').map(d => days[parseInt(d) - 1]).filter(Boolean);

  return selected.join(', ') || 'All days';
}
