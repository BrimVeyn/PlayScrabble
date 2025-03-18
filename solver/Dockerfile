#------------------------------------------------------------------
FROM brimveyn/zig:0.14.0 AS dev
WORKDIR /app
COPY . .

RUN zig build

EXPOSE 8081

CMD ["./watch.sh"]
#------------------------------------------------------------------
FROM brimveyn/zig:0.14.0 AS prod
WORKDIR /app
COPY . .

RUN zig build -Doptimize=RealeaseFast

EXPOSE 8081

CMD ["./zig-out/bin/solver"]
