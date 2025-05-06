FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY --chown=appuser:appuser . .

# Create health check file
RUN echo 'from http.server import HTTPServer, BaseHTTPRequestHandler\n\
class HealthCheckHandler(BaseHTTPRequestHandler):\n\
    def do_GET(self):\n\
        if self.path == "/health":\n\
            self.send_response(200)\n\
            self.send_header("Content-type", "text/plain")\n\
            self.end_headers()\n\
            self.wfile.write(b"OK")\n\
\n\
def run_health_server():\n\
    server = HTTPServer(("", 3000), HealthCheckHandler)\n\
    server.serve_forever()\n\
\n\
if __name__ == "__main__":\n\
    run_health_server()' > health.py

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV AWS_DEFAULT_REGION=us-east-1
ENV AWS_ACCESS_KEY_ID=dummy-key
ENV AWS_SECRET_ACCESS_KEY=dummy-secret

# Switch to non-root user
USER appuser

# Command to run both health check and main service
CMD ["sh", "-c", "python health.py & python ai-service-lambda.py"] 