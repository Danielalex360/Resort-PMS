export async function computeMonthlyForecast({ supabase, resort_id, month }) {
  const monthDate = new Date(month);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const monthKey = monthStart.toISOString().slice(0, 10);

  const { data: overhead } = await supabase
    .from('overheads')
    .select('overhead_monthly')
    .eq('resort_id', resort_id)
    .eq('month', monthKey)
    .maybeSingle();

  let overhead_monthly = overhead?.overhead_monthly || 0;

  if (!overhead) {
    const { data: latestOverhead } = await supabase
      .from('overheads')
      .select('overhead_monthly')
      .eq('resort_id', resort_id)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle();

    overhead_monthly = latestOverhead?.overhead_monthly || 77000;
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('nights, price_total, profit_total, status')
    .eq('resort_id', resort_id)
    .gte('check_in', monthStart.toISOString().slice(0, 10))
    .lte('check_in', monthEnd.toISOString().slice(0, 10))
    .in('status', ['pending', 'confirmed', 'completed']);

  const totalBookings = bookings?.length || 0;
  const totalNights = bookings?.reduce((sum, b) => sum + (b.nights || 0), 0) || 0;
  const revenue = bookings?.reduce((sum, b) => sum + (b.price_total || 0), 0) || 0;
  const profit = bookings?.reduce((sum, b) => sum + (b.profit_total || 0), 0) || 0;

  const avgProfitPerBooking = totalBookings > 0 ? profit / totalBookings : 0;
  const breakevenBookings = Math.ceil(overhead_monthly / Math.max(avgProfitPerBooking, 1));

  const netProfit = profit - overhead_monthly;

  const projection50 = totalBookings > 0 ? (profit * 0.5) - overhead_monthly : -overhead_monthly;
  const projection75 = totalBookings > 0 ? (profit * 0.75) - overhead_monthly : -overhead_monthly;
  const projection100 = profit - overhead_monthly;

  return {
    month: monthKey,
    overhead_monthly,
    totalBookings,
    totalNights,
    revenue,
    profit,
    netProfit,
    avgProfitPerBooking,
    breakevenBookings,
    projection50,
    projection75,
    projection100,
  };
}
