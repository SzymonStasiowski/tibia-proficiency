#!/bin/bash

# =============================================================================
# QA Database Setup Script for TibiaVote
# =============================================================================
# This script helps you duplicate your production Supabase database to QA
# 
# Prerequisites:
# 1. Have Supabase CLI installed (supabase --version)
# 2. Have your production Supabase project URL and service role key
# 3. Have your QA Supabase project URL and service role key
# 
# Usage:
# ./scripts/setup-qa-database.sh
#
# The script will:
# 1. Export production schema and data
# 2. Import to QA project
# 3. Apply the new builds system schema
# 4. Create sample builds data for testing
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI not found. Please install it first:"
        log_error "brew install supabase/tap/supabase"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log_warning "psql not found. Installing PostgreSQL client..."
        brew install postgresql
    fi
    
    log_success "All dependencies are available"
}

# Load environment variables
load_env_variables() {
    log_info "Loading environment variables from .env.local..."
    
    # Check if .env.local exists
    if [[ ! -f ".env.local" ]]; then
        log_error ".env.local file not found!"
        log_error "Please create .env.local with your Supabase credentials:"
        log_error ""
        log_error "NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co"
        log_error "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key"
        log_error "NEXT_PUBLIC_SUPABASE_URL_QA=https://your-qa-project.supabase.co"
        log_error "NEXT_PUBLIC_SUPABASE_ANON_KEY_QA=your-qa-anon-key"
        exit 1
    fi
    
    # Load environment variables
    source .env.local
    
    # Map to our script variables
    PROD_URL="$NEXT_PUBLIC_SUPABASE_URL"
    QA_URL="$NEXT_PUBLIC_SUPABASE_URL_QA"
    
    # For database operations, we need service role keys, not anon keys
    # We'll need to prompt for these since they shouldn't be in .env.local
    echo ""
    log_warning "Database migration requires SERVICE ROLE keys (not anon keys)"
    log_info "You can find these in your Supabase Dashboard > Settings > API"
    echo ""
    
    log_info "Production Service Role Key (for: $PROD_URL):"
    read -s -p "Enter production service role key: " PROD_SERVICE_KEY
    echo ""
    
    log_info "QA Service Role Key (for: $QA_URL):"
    read -s -p "Enter QA service role key: " QA_SERVICE_KEY
    echo ""
    
    # Validate URLs
    if [[ -z "$PROD_URL" || ! $PROD_URL =~ ^https://.*\.supabase\.co$ ]]; then
        log_error "Invalid or missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
        exit 1
    fi
    
    if [[ -z "$QA_URL" || ! $QA_URL =~ ^https://.*\.supabase\.co$ ]]; then
        log_error "Invalid or missing NEXT_PUBLIC_SUPABASE_URL_QA in .env.local"
        exit 1
    fi
    
    if [[ -z "$PROD_SERVICE_KEY" ]]; then
        log_error "Production service role key is required"
        exit 1
    fi
    
    if [[ -z "$QA_SERVICE_KEY" ]]; then
        log_error "QA service role key is required"
        exit 1
    fi
    
    log_success "Environment variables loaded successfully"
    log_info "Production: $PROD_URL"
    log_info "QA: $QA_URL"
}

# Create backup directory
setup_backup_dir() {
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    log_info "Created backup directory: $BACKUP_DIR"
}

# Export production schema
export_production_schema() {
    log_info "Exporting production database schema..."
    
    # Extract connection details from URL
    PROD_PROJECT_REF=$(echo $PROD_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
    PROD_HOST="db.${PROD_PROJECT_REF}.supabase.co"
    
    # Export schema (structure only, no data)
    PGPASSWORD="$PROD_SERVICE_KEY" pg_dump \
        -h $PROD_HOST \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-privileges \
        --exclude-schema=auth \
        --exclude-schema=storage \
        --exclude-schema=realtime \
        --exclude-schema=supabase_functions \
        --exclude-schema=extensions \
        -f "$BACKUP_DIR/schema.sql"
    
    log_success "Schema exported to $BACKUP_DIR/schema.sql"
}

# Export production data
export_production_data() {
    log_info "Exporting production database data..."
    
    PROD_PROJECT_REF=$(echo $PROD_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
    PROD_HOST="db.${PROD_PROJECT_REF}.supabase.co"
    
    # Export data only (no schema)
    PGPASSWORD="$PROD_SERVICE_KEY" pg_dump \
        -h $PROD_HOST \
        -U postgres \
        -d postgres \
        --data-only \
        --no-owner \
        --no-privileges \
        --exclude-schema=auth \
        --exclude-schema=storage \
        --exclude-schema=realtime \
        --exclude-schema=supabase_functions \
        --exclude-schema=extensions \
        --column-inserts \
        -f "$BACKUP_DIR/data.sql"
    
    log_success "Data exported to $BACKUP_DIR/data.sql"
}

# Anonymize sensitive data
anonymize_data() {
    log_info "Anonymizing sensitive data for QA environment..."
    
    # Create anonymized version of data
    cp "$BACKUP_DIR/data.sql" "$BACKUP_DIR/data_anonymized.sql"
    
    # Replace user sessions with test sessions (keep format but anonymize)
    sed -i '' 's/sec_[a-zA-Z0-9_-]\{20,\}/qa_test_session_'$(date +%s)'_XXXX/g' "$BACKUP_DIR/data_anonymized.sql"
    
    # You can add more anonymization rules here as needed
    # Example: Replace email patterns, IP addresses, etc.
    
    log_success "Data anonymized in $BACKUP_DIR/data_anonymized.sql"
}

# Import to QA database
import_to_qa() {
    log_info "Importing schema and data to QA database..."
    
    QA_PROJECT_REF=$(echo $QA_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
    QA_HOST="db.${QA_PROJECT_REF}.supabase.co"
    
    # Import schema first
    log_info "Importing schema..."
    PGPASSWORD="$QA_SERVICE_KEY" psql \
        -h $QA_HOST \
        -U postgres \
        -d postgres \
        -f "$BACKUP_DIR/schema.sql" \
        -v ON_ERROR_STOP=1
    
    # Import anonymized data
    log_info "Importing anonymized data..."
    PGPASSWORD="$QA_SERVICE_KEY" psql \
        -h $QA_HOST \
        -U postgres \
        -d postgres \
        -f "$BACKUP_DIR/data_anonymized.sql" \
        -v ON_ERROR_STOP=1
    
    log_success "Database imported to QA environment"
}

# Apply builds system schema
apply_builds_schema() {
    log_info "Applying builds system schema to QA database..."
    
    QA_PROJECT_REF=$(echo $QA_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
    QA_HOST="db.${QA_PROJECT_REF}.supabase.co"
    
    # Apply the builds schema
    PGPASSWORD="$QA_SERVICE_KEY" psql \
        -h $QA_HOST \
        -U postgres \
        -d postgres \
        -f "./database/builds_schema.sql" \
        -v ON_ERROR_STOP=1
    
    log_success "Builds system schema applied"
}

# Create sample builds data
create_sample_builds() {
    log_info "Creating sample builds data for testing..."
    
    QA_PROJECT_REF=$(echo $QA_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
    QA_HOST="db.${QA_PROJECT_REF}.supabase.co"
    
    # Create sample builds SQL
    cat > "$BACKUP_DIR/sample_builds.sql" << 'EOF'
-- Sample builds for testing the builds system
-- This will create example builds for weapons that exist in your database

-- Insert sample builds for different weapons and situations
DO $$
DECLARE
    sample_weapon_id UUID;
    sample_perks JSONB;
BEGIN
    -- Get a sample weapon ID (we'll use the first available weapon)
    SELECT id INTO sample_weapon_id FROM weapons LIMIT 1;
    
    -- Create sample perk combinations (you'll need to adjust these based on your actual perk IDs)
    sample_perks := '["perk1", "perk2", "perk3"]'::jsonb;
    
    -- Insert sample builds if weapon exists
    IF sample_weapon_id IS NOT NULL THEN
        -- Ice damage solo hunting build
        INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
        VALUES (
            sample_weapon_id,
            'Ice Damage Solo Build',
            'Optimized for solo hunting with ice damage focus. Great for ice-vulnerable creatures.',
            ARRAY['ice_damage', 'solo', 'hunting'],
            sample_perks,
            'qa_test_session_ice_solo_' || extract(epoch from now())::text
        );
        
        -- Earth damage team build
        INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
        VALUES (
            sample_weapon_id,
            'Earth Team Hunting',
            'Team-oriented build focused on earth damage and crowd control.',
            ARRAY['earth_damage', 'team', 'hunting'],
            sample_perks,
            'qa_test_session_earth_team_' || extract(epoch from now())::text
        );
        
        -- Boss fighting build
        INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
        VALUES (
            sample_weapon_id,
            'Boss Destroyer',
            'High DPS build specifically designed for boss encounters.',
            ARRAY['bosses', 'high_level', 'physical_damage'],
            sample_perks,
            'qa_test_session_boss_' || extract(epoch from now())::text
        );
        
        -- Profit hunting build
        INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
        VALUES (
            sample_weapon_id,
            'Profit Hunter',
            'Focused on efficient hunting for maximum profit per hour.',
            ARRAY['profit', 'solo', 'hunting', 'low_level'],
            sample_perks,
            'qa_test_session_profit_' || extract(epoch from now())::text
        );
    END IF;
END $$;

-- Add some sample votes for the builds
DO $$
DECLARE
    build_record RECORD;
    vote_session TEXT;
BEGIN
    -- Add votes to each build to test the voting system
    FOR build_record IN SELECT id FROM builds WHERE user_session LIKE 'qa_test_session_%' LOOP
        -- Add 3-5 random votes per build
        FOR i IN 1..5 LOOP
            vote_session := 'qa_voter_' || i::text || '_' || extract(epoch from now())::text;
            
            INSERT INTO build_votes (build_id, user_session)
            VALUES (build_record.id, vote_session)
            ON CONFLICT (build_id, user_session) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
EOF
    
    # Apply sample data
    PGPASSWORD="$QA_SERVICE_KEY" psql \
        -h $QA_HOST \
        -U postgres \
        -d postgres \
        -f "$BACKUP_DIR/sample_builds.sql" \
        -v ON_ERROR_STOP=1
    
    log_success "Sample builds data created"
}

# Update environment file for QA testing
update_env_for_qa() {
    log_info "Creating QA environment configuration..."
    
    # Create backup of current .env.local
    if [[ -f ".env.local" ]]; then
        cp ".env.local" ".env.local.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backed up current .env.local"
    fi
    
    # Create .env.local.qa for QA testing
    cat > ".env.local.qa" << EOF
# QA Environment Configuration
# Use this for testing the builds system
# To switch: cp .env.local.qa .env.local

NEXT_PUBLIC_SUPABASE_URL=$QA_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY_QA
NODE_ENV=qa

# Keep production values for reference
NEXT_PUBLIC_SUPABASE_URL_PROD=$PROD_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Original QA values (for switching back)
NEXT_PUBLIC_SUPABASE_URL_QA=$QA_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY_QA=$NEXT_PUBLIC_SUPABASE_ANON_KEY_QA
EOF
    
    log_success "QA environment file created: .env.local.qa"
    log_info "To test QA environment: cp .env.local.qa .env.local"
    log_info "To restore production: cp .env.local.backup.* .env.local"
}

# Main execution
main() {
    log_info "Starting QA database setup for TibiaVote..."
    
    check_dependencies
    load_env_variables
    setup_backup_dir
    
    log_info "Step 1/7: Exporting production schema..."
    export_production_schema
    
    log_info "Step 2/7: Exporting production data..."
    export_production_data
    
    log_info "Step 3/7: Anonymizing data..."
    anonymize_data
    
    log_info "Step 4/7: Importing to QA database..."
    import_to_qa
    
    log_info "Step 5/7: Applying builds system schema..."
    apply_builds_schema
    
    log_info "Step 6/7: Creating sample builds data..."
    create_sample_builds
    
    log_info "Step 7/7: Creating QA environment configuration..."
    update_env_for_qa
    
    echo ""
    log_success "🎉 QA database setup completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "1. Update .env.qa with your QA anon key from Supabase dashboard"
    echo "2. Copy .env.qa to .env.local to test locally"
    echo "3. Start your development server: npm run dev"
    echo "4. Test the builds system with the sample data"
    echo ""
    log_info "Backup files saved in: $BACKUP_DIR"
}

# Run main function
main "$@"