# Codebase Cleanup Inventory

## 🎯 **ACTIVE COMPONENTS (Keep)**

### **Desktop Workspace**
- `src/pages/SimplifiedWorkspace.tsx` ✅ **ACTIVE** - Uses `useLibraryFirstWorkspace`
- `src/components/workspace/SimplePromptInput.tsx` ✅ **ACTIVE** - RV5.1 integration
- `src/hooks/useLibraryFirstWorkspace.ts` ✅ **ACTIVE** - Main workspace logic

### **Mobile Workspace**
- `src/pages/MobileSimplifiedWorkspace.tsx` ✅ **ACTIVE** - Uses `useGenerationWorkspace`
- `src/components/workspace/MobileSimplePromptInput.tsx` ✅ **ACTIVE**

### **Admin Panel**
- `src/pages/Admin.tsx` ✅ **ACTIVE**
- `src/components/admin/ApiModelsTab.tsx` ✅ **ACTIVE** - RV5.1 configuration
- `src/components/admin/ApiProvidersTab.tsx` ✅ **ACTIVE**

## 🗂️ **LEGACY FILES TO ARCHIVE**

### **Legacy Workspace Components**
- `src/pages/UpdatedSimplifiedWorkspace.tsx` ❌ **LEGACY** - Uses mock generation
- `src/pages/Workspace.tsx` ❌ **LEGACY** - Old workspace implementation
- `src/pages/Storyboard.tsx` ❌ **LEGACY** - Old storyboard implementation

### **Legacy Hooks**
- `src/hooks/useSimplifiedWorkspaceState.ts` ❌ **LEGACY** - Replaced by useLibraryFirstWorkspace
- `src/hooks/useOptimizedWorkspace.ts` ❌ **LEGACY** - Replaced by useLibraryFirstWorkspace
- `src/hooks/useEnhancedGenerationWorkspace.ts` ❌ **LEGACY** - Replaced by useLibraryFirstWorkspace
- `src/hooks/useGenerationWorkspace.ts` ❌ **LEGACY** - Mock generation only

### **Legacy Contexts**
- `src/contexts/GeneratedMediaContext.tsx` ❌ **LEGACY** - Mock context
- `src/contexts/PlaygroundContext.tsx` ❌ **LEGACY** - Old playground context

### **Legacy Components**
- `src/components/workspace/ImageInputControls.tsx` ❌ **LEGACY** - Replaced by SimplePromptInput
- `src/components/workspace/VideoInputControls.tsx` ❌ **LEGACY** - Replaced by SimplePromptInput
- `src/components/workspace/WorkspaceContentModal.tsx` ❌ **LEGACY** - Replaced by lightbox
- `src/components/workspace/LibraryImportModal.tsx` ❌ **LEGACY** - Replaced by save functionality
- `src/components/workspace/MultiReferencePanel.tsx` ❌ **LEGACY** - Removed for simplification
- `src/components/workspace/VideoReferencePanel.tsx` ❌ **LEGACY** - Removed for simplification
- `src/components/workspace/UnifiedReferencePanel.tsx` ❌ **LEGACY** - Removed for simplification
- `src/components/workspace/CompactReferenceUpload.tsx` ❌ **LEGACY** - Removed for simplification

### **Legacy Services**
- `src/lib/services/WorkspaceAssetService.ts` ❌ **LEGACY** - Replaced by useLibraryFirstWorkspace
- `src/lib/services/AssetMappers.ts` ❌ **LEGACY** - Replaced by unified asset handling

## 🔄 **MIGRATION PLAN**

### **Step 1: Archive Legacy Files**
```bash
# Move legacy files to archive
mv src/pages/UpdatedSimplifiedWorkspace.tsx src/archive/pages/
mv src/hooks/useSimplifiedWorkspaceState.ts src/archive/hooks/
mv src/hooks/useOptimizedWorkspace.ts src/archive/hooks/
mv src/hooks/useEnhancedGenerationWorkspace.ts src/archive/hooks/
mv src/hooks/useGenerationWorkspace.ts src/archive/hooks/
mv src/contexts/GeneratedMediaContext.tsx src/archive/contexts/
mv src/contexts/PlaygroundContext.tsx src/archive/contexts/
```

### **Step 2: Update Mobile Workspace**
- Replace `useGenerationWorkspace` with `useLibraryFirstWorkspace` in MobileSimplifiedWorkspace
- Remove mock generation dependencies

### **Step 3: Clean Up Imports**
- Remove unused imports from active components
- Update any remaining references to legacy files

### **Step 4: Documentation**
- Update component documentation
- Create migration guide for future reference

## 📊 **CURRENT ARCHITECTURE**

### **Desktop Flow**
```
SimplifiedWorkspace.tsx
├── useLibraryFirstWorkspace.ts (RV5.1 + SDXL routing)
├── SimplePromptInput.tsx (Model selection UI)
└── WorkspaceGrid.tsx (Asset display)
```

### **Mobile Flow**
```
MobileSimplifiedWorkspace.tsx
├── useLibraryFirstWorkspace.ts (Should migrate to this)
├── MobileSimplePromptInput.tsx
└── SharedGrid.tsx (Asset display)
```

## 🎯 **IMMEDIATE ACTIONS**

1. **Archive Legacy Files** - Move unused components to archive
2. **Fix Mobile Workspace** - Replace mock generation with real RV5.1/SDXL routing
3. **Clean Imports** - Remove unused dependencies
4. **Update Documentation** - Reflect current active components
5. **Test Integration** - Ensure RV5.1 routing works on both desktop and mobile
