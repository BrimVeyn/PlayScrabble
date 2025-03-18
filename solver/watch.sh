#!/bin/bash
set -e

echo "Starting watchexec..."
# Define a function to stop the backend if it's running
stop_backend() {
  echo "Stopping existing solver process..."
  # You can replace this with the actual command to kill the backend process, 
  # for example using `pkill` or manually killing by the process name or PID.
  pkill -f "./zig-out/bin/solver" || true
  rm -rf .zig-cache && echo "Zig cache cleaned"
}

# Start watchexec to watch for changes and rebuild
watchexec -r zig build -- bash -c "stop_backend && ./zig-out/bin/solver"
