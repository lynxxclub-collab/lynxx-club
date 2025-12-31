-- Add 6 more gifts to the gift_catalog
INSERT INTO public.gift_catalog (name, emoji, credits_cost, animation_type, description, sort_order, active)
VALUES
  ('Trophy', '🏆', 125, 'premium', 'Champion status unlocked', 7, true),
  ('Fireworks', '🎆', 175, 'premium', 'Light up the sky together', 8, true),
  ('Balloon', '🎈', 60, 'standard', 'A fun little surprise', 9, true),
  ('Confetti', '🎊', 100, 'standard', 'Party time celebration', 10, true),
  ('Rocket', '🚀', 225, 'premium', 'To the moon and beyond', 11, true),
  ('Lightning', '⚡', 250, 'ultra', 'Electric connection', 12, true);