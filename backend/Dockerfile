FROM ziglang/zig:latest AS build

WORKDIR /app

# Copy source code
COPY . .

# Build the backend (assumes `build.zig`)
RUN zig build -Drelease-fast

# Create a minimal runtime container
FROM debian:stable-slim

WORKDIR /app

# Copy built Zig binary from the build stage
COPY --from=build /app/zig-out/bin/backend /app/backend

# Expose the backend port
EXPOSE 8080

# Run the Zig backend
CMD ["/app/backend"]
