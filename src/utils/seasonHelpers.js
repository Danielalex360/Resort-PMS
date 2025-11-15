export async function setSeasonRange({
  supabase,
  resort_id,
  date_start,
  date_end,
  season,
  description,
}) {
  const { data: range, error: rangeError } = await supabase
    .from('season_ranges')
    .insert({
      resort_id,
      date_start,
      date_end,
      season,
      description,
    })
    .select()
    .single();

  if (rangeError) {
    console.error('Error creating season range:', rangeError);
    return { error: rangeError };
  }

  const start = new Date(date_start);
  const end = new Date(date_end);
  const assignments = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    assignments.push({
      resort_id,
      date: dateStr,
      season,
      description: description || null,
    });
  }

  if (assignments.length > 0) {
    for (const assignment of assignments) {
      const { data: existing } = await supabase
        .from('season_assignments')
        .select('id')
        .eq('resort_id', resort_id)
        .eq('date', assignment.date)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('season_assignments')
          .update({
            season: assignment.season,
            description: assignment.description,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('season_assignments').insert(assignment);
      }
    }
  }

  return { data: range, error: null };
}

export async function getSeasonRanges({ supabase, resort_id, year }) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('season_ranges')
    .select('*')
    .eq('resort_id', resort_id)
    .gte('date_end', startDate)
    .lte('date_start', endDate)
    .order('date_start');

  if (error) {
    console.error('Error fetching season ranges:', error);
    return [];
  }

  return data || [];
}

export async function getSeasonAssignments({ supabase, resort_id, year }) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('season_assignments')
    .select('*')
    .eq('resort_id', resort_id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) {
    console.error('Error fetching season assignments:', error);
    return [];
  }

  return data || [];
}

export async function deleteSeasonRange({ supabase, id }) {
  const { error } = await supabase.from('season_ranges').delete().eq('id', id);
  return { error };
}

export function generateCalendarMonths(year) {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        date: `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    months.push({
      month: m,
      name: firstDay.toLocaleDateString('en-US', { month: 'long' }),
      days,
    });
  }

  return months;
}

export function getSeasonColor(season) {
  switch (season) {
    case 'low':
      return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' };
    case 'mid':
      return { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' };
    case 'high':
      return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' };
    default:
      return { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800' };
  }
}
