const std           = @import("std");
const httpz         = @import("httpz");
const pg            = @import("pg");
const jwt           = @import("jwt");

//---------------- Models ----------------//
const User          = @import("User.zig");
const Solver        = @import("Solver.zig");
//----------------------------------------//

const Allocator     = std.mem.Allocator;
const print         = std.debug.print;
const log           = std.log;

const PORT          = 8080;
const SERVER_ADDR   = "0.0.0.0"; // -> docker network

var server_instance: ?*httpz.Server(*App) = null;

pub const App = struct {
    db: *pg.Pool,
    jwt_secret: []const u8,
};

pub const std_options = std.Options {
    .log_level = .info,
};

pub fn main() !u8 {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    //INFO: Catching SIGINT and SIGTERM
    initSignals();

    const dbUrl = std.process.getEnvVarOwned(allocator, "DATABASE_URL") catch {
        log.err("Encountered Fatal Error missing 'DATABASE_URL'", .{});
        return 1;
    }; 
    defer allocator.free(dbUrl);

    const dbUri = std.Uri.parse(dbUrl) catch |err| {
        log.err("Fatal error: {!}", .{err});
        return 1;
    };

    var db = pg.Pool.initUri(allocator, dbUri, 1, 10_000) catch |err| {
        log.err("Fatal error: {!}", .{err});
        return 1;
    };
    defer db.deinit();

    var app = App {
        .db = db,
        .jwt_secret = std.process.getEnvVarOwned(allocator, "JWT_SECRET") catch {
            log.err("Encountered Fatal Error missing 'JWT_SECRET'", .{});
            return 1;
        },
    };
    defer allocator.free(app.jwt_secret);

    var server = try httpz.Server(*App).init(allocator, .{
        .port = PORT,
        .address = "0.0.0.0",
    }, &app);
    defer server.deinit();

    const cors = try server.middleware(httpz.middleware.Cors, .{
        .origin = "*",
        .methods = "*",
        .headers = "*",
    });

    _ = try app.db.exec(
        \\DROP TABLE IF EXISTS "users";
        \\CREATE TABLE "users" (
        \\id SERIAL PRIMARY KEY,
        \\username TEXT UNIQUE,
        \\email TEXT NOT NULL UNIQUE,
        \\password TEXT NOT NULL,
        \\refresh TEXT NULL
        \\);
    , .{});

    var router = server.router(.{.middlewares = &.{cors}});
    //-------------------------------GET--------------------------------
    router.get("/api/getUser:name", User.getUser, .{});
    router.get("/api/getUsers", User.getUsers, .{});
    router.get("/api/me", User.me, .{});
    router.get("/api/solver/solve", Solver.solve, .{});
    //------------------------------------------------------------------

    //-------------------------------POST-------------------------------
    router.post("/api/register", User.register, .{});
    router.post("/api/login", User.login, .{});
    //------------------------------------------------------------------

    log.info("listening http://{s}:{d}/", .{SERVER_ADDR, PORT});
    log.info("process id (pid): {d}", .{std.c.getpid()});

    server_instance = &server;
    try server.listen();
    return 0;
}

fn initSignals() void {
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
}

fn shutdown(_: c_int) callconv(.C) void {
    if (server_instance) |server| {
        log.info("Server shutting down...", .{});
        server_instance = null;
        server.stop();
    }
}
