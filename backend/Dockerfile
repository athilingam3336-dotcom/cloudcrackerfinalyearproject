# Use a stable python base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Set working directory inside the container
WORKDIR /workspace

# Install system dependencies (curl for container health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt first to leverage Docker build cache
COPY requirements.txt /workspace/

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY . /workspace/

# Expose FastAPI default port
EXPOSE 8000

# Start Uvicorn web server dynamically on Render PORT env or default to 8000
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
