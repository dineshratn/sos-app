# SOS App - Web Application

Emergency alert system web application built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- User authentication (login, register, OAuth)
- Emergency trigger with countdown
- Real-time location sharing via WebSocket
- Emergency contacts management
- Medical profile management
- Emergency history and reports
- Real-time chat during emergencies
- Progressive Web App (PWA) support
- Offline functionality

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand + Context API
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO Client
- **Maps**: Google Maps React
- **PDF Generation**: jsPDF
- **Testing**: Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Maps API key (for map features)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Update environment variables in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

### Type Checking

Run TypeScript type checking:
```bash
npm run type-check
```

### Testing

Run E2E tests:
```bash
npx playwright test
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── dashboard/    # Dashboard page
│   │   ├── emergency/    # Emergency pages
│   │   ├── login/        # Login page
│   │   ├── register/     # Registration page
│   │   └── ...
│   ├── components/       # Reusable React components
│   ├── contexts/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Libraries and utilities
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── public/              # Static assets
└── ...
```

## Key Components

- **AuthContext**: Manages authentication state globally
- **EmergencyButton**: Large SOS button with countdown
- **LocationMap**: Google Maps integration for location display
- **EmergencyChat**: Real-time chat interface
- **CountdownModal**: Emergency trigger countdown

## API Integration

The web app communicates with the backend API Gateway at the configured `NEXT_PUBLIC_API_URL`.

See `src/lib/api-client.ts` for all available API methods.

## Progressive Web App

The app includes PWA support with:
- Service worker for offline caching
- Offline queue for emergency triggers
- Push notification support
- Installable on mobile devices

## License

MIT
