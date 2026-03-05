

## Problem Identified

The "Publicar" button fails because **no RLS policies exist on `storage.objects`** for any bucket. Both `atleta-posts` (post images) and `atleta-fotos` (profile photos) uploads are blocked by RLS.

The network requests confirm this: uploading to `atleta-fotos` during profile creation also returned 403 (the profile was created without photo).

## Plan

### 1. Create storage RLS policies via migration

Add policies for both buckets:

**`atleta-posts` bucket:**
- **INSERT**: Authenticated users can upload to their own folder (`auth.uid()::text = (storage.foldername(name))[1]`)
- **SELECT**: Public read (bucket is already public)
- **UPDATE**: Owner can update their files
- **DELETE**: Owner can delete their files

**`atleta-fotos` bucket:**
- **INSERT**: Authenticated users can upload to their own folder
- **SELECT**: Public read
- **UPDATE**: Owner can update (upsert)
- **DELETE**: Owner can delete

Also add policy for `atividade-externa-fotos` if needed (same pattern).

### 2. Verify CreatePostForm error handling

The `carreira/CreatePostForm.tsx` already has a try/catch with `toast.error` -- no code change needed there. Once storage policies are in place, uploads will work.

### Technical Details

Single SQL migration creating 8 policies (INSERT/SELECT/UPDATE/DELETE for each of the 2 main buckets). The folder-based policy pattern (`(storage.foldername(name))[1] = auth.uid()::text`) ensures users can only write to their own subfolder.

