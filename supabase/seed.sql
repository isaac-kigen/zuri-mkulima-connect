-- Optional sample data seed for Zuri Mkulima Connect
-- Run after creating at least one farmer and one buyer account.

DO $$
DECLARE
  v_farmer_id uuid;
  v_buyer_id uuid;
  v_listing_id uuid;
BEGIN
  SELECT id INTO v_farmer_id FROM public.profiles WHERE role = 'farmer' LIMIT 1;
  SELECT id INTO v_buyer_id FROM public.profiles WHERE role = 'buyer' LIMIT 1;

  IF v_farmer_id IS NULL THEN
    RAISE NOTICE 'No farmer profile found. Create a farmer account first.';
    RETURN;
  END IF;

  INSERT INTO public.listings (
    farmer_id,
    product_name,
    category,
    quantity,
    unit,
    price_kes,
    location,
    description,
    status
  )
  VALUES
    (v_farmer_id, 'Fresh Tomatoes', 'Vegetables', 300, 'kg', 95, 'Nakuru, Molo', 'Grade A tomatoes, harvested this week.', 'active'),
    (v_farmer_id, 'Sweet Potatoes', 'Tubers', 150, 'bags', 1800, 'Nakuru, Njoro', 'Clean and dry sweet potatoes ready for wholesale.', 'active')
  ON CONFLICT DO NOTHING;

  IF v_buyer_id IS NOT NULL THEN
    SELECT id INTO v_listing_id
    FROM public.listings
    WHERE farmer_id = v_farmer_id
    ORDER BY created_at
    LIMIT 1;

    IF v_listing_id IS NOT NULL THEN
      PERFORM public.place_order(v_listing_id, 10);
    END IF;
  END IF;

  RAISE NOTICE 'Seed completed.';
END $$;
