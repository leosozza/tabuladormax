# Performance Optimization: User Loading

## Problem
The `/users` page had a severe N+1 query problem in the `loadUsers` function. For each user loaded, it made 4 separate database queries:

1. Get user role
2. Get agent mapping
3. Get project name (if exists)
4. Get supervisor name (if exists)

### Before: O(4N + 1) queries
```
Query 1: SELECT * FROM profiles (1 query)
For each user (N users):
  Query 2-N: SELECT * FROM user_roles WHERE user_id = ? (N queries)
  Query N+1-2N: SELECT * FROM agent_telemarketing_mapping WHERE user_id = ? (N queries)
  Query 2N+1-3N: SELECT * FROM commercial_projects WHERE id = ? (up to N queries)
  Query 3N+1-4N: SELECT * FROM profiles WHERE id = ? (up to N queries)

Total: 1 + 4N queries in worst case
```

**Example with 100 users**: 1 + 400 = **401 queries**

## Solution
Refactored to use batch queries with `.in()` method and merge results in memory.

### After: O(5) constant queries
```
Query 1: SELECT * FROM profiles (1 query)
Query 2: SELECT * FROM user_roles WHERE user_id IN [...] (1 query)
Query 3: SELECT * FROM agent_telemarketing_mapping WHERE user_id IN [...] (1 query)
Query 4: SELECT * FROM commercial_projects WHERE id IN [...] (1 query, conditional)
Query 5: SELECT * FROM profiles WHERE id IN [...] (1 query, conditional)

Total: 5 queries maximum, regardless of user count
```

**Example with 100 users**: **5 queries**

## Performance Improvement

| Users | Before | After | Improvement |
|-------|--------|-------|-------------|
| 10    | 41     | 5     | 88% reduction |
| 50    | 201    | 5     | 97% reduction |
| 100   | 401    | 5     | 99% reduction |
| 500   | 2,001  | 5     | 99.75% reduction |

## Implementation Details

### Key Changes:
1. **Batch Queries**: Use `.in(userIds)` instead of individual `.eq(user_id, id)` queries
2. **Memory Merge**: Create Maps for O(1) lookup when merging data
3. **Conditional Fetching**: Only query projects/supervisors if they exist
4. **Early Return**: Return immediately if no profiles exist

### Code Structure:
```typescript
// 1. Fetch all profiles
const profiles = await supabase.from('profiles').select(...)

// 2. Fetch all roles in batch
const roles = await supabase.from('user_roles').select(...).in('user_id', userIds)

// 3. Fetch all mappings in batch  
const mappings = await supabase.from('agent_telemarketing_mapping').select(...).in('user_id', userIds)

// 4. Extract unique IDs and fetch in batch
const projectIds = [...new Set(mappings.map(m => m.project_id).filter(Boolean))]
const projects = await supabase.from('commercial_projects').select(...).in('id', projectIds)

// 5. Merge results in memory using Maps
const rolesMap = new Map(roles.map(r => [r.user_id, r.role]))
const usersWithRoles = profiles.map(profile => ({
  ...profile,
  role: rolesMap.get(profile.id) || 'agent',
  ...
}))
```

## Testing
- ✅ All tests pass (206 total: 193 existing + 13 new)
- ✅ New tests added for optimization (13 tests)
- ✅ Build successful
- ✅ No breaking changes to functionality

## Expected User Impact
- **Significantly faster** page load times on `/users`
- Especially noticeable with 50+ users
- Reduced database load and costs
- Better scalability as user count grows
