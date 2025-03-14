# Email Configuration Guide for Invoice Application

This guide will help you set up email functionality for your invoice application, focusing specifically on using Hotmail/Outlook with 2FA.

## Setting up Hotmail/Outlook with Two-Factor Authentication

When you have two-factor authentication (2FA) enabled on a Microsoft account (Hotmail, Outlook, etc.), you need to create an "app password" instead of using your regular password.

### Step 1: Create an App Password

1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Sign in with your Hotmail/Outlook account
3. Navigate to "Security" → "Advanced security options" → "App passwords"
4. Click "Create a new app password"
5. Give it a name like "Invoice App"
6. Microsoft will generate a unique password - copy this password immediately

### Step 2: Configure Your .env File

Update your `.env` file with these settings:

```
# Email settings for Outlook/Hotmail
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@hotmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM=your-email@hotmail.com
```

Replace:
- `your-email@hotmail.com` with your actual email address
- `your-app-password-here` with the app password generated in Step 1

## Testing Your Email Configuration

The application includes two test scripts to verify your email setup:

### Basic Email Test

Run the basic email test:

```bash
npm run test-email
```

This sends a simple test email to yourself to verify your SMTP configuration.

### Invoice Email Test

Test the invoice email template:

```bash
npm run test-invoice
```

This sends a sample invoice email using the actual template that will be used in the application.

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Error message: "Invalid login" or "Authentication failed"
   - Solution: Make sure you're using an app password, not your regular password
   - Check that your EMAIL_USER matches exactly with your Microsoft account email

2. **Connection Error**
   - Error message: "Connection refused" or "Connection timeout"
   - Solution: Check EMAIL_HOST and EMAIL_PORT settings
   - Ensure your network allows outgoing connections on port 587

3. **TLS/SSL Error**
   - Solution: Some networks block certain SSL/TLS connections
   - Try adding `rejectUnauthorized: false` in the TLS options (already configured)

4. **Email Not Appearing**
   - Check your spam folder
   - Verify the "from" address is properly configured

## Production Deployment

When deploying to production (Heroku):

1. Add all email environment variables to your Heroku config
2. Use the exact same settings as your development environment
3. Test the email functionality after deployment

## Alternative Email Providers

If you prefer not to use Hotmail/Outlook, the application also supports:

1. **SendGrid**
   - Add SENDGRID_API_KEY to your .env file
   - No need for EMAIL_HOST, EMAIL_PORT, etc.

2. **Other SMTP Providers**
   - Gmail (requires app password)
   - Any other SMTP service

## Need Help?

If you continue to have issues with email configuration, check:
- Microsoft's latest documentation on app passwords
- Your email provider's SMTP settings
- Network/firewall restrictions that might block outgoing email
