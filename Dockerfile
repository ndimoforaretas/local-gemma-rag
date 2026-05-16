FROM python:3.11-slim

WORKDIR /app

# System dependencies for FAISS and PDF processing
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ backend/
COPY frontend/dist/ frontend/dist/
COPY dbos-config.yaml .

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

EXPOSE 8000

CMD ["python", "-m", "backend.main"]
