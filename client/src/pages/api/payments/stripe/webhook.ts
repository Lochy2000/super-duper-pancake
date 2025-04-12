import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client creator
import { Resend } from 'resend'; // Import Resend

// Initialize Supabase client with service role key
// Ensure these environment variables are set in your deployment environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing Supabase URL or Service Role Key in webhook environment.');
  // Optionally throw an error or handle appropriately if you cannot proceed
}

const supabaseAdmin = createClient(
  supabaseUrl || '', // Provide a default empty string if null/undefined, though the check above should handle it
  supabaseServiceKey || '',
  {
    auth: {
      persistSession: false, // No need to persist session server-side
      autoRefreshToken: false, // No need to refresh token server-side
    }
  }
);

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('CRITICAL: Missing RESEND_API_KEY environment variable for webhook.');
  // Decide if you want to throw an error or log and continue without email sending
}
// Initialize Resend only if the key exists
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable Next.js body parsing for this route to access the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('>>> [webhook] STRIPE WEBHOOK HANDLER INVOKED <<<');
  if (req.method === 'POST') {
    console.log('[webhook] Request method is POST.');
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;

    let event: Stripe.Event;

    try {
      console.log('[webhook] Constructing event...');
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log(`[webhook] ✅ Event constructed and verified: ${event.type}`);
    } catch (err: any) {
      console.error(`[webhook] ❌ Error verifying webhook signature: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    console.log(`[webhook] Handling event type: ${event.type}`);
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[webhook] 💰 PaymentIntent successful: ${paymentIntent.id}`);

        const invoiceId = paymentIntent.metadata?.invoiceId;
        console.log(`[webhook] Attempting to extract invoiceId from metadata. Found: ${invoiceId || 'null/undefined'}`);

        if (!supabaseAdmin) {
          console.error('[webhook] CRITICAL: Supabase admin client not initialized.');
          return res.status(500).send('Internal Server Error: Supabase client failed');
        }

        if (invoiceId) {
          console.log(`[webhook] Found invoiceId: ${invoiceId}. Proceeding with update.`);
          try {
            console.log(`[webhook] Attempting to update invoice ${invoiceId} and fetch client details...`);
            const { data: updatedInvoice, error } = await supabaseAdmin
              .from('invoices')
              .update({ 
                status: 'paid', // Update status to paid
                paid_date: new Date().toISOString(),
                payment_method: 'stripe' 
              })
              .eq('id', invoiceId)
              .select('*, clients ( email, name )')
              .single();

            if (error) {
              console.error(`[webhook] ❌ Supabase invoice update/select error for invoice ${invoiceId}:`, error);
              // Don't acknowledge success if DB update failed
              return res.status(500).send(`Supabase Error: ${error.message}`);
            } else {
              console.log(`[webhook] ✅ Successfully updated invoice ${invoiceId} status to paid.`, updatedInvoice);
              
              // Also update the corresponding payment record
              console.log(`[webhook] Attempting to update payment record for transaction ${paymentIntent.id}...`);
              const { error: paymentUpdateError } = await supabaseAdmin
                .from('payments')
                .update({ 
                    payment_status: 'completed', 
                    payment_date: new Date().toISOString() 
                })
                .eq('transaction_id', paymentIntent.id)
                .eq('invoice_id', invoiceId);

              if (paymentUpdateError) {
                 console.warn(`[webhook] ⚠️ Supabase payment record update error for transaction ${paymentIntent.id}:`, paymentUpdateError);
                 // Continue anyway, primary task (invoice update) succeeded.
              } else {
                console.log(`[webhook] ✅ Successfully updated payment record for transaction ${paymentIntent.id}.`);
              }

              // Send Payment Confirmation Email
              console.log('[webhook] Attempting to send payment confirmation email...');
              if (resend && updatedInvoice && updatedInvoice.clients) {
                const clientEmail = updatedInvoice.clients.email;
                const clientName = updatedInvoice.clients.name;
                const invoiceNumber = updatedInvoice.invoice_number;
                const totalAmount = updatedInvoice.amount;

                if (clientEmail) {
                  try {
                     console.log(`[webhook] Sending email to ${clientEmail} via Resend...`);
                    await resend.emails.send({
                      from: 'Invoice System <noreply@easywebs.uk>', // Updated sender domain
                      to: [clientEmail],
                      subject: `Payment Confirmation for Invoice ${invoiceNumber}`,
                      html: `
                        <h1>Payment Successful!</h1>
                        <p>Hello ${clientName || 'Client'},</p>
                        <p>Thank you for your payment of $${totalAmount?.toFixed(2) || 'N/A'} for invoice #${invoiceNumber}.</p>
                        <p>Your invoice status has been updated to 'Paid'.</p>
                        <p>You can view the updated invoice details here: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/invoice/${invoiceNumber}">View Invoice</a></p>
                        <p>Thank you!</p>
                      `,
                      // text: `Payment Successful! Hello ${clientName || 'Client'}, Thank you for your payment...`
                    });
                    console.log(`[webhook] ✉️ Payment confirmation email sent successfully to ${clientEmail}`);
                  } catch (emailError) {
                    console.error('[webhook] ❌ Error sending payment confirmation email via Resend:', emailError);
                  }
                } else {
                   console.warn(`[webhook] ⚠️ Client email not found for invoice ${invoiceId}. Skipping email.`);
                }
              } else if (!resend) {
                 console.warn('[webhook] ⚠️ Resend not initialized. Skipping email.');
              } else {
                 console.warn(`[webhook] ⚠️ Could not retrieve updated invoice/client details. Skipping email.`);
              }
            }
          } catch (updateError: any) {
            console.error(`[webhook] ❌ Unexpected error during invoice update/email process for ${invoiceId}:`, updateError);
            return res.status(500).send(`Webhook Handler Error: ${updateError.message}`);
          }
        } else {
          console.warn('[webhook] ⚠️ Invoice ID not found in payment intent metadata. Cannot update Supabase.');
          // Still return 200 OK to Stripe as the event was received & verified
        }
        break;

      case 'payment_intent.payment_failed':
        console.log('[webhook] Handling payment_intent.payment_failed');
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ PaymentIntent failed: ${paymentIntentFailed.id}`);
        // TODO: Add logic to handle failed payment 
        // (e.g., update invoice status to 'failed', update payment record, notify user)
        const failedInvoiceId = paymentIntentFailed.metadata?.invoiceId;
        if (failedInvoiceId && supabaseAdmin) {
          const { error: failError } = await supabaseAdmin
             .from('invoices')
             .update({ status: 'failed' })
             .eq('id', failedInvoiceId);
          if (failError) console.error(`Failed to update invoice ${failedInvoiceId} status to failed:`, failError);
          // Also update payment record
           const { error: paymentFailError } = await supabaseAdmin
                .from('payments')
                .update({ payment_status: 'failed' })
                .eq('transaction_id', paymentIntentFailed.id)
                .eq('invoice_id', failedInvoiceId);
           if(paymentFailError) console.warn(`Failed to update payment record ${paymentIntentFailed.id} to failed:`, paymentFailError);
        }
        break;

      default:
        console.log(`[webhook] 🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    console.log(`[webhook] Sending 200 OK response for event: ${event.id}`);
    res.status(200).json({ received: true });
  } else {
    console.warn(`[webhook] Received non-POST request: ${req.method}`);
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

export default handler; 