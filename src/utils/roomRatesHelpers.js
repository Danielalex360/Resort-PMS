export async function getRoomRates({ supabase, resort_id, year }) {
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
    .from('room_type_rates')
    .select('*')
    .in('room_type_id', roomIds)
    .eq('year', year);

  const result = [];

  for (const room of roomTypes) {
    const lowRate = rates?.find((r) => r.room_type_id === room.id && r.season === 'low') || {
      cost_per_night: 0,
      price_per_night: 0,
    };
    const midRate = rates?.find((r) => r.room_type_id === room.id && r.season === 'mid') || {
      cost_per_night: 0,
      price_per_night: 0,
    };
    const highRate = rates?.find((r) => r.room_type_id === room.id && r.season === 'high') || {
      cost_per_night: 0,
      price_per_night: 0,
    };

    result.push({
      room_type_id: room.id,
      room_type_name: room.name,
      low: {
        cost_per_night: parseFloat(lowRate.cost_per_night) || 0,
        price_per_night: parseFloat(lowRate.price_per_night) || 0,
      },
      mid: {
        cost_per_night: parseFloat(midRate.cost_per_night) || 0,
        price_per_night: parseFloat(midRate.price_per_night) || 0,
      },
      high: {
        cost_per_night: parseFloat(highRate.cost_per_night) || 0,
        price_per_night: parseFloat(highRate.price_per_night) || 0,
      },
    });
  }

  return result;
}

export async function upsertRoomRate({ supabase, room_type_id, season, year, fields }) {
  const { data: existing } = await supabase
    .from('room_type_rates')
    .select('id')
    .eq('room_type_id', room_type_id)
    .eq('season', season)
    .eq('year', year)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('room_type_rates')
      .update(fields)
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await supabase.from('room_type_rates').insert({
      room_type_id,
      season,
      year,
      ...fields,
    });
    return { error };
  }
}

export async function bulkUpsertRoomRates({ supabase, updates }) {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const update of updates) {
    const { error } = await upsertRoomRate({
      supabase,
      room_type_id: update.room_type_id,
      season: update.season,
      year: update.year,
      fields: {
        cost_per_night: update.cost_per_night,
        price_per_night: update.price_per_night,
      },
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

export function parseQuickPasteText(text, seasonMode = 'single') {
  const lines = text.split('\n').filter((line) => line.trim());
  const results = [];
  const errors = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;

    if (seasonMode === 'three') {
      const parsed = parseThreeSeasonLine(cleaned);
      if (parsed.error) {
        errors.push(parsed.error);
      } else if (parsed.data) {
        results.push(parsed.data);
      }
    } else {
      let name = '';
      let value = 0;

      if (cleaned.includes('-')) {
        const parts = cleaned.split('-');
        name = parts[0].trim();
        value = parseFloat(parts[1].trim()) || 0;
      } else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        name = parts[0].trim();
        value = parseFloat(parts[1].trim()) || 0;
      } else {
        const parts = cleaned.split(/\s+/);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          const numValue = parseFloat(lastPart);
          if (!isNaN(numValue)) {
            name = parts.slice(0, -1).join(' ');
            value = numValue;
          }
        }
      }

      if (name && value > 0) {
        results.push({ name: name.toLowerCase(), value });
      }
    }
  }

  return { results, errors };
}

function parseThreeSeasonLine(line) {
  let name = '';
  let low = 0;
  let mid = 0;
  let high = 0;

  if (line.includes('low=') && line.includes('mid=') && line.includes('high=')) {
    const lowMatch = line.match(/low[=\s]+(\d+\.?\d*)/i);
    const midMatch = line.match(/mid[=\s]+(\d+\.?\d*)/i);
    const highMatch = line.match(/high[=\s]+(\d+\.?\d*)/i);

    if (lowMatch && midMatch && highMatch) {
      const nameEnd = line.toLowerCase().indexOf('low');
      name = line.substring(0, nameEnd).trim();
      low = parseFloat(lowMatch[1]);
      mid = parseFloat(midMatch[1]);
      high = parseFloat(highMatch[1]);
    }
  } else if (line.includes(':')) {
    const parts = line.split(':');
    if (parts.length === 2) {
      name = parts[0].trim();
      const numbers = parts[1].split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
      if (numbers.length === 3) {
        [low, mid, high] = numbers;
      } else if (numbers.length !== 0) {
        return { error: `${name}: Need 3 numbers (Low, Mid, High), found ${numbers.length}` };
      }
    }
  } else if (line.includes('|')) {
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length >= 4) {
      name = parts[0];
      low = parseFloat(parts[1]) || 0;
      mid = parseFloat(parts[2]) || 0;
      high = parseFloat(parts[3]) || 0;
    } else {
      return { error: `Pipe format: Need 4 parts (Name | Low | Mid | High)` };
    }
  } else if (line.includes(',')) {
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length === 4) {
      name = parts[0];
      low = parseFloat(parts[1]) || 0;
      mid = parseFloat(parts[2]) || 0;
      high = parseFloat(parts[3]) || 0;
    } else {
      return { error: `Comma format: Need 4 parts (Name,Low,Mid,High)` };
    }
  } else {
    const parts = line.split(/\s+/);
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

    if (nameEndIndex >= 0) {
      name = parts.slice(0, nameEndIndex + 1).join(' ');
      if (numbers.length === 3) {
        [low, mid, high] = numbers;
      } else if (numbers.length !== 0) {
        return { error: `${name}: Need 3 numbers (Low, Mid, High), found ${numbers.length}` };
      }
    }
  }

  if (name && low > 0 && mid > 0 && high > 0) {
    return {
      data: {
        name: name.toLowerCase(),
        low,
        mid,
        high,
      },
    };
  }

  return { error: null };
}

