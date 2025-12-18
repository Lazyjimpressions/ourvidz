#!/usr/bin/env tsx
/**
 * Test 9: Database State Verification
 * Tests conversation lifecycle, message persistence, scene image storage
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    'https://ulmdmzhcdwfadbvfpckt.supabase.co';
// Use PUBLISHABLE_KEY if ANON_KEY not available (they're the same)
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                    process.env.SUPABASE_ANON_KEY ||
                    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_CHARACTER_ID = '00000000-0000-0000-0000-000000000001';

// Get test user ID - try environment variable first, then lookup
async function getTestUserId(): Promise<string> {
  if (process.env.TEST_USER_ID) {
    return process.env.TEST_USER_ID;
  }
  
  // Use same logic as get-test-user.ts
  const testEmail = process.env.TEST_USER_EMAIL || 'pokercpa05';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Try service role key first (can access auth.users)
  if (serviceKey) {
    const adminSupabase = createClient(supabaseUrl, serviceKey);
    try {
      const { data: users } = await adminSupabase.auth.admin.listUsers();
      if (users?.users) {
        const foundUser = users.users.find((u: any) => 
          u.email?.toLowerCase().includes('pokercpa05') || 
          u.email?.toLowerCase().includes(testEmail.toLowerCase())
        );
        if (foundUser) return foundUser.id;
      }
    } catch (e) {
      // Fall through
    }
  }
  
  // Fallback: Try characters table for user_id
  const { data: characters } = await supabase
    .from('characters')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(10);
  
  if (characters && characters.length > 0) {
    const userIds = [...new Set(characters.map(c => c.user_id).filter(Boolean))];
    if (userIds.length > 0) return userIds[0];
  }
  
  // Last resort: profiles table (may be restricted)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', `%${testEmail}%`)
    .limit(1);
  
  if (profiles && profiles.length > 0) {
    return profiles[0].id;
  }
  
  throw new Error('Could not get test user ID. Add SUPABASE_SERVICE_ROLE_KEY to .env or set TEST_USER_ID');
}

let TEST_USER_ID = '';

interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  errors: string[];
  databaseChecks: Record<string, any>;
}

const results: TestResult[] = [];

// Test 9.1: Conversation Lifecycle
async function testConversationLifecycle(): Promise<TestResult> {
  const testId = '9.1';
  const testName = 'Conversation Lifecycle';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Create conversation
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        user_id: TEST_USER_ID,
        character_id: TEST_CHARACTER_ID,
        conversation_type: 'character_roleplay',
        title: 'Test Conversation - Lifecycle',
        memory_tier: 'conversation',
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      errors.push(`Conversation creation failed: ${createError.message}`);
      databaseChecks.conversationCreated = false;
    } else {
      databaseChecks.conversationCreated = true;
      databaseChecks.conversationId = conversation.id;
      databaseChecks.conversationFields = {
        hasUserId: !!conversation.user_id,
        hasCharacterId: !!conversation.character_id,
        hasMemoryTier: !!conversation.memory_tier,
        hasStatus: !!conversation.status
      };
    }

    // Add messages
    if (conversation) {
      const { data: message1, error: msg1Error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'user',
          content: 'Test message 1',
          message_type: 'text'
        })
        .select()
        .single();

      if (msg1Error) {
        errors.push(`Message 1 save failed: ${msg1Error.message}`);
      } else {
        databaseChecks.message1Saved = true;
      }

      const { data: message2, error: msg2Error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'assistant',
          content: 'Test response 1',
          message_type: 'text'
        })
        .select()
        .single();

      if (msg2Error) {
        errors.push(`Message 2 save failed: ${msg2Error.message}`);
      } else {
        databaseChecks.message2Saved = true;
      }

      // Archive conversation
      const { data: archived, error: archiveError } = await supabase
        .from('conversations')
        .update({ status: 'archived' })
        .eq('id', conversation.id)
        .select()
        .single();

      if (archiveError) {
        errors.push(`Conversation archive failed: ${archiveError.message}`);
        databaseChecks.conversationArchived = false;
      } else {
        databaseChecks.conversationArchived = archived.status === 'archived';
      }

      // Create new conversation
      const { data: newConversation, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          user_id: TEST_USER_ID,
          character_id: TEST_CHARACTER_ID,
          conversation_type: 'character_roleplay',
          title: 'Test Conversation - New',
          memory_tier: 'conversation',
          status: 'active'
        })
        .select()
        .single();

      if (newConvError) {
        errors.push(`New conversation creation failed: ${newConvError.message}`);
        databaseChecks.newConversationCreated = false;
      } else {
        databaseChecks.newConversationCreated = true;
        databaseChecks.newConversationId = newConversation.id;

        // Cleanup
        await supabase.from('conversations').delete().eq('id', newConversation.id);
      }

      // Cleanup archived conversation
      await supabase.from('conversations').delete().eq('id', conversation.id);
    }

    const passed = errors.length === 0 && 
                  databaseChecks.conversationCreated && 
                  databaseChecks.message1Saved && 
                  databaseChecks.message2Saved &&
                  databaseChecks.conversationArchived &&
                  databaseChecks.newConversationCreated;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return { testId, testName, passed, errors, databaseChecks };
  } catch (error) {
    const errors: string[] = [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`];
    return { testId, testName, passed: false, errors, databaseChecks: {} };
  }
}

// Test 9.2: Message Persistence
async function testMessagePersistence(): Promise<TestResult> {
  const testId = '9.2';
  const testName = 'Message Persistence';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: TEST_USER_ID,
        character_id: TEST_CHARACTER_ID,
        conversation_type: 'character_roleplay',
        title: 'Test Conversation - Persistence',
        memory_tier: 'conversation',
        status: 'active'
      })
      .select()
      .single();

    if (convError) {
      errors.push(`Conversation creation failed: ${convError.message}`);
      return { testId, testName, passed: false, errors, databaseChecks };
    }

    // Add multiple messages
    const messages = [
      { sender: 'user', content: 'Message 1', message_type: 'text' },
      { sender: 'assistant', content: 'Response 1', message_type: 'text' },
      { sender: 'user', content: 'Message 2', message_type: 'text' },
      { sender: 'assistant', content: 'Response 2', message_type: 'text' }
    ];

    for (const msg of messages) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          ...msg
        });

      if (msgError) {
        errors.push(`Message save failed: ${msgError.message}`);
      }
    }

    // Retrieve messages
    const { data: retrievedMessages, error: retrieveError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (retrieveError) {
      errors.push(`Message retrieval failed: ${retrieveError.message}`);
      databaseChecks.messagesRetrieved = false;
    } else {
      databaseChecks.messagesRetrieved = true;
      databaseChecks.messageCount = retrievedMessages?.length || 0;
      databaseChecks.messagesOrdered = retrievedMessages?.every((msg, idx) => 
        idx === 0 || new Date(msg.created_at) >= new Date(retrievedMessages[idx - 1].created_at)
      );
      databaseChecks.noDuplicates = new Set(retrievedMessages?.map(m => m.id)).size === retrievedMessages?.length;
    }

    // Cleanup
    await supabase.from('conversations').delete().eq('id', conversation.id);

    const passed = errors.length === 0 && 
                  databaseChecks.messagesRetrieved && 
                  databaseChecks.messageCount === messages.length &&
                  databaseChecks.messagesOrdered &&
                  databaseChecks.noDuplicates;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return { testId, testName, passed, errors, databaseChecks };
  } catch (error) {
    const errors: string[] = [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`];
    return { testId, testName, passed: false, errors, databaseChecks: {} };
  }
}

// Test 9.3: Scene Image Storage
async function testSceneImageStorage(): Promise<TestResult> {
  const testId = '9.3';
  const testName = 'Scene Image Storage';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Create a test job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: TEST_USER_ID,
        job_type: 'sdxl_image_high',
        status: 'completed',
        metadata: {
          character_id: TEST_CHARACTER_ID,
          destination: 'roleplay_scene'
        }
      })
      .select()
      .single();

    if (jobError) {
      errors.push(`Job creation failed: ${jobError.message}`);
      databaseChecks.jobCreated = false;
    } else {
      databaseChecks.jobCreated = true;
      databaseChecks.jobId = job.id;

      // Create workspace asset linked to job
      const { data: asset, error: assetError } = await supabase
        .from('workspace_assets')
        .insert({
          user_id: TEST_USER_ID,
          job_id: job.id,
          temp_storage_path: 'test/path/to/scene-image.png',
          asset_type: 'image',
          file_size_bytes: 1024,
          mime_type: 'image/png',
          generation_seed: 12345,
          original_prompt: 'Test scene image',
          model_used: 'test-model'
        })
        .select()
        .single();

      if (assetError) {
        errors.push(`Asset creation failed: ${assetError.message}`);
        databaseChecks.assetCreated = false;
      } else if (!asset) {
        errors.push(`Asset creation returned null`);
        databaseChecks.assetCreated = false;
      } else {
        databaseChecks.assetCreated = true;
        databaseChecks.assetData = {
          id: asset.id,
          hasJobId: !!asset.job_id,
          hasTempStoragePath: !!asset.temp_storage_path,
          jobIdMatches: asset.job_id === job.id
        };

        // Verify job linked to asset
        const { data: linkedAsset, error: linkError } = await supabase
          .from('workspace_assets')
          .select('*')
          .eq('job_id', job.id)
          .single();

        if (linkError) {
          errors.push(`Asset link verification failed: ${linkError.message}`);
        } else {
          databaseChecks.assetLinkedToJob = linkedAsset?.job_id === job.id;
        }

        // Cleanup
        await supabase.from('workspace_assets').delete().eq('id', asset.id);
      }
      
      // Cleanup job
      await supabase.from('jobs').delete().eq('id', job.id);
    }

    const passed = errors.length === 0 && 
                  databaseChecks.jobCreated && 
                  databaseChecks.assetCreated &&
                  databaseChecks.assetLinkedToJob;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return { testId, testName, passed, errors, databaseChecks };
  } catch (error) {
    const errors: string[] = [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`];
    return { testId, testName, passed: false, errors, databaseChecks: {} };
  }
}

// Main test execution
async function runTests() {
  // Get test user ID
  try {
    TEST_USER_ID = await getTestUserId();
    console.log(`✅ Using test user ID: ${TEST_USER_ID}`);
  } catch (error) {
    console.error('❌', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log('🚀 Starting Database State Verification Tests');
  console.log('='.repeat(60));

  results.push(await testConversationLifecycle());
  results.push(await testMessagePersistence());
  results.push(await testSceneImageStorage());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} Test ${result.testId}: ${result.testName}`);
    if (!result.passed && result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
  });

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

