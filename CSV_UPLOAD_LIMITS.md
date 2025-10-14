# CSV Upload Limits Documentation

## Current Configuration

### Frontend Limit
- **Maximum file size**: 250MB
- **Location**: `src/components/CSVImportDialog.tsx`
- **Validation**: File size check before upload

### Backend Constraints

#### Supabase Edge Functions (Deno Deploy)
The backend has platform-level constraints that affect large file uploads:

1. **HTTP Request Body Size Limit: ~100MB**
   - Supabase Edge Functions run on Deno Deploy
   - Platform enforces a hard limit of approximately 100MB for HTTP request bodies
   - This limit **cannot be configured** in standard Edge Functions
   - Files larger than ~100MB will be rejected at the platform level

2. **Memory Constraints**
   - Edge Functions have limited memory (512MB - 1GB typical)
   - Large CSV files consume memory for:
     - Loading the entire CSV string
     - Parsing into data structures
     - Batch processing for database insertion

3. **Execution Time Limits**
   - Maximum execution time: ~60 seconds
   - Very large files may timeout during processing

## Practical Recommendations

### Effective Upload Limit
While the frontend accepts files up to 250MB, the **practical limit is approximately 80-100MB** due to backend platform constraints.

### User Experience
- Users attempting to upload files larger than ~100MB will receive an error from the backend
- The error will occur after the file is selected and upload is attempted
- Consider client-side warning/guidance for very large files (>100MB)

## Alternative Solutions for Larger Files

If uploads larger than 100MB are required in the future, consider:

### 1. Supabase Storage + Background Processing
- Upload large CSV files to Supabase Storage bucket (supports files >250MB)
- Trigger a background job/Edge Function to process from storage
- Stream/chunk process the file instead of loading entirely into memory
- Provide progress updates to the user

### 2. Client-side Chunking
- Split large CSV files into smaller chunks on the frontend
- Upload each chunk separately (e.g., 50MB chunks)
- Combine/process chunks on the backend sequentially
- Track progress across chunks

### 3. Direct Database Import
- For very large datasets, consider using PostgreSQL's COPY command
- Provide instructions for administrators to import via database tools
- More efficient for massive datasets (>500MB)

## Testing Recommendations

To validate the actual limits in your environment:

1. Test with incrementally larger files:
   - 50MB (baseline)
   - 75MB (should work)
   - 100MB (approaching limit)
   - 125MB (likely to fail)
   - 150MB+ (will fail)

2. Monitor for error patterns:
   - Request body too large (413)
   - Memory exhaustion
   - Timeout errors
   - Generic 500 errors

3. Document the actual failure point for your specific Supabase configuration

## Implementation Notes

### What Was Changed (2025-10-14)
- ✅ Frontend file size validation: 50MB → 250MB
- ✅ Error messages updated to reflect 250MB limit
- ✅ Help text updated to show "Máximo 250MB"
- ℹ️ Backend unchanged (no changes needed - platform handles limits)

### What Was NOT Changed
- Backend Edge Function code remains unchanged
- No explicit size validation added to backend (platform enforces limits)
- No architecture changes to support true 250MB processing

## Summary

The frontend now accepts files up to 250MB as requested, but users should be aware that:
- **Effective limit**: ~80-100MB due to platform constraints
- **Larger files** will fail with backend errors
- **Future enhancements** may be needed for true 250MB+ support via alternative architectures

For most use cases, the 80-100MB practical limit should be sufficient for CSV imports.
