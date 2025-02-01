#!/bin/bash
set -e

# Audius Discovery Provider / Gunicorn

# run with gunicorn web server in prod for greater performance and robustness
#   "-b :5000" accept requests on port 5000
#   "--access-logfile - --error-logfile" - log to stdout/stderr
#   "src.wsgi:app" - app entry point in format: $(MODULE_NAME):$(VARIABLE_NAME)

# Use specified number of workers if present
if [[ -z "${audius_gunicorn_workers}" ]]; then
  WORKERS=8
else
  WORKERS="${audius_gunicorn_workers}"
fi

# Use specified number of threads if present (only used for "sync" workers)
if [[ -z "${audius_gunicorn_threads}" ]]; then
  THREADS=16
else
  THREADS="${audius_gunicorn_threads}"
fi

# Use specified worker class if present, default to gthread for better concurrency
if [[ -z "${audius_gunicorn_worker_class}" ]]; then
  WORKER_CLASS="gthread"
else
  WORKER_CLASS="${audius_gunicorn_worker_class}"
fi

audius_discprov_loglevel=${audius_discprov_loglevel:-info}

exec gunicorn -b :5000 --error-logfile - src.wsgi:app --log-level=$audius_discprov_loglevel --worker-class=$WORKER_CLASS --workers=$WORKERS --threads=$THREADS --timeout=600 --max-requests=1000 --max-requests-jitter=100
