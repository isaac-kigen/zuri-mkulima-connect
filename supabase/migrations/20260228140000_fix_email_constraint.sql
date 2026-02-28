-- Fix email format constraint in profiles table
-- The original regex pattern uses PostgreSQL-specific \S which doesn't work as expected
-- This migration replaces it with a POSIX regex pattern that actually works

alter table public.profiles drop constraint if exists profiles_email_format_chk;

-- New constraint using POSIX regex that properly validates email format
-- Allows: letters, numbers, dots, underscores, percent, plus, hyphen before @
--         letters, numbers, dots, hyphens after @ and before final dot
--         at least 2 letters after final dot
alter table public.profiles add constraint profiles_email_format_chk 
  check (email::text ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
