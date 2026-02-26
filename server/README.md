# Restaurant App Backend

A modular, scalable Node.js backend API for a restaurant management and food delivery system.

## Features

- **Modular Architecture**: Clean separation of concerns with dedicated modules for each feature
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Restaurant Management**: Complete CRUD operations for restaurants
- **Menu Management**: Categories and menu items with advanced filtering
- **Order Management**: Full order lifecycle with real-time status updates
- **User Management**: Customer, restaurant owner, and admin roles
- **Database Integration**: MongoDB with Mongoose ODM
- **Validation**: Comprehensive input validation with Joi
- **Error Handling**: Centralized error handling with proper logging
- **Security**: Helmet, CORS, rate limiting, and other security best practices

## Architecture

The backend follows a modular architecture pattern:

```
src/
├── config/           # Configuration files
├── middleware/       # Express middleware
├── models/          # Database models
├── modules/         # Feature modules
│   ├── auth/        # Authentication module
│   ├── user/        # User management
│   ├── restaurant/  # Restaurant management
│   ├── menu/        # Menu management
│   └── order/       # Order management
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

Each module contains:
- `controller.ts` - Request handling logic
- `repository.ts` - Database operations
- `routes.ts` - Route definitions
- `service.ts` - Business logic (where applicable)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Create environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration values

5. Start the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/restaurant_app |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `CORS_ORIGIN` | CORS origin | http://localhost:3001 |

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password

### Restaurants
- `GET /api/restaurants` - Get all restaurants
- `POST /api/restaurants` - Create restaurant
- `GET /api/restaurants/:id` - Get restaurant by ID
- `PUT /api/restaurants/:id` - Update restaurant
- `DELETE /api/restaurants/:id` - Delete restaurant

### Menu
- `GET /api/menu/:restaurantId/categories` - Get restaurant categories
- `POST /api/menu/:restaurantId/categories` - Create category
- `GET /api/menu/:restaurantId/items` - Get menu items
- `POST /api/menu/:restaurantId/items` - Create menu item

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status

## Database Schema

### Users
- `name` - User's full name
- `email` - User's email (unique)
- `password` - Hashed password
- `role` - User role (customer, restaurant_owner, admin)
- `phone` - Phone number
- `avatar` - Profile picture URL

### Restaurants
- `name` - Restaurant name
- `description` - Restaurant description
- `owner` - Reference to user (restaurant owner)
- `address` - Full address with coordinates
- `cuisine` - Array of cuisine types
- `priceRange` - Price range ($, $$, $$$, $$$$)
- `rating` - Average rating
- `operatingHours` - Weekly operating hours

### Menu Items
- `restaurant` - Reference to restaurant
- `category` - Reference to menu category
- `name` - Item name
- `description` - Item description
- `price` - Item price
- `ingredients` - Array of ingredients
- `allergens` - Array of allergens
- `dietary` - Dietary restrictions flags

### Orders
- `customer` - Reference to user
- `restaurant` - Reference to restaurant
- `items` - Array of order items
- `totalAmount` - Subtotal
- `finalAmount` - Total with fees and tax
- `status` - Order status
- `deliveryAddress` - Delivery address
- `orderType` - delivery or pickup

## Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Security Features

- Password hashing with bcrypt
- JWT authentication
- Role-based authorization
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization

## Error Handling

The application uses centralized error handling:
- Custom error classes
- Structured error responses
- Comprehensive logging
- Graceful error recovery

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
