# R2 Media Butler

A sophisticated Node.js CLI utility designed to process, compress, and sync local video assets to Cloudflare R2. The Butler acts as a centralized asset management layer for multiple projects (e.g., Astromatic, Instagram brands, etc.), ensuring optimized delivery and efficient storage lifecycle management.

## 🚀 Key Features

- **Namespace Management**: Organize assets by project names (e.g., `astrologia_familiar`, `in999days`).
- **Compression Engine**: Automatic FFmpeg-powered compression (H.264, CRF 24, AAC, max 1080p).
- **Deduplication Protocol**: SHA-256 file hashing to prevent redundant processing and uploads.
- **Verified Sync**: Local files are only cleaned up after a successful ETag verification against Cloudflare R2.
- **Manual Rotation**: Folder-scoped rotation to archive or remove old assets from R2.
- **Manifest Tracking**: Atomic JSON-based manifest to track `uploaded_at` timestamps and asset status.

## 🛠️ Tech Stack

- **Runtime**: Node.js (ESM)
- **Video Processing**: `fluent-ffmpeg`
- **Cloud Storage**: `@aws-sdk/client-s3` (R2 Compatible)
- **CLI Framework**: `commander` & `inquirer`
- **Database**: Atomic JSON manifest

## 📖 Operational Workflow

1. **Scan**: Butler identifies new video files in a specified local directory.
2. **Check**: Cross-references the SHA-256 hash with the local `manifest.json`.
3. **Compress**: Processes the video using industry-standard H.264 settings (maintaining quality while optimizing size).
4. **Upload**: Transfers the compressed asset to the specific project namespace in R2.
5. **Verify**: Compares the R2 ETag with the local hash to ensure integrity.
6. **Clean**: Removes the original and temporary files from the local machine.
7. **Record**: Updates the manifest with the new entry and timestamp.

## ⚙️ Configuration

Copy the `.env.example` to `.env` and fill in your Cloudflare R2 credentials (see `butler.config.js` or `.env.example` for details):

```env
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_ENDPOINT=https://your_id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your_bucket
```

## ⌨️ Usage

First, ensure dependencies are installed:
```bash
cmd /c npm install
```

### Sync Assets
The Butler can be run with direct arguments or interactively.
```bash
# Using arguments
node butler.js sync --project astrologia_familiar --dir C:/videos/new_batch

# Interactive mode (will prompt for missing values)
node butler.js sync
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
        "filename": "star_bg_01.mp4",
        "hash": "a1b2c3d4...",
        "r2_key": "astrologia_familiar/backgrounds/star_bg_01.mp4",
        "uploaded_at": "2024-01-18T12:00:00Z",
        "status": "active"
      }
    ]
  }
}
```
