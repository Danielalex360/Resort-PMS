# Resort PMS - Deployment Guide

## 🚀 Quick Deploy (Recommended: Vercel)

### Step 1: Prepare for Deployment

Your Supabase database is already configured and running:
- **URL:** `https://oncdtzhivsgsjcpidtox.supabase.co`
- **Anon Key:** Already set in `.env`

### Step 2: Deploy to Vercel (Easiest Option)

#### A. Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select "yes" to deploy
   - Choose project name (e.g., "resort-pms")

4. **Set Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   ```
   Enter: `https://oncdtzhivsgsjcpidtox.supabase.co`

   ```bash
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
   Enter: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY2R0emhpdnNnc2pjcGlkdG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTcwOTAsImV4cCI6MjA3ODE3MzA5MH0.ynX7pM9ioLRTC5b5RGCyc91CkRowl-XnEgXe7b5Zxz8`

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

6. **Done!** Your app will be live at: `https://your-project.vercel.app`

#### B. Using Vercel Dashboard (Alternative)

1. **Go to:** [vercel.com](https://vercel.com)
2. **Sign in** with GitHub/GitLab/Bitbucket
3. **Click "Add New Project"**
4. **Import Git Repository** or upload this folder
5. **Configure Project:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Add Environment Variables:**
   - `VITE_SUPABASE_URL` = `https://oncdtzhivsgsjcpidtox.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY2R0emhpdnNnc2pjcGlkdG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTcwOTAsImV4cCI6MjA3ODE3MzA5MH0.ynX7pM9ioLRTC5b5RGCyc91CkRowl-XnEgXe7b5Zxz8`
7. **Click Deploy**

---

## 🌐 Alternative: Deploy to Netlify

### Using Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Initialize:**
   ```bash
   netlify init
   ```

4. **Build:**
   ```bash
   npm run build
   ```

5. **Deploy:**
   ```bash
   netlify deploy --prod --dir=dist
   ```

6. **Set Environment Variables:**
   - Go to: Netlify Dashboard → Site Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

### Using Netlify Dashboard

1. **Go to:** [netlify.com](https://netlify.com)
2. **Drag and drop** the `dist` folder
3. **Or connect Git repository** for auto-deploys
4. **Set environment variables** in Site Settings

---

## 🏢 Alternative: Deploy to Your Own Server

### Using Docker

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Create Dockerfile:**
   ```dockerfile
   FROM nginx:alpine
   COPY dist /usr/share/nginx/html
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

3. **Build Docker image:**
   ```bash
   docker build -t resort-pms .
   ```

4. **Run container:**
   ```bash
   docker run -p 80:80 resort-pms
   ```

### Using Traditional Server (Apache/Nginx)

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Upload `dist` folder** to your server

3. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/resort-pms/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

---

## 🔐 Step 3: Configure Supabase (Important!)

### A. Update Supabase Auth URLs

1. **Go to:** [Supabase Dashboard](https://supabase.com/dashboard)
2. **Select your project:** `oncdtzhivsgsjcpidtox`
3. **Navigate to:** Authentication → URL Configuration
4. **Add your deployment URL:**
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs:
     - `https://your-app.vercel.app/**`
     - `http://localhost:5173/**` (for development)

### B. Enable Email Auth (if not already)

1. **Go to:** Authentication → Providers
2. **Enable Email** provider
3. **Disable email confirmation** (already done)

---

## 👤 Step 4: Create Your First Admin User

### Option 1: Using Supabase Dashboard

1. **Go to:** Authentication → Users
2. **Click "Add user"**
3. **Enter email:** your-email@resort.com
4. **Set password:** (secure password)
5. **Click "Create user"**

### Option 2: Sign Up Through App

1. **Visit your deployed app**
2. **Click "Sign Up"** on login page
3. **Enter email and password**
4. **Click "Sign up"**

### Step 5: Assign Admin Role

**Run this SQL in Supabase SQL Editor:**

```sql
-- Replace 'your-email@resort.com' with your actual email
-- Replace 'your-resort-id' with your resort ID (check resorts table)

INSERT INTO user_roles (user_id, resort_id, role, assigned_by)
SELECT
    u.id,
    r.id,
    'owner',
    u.id
FROM auth.users u
CROSS JOIN resorts r
WHERE u.email = 'your-email@resort.com'
LIMIT 1;
```

---

## 🏨 Step 6: Set Up Your First Resort

### Create Resort Record

1. **Go to:** Supabase Dashboard → Table Editor → `resorts`
2. **Click "Insert row"**
3. **Fill in:**
   - `name`: Your Resort Name (e.g., "Alun Alun Island Resort")
   - `currency`: MYR (or your currency)
   - `owner_id`: Your user ID (from auth.users)
4. **Save**

**Or run SQL:**

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@resort.com';

-- Then insert resort (replace USER_ID with actual ID)
INSERT INTO resorts (name, currency, owner_id)
VALUES ('Your Resort Name', 'MYR', 'USER_ID');
```

---

## ✅ Step 7: Verify Everything Works

### Checklist:

1. **Login Test:**
   - ✅ Can you log in with your credentials?

2. **Navigation Test:**
   - ✅ Can you see all menu items?
   - ✅ Does sidebar collapse/expand?
   - ✅ Can you navigate between pages?

3. **Property Setup:**
   - ✅ Go to Property Setup
   - ✅ Add room types
   - ✅ Configure overhead
   - ✅ Set up pricing

4. **Booking Test:**
   - ✅ Create a test booking
   - ✅ Add payment
   - ✅ Check-in guest
   - ✅ Check-out guest

5. **Document Test:**
   - ✅ Receipt generated on payment?
   - ✅ Registration form on check-in?
   - ✅ Folio on check-out?

6. **Notifications:**
   - ✅ Notification badge showing?
   - ✅ Today's stats showing?

---

## 🎨 Optional: Custom Domain

### For Vercel:

1. **Go to:** Project Settings → Domains
2. **Add your domain:** resort.yourdomain.com
3. **Update DNS:**
   - Type: `CNAME`
   - Name: `resort` (or `@` for root)
   - Value: `cname.vercel-dns.com`
4. **Wait for propagation** (5-60 minutes)

### For Netlify:

1. **Go to:** Site Settings → Domain Management
2. **Add custom domain**
3. **Configure DNS** as instructed

---

## 🔒 Security Checklist

Before going live:

- ✅ RLS policies enabled on all tables
- ✅ Environment variables not exposed in code
- ✅ Strong password policy enforced
- ✅ Only necessary users have admin access
- ✅ Regular database backups enabled (Supabase does this automatically)
- ✅ HTTPS enabled (automatic with Vercel/Netlify)

---

## 📱 Testing URLs

After deployment, test these URLs:

- `https://your-app.vercel.app` - Should show login page
- `https://your-app.vercel.app/dashboard` - Should redirect to login if not authenticated

---

## 🆘 Troubleshooting

### Issue: "Cannot connect to database"
**Solution:** Check environment variables are set correctly in deployment platform

### Issue: "User not authorized"
**Solution:** Make sure user_roles table has your user with correct role

### Issue: "Page not found on refresh"
**Solution:** Configure routing (Vercel/Netlify handle this automatically)

### Issue: "Images/documents not loading"
**Solution:** Check Supabase Storage policies allow authenticated users

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs in Dashboard
3. Verify all environment variables
4. Check database RLS policies

---

## 🎉 You're Live!

Once deployed:
1. Share the URL with your team
2. Set up additional users in User Management
3. Configure your property details
4. Start taking bookings!

**Your Resort PMS is now production-ready and deployed!** 🚀
