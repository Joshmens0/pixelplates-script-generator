# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (needed for some python packages like psycopg2)
# gcc and libpq-dev are often needed for postgres adapters
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the file with the requirements to the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create the scripts directory
RUN mkdir -p scripts

# Expose the port the app runs on
EXPOSE 5436

# Define environment variable to ensure output is flushed
ENV PYTHONUNBUFFERED=1

# Run server.py when the container launches
# Access host 0.0.0.0 is required for Docker containers to be accessible externally
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5436"]
