# Upload Flowchart (End-to-End)

This file documents the complete upload workflow across frontend and backend.

## Full Upload Workflow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend (FileExplorer)
    participant AUTH as Frontend AuthContext
    participant API as Frontend API Client
    participant BE as Backend Upload API
    participant S3 as MinIO
    participant DB as Database
    participant BG as Background Converter

    U->>FE: Select date from calendar
    FE->>AUTH: Read current user role
    AUTH-->>FE: user.role

    alt role is admin
        FE-->>U: Show Upload UI (room + file + upload button)
    else role is not admin
        FE-->>U: Hide Upload UI
    end

    U->>FE: Pick media tab, room, file, click Upload
    FE->>API: uploadSingleFile(file, roomSlug, mediaType, captureDate)

    alt mediaType is image/video/pdf
        API->>BE: POST /api/upload/single
        BE->>BE: require_user_can_upload (admin-only)
        BE->>BE: Validate room, date, media, file size
        BE->>S3: Upload object to bucket/path
        BE->>DB: Save FileAsset
        BE-->>API: UploadResponse
        API-->>FE: Success
        FE-->>U: Show success message
    else mediaType is pointcloud (direct first)
        API->>BE: POST /api/upload/pointcloud/direct-init
        BE->>BE: require_user_can_upload
        BE-->>API: upload_id + presigned PUT URL
        API->>S3: PUT full pointcloud directly
        API->>BE: POST /api/upload/pointcloud/direct-complete
        BE->>BE: Verify uploaded object and size
        BE->>DB: Save FileAsset (conversion_status=pending)
        BE->>BG: Queue convert_pointcloud_background
        BE-->>API: UploadResponse
        API-->>FE: Success (conversion pending)
        FE-->>U: Show upload progress and pending conversion notice
    else direct upload fails
        API->>API: Catch error and fallback to chunked flow
        API->>BE: POST /api/upload/pointcloud/init
        BE-->>API: upload_id + chunk_size
        loop all chunks
            API->>BE: POST /api/upload/pointcloud/chunk
        end
        API->>BE: POST /api/upload/pointcloud/complete
        BE->>BE: Assemble chunks and upload assembled file
        BE->>S3: Store final object
        BE->>DB: Save FileAsset (conversion_status=pending)
        BE->>BG: Queue convert_pointcloud_background
        BE-->>API: UploadResponse
        API-->>FE: Success (conversion pending)
    end

    BG->>S3: Read source and write Potree outputs
    BG->>DB: Update conversion_status (processing -> ready/failed)
    FE->>BE: Refresh explorer/poll while pending
    BE-->>FE: Return files with conversion status
    FE-->>U: Show queued/converting/ready/failed state
```

## Key Access Rules

- Frontend gating: Upload UI appears only when `user.role === "admin"` and a date is selected.
- Backend enforcement: Upload endpoints always call `require_user_can_upload`; non-admin requests return `403`.
- Security source of truth is backend authorization; frontend check is a UX gate.
