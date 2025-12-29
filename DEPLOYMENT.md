# Deployment Guide

This application is containerized using Docker and Docker Compose.

## Prerequisites

- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**:
  - **Newer versions**: Included as `docker compose`
  - **Older versions**: Installed as `docker-compose`

## Deployment Steps

1.  **Clone the Repository**

    ```bash
    git clone <your-repo-url>
    cd pixelplates-script-generator
    ```

2.  **Configuration**
    Create a `.env` file in the project root:

    ```env
    DEEPSEEK_API_KEY=your_actual_api_key_here
    DATABASE_URL=postgresql://pixeluser:pixelpass@db:5432/pixelplates
    ```

3.  **Start the Application**

    **Option 1: Standard (Try this first)**

    ```bash
    docker compose up -d --build
    ```

    **Option 2: Legacy / Alternate (If Option 1 fails)**
    If you get an error like `unknown flag: --build`, try running these two commands separately:

    1. Build the images first:
       ```bash
       docker compose build
       ```
       _Note: If `docker compose` doesn't work, try `docker-compose` (with a hyphen)._
    2. Start the services:
       ```bash
       docker compose up -d
       ```

4.  **Verify Deployment**
    The application will be running on port **5436**.
    - **Frontend**: http://your-server-ip:5436/
    - **API Docs**: http://your-server-ip:5436/docs

## Maintenance

- **View Logs**:

  ```bash
  docker compose logs -f
  ```

- **Stop the Server**:
  ```bash
  docker compose down
  ```

## Database Migrations

If you need to update the database schema (e.g., adding columns):

```bash
docker compose exec web python migrate_db.py
```

## Troubleshooting

### Error: "Generator not initialized"

This means the application failed to start the AI generator. This is usually due to:

1.  **Missing API Key**: The `DEEPSEEK_API_KEY` was not legally passed to the container.
2.  **Missing Prompt File**: `prompt.txt` is missing from the directory.

**To Fix:**

1.  Check your logs: `docker compose logs web`
2.  Ensure your `.env` file exists and has the key: `DEEPSEEK_API_KEY=...`
3.  Ensure `prompt.txt` exists in the folder.
4.  Rebuild and restart:
    ```bash
    docker compose down
    docker compose up -d --build
    ```
