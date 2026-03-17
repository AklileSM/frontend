# DEPLOYMENT

This document explains the **preferred deployed layout** for this project.

## Preferred production layout

The Ubuntu VM runs three separate containers:

- `frontend`
  - React production build
  - Nginx
  - public entry point on port 80

- `backend`
  - FastAPI
  - internal API service on port 3001

- `db`
  - PostgreSQL
  - metadata storage

MinIO is **not** deployed here.
It remains on the Synology NAS.

## Runtime diagram

```text
Browser
  ↓
frontend container
  ↓ /api
backend container
  ├─→ db container
  └─→ Synology NAS MinIO
```

## Main deployment command

`Ubuntu VM`

```bash
cd /opt/a6-stern/deployment
cp .env.docker .env
docker-compose up -d --build
```

## Container management

### Check status

`Ubuntu VM`

```bash
docker-compose ps
```

### See all logs

`Ubuntu VM`

```bash
docker-compose logs -f
```

### See logs per service

`Ubuntu VM`

```bash
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f db
```

### Restart one container

`Ubuntu VM`

```bash
docker-compose restart frontend
docker-compose restart backend
docker-compose restart db
```

## Deploying changes

### When backend code changes

`Windows Lab VM`

Push the updated code to GitHub.

`Ubuntu VM`

```bash
cd /opt/a6-stern
git pull
cd /opt/a6-stern/deployment
docker-compose up -d --build backend
```

### When frontend code changes

`Windows Lab VM`

Push the updated code to GitHub.

`Ubuntu VM`

```bash
cd /opt/a6-stern
git pull
cd /opt/a6-stern/deployment
docker-compose up -d --build frontend
```

### When everything changes

`Ubuntu VM`

```bash
cd /opt/a6-stern
git pull
cd /opt/a6-stern/deployment
docker-compose up -d --build
```

## Verifying the deployment

### Frontend

`Browser`

```text
http://YOUR_UBUNTU_VM_IP
```

### Backend docs

`Browser`

```text
http://YOUR_UBUNTU_VM_IP:3001/api/docs
```

### Backend health

`Browser`

```text
http://YOUR_UBUNTU_VM_IP:3001/api/health
```

## Environment variables

Your main runtime environment file is:

- `/opt/a6-stern/deployment/.env`

It should contain:
- database values
- MinIO endpoint and ports
- MinIO credentials
- Hyperbolic API key

Important:
- use the **MinIO API port**
- do not use the **MinIO Console port** in backend config

## Backups

At minimum, back up:
- the PostgreSQL data volume
- `/opt/a6-stern/deployment/.env`
- any backend-specific `.env` files you create
- MinIO data on the Synology NAS

## Database backup example

`Ubuntu VM`

```bash
docker-compose exec db pg_dump -U postgres a6_stern > a6_stern_backup.sql
```

## Troubleshooting

### Backend cannot connect to MinIO

Check:
- `MINIO_ENDPOINT`
- `MINIO_API_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

### Frontend cannot reach backend

Check:
- `docker-compose ps`
- `docker-compose logs frontend`
- `docker-compose logs backend`

Remember:
- the browser reaches the **frontend container**
- the frontend container proxies `/api` to the **backend container**

### Database problems

Check:

`Ubuntu VM`

```bash
docker-compose logs db
```

### Backend docs unavailable

Check:

`Ubuntu VM`

```bash
docker-compose logs backend
```

If needed:

```bash
curl http://127.0.0.1:3001/api/health
```

## Optional manual deployment path

If you later choose not to use containers, you can still run the backend manually with Python and the frontend manually with Nginx.

But for this project, the recommended production setup is:
- separate frontend container
- separate backend container
- separate PostgreSQL container
