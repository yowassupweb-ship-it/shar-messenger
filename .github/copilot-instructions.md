# Вокруг света - Feed Editor & Tour Management System

Full-stack travel feed management application with React/Next.js frontend and Python FastAPI backend.

## 🏗️ Architecture Overview

### Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Python FastAPI + Uvicorn
- **Database**: JSON file-based storage (`backend/database.json`)
- **Parsing**: BeautifulSoup4 for HTML scraping from vs-travel.ru
- **Analytics**: Yandex.Metrika integration
- **AI**: DeepSeek API for chat assistance

### Project Structure
```
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # App Router pages (Next.js 13+ structure)
│   │   ├── components/ # Reusable React components
│   │   ├── lib/       # Utilities (db, export, yandex-wordstat)
│   │   └── types/     # TypeScript definitions
├── backend/           # FastAPI server
│   ├── main.py        # Main API routes
│   ├── database.py    # Database layer (JSON operations)
│   ├── feed_generator.py  # XML feed generation
│   ├── parser/        # HTML parsers (tour_parser.py)
│   └── database.json  # Persistent data storage
├── shared/            # Shared TypeScript types
├── cli.ps1           # Management CLI tool
└── start-server.ps1  # Production startup script
```

## 🔐 Authentication System

**Critical**: Authentication uses API-based verification (not client-only!)

- Login endpoint: `POST /api/auth/login`
- Credentials stored in `database.json` → `users` array
- Default admin: `username: admin, password: admin, role: admin`
- Frontend stores: `isAuthenticated`, `username`, `userRole` in localStorage
- Admin check: `userRole === 'admin'` (not username comparison!)

**Files involved**:
- `frontend/src/app/login/page.tsx` - Login UI with API call
- `frontend/src/app/page.tsx` - Role-based UI rendering
- `backend/main.py` - `/api/auth/login` endpoint
- `backend/database.py` - `verify_user()` method

## 🚀 Quick Start Commands

### Using CLI (Recommended)
```powershell
.\cli.ps1 dev              # Start both services in dev mode
.\cli.ps1 start both       # Start production servers
.\cli.ps1 stop both        # Stop all services
.\cli.ps1 status           # Check services status
.\cli.ps1 db:backup        # Backup database
.\cli.ps1 help             # Full command list
```

