export async function monthlyExpenseSummary({ supabase, resort_id, month }) {
  const start = new Date(month + '-01');
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);

  const { data: rows, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('resort_id', resort_id)
    .gte('expense_date', start.toISOString().slice(0, 10))
    .lt('expense_date', end.toISOString().slice(0, 10));

  if (error) {
    console.error('Error fetching expenses:', error);
    return { month, total: 0, byCategory: {}, count: 0 };
  }

  const sum = rows.reduce((a, r) => a + (parseFloat(r.total) || 0), 0);
  const byCat = {};

  for (const r of rows) {
    const cat = r.category || 'misc';
    byCat[cat] = (byCat[cat] || 0) + (parseFloat(r.total) || 0);
  }

  return { month, total: sum, byCategory: byCat, count: rows.length };
}

export async function yearlyExpenseTrend({ supabase, resort_id, year }) {
  const monthlyData = [];

  for (let month = 0; month < 12; month++) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const summary = await monthlyExpenseSummary({ supabase, resort_id, month: monthKey });
    monthlyData.push({
      month: month + 1,
      monthName: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short' }),
      total: summary.total,
      count: summary.count,
    });
  }

  return monthlyData;
}
