# Kubernetes YAML Explained: `k8s/api-web.yaml`

This page explains every section and key in `k8s/api-web.yaml`, line by line, for absolute beginners.

## What this file contains

The file defines:

1. The `API` deployment and service
2. The `Web` deployment and service

Each deployment tells Kubernetes how to run a pod for the application.

---

## API deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mantra-arc-api
  namespace: mantra-arc
  labels:
    app: mantra-arc-api
```

- `apiVersion: apps/v1` tells Kubernetes which API version to use for deployments.
- `kind: Deployment` means this document creates a deployment object.
- `metadata` is information about the object.
- `name: mantra-arc-api` is the unique name of the deployment.
- `namespace: mantra-arc` keeps this deployment inside the `mantra-arc` namespace.
- `labels` are simple key/value tags used for selecting this deployment.

```yaml
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mantra-arc-api
```

- `spec` contains the deployment settings.
- `replicas: 1` means run one copy (one pod) of this application.
- `selector.matchLabels` tells Kubernetes how to identify pods that belong to this deployment.
- The pod must have `app: mantra-arc-api` to match this deployment.

```yaml
  template:
    metadata:
      labels:
        app: mantra-arc-api
```

- `template` describes the pod that will be created.
- `metadata.labels` assigns the same label to the pod so the deployment can manage it.

```yaml
    spec:
      initContainers:
        - name: wait-for-db
          image: postgres:16-alpine
          command:
            - sh
            - -c
            - |
              until pg_isready -h db -p 5432; do
                echo "Waiting for Postgres..."
                sleep 2
              done
```

- `spec.initContainers` runs a temporary helper container before the main app starts.
- `name: wait-for-db` is the name of the init container.
- `image: postgres:16-alpine` uses the Postgres image to run the `pg_isready` command.
- `command:` defines what the init container runs.
- The shell loop waits until the database at host `db` port `5432` is ready.
- This prevents the API from starting too early.

```yaml
      containers:
        - name: api
          image: mantra-arc-api:local
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3012
```

- `containers` lists the application containers in the pod.
- `name: api` is the container name.
- `image: mantra-arc-api:local` is the Docker image that Kubernetes will run.
- `imagePullPolicy: IfNotPresent` means Kubernetes will reuse the image if it already exists locally.
- `ports.containerPort: 3012` tells Kubernetes the container listens on port `3012`.

```yaml
          envFrom:
            - configMapRef:
                name: mantra-arc-config
            - secretRef:
                name: mantra-arc-secrets
```

- `envFrom` imports environment variables from Kubernetes objects.
- `configMapRef` loads values from the `mantra-arc-config` ConfigMap.
- `secretRef` loads secret values from the `mantra-arc-secrets` Secret.

```yaml
          env:
            - name: NODE_ENV
              value: production
            - name: ALLOW_ALL_ORIGINS
              value: "true"
            - name: API_PORT
              value: "3012"
```

- `env` sets additional environment variables directly.
- `NODE_ENV=production` tells the app it is running in production mode.
- `ALLOW_ALL_ORIGINS=true` is a local testing shortcut to disable strict CORS checks.
- `API_PORT=3012` tells the NestJS app which port to listen on.

```yaml
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3012
            initialDelaySeconds: 10
            periodSeconds: 5
```

- `readinessProbe` checks whether the app is ready to receive traffic.
- `httpGet.path: /api/health` requests the health endpoint.
- `port: 3012` uses the app port.
- `initialDelaySeconds: 10` waits 10 seconds before the first check.
- `periodSeconds: 5` checks every 5 seconds.

```yaml
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3012
            initialDelaySeconds: 20
            periodSeconds: 10
```

- `livenessProbe` ensures the container is still alive.
- If this check fails repeatedly, Kubernetes restarts the container.
- It also checks `/api/health` on port `3012`.
- It starts later than readiness to avoid false restarts.

---

## API service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mantra-arc-api
  namespace: mantra-arc
spec:
  selector:
    app: mantra-arc-api
  ports:
    - name: http
      port: 3012
      targetPort: 3012
  type: ClusterIP
```

- `apiVersion: v1` is used for services.
- `kind: Service` exposes the deployment inside the cluster.
- `name: mantra-arc-api` is the service name.
- `selector` matches pods labeled `app: mantra-arc-api`.
- `port: 3012` is the service port.
- `targetPort: 3012` forwards traffic to the container port.
- `type: ClusterIP` makes the service reachable only inside the cluster.

---

## Web deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mantra-arc-web
  namespace: mantra-arc
  labels:
    app: mantra-arc-web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mantra-arc-web
  template:
    metadata:
      labels:
        app: mantra-arc-web
```

- This section is the same pattern as the API deployment.
- It creates one web pod labeled `app: mantra-arc-web`.

```yaml
    spec:
      containers:
        - name: web
          image: mantra-arc-web:local
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
```

- `name: web` is the frontend container.
- `image: mantra-arc-web:local` is the built web image.
- `containerPort: 3000` exposes port `3000` inside the pod.

```yaml
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "3000"
            - name: HOSTNAME
              value: 0.0.0.0
```

- These environment variables configure the Next.js app.
- `HOSTNAME=0.0.0.0` makes the container listen on all network interfaces.

```yaml
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
```

- The frontend readiness probe checks the homepage `/`.
- It confirms the web app is ready before traffic is sent.

```yaml
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 20
            periodSeconds: 10
```

- The frontend liveness probe restarts the container if it becomes unresponsive.

---

## Web service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mantra-arc-web
  namespace: mantra-arc
spec:
  selector:
    app: mantra-arc-web
  ports:
    - name: http
      port: 3000
      targetPort: 3000
  type: ClusterIP
```

- This service exposes the web deployment inside Kubernetes.
- `selector` matches the web pod.
- Requests to service port `3000` are routed to the pod's `3000` port.

---

## Why `Service` objects matter

The web and API pods are not reachable directly by IP alone.

- A `Service` gives each app a stable network name.
- Inside the cluster, other pods can use `mantra-arc-api:3012`.
- The `ingress` object can also route to the service.

## Summary: key concepts

- `Deployment` = how many copies of a pod to run
- `Service` = how to reach the pod inside the cluster
- `ClusterIP` = cluster-internal access only
- `initContainer` = run a helper container before the app starts
- `readinessProbe` = is the app ready for traffic?
- `livenessProbe` = is the app still healthy?

## How this file fits into the cluster

- `api-web.yaml` runs your backend and frontend.
- `postgres-redis.yaml` runs the database and cache.
- `config-secrets.yaml` provides environment values.
- `ingress.yaml` exposes the apps to your browser.

If you want, I can also create a second page that explains every line in `k8s/postgres-redis.yaml` and `k8s/ingress.yaml` the same way.