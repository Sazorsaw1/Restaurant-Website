# E-Restaurant Web App

A full-stack restaurant ordering app with a customer-facing menu and a separate staff-only dashboard.

## Current Features

### Customer App
- Browse menu items on the homepage
- Search and filter by category
- Create an order from a modal
- Generate an order ID in the `ORD-XXXXXX` format
- Check order status by entering only the numeric part of the order ID

### Staff Dashboard
- Separate login page for staff
- Role-based access for `admin`, `staff`, and `chef`
- Update customer order statuses
- Update prices for existing menu items
- Chef and admin can add menu items with an image path or URL
- Chef and admin can archive or restore menu items without deleting the database record
- Large or detailed orders show a staff-follow-up notice after submission and inside the dashboard
- Admin-only user management for staff dashboard accounts
- Completed orders are automatically deleted after about 30 seconds for testing
- Basic anti-spam protection is enabled for admin login, order submission, and order lookup requests

### Data
- Orders are stored in Neon Postgres
- Staff accounts and sessions are stored in Neon Postgres
- Menu items are served from the database
- Customer menu also has a local fallback list so the UI can still render if the backend menu call fails

### Deployment
- Vercel is configured for Git-based deployments
- `main` is the production branch
- `Dev1.1` is used for preview deployments
- The app is available through both customer routes and staff-only admin routes

## Tech Stack

- Frontend: HTML, Tailwind CSS, Vanilla JavaScript
- Backend: Node.js, Express
- Database: NeonDB (PostgreSQL)

## Project Structure

```text
Restaurant Website/
|-- Assets/
|-- Backend/
|   |-- db.js
|   |-- server.js
|   |-- scripts/
|   `-- .env.example
|-- CSS/
|-- JS/
|   |-- admin-login.js
|   |-- admin.js
|   |-- app.js
|   |-- CheckOrder.js
|   |-- menu.js
|   `-- order.js
|-- admin-login.html
|-- admin.html
`-- index.html
```

## Local Setup

### 1. Install backend dependencies

From `Backend/`:

```powershell
npm install
```

### 2. Configure environment variables

Create `Backend/.env` using `Backend/.env.example` as a template.

Required values include:

```env
DATABASE_URL=your_neon_connection_string
PORT=3000
```

Do not commit your real `.env` file or database credentials.

### 3. Start the backend

From `Backend/`:

```powershell
npm start
```

For development with automatic restart:

```powershell
npm run dev
```

### 4. Open the frontend

You can:

- open the customer page through the backend at `http://localhost:3000/`
- open the staff login page through the backend at `http://localhost:3000/admin-login`
- or use Live Server for the HTML files while keeping the backend running on port `3000`

When using Live Server, the frontend is already configured to call the backend on port `3000`.

## Deployment Setup

### Vercel

- Production branch: `main`
- Preview branch used in current workflow: `Dev1.1`
- Production URL pattern: `https://your-project-name.vercel.app`
- Preview URL pattern: `https://your-project-name-git-your-branch.vercel.app`

### Production Routes

- Customer page: `/`
- Staff login: `/admin-login`
- Staff dashboard: `/admin`

### Required Vercel Environment Variables

```env
DATABASE_URL=your_neon_connection_string
```

Without `DATABASE_URL`, menu loading, order creation, order lookup, and admin login will not work in deployed environments.

## Admin Account Setup

Create the first admin account from `Backend/`:

```powershell
npm run create:admin -- <username> <password> "<full name>"
```

Example:

```powershell
npm run create:admin -- admin StrongPassword123 "Restaurant Admin"
```

## Staff Roles

- `admin`: can create users, remove users, change another user's role, update order statuses, change prices, and manage the menu catalog
- `staff`: can update order statuses and change prices
- `chef`: can update order statuses, change prices, and add, archive, or restore menu items

## API Overview

### Public
- `GET /menu`
- `POST /orders`
- `GET /orders/:id`

### Admin
- `POST /admin/login`
- `POST /admin/logout`
- `GET /admin/session`
- `GET /admin/setup-status`
- `GET /admin/orders`
- `PATCH /admin/orders/:id/status`
- `GET /admin/orders/:id/history`
- `GET /admin/menu`
- `POST /admin/menu`
- `PATCH /admin/menu/:id/price`
- `PATCH /admin/menu/:id/availability`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `DELETE /admin/users/:id`

## Security Notes

- Staff passwords are hashed before being stored in the database
- Admin sessions use `HttpOnly` cookies
- Basic request throttling is enabled for admin login, order creation, and order lookup routes
- `.env` files and common key files are ignored by git
- Never put real secrets in `README.md`, `.env.example`, or committed source files

## Current Development Notes

- Customer page does not expose a staff login shortcut
- Staff dashboard is separated from the customer page
- Menu images are referenced by asset path strings stored in the database
- New menu items currently use an image path or URL instead of file upload storage
- Completed orders are auto-purged after about 30 seconds only for testing and should be adjusted before production
- The repository now contains Vercel deployment configuration at the repo root
- `main` should be used for releases, while `Dev1.1` should be used for preview/testing work
