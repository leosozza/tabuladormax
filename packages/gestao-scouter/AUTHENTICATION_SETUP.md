# Authentication System - Setup Instructions

## Overview
This implementation adds a complete authentication system with user registration and login functionality.

## Features Implemented

✅ **Login Page** (`/login`)
- Email and password authentication
- Password visibility toggle
- Error handling with user-friendly messages
- Link to registration page

✅ **Register Page** (`/register`)
- Full name, email, password, and password confirmation
- Password strength validation (minimum 6 characters)
- Password confirmation matching
- Error handling for duplicate emails
- Link back to login page

✅ **Protected Routes**
- All application routes are now protected
- Unauthenticated users are redirected to `/login`
- Session persistence using localStorage
- Loading state while checking authentication

✅ **User Profile Management**
- User profiles are automatically created on signup
- All new users are assigned the "admin" role by default
- User information displayed in sidebar
- Logout functionality

## Database Migration Required

**IMPORTANT:** Before using the authentication system, you need to apply the database migration:

### Migration File
`supabase/migrations/20251017_auto_create_user_profile.sql`

### What it does
1. Creates a trigger function `handle_new_user()` that automatically:
   - Creates a user profile in `public.users` table
   - Assigns the "admin" role to all new users
   - Uses the name from signup metadata or derives from email

2. Sets up a trigger on `auth.users` table to call this function on new user signup

### How to Apply

**Option 1: Using Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project (ngestyxtopvfeyenyvgt)
3. Navigate to SQL Editor
4. Copy and paste the contents of `supabase/migrations/20251017_auto_create_user_profile.sql`
5. Click "Run"

**Option 2: Using Supabase CLI** (if you have it installed locally)
```bash
supabase db push
```

## Testing the Authentication System

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to the Application
Open http://localhost:8080 in your browser

### 3. You Should See
- Automatic redirect to `/login` page
- Clean login form with email/password fields

### 4. Register a New User
1. Click "Cadastre-se" link
2. Fill in:
   - Nome Completo: Your full name
   - E-mail: your@email.com
   - Senha: A password (min 6 chars)
   - Confirmar Senha: Same password
3. Click "Criar Conta"
4. Check your email for confirmation (Supabase sends a confirmation email)

### 5. Login
1. After confirming email, go back to `/login`
2. Enter your email and password
3. Click "Entrar"
4. You should be redirected to the Dashboard

### 6. Logout
- Click the "Sair" button in the sidebar footer
- You'll be redirected back to `/login`

## User Roles

Currently, all users are created with the **admin** role, which grants:
- Full access to all modules
- Read, create, update, delete permissions on all resources
- Access to all dashboard features
- Configuration management

### Future Role Implementation
The system is designed to support multiple roles:
- `admin` - Full system access (current default)
- `supervisor` - Team management, limited admin functions
- `scouter` - Personal data access only
- `telemarketing` - Call center operations
- `gestor_telemarketing` - Call center management

To enable different roles in the future, you would need to:
1. Modify the `handle_new_user()` function to assign different roles based on criteria
2. Update the permissions in the `permissions` table
3. Implement role-based UI rendering using the `hasPermission()` function

## Technical Implementation

### Authentication Flow
1. **AuthProvider** wraps the entire application
2. **useAuthContext** hook provides auth state and methods
3. **ProtectedRoute** component guards routes
4. **Supabase Auth** handles the underlying authentication

### Files Created/Modified
- `src/contexts/AuthContext.tsx` - Auth context provider
- `src/pages/Login.tsx` - Login page component
- `src/pages/Register.tsx` - Registration page component
- `src/components/ProtectedRoute.tsx` - Route guard component
- `src/components/layout/Sidebar.tsx` - Added logout button and user info
- `src/App.tsx` - Wrapped with AuthProvider, added public routes
- `src/hooks/useAuth.ts` - Updated error type handling
- `supabase/migrations/20251017_auto_create_user_profile.sql` - Database trigger

### Authentication State Management
- Uses Supabase Auth's built-in session management
- Persists sessions in localStorage
- Auto-refreshes tokens
- Listens for auth state changes (login/logout)

## Security Considerations

✅ **Password Security**
- Handled by Supabase Auth (bcrypt hashing)
- Minimum length validation (6 characters)
- Never stored in plain text

✅ **Session Security**
- JWT tokens with expiration
- Automatic token refresh
- Secure HttpOnly cookies (server-side)

✅ **Database Security**
- Row Level Security (RLS) enabled
- User profiles protected by RLS policies
- Admin-only access to user management

⚠️ **Email Confirmation**
By default, Supabase requires email confirmation. Users must verify their email before they can login.

To disable email confirmation (for testing):
1. Go to Supabase Dashboard > Authentication > Settings
2. Under "Email Auth", disable "Confirm email"

## Troubleshooting

### "Error fetching user profile"
- Make sure the migration has been applied
- Check that the `users` table exists
- Verify the `roles` table has the 'admin' role

### "E-mail ou senha incorretos"
- Check that the email/password are correct
- Verify the email has been confirmed (check inbox)
- Try resetting password through Supabase dashboard

### Redirect loop
- Clear localStorage: `localStorage.clear()`
- Clear browser cache
- Check browser console for errors

### User profile not created
- Verify the trigger function exists
- Check Supabase logs for errors
- Manually create a user profile in the database

## Next Steps

After verifying the authentication system works:

1. **Test the complete flow**
   - Register → Confirm Email → Login → Access Dashboard → Logout

2. **Customize as needed**
   - Add password reset functionality
   - Implement role-based access control in UI
   - Add profile editing
   - Implement "Remember me" functionality

3. **Production considerations**
   - Configure email templates in Supabase
   - Set up proper error logging
   - Add rate limiting for auth endpoints
   - Enable 2FA if needed
