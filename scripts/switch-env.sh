#!/bin/bash

# =============================================================================
# Environment Switcher for TibiaVote
# =============================================================================
# Easily switch between production and QA environments
#
# Usage:
#   ./scripts/switch-env.sh qa      # Switch to QA
#   ./scripts/switch-env.sh prod    # Switch to production
#   ./scripts/switch-env.sh status  # Show current environment
# =============================================================================

set -e

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

# Show current environment
show_status() {
    log_info "Current environment status:"
    
    if [[ ! -f ".env.local" ]]; then
        log_warning "No .env.local file found"
        return
    fi
    
    # Source the file to read variables
    source .env.local
    
    echo ""
    log_info "Current .env.local contains:"
    echo "  NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
    
    # Try to determine if it's QA or production
    if [[ -f ".env.local.qa" ]]; then
        source .env.local.qa
        QA_URL_FROM_FILE="$NEXT_PUBLIC_SUPABASE_URL"
        
        # Re-source .env.local to get current values
        source .env.local
        
        if [[ "$NEXT_PUBLIC_SUPABASE_URL" == "$QA_URL_FROM_FILE" ]]; then
            log_success "Currently using: QA environment"
        else
            log_success "Currently using: Production environment"
        fi
    else
        log_warning "Cannot determine environment (no .env.local.qa reference file)"
    fi
    echo ""
}

# Switch to QA environment
switch_to_qa() {
    log_info "Switching to QA environment..."
    
    if [[ ! -f ".env.local.qa" ]]; then
        log_error ".env.local.qa not found!"
        log_error "Please run the QA setup script first:"
        log_error "./scripts/setup-qa-database.sh"
        exit 1
    fi
    
    # Backup current .env.local if it exists
    if [[ -f ".env.local" ]]; then
        cp ".env.local" ".env.local.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backed up current .env.local"
    fi
    
    # Copy QA environment
    cp ".env.local.qa" ".env.local"
    
    log_success "Switched to QA environment"
    log_info "Your app will now connect to the QA database"
    log_warning "Restart your development server: npm run dev"
}

# Switch to production environment
switch_to_prod() {
    log_info "Switching to production environment..."
    
    # Look for the most recent backup or original production file
    BACKUP_FILE=""
    if ls .env.local.backup.* 1> /dev/null 2>&1; then
        # Get the most recent backup
        BACKUP_FILE=$(ls -t .env.local.backup.* | head -n1)
        log_info "Found backup file: $BACKUP_FILE"
    else
        log_error "No production backup found!"
        log_error "Please manually create .env.local with your production credentials:"
        log_error ""
        log_error "NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co"
        log_error "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key"
        log_error "NEXT_PUBLIC_SUPABASE_URL_QA=https://your-qa-project.supabase.co"
        log_error "NEXT_PUBLIC_SUPABASE_ANON_KEY_QA=your-qa-anon-key"
        exit 1
    fi
    
    # Backup current .env.local
    if [[ -f ".env.local" ]]; then
        cp ".env.local" ".env.local.current.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Restore production environment
    cp "$BACKUP_FILE" ".env.local"
    
    log_success "Switched to production environment"
    log_warning "⚠️  You are now connected to PRODUCTION database"
    log_warning "Restart your development server: npm run dev"
}

# Main function
main() {
    case "${1:-}" in
        "qa")
            switch_to_qa
            ;;
        "prod" | "production")
            switch_to_prod
            ;;
        "status" | "")
            show_status
            ;;
        *)
            log_error "Unknown command: $1"
            echo ""
            log_info "Usage:"
            echo "  $0 qa      # Switch to QA environment"
            echo "  $0 prod    # Switch to production environment" 
            echo "  $0 status  # Show current environment"
            exit 1
            ;;
    esac
}

main "$@"