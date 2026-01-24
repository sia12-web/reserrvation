# Zero-Cost Deployment Guide (Render Free Tier)

This configuration is designed to run your entire application (Frontend + Backend + Database + Cache) on Render's **Free Tier**.

## Architecture Changes
To ensure this fits within the free tier and is easy to manage:
1.  **Monolithic Architecture**: We are serving the React Frontend *directly* from the Node.js Backend. This means you only need to run **one** web service instead of two.
2.  **Free Tier Services**:
    -   **Web Service**: Runs your Node.js app (and serves the frontend). Spins down after inactivity.
    -   **PostgreSQL**: Free managed database.
    -   **Redis**: Free managed Redis instance (needed for queues/locks).

## How to Deploy

1.  **Push Changes**: Commit and push the following file changes to your GitHub repository:
    -   `render.yaml`
    -   `package.json`
    -   `src/app.ts`
    -   `frontend/src/api/httpClient.ts`

2.  **Render Dashboard**:
    -   Go to [dashboard.render.com](https://dashboard.render.com/).
    -   Click **New +** -> **Blueprint**.
    -   Connect your GitHub repository.
    -   Render will detect the `render.yaml` file.

3.  **Configure Secrets**:
    Render will ask for environment variables or you can set them in the "Environment" tab of the created service. You **MUST** provide values for:
    -   `JWT_SECRET`: Any random long string (e.g. `my-super-secret-jwt-key-123`).
    -   `ADMIN_PIN`: A pin code for the admin panel (e.g. `1234`).
    -   `STRIPE_SECRET_KEY`: Use a dummy value if you don't have one (e.g. `sk_test_dummy`).
    -   `STRIPE_WEBHOOK_SECRET`: Use a dummy value (e.g. `whsec_dummy`).

4.  **Finalize**:
    -   Click **Apply**.
    -   Wait for the build to complete (it will build both frontend and backend).
    -   Once green, click the URL provided by Render.

## Important Note
Since this is on the Free Tier:
-   The server will **sleep** after 15 minutes of inactivity. The first request after sleep might take 30-50 seconds to load. warn the owner about this!
