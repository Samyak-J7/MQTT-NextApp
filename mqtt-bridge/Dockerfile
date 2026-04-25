FROM python:3.12-slim

LABEL org.opencontainers.image.title="mqtt-bridge" \
      org.opencontainers.image.description="MQTT-to-API bridge for MQTT Hub"

# Non-root user for security
RUN useradd -m -u 1000 bridge

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bridge.py .

# Logs directory — will be bind-mounted, owned by bridge user
RUN mkdir -p /app/logs && chown bridge:bridge /app/logs

USER bridge

# Healthy when /tmp/bridge_healthy exists (written by bridge.py on connect)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD test -f /tmp/bridge_healthy

CMD ["python", "-u", "bridge.py"]
