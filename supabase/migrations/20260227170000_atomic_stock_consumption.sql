-- Atomic listing stock deduction for paid orders

create or replace function public.consume_listing_stock(
  p_listing_id uuid,
  p_quantity numeric
)
returns table (
  applied boolean,
  remaining_quantity numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining numeric;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  update public.listings
  set
    quantity = quantity - p_quantity,
    status = case
      when quantity - p_quantity <= 0 then 'inactive'::public.listing_status
      else status
    end
  where id = p_listing_id
    and quantity >= p_quantity
  returning quantity into v_remaining;

  if not found then
    return query select false, null::numeric;
    return;
  end if;

  return query select true, v_remaining;
end;
$$;
