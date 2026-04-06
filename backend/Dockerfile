# --- Build Stage ---
FROM python:3.11-slim AS builder

# Provision system compilers required for native Python extensions
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libglib2.0-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Isolate application dependencies within a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .

# Fetch pre-compiled ARM binaries via piwheels to bypass QEMU emulation compilation
RUN pip install --no-cache-dir --extra-index-url https://www.piwheels.org/simple -r requirements.txt

# --- Runtime Stage ---
FROM python:3.11-slim

# Provision minimal runtime libraries required for BlueZ/DBus IPC and NumPy acceleration
RUN apt-get update && apt-get install -y \
    dbus \
    libglib2.0-0t64 \
    libopenblas0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Transfer compiled environment from build stage to minimize final image footprint
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

# Initialize telemetry service
CMD ["python", "main.py"]