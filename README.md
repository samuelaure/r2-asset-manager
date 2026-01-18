# R2 Media Butler

A sophisticated Node.js CLI utility designed to process, compress, and sync local video and audio assets to Cloudflare R2. The Butler acts as a centralized asset management layer for multiple projects (e.g., Astromatic, Instagram brands, etc.), ensuring optimized delivery and efficient storage lifecycle management.

## 🚀 Key Features

- **Namespace Management**: Organize assets by project names (e.g., `astrologia_familiar`, `in999days`).
- **Media Optimization Engine**: Automatic FFmpeg-powered compression for Videos (H.264, 1080p) and Audios (AAC).
- **Standardized Naming**: Automatic generation of clean filenames (e.g., `AF_VID_0001.mp4`, `AF_AUD_0001.mp3`).
- **Safety Filtering**: Prevents accidental upload of abnormally large files (warnings with interactive confirmation).
- **Deduplication Protocol**: SHA-256 file hashing to prevent redundant processing and uploads.
- **Verified Sync**: Local files are only cleaned up after a successful upload verification to Cloudflare R2.
- **Manual Rotation**: Folder-scoped rotation to archive or remove old assets from R2.
- **Manifest Tracking**: Atomic JSON-based manifest to track original filenames and upload history.

## 🛠️ Tech Stack

- **Runtime**: Node.js (ESM)
- **Video/Audio Processing**: `fluent-ffmpeg`
- **Cloud Storage**: `@aws-sdk/client-s3` (R2 Compatible)
- **CLI Framework**: `commander` & `inquirer`
- **Database**: Atomic JSON manifest

## 📖 Operational Workflow

1. **Scan**: Butler identifies new media files (MP4, MP3, WAV, etc.) in a local directory.
2. **Evaluate**: Checks file size against configured limits and asks for confirmation if a file is too large.
3. **Check**: Cross-references hashes with `manifest.json` to prevent duplicates.
4. **Optimize**: Processes video (H.264) or audio (AAC) using industry-standard settings.
5. **Name**: Assigns a standardized name using the project's short-code and an incremental counter (e.g., `AF_VID_0042.mp4`).
6. **Upload**: Transfers the asset to the correct folder in R2 (`/videos/` or `/audios/`).
7. **Clean**: Removes the original and temporary files from the local machine.
8. **Record**: Updates the manifest with the new entry, linking original and system filenames.

## ⚙️ Configuration

Copy the `.env.example` to `.env` and fill in your details:

```env
# Cloudflare R2 Credentials
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_ENDPOINT=https://your_id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your_bucket

# Size Limits (Optional)
MAX_VIDEO_SIZE_MB=500
MAX_AUDIO_SIZE_MB=50
```

## ⌨️ Usage

### Sync Assets

The Butler can be run with direct arguments or interactively.

```bash
# Using arguments
node butler.js sync --project astrologia_familiar --dir C:/videos/new_batch

# Interactive mode (will prompt for missing values)
node butler.js sync

# Skip size confirmation for large files
node butler.js sync --skip-size-check
```

### Rotate Assets (Manual)

Remove old assets from R2 for a specific project.

```bash
# Delete assets older than 90 days
node butler.js rotate --project astrologia_familiar --older-than 90

# Preview deletions without touching R2
node butler.js rotate --project astrologia_familiar --older-than 30 --dry-run
```

## 📋 Manifest Structure

The `manifest.json` automatically tracks your assets:

```json
{
  "projects": {
    "astrologia_familiar": [
      {
        "type": "VID",
        "system_filename": "AF_VID_0001.mp4",
        "original_filename": "raw_recording_final.mp4",
        "hash": "a1b2c3d4...",
        "r2_key": "astrologia_familiar/videos/AF_VID_0001.mp4",
        "uploaded_at": "2024-01-18T12:00:00Z",
        "status": "active"
      }
    ]
  },
  "projectConfig": {
    "astrologia_familiar": {
      "shortCode": "AF",
      "videoCounter": 1,
      "audioCounter": 0
    }
  }
}
```
