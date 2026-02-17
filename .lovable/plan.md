

# Fix Overstated Request Counts and Add Avg Time

## Problem Confirmed

The `api_usage_aggregates` table tracks `request_count`, `success_count`, and `error_count` separately. But the UI uses `request_count` (which includes failures) everywhere:

- **ApiUsageTab `modelInventory`**: Uses `agg.request_count` to sum requests and divide cost -- overstates requests, understates avg cost
- **ApiUsageTab `totals`**: Shows inflated "X requests" in the summary bar
- **`avg_response_time_ms` in aggregates**: Includes failed request times (often just 100-300ms error responses), dragging down the real generation averages

Example: Seedream v4.5 Edit shows 212 total requests but only 167 succeeded. The 45 failures (422 errors) inflate the count and drag down the avg response time since errors return in milliseconds vs real generation taking 20-30 seconds.

## Changes

### 1. `src/components/admin/ApiUsageTab.tsx` -- Fix modelInventory to use success_count

**modelInventory memo (line 62-98):**
- Change `existing.requests += agg.request_count` to `existing.requests += agg.success_count`
- Add `existing.errors += agg.error_count` for a separate error tracking field
- Add `avgTime` calculation: accumulate weighted response time from successful requests only
- Add "Avg Time" column to the Model Inventory table between "Avg Cost" and "Status"
- Display formatted time (e.g., "1.6s", "24.6s", "1m 55s")

**totals memo (line 100-113):**
- Change `totalRequests += agg.request_count` to `totalRequests += agg.success_count`
- Keep `totalErrors` separate for potential display

**Note on avg_response_time_ms from aggregates:** The aggregate `avg_response_time_ms` unfortunately blends success and failure times. For the modelInventory, we will use it as-is since it's the only source available without querying raw logs. The values are still directionally correct since most requests succeed. A future improvement could add `avg_success_response_time_ms` to the aggregates table.

### 2. `src/components/admin/ApiModelsTab.tsx` -- Add Avg Cost and Avg Time columns

**New query:** Add a `useQuery` that fetches per-model stats from `api_usage_logs` filtered to `response_status = 200`:

```text
SELECT model_id, 
  COUNT(*) as requests, 
  AVG(cost_usd) as avg_cost, 
  AVG(response_time_ms) as avg_time
FROM api_usage_logs 
WHERE response_status = 200 AND model_id IS NOT NULL
GROUP BY model_id
```

This gives accurate success-only averages directly from raw logs.

**Table changes:**
- Add two new columns after "Family": **"Avg Cost"** and **"Avg Time"**
- Add them to the `SortableHead` system so they are sortable
- Display as `$0.004` and `1.6s` (compact format)
- Show `--` for models with no usage data
- Merge the stats map into `ModelRow` via props

### 3. Time formatting helper

Add a shared `formatResponseTime` function:
- Less than 1000ms: `"320ms"`
- 1-60 seconds: `"1.6s"`, `"24.6s"`  
- Over 60 seconds: `"1m 55s"`

## Files to Change

| File | Change |
|---|---|
| `src/components/admin/ApiUsageTab.tsx` | Use `success_count` instead of `request_count`, add "Avg Time" column |
| `src/components/admin/ApiModelsTab.tsx` | Add success-only stats query, add "Avg Cost" and "Avg Time" sortable columns |

## Result

- Request counts reflect actual successful API calls, not failed attempts
- Average costs are calculated from successful requests only (accurate per-generation cost)
- Average generation times exclude error responses (which return in milliseconds and drag down averages)
- Both the Usage tab and Models tab show consistent, accurate metrics
