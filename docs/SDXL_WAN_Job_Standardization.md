# SDXL & WAN Job Standardization: Design, Options, and Implementation

**Last Updated:** July 2025

---

## Overview

This document explores the evolution and standardization of job handling for SDXL (multi-image) and WAN (video/single-image) jobs in the OurVidz platform. It compares the legacy array/placeholder approach with the new record-per-asset pattern, and documents the rationale, phased implementation, and affected code areas.

---

## Background

- **SDXL Jobs:** Generate multiple images per job (batch), previously handled with a placeholder record and array of image URLs.
- **WAN Jobs:** Generate a single video or image per job, handled with a single record updated on completion.

### Key Goals
- Consistency across all job types
- Elimination of orphaned/placeholder records
- Simpler, more reliable real-time updates for workspace and library
- Maintainability and scalability

---

## Options Considered

### 1. **Array/Placeholder Approach (Legacy)**
- **SDXL:** Create one placeholder image record with status `queued`. On completion, insert N new image records with status `completed` and image URLs (array).
- **WAN:** Create one video/image record with status `queued`, update it to `completed` on job finish.

**Problems:**
- Orphaned placeholder records
- Inconsistent event handling (INSERT for SDXL, UPDATE for WAN)
- Complex mapping between job, assets, and UI
- Race conditions and duplicate events

### 2. **Record-Per-Asset Pattern (Standardized)**
- **SDXL:** At job submission, create N image records (one per image) with status `queued` and `image_index` (0, 1, 2, ...). On completion, update each record with its image URL and set status to `completed`.
- **WAN:** Continue creating/updating a single record per job.

**Benefits:**
- Consistent, predictable event handling (UPDATE for all completions)
- No orphans or placeholders
- Deterministic mapping via `image_index`
- Simpler frontend and backend logic

---

## Phased Implementation Plan

### **Phase 1: Add `image_index` Column**
- Migration: Add nullable `image_index` to `images` table
- Used for deterministic mapping in SDXL jobs
- No impact on WAN jobs (remains NULL)

### **Phase 2: Update GenerationService for N-Record Creation**
- File: `src/lib/services/GenerationService.ts`
- For SDXL jobs, create N image records with `image_index` 0..N-1
- For WAN jobs, create one record (existing logic)
- Pass all image IDs to the job queue

### **Phase 3: Update Job Callback for UPDATE Pattern**
- File: `supabase/functions/job-callback/index.ts`
- On job completion, update each image record by `job_id` and `image_index` with its URL and status
- Remove all INSERT logic for SDXL completions
- Handle partial failures and retries

### **Phase 4: Simplify Frontend Event Handling**
- Files:
  - `src/contexts/AuthContext.tsx` (real-time event listeners)
  - `src/pages/Workspace.tsx` (workspace updates)
  - `src/pages/Library.tsx` (library updates)
  - Hooks: `src/hooks/useRealtimeWorkspace.ts`, `src/hooks/useWorkspace.ts`, `src/hooks/useAssets.ts`
- Remove INSERT event listeners for images
- Listen only for UPDATE events (status = 'completed')
- Workspace and library update in real time for both SDXL and WAN jobs

### **Phase 5: Database Cleanup & Indexing**
- SQL: Clean up orphaned image records
- Add index on `(job_id, image_index)` for efficient callback updates

---

## July 2025 Deep Dive: Implementation Details & Code Changes

### GenerationService.ts (Frontend/Backend Job Submission)
- **SDXL Jobs:**
  - Now creates N image records (one per image) at job submission, each with `status: 'queued'` and a unique `image_index` (0..N-1).
  - Each record is linked to the user, project, and prompt, and includes enhanced metadata for SDXL tracking.
  - After job submission, all SDXL image records are updated with the actual `job_id` once the job is created in the queue.
  - Logging and error handling have been improved for traceability.
- **WAN Jobs:**
  - Continue to create a single image or video record per job, as before.
- **Job Queue:**
  - The job payload now includes all relevant metadata, including the array of image IDs for SDXL jobs.

### job-callback/index.ts (Supabase Edge Function Callback)
- **Standardized Callback Handling:**
  - All workers now send an `assets` array, regardless of job type.
  - The callback fetches the job, merges new asset data into the job's metadata, and updates the job record.
- **Image Job Callback:**
  - For SDXL jobs, the callback now updates existing image records (matched by `job_id` and `image_index`) with their respective URLs and sets `status: 'completed'`.
  - No new image records are inserted on completion—this eliminates orphans and placeholder records.
  - Enhanced logging and error handling for missing assets or mismatches.
- **WAN Jobs:**
  - Continue to update the single image or video record as before.
- **Partial Failure Handling:**
  - The callback is structured to handle partial asset failures and retries, ensuring robust updates.

### Key Code References
- `src/lib/services/GenerationService.ts` (see SDXL image record creation and job_id update logic)
- `supabase/functions/job-callback/index.ts` (see standardized asset update logic in handleImageJobCallback)

### Summary of the New Approach
- **Record-per-asset:** All SDXL jobs now create one image record per expected output at submission, with deterministic `image_index`.
- **Standardized updates:** On job completion, each image record is updated in place, not inserted anew.
- **Consistent event flow:** Both SDXL and WAN jobs now use UPDATE events for asset completion, simplifying real-time UI updates.
- **No more orphans:** Placeholder and orphaned records are eliminated, and mapping between jobs and assets is deterministic and reliable.

---

## Workspace vs. Library: Asset Flow

- **Library:**
  - Shows all completed assets for the user (images/videos)
  - Populated automatically on asset completion (UPDATE event)
- **Workspace:**
  - Can be used as a staging area for assets in progress or under review
  - Optionally, let users curate which assets to save to the library/storage
  - Real-time updates now consistent for both SDXL and WAN jobs

---

## Affected Components & Hooks

- **Backend:**
  - `supabase/functions/queue-job/index.ts` (job creation)
  - `supabase/functions/job-callback/index.ts` (job completion)
- **Frontend:**
  - `src/lib/services/GenerationService.ts` (job submission logic)
  - `src/contexts/AuthContext.tsx` (real-time event listeners)
  - `src/pages/Workspace.tsx` (workspace UI and logic)
  - `src/pages/Library.tsx` (library UI and logic)
  - `src/hooks/useRealtimeWorkspace.ts`, `src/hooks/useWorkspace.ts`, `src/hooks/useAssets.ts` (state management)

---

## Rationale & Expected Outcomes

- **Consistency:** Both SDXL and WAN jobs follow the same record-per-asset pattern
- **Reliability:** No more orphaned or placeholder records
- **Simplicity:** Single event type (UPDATE) for all completions
- **Performance:** Fewer events, less duplicate processing
- **Maintainability:** Cleaner, more predictable codebase

---

## References
- [API.md](./API.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [src/lib/services/GenerationService.ts](../src/lib/services/GenerationService.ts)
- [supabase/functions/job-callback/index.ts](../supabase/functions/job-callback/index.ts)
- [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx)
- [src/pages/Workspace.tsx](../src/pages/Workspace.tsx)
- [src/pages/Library.tsx](../src/pages/Library.tsx)
- [src/hooks/useRealtimeWorkspace.ts](../src/hooks/useRealtimeWorkspace.ts)
- [src/hooks/useWorkspace.ts](../src/hooks/useWorkspace.ts)
- [src/hooks/useAssets.ts](../src/hooks/useAssets.ts)

---

*This document should be updated as the implementation evolves or if new patterns are adopted.* 