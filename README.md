
![logoSmall](https://github.com/user-attachments/assets/a25c4ee9-3f28-4d27-aa9f-09789b72f0d4)

# InvoicePages

A full-stack invoice management application with integrated payment portals (Stripe, PayPal), invoice storage, and payment status tracking.

## Features

- Create, view, and manage invoices
- Send invoices to clients via email
- Accept payments via Stripe and PayPal
- Track payment status in real-time
- Admin dashboard for invoice management
- Client-facing invoice payment portal
- Email notifications for invoice and payment events

## Tech Stack

### Frontend
- Next.js (React framework)
- TypeScript
- Tailwind CSS for styling
- Axios for API requests
- React Hook Form for form handling
- React Toastify for notifications
- Payment integrations: Stripe and PayPal

### Backend
- Node.js with Express
- MongoDB for database (via Mongoose)
- JWT for authentication
- Email notifications via Nodemailer (with SendGrid option)
- Payment integrations: Stripe and PayPal

## Project Structure

The project is divided into two main directories:

- `client/`: Next.js frontend application
- `server/`: Node.js Express backend API

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- MongoDB database (local or Atlas)
- Stripe and PayPal developer accounts

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/InvoicePages.git
cd InvoicePages
```

2. Install dependencies for both client and server:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Environment Setup:

   - Create `.env` files for both client and server based on the provided `.env.example` files.
   - Generate a secure JWT secret:
   ```bash
   cd server
   npm run generate-secrets
   ```
   - Set up your MongoDB connection string in the server `.env` file.
   - Add your Stripe and PayPal API keys to both client and server `.env` files.

4. Start the development servers:
```bash
# Start server (from server directory)
npm run dev

# Start client (from client directory)
npm run dev
```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## API Routes

### Authentication
- `POST /api/auth/register` - Register a new admin user
- `POST /api/auth/login` - Log in and get JWT token

### Invoices
- `GET /api/invoices` - Get all invoices (admin)
- `GET /api/invoices/:id` - Get invoice by ID
- `GET /api/invoices/number/:invoiceNumber` - Get invoice by invoice number
- `POST /api/invoices` - Create a new invoice
- `PUT /api/invoices/:id` - Update an invoice
- `DELETE /api/invoices/:id` - Delete an invoice

### Payments
- `GET /api/payments/methods` - Get available payment methods
- `POST /api/payments/stripe/create-intent` - Create Stripe payment intent
- `POST /api/payments/stripe/confirm` - Confirm Stripe payment
- `POST /api/payments/paypal/create-order` - Create PayPal order
- `POST /api/payments/paypal/capture-payment` - Capture PayPal payment
- `GET /api/payments/status/:invoiceId` - Get payment status for an invoice

## Deployment

### Frontend
- Build the Next.js application: `npm run build`
- Deploy to Vercel, Netlify, or any other static hosting service

### Backend
- Deploy to Heroku, DigitalOcean, AWS, or any other Node.js hosting service
- Set up environment variables on your hosting platform
- Use a production-ready MongoDB database (like MongoDB Atlas)

## Security Considerations

- All API keys and secrets are stored in environment variables
- JWT authentication for secure API access
- Rate limiting to prevent abuse
- HTTPS for all production traffic
- Input validation for all API endpoints
- Proper error handling throughout the application

## License

This project is licensed under the MIT License - see the LICENSE file for details.
