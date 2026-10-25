# Manual setup

## Backend
- Lovable Cloud was enabled for this project. The region is chosen by the platform when the backend is created. It isn't shown to or selectable by the agent, and it can't be moved later. You can check it in Cloud settings.

## Create the owner account (public sign-up is disabled)
1. In the Lovable editor, open **Cloud → Users**.
2. Click **Add user**.
   - **Create new user**: enter your email and a strong password. The account is confirmed immediately.
   - Or **Send invitation**: you'll get an email link to set a password.
3. Open the app and sign in at `/login`.
4. On first sign-in, confirm your timezone. It's prefilled from your browser.

Never create extra accounts for testing on the real backend unless you plan to delete them.

## Password reset
- `/forgot-password` sends a reset email, and the link opens `/reset-password`.
- In **Cloud → Users → Auth settings → URL configuration**, make sure the preview URL, the published URL and any custom domain are allowed redirect URLs, so the reset link lands back on the app.

## Recovering access
If you lose your password and the reset email doesn't arrive, delete and re-add the user in **Cloud → Users**, or ask the agent to reset it server-side. Deleting a user also deletes their data.
