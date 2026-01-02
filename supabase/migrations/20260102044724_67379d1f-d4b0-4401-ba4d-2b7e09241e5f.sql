-- Add role_type column to messages table for role-specific chats
ALTER TABLE public.messages ADD COLUMN role_type text DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.messages.role_type IS 'Role type for role-specific night chats (mafia, detective, doctor). NULL means public message.';