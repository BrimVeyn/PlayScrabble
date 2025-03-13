#------------------------------------------------------------------
FROM brimveyn/zig:0.14.0 AS prod
WORKDIR /app
COPY . .

RUN zig build -Doptimize=ReleaseFast

EXPOSE 8080

CMD ["/app/backend"]
#------------------------------------------------------------------

#------------------------------------------------------------------
FROM brimveyn/zig:0.14.0 AS dev
WORKDIR /app
COPY . .

RUN rm -rf .zig-cache/
RUN zig build

EXPOSE 8080

CMD ["./watch.sh"]
#------------------------------------------------------------------
