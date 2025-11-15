export async function revenueByRoomType({ supabase, resort_id, start, end }) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('room_type_id, price_total, room_types(name)')
    .eq('resort_id', resort_id)
    .gte('check_in', start)
    .lte('check_in', end)
    .in('status', ['confirmed', 'pending', 'completed']);

  const revenueMap = {};
  bookings?.forEach((booking) => {
    const roomType = booking.room_types?.name || 'Unknown';
    if (!revenueMap[roomType]) {
      revenueMap[roomType] = 0;
    }
    revenueMap[roomType] += booking.price_total || 0;
  });

  return Object.entries(revenueMap).map(([room_type, revenue]) => ({
    room_type,
    revenue,
  }));
}

export async function seasonMix({ supabase, resort_id, start, end }) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('season_snapshot')
    .eq('resort_id', resort_id)
    .gte('check_in', start)
    .lte('check_in', end)
    .in('status', ['confirmed', 'pending', 'completed']);

  const seasonCounts = { low: 0, mid: 0, high: 0 };

  bookings?.forEach((booking) => {
    if (booking.season_snapshot && Array.isArray(booking.season_snapshot)) {
      booking.season_snapshot.forEach((day) => {
        const season = day.season || 'mid';
        if (seasonCounts[season] !== undefined) {
          seasonCounts[season]++;
        }
      });
    }
  });

  return Object.entries(seasonCounts).map(([season, bookings]) => ({
    season,
    bookings,
  }));
}

export async function avgPackageProfitByMonth({ supabase, resort_id, year }) {
  const monthlyData = [];

  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('profit_total')
      .eq('resort_id', resort_id)
      .gte('check_in', monthStart.toISOString().slice(0, 10))
      .lte('check_in', monthEnd.toISOString().slice(0, 10))
      .in('status', ['confirmed', 'pending', 'completed']);

    const totalProfit = bookings?.reduce((sum, b) => sum + (b.profit_total || 0), 0) || 0;
    const avgProfit = bookings && bookings.length > 0 ? totalProfit / bookings.length : 0;

    monthlyData.push({
      month: month + 1,
      monthName: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      avg_profit: avgProfit,
      bookings: bookings?.length || 0,
    });
  }

  return monthlyData;
}

export async function dailyOccupancy({ supabase, resort_id, start, end }) {
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id')
    .eq('resort_id', resort_id)
    .eq('is_active', true);

  const totalRooms = roomTypes?.length || 1;

  const startDate = new Date(start);
  const endDate = new Date(end);
  const dailyData = [];

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const dateStr = date.toISOString().slice(0, 10);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('resort_id', resort_id)
      .lte('check_in', dateStr)
      .gt('check_out', dateStr)
      .in('status', ['confirmed', 'pending', 'completed']);

    const occupiedRooms = bookings?.length || 0;
    const occupancy_pct = (occupiedRooms / totalRooms) * 100;

    dailyData.push({
      date: dateStr,
      occupancy_pct: Math.round(occupancy_pct * 10) / 10,
      occupied_rooms: occupiedRooms,
      total_rooms: totalRooms,
    });
  }

  return dailyData;
}
