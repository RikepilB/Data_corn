# Despliegue de Data Corn

Todo corre en el proyecto **nuevo** de Google Cloud con el crédito de $300. Reemplacen `<PROJECT_ID>` y `<BUCKET>` por los valores de ese proyecto.

## 1. Una sola vez

```bash
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  earthengine.googleapis.com storage.googleapis.com secretmanager.googleapis.com

# Cuenta de servicio de la API (permisos mínimos)
gcloud iam service-accounts create datacorn-api --display-name "Data Corn API"
SA=datacorn-api@<PROJECT_ID>.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding <PROJECT_ID> --member serviceAccount:$SA --role roles/earthengine.viewer
gcloud projects add-iam-policy-binding <PROJECT_ID> --member serviceAccount:$SA --role roles/serviceusage.serviceUsageConsumer

# Caché y lotes de ejemplo
gcloud storage buckets create gs://<BUCKET> --location us-central1
gcloud storage buckets add-iam-policy-binding gs://<BUCKET> --member serviceAccount:$SA --role roles/storage.objectAdmin

# Clave de NASS QuickStats
printf "%s" "<NASS_API_KEY>" | gcloud secrets create nass-api-key --data-file=-
gcloud secrets add-iam-policy-binding nass-api-key --member serviceAccount:$SA --role roles/secretmanager.secretAccessor
```

Además hay que:
- registrar el proyecto en Earth Engine para uso no comercial: https://code.earthengine.google.com/register
- crear una alerta de presupuesto en Facturación → Presupuestos y alertas, por ejemplo con avisos al 50 %, 90 % y 100 % de $300.

## 2. API en Cloud Run

```bash
gcloud run deploy datacorn-api --source apps/api --region us-central1 \
  --service-account $SA --min-instances 0 --max-instances 5 --memory 1Gi --timeout 120 \
  --allow-unauthenticated \
  --set-env-vars DATACORN_GCP_PROJECT=<PROJECT_ID>,DATACORN_EARTH_ENGINE_ENABLED=true,DATACORN_CACHE_BACKEND=gcs,DATACORN_CACHE_BUCKET=<BUCKET> \
  --set-secrets DATACORN_NASS_API_KEY=nass-api-key:latest
```

## 3. Web en Firebase Hosting

```bash
cd apps/web && npm ci && npm run build && cd ../..
firebase deploy --only hosting --project <PROJECT_ID>
```

`firebase.json`, en la raíz, reenvía `/api/**` al servicio `datacorn-api`. La web y la API quedan en el mismo dominio.
