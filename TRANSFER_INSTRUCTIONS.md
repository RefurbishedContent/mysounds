# Transfer Instructions for Client's Bolt.new

## Step 1: Create New Bolt Project
In your client's bolt.new account, start with: **"Create a new React + TypeScript + Vite project with Tailwind CSS"**

## Step 2: Install Dependencies
Tell bolt to run:
```bash
npm install @supabase/supabase-js tone lucide-react
```

## Step 3: Copy Essential Config Files (Upload First)
Upload these 5 files first:
1. `package.json`
2. `vite.config.ts`
3. `tailwind.config.js`
4. `tsconfig.json`
5. `.gitignore`

## Step 4: Create .env File
Create a `.env` file and tell your client to add their Supabase credentials:
```
VITE_SUPABASE_URL=their_supabase_url
VITE_SUPABASE_ANON_KEY=their_supabase_anon_key
```

## Step 5: Upload Source Files in Batches
Use bolt's file upload or paste code directly:

### Batch 1 - Core Setup (5 files)
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/vite-env.d.ts`
- `src/styles/theme.css`

### Batch 2 - Lib Files (5 at a time)
- `src/lib/supabase.ts`
- `src/lib/database.ts`
- `src/lib/storage.ts`
- `src/lib/security.ts`
- `src/lib/analytics.ts`

### Batch 3 - Continue with remaining lib files
- All files in `src/lib/audio/`
- All files in `src/lib/data/`
- All files in `src/lib/timeline/`
- All files in `src/lib/adapters/`

### Batch 4+ - Components (upload in groups of 5)
Upload all components from `src/components/`

### Batch N - Supabase
Upload entire `supabase/` folder structure

## Step 6: Setup Supabase Database
Your client needs to:

1. **Create a Supabase project** at supabase.com
2. **Run migrations** - In their Supabase dashboard:
   - Go to SQL Editor
   - Copy/paste each migration file from `supabase/migrations/` in order (by date)
   - Execute them one by one

3. **Deploy Edge Functions** (if needed):
   - Use the Supabase CLI or dashboard to deploy functions from `supabase/functions/`

## Step 7: Build & Test
```bash
npm install
npm run build
npm run dev
```

## Alternative: Ask Bolt to Recreate from Zip
Simply tell bolt:
"I have a project zip file. Here's the structure: [paste file tree]. Create this entire project structure and I'll paste the code for each file."

Then paste code file by file when bolt asks.

## Pro Tip: Use Git
If possible:
1. Create a private GitHub repo
2. Push this project to GitHub
3. Give your client access
4. They can clone it into any environment
