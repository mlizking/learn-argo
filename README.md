# Argo CD Sample App

แอปตัวอย่าง HTML ที่ให้ Nginx serve บน Kubernetes พร้อมสำหรับใช้กับ Argo CD (GitOps) หรือรันด้วย `kubectl` โดยตรง มี **Docker build** (tag = commit hash), push ไป Docker Hub และ **CI** จะอัปเดต image tag ใน deployment แล้ว commit กลับ

## โครงสร้าง

```
argo-learn/
├── app/
│   └── index.html        # ต้นฉบับ HTML
├── k8s/
│   ├── namespace.yaml
│   ├── deployment.yaml  # ใช้ image จาก Docker Hub (tag อัปเดตโดย CI)
│   └── service.yaml
├── Dockerfile            # Nginx + copy app/
├── .github/workflows/
│   └── ci.yml            # Validate + Build image, push, update deployment
├── Taskfile.yml
└── README.md
```

## Build Docker (Local)

```bash
docker build -t your-dockerhub-username/argo-learn:local .
```

หรือใช้ Task: `task build` (ใน Taskfile ใช้คำสั่ง docker build)

## CI

- **ทุก push/PR:** ตรวจสอบ manifest ใน `k8s/` ด้วย kubeconform
- **เมื่อ push ขึ้น main/master** และมีเปลี่ยนใน `app/` หรือ `Dockerfile`:
  1. Build image แล้วแท็กด้วย **commit hash** (`github.sha`)
  2. Push ไป **Docker Hub** → `DOCKERHUB_USERNAME/argo-learn:<sha>`
  3. อัปเดต `k8s/deployment.yaml` ให้ชี้ไปที่ image tag นี้ แล้ว **commit + push กลับ**

ดังนั้นหลัง push โค้ดแอปแล้ว รอ CI ทำงานเสร็จ deployment ใน repo จะถูกอัปเดตให้ใช้ image เวอร์ชันล่าสุดโดยอัตโนมัติ (Argo CD จะ sync ตาม)

### ตั้งค่า Docker Hub (Secrets)

ใน GitHub repo → **Settings → Secrets and variables → Actions** เพิ่ม:

| Secret | คำอธิบาย |
|--------|----------|
| `DOCKERHUB_USERNAME` | ชื่อผู้ใช้ Docker Hub |
| `DOCKERHUB_TOKEN` | Access Token จาก Docker Hub (ไม่ใช้รหัสผ่านโดยตรง) |

สร้าง token ได้ที่ [Docker Hub → Account Settings → Security → New Access Token](https://hub.docker.com/settings/security).

### Deployment กับ image

ใน repo ใช้ placeholder เป็น `your-dockerhub-username/argo-learn:latest` — ครั้งแรกที่รัน CI จะถูกแทนที่ด้วย `DOCKERHUB_USERNAME/argo-learn:<commit-sha>` และ commit กลับ  
ถ้ารัน `kubectl apply -f k8s/` เองก่อนมี CI ต้องแก้ `k8s/deployment.yaml` ให้ใช้ image ที่มีอยู่จริง (หรือรอให้ CI push image แล้วค่อย apply)

### รัน CI แบบ Local

| วิธี | วิธีใช้ |
|------|---------|
| **Task** | `task ci` — validate manifest (ต้องมี kubeconform หรือ kubectl) |
| **act** | รัน workflow ทั้งก้อนบนเครื่อง (ต้องมี Docker): `act push` |

---

## รันด้วย kubectl (Docker Desktop Kubernetes)

1. สร้าง namespace และ deploy:

```bash
kubectl apply -f k8s/
```

2. รอจน Pod พร้อม:

```bash
kubectl get pods -n sample-app -w
```

3. เปิดในเบราว์เซอร์:

- **http://localhost:30080**

หรือใช้ port-forward แทน NodePort:

```bash
kubectl port-forward -n sample-app svc/sample-app 8080:80
# เปิด http://localhost:8080
```

## Start Argo CD บน Local Cluster

ใช้ได้กับ Kubernetes บนเครื่อง เช่น **Docker Desktop Kubernetes**, **minikube**, **kind**

1. ติดตั้ง Argo CD (แบบ **server-side apply**):

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml --server-side
```

ถ้ามี conflict เรื่อง field ownership ให้ใส่ `--force-conflicts`:

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml --server-side --force-conflicts
```

2. รอจน Pod ใน namespace `argocd` พร้อม (โดยเฉพาะ `argocd-server`):

```bash
kubectl get pods -n argocd -w
```

3. เปิด Argo CD UI ด้วย port-forward:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

เปิดเบราว์เซอร์ที่ **https://localhost:8080** (ยอมรับ certificate warning ได้)

4. **ดึง password จาก Secret** (ใช้ครั้งแรกเพื่อ login เป็น `admin`):

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

หรือพิมพ์ password ออกมาในบรรทัดเดียว (Windows PowerShell):

```powershell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
```

- **Username**: `admin`
- **Password**: ค่าที่ได้จากคำสั่งด้านบน (แนะนำให้เปลี่ยนหลัง login ครั้งแรก)

### ลบ Argo CD

ลบ resources ที่ติดตั้งจาก manifest เดิม:

```bash
kubectl delete -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

จากนั้นลบ namespace:

```bash
kubectl delete namespace argocd
```

ถ้า namespace ค้างในสถานะ `Terminating` (เพราะ finalizer) ให้ลบ finalizer ออก:

```bash
kubectl get namespace argocd -o json | jq '.spec.finalizers = []' | kubectl replace --raw "/api/v1/namespaces/argocd/finalize" -f -
```

---

## ใช้กับ Argo CD

1. Push โปรเจกต์นี้ขึ้น Git repo (GitHub / GitLab ฯลฯ)
2. ใน Argo CD สร้าง Application:
   - **Project**: default (หรือสร้างใหม่)
   - **Application name**: sample-app
   - **Sync policy**: Manual หรือ Auto
   - **Repository URL**: URL ของ Git repo นี้
   - **Path**: `k8s` (โฟลเดอร์ที่มี manifest)
   - **Cluster**: in-cluster หรือ cluster ในเครื่อง
3. กด Sync — Argo CD จะ apply manifests ใน `k8s/` เข้า cluster

## ลบออกจาก cluster

```bash
kubectl delete -f k8s/
```
