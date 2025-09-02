#!/usr/bin/env node

/**
 * Debug script to check scene loading issues
 */

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase credentials
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

async function debugSceneLoading() {
  console.log('🔍 Debugging Scene Loading Issues...\n');
  
  try {
    // Step 1: Check if characters exist
    console.log('1️⃣ Checking characters...');
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name')
      .limit(5);

    if (charError) {
      console.log('❌ Character query failed:', charError.message);
      return;
    }

    console.log('✅ Characters found:', characters?.length || 0);
    characters?.forEach(char => {
      console.log(`   - ${char.name} (ID: ${char.id})`);
    });

    // Step 2: Check character scenes without filters
    console.log('\n2️⃣ Checking character scenes (no filters)...');
    const { data: allScenes, error: sceneError } = await supabase
      .from('character_scenes')
      .select('*')
      .limit(10);

    if (sceneError) {
      console.log('❌ Scene query failed:', sceneError.message);
      return;
    }

    console.log('✅ Total scenes found:', allScenes?.length || 0);
    if (allScenes && allScenes.length > 0) {
      allScenes.forEach(scene => {
        console.log(`   - Scene ID: ${scene.id}`);
        console.log(`     Character ID: ${scene.character_id}`);
        console.log(`     Scene Prompt: ${scene.scene_prompt.substring(0, 50)}...`);
        console.log(`     Is Active: ${scene.is_active}`);
        console.log(`     Priority: ${scene.priority}`);
        console.log('     ---');
      });
    }

    // Step 3: Check specific character scenes
    if (characters && characters.length > 0) {
      const testCharacter = characters[0];
      console.log(`\n3️⃣ Checking scenes for character: ${testCharacter.name}`);
      
      const { data: charScenes, error: charSceneError } = await supabase
        .from('character_scenes')
        .select('*')
        .eq('character_id', testCharacter.id);

      if (charSceneError) {
        console.log('❌ Character scene query failed:', charSceneError.message);
        return;
      }

      console.log('✅ Character scenes found:', charScenes?.length || 0);
      if (charScenes && charScenes.length > 0) {
        charScenes.forEach(scene => {
          console.log(`   - Scene: ${scene.scene_prompt.substring(0, 50)}...`);
          console.log(`     Is Active: ${scene.is_active}`);
          console.log(`     Priority: ${scene.priority}`);
          console.log(`     Has Rules: ${!!scene.scene_rules}`);
          console.log(`     Has Starters: ${scene.scene_starters?.length || 0}`);
        });
      }
    }

    // Step 4: Check with is_active filter
    console.log('\n4️⃣ Checking scenes with is_active = true filter...');
    const { data: activeScenes, error: activeError } = await supabase
      .from('character_scenes')
      .select('*')
      .eq('is_active', true);

    if (activeError) {
      console.log('❌ Active scene query failed:', activeError.message);
      return;
    }

    console.log('✅ Active scenes found:', activeScenes?.length || 0);
    if (activeScenes && activeScenes.length === 0) {
      console.log('⚠️  NO ACTIVE SCENES FOUND! This is the problem.');
      console.log('   The is_active filter is filtering out all scenes.');
      console.log('   You need to set is_active = true for your scenes.');
    }

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugSceneLoading();
