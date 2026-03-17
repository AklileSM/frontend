# START HERE

This guide is the **main beginner guide**.

It assumes the final system should run like this:
- **frontend in its own container**
- **backend in its own container**
- **PostgreSQL in its own container**
- **MinIO stays on the Synology NAS**

## What you are building

You are turning the current frontend-only project into a containerized full-stack system that is managed as **three separate Git repositories**:

1. **Frontend repo**
   - React app
   - Nginx config
   - frontend docs

2. **Backend repo**
   - FastAPI app
   - database and storage logic
   - migration scripts

3. **Deployment repo**
   - Docker Compose
   - shared Docker environment values

The runtime system itself is:

4. **Frontend container**
   - serves the React app
   - includes Nginx
   - receives browser traffic on port 80

5. **Backend container**
   - runs FastAPI
   - exposes the API on port 3001
   - talks to PostgreSQL, MinIO, and Hyperbolic

6. **PostgreSQL container**
   - stores metadata only
   - does not store the real image or pointcloud files

7. **Existing MinIO on Synology NAS**
   - stores the real files
   - is not reinstalled

## Where each step happens

In your case, the access path is:

```text
Your computer
  -> RDP
Windows Lab VM
  -> Proxmox / SSH
Ubuntu VM
```

Use these labels in this guide:

- `Windows Lab VM`: the Windows VM you control through RDP
- `Ubuntu VM`: the Ubuntu server inside Proxmox where the containers run
- `Browser`: usually the browser opened inside the Windows Lab VM
- `MinIO Console`: the MinIO web UI opened from that same Windows Lab VM browser

## Architecture summary

```text
Browser
  ↓
Frontend container (React + Nginx)
  ↓ /api
Backend container (FastAPI)
  ├─→ PostgreSQL container
  ├─→ Synology NAS MinIO
  └─→ Hyperbolic AI
```

## Phase 1: MinIO check

You already have MinIO installed.
So you are **not** reinstalling it.

### Step 1.1: Open existing MinIO Console

`Browser on Windows Lab VM`

Open:

```text
http://YOUR_NAS_IP:YOUR_MINIO_CONSOLE_PORT
```

Example:

```text
http://192.168.50.200:9101
```

Log in using your existing MinIO username and password.

### Step 1.2: Verify or create buckets

`MinIO Console`

Make sure these buckets exist:
- `construction-images`
- `construction-thumbnails`
- `construction-pointclouds`
- `construction-reports`

If they do not exist, create them.

### Step 1.3: Save the MinIO connection values

You will need:

```text
MINIO_ENDPOINT=YOUR_NAS_IP
MINIO_API_PORT=YOUR_API_PORT
MINIO_CONSOLE_PORT=YOUR_CONSOLE_PORT
MINIO_ACCESS_KEY=YOUR_USERNAME
MINIO_SECRET_KEY=YOUR_PASSWORD
```

Important:
- the **API port** is for the backend
- the **Console port** is for the browser only

## Phase 2: Ubuntu VM preparation

### Step 2.1: Connect to the VM

`Windows Lab VM`

```powershell
ssh your-user@your-ubuntu-vm-ip
```

### Step 2.2: Check what is already available

Do this first because the VM may be shared.

`Ubuntu VM`

```bash
python3 --version
pip3 --version
node --version
docker --version
psql --version
```

If these tools already exist, prefer using them instead of changing shared system packages.

### Step 2.3: Install missing packages only if you are allowed to

If Docker, Python, or Node are missing and you are allowed to install packages, then install them.

If this is a shared lab VM and you are **not sure**, ask before changing system package sources or installing new system packages.

## Phase 3: Get the repos onto the Ubuntu VM

### Step 3.1: Push all three repos to GitHub

`Windows Lab VM`

Because you access the Ubuntu VM through the Windows Lab VM, the recommended workflow is:

1. push the `frontend` repo to GitHub
2. push the `backend` repo to GitHub
3. push the `deployment` repo to GitHub
4. connect to the Ubuntu VM
5. clone all three repos directly on the Ubuntu VM

### Step 3.2: Clone all three repos on the Ubuntu VM

`Ubuntu VM`

```bash
sudo mkdir -p /opt/a6-stern
sudo chown -R $USER:$USER /opt/a6-stern
cd /opt/a6-stern
git clone YOUR_FRONTEND_REPO_URL frontend
git clone YOUR_BACKEND_REPO_URL backend
git clone YOUR_DEPLOYMENT_REPO_URL deployment
```

