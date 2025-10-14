# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Security and Permissions

This project uses Supabase Row Level Security (RLS) policies to control data access and operations.

### Agent Telemarketing Mapping Permissions

The `agent_telemarketing_mapping` table controls the relationship between users and Bitrix24 telemarketing operators. The following RLS policies are implemented:

#### Current Policies

**INSERT Policy:**
- **Name:** "Users can create their own mapping"
- **Purpose:** Allows authenticated users to create mappings for themselves during signup and operation
- **Business Rule:** Uses WITH CHECK constraint with two conditions:
  - Users can insert only if `tabuladormax_user_id = auth.uid()` (their own records)
  - OR if they have admin or manager role via `has_role(auth.uid(), 'admin'::app_role)` or `has_role(auth.uid(), 'manager'::app_role)`
- **Migration:** `supabase/migrations/20251014171900_fix_agent_telemarketing_mapping_rls.sql`

**SELECT Policy:**
- **Name:** "Users can view own mapping, admins view all"
- **Purpose:** Privacy protection - users can only see their own mappings
- **Business Rule:** Users see only their own records; admins/managers see all

**UPDATE/DELETE Policies:**
- **Names:** "Admins and managers can update/delete mappings"
- **Purpose:** Data integrity - only admins/managers can modify mappings
- **Business Rule:** Restricted to users with admin or manager roles

### ⚠️ Reviewing and Updating Permissions

**When to Review:**
- When onboarding new user roles
- When business requirements change regarding data access
- When implementing new features that interact with agent-telemarketing mappings
- During security audits

**How to Review Current Policies:**

```sql
-- View all policies for the table
SELECT 
  schemaname, tablename, policyname, 
  permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'agent_telemarketing_mapping';
```

**Common Customizations:**

1. **Allow all authenticated users to insert mappings for ANY user (removes user ID restriction - ⚠️ security consideration):**
   ```sql
   DROP POLICY IF EXISTS "Users can create their own mapping" ON public.agent_telemarketing_mapping;
   
   CREATE POLICY "Authenticated users can insert mappings"
     ON public.agent_telemarketing_mapping
     FOR INSERT
     TO authenticated
     WITH CHECK (auth.uid() IS NOT NULL);
   ```
   ⚠️ **Warning**: This removes the user ID constraint, allowing any authenticated user to create mappings for any other user. Use only if your application handles this validation.

2. **Allow users to update their own mappings:**
   ```sql
   CREATE POLICY "Users can update own mapping"
     ON public.agent_telemarketing_mapping
     FOR UPDATE
     TO authenticated
     USING (tabuladormax_user_id = auth.uid())
     WITH CHECK (tabuladormax_user_id = auth.uid());
   ```

3. **Allow users to delete their own mappings:**
   ```sql
   CREATE POLICY "Users can delete own mapping"
     ON public.agent_telemarketing_mapping
     FOR DELETE
     TO authenticated
     USING (tabuladormax_user_id = auth.uid());
   ```

**Testing Policy Changes:**

After modifying policies, test with different user roles:

```sql
-- Verify the policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'agent_telemarketing_mapping' 
AND policyname = 'Your Policy Name';

-- Check mapping coverage
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT atm.tabuladormax_user_id) as users_with_mapping,
  ROUND(100.0 * COUNT(DISTINCT atm.tabuladormax_user_id) / COUNT(DISTINCT u.id), 2) as coverage_pct
FROM auth.users u
LEFT JOIN agent_telemarketing_mapping atm ON u.id = atm.tabuladormax_user_id;
```

### Additional Resources

- **Detailed Implementation:** See `docs/USER_CREATION_TELEMARKETING_FIX.md`
- **Deployment Guide:** See `PR_SUMMARY.md`
- **Change History:** See `CHANGELOG.md`
- **Supabase RLS Documentation:** [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
