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
- Supabase for database and authentication
- Axios for API requests
- React Hook Form for form handling
- React Toastify for notifications
- Payment integrations: Stripe and PayPal

### Backend
- Node.js with Express
- Supabase for database and authentication
- Resend for email notifications
- Payment integrations: Stripe and PayPal

## Project Structure

The project is divided into two main directories:

- `client/`: Next.js frontend application
- `server/`: Node.js Express backend API

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Supabase account and project
- Resend account for email notifications
- Stripe and PayPal developer accounts

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd invoice-app
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

3. Set up environment variables:

Create `.env` files in both the server and client directories using the provided `.env.example` files as templates.

#### Server Environment Variables:
- `PORT`: Server port (default: 5000)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `RESEND_API_KEY`: Your Resend API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
- `PAYPAL_CLIENT_ID`: Your PayPal client ID
- `PAYPAL_CLIENT_SECRET`: Your PayPal client secret

#### Client Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`: Your PayPal client ID

4. Set up Supabase:
- Create a new Supabase project
- Run the SQL schema from `server/src/config/schema.sql` in your Supabase SQL editor
- Set up authentication providers as needed

5. Set up Resend:
- Create a Resend account
- Add and verify your domain
- Create an API key

6. Start the development servers:

```bash
# Start the server
cd server
npm run dev

# Start the client (in a new terminal)
cd client
npm run dev
```

The client will be available at `http://localhost:3000` and the server at `http://localhost:5000`.

## Deployment

1. Deploy the Supabase project
2. Set up Resend with your domain
3. Configure Stripe and PayPal for production
4. Deploy the server (e.g., to Heroku, DigitalOcean, etc.)
5. Deploy the client (e.g., to Vercel, Netlify, etc.)
6. Update environment variables on your deployment platforms

## License

MIT License - see LICENSE file for details