If the repos already exist on the Ubuntu VM, update them one by one:

```bash
cd /opt/a6-stern/frontend && git pull
cd /opt/a6-stern/backend && git pull
cd /opt/a6-stern/deployment && git pull
```

### Step 3.3: Confirm the expected repos exist

`Ubuntu VM`

```bash
ls /opt/a6-stern
```

You should see at least:
- `backend`
- `frontend`
- `deployment`

Inside `frontend/`, you should then see:
- `src`
- `public`
- `Dockerfile`
- `nginx.conf`

Inside `deployment/`, you should then see:
- `docker-compose.yml`
- `.env.docker`

## Phase 4: Configure the container environment

### Step 4.1: Create the runtime `.env`

`Ubuntu VM`

```bash
cd /opt/a6-stern/deployment
cp .env.docker .env
nano .env
```

### Step 4.2: Fill in your real values

`Ubuntu VM`

Example:

```env
DB_NAME=a6_stern
DB_USER=postgres
DB_PASSWORD=change_me

MINIO_ENDPOINT=192.168.50.200
MINIO_API_PORT=9100
MINIO_CONSOLE_PORT=9101
MINIO_ACCESS_KEY=your_existing_username
MINIO_SECRET_KEY=your_existing_password
MINIO_USE_SSL=false

HYPERBOLIC_API_KEY=your_hyperbolic_key
DEBUG=false
```

Important:
- use the **MinIO API port**
- do not use the Console port for backend access

## Phase 5: Start the containers

### Step 5.1: Build and start the whole stack

`Ubuntu VM`

```bash
cd /opt/a6-stern/deployment
docker-compose up -d --build
```

This starts three separate containers:
- `frontend`
- `backend`
- `db`

### Step 5.2: Confirm containers are running

`Ubuntu VM`

```bash
docker-compose ps
```

### Step 5.3: If something fails, inspect logs

`Ubuntu VM`

```bash
docker-compose logs -f
```

You can also inspect one service only:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## Phase 6: Verify the running system

### Step 6.1: Open the frontend

`Browser`

```text
http://YOUR_UBUNTU_VM_IP
```

### Step 6.2: Open backend docs

`Browser`

```text
http://YOUR_UBUNTU_VM_IP:3001/api/docs
```

### Step 6.3: Test health

`Browser`

```text
http://YOUR_UBUNTU_VM_IP/health
```

If the frontend loads and the backend docs open, then the containers are talking correctly.

## Phase 7: Optional legacy asset migration

Use this if you want to move old local files from the **frontend repo's** `public/` folder into MinIO and PostgreSQL.

### Step 7.1: Run the migration script inside the backend container

`Ubuntu VM`

```bash
cd /opt/a6-stern/deployment
docker-compose exec backend python scripts/migrate_legacy_assets.py
```

What it does:
- reads the frontend public files through the Docker-mounted path from the frontend repo
- uploads them to MinIO
- creates metadata records in PostgreSQL

## Phase 8: Frontend and backend roles

### Frontend container

Handles:
- UI
- navigation
- room explorer
- date explorer
- viewer screens

### Backend container

Handles:
- MinIO integration
- file metadata
- uploads
- AI analysis
- annotations
- reports

### PostgreSQL container

Stores:
- project metadata
- room metadata
- file records
- report records
- annotation records

## Phase 9: Quick checks

### Check backend logs

`Ubuntu VM`

```bash
docker-compose logs -f backend
```

### Check frontend logs

`Ubuntu VM`

```bash
docker-compose logs -f frontend
```

### Check database logs

`Ubuntu VM`

```bash
docker-compose logs -f db
```

### Open a database shell

`Ubuntu VM`

```bash
docker-compose exec db psql -U postgres -d a6_stern
```

## If something fails

- backend fails: check `docker-compose logs backend`
- frontend fails: check `docker-compose logs frontend`
- db fails: check `docker-compose logs db`
- MinIO connection fails: verify NAS IP, API port, access key, secret key
- browser cannot load app: verify VM IP and port 80 access

## Optional manual path

If later you explicitly decide not to use containers for backend/frontend, the code can still be run manually.

But the **preferred architecture for this project is the separate-container setup**:
- one frontend container
- one backend container
- one PostgreSQL container

## What to read next

- `docs/ARCHITECTURE.md` for the full system design
- `docs/DEPLOYMENT.md` for deployment and update workflow
