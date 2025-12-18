import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    'https://ulmdmzhcdwfadbvfpckt.supabase.co';
// Use PUBLISHABLE_KEY if ANON_KEY not available (they're the same)
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                    process.env.SUPABASE_ANON_KEY ||
                    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTestUser() {
  // Try to find user by email (pokercpa05)
  const testEmail = process.env.TEST_USER_EMAIL || 'pokercpa05';
  
  // Strategy 1: Try service role key to access auth.users (if available)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (serviceKey) {
    const adminSupabase = createClient(supabaseUrl, serviceKey);
    try {
      const { data: users, error: adminError } = await adminSupabase.auth.admin.listUsers();
      
      if (!adminError && users?.users) {
        // Search for pokercpa05 in email
        const foundUser = users.users.find((u: any) => 
          u.email?.toLowerCase().includes('pokercpa05') || 
          u.email?.toLowerCase().includes(testEmail.toLowerCase())
        );
        
        if (foundUser) {
          console.log(foundUser.id);
          return;
        }
      }
    } catch (e) {
      // Fall through
    }
  }
  
  // Strategy 2: Try to find user via characters table (if user has characters)
  // Characters might have user_id even if profiles are restricted
  const { data: characters, error: charError } = await supabase
    .from('characters')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(10);

  if (!charError && characters && characters.length > 0) {
    // Get unique user IDs from characters
    const userIds = [...new Set(characters.map(c => c.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      // Use first available user ID
      console.log(userIds[0]);
      return;
    }
  }

  // Strategy 3: Try profiles table (may be restricted by RLS)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', `%${testEmail}%`)
    .limit(1);

  if (!profileError && profiles && profiles.length > 0) {
    console.log(profiles[0].id);
    return;
  }

  // Strategy 4: Any profile (may be restricted by RLS)
  const { data: anyProfile, error: anyError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (!anyError && anyProfile && anyProfile.length > 0) {
    console.log(anyProfile[0].id);
    return;
  }

  // If all else fails, we need the user to provide it
  console.error('Could not automatically find user. Options:');
  console.error('1. Set TEST_USER_ID environment variable');
  console.error('2. Add SUPABASE_SERVICE_ROLE_KEY to .env file');
  console.error('3. Ensure pokercpa05 user exists and has characters');
  process.exit(1);
}

getTestUser();
