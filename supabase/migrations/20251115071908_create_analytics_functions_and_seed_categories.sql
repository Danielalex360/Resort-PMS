/*
  # Create Analytics Functions and Seed Default Categories

  1. Functions
    - get_room_sales_report(resort_id, start_date, end_date)
    - get_daily_revenue_report(resort_id, report_date)
    - get_collection_report(resort_id, start_date, end_date)
    - calculate_ytd_stats(resort_id, current_date)
    - generate_next_document_number(resort_id, doc_type, doc_date)

  2. Seed Data
    - Default accounting categories for new resorts

  3. Notes
    - Functions use resort_id as text to match user_roles
    - All financial calculations in RM (Malaysian Ringgit)
*/

-- Function: Generate next document number with daily sequence
CREATE OR REPLACE FUNCTION generate_next_document_number(
  p_resort_id text,
  p_document_type document_type,
  p_document_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number int;
  v_doc_number text;
  v_prefix text;
BEGIN
  -- Determine prefix based on document type
  v_prefix := CASE p_document_type
    WHEN 'invoice' THEN 'INV'
    WHEN 'receipt' THEN 'RCPT'
    WHEN 'folio' THEN 'FOLIO'
    WHEN 'registration_form' THEN 'REG'
    WHEN 'cancellation_record' THEN 'CANC'
    WHEN 'refund_receipt' THEN 'RFND'
  END;

  -- Get and increment sequence number
  INSERT INTO document_sequences (resort_id, document_type, sequence_date, last_number)
  VALUES (p_resort_id, p_document_type, p_document_date, 1)
  ON CONFLICT (resort_id, document_type, sequence_date)
  DO UPDATE SET 
    last_number = document_sequences.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;

  -- Format: PREFIX-YYYYMMDD-0001
  v_doc_number := v_prefix || '-' || 
                  TO_CHAR(p_document_date, 'YYYYMMDD') || '-' ||
                  LPAD(v_next_number::text, 4, '0');

  RETURN v_doc_number;
END;
$$;

-- Function: Get room sales report
CREATE OR REPLACE FUNCTION get_room_sales_report(
  p_resort_id text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  room_type_name text,
  total_revenue decimal,
  nights_sold int,
  adr decimal,
  occupancy_percent decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.name,
    COALESCE(SUM(b.price_total), 0)::decimal AS total_revenue,
    COUNT(DISTINCT (b.id, generate_series(b.check_in::date, b.check_out::date - 1, '1 day')))::int AS nights_sold,
    CASE 
      WHEN COUNT(DISTINCT (b.id, generate_series(b.check_in::date, b.check_out::date - 1, '1 day'))) > 0
      THEN (SUM(b.price_total) / COUNT(DISTINCT (b.id, generate_series(b.check_in::date, b.check_out::date - 1, '1 day'))))::decimal
      ELSE 0::decimal
    END AS adr,
    0::decimal AS occupancy_percent
  FROM room_types rt
  LEFT JOIN bookings b ON b.room_type_id = rt.id::text
    AND b.check_in >= p_start_date
    AND b.check_out <= p_end_date + 1
    AND b.status NOT IN ('cancelled', 'refunded', 'no-show')
  WHERE rt.resort_id = p_resort_id
    AND rt.is_active = true
  GROUP BY rt.name
  ORDER BY total_revenue DESC;
END;
$$;

-- Function: Get daily revenue report
CREATE OR REPLACE FUNCTION get_daily_revenue_report(
  p_resort_id text,
  p_report_date date
)
RETURNS TABLE (
  category text,
  amount decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.category_name,
    COALESCE(SUM(bli.total_amount), 0)::decimal
  FROM accounting_categories ac
  LEFT JOIN booking_line_items bli ON bli.category_id = ac.id
    AND bli.item_date = p_report_date
  WHERE ac.resort_id = p_resort_id
    AND ac.is_active = true
  GROUP BY ac.category_name, ac.display_order
  ORDER BY ac.display_order;
END;
$$;

-- Function: Get collection report (payment methods breakdown)
CREATE OR REPLACE FUNCTION get_collection_report(
  p_resort_id text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  payment_method text,
  total_amount decimal,
  transaction_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.payment_method,
    COALESCE(SUM(p.amount), 0)::decimal AS total_amount,
    COUNT(*)::bigint AS transaction_count
  FROM payments p
  WHERE p.resort_id = p_resort_id
    AND p.payment_date >= p_start_date
    AND p.payment_date <= p_end_date
  GROUP BY p.payment_method
  ORDER BY total_amount DESC;
END;
$$;

-- Function: Calculate YTD statistics
CREATE OR REPLACE FUNCTION calculate_ytd_stats(
  p_resort_id text,
  p_current_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  ytd_revenue decimal,
  ytd_nights int,
  ytd_adr decimal,
  ytd_revpar decimal,
  ytd_occupancy decimal,
  lytd_revenue decimal,
  lytd_nights int,
  mom_revenue_change decimal,
  wow_revenue_change decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year_start date;
  v_last_year_start date;
  v_last_year_end date;
  v_month_start date;
  v_last_month_start date;
  v_last_month_end date;
  v_week_start date;
  v_last_week_start date;
  v_last_week_end date;
BEGIN
  v_year_start := DATE_TRUNC('year', p_current_date)::date;
  v_last_year_start := DATE_TRUNC('year', p_current_date - INTERVAL '1 year')::date;
  v_last_year_end := p_current_date - INTERVAL '1 year';
  v_month_start := DATE_TRUNC('month', p_current_date)::date;
  v_last_month_start := DATE_TRUNC('month', p_current_date - INTERVAL '1 month')::date;
  v_last_month_end := v_month_start - 1;
  v_week_start := DATE_TRUNC('week', p_current_date)::date;
  v_last_week_start := DATE_TRUNC('week', p_current_date - INTERVAL '1 week')::date;
  v_last_week_end := v_week_start - 1;

  RETURN QUERY
  WITH ytd AS (
    SELECT 
      COALESCE(SUM(b.price_total), 0) AS revenue,
      COALESCE(SUM(b.nights), 0) AS nights
    FROM bookings b
    WHERE b.resort_id = p_resort_id
      AND b.check_in >= v_year_start
      AND b.check_in <= p_current_date
      AND b.status NOT IN ('cancelled', 'refunded', 'no-show')
  ),
  lytd AS (
    SELECT 
      COALESCE(SUM(b.price_total), 0) AS revenue,
      COALESCE(SUM(b.nights), 0) AS nights
    FROM bookings b
    WHERE b.resort_id = p_resort_id
      AND b.check_in >= v_last_year_start
      AND b.check_in <= v_last_year_end
      AND b.status NOT IN ('cancelled', 'refunded', 'no-show')
  ),
  current_month AS (
    SELECT COALESCE(SUM(b.price_total), 0) AS revenue
    FROM bookings b
    WHERE b.resort_id = p_resort_id
      AND b.check_in >= v_month_start
      AND b.check_in <= p_current_date
      AND b.status NOT IN ('cancelled', 'refunded', 'no-show')
  ),
  last_month AS (
    SELECT COALESCE(SUM(b.price_total), 0) AS revenue
    FROM bookings b
    WHERE b.resort_id = p_resort_id
      AND b.check_in >= v_last_month_start
      AND b.check_in <= v_last_month_end
      AND b.status NOT IN ('cancelled', 'refunded', 'no-show')
  ),
  current_week AS (
    SELECT COALESCE(SUM(b.price_total), 0) AS revenue
    FROM bookings b
    WHERE b.resort_id = p_resort_id
      AND b.check_in >= v_week_start
      AND b.check_in <= p_current_date
      AND b.status NOT IN ('cancelled', 'refunded', 'no-show')
  ),
  last_week AS (
    SELECT COALESCE(SUM(b.price_total), 0) AS revenue
    FROM bookings b
    WHERE b.resort_id = p_resort_id
      AND b.check_in >= v_last_week_start
      AND b.check_in <= v_last_week_end
      AND b.status NOT IN ('cancelled', 'refunded', 'no-show')
  )
  SELECT 
    ytd.revenue::decimal AS ytd_revenue,
    ytd.nights::int AS ytd_nights,
    CASE WHEN ytd.nights > 0 THEN (ytd.revenue / ytd.nights)::decimal ELSE 0::decimal END AS ytd_adr,
    0::decimal AS ytd_revpar,
    0::decimal AS ytd_occupancy,
    lytd.revenue::decimal AS lytd_revenue,
    lytd.nights::int AS lytd_nights,
    CASE 
      WHEN last_month.revenue > 0 
      THEN (((current_month.revenue - last_month.revenue) / last_month.revenue) * 100)::decimal
      ELSE 0::decimal
    END AS mom_revenue_change,
    CASE 
      WHEN last_week.revenue > 0 
      THEN (((current_week.revenue - last_week.revenue) / last_week.revenue) * 100)::decimal
      ELSE 0::decimal
    END AS wow_revenue_change
  FROM ytd, lytd, current_month, last_month, current_week, last_week;
END;
$$;