### Manual Start
```powershell
# Backend (port 8000)
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (port 3000)
cd frontend
npm run dev
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- API OpenAPI: http://localhost:8000/openapi.json

## 📊 Key API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication

### Data Sources
- `GET /api/data-sources` - List all sources
- `POST /api/data-sources` - Create source
- `POST /api/data-sources/{id}/parse` - Trigger parsing
- `POST /api/data-sources/{id}/stop-parse` - Stop parsing

### Products
- `GET /api/products` - List all products
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product

### Feeds
- `GET /api/feeds` - List feeds
- `POST /api/feeds` - Create feed
- `GET /api/feeds/{id}/xml` - Generate Yandex.Market XML feed

### Templates & Collections
- `GET /api/templates` - UTM/feed templates
- `GET /api/collections` - Product collections

### System
- `GET /api/settings` - Global settings
- `PUT /api/settings` - Update settings
- `GET /api/logs` - System logs

## 🎨 Frontend Routing

Next.js App Router structure:
- `/` - Main dashboard (page.tsx)
- `/login` - Authentication
- `/admin` - Admin panel
- `/feeds` - Feed management
- `/products` - Product catalog
- `/data-sources` - Source configuration
- `/templates` - Template editor
- `/slovolov` - Yandex Wordstat keyword tool
- `/settings` - Application settings

## 🔄 Data Flow Patterns

### Product Parsing Flow
1. User creates data source with URL (e.g., vs-travel.ru filter URL)
2. Backend triggers `tour_parser.py` → scrapes HTML
3. Parser extracts tour data (id, name, price, image, days, route)
4. Products synced to `database.json` with `sourceId` reference
5. Frontend displays products with real-time status updates

### Feed Generation Flow
1. User creates feed with source/collection selection
2. System maps products to Yandex.Market XML schema
3. UTM parameters applied from templates
4. XML accessible via `/api/feeds/{id}/xml`
5. Optional HTTP Basic Auth protection

## 🗄️ Database Schema (JSON)

Key collections in `database.json`:
```typescript
{
  settings: { siteName, siteUrl, metricaToken, wordstatToken, ... },
  dataSources: [{ id, name, url, type, lastSync, itemsCount, ... }],
  products: [{ id, name, price, image, sourceId, active, ... }],
  feeds: [{ id, name, sourceId, format, settings, ... }],
  users: [{ id, username, password, role, ... }],
  templates: [{ id, name, type, content, ... }],
  collections: [{ id, name, productIds, ... }],
  logs: [{ id, type, message, status, timestamp, ... }],
  analytics: [{ productId, views, clicks, ... }]
}
```

## 🛠️ Development Conventions

### Code Style
- **TypeScript**: Strict mode, explicit types preferred
- **Python**: PEP 8 style, type hints encouraged
- **React**: Functional components + hooks (no class components)
- **API**: RESTful conventions, JSON responses

### State Management
- **Frontend**: React hooks (useState, useEffect), no external state lib
- **Backend**: In-memory parsing state, persistent JSON storage

### Error Handling
- **API**: HTTP exceptions with descriptive messages
- **Frontend**: Toast notifications, error boundaries
- **Logging**: Centralized in `database.json` → `logs`

### File Naming
- **Components**: PascalCase (e.g., `ApiStatus.tsx`)
- **Pages**: lowercase (e.g., `page.tsx`, `layout.tsx`)
- **Utils**: camelCase (e.g., `formatDays.ts`)
- **API routes**: RESTful paths (e.g., `/api/products/{id}`)

## 🔧 Common Development Tasks

### Adding New API Endpoint
1. Define Pydantic model in `backend/main.py`
2. Add route decorator (@app.get/post/put/delete)
3. Implement database operation in `database.py`
4. Test via `/docs` Swagger UI
5. Create frontend API call in `lib/` or component

### Creating New Page
1. Add directory in `frontend/src/app/`
2. Create `page.tsx` with default export
3. Optional: Add `layout.tsx` for nested layout
4. Use Sidebar component for navigation
5. Fetch data client-side with `useEffect` + `fetch`

### Database Migration
1. Backup: `.\cli.ps1 db:backup`
2. Modify structure in `database.py` → `_get_default_structure()`
3. Update existing data manually in `database.json`
4. Test thoroughly before deployment

## 🐛 Debugging Tips

### Backend Issues
- Check `database.json` for data integrity
- View logs: `GET /api/logs` or browser console
- Use FastAPI docs: http://localhost:8000/docs
- Parsing errors logged with `sourceId` reference

### Frontend Issues
- Check localStorage for auth state (`isAuthenticated`, `userRole`)
- Network tab for API call failures
- React DevTools for component state
- Next.js dev server shows detailed error pages

### Common Gotchas
- **CORS**: Backend has CORS middleware enabled for localhost:3000
- **Port conflicts**: Use `.\cli.ps1 status` to check running services
- **Auth issues**: Verify `userRole` in localStorage matches API response
- **Parsing failures**: Check source URL accessibility and HTML structure

## 📦 Dependencies Management

### Install All
```powershell
.\cli.ps1 install
```

### Backend (requirements.txt)
Key packages: `fastapi`, `uvicorn`, `beautifulsoup4`, `aiohttp`, `pydantic`

### Frontend (package.json)
Key packages: `next`, `react`, `react-dom`, `chart.js`, `lucide-react`

## 🚢 Deployment Checklist

- [ ] Update environment variables (Yandex tokens, API keys)
- [ ] Run `.\cli.ps1 build` for production build
- [ ] Backup database: `.\cli.ps1 db:backup`
- [ ] Set up reverse proxy (nginx) for backend
- [ ] Configure SSL certificates
- [ ] Test authentication flow end-to-end
- [ ] Verify feed XML generation
- [ ] Check Yandex.Metrika integration

## 📝 Notes for AI Agents

- **Always** check `userRole` from localStorage/API for admin features
- Database operations go through `database.py`, never manipulate JSON directly
- Parsing is async - update UI with status indicators
- Feed XML must conform to Yandex.Market schema
- UTM parameters come from templates, not hardcoded
- Logs stored in DB, not separate files
- CLI is PowerShell-based (Windows environment)