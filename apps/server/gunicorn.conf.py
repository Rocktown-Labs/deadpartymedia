"""
Gunicorn configuration file for Dead Party Media Django backend.
This file is used when running gunicorn with: gunicorn -c gunicorn.conf.py config.wsgi:application
"""

import multiprocessing
import os

# Server socket
# Bind to 0.0.0.0 for container deployment (127.0.0.1 for local dev)
bind = os.environ.get("GUNICORN_BIND", "0.0.0.0:8000")
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "deadpartymedia"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn-deadpartymedia.pid"
umask = 0
user = None  # Not used in Lambda (runs as Lambda execution role)
group = None  # Not used in Lambda (runs as Lambda execution role)
tmp_upload_dir = None

# SSL (if needed in future)
# keyfile = None
# certfile = None

# Graceful timeout for reload
graceful_timeout = 30

# Preload app for better performance
preload_app = True

# Worker timeout
worker_tmp_dir = "/dev/shm"  # Use shared memory for worker temp files (faster)

# Max requests per worker (helps prevent memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Worker class tuning
worker_class = "sync"  # Use sync workers for Django (can switch to gevent/eventlet if needed)

def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Starting Dead Party Media Gunicorn server")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("Reloading Dead Party Media Gunicorn server")

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("Dead Party Media Gunicorn server is ready. Spawning workers")

def worker_int(worker):
    """Called just after a worker has been interrupted."""
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    worker.log.info("Worker initialized (pid: %s)", worker.pid)

def worker_abort(worker):
    """Called when a worker times out."""
    worker.log.warning("Worker timeout (pid: %s)", worker.pid)

def on_exit(server):
    """Called just before exiting Gunicorn."""
    server.log.info("Shutting down Dead Party Media Gunicorn server")

