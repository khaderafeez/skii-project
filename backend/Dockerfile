FROM python:3.11-slim

# System dependencies for Bleak (BlueZ and DBus bridging)
RUN apt-get update && apt-get install -y \
    dbus \
    libglib2.0-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Initialize telemetry server
CMD ["python", "main.py"]