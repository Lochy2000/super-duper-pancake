# InvoicePages - Full Stack Invoicing Application

A complete invoicing solution with Stripe and PayPal payment integration.

## Project Structure

This is a monorepo containing both the client (frontend) and server (backend) applications:

- `client/`: Next.js frontend application
- `server/`: Node.js/Express backend API

## Development Setup

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd server && npm install
```

3. Copy the example environment files and update with your configuration:

```bash
# For client
cp client/.env.example client/.env.local

# For server
cp server/.env.example server/.env
```

4. Start the development servers:

```bash
# Run both client and server in parallel
npm run dev

# Or run them separately
npm run dev:client
npm run dev:server
```

## Deployment

This application is configured as a monorepo with separate deployments for the frontend and backend:

- **Frontend**: Deployed to Vercel
- **Backend**: Deployed to Heroku

### Deploying to Vercel (Frontend)

1. Create a new project in Vercel and connect to your GitHub repository
2. Set the following configuration in Vercel:
   - Framework Preset: Next.js
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `.next`

3. Set up the following environment variables in Vercel:
   - `NEXT_PUBLIC_API_URL`: Your Heroku backend URL (e.g., https://your-app.herokuapp.com/api)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID`: Your PayPal client ID

4. Deploy the application

### Deploying to Heroku (Backend)

1. Create a new Heroku application
2. Connect your GitHub repository to Heroku
3. Add the following buildpacks:
   - heroku/nodejs

4. Set up the following environment variables in Heroku:
   - `NODE_ENV`: production
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g., https://your-app.vercel.app)
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT encryption
   - `JWT_EXPIRE`: Token expiration time (e.g., 30d)
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
   - `PAYPAL_CLIENT_ID`: Your PayPal client ID
   - `PAYPAL_CLIENT_SECRET`: Your PayPal client secret
   - `PAYPAL_MODE`: sandbox or live
   - Email configuration:
     - `SENDGRID_API_KEY` or `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`
     - `EMAIL_FROM`: Sender email address

5. Deploy the application

## Important Notes for Deployment

### CORS Configuration

The backend is configured to accept requests only from specified origins. If you deploy to a custom domain, you'll need to update the CORS configuration in `server/src/server.js` to include your domain.

### Webhooks for Payment Processing

For Stripe and PayPal webhooks to work correctly in production:

1. **Stripe**: Create a webhook in the Stripe dashboard pointing to: `https://your-heroku-app.herokuapp.com/api/payments/stripe/webhook`
2. **PayPal**: Configure webhooks in your PayPal developer account to point to your backend

### Environment Variables

Always ensure sensitive information such as API keys and secrets are set as environment variables and never committed to the repository.

## License

[MIT](LICENSE)
