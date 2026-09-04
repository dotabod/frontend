begin;

alter table public.win_loss_adjustments
  add constraint win_loss_adjustments_delta_range_check
  check (delta between -1000 and 1000 and delta <> 0)
  not valid;

alter table public.win_loss_adjustments
  validate constraint win_loss_adjustments_delta_range_check;

alter table public.win_loss_adjustments
  drop constraint win_loss_adjustments_delta_check;

alter table public.win_loss_adjustments
  rename constraint win_loss_adjustments_delta_range_check
  to win_loss_adjustments_delta_check;

commit;
