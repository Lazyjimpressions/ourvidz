# Testing Documentation - Consolidated

**Last Updated:** July 30, 2025  
**Status:** Production Active

## 🚀 Overview

OurVidz uses a comprehensive testing strategy covering unit tests, integration tests, end-to-end tests, and performance testing to ensure system reliability and quality.

## 🏗️ Testing Architecture

### **Testing Pyramid**
```
┌─────────────────────────────────────┐
│         E2E Tests (10%)             │
│      Integration Tests (20%)        │
│        Unit Tests (70%)             │
└─────────────────────────────────────┘
```

### **Test Categories**
- **Unit Tests**: Individual component testing
- **Integration Tests**: API and database testing
- **End-to-End Tests**: Full user workflow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability and penetration testing

## 🧪 Unit Testing

### **Frontend Unit Tests**
```typescript
// Example: Testing a React component
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGenerator } from '../components/ImageGenerator';

describe('ImageGenerator', () => {
  test('renders prompt input field', () => {
    render(<ImageGenerator />);
    expect(screen.getByPlaceholderText('Enter your prompt')).toBeInTheDocument();
  });

  test('submits generation request', async () => {
    const mockSubmit = jest.fn();
    render(<ImageGenerator onSubmit={mockSubmit} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter your prompt'), {
      target: { value: 'beautiful landscape' }
    });
    
    fireEvent.click(screen.getByText('Generate'));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      prompt: 'beautiful landscape',
      model: 'sdxl'
    });
  });
});
```

### **Backend Unit Tests**
```typescript
// Example: Testing edge functions
import { describe, it, expect, vi } from 'vitest';
import { queueJob } from '../supabase/functions/queue-job';

describe('queue-job function', () => {
  it('creates job successfully', async () => {
    const mockRequest = {
      body: {
        jobType: 'sdxl_image_fast',
        metadata: {
          prompt: 'test prompt',
          quality: 'fast'
        }
      }
    };

    const result = await queueJob(mockRequest);
    
    expect(result.status).toBe(201);
    expect(result.body).toHaveProperty('jobId');
  });

  it('validates required fields', async () => {
    const mockRequest = {
      body: {
        jobType: 'invalid_type'
      }
    };

    const result = await queueJob(mockRequest);
    
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Invalid job type');
  });
});
```

### **Worker Unit Tests**
```python

### **Dynamic Prompt Testing**
```typescript
// Test cache functionality
const cacheTest = await testCacheFunctionality();

// Test content detection
const contentTest = await testContentDetection();

// Test template retrieval
const templateTest = await testTemplateRetrieval();

// Test negative prompt generation
const negativeTest = await testNegativePromptGeneration();

// Test edge function integration
const integrationTest = await testEdgeFunctionIntegration();
```

**Test Cases:**
- **Cache Validation**: Cache age < 24 hours, template count > 0, valid metadata
- **Content Detection**: "beautiful landscape" → SFW, "nude woman on beach" → NSFW
- **Template Retrieval**: Cache fallback, database fallback, structure validation
- **Integration Testing**: `enhance-prompt` and `queue-job` function responses
# Example: Testing worker functions
import pytest
from unittest.mock import Mock, patch
from workers.sdxl_worker import SDXLWorker

class TestSDXLWorker:
    def setup_method(self):
        self.worker = SDXLWorker()
    
    def test_generate_image(self):
        """Test image generation"""
        prompt = "beautiful landscape"
        result = self.worker.generate_image(prompt)
        
        assert result['status'] == 'success'
        assert 'image_url' in result
        assert result['metadata']['prompt'] == prompt
    
    @patch('workers.sdxl_worker.torch.cuda.is_available')
    def test_gpu_availability(self, mock_cuda):
        """Test GPU availability check"""
        mock_cuda.return_value = True
        assert self.worker.check_gpu() == True
        
        mock_cuda.return_value = False
        assert self.worker.check_gpu() == False
```

## 🔗 Integration Testing

### **API Integration Tests**
```typescript
// Example: Testing API endpoints
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('API Integration Tests', () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY!
    );
  });

  it('queues job and processes it', async () => {
    // Create job
    const jobResponse = await fetch('/api/queue-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobType: 'sdxl_image_fast',
        metadata: { prompt: 'test prompt' }
      })
    });

    expect(jobResponse.status).toBe(201);
    const { jobId } = await jobResponse.json();

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check job status
    const statusResponse = await fetch(`/api/job-status/${jobId}`);
    const status = await statusResponse.json();

    expect(status.status).toBe('completed');
    expect(status.result).toHaveProperty('imageUrl');
  });
});
```

