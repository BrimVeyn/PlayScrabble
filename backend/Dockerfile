# Build Stage: Use a lightweight Debian image with Zig installed
FROM debian:stable-slim

WORKDIR /app

# Install dependencies for Zig (replace with your system's package manager or pre-built Zig binaries)
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Download Zig from the official site (replace with your installed version)
RUN curl -fsSL https://ziglang.org/download/ | bash -s -- -d /usr/local/bin

# Copy your source code into the build container
COPY . .

# Build the backend using Zig (adjust based on your build configuration)
RUN zig build -Doptimize=ReleaseFast

# Runtime Stage: Use a minimal Debian image
FROM debian:stable-slim

WORKDIR /app

# Copy the built Zig binary from the build stage
COPY --from=build /app/zig-out/bin/backend /app/backend

# Expose the backend port
EXPOSE 8080

# Run the backend binary
CMD ["/app/backend"]

