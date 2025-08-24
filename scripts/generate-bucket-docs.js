#!/usr/bin/env node

/**
 * Generate storage bucket documentation files
 * Usage: node scripts/generate-bucket-docs.js [bucket_name]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bucket definitions with metadata
const bucketDefinitions = {
  avatars: {
    purpose: "Character avatar images for roleplay system",
    ownership: "User",
    category: "Content Storage",
    fileNumber: "90",
    fileTypes: ["image/jpeg", "image/png", "image/webp"],
    sizeLimit: "No limit",
    access: "Public read/write"
  },
  reference_images: {
    purpose: "User reference images for content generation",
    ownership: "User",
    category: "Content Storage",
    fileNumber: "91",
    fileTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    sizeLimit: "10MB",
    access: "Private per user"
  },
  system_assets: {
    purpose: "System-wide assets and placeholders",
    ownership: "System",
    category: "Content Storage",
    fileNumber: "92",
    fileTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    sizeLimit: "5MB",
    access: "Public read/write"
  },
  "user-library": {
    purpose: "User's permanent content library",
    ownership: "User",
    category: "Content Storage",
    fileNumber: "93",
    fileTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
    sizeLimit: "50MB",
    access: "Private per user"
  },
  videos: {
    purpose: "Public video content",
    ownership: "System/User",
    category: "Content Storage",
    fileNumber: "94",
    fileTypes: ["video/mp4", "video/mpeg", "video/webm", "video/quicktime"],
    sizeLimit: "No limit",
    access: "Public read/write"
  },
  "workspace-temp": {
    purpose: "Temporary workspace assets during generation",
    ownership: "System/User",
    category: "Content Storage",
    fileNumber: "95",
    fileTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
    sizeLimit: "50MB",
    access: "Private per user"
  }
};

function generateBucketDoc(bucketName) {
  const bucket = bucketDefinitions[bucketName];
  if (!bucket) {
    console.error(`Unknown bucket: ${bucketName}`);
    console.log('Available buckets:', Object.keys(bucketDefinitions).join(', '));
    return;
  }

  const template = `# Storage Bucket: ${bucketName}

Purpose: ${bucket.purpose}

Ownership: ${bucket.ownership}

## Configuration
- **File Types**: ${bucket.fileTypes.join(', ')}
- **Size Limit**: ${bucket.sizeLimit}
- **Access Control**: ${bucket.access}
- **Category**: ${bucket.category}

## Usage Patterns
- **Upload Sources**: [List components/pages that upload to this bucket]
- **Access Patterns**: [List components/pages that read from this bucket]
- **Lifecycle**: [Document file lifecycle and cleanup policies]

## Integration Map
- **Pages/Components**
  - [List relevant pages/components]
- **Edge Functions**
  - [List relevant edge functions]
- **Services/Hooks**
  - [List relevant services/hooks]

## Security & Policies
- **RLS Policies**: [Document row-level security policies]
- **CORS Configuration**: [Document CORS settings if applicable]
- **Access Control**: [Document who can access what]

## Example Operations
- **Upload**: [Example upload operations]
- **Download**: [Example download operations]
- **Delete**: [Example delete operations]

## Notes
- [Additional implementation notes]
- [Performance considerations]
- [Storage cost implications]
`;

  const fileName = `${bucket.fileNumber}-${bucketName}.md`;
  const filePath = path.join(__dirname, '..', 'docs', 'tables', fileName);
  
  fs.writeFileSync(filePath, template);
  console.log(`Generated: ${fileName}`);
  console.log(`Category: ${bucket.category}`);
  console.log(`File: ${filePath}`);
}

function generateAllBucketDocs() {
  console.log('Generating documentation for all storage buckets...\n');
  
  Object.keys(bucketDefinitions).forEach(bucketName => {
    generateBucketDoc(bucketName);
  });
  
  console.log('\n✅ All bucket documentation templates generated!');
  console.log('\nNext steps:');
  console.log('1. Verify bucket configurations in Supabase dashboard');
  console.log('2. Update each generated file with actual configuration details');
  console.log('3. Add integration maps and security policies');
  console.log('4. Update 00-INVENTORY.md to mark buckets as documented');
}

// Main execution
const bucketName = process.argv[2];

if (bucketName) {
  generateBucketDoc(bucketName);
} else {
  generateAllBucketDocs();
}
