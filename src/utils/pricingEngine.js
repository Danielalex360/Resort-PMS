export function roundRM5(x, enabled = true) {
  return enabled ? Math.round(x / 5) * 5 : Math.round(x);
}

export function calcBookingTotals({
  nights,
  roomMultiplier,
  paxAdult,
  paxChild,
  cost_room,
  price_room,
  meal_cost_adult,
  meal_cost_child,
  meal_price_adult,
  meal_price_child,
  boat_price_adult,
  boat_price_child,
  boat_cost_adult,
  boat_cost_child,
  addons_cost,
  addons_price,
  seasonMult,
  surchargesPct,
  marginPct,
  overheadMode,
  overheadPerRoomDay,
  overheadFixedPerPackage,
  roundToRM5 = true,
}) {
  const room_cost = cost_room * roomMultiplier * nights;
  const room_price = price_room * roomMultiplier * nights;
  const meals_cost = (meal_cost_adult * paxAdult + meal_cost_child * paxChild) * nights;
  const meals_price = (meal_price_adult * paxAdult + meal_price_child * paxChild) * nights;
  const boat_cost = (boat_cost_adult * paxAdult + boat_cost_child * paxChild) * nights;
  const boat_price = (boat_price_adult * paxAdult + boat_price_child * paxChild) * nights;

  const base_cost = room_cost + meals_cost + boat_cost + (addons_cost || 0);
  const base_price = room_price + meals_price + boat_price + (addons_price || 0);

  let overhead = 0;
  if (overheadMode === 'per_room_day') overhead = (overheadPerRoomDay || 0) * nights;
  if (overheadMode === 'fixed_per_package') overhead = overheadFixedPerPackage || 0;

  const cost_total = base_cost + overhead;
  const season_price = base_price * (seasonMult || 1);
  const after_sg = season_price * (1 + (surchargesPct || 0) / 100);
  const with_margin = after_sg * (1 + (marginPct || 0) / 100);
  const price_total = roundRM5(with_margin, roundToRM5);
  const profit_total = price_total - cost_total;

  return { cost_total, price_total, profit_total };
}
