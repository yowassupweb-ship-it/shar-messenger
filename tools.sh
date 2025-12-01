#!/bin/bash
# VS-Tools Management Script for Linux
# Usage: ./tools.sh [update|restart|stop|status|logs]

ROOT="$(cd "$(dirname "$0")" && pwd)"
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# PID files
BACKEND_PID="$ROOT/backend.pid"
FRONTEND_PID="$ROOT/frontend.pid"

kill_port() {
    local port=$1
    echo -e "${YELLOW}Killing process on port $port...${NC}"
    fuser -k $port/tcp 2>/dev/null || true
}

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
    
    stop)
        echo -e "${CYAN}=== STOP ===${NC}"
        
        # Kill by PID files
        if [ -f "$BACKEND_PID" ]; then
            kill $(cat "$BACKEND_PID") 2>/dev/null
            rm -f "$BACKEND_PID"
            echo -e "${YELLOW}Backend stopped${NC}"
        fi
        
        if [ -f "$FRONTEND_PID" ]; then
            kill $(cat "$FRONTEND_PID") 2>/dev/null
            rm -f "$FRONTEND_PID"
            echo -e "${YELLOW}Frontend stopped${NC}"
        fi
        
        # Kill by ports (backup)
        kill_port 3000
        kill_port 8000
        
        sleep 1
        echo -e "${GREEN}Services stopped${NC}"
        ;;
    
    restart)
        echo -e "${CYAN}=== RESTART ===${NC}"
        
        # Stop first
        $0 stop
        sleep 2
        
        # Start backend
        echo -e "${YELLOW}Starting backend (port 8000)...${NC}"
        cd "$ROOT/backend"
        source venv/bin/activate 2>/dev/null || true
        nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$ROOT/backend.log" 2>&1 &
        echo $! > "$BACKEND_PID"
        echo -e "${GREEN}Backend started (PID: $(cat $BACKEND_PID))${NC}"
        
        # Start frontend
        echo -e "${YELLOW}Starting frontend (port 3000)...${NC}"
        cd "$ROOT/frontend"
        nohup npm start > "$ROOT/frontend.log" 2>&1 &
        echo $! > "$FRONTEND_PID"
        echo -e "${GREEN}Frontend started (PID: $(cat $FRONTEND_PID))${NC}"
        
        sleep 3
        $0 status
        ;;
    
    status)
        echo -e "${CYAN}=== STATUS ===${NC}"
        
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
        
        if [ "$2" = "backend" ]; then
            echo -e "${YELLOW}Backend logs:${NC}"
            tail -100 "$ROOT/backend.log" 2>/dev/null || echo "No logs"
        elif [ "$2" = "frontend" ]; then
            echo -e "${YELLOW}Frontend logs:${NC}"
            tail -100 "$ROOT/frontend.log" 2>/dev/null || echo "No logs"
        else
            echo -e "${YELLOW}Backend logs (last 20):${NC}"
            tail -20 "$ROOT/backend.log" 2>/dev/null || echo "No logs"
            echo ""
            echo -e "${YELLOW}Frontend logs (last 20):${NC}"
            tail -20 "$ROOT/frontend.log" 2>/dev/null || echo "No logs"
        fi
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
        echo "  restart  - Stop and start all services"
        echo "  stop     - Stop all services"
        echo "  status   - Check services"
        echo "  logs [backend|frontend] - Show logs"
        echo "  deploy   - Full deploy (pull + update + restart)"
        echo ""
        echo "Example:"
        echo "  git pull"
        echo "  ./tools.sh update"
        echo "  ./tools.sh restart"
        echo ""
        ;;
esac