### **Database Integration Tests**
```sql
-- Example: Testing database operations
BEGIN;

-- Test user creation
INSERT INTO users (email, username) 
VALUES ('test@example.com', 'testuser')
RETURNING id;

-- Test job creation
INSERT INTO jobs (user_id, job_type, metadata)
VALUES (1, 'sdxl_image_fast', '{"prompt": "test"}')
RETURNING id;

-- Test job status update
UPDATE jobs 
SET status = 'completed', 
    result = '{"imageUrl": "test.jpg"}'
WHERE id = 1;

-- Verify results
SELECT 
  u.email,
  j.job_type,
  j.status,
  j.result
FROM users u
JOIN jobs j ON u.id = j.user_id
WHERE u.email = 'test@example.com';

ROLLBACK;
```

### **Worker Integration Tests**
```python
# Example: Testing worker integration
import pytest
import requests
from workers.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_worker_health():
    """Test worker health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "gpu_utilization" in data

def test_image_generation():
    """Test image generation endpoint"""
    response = client.post("/generate_image", json={
        "prompt": "test image",
        "model": "sdxl",
        "quality": "fast"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "image_url" in data
```

## 🌐 End-to-End Testing

### **User Workflow Tests**
```typescript
// Example: Testing complete user workflow
import { test, expect } from '@playwright/test';

test('complete image generation workflow', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');
  
  // Login
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  
  // Wait for dashboard
  await page.waitForSelector('[data-testid="dashboard"]');
  
  // Navigate to workspace
  await page.click('[data-testid="workspace-link"]');
  
  // Enter prompt
  await page.fill('[data-testid="prompt-input"]', 'beautiful sunset');
  
  // Select model
  await page.selectOption('[data-testid="model-select"]', 'sdxl');
  
  // Generate image
  await page.click('[data-testid="generate-button"]');
  
  // Wait for generation
  await page.waitForSelector('[data-testid="generation-progress"]');
  await page.waitForSelector('[data-testid="generation-complete"]', { timeout: 60000 });
  
  // Verify result
  const imageElement = await page.locator('[data-testid="generated-image"]');
  expect(await imageElement.isVisible()).toBe(true);
  
  // Save to library
  await page.click('[data-testid="save-button"]');
  
  // Verify saved
  await page.click('[data-testid="library-link"]');
  await page.waitForSelector('[data-testid="saved-image"]');
});
```

### **Cross-Browser Testing**
```typescript
// Example: Cross-browser test configuration
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

## 📊 Performance Testing

### **Load Testing**
```typescript
// Example: Load testing with k6
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
  },
};

