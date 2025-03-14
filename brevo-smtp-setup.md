# Brevo SMTP Email Setup for Invoice App

Your Invoice App has been configured to use Brevo SMTP for sending emails. This document explains how to test and use this configuration.

## Configuration Details

Your Brevo SMTP settings have been configured in the `.env` file with the following parameters:

```
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=87eeab001@smtp-brevo.com
EMAIL_PASSWORD=w1CDPfq4xzBpms9
EMAIL_FROM=lochlann_oht@hotmail.com
```

## Testing Your Email Configuration

There are multiple ways to test your email setup:

### 1. Basic SMTP Test

This test verifies the basic SMTP connection and sends a simple test email:

```bash
npm run test-brevo-smtp
```

### 2. Invoice Email Test

This test sends a sample invoice email using the actual invoice template:

```bash
npm run test-invoice-brevo
```

### What to Expect

When you run the tests:
1. The system will connect to Brevo's SMTP server
2. Send a test email to your configured `EMAIL_FROM` address
3. Display success or error messages in the console

## Troubleshooting

### Common Issues and Solutions

1. **Authentication Error**
   - Error: "Invalid login" or "Authentication failed"
   - Solution: Double-check your EMAIL_USER and EMAIL_PASSWORD in the .env file

2. **Connection Error**
   - Error: "Connection refused" or "Connection timeout"
   - Solution: Check if your network allows outgoing connections on port 587

3. **Sending Limit Reached**
   - Error: Messages about rate limits or sending quotas
   - Solution: Brevo's free tier has limits; check your account dashboard for usage stats

## Using Brevo in Production

When deploying to production:

1. Ensure the same environment variables are set in your production environment:
   ```
   EMAIL_HOST=smtp-relay.brevo.com
   EMAIL_PORT=587
   EMAIL_USER=87eeab001@smtp-brevo.com
   EMAIL_PASSWORD=w1CDPfq4xzBpms9
   EMAIL_FROM=lochlann_oht@hotmail.com
   ```

2. Test the email functionality in production after deployment

## Brevo Account Management

You can manage your Brevo account at [app.brevo.com](https://app.brevo.com):

- Monitor your email sending statistics
- Check your daily/monthly sending limits
- Update your sender information
- Troubleshoot any delivery issues

## Need Help?

If you're experiencing issues with the email configuration:

1. Check Brevo's status page for any outages
2. Review server logs for specific error messages
3. Contact Brevo support through your account dashboard

Remember to protect your SMTP credentials and never share them publicly.
