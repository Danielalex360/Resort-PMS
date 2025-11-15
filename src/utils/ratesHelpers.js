export async function getResolvedNightlyRate({ supabase, resort_id, room_type_id, date }) {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();

  const { data: baseRate } = await supabase
    .from('room_type_base_rates')
    .select('*')
    .eq('room_type_id', room_type_id)
    .eq('year', year)
    .maybeSingle();

  let base = baseRate?.price_base_per_night ? parseFloat(baseRate.price_base_per_night) : 0;
  let costBase = baseRate?.cost_base_per_night ? parseFloat(baseRate.cost_base_per_night) : 0;

  if (!baseRate) {
    const { data: latestRate } = await supabase
      .from('room_type_base_rates')
      .select('*')
      .eq('room_type_id', room_type_id)
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRate) {
      base = parseFloat(latestRate.price_base_per_night) || 0;
      costBase = parseFloat(latestRate.cost_base_per_night) || 0;
    }
  }

  const { data: seasonAssignment } = await supabase
    .from('season_assignments')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('date', date)
    .maybeSingle();

  const season = seasonAssignment?.season || 'mid';

  const { data: seasonSettings } = await supabase
    .from('season_settings')
    .select('*')
    .eq('resort_id', resort_id)
    .maybeSingle();

  const percentChanges = {
    low: parseFloat(seasonSettings?.mult_low) || -10,
    mid: parseFloat(seasonSettings?.mult_mid) || 0,
    high: parseFloat(seasonSettings?.mult_high) || 15,
  };

  const percentChange = percentChanges[season];
  const seasonPrice = base * (1 + percentChange / 100);

  const { data: override } = await supabase
    .from('room_rate_overrides')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('room_type_id', room_type_id)
    .eq('date', date)
    .maybeSingle();

  let finalPrice = seasonPrice;
  let overrideApplied = false;

  if (override) {
    overrideApplied = true;
    const value = parseFloat(override.value);

    switch (override.override_type) {
      case 'set':
        finalPrice = value;
        break;
      case 'delta_amount':
        finalPrice = seasonPrice + value;
        break;
      case 'delta_percent':
        finalPrice = seasonPrice * (1 + value / 100);
        break;
    }
  }

  return {
    price: Math.max(0, finalPrice),
    cost: costBase,
    season,
    base,
    seasonPrice,
    overrideApplied,
    override: override || null,
  };
}

export async function getRestriction({ supabase, resort_id, room_type_id, date }) {
  const { data } = await supabase
    .from('room_rate_restrictions')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('room_type_id', room_type_id)
    .eq('date', date)
    .maybeSingle();

  return (
    data || {
      is_closed: false,
      close_to_arrival: false,
      close_to_departure: false,
      min_los: null,
      max_los: null,
      min_advance_days: null,
      max_advance_days: null,
      notes: null,
    }
  );
}

export async function upsertRateOverride({
  supabase,
  resort_id,
  room_type_id,
  date,
  override_type,
  value,
  note,
  created_by,
}) {
  const { data: existing } = await supabase
    .from('room_rate_overrides')
    .select('id')
    .eq('resort_id', resort_id)
    .eq('room_type_id', room_type_id)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('room_rate_overrides')
      .update({ override_type, value, note })
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await supabase.from('room_rate_overrides').insert({
      resort_id,
      room_type_id,
      date,
      override_type,
      value,
      note,
      created_by,
    });
    return { error };
  }
}

export async function upsertRestriction({
  supabase,
  resort_id,
  room_type_id,
  date,
  restrictions,
}) {
  const { data: existing } = await supabase
    .from('room_rate_restrictions')
    .select('id')
    .eq('resort_id', resort_id)
    .eq('room_type_id', room_type_id)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('room_rate_restrictions')
      .update(restrictions)
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await supabase.from('room_rate_restrictions').insert({
      resort_id,
      room_type_id,
      date,
      ...restrictions,
    });
    return { error };
  }
}

export async function deleteRateOverride({ supabase, resort_id, room_type_id, date }) {
  const { error } = await supabase
    .from('room_rate_overrides')
    .delete()
    .eq('resort_id', resort_id)
    .eq('room_type_id', room_type_id)
    .eq('date', date);
  return { error };
}

export async function deleteRestriction({ supabase, resort_id, room_type_id, date }) {
  const { error } = await supabase
    .from('room_rate_restrictions')
    .delete()
    .eq('resort_id', resort_id)
    .eq('room_type_id', room_type_id)
    .eq('date', date);
  return { error };
}

export function generateDateRange(startDate, days) {
  const dates = [];
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  return dates;
}

export function getWeekdayNumber(dateStr) {
  const d = new Date(dateStr);
  return ((d.getDay() + 6) % 7) + 1;
}

export function filterDatesByWeekdays(dates, weekdayMask) {
  if (!weekdayMask || weekdayMask.length === 0) {
    return dates;
  }

  return dates.filter((date) => {
    const wd = getWeekdayNumber(date);
    return weekdayMask.includes(wd);
  });
}

