# Kubernetes YAML Explained: Config, Secrets, Ingress, Kind, Namespace, and Database

This page explains the remaining Kubernetes files in the `k8s/` folder line by line.

## `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mantra-arc
```

- `apiVersion: v1` means this is a core Kubernetes object.
- `kind: Namespace` creates a namespace, which is a logical workspace inside the cluster.
- `metadata.name: mantra-arc` sets the namespace name.

Why it matters:

- It isolates your resources from other clusters or apps.
- It makes commands easier: `kubectl -n mantra-arc ...`

---

## `k8s/config-secrets.yaml`

### ConfigMap section

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mantra-arc-config
  namespace: mantra-arc
data:
  API_PORT: "3012"
  WEB_URL: "http://mantra-arc.local"
  NEXT_PUBLIC_API_URL: "http://api-mantra-arc.local"
  DATABASE_URL: "postgresql://dev:dev@db:5432/mantra_arc"
  REDIS_URL: "redis://redis:6379"
  SMTP_HOST: "smtp.gmail.com"
  SMTP_PORT: "465"
  SMTP_USER: "user@example.com"
  SMTP_FROM: "no-reply@example.com"
```

- `kind: ConfigMap` stores non-sensitive configuration values.
- `metadata.name` gives it a name used by deployments.
- `namespace: mantra-arc` keeps it inside the cluster namespace.
- `data:` contains key/value pairs.

Meaning of the keys:

- `API_PORT`: the port the API listens on.
- `WEB_URL`: the public web app URL.
- `NEXT_PUBLIC_API_URL`: the API URL exposed to the browser.
- `DATABASE_URL`: the database connection string used by the API.
- `REDIS_URL`: Redis connection string.
- `SMTP_*`: SMTP settings for sending email.

### Secret section

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mantra-arc-secrets
  namespace: mantra-arc
type: Opaque
stringData:
  JWT_SECRET: "change-me-in-local"
  SMTP_PASS: "replace-with-your-smtp-pass"
```

- `kind: Secret` stores sensitive values.
- `type: Opaque` is the basic secret type.
- `stringData:` allows simple plaintext values.

Meaning of the keys:

- `JWT_SECRET`: secret used to sign authentication tokens.
- `SMTP_PASS`: email password used by the app.

Why use ConfigMap and Secret?

- ConfigMap is for common settings that are safe to inspect.
- Secret is for passwords and keys.
- Both are injected into pods as environment variables.

---

## `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mantra-arc-ingress
  namespace: mantra-arc
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: mantra-arc.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mantra-arc-web
                port:
                  number: 3000
    - host: api-mantra-arc.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mantra-arc-api
                port:
                  number: 3012
```

- `apiVersion: networking.k8s.io/v1` is the API version for ingress.
- `kind: Ingress` creates a routing object.
- `metadata.name` identifies the ingress.
- `annotations` tell Kubernetes which ingress controller should handle this rule.
  - `kubernetes.io/ingress.class: nginx` means use the NGINX ingress controller.

Inside `spec.rules`:

- `host: mantra-arc.local` is the hostname for the web app.
- `path: /` means all requests under `/` go to the backend service.
- `backend.service.name: mantra-arc-web` points to the web service.
- `backend.service.port.number: 3000` uses the web service port.

The second rule:

- `host: api-mantra-arc.local` is the hostname for the API.
- The backend points to `mantra-arc-api` on port `3012`.

Why it matters:

- Ingress lets you use friendly hostnames instead of raw IPs.
- It sends browser traffic to the right service.
- The host header in the browser request must match the rule.

---

## `k8s/kind-cluster.yaml`

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 80
        hostPort: 8080
        protocol: TCP
      - containerPort: 443
        hostPort: 8443
        protocol: TCP
```

- `kind: Cluster` defines a local Kind cluster configuration.
- `apiVersion: kind.x-k8s.io/v1alpha4` is Kind's config version.
- `nodes:` defines the cluster nodes.
- `role: control-plane` means this node is the main Kubernetes node.

