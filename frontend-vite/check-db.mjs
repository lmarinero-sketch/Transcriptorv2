import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hakysnqiryimxbwdslwe.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhha3lzbnFpcnlpbXhid2RzbHdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA0MjI3NCwiZXhwIjoyMDg1NjE4Mjc0fQ.v0Zw7yFjGKJX8xsMCZJPwRyhr2eNd1gjASsI7qSK0YM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
  console.log('--- Checking Supabase auth.users ---');
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error listing auth.users:', usersError.message);
  } else {
    console.log(`Found ${usersData.users.length} users in auth.users.`);
    console.log(usersData.users.slice(0, 3).map(u => ({ id: u.id, email: u.email })));
  }

  // Attempt to check typical public tables
  const tablesToCheck = ['organizations', 'org_members', 'meetings', 'user_profiles', 'users'];
  console.log('\n--- Checking public tables ---');
  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (!error.message.includes('does not exist')) {
         console.log(`[${table}] Table exists, error querying:`, error.message);
      } else {
         console.log(`[${table}] Does not exist.`);
      }
    } else {
      console.log(`[${table}] Table exists and accessible.`);
    }
  }
}

checkDb();
