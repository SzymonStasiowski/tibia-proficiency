# Manual QA Database Setup Guide

If you prefer to set up the QA database manually instead of using the automated script, follow these steps:

## Prerequisites

1. **QA Supabase Project**: Create a new Supabase project for QA
2. **Production Access**: Have your production Supabase credentials
3. **PostgreSQL Client**: Install if not available: `brew install postgresql`

## Option 1: Quick Setup (Recommended for Testing)

### Step 1: Copy Production Schema via Supabase Dashboard

1. **In Production Supabase Dashboard:**
   - Go to **SQL Editor**
   - Click **Templates** > **Schema Migrations**
   - Copy the full schema creation SQL

2. **In QA Supabase Dashboard:**
   - Go to **SQL Editor**
   - Paste and run the schema SQL

### Step 2: Add Sample Data

1. **In QA Supabase Dashboard SQL Editor**, run this to create test data:

```sql
-- Insert sample weapons (adjust based on your actual data)
INSERT INTO weapons (name, weapon_type, vocation, image_url) VALUES
('Sanguine Rod', 'Rod', 'Sorcerer', 'https://example.com/sanguine-rod.gif'),
('Crystal Wand', 'Wand', 'Druid', 'https://example.com/crystal-wand.gif'),
('Falcon Bow', 'Bow', 'Paladin', 'https://example.com/falcon-bow.gif');

-- Insert sample perks for Sanguine Rod
INSERT INTO perks (weapon_id, name, description, tier_level, main_icon_url) 
SELECT w.id, 'Ice Damage Boost', '+10% ice damage', 0, 'https://example.com/ice-icon.png'
FROM weapons w WHERE w.name = 'Sanguine Rod'
UNION ALL
SELECT w.id, 'Earth Damage Boost', '+10% earth damage', 0, 'https://example.com/earth-icon.png'
FROM weapons w WHERE w.name = 'Sanguine Rod'
UNION ALL
SELECT w.id, 'Critical Hit Chance', '+5% critical hit chance', 1, 'https://example.com/crit-icon.png'
FROM weapons w WHERE w.name = 'Sanguine Rod'
UNION ALL
SELECT w.id, 'Damage Reflection', 'Reflects 3% damage', 1, 'https://example.com/reflect-icon.png'
FROM weapons w WHERE w.name = 'Sanguine Rod';

-- Insert sample votes
INSERT INTO votes (weapon_id, user_session, selected_perks)
SELECT w.id, 'qa_test_session_' || generate_random_uuid()::text, 
       jsonb_build_array(p1.id, p2.id)
FROM weapons w
CROSS JOIN LATERAL (
    SELECT id FROM perks WHERE weapon_id = w.id AND tier_level = 0 LIMIT 1
) p1
CROSS JOIN LATERAL (
    SELECT id FROM perks WHERE weapon_id = w.id AND tier_level = 1 LIMIT 1
) p2
WHERE w.name = 'Sanguine Rod';
```

### Step 3: Apply Builds System Schema

1. **Copy the content from** `database/builds_schema.sql`
2. **Run it in QA SQL Editor**

### Step 4: Create Environment File

Create `.env.qa`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-qa-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-qa-anon-key
NODE_ENV=qa
```

## Option 2: Full Data Migration

### Step 1: Export Production Data

```bash
# Get your production database connection string from Supabase dashboard
# Settings > Database > Connection string

# Export schema
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=supabase_functions \
  > production_schema.sql

# Export data
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=supabase_functions \
  --column-inserts \
  > production_data.sql
```

### Step 2: Import to QA

```bash
# Import schema
psql "postgresql://postgres:[QA-PASSWORD]@db.[QA-PROJECT-REF].supabase.co:5432/postgres" \
  -f production_schema.sql

# Import data
psql "postgresql://postgres:[QA-PASSWORD]@db.[QA-PROJECT-REF].supabase.co:5432/postgres" \
  -f production_data.sql
```

### Step 3: Anonymize Data (Optional)

```sql
-- In QA SQL Editor, anonymize sensitive data
UPDATE votes 
SET user_session = 'qa_test_session_' || generate_random_uuid()::text
WHERE user_session NOT LIKE 'qa_%';
```

## Option 3: Use Automated Script

Run the automated script we created:

```bash
./scripts/setup-qa-database.sh
```

This will:
- ✅ Export production schema and data
- ✅ Anonymize sensitive information  
- ✅ Import to QA database
- ✅ Apply builds system schema
- ✅ Create sample builds for testing
- ✅ Set up environment configuration

## Verification

After setup, verify everything works:

1. **Check tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

2. **Check data:**
```sql
SELECT COUNT(*) FROM weapons;
SELECT COUNT(*) FROM perks;
SELECT COUNT(*) FROM votes;
SELECT COUNT(*) FROM builds;  -- Should exist after builds schema
```

3. **Test the app:**
```bash
# Copy QA environment
cp .env.qa .env.local

# Start development server
npm run dev
```

## Next Steps

Once QA is set up:
1. Test existing functionality works
2. Start developing builds system UI
3. Test builds creation and voting
4. Iterate on the features

## Troubleshooting

### Common Issues:

1. **Connection Refused**: Check your database connection string and password
2. **Permission Denied**: Ensure you're using the service role key, not anon key  
3. **Schema Conflicts**: Drop and recreate QA database if needed
4. **Missing Data**: Check if RLS policies are blocking access

### Getting Help:

- Check Supabase logs in dashboard
- Use SQL Editor to test queries directly
- Verify environment variables are correct