export function applyQuickPaste({ rates, parsedData, applyTo, seasons, seasonMode }) {
  const updatedRates = JSON.parse(JSON.stringify(rates));
  let matchedCount = 0;
  let cellsUpdated = 0;
  const unknownRooms = [];

  for (const item of parsedData) {
    const matchedRoom = updatedRates.find(
      (r) => r.room_type_name.toLowerCase() === item.name
    );

    if (matchedRoom) {
      matchedCount++;

      if (seasonMode === 'three') {
        if (applyTo === 'price' || applyTo === 'both') {
          matchedRoom.low.price_per_night = item.low;
          matchedRoom.mid.price_per_night = item.mid;
          matchedRoom.high.price_per_night = item.high;
          cellsUpdated += 3;
        }
        if (applyTo === 'cost' || applyTo === 'both') {
          matchedRoom.low.cost_per_night = item.low;
          matchedRoom.mid.cost_per_night = item.mid;
          matchedRoom.high.cost_per_night = item.high;
          cellsUpdated += 3;
        }
      } else {
        for (const season of seasons) {
          if (applyTo === 'price') {
            matchedRoom[season].price_per_night = item.value;
            cellsUpdated++;
          } else if (applyTo === 'cost') {
            matchedRoom[season].cost_per_night = item.value;
            cellsUpdated++;
          }
        }
      }
    } else {
      unknownRooms.push(item.name);
    }
  }

  return { updatedRates, matchedCount, cellsUpdated, unknownRooms };
}

export function applyPercentageMarkup({ rates, percentage, seasons }) {
  const updatedRates = JSON.parse(JSON.stringify(rates));

  for (const rate of updatedRates) {
    for (const season of seasons) {
      const currentPrice = rate[season].price_per_night;
      rate[season].price_per_night = Math.round(currentPrice * (1 + percentage / 100));
    }
  }

  return updatedRates;
}

export function copyLowToMidHigh({ rates }) {
  const updatedRates = JSON.parse(JSON.stringify(rates));

  for (const rate of updatedRates) {
    rate.mid.cost_per_night = rate.low.cost_per_night;
    rate.mid.price_per_night = rate.low.price_per_night;
    rate.high.cost_per_night = rate.low.cost_per_night;
    rate.high.price_per_night = rate.low.price_per_night;
  }

  return updatedRates;
}

export function generateCSV({ rates, year }) {
  const rows = [['room_type', 'year', 'low_price', 'mid_price', 'high_price', 'low_cost', 'mid_cost', 'high_cost']];

  for (const rate of rates) {
    rows.push([
      rate.room_type_name,
      year,
      rate.low.price_per_night.toFixed(2),
      rate.mid.price_per_night.toFixed(2),
      rate.high.price_per_night.toFixed(2),
      rate.low.cost_per_night.toFixed(2),
      rate.mid.cost_per_night.toFixed(2),
      rate.high.cost_per_night.toFixed(2),
    ]);
  }

  return rows.map((row) => row.join(',')).join('\n');
}

export function parseCSVImport(csvText, rates) {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    return { error: 'CSV must have header and at least one data row' };
  }

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const requiredHeaders = ['room_type', 'year', 'low_price', 'mid_price', 'high_price', 'low_cost', 'mid_cost', 'high_cost'];

  for (const req of requiredHeaders) {
    if (!header.includes(req)) {
      return { error: `Missing required column: ${req}` };
    }
  }

  const roomTypeIdx = header.indexOf('room_type');
  const yearIdx = header.indexOf('year');
  const lowPriceIdx = header.indexOf('low_price');
  const midPriceIdx = header.indexOf('mid_price');
  const highPriceIdx = header.indexOf('high_price');
  const lowCostIdx = header.indexOf('low_cost');
  const midCostIdx = header.indexOf('mid_cost');
  const highCostIdx = header.indexOf('high_cost');

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
        low: {
          price_per_night: parseFloat(cells[lowPriceIdx]) || 0,
          cost_per_night: parseFloat(cells[lowCostIdx]) || 0,
        },
        mid: {
          price_per_night: parseFloat(cells[midPriceIdx]) || 0,
          cost_per_night: parseFloat(cells[midCostIdx]) || 0,
        },
        high: {
          price_per_night: parseFloat(cells[highPriceIdx]) || 0,
          cost_per_night: parseFloat(cells[highCostIdx]) || 0,
        },
      });
    } else if (roomName) {
      unknownRooms.push(roomName);
    }
  }

  return { updates, unknownRooms };
}
