const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulmdmzhcdwfadbvfpckt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbWRtemhjZHdmYWRidmZwY2t0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTc3ODExMCwiZXhwIjoyMDYxMzU0MTEwfQ.qHEWtvg8YR9PIXwANr5vXDsG-WzNXNjBncyRXYOfDE8'
);

async function run() {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, title')
    .or('title.ilike.%hot tub%,title.ilike.%pool party%')
    .order('updated_at', { ascending: false })
    .limit(5);

  let output = { conversations: convs, scenes: [], logs: [] };

  if (convs) {
    for (const c of convs) {
      const { data: scenes } = await supabase
        .from('character_scenes')
        .select('id, scene_prompt, image_url, generation_metadata, created_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(3);
      output.scenes.push({ conversation: c.title, scenes });
    }
  }

  const { data: logs } = await supabase
    .from('api_usage_logs')
    .select('*')
    .eq('request_type', 'image')
    .ilike('provider_id', 'fal%')
    .order('created_at', { ascending: false })
    .limit(10);
    
  output.logs = logs;

  fs.writeFileSync('/private/tmp/hot_tub_logs.json', JSON.stringify(output, null, 2));
  console.log('Saved to /private/tmp/hot_tub_logs.json');
}

run();
