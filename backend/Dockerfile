FROM python:3.12-slim

WORKDIR /app

# Install ffmpeg for pydub audio splitting
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway sets PORT dynamically; fall back to 8000 for local dev
ENV PORT=8000
EXPOSE ${PORT}

CMD ["/bin/sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]

