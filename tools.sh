#!/bin/bash
# VS-Tools Management Script for Linux
# Usage: ./tools.sh [update|restart|status|logs]

ROOT="$(cd "$(dirname "$0")" && pwd)"
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

case "$1" in
    update)
        echo -e "${CYAN}=== UPDATE ===${NC}"
        
        echo -e "${YELLOW}[1/2] Rebuilding frontend...${NC}"
        cd "$ROOT/frontend"
        rm -rf .next
        npm run build
        
        echo -e "${GREEN}[2/2] Done!${NC}"
        echo -e "${CYAN}Run: ./tools.sh restart${NC}"
        ;;
    
    restart)
        echo -e "${CYAN}=== RESTART ===${NC}"
        
        echo -e "${YELLOW}Restarting via PM2...${NC}"
        pm2 restart all
        pm2 status
        
        echo -e "${GREEN}Services restarted!${NC}"
        ;;
    
    status)
        echo -e "${CYAN}=== STATUS ===${NC}"
        
        # PM2 status
        if command -v pm2 &> /dev/null; then
            echo -e "${CYAN}PM2:${NC}"
            pm2 status
        fi
        
        echo ""
        echo -e "${CYAN}Ports:${NC}"
        
        # Backend check
        echo -n "Backend (8000): "
        if curl -s --max-time 2 http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${RED}DOWN${NC}"
        fi
        
        # Frontend check
        echo -n "Frontend (3000): "
        if curl -s --max-time 2 http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${RED}DOWN${NC}"
        fi
        ;;
    
    logs)
        echo -e "${CYAN}=== LOGS ===${NC}"
        
        echo -e "${YELLOW}PM2 Logs (last 50 lines):${NC}"
        pm2 logs --lines 50 --nostream
        ;;
    
    deploy)
        echo -e "${CYAN}=== FULL DEPLOY ===${NC}"
        
        echo -e "${YELLOW}[1/3] Git pull...${NC}"
        cd "$ROOT"
        git pull
        
        echo -e "${YELLOW}[2/3] Update & build...${NC}"
        $0 update
        
        echo -e "${YELLOW}[3/3] Restart...${NC}"
        $0 restart
        
        echo -e "${GREEN}Deploy complete!${NC}"
        ;;
    
    *)
        echo ""
        echo -e "${CYAN}VS-Tools Management (Linux)${NC}"
        echo ""
        echo "Commands:"
        echo "  update   - Rebuild frontend after git pull"
        echo "  restart  - Restart services via PM2"
        echo "  status   - Check services"
        echo "  logs     - Show PM2 logs"
        echo "  deploy   - Full deploy (pull + update + restart)"
        echo ""
        echo "Example:"
        echo "  git pull"
        echo "  ./tools.sh update"
        echo "  ./tools.sh restart"
        echo ""
        ;;
esac
