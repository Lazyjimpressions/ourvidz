import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ulmdmzhcdwfadbvfpckt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFailedJobs() {
  console.log('Fetching failed video jobs from the last 24 hours...');
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, error_message, metadata, original_prompt, created_at')
    .eq('status', 'failed')
    .ilike('job_type', '%video%')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No failed video jobs found in the last 24 hours.');
    return;
  }

  for (const job of data) {
    console.log(`\n--- Job: ${job.id} ---`);
    console.log(`Created At: ${job.created_at}`);
    console.log(`Error: ${job.error_message}`);
    console.log(`Model Key: ${job.metadata?.model_key}`);
    console.log(`Generation Mode: ${job.metadata?.generation_mode}`);
    console.log(`Input Used:`, JSON.stringify(job.metadata?.input_used, null, 2));
  }
}

checkFailedJobs();
