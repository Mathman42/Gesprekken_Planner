# Email Setup Guide for Magic Links

The magic link system is now configured to send emails via Resend. Follow these steps to complete the setup:

## Step 1: Get a Resend API Key

1. Go to [resend.com](https://resend.com) and create a free account
2. Once logged in, navigate to "API Keys" in the dashboard
3. Click "Create API Key"
4. Give it a name like "Kempenhorst Magic Links"
5. Copy the API key (it starts with `re_`)

## Step 2: Add the API Key to Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **ygeaslhlbzyqdirvwyef**
3. Navigate to **Project Settings** > **Edge Functions**
4. Click on **Manage Secrets**
5. Add a new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Paste your Resend API key (starts with `re_`)
6. Click **Save**

## Step 3: Update the Email "From" Address (Optional)

The edge function currently uses `onboarding@resend.dev` as the sender email. This works for testing but you may want to use your own domain:

### To use your own domain:

1. In Resend dashboard, go to "Domains"
2. Add your domain (e.g., `kempenhorst.nl`)
3. Follow Resend's instructions to verify the domain via DNS records
4. Once verified, update the edge function code to use your domain:
   - File: `supabase/functions/send-magic-link/index.ts`
   - Change `from: 'Kempenhorst College <onboarding@resend.dev>'`
   - To: `from: 'Kempenhorst College <noreply@kempenhorst.nl>'`
5. Redeploy the function (changes will be automatically deployed)

### For testing (no domain setup needed):

The default `onboarding@resend.dev` sender works immediately for testing. Resend allows this for development.

## Step 4: Test the Magic Link

1. Go to your application
2. Click "Parent Login" or navigate to the parent booking page
3. Enter an email address (use one you have access to)
4. Click "Verstuur inloglink"
5. Check your email inbox (and spam folder)

## Email Configuration Details

- **Service**: Resend (resend.com)
- **Edge Function**: `send-magic-link`
- **Link Expiration**: 15 minutes
- **Rate Limiting**: Built-in to prevent abuse

## Troubleshooting

### Not receiving emails?

1. **Check spam folder** - First emails from new senders often go to spam
2. **Verify API key** - Make sure the RESEND_API_KEY is correctly set in Supabase secrets
3. **Check Resend logs** - Go to Resend dashboard > Logs to see if emails were sent
4. **Test email address** - Make sure you're using a valid, accessible email address

### Edge function errors?

1. Check Supabase edge function logs:
   - Go to Supabase Dashboard > Edge Functions
   - Click on "send-magic-link"
   - View the logs to see any errors
2. Common issues:
   - Missing RESEND_API_KEY
   - Invalid Resend API key
   - Resend rate limits (free tier: 100 emails/day)

### Still having issues?

Check the browser console for any error messages when submitting the magic link form.

## Free Tier Limits

Resend free tier includes:
- 100 emails per day
- 3,000 emails per month
- Full API access
- Multiple domains

This should be sufficient for testing and small-scale use. Upgrade to paid plan for higher volumes.

## Next Steps After Setup

Once emails are working:
1. Test the complete flow: request link → receive email → click link → book appointment
2. Monitor email delivery in Resend dashboard
3. Consider setting up email templates in Resend for easier management
4. Add email analytics tracking if needed

## Security Notes

- The RESEND_API_KEY is stored securely in Supabase secrets
- Never commit API keys to version control
- Magic links expire after 15 minutes
- Each link can only be used once
- Rate limiting prevents spam and abuse
