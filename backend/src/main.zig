const std           = @import("std");
const httpz         = @import("httpz");
const pg            = @import("pg");
const Allocator     = std.mem.Allocator;
const print         = std.debug.print;
const log           = std.log;

const PORT          = 8080;
const SERVER_ADDR   = "0.0.0.0"; // -> docker network

var server_instance: ?*httpz.Server(*App) = null;

const App = struct {
    db: *pg.Pool,
};

pub fn main() !u8 {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    // SIGINT or SIGTERM are received
    std.posix.sigaction(std.posix.SIG.INT, &.{
        .handler = .{ .handler = shutdown },
        .mask = std.posix.empty_sigset,
        .flags = 0,
    }, null);
    std.posix.sigaction(std.posix.SIG.TERM, &.{
        .handler = .{ .handler = shutdown },
        .mask = std.posix.empty_sigset,
        .flags = 0,
    }, null);

    const pgPort = std.process.getEnvVarOwned(allocator, "DATABASE_PORT") catch {
        log.err("DATABASE_PORT not found", .{});
        return 1;
    };
    defer allocator.free(pgPort);

    const pgDb = std.process.getEnvVarOwned(allocator, "POSTGRES_DB") catch {
        log.err("POSTGRES_DB not found", .{});
        return 1;
    };
    defer allocator.free(pgDb);

    const pgUser = std.process.getEnvVarOwned(allocator, "POSTGRES_USER") catch {
        log.err("POSTGRES_USER not found", .{});
        return 1;
    };
    defer allocator.free(pgUser);

    const pgPass = std.process.getEnvVarOwned(allocator, "POSTGRES_PASSWORD") catch {
        log.err("POSTGRES_PASSWORD not found", .{});
        return 1;
    };
    defer allocator.free(pgPass);
    
    var db = try pg.Pool.init(allocator, .{ 
        .connect = .{
            .port = try std.fmt.parseInt(u16, pgPort, 10),
            .host = SERVER_ADDR,
        },
        .auth = .{
            .database = pgDb,
            .username = pgUser,
            .password = pgPass,
        },
    });
    defer db.deinit();

    var app = App {
        .db = db,
    };

    var server = try httpz.Server(*App).init(allocator, .{
        .port = PORT,
        .address = "0.0.0.0",
    }, &app);
    defer server.deinit();

    const cors = try server.middleware(httpz.middleware.Cors, .{
        .origin = "*",
        .methods = "*",
    });

    var router = server.router(.{.middlewares = &.{cors}});
    router.get("/api/hello", hello, .{});

    log.info("listening http://{s}:{d}/", .{SERVER_ADDR, PORT});
    log.info("process id (pid): {d}", .{std.c.getpid()});

    server_instance = &server;
    try server.listen();
    return 0;
}

fn shutdown(_: c_int) callconv(.C) void {
    if (server_instance) |server| {
        log.info("Server shutting down...", .{});
        server_instance = null;
        server.stop();
    }
}

fn hello(app: *App, _: *httpz.Request, res: *httpz.Response) !void {
    _ = app;
    res.status = 200;

    try res.json(.{ 
        .nathan = "salut",
    }, .{});

    log.info("Je suis un log", .{});
}

fn index(_: *httpz.Request, res: *httpz.Response) !void {
    const writer = res.writer();
    return std.fmt.format(writer, "To shutdown, run:\nkill -s int {d}", .{std.c.getpid()});
}
