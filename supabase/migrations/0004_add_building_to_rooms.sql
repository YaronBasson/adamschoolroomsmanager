-- Add building field to rooms
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS building text NOT NULL DEFAULT 'יסודי'
  CHECK (building IN ('יסודי', 'תיכון', 'אלוט'));

-- Backfill: high-school floors 5-7
UPDATE public.rooms SET building = 'תיכון'
  WHERE room_number IN ('701','702','703','704','705','706',
                        '601','602','603','604','605','606',
                        '501','502','503','504','514');

-- Backfill: אלוט building
UPDATE public.rooms SET building = 'אלוט'
  WHERE room_number LIKE 'אלוט%';

-- All remaining rooms stay 'יסודי' (floors 1-4)
