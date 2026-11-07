# laba-admin

React / TypeScript / Vite / Tailwind CSS administrator portal with shadcn-style Radix components. Administrators sign in, search registered laundry stores, set exact subscription expiry dates, record manual cash/bank-transfer receipts, and inspect renewal history. Shops sign up in the mobile app.

## Run

Use Node 24 or a compatible Node 22 release. Run commands from the repository root:

1. npm ci
2. Copy apps/admin/.env.example to apps/admin/.env and set VITE_API_URL to the running laba-api address. Set VITE_MARKETING_URL to your landing page address.
3. Create the administrator in the API repository with its setup/seed instructions.
4. npm run dev, then open http://localhost:5173.

The portal uses actual API records and has no demo login, seeded store list, or simulated renewals. Credentials and database content are not included. Environment values exposed through Vite must never contain server secrets.

## Build

- npm run typecheck
- npm run build

Deploy the static apps/admin/dist directory. Configure VITE_API_URL before building and allow the deployed origin in the API's CORS_ORIGIN. Use HTTPS for production.

## Related repositories

- [Expo mobile app](https://github.com/JidLaurence/laba-app)
- [Express API](https://github.com/JidLaurence/laba-api)
- [Administrator portal](https://github.com/JidLaurence/laba-admin)
- [Marketing landing page](https://github.com/JidLaurence/laba-landing-page)
