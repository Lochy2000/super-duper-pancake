# Setting Up Brevo Email for Your Invoice Application

This guide will walk you through setting up Brevo (formerly Sendinblue) as your email service provider for the invoice application.

## What is Brevo?

Brevo is an email marketing and transactional email service that offers a generous free tier:
- 300 emails per day
- 9,000 emails per month
- No credit card required

## Step 1: Create a Brevo Account

1. Go to [Brevo's website](https://www.brevo.com/) and sign up for a free account
2. Verify your email address
3. Complete the account setup process

## Step 2: Get Your API Key

1. Log in to your Brevo account
2. Navigate to **SMTP & API** in the left sidebar
3. Look for the **API Keys** section
4. Click on **Create a new API key**
5. Give it a name like "Invoice App"
6. Copy the generated API key

## Step 3: Configure Your Application

1. Open your `.env` file in the server directory
2. Add or update the following lines:
   ```
   BREVO_API_KEY=your-brevo-api-key-here
   EMAIL_FROM=your-verified-email@example.com
   ```
   
   Notes:
   - Replace `your-brevo-api-key-here` with the API key you copied in Step 2
   - `EMAIL_FROM` should be the email address you used to sign up for Brevo or any verified sender

## Step 4: Test the Email Configuration

Run the test script to verify your configuration:

```bash
npm run test-brevo
```

If successful, you should receive a test email at the address you specified in `EMAIL_FROM` or `TEST_EMAIL`.

## Troubleshooting

If you encounter issues:

1. **API Key Error**
   - Verify you've correctly copied the API key
   - Make sure there are no extra spaces or characters

2. **Sender Address Error**
   - Ensure your sender email is verified in Brevo
   - By default, you can use the email you signed up with

3. **Rate Limit**
   - Free accounts are limited to 300 emails per day
   - If you hit this limit, wait until the next day or upgrade your plan

## Using Brevo in Production

When deploying to production (Heroku):

1. Add your Brevo API key as an environment variable:
   ```
   BREVO_API_KEY=your-brevo-api-key-here
   EMAIL_FROM=your-verified-email@example.com
   ```

2. Test the email functionality after deployment

## Need Help?

If you continue to have issues with the Brevo configuration:
- Check Brevo's documentation at [https://developers.brevo.com](https://developers.brevo.com)
- Look for error messages in your server logs
- Contact Brevo support through your account dashboard
