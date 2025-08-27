-- Remove unavailable_times column from time_preferences table
ALTER TABLE public.time_preferences DROP COLUMN IF EXISTS unavailable_times;