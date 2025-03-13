#------------------------------------------------------------------
FROM brimveyn/zig:0.14.0 AS prod
WORKDIR /app
COPY . .

RUN zig build -Doptimize=ReleaseFast

EXPOSE 8081

CMD ["./zig-out/bin/solver"]
#------------------------------------------------------------------
