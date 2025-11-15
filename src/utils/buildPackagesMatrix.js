function sumMeals(meals, code, paxA, paxC, nights = 1) {
  const m = meals.find((x) => x.code === code);
  if (!m) return { cost: 0, price: 0 };
  const cost = (m.cost_adult * paxA + m.cost_child * paxC) * nights;
  const price = (m.price_adult * paxA + m.price_child * paxC) * nights;
  return { cost, price };
}

function composeFullboard(meals, codes, paxA, paxC, nights = 1) {
  return codes
    .map((c) => sumMeals(meals, c, paxA, paxC, nights))
    .reduce(
      (a, b) => ({ cost: a.cost + b.cost, price: a.price + b.price }),
      { cost: 0, price: 0 }
    );
}

export async function buildPackagesMatrix({
  supabase,
  resort_id,
  year,
  paxOptions = [1, 2, 3, 4],
  nights = 1,
}) {
  const { data: cfg } = await supabase
    .from('pricing_configs')
    .select('*')
    .eq('resort_id', resort_id)
    .maybeSingle();

  const { data: ss } = await supabase
    .from('season_settings')
    .select('*')
    .eq('resort_id', resort_id)
    .maybeSingle();

  const { data: rooms } = await supabase
    .from('room_types')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('is_active', true)
    .order('order_index');

  const roomIds = rooms?.map((r) => r.id) || [];

  const { data: rates } = await supabase
    .from('room_type_base_rates')
    .select('*')
    .in('room_type_id', roomIds)
    .eq('year', year);

  const { data: meals } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('is_active', true);

  const { data: packageConfigs } = await supabase
    .from('package_configs')
    .select('*')
    .eq('resort_id', resort_id)
    .eq('is_active', true)
    .order('sort_order');

  if (!cfg || !rooms || rooms.length === 0) {
    return [];
  }

  // Create a map of enabled packages for quick lookup
  const enabledPackages = {};
  packageConfigs?.forEach((pkg) => {
    enabledPackages[pkg.package_code] = pkg;
  });

  const seasons = ['low', 'mid', 'high'];
  const seasonPercent = {
    low: ss?.mult_low ?? -10,
    mid: ss?.mult_mid ?? 0,
    high: ss?.mult_high ?? 15,
  };
  const seasonMult = {
    low: 1 + seasonPercent.low / 100,
    mid: 1 + seasonPercent.mid / 100,
    high: 1 + seasonPercent.high / 100,
  };

  const out = [];

  for (const room of rooms) {
    for (const season of seasons) {
      const rate =
        rates?.find((x) => x.room_type_id === room.id) || {
          cost_base_per_night: 0,
          price_base_per_night: 0,
        };
      const roomCost = parseFloat(rate.cost_base_per_night) || 0;
      const roomPriceBase = parseFloat(rate.price_base_per_night) || 0;
      const roomPriceSeason = roomPriceBase * (seasonMult[season] || 1);

      for (const pax of paxOptions) {
        const paxA = pax;
        const paxC = 0;

        // Room share divisor: room divided among paying guests
        const roomShareDivisor = Math.max(1, paxA);

        // Boat is one-time (return trip), not per night
        const boatCost = parseFloat(cfg.boat_cost_return_trip) || 0;
        const boatPricePerAdult = parseFloat(cfg.price_boat_adult) || 0;
        const boatPricePerChild = parseFloat(cfg.price_boat_child) || 0;
        const boatPriceTotal = boatPricePerAdult * paxA + boatPricePerChild * paxC;

        // Activities are one-time per trip, not per night
        const act3Cost =
          (parseFloat(cfg.activities_3i_cost_trip) || 0) +
          (parseFloat(cfg.cost_activities_3i) || 0) * (paxA + paxC);
        const act3PricePerPax = parseFloat(cfg.price_activities_3i) || 0;
        const act3PriceTotal = act3PricePerPax * (paxA + paxC);

        // Meals are per night
        const p1_meal = sumMeals(meals || [], 'BO', paxA, paxC, nights);

        // RB: Per-adult price = (Room × nights ÷ pax) + Breakfast + Boat
        const roomPricePerAdult = (roomPriceSeason * nights) / roomShareDivisor;
        const breakfastPricePerAdult = p1_meal.price / Math.max(1, paxA + paxC);
        let pricePerAdult = roomPricePerAdult + breakfastPricePerAdult + boatPricePerAdult;
        pricePerAdult = ss?.round_to_rm5 ? Math.round(pricePerAdult / 5) * 5 : Math.round(pricePerAdult);

        const p1_totalPrice = pricePerAdult * paxA;
        const roomCostPerAdult = (roomCost * nights) / roomShareDivisor;
        const p1_cost = roomCostPerAdult * paxA + boatCost + p1_meal.cost;
        const p1_profit = p1_totalPrice - p1_cost;

        if (enabledPackages['RB']) {
          out.push({
            package_code: 'RB',
          package_name: 'Room & Breakfast',
          room_type_id: room.id,
          room_type: room.name,
          season,
          pax,
          nights,
          cost: p1_cost,
          price: pricePerAdult,
          profit: p1_profit / paxA,
          breakdown: {
            room_cost: roomCostPerAdult * paxA,
            room_price: roomPricePerAdult * paxA,
            meal_cost: p1_meal.cost,
            meal_price: p1_meal.price,
            boat_cost: boatCost,
            boat_price: boatPriceTotal,
            room_cost_per_adult: roomCostPerAdult,
            room_price_per_adult: roomPricePerAdult,
            boat_price_per_adult: boatPricePerAdult,
            breakfast_price_per_adult: breakfastPricePerAdult,
            price_per_adult: pricePerAdult,
            total_price: p1_totalPrice,
          },
        });
        }

        // RBB: same as RB (boat already included)
        if (enabledPackages['RBB']) {
          out.push({
            package_code: 'RBB',
          package_name: 'Room + Breakfast + Boat',
          room_type_id: room.id,
          room_type: room.name,
          season,
          pax,
          nights,
          cost: p1_cost,
          price: pricePerAdult,
          profit: p1_profit / paxA,
          breakdown: {
            room_cost: roomCostPerAdult * paxA,
            room_price: roomPricePerAdult * paxA,
            meal_cost: p1_meal.cost,
            meal_price: p1_meal.price,
            boat_cost: boatCost,
            boat_price: boatPriceTotal,
            room_price_per_adult: roomPricePerAdult,
            boat_price_per_adult: boatPricePerAdult,
            breakfast_price_per_adult: breakfastPricePerAdult,
            price_per_adult: pricePerAdult,
            total_price: p1_totalPrice,
          },
        });
        }

        // RB3I: Per-adult = (Room × nights ÷ pax) + Breakfast + Boat + Activities
        const act3PricePerAdult = act3PriceTotal / Math.max(1, paxA + paxC);
        let p2_pricePerAdult = pricePerAdult + act3PricePerAdult;
        p2_pricePerAdult = ss?.round_to_rm5 ? Math.round(p2_pricePerAdult / 5) * 5 : Math.round(p2_pricePerAdult);
        const p2_totalPrice = p2_pricePerAdult * paxA;
        const p2_cost = p1_cost + act3Cost;
        const p2_profit = p2_totalPrice - p2_cost;

        if (enabledPackages['RB3I']) {
          out.push({
            package_code: 'RB3I',
          package_name: 'Room + Breakfast + 3 Islands',
          room_type_id: room.id,
          room_type: room.name,
          season,
          pax,
          nights,
          cost: p2_cost,
          price: p2_pricePerAdult,
          profit: p2_profit / paxA,
          breakdown: {
            room_cost: roomCostPerAdult * paxA,
            room_price: roomPricePerAdult * paxA,
            meal_cost: p1_meal.cost,
            meal_price: p1_meal.price,
            boat_cost: boatCost,
            boat_price: boatPriceTotal,
            activities_cost: act3Cost,
            activities_price: act3PriceTotal,
            room_price_per_adult: roomPricePerAdult,
            boat_price_per_adult: boatPricePerAdult,
            breakfast_price_per_adult: breakfastPricePerAdult,
            activities_price_per_adult: act3PricePerAdult,
            price_per_adult: p2_pricePerAdult,
            total_price: p2_totalPrice,
          },
        });
        }

        // FB: Per-adult = (Room × nights ÷ pax) + Fullboard + Boat
        const fb = composeFullboard(meals || [], ['BO', 'LO', 'DO'], paxA, paxC, nights);
        const fbPricePerAdult = fb.price / Math.max(1, paxA + paxC);
        let p3_pricePerAdult = roomPricePerAdult + fbPricePerAdult + boatPricePerAdult;
        p3_pricePerAdult = ss?.round_to_rm5 ? Math.round(p3_pricePerAdult / 5) * 5 : Math.round(p3_pricePerAdult);
        const p3_totalPrice = p3_pricePerAdult * paxA;
        const p3_cost = roomCostPerAdult * paxA + boatCost + fb.cost;
        const p3_profit = p3_totalPrice - p3_cost;

        if (enabledPackages['FB']) {
          out.push({
            package_code: 'FB',
          package_name: 'Fullboard (B,L,D) + Boat',
          room_type_id: room.id,
          room_type: room.name,
          season,
          pax,
          nights,
          cost: p3_cost,
          price: p3_pricePerAdult,
          profit: p3_profit / paxA,
          breakdown: {
            room_cost: roomCostPerAdult * paxA,
            room_price: roomPricePerAdult * paxA,
            meal_cost: fb.cost,
            meal_price: fb.price,
            boat_cost: boatCost,
            boat_price: boatPriceTotal,
            room_price_per_adult: roomPricePerAdult,
            boat_price_per_adult: boatPricePerAdult,
            fullboard_price_per_adult: fbPricePerAdult,
            price_per_adult: p3_pricePerAdult,
            total_price: p3_totalPrice,
          },
        });
        }

        // FB3I: Per-adult = (Room × nights ÷ pax) + Fullboard + Boat + Activities
        let p4_pricePerAdult = p3_pricePerAdult + act3PricePerAdult;
        p4_pricePerAdult = ss?.round_to_rm5 ? Math.round(p4_pricePerAdult / 5) * 5 : Math.round(p4_pricePerAdult);
        const p4_totalPrice = p4_pricePerAdult * paxA;
        const p4_cost = p3_cost + act3Cost;
        const p4_profit = p4_totalPrice - p4_cost;

        if (enabledPackages['FB3I']) {
          out.push({
            package_code: 'FB3I',
          package_name: 'Fullboard + 3 Islands',
          room_type_id: room.id,
          room_type: room.name,
          season,
          pax,
          nights,
          cost: p4_cost,
          price: p4_pricePerAdult,
          profit: p4_profit / paxA,
          breakdown: {
            room_cost: roomCostPerAdult * paxA,
            room_price: roomPricePerAdult * paxA,
            meal_cost: fb.cost,
            meal_price: fb.price,
            boat_cost: boatCost,
            boat_price: boatPriceTotal,
            activities_cost: act3Cost,
            activities_price: act3PriceTotal,
            room_price_per_adult: roomPricePerAdult,
            boat_price_per_adult: boatPricePerAdult,
            fullboard_price_per_adult: fbPricePerAdult,
            activities_price_per_adult: act3PricePerAdult,
            price_per_adult: p4_pricePerAdult,
            total_price: p4_totalPrice,
          },
        });
        }
      }
    }
  }

  return out.map((r) => ({
    Package: r.package_name,
    PackageCode: r.package_code,
    RoomType: r.room_type,
    RoomTypeId: r.room_type_id,
    Season: r.season.toUpperCase(),
    Pax: r.pax,
    Nights: r.nights,
    Cost: r.cost,
    Price: r.price,
    Profit: r.profit,
    Breakdown: r.breakdown,
  }));
}
