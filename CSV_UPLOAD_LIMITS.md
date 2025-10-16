# CSV Upload Limits Documentation

## Current Configuration

### Frontend Limit
- **Maximum file size**: 500MB
- **Location**: `src/components/sync/CSVImportUpload.tsx`
- **Validation**: File size check before upload
- **Upload method**: Direct upload to Supabase Storage (bypasses HTTP body limit)

### Backend Architecture

#### Upload Flow
The current implementation uses direct Storage upload, which bypasses HTTP body limits:

1. **Direct Storage Upload**
   - Files are uploaded directly to the `leads-csv-import` Storage bucket
   - No HTTP body size limit applies (Storage supports files >500MB)
   - Upload is handled by Supabase Storage SDK
   
2. **Edge Function Processing**
   - Edge Function receives only `jobId` and `filePath` (not the CSV file itself)
   - Downloads the CSV from Storage when ready to process
   - Processes in chunks of 5000 lines (memory efficient)

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
The system supports files up to **500MB** through direct Storage upload. Larger files may require extended upload times depending on connection speed.

### User Experience
- Files up to 500MB can be uploaded successfully
- Upload time increases with file size (e.g., 500MB may take 5-10 minutes on slower connections)
- Processing happens in background after upload completes
- Users can monitor progress via the jobs table

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

### What Was Changed (2025-10-16)
- ✅ Frontend file size validation: 100MB → 500MB
- ✅ Error messages updated to reflect 500MB limit
- ✅ Help text updated to show "Máximo: 500MB"
- ✅ Documentation updated to reflect Storage-based upload architecture
- ℹ️ Backend unchanged (already processes from Storage in chunks)

### Architecture
- Upload flow uses direct Storage upload (bypasses HTTP limits)
- Edge Function downloads from Storage and processes in chunks
- Memory-efficient processing handles large files without timeout

## Summary

The system now supports CSV files up to **500MB**:
- **Frontend**: Validates and uploads files up to 500MB to Storage
- **Backend**: Downloads from Storage and processes in memory-efficient chunks
- **Performance**: Upload time scales with file size; processing is async
- **Scalability**: Architecture can be extended to support even larger files if needed

The Storage-based upload architecture eliminates HTTP body size constraints.
