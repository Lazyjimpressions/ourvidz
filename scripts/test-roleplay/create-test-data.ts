#!/usr/bin/env tsx
/**
 * Create test data for roleplay tests
 * Uses service role key to create test character and scenes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    'https://ulmdmzhcdwfadbvfpckt.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('Add it to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const TEST_USER_ID = '3348b481-8fb1-4745-8e6c-db6e9847e429';
const TEST_CHARACTER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_SCENE_ID_1 = '00000000-0000-0000-0000-000000000002';
const TEST_SCENE_ID_2 = '00000000-0000-0000-0000-000000000003';

async function createTestData() {
  console.log('🚀 Creating test data for roleplay tests...\n');

  // 1. Create test character
  console.log('1️⃣ Creating test character...');
  const { data: character, error: charError } = await supabase
    .from('characters')
    .upsert({
      id: TEST_CHARACTER_ID,
      user_id: TEST_USER_ID,
      name: 'Test Character - Mei Chen',
      description: 'A college student studying computer science, friendly and curious',
      traits: 'Outgoing, intelligent, playful, sometimes shy',
      persona: 'Grew up in a tech-savvy family, loves coding and gaming',
      base_prompt: 'You are a helpful and engaging character who enjoys deep conversations',
      voice_examples: [
        'Hey there! How are you doing today?',
        'Oh wow, that sounds really interesting!',
        'Hmm, let me think about that for a moment...'
      ],
      forbidden_phrases: [
        'How can I help you',
        'What can I do for you',
        'Is there anything else'
      ],
      image_url: `user-library/${TEST_USER_ID}/test-character-image.png`,
      reference_image_url: `user-library/${TEST_USER_ID}/test-reference-image.png`,
      seed_locked: 12345,
      consistency_method: 'i2i_reference',
      content_rating: 'nsfw',
      is_public: true,
      quick_start: true
    }, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (charError) {
    console.error('❌ Failed to create character:', charError.message);
    return false;
  }
  console.log('✅ Test character created:', character.name);

  // 2. Create first test scene
  console.log('\n2️⃣ Creating test scene 1 (Library)...');
  const { data: scene1, error: scene1Error } = await supabase
    .from('character_scenes')
    .upsert({
      id: TEST_SCENE_ID_1,
      character_id: TEST_CHARACTER_ID,
      scene_prompt: 'Mei Chen sits in the empty college library after hours, surrounded by books and her laptop. The soft glow of her screen illuminates her face as she works on a coding project.',
      system_prompt: 'You are in a quiet library setting. Be focused on your work but open to conversation. Maintain a studious but friendly demeanor. Reference the books and technology around you.',
      scene_rules: 'Stay in character as a student. Reference your coding project or studies when appropriate. Be friendly but not overly distracting from work.',
      scene_starters: [
        '*looks up from laptop* Oh, hey! I didn\'t see you there.',
        '*stretches and closes laptop* I\'ve been coding for hours, my brain needs a break.',
        '*glances at the clock* Wow, it\'s getting late. Are you here to study too?'
      ],
      priority: 10
    }, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (scene1Error) {
    console.error('❌ Failed to create scene 1:', scene1Error.message);
    return false;
  }
  console.log('✅ Test scene 1 created (Library Study Session)');

  // 3. Create second test scene
  console.log('\n3️⃣ Creating test scene 2 (Coffee Shop)...');
  const { data: scene2, error: scene2Error } = await supabase
    .from('character_scenes')
    .upsert({
      id: TEST_SCENE_ID_2,
      character_id: TEST_CHARACTER_ID,
      scene_prompt: 'Mei Chen sits at a corner table in a cozy coffee shop, sipping a latte and checking messages on her phone.',
      system_prompt: 'You are in a relaxed coffee shop setting. Be casual and approachable. Reference the coffee and atmosphere.',
      scene_rules: 'Stay casual and friendly. Reference the coffee shop environment.',
      priority: 5
    }, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (scene2Error) {
    console.error('❌ Failed to create scene 2:', scene2Error.message);
    return false;
  }
  console.log('✅ Test scene 2 created (Coffee Shop Meetup)');

  // 4. Verify prompt template
  console.log('\n4️⃣ Verifying prompt template...');
  const { data: templates, error: templateError } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('use_case', 'character_roleplay')
    .eq('content_mode', 'nsfw')
    .eq('is_active', true)
    .limit(1);

  if (templateError) {
    console.error('❌ Failed to check template:', templateError.message);
  } else if (templates && templates.length > 0) {
    console.log('✅ Prompt template found:', templates[0].template_name);
  } else {
    console.warn('⚠️  No active prompt template found');
  }

  console.log('\n✅ Test data creation complete!');
  console.log('\nTest Character ID:', TEST_CHARACTER_ID);
  console.log('Test Scene IDs:', TEST_SCENE_ID_1, TEST_SCENE_ID_2);
  console.log('\nYou can now run: npm run test:roleplay');

  return true;
}

createTestData()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  });

