# Table: user_collections

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** User-defined content organization and grouping

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (6 total columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- name (text, NOT NULL) - Collection name
- description (text, nullable) - Collection description
- asset_count (integer, default: 0) - Number of assets in collection
- created_at (timestamptz, default: now()) - Collection creation timestamp
```

## **RLS Policies**
```sql
-- Users can only access their own collections
CREATE POLICY "Users can view own collections" ON user_collections
FOR SELECT TO public
USING (auth.uid() = user_id);

-- Users can manage their own collections
CREATE POLICY "Users can manage own collections" ON user_collections
FOR ALL TO public
USING (auth.uid() = user_id);
```

## **Integration Map**
- **Pages/Components**
  - Library Page - Collection display and management
  - Collection Manager - Create/edit collections
  - Asset Organization - Group assets into collections
- **Edge Functions**
  - workspace-actions - Collection operations
  - library-management - Collection CRUD operations
- **Services/Hooks**
  - useCollections - Collection data and operations
  - CollectionService - Collection management

## **Business Rules**
- **Collection Ownership**: Users can only manage their own collections
- **Asset Counting**: Asset count is automatically maintained
- **Naming**: Collection names must be unique per user
- **Asset Linking**: Assets reference collections via collection_id

## **Example Data**
```json
{
  "id": "collection-uuid-here",
  "user_id": "user-uuid-here",
  "name": "Nature Landscapes",
  "description": "Beautiful nature and landscape images",
  "asset_count": 15,
  "created_at": "2024-12-19T14:30:00Z"
}
```

## **Related Tables**
- **profiles** - User profile information
- **user_library** - Assets that can be organized into collections

## **Notes**
- Collections help users organize their content library
- Asset count is automatically updated when assets are added/removed
- Collections can be used for filtering and organization in the library
- Empty collections are allowed and can be populated later
