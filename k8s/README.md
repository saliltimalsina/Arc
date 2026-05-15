# Local Kubernetes deployment for Mantra Arc

This folder contains Kubernetes manifests and local cluster setup guidance for the `Arc` monorepo.

## Goals

- Run the backend and frontend in a local Kubernetes cluster
- Keep the same database/redis stack used by the Docker Compose setup
- Provide both a basic port-forward workflow and a more advanced ingress-based workflow

## Prerequisites

- Docker
- `kubectl`
- `kind` or `minikube`
- Optional: `helm` for ingress installation

## Recommended local cluster options

### Option 1: kind (basic)

```bash
kind create cluster --name mantra-arc --config k8s/kind-cluster.yaml
```

Then load local images:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://api-mantra-arc.local -t mantra-arc-web:local ./apps/web
docker build -t mantra-arc-api:local ./apps/api
kind load docker-image mantra-arc-web:local
kind load docker-image mantra-arc-api:local
```

Apply the manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config-secrets.yaml
kubectl apply -f k8s/postgres-redis.yaml
kubectl apply -f k8s/api-web.yaml
kubectl apply -f k8s/ingress.yaml
```

Use port-forward to access the frontend and API if you do not install an ingress controller:

```bash
kubectl -n mantra-arc port-forward svc/mantra-arc-web 3003:3000
kubectl -n mantra-arc port-forward svc/mantra-arc-api 3014:3012
```

Then open:

- `http://localhost:3003` for the frontend
- `http://localhost:3014/api/health` for the API

### Option 2: minikube (recommended for ingress)

```bash
minikube start --driver=docker
minikube addons enable ingress
```

Build images inside minikube:

```bash
eval "$(minikube docker-env)"
docker build --build-arg NEXT_PUBLIC_API_URL=http://api-mantra-arc.local -t mantra-arc-web:local ./apps/web
docker build -t mantra-arc-api:local ./apps/api
```

Apply the manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config-secrets.yaml
kubectl apply -f k8s/postgres-redis.yaml
kubectl apply -f k8s/api-web.yaml
kubectl apply -f k8s/ingress.yaml
```

Add hosts entries on your workstation:

```text
127.0.0.1 mantra-arc.local
127.0.0.1 api-mantra-arc.local
```

Then open:

- `http://mantra-arc.local`
- `http://api-mantra-arc.local/api/health`

## Run and verify locally

If you do not have a standalone `kubectl`, use Minikube's embedded kubectl:

```bash
minikube kubectl -- get namespaces
minikube kubectl -- -n mantra-arc get pods
minikube kubectl -- -n mantra-arc get svc
```

To check the application logs:

```bash
minikube kubectl -- -n mantra-arc logs deploy/mantra-arc-api
minikube kubectl -- -n mantra-arc logs deploy/mantra-arc-web
```

If you used port-forward instead of ingress, verify the services like this:

```bash
minikube kubectl -- -n mantra-arc port-forward svc/mantra-arc-web 3003:3000
minikube kubectl -- -n mantra-arc port-forward svc/mantra-arc-api 3014:3012
```

Then browse:

- `http://localhost:3003`
- `http://localhost:3014/api/health`

If the frontend is running but API requests fail, inspect these URLs:

- `http://api-mantra-arc.local/api/health`
- `http://api-mantra-arc.local/api/auth/signup`

## Environment handling

The API deployment uses `ALLOW_ALL_ORIGINS=true` for local testing, so CORS is not blocked inside the cluster.

For a production-like setup, remove `ALLOW_ALL_ORIGINS` and set `WEB_URL=https://mantra-arc.local` plus `NEXT_PUBLIC_API_URL=https://api-mantra-arc.local`.

## Advanced notes

- If you want HTTPS locally, add a local TLS secret and update `k8s/ingress.yaml`.
- For production, replace the `mantra-arc.local` hosts with your real domain and update the ingress TLS settings.
- If you use a remote registry, change the `image:` values in `k8s/api-web.yaml`.

## Beginner-friendly guide

If you are new to Kubernetes, read `k8s/kubernetes-guide.md` for a file-by-file explanation and step-by-step commands.

For a line-by-line explanation of `k8s/api-web.yaml`, read `k8s/api-web-explained.md`.

For a line-by-line explanation of the remaining manifest files, read `k8s/other-manifests-explained.md`.
