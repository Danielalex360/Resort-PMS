export async function getBaseRates({ supabase, resort_id, year }) {
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('is_active', true)
    .order('order_index');

  if (!roomTypes || roomTypes.length === 0) {
    return [];
  }

  const roomIds = roomTypes.map((r) => r.id);

  const { data: rates } = await supabase
    .from('room_type_base_rates')
    .select('*')
    .in('room_type_id', roomIds)
    .eq('year', year);

  const result = roomTypes.map((room) => {
    const rate = rates?.find((r) => r.room_type_id === room.id) || {
      cost_base_per_night: 0,
      price_base_per_night: 0,
    };

    return {
      room_type_id: room.id,
      room_type_name: room.name,
      cost: parseFloat(rate.cost_base_per_night) || 0,
      price: parseFloat(rate.price_base_per_night) || 0,
    };
  });

  return result;
}

export async function upsertBaseRate({ supabase, room_type_id, year, cost, price }) {
  const { data: existing } = await supabase
    .from('room_type_base_rates')
    .select('id')
    .eq('room_type_id', room_type_id)
    .eq('year', year)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('room_type_base_rates')
      .update({
        cost_base_per_night: cost,
        price_base_per_night: price,
      })
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await supabase.from('room_type_base_rates').insert({
      room_type_id,
      year,
      cost_base_per_night: cost,
      price_base_per_night: price,
    });
    return { error };
  }
}

export async function bulkUpsertBaseRates({ supabase, updates }) {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const update of updates) {
    const { error } = await upsertBaseRate({
      supabase,
      room_type_id: update.room_type_id,
      year: update.year,
      cost: update.cost,
      price: update.price,
    });

    if (error) {
      errorCount++;
      errors.push({ update, error });
    } else {
      successCount++;
    }
  }

  return { successCount, errorCount, errors };
}

export function parseQuickPasteBase(text) {
  const lines = text.split('\n').filter((line) => line.trim());
  const results = [];
  const errors = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;

    const parts = cleaned.split(/\s+/);
    if (parts.length < 3) {
      errors.push(`Line needs 3 values: RoomName Cost Price`);
      continue;
    }

    const numbers = [];
    let nameEndIndex = -1;

    for (let i = parts.length - 1; i >= 0; i--) {
      const num = parseFloat(parts[i]);
      if (!isNaN(num)) {
        numbers.unshift(num);
      } else {
        nameEndIndex = i;
        break;
      }
    }

    if (nameEndIndex >= 0 && numbers.length === 2) {
      const name = parts.slice(0, nameEndIndex + 1).join(' ');
      const [cost, price] = numbers;

      results.push({
        name: name.toLowerCase(),
        cost,
        price,
      });
    } else {
      errors.push(`Could not parse line: ${line}`);
    }
  }

  return { results, errors };
}

export function applyQuickPasteBase({ rates, parsedData }) {
  const updatedRates = JSON.parse(JSON.stringify(rates));
  let matchedCount = 0;
  const unknownRooms = [];

  for (const item of parsedData) {
    const matchedRoom = updatedRates.find(
      (r) => r.room_type_name.toLowerCase() === item.name
    );

    if (matchedRoom) {
      matchedRoom.cost = item.cost;
      matchedRoom.price = item.price;
      matchedCount++;
    } else {
      unknownRooms.push(item.name);
    }
  }

  return { updatedRates, matchedCount, unknownRooms };
}

export function generateBaseCSV({ rates, year }) {
  const rows = [['room_type', 'year', 'cost_base_per_night', 'price_base_per_night']];

  for (const rate of rates) {
    rows.push([rate.room_type_name, year, rate.cost.toFixed(2), rate.price.toFixed(2)]);
  }

  return rows.map((row) => row.join(',')).join('\n');
}