export default function () {
  const response = http.post('/api/queue-job', JSON.stringify({
    jobType: 'sdxl_image_fast',
    metadata: { prompt: 'test prompt' }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### **Stress Testing**
```python
# Example: Worker stress testing
import asyncio
import aiohttp
import time

async def stress_test_worker(worker_url: str, concurrent_requests: int):
    """Stress test worker with concurrent requests"""
    
    async def make_request(session, request_id):
        start_time = time.time()
        try:
            async with session.post(f"{worker_url}/generate_image", json={
                "prompt": f"test image {request_id}",
                "model": "sdxl",
                "quality": "fast"
            }) as response:
                duration = time.time() - start_time
                return {
                    "request_id": request_id,
                    "status": response.status,
                    "duration": duration,
                    "success": response.status == 200
                }
        except Exception as e:
            duration = time.time() - start_time
            return {
                "request_id": request_id,
                "status": "error",
                "duration": duration,
                "success": False,
                "error": str(e)
            }
    
    async with aiohttp.ClientSession() as session:
        tasks = [
            make_request(session, i) 
            for i in range(concurrent_requests)
        ]
        results = await asyncio.gather(*tasks)
        
        # Analyze results
        successful = sum(1 for r in results if r["success"])
        avg_duration = sum(r["duration"] for r in results) / len(results)
        
        print(f"Success rate: {successful}/{concurrent_requests} ({successful/len(results)*100:.1f}%)")
        print(f"Average duration: {avg_duration:.2f}s")

# Run stress test
asyncio.run(stress_test_worker("http://localhost:8000", 100))
```

### **Memory Testing**
```python
# Example: Memory usage testing
import psutil
import time
import gc

def test_memory_usage():
    """Test memory usage during image generation"""
    
    # Get initial memory usage
    process = psutil.Process()
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB
    
    print(f"Initial memory usage: {initial_memory:.2f} MB")
    
    # Generate multiple images
    for i in range(10):
        start_time = time.time()
        
        # Generate image (simulated)
        result = generate_test_image(f"test prompt {i}")
        
        # Check memory after each generation
        current_memory = process.memory_info().rss / 1024 / 1024
        generation_time = time.time() - start_time
        
        print(f"Generation {i+1}: {current_memory:.2f} MB ({generation_time:.2f}s)")
        
        # Force garbage collection
        gc.collect()
    
    # Final memory check
    final_memory = process.memory_info().rss / 1024 / 1024
    memory_increase = final_memory - initial_memory
    
    print(f"Final memory usage: {final_memory:.2f} MB")
    print(f"Memory increase: {memory_increase:.2f} MB")
    
    # Assert memory doesn't grow excessively
    assert memory_increase < 1000, f"Memory increased by {memory_increase} MB"
```

## 🔒 Security Testing

### **Authentication Testing**
```typescript
// Example: Authentication security tests
import { test, expect } from '@playwright/test';

test('prevents unauthorized access', async ({ page }) => {
  // Try to access protected route without login
  await page.goto('http://localhost:3000/admin');
  
  // Should redirect to login
  expect(page.url()).toContain('/login');
});

test('validates JWT tokens', async ({ request }) => {
  // Test with invalid token
  const response = await request.post('/api/queue-job', {
    headers: {
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    data: { jobType: 'sdxl_image_fast', metadata: { prompt: 'test' } }
  });
  
  expect(response.status()).toBe(401);
});

test('prevents SQL injection', async ({ request }) => {
  // Test with malicious input
  const maliciousPrompt = "'; DROP TABLE users; --";
  
  const response = await request.post('/api/queue-job', {
    headers: { 'Content-Type': 'application/json' },
    data: { 
      jobType: 'sdxl_image_fast', 
      metadata: { prompt: maliciousPrompt } 
    }
  });
  
  // Should handle safely
  expect(response.status()).toBe(201);
});
```

### **Input Validation Testing**
```python
# Example: Input validation testing
import pytest
from workers.validation import validate_prompt, sanitize_input

def test_prompt_validation():
    """Test prompt validation"""
    
    # Valid prompts
    assert validate_prompt("beautiful landscape") == True
    assert validate_prompt("a cat sitting on a chair") == True
    
    # Invalid prompts
    assert validate_prompt("") == False  # Empty
    assert validate_prompt("a" * 1001) == False  # Too long
    assert validate_prompt("<script>alert('xss')</script>") == False  # XSS
    
def test_input_sanitization():
    """Test input sanitization"""
    
    # Test XSS prevention
    malicious_input = "<script>alert('xss')</script>beautiful landscape"
    sanitized = sanitize_input(malicious_input)
    
    assert "<script>" not in sanitized
    assert "beautiful landscape" in sanitized
    
    # Test SQL injection prevention
    sql_input = "'; DROP TABLE users; --"
    sanitized = sanitize_input(sql_input)
    
    assert "DROP TABLE" not in sanitized
```

## 🧪 Test Automation

### **CI/CD Pipeline**
```yaml
# Example: GitHub Actions test workflow
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
        TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: test-results/
```

### **Test Reporting**
```typescript
// Example: Test reporting configuration
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    },
    reporters: [
      'default',
      ['html', { outputFolder: 'test-results/html' }],
      ['junit', { outputFile: 'test-results/junit.xml' }]
    ]
  }
});
```

## 📋 Test Data Management

### **Test Database Setup**
```sql
-- Example: Test database setup
-- Create test schema
CREATE SCHEMA IF NOT EXISTS test;

-- Create test tables
CREATE TABLE test.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE test.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES test.users(id),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO test.users (email, username) VALUES
  ('test1@example.com', 'testuser1'),
  ('test2@example.com', 'testuser2');

INSERT INTO test.jobs (user_id, job_type, metadata) VALUES
  ((SELECT id FROM test.users WHERE email = 'test1@example.com'), 
   'sdxl_image_fast', 
   '{"prompt": "test image 1"}'),
  ((SELECT id FROM test.users WHERE email = 'test2@example.com'), 
   'wan_image_fast', 
   '{"prompt": "test image 2"}');
```

### **Mock Data Generation**
```typescript
// Example: Mock data generation
import { faker } from '@faker-js/faker';

export const generateMockUser = () => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  username: faker.internet.userName(),
  createdAt: faker.date.past(),
  lastLogin: faker.date.recent()
});

export const generateMockJob = () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  jobType: faker.helpers.arrayElement(['sdxl_image_fast', 'wan_image_fast', 'video_fast']),
  status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
  metadata: {
    prompt: faker.lorem.sentence(),
    quality: faker.helpers.arrayElement(['fast', 'high']),
    seed: faker.number.int({ min: 1, max: 1000000 })
  },
  createdAt: faker.date.past(),
  completedAt: faker.date.recent()
});
```

---

**For system architecture, see [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)**  
**For deployment info, see [04-DEPLOYMENT.md](./04-DEPLOYMENT.md)** 