`extraPortMappings`:

- Maps host port `8080` to container port `80`.
- Maps host port `8443` to container port `443`.

Why it matters:

- This allows you to access services in Kind using host ports.
- It is useful when you want to expose HTTP/HTTPS on your machine.

---

## `k8s/postgres-redis.yaml`

This file contains the database and cache resources.

### Postgres deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mantra-arc-db
  namespace: mantra-arc
  labels:
    app: mantra-arc-db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mantra-arc-db
  template:
    metadata:
      labels:
        app: mantra-arc-db
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          imagePullPolicy: IfNotPresent
          env:
            - name: POSTGRES_USER
              value: dev
            - name: POSTGRES_PASSWORD
              value: dev
            - name: POSTGRES_DB
              value: mantra_arc
          ports:
            - containerPort: 5432
          volumeMounts:
            - mountPath: /var/lib/postgresql/data
              name: postgres-data
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - dev
                - -d
                - mantra_arc
            initialDelaySeconds: 10
            periodSeconds: 5
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-data
```

- `Deployment` runs the Postgres pod.
- `image: postgres:16-alpine` uses a small Postgres image.
- `env:` sets database user, password, and name.
- `containerPort: 5432` is the standard Postgres port.
- `volumeMounts` stores database data on persistent storage.
- `readinessProbe` checks Postgres is ready before other pods use it.
- `volumes.persistentVolumeClaim.claimName: postgres-data` uses a PVC for storage.

### Postgres PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: mantra-arc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

- `PersistentVolumeClaim` requests storage from the cluster.
- `accessModes: ReadWriteOnce` means one pod can write to it.
- `storage: 1Gi` requests 1 gigabyte of disk space.

Why it matters:

- Without a PVC, database data would be lost when the pod restarts.
- The PVC keeps data even if the pod is recreated.

### Postgres service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: mantra-arc
spec:
  selector:
    app: mantra-arc-db
  ports:
    - port: 5432
      targetPort: 5432
      protocol: TCP
  type: ClusterIP
```

- `Service` exposes the database inside the cluster.
- `name: db` is used by other pods to connect.
- A pod can reach the database at `db:5432`.

---

### Redis deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mantra-arc-redis
  namespace: mantra-arc
  labels:
    app: mantra-arc-redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mantra-arc-redis
  template:
    metadata:
      labels:
        app: mantra-arc-redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 6379
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - mountPath: /data
              name: redis-data
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: redis-data
```

- `image: redis:7-alpine` runs Redis.
- `containerPort: 6379` is the Redis port.
- `readinessProbe` verifies Redis is ready.
- `volumeMounts` stores Redis data persistently.

### Redis PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  namespace: mantra-arc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 500Mi
```

- Requests 500Mi for Redis storage.

### Redis service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: mantra-arc
spec:
  selector:
    app: mantra-arc-redis
  ports:
    - port: 6379
      targetPort: 6379
      protocol: TCP
  type: ClusterIP
```

- `service.name: redis` is the cluster address for Redis.
- Other pods can connect to `redis:6379`.

---

## How these files work together

- `namespace.yaml` creates the workspace.
- `config-secrets.yaml` provides app settings and sensitive values.
- `postgres-redis.yaml` runs the database and cache.
- `api-web.yaml` runs the backend and frontend.
- `ingress.yaml` makes the apps available through browser hostnames.
- `kind-cluster.yaml` is only used if you create a Kind cluster.

## Key beginner takeaways

- A `Deployment` defines how to run a pod.
- A `Service` gives that pod a network name.
- A `ConfigMap` stores normal settings.
- A `Secret` stores private values.
- An `Ingress` maps hostnames to services.
- A `Namespace` isolates resources.
- A `PersistentVolumeClaim` keeps data safe across pod restarts.
