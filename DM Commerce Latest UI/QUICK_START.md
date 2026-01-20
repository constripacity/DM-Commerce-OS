# DM Commerce OS - Quick Start Guide

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development
```bash
npm run dev
```
Visit `http://localhost:3000`

### 3. Login
Navigate to `/login` and use these demo credentials:
- **Email**: `demo@local.test`
- **Password**: `demo123`

## Available Routes

- `/` - Landing page with feature overview
- `/login` - Authentication page
- `/dashboard` - Main dashboard overview
- `/dashboard/dm-studio` - Interactive DM simulator
- `/dashboard/products` - Product management
- `/dashboard/orders` - Order tracking
- `/dashboard/campaigns` - Campaign management
- `/dashboard/scripts` - Script templates
- `/dashboard/analytics` - Performance metrics
- `/dashboard/settings` - System configuration

## Key Features to Explore

### DM Studio (Centerpiece)
1. Navigate to `/dashboard/dm-studio`
2. Type a message containing "GUIDE" to trigger the keyword flow
3. Watch the automated conversation unfold
4. Observe state changes in the Inspector panel

### Products
1. Go to `/dashboard/products`
2. Click "New Product" to add a product
3. Fill in name, price, and file path
4. Edit or delete existing products

### Analytics
1. Visit `/dashboard/analytics`
2. View conversion funnel visualization
3. Check session activity charts
4. Review product distribution

## Scripts Available

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types
- `npm run check:conflicts` - Scan for merge conflicts

## Theme

Toggle between light/dark mode using the sun/moon icon in the top-right header.

## Design System

- **Primary Color**: Orange (#FF7A21)
- **Background**: Warm beige (#FFF7EC)
- **Border Radius**: Rounded corners (1rem base)
- **Shadows**: Soft, subtle shadows throughout

## Mobile Usage

The application is fully responsive. On mobile:
- Sidebar collapses into a hamburger menu
- Tables adapt to smaller screens
- Touch-friendly button sizes
- Optimized for 375px+ width

## Next Steps

1. Explore all dashboard sections
2. Test the DM Studio conversation flow
3. Try creating products and viewing orders
4. Customize settings in the Settings page
5. Review the implementation in IMPLEMENTATION_SUMMARY.md

## Need Help?

Check the IMPLEMENTATION_SUMMARY.md for detailed technical documentation.
