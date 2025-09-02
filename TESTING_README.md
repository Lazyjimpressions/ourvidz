# 🧪 Roleplay System Testing Suite

This testing suite validates the complete roleplay prompting system, including edge functions, performance, and prompt quality.

## 📋 Test Overview

### **Phase 3: Testing & Validation** ✅ **IMPLEMENTED**

The testing suite consists of three main components:

1. **Edge Function Tests** - Validates database integration and function logic
2. **Performance Tests** - Measures response times and caching effectiveness
3. **Prompt Quality Tests** - Analyzes prompt consistency and voice integration

## 🚀 Quick Start

### **Prerequisites**
- Node.js installed
- Supabase credentials configured
- Environment variables set

### **Setup Environment Variables**
```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-anon-key"
```

### **Install Dependencies**
```bash
npm install @supabase/supabase-js
```

### **Run All Tests**
```bash
node run-all-tests.js
```

### **Run Specific Test Suites**
```bash
# Edge function tests only
node run-all-tests.js edge

# Performance tests only
node run-all-tests.js performance

# Prompt quality tests only
node run-all-tests.js quality
```

## 🧪 Test Components

### **1. Edge Function Tests** (`test-edge-functions.js`)

Tests the core functionality of the roleplay system:

- ✅ **Character Loading with Voice Data**
  - Loads characters with voice examples and forbidden phrases
  - Validates scene integration and priority ordering
  - Tests character caching system

- ✅ **Prompt Template Retrieval**
  - Loads roleplay and SDXL templates from database
  - Validates template structure and content
  - Tests template selection logic

- ✅ **Scene Data Retrieval**
  - Loads character scenes with rules and starters
  - Tests scene priority ordering
  - Validates active scene selection

- ✅ **Edge Function Invocation**
  - Tests request structure validation
  - Validates parameter handling
  - Tests error handling

### **2. Performance Tests** (`test-performance.js`)

Measures system performance and caching effectiveness:

- ⚡ **Character Loading Performance**
  - First-time vs. cached loading times
  - Cache improvement percentage calculation
  - Performance recommendations

- ⚡ **Scene Loading Performance**
  - Complex join query performance
  - Scene data retrieval optimization
  - Database query efficiency

- ⚡ **Template Loading Performance**
  - Template retrieval speed
  - System prompt processing time
  - Memory usage optimization

- ⚡ **Concurrent Loading Performance**
  - Multiple simultaneous requests
  - Database connection handling
  - Load balancing effectiveness

### **3. Prompt Quality Tests** (`test-prompt-quality.js`)

Analyzes the quality and consistency of generated prompts:

- 📝 **First-Person Consistency**
  - Validates character perspective maintenance
  - Tests "You ARE" language usage
  - Ensures consistent character voice

- 📝 **Voice Example Integration**
  - Tests voice example inclusion in prompts
  - Validates speaking style guidance
  - Ensures character voice consistency

- 📝 **Forbidden Phrase Avoidance**
  - Tests anti-assistant language filtering
  - Validates generic phrase removal
  - Ensures authentic character responses

- 📝 **Scene Context Integration**
  - Tests scene rules and starters inclusion
  - Validates setting context integration
  - Ensures scene-specific behavior

- 📝 **Character Voice Consistency**
  - Tests personality maintenance
  - Validates emotional state integration
  - Ensures consistent character behavior

## 📊 Test Results

### **Quality Scoring System**
- **90%+**: Excellent - Production ready
- **80-89%**: Good - Minor improvements needed
- **70-79%**: Acceptable - Several areas need improvement
- **<70%**: Needs work - Significant issues to address

### **Performance Benchmarks**
- **<500ms**: Excellent performance
- **500-1000ms**: Good performance
- **1000-3000ms**: Acceptable performance
- **>3000ms**: Needs optimization

## 🔧 Customization

### **Adding New Tests**
1. Create test function in appropriate test file
2. Add test to the test suite array
3. Update result tracking logic
4. Add to comprehensive test runner

### **Modifying Test Parameters**
- Update character IDs in test files
- Modify performance thresholds
- Adjust quality scoring weights
- Customize test data requirements

### **Environment-Specific Testing**
- Development environment testing
- Staging environment validation
- Production environment monitoring
- Load testing and stress testing

## 🚨 Troubleshooting

### **Common Issues**

#### **Database Connection Errors**
```bash
❌ Character loading failed: Invalid API key
```
**Solution**: Verify SUPABASE_ANON_KEY environment variable

#### **Template Not Found**
```bash
❌ Template loading failed: No rows returned
```
**Solution**: Ensure prompt templates exist in database

#### **Performance Test Failures**
```bash
⚠️ Scene loading performance needs improvement
```
**Solution**: Review database indexes and query optimization

### **Debug Mode**
Enable detailed logging by setting:
```bash
export DEBUG=true
```

## 📈 Continuous Integration

### **Automated Testing**
- GitHub Actions integration
- Automated test execution
- Performance regression detection
- Quality threshold enforcement

### **Test Reporting**
- HTML test reports
- Performance trend analysis
- Quality metrics tracking
- Automated alerts for failures

## 🎯 Next Steps

### **Phase 4: Performance Optimization** (Days 10-12)
- Response time optimization
- Advanced caching strategies
- Final testing and deployment

### **Production Monitoring**
- Real-time performance monitoring
- User experience metrics
- Error rate tracking
- Performance alerting

## 📚 Additional Resources

- [Edge Function Documentation](../supabase/functions/)
- [Database Schema](../docs/08-DATABASE/)
- [Roleplay System Overview](../docs/01-PAGES/07_ROLEPLAY_PURPOSE.md)
- [Development Status](../docs/01-PAGES/ROLEPLAY_DEVELOPMENT_STATUS.md)

---

**Testing Suite Version**: 1.0.0  
**Last Updated**: Phase 3 Complete  
**Next Phase**: Performance Optimization
