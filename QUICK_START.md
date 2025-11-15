# 🚀 Resort PMS - Quick Start Guide

## Fastest Way to Publish (5 Minutes)

### ✅ Step 1: Deploy to Vercel (Easiest!)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy!
vercel
```

Follow the prompts, then set environment variables:

```bash
vercel env add VITE_SUPABASE_URL
# Paste: https://oncdtzhivsgsjcpidtox.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY2R0emhpdnNnc2pjcGlkdG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTcwOTAsImV4cCI6MjA3ODE3MzA5MH0.ynX7pM9ioLRTC5b5RGCyc91CkRowl-XnEgXe7b5Zxz8

# Deploy to production
vercel --prod
```

**Done!** Your app is live at: `https://your-project.vercel.app`

---

### ✅ Step 2: Configure Supabase Auth

1. Go to: [Supabase Dashboard](https://supabase.com/dashboard/project/oncdtzhivsgsjcpidtox)
2. Click **Authentication** → **URL Configuration**
3. Set **Site URL** to your Vercel URL: `https://your-project.vercel.app`
4. Add to **Redirect URLs**: `https://your-project.vercel.app/**`

---

### ✅ Step 3: Create Your Account

1. Visit your deployed app
2. Click **Sign Up**
3. Enter your email and password
4. Click **Sign up**

---

### ✅ Step 4: Set Up Your Resort

1. Go to: [Supabase SQL Editor](https://supabase.com/dashboard/project/oncdtzhivsgsjcpidtox/sql)
2. Open the file: `FIRST_TIME_SETUP.sql`
3. Follow the instructions in that file:
   - Find your user ID
   - Create your resort
   - Assign yourself as owner
   - (Optional) Add sample room types

**That's it! You're ready to use your Resort PMS!** 🎉

---

## 📚 Full Documentation

- **Complete Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
- **First-Time Setup SQL**: See `FIRST_TIME_SETUP.sql`
- **Pages Documentation**: See `PAGES_DOCUMENTATION.md`
- **RBAC Documentation**: See `RBAC_DOCUMENTATION.md`

---

## 🎯 What's Next?

After setup, log in and:

1. **Property Setup** → Configure your resort details
2. **Property Setup** → **Overhead** → Set fixed monthly costs
3. **Property Setup** → **Cost & Price** → Add room types
4. **Property Setup** → **Seasons** → Define peak/low seasons
5. **Bookings** → Start taking bookings!

---

## 🆘 Need Help?

**Common Issues:**

- **Can't log in?** Check that you've created an account and assigned the owner role
- **No menu items showing?** Run the user_roles INSERT from `FIRST_TIME_SETUP.sql`
- **Database errors?** Check environment variables are set correctly

---

## 🔑 Your Credentials

**Supabase Project:**
- URL: `https://oncdtzhivsgsjcpidtox.supabase.co`
- Project ID: `oncdtzhivsgsjcpidtox`
- Dashboard: [Open Dashboard](https://supabase.com/dashboard/project/oncdtzhivsgsjcpidtox)

**Your App (after deployment):**
- URL: Will be shown after `vercel --prod` command
- Login: Your email and password from sign-up

---

## ✅ Pre-Launch Checklist

Before inviting your team:

- [ ] Deployed to Vercel/Netlify
- [ ] Environment variables configured
- [ ] Supabase Auth URLs updated
- [ ] Created your account
- [ ] Ran setup SQL (assigned owner role)
- [ ] Created resort record
- [ ] Added room types
- [ ] Tested creating a booking
- [ ] Tested payment recording
- [ ] Tested check-in/check-out

**All done? You're production-ready!** 🚀
