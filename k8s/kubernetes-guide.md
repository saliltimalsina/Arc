# Kubernetes Guide for Absolute Beginners

This guide explains the Kubernetes files in this repository and the step-by-step process to run the app locally using Minikube.

## Why Kubernetes?

Kubernetes lets you run your app as containers inside a local cluster, instead of running them directly with `docker compose`.

- `Dockerfile` builds images
- Kubernetes runs those images as pods
- `Service` exposes the pods inside the cluster
- `Ingress` routes browser requests to the right service

## What each file does

### `k8s/namespace.yaml`

This file creates a separate namespace called `mantra-arc` inside your cluster.

Why it matters:

- keeps your app isolated from other clusters apps
- makes it easier to manage with `kubectl -n mantra-arc`

### `k8s/config-secrets.yaml`

This file stores environment values for the app.

It contains:

- `ConfigMap` for public config values like `API_PORT` and `NEXT_PUBLIC_API_URL`
- `Secret` for private values like `JWT_SECRET` and `SMTP_PASS`

Why it matters:

- Kubernetes injects these values into containers
- your app reads them just like normal environment variables

### `k8s/postgres-redis.yaml`

This file deploys the database and Redis cache.

It contains:

- `Deployment` + `Service` for Postgres
- `PersistentVolumeClaim` for Postgres storage
- `Deployment` + `Service` for Redis
- `PersistentVolumeClaim` for Redis storage

Why it matters:

- Postgres stores your application data
- Redis stores session and cache data
- Persistent volumes keep data after pod restarts

### `k8s/api-web.yaml`

This file deploys the backend and frontend apps.

It contains:

- `Deployment` + `Service` for the API
- `Deployment` + `Service` for the Web frontend
- the API has an `initContainer` that waits for the database before starting

Why it matters:

- the API must wait until Postgres is ready
- the frontend and API run in the same Kubernetes namespace

### `k8s/ingress.yaml`

This file tells Kubernetes how to route browser traffic.

It contains:

- host `mantra-arc.local` → frontend service
- host `api-mantra-arc.local` → API service

Why it matters:

- your browser requests to those hostnames reach the correct app
- hostnames are used instead of raw IP addresses

## Step-by-step local setup

### 1. Install prerequisites

You need:

- Docker
- Minikube
- `kubectl` or `minikube kubectl`

### 2. Start Minikube

```bash
minikube start --driver=docker
minikube addons enable ingress
```

This starts a local Kubernetes cluster on your machine.

### 3. Build the images

Kubernetes deploys images, so you must build them first.

```bash
eval "$(minikube docker-env)"
docker build --build-arg NEXT_PUBLIC_API_URL=http://api-mantra-arc.local -t mantra-arc-web:local ./apps/web
docker build -t mantra-arc-api:local ./apps/api
```

Why this matters:

- `minikube docker-env` makes the images available to Minikube
- `NEXT_PUBLIC_API_URL` points your frontend browser code to the API hostname

### 4. Create the namespace

```bash
minikube kubectl -- apply -f k8s/namespace.yaml
```

### 5. Apply config and secrets

```bash
minikube kubectl -- apply -f k8s/config-secrets.yaml
```

### 6. Deploy Postgres and Redis

```bash
minikube kubectl -- apply -f k8s/postgres-redis.yaml
```

### 7. Deploy the API and Web apps

```bash
minikube kubectl -- apply -f k8s/api-web.yaml
```

### 8. Deploy ingress routes

```bash
minikube kubectl -- apply -f k8s/ingress.yaml
```

### 9. Add hostnames to your local machine

Edit `/etc/hosts` and add:

```text
192.168.49.2 mantra-arc.local api-mantra-arc.local
```

If Minikube uses another IP, replace `192.168.49.2` with the address shown by:

```bash
minikube ip
```

### 10. Open the app

Open in your browser:

- `http://mantra-arc.local`
- `http://api-mantra-arc.local/api/health`

## How to verify the cluster

Get pod status:

```bash
minikube kubectl -- -n mantra-arc get pods
```

Get services:

```bash
minikube kubectl -- -n mantra-arc get svc
```

Get logs:

```bash
minikube kubectl -- -n mantra-arc logs deployment/mantra-arc-api
minikube kubectl -- -n mantra-arc logs deployment/mantra-arc-web
```

## Common beginner questions

### Do I still need Docker?

Yes. Kubernetes runs container images, so you still build images with Docker.

### Do I need `docker compose`?

No, not for Kubernetes. You can stop using `docker compose` once you deploy with Kubernetes.

### What if my app does not start?

Check the logs:

```bash
minikube kubectl -- -n mantra-arc logs deployment/mantra-arc-api
```

Then check pod status:

```bash
minikube kubectl -- -n mantra-arc describe pod <pod-name>
```

## File relationships

- `k8s/config-secrets.yaml` provides environment values for `k8s/api-web.yaml`
- `k8s/postgres-redis.yaml` creates services named `db` and `redis`
- `k8s/api-web.yaml` uses those names from inside the cluster
- `k8s/ingress.yaml` exposes the services to your browser

## Notes for production

This guide is for local development.

For production, you would:

- use a real container registry
- set real TLS certificates for ingress
- remove `ALLOW_ALL_ORIGINS=true`
- use proper secrets management
