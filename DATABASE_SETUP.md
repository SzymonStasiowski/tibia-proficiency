# Database Setup Instructions

## The Issue
The voting system is failing because the `votes` table doesn't exist in your Supabase database.

**Error:** `"relation \"public.votes\" does not exist"`

## Solution

### Step 1: Access your Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Navigate to your project
4. Go to the **SQL Editor** tab

### Step 2: Create the votes table
Copy and paste the following SQL into the SQL Editor and run it:

```sql
-- Create votes table for storing user voting data
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    weapon_id UUID NOT NULL REFERENCES public.weapons(id) ON DELETE CASCADE,
    user_session VARCHAR(255) NOT NULL,
    selected_perks JSONB NOT NULL,
    
    -- Ensure one vote per user per weapon
    UNIQUE(weapon_id, user_session)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_votes_weapon_id ON public.votes(weapon_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_session ON public.votes(user_session);
CREATE INDEX IF NOT EXISTS idx_votes_weapon_user ON public.votes(weapon_id, user_session);

-- Enable Row Level Security (RLS)
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on votes" ON public.votes
    FOR ALL 
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_votes_updated_at 
    BEFORE UPDATE ON public.votes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.votes TO anon;
GRANT ALL ON public.votes TO authenticated;
```

### Step 3: Verify the table was created
After running the SQL, you can verify it worked by running:

```sql
SELECT * FROM public.votes LIMIT 1;
```

You should see an empty result set (no error).

### Step 4: Test the voting system
1. Navigate to a weapon page: `http://localhost:3001/weapon/abyss-hammer`
2. Select perks for all slots
3. Click "Submit Your Vote"
4. You should see success toasts and the voting results

## What the votes table stores:

- **id**: Unique identifier for each vote
- **weapon_id**: Reference to the weapon being voted on
- **user_session**: Session ID to prevent duplicate voting
- **selected_perks**: JSON array of selected perk IDs
- **created_at**: When the vote was first submitted
- **updated_at**: When the vote was last modified

## Security Features:

- **Unique constraint**: Prevents multiple votes from same session for same weapon
- **Foreign key**: Ensures votes reference valid weapons
- **RLS enabled**: Row Level Security for future access control
- **Indexes**: Optimized for fast queries by weapon and user session

After creating this table, your voting system should work perfectly!