export function parseBaseCSVImport(csvText, rates) {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    return { error: 'CSV must have header and at least one data row' };
  }

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const requiredHeaders = ['room_type', 'year', 'cost_base_per_night', 'price_base_per_night'];

  for (const req of requiredHeaders) {
    if (!header.includes(req)) {
      return { error: `Missing required column: ${req}` };
    }
  }

  const roomTypeIdx = header.indexOf('room_type');
  const yearIdx = header.indexOf('year');
  const costIdx = header.indexOf('cost_base_per_night');
  const priceIdx = header.indexOf('price_base_per_night');

  const updates = [];
  const unknownRooms = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const roomName = cells[roomTypeIdx]?.toLowerCase();

    const matchedRoom = rates.find((r) => r.room_type_name.toLowerCase() === roomName);

    if (matchedRoom) {
      updates.push({
        room_type_id: matchedRoom.room_type_id,
        room_type_name: matchedRoom.room_type_name,
        year: parseInt(cells[yearIdx]) || new Date().getFullYear(),
        cost: parseFloat(cells[costIdx]) || 0,
        price: parseFloat(cells[priceIdx]) || 0,
      });
    } else if (roomName) {
      unknownRooms.push(roomName);
    }
  }

  return { updates, unknownRooms };
}

export async function getMealPlans({ supabase, resort_id }) {
  const { data } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('resort_id', resort_id)
    .order('code');

  return data || [];
}

export async function upsertMealPlan({ supabase, resort_id, code, values }) {
  const { data: existing } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('resort_id', resort_id)
    .eq('code', code)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meal_plans')
      .update(values)
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await supabase.from('meal_plans').insert({
      resort_id,
      code,
      ...values,
    });
    return { error };
  }
}

export async function bulkUpsertMealPlans({ supabase, resort_id, plans }) {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const plan of plans) {
    const { error } = await upsertMealPlan({
      supabase,
      resort_id,
      code: plan.code,
      values: {
        name: plan.name,
        cost_adult: Number(plan.cost_adult) || 0,
        cost_child: Number(plan.cost_child) || 0,
        price_adult: Number(plan.price_adult) || 0,
        price_child: Number(plan.price_child) || 0,
        is_active: !!plan.is_active,
      },
    });

    if (error) {
      errorCount++;
      errors.push({ code: plan.code, error: error.message });
    } else {
      successCount++;
    }
  }

  return { successCount, errorCount, errors };
}

export function calculateComposite(meals, codes) {
  const result = {
    cost_adult: 0,
    cost_child: 0,
    price_adult: 0,
    price_child: 0,
  };

  for (const code of codes) {
    const meal = meals.find((m) => m.code === code);
    if (meal) {
      result.cost_adult += parseFloat(meal.cost_adult) || 0;
      result.cost_child += parseFloat(meal.cost_child) || 0;
      result.price_adult += parseFloat(meal.price_adult) || 0;
      result.price_child += parseFloat(meal.price_child) || 0;
    }
  }

  return result;
}

export async function getActivities({ supabase, resort_id }) {
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('resort_id', resort_id)
    .order('code');

  return data || [];
}

export async function upsertActivity({ supabase, resort_id, code, values }) {
  const { data: existing } = await supabase
    .from('activities')
    .select('id')
    .eq('resort_id', resort_id)
    .eq('code', code)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('activities')
      .update(values)
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await supabase.from('activities').insert({
      resort_id,
      code,
      ...values,
    });
    return { error };
  }
}

export async function bulkUpsertActivities({ supabase, resort_id, activities }) {
  let successCount = 0;
  let errorCount = 0;

  for (const activity of activities) {
    const { error } = await upsertActivity({
      supabase,
      resort_id,
      code: activity.code,
      values: {
        name: activity.name,
        cost_trip_resort: activity.cost_trip_resort,
        cost_trip_vendor: activity.cost_trip_vendor,
        cost_adult: activity.cost_adult,
        cost_child: activity.cost_child,
        price_adult: activity.price_adult,
        price_child: activity.price_child,
        default_cost_source: activity.default_cost_source,
        is_active: activity.is_active,
      },
    });

    if (error) {
      errorCount++;
    } else {
      successCount++;
    }
  }

  return { successCount, errorCount };
}