export async function bulkApplyOverrides({
  supabase,
  resort_id,
  room_type_ids,
  dates,
  override_type,
  value,
  note,
  created_by,
}) {
  let count = 0;
  const errors = [];

  for (const room_type_id of room_type_ids) {
    for (const date of dates) {
      const result = await upsertRateOverride({
        supabase,
        resort_id,
        room_type_id,
        date,
        override_type,
        value,
        note,
        created_by,
      });

      if (result.error) {
        errors.push({ room_type_id, date, error: result.error });
      } else {
        count++;
      }
    }
  }

  return { count, errors };
}

export async function bulkApplyRestrictions({
  supabase,
  resort_id,
  room_type_ids,
  dates,
  restrictions,
}) {
  let count = 0;
  const errors = [];

  for (const room_type_id of room_type_ids) {
    for (const date of dates) {
      const result = await upsertRestriction({
        supabase,
        resort_id,
        room_type_id,
        date,
        restrictions,
      });

      if (result.error) {
        errors.push({ room_type_id, date, error: result.error });
      } else {
        count++;
      }
    }
  }

  return { count, errors };
}

export async function getRatesForDateRange({
  supabase,
  resort_id,
  room_type_ids,
  startDate,
  endDate,
}) {
  const dates = generateDateRange(startDate, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);
  const year = new Date(startDate).getFullYear();

  const [baseRatesData, seasonSettingsData, seasonAssignmentsData, overridesData, restrictionsData] = await Promise.all([
    supabase
      .from('room_type_base_rates')
      .select('*')
      .in('room_type_id', room_type_ids)
      .eq('year', year),

    supabase
      .from('season_settings')
      .select('*')
      .eq('resort_id', resort_id)
      .maybeSingle(),

    supabase
      .from('season_assignments')
      .select('*')
      .eq('resort_id', resort_id)
      .gte('date', startDate)
      .lte('date', endDate),

    supabase
      .from('room_rate_overrides')
      .select('*')
      .eq('resort_id', resort_id)
      .in('room_type_id', room_type_ids)
      .gte('date', startDate)
      .lte('date', endDate),

    supabase
      .from('room_rate_restrictions')
      .select('*')
      .eq('resort_id', resort_id)
      .in('room_type_id', room_type_ids)
      .gte('date', startDate)
      .lte('date', endDate),
  ]);

  const baseRatesMap = {};
  (baseRatesData.data || []).forEach(rate => {
    baseRatesMap[rate.room_type_id] = rate;
  });

  const seasonAssignmentsMap = {};
  (seasonAssignmentsData.data || []).forEach(sa => {
    seasonAssignmentsMap[sa.date] = sa.season;
  });

  const overridesMap = {};
  (overridesData.data || []).forEach(ovr => {
    const key = `${ovr.room_type_id}_${ovr.date}`;
    overridesMap[key] = ovr;
  });

  const restrictionsMap = {};
  (restrictionsData.data || []).forEach(res => {
    const key = `${res.room_type_id}_${res.date}`;
    restrictionsMap[key] = res;
  });

  const multipliers = {
    low: parseFloat(seasonSettingsData.data?.mult_low) || -10,
    mid: parseFloat(seasonSettingsData.data?.mult_mid) || 0,
    high: parseFloat(seasonSettingsData.data?.mult_high) || 15,
  };

  const results = [];

  for (const room_type_id of room_type_ids) {
    const baseRate = baseRatesMap[room_type_id];
    const base = baseRate?.price_base_per_night ? parseFloat(baseRate.price_base_per_night) : 0;
    const costBase = baseRate?.cost_base_per_night ? parseFloat(baseRate.cost_base_per_night) : 0;

    const roomRates = dates.map(dateStr => {
      const season = seasonAssignmentsMap[dateStr] || 'mid';
      const percentChange = multipliers[season];
      const seasonPrice = base * (1 + percentChange / 100);

      const overrideKey = `${room_type_id}_${dateStr}`;
      const override = overridesMap[overrideKey];

      let finalPrice = seasonPrice;
      let overrideApplied = false;

      if (override) {
        overrideApplied = true;
        const value = parseFloat(override.value);

        switch (override.override_type) {
          case 'set':
            finalPrice = value;
            break;
          case 'delta_amount':
            finalPrice = seasonPrice + value;
            break;
          case 'delta_percent':
            finalPrice = seasonPrice * (1 + value / 100);
            break;
        }
      }

      const restrictionKey = `${room_type_id}_${dateStr}`;
      const restriction = restrictionsMap[restrictionKey] || {
        is_closed: false,
        close_to_arrival: false,
        close_to_departure: false,
        min_los: null,
        max_los: null,
        min_advance_days: null,
        max_advance_days: null,
        notes: null,
      };

      return {
        date: dateStr,
        price: Math.max(0, finalPrice),
        cost: costBase,
        season,
        base,
        seasonPrice,
        overrideApplied,
        override: override || null,
        restriction,
      };
    });

    results.push({
      room_type_id,
      rates: roomRates,
    });
  }

  return results;
}

export function getSeasonColorClass(season) {
  switch (season) {
    case 'low':
      return 'bg-green-50 border-green-200';
    case 'mid':
      return 'bg-blue-50 border-blue-200';
    case 'high':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-slate-50 border-slate-200';
  }
}
