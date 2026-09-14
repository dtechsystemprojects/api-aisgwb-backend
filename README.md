# Node.js CI4 Architecture

Advanced Node.js project with modular, CI4-inspired architecture.

## Installation

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

## Features

- ✅ Modular architecture
- ✅ CI4-inspired folder structure
- ✅ MVC pattern with services
- ✅ Auto-module loading
- ✅ Middleware support
- ✅ Input validation (Joi)
- ✅ JWT authentication
- ✅ Winston logging
- ✅ Database abstraction (Mongoose)
- ✅ Comprehensive error handling

## API Endpoints

- **Health**: GET `/api/health`
- **User**: GET/POST/PUT/DELETE `/api/user`
- **Product**: GET/POST/PUT/DELETE `/api/product`
- **Auth**: POST `/api/auth/login`, POST `/api/auth/register`
- **Cart**: GET/POST/DELETE `/api/cart`
- **Order**: GET/POST `/api/order`

## License

MIT