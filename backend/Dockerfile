FROM debian:stable-slim AS zig-master
WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget \
	curl \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://ziglang.org/builds/zig-linux-x86_64-0.14.0-dev.3259+0779e847f.tar.xz && \
    tar -xpf zig-linux-x86_64-0* && \
    rm -rf zig-linux-x86_64-0.14.0-dev.3259+0779e847f.tar.xz && \
    mv zig-linux-x86_64-0* /usr/local/zig

RUN wget https://github.com/watchexec/watchexec/releases/download/v2.3.0/watchexec-2.3.0-x86_64-unknown-linux-gnu.tar.xz && \
    tar -xpf watchexec-2.3.0* && \
    rm -rf watchexec-2.3.0-x86_64-unknown-linux-gnu.tar.xz && \
    mv watchexec-2.3.0-x86_64-unknown-linux-gnu/watchexec /usr/local/bin/watchexec

ENV PATH="/usr/local/zig:${PATH}"

COPY . .

RUN zig build -Doptimize=ReleaseFast

FROM zig-master AS prod
WORKDIR /app

COPY --from=zig-master /app/zig-out/bin/backend /app/backend

EXPOSE 8080

CMD ["/app/backend"]

FROM zig-master AS dev
WORKDIR /app

COPY --from=zig-master /app/zig-out/bin/backend /app/backend

EXPOSE 8080

CMD ["./watch.sh"]
