# Argo CD Sample App

แอปตัวอย่าง HTML ที่ให้ Nginx serve บน Kubernetes พร้อมสำหรับใช้กับ Argo CD (GitOps) หรือรันด้วย `kubectl` โดยตรง

## โครงสร้าง

```
argo-learn/
├── app/
│   └── index.html      # ไฟล์ HTML ต้นฉบับ (อ้างอิง)
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml  # HTML ใน ConfigMap ให้ nginx serve
│   ├── deployment.yaml # Nginx deployment
│   └── service.yaml    # NodePort 30080
└── README.md
```

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
