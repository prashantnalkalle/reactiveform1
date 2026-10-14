# YPS Academy student admissions

Angular frontend in reactiveform1; independent backend in ../yps-backend.

## Local development

Install frontend dependencies with npm ci. Install backend dependencies with npm --prefix ../yps-backend ci.

In separate terminals from this folder:

    npm run server
    npm start

Angular serves at http://localhost:4200 and proxies /api to http://127.0.0.1:3000.

## Deploy the frontend on Vercel

Deploy this folder as the frontend repository. vercel.json declares the Angular framework, npm ci installation, npm run build, dist/reactiveform1 output, and the SPA rewrite.

Set the Vercel environment variable BACKEND_URL to the deployed Render origin, for example https://YOUR-BACKEND.onrender.com. Do not add /api. The build validates the URL and writes a public API configuration into the output; no secret belongs in this setting. Redeploy if the backend URL changes.

The frontend can build before the backend is deployed. When BACKEND_URL is missing, the build logs a warning and uses /api. On Vercel, saving admissions will not work until BACKEND_URL is configured and the frontend is redeployed; the local development proxy is not available there.

If a Vercel build fails, inspect the final error in the build log. npm deprecation warnings do not by themselves fail the build. In Vercel Project Settings, add BACKEND_URL for Production (and Preview if needed), then create a new deployment to apply it.

## Deploy the backend on Render

See ../yps-backend/README.md and its render.yaml. The backend needs the exact Vercel origin in FRONTEND_URL and a persistent disk for saved admissions and files.

Deploy the backend first, then set BACKEND_URL in Vercel. Once Vercel supplies the frontend URL, set FRONTEND_URL in Render and redeploy the backend.

## Features and checks

Cash hides payment methods; online and cheque show conditional options. Photos accept JPG, PNG and WEBP; payment proofs also accept PDF, up to 2 MB each. After saving, the generated receipt can be printed or saved as PDF.

Subject rates and academic options are sample values configured in the frontend and backend; keep them consistent.

Build: npm run build
Frontend tests: npm test -- --watch=false --browsers=ChromeHeadless
Backend tests: npm --prefix ../yps-backend test
