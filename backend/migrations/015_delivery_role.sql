-- Enum values cannot be used in the same transaction that adds them, so this file only adds the role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DELIVERY';