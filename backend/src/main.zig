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

    _ = try app.db.exec(
        \\CREATE TABLE IF NOT EXISTS "users" (
        \\name TEXT PRIMARY KEY,
        \\age INT
        \\);
    , .{});

    var router = server.router(.{.middlewares = &.{cors}});
    router.get("/api/hello", hello, .{});
    router.get("/api/getUser:name", getUser, .{});
    router.get("/api/getUsers", getUsers, .{});
    router.post("/api/addUser", addUser, .{});

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

fn getUser(app: *App, _: *httpz.Request, res: *httpz.Response) !void {
    _ = res;
    _ = app;
}

const User = struct {
    name: []u8,
    age: i32,
};

fn getUsers(app: *App, _: *httpz.Request, res: *httpz.Response) !void {
    errdefer res.status = 500;

    const queryRes = try app.db.query("SELECT name,age FROM users", .{});
    defer queryRes.deinit();

    var users = std.ArrayList(User).init(res.arena);
    while (try queryRes.next()) |row| {
        const name = row.get([]u8, 0);
        const age = row.get(i32, 1);
        try users.append(.{.name = name, .age = age});
    }

    try res.json(users.items[0..], .{});
}

fn addUser(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (try req.json(User)) |body| {
        _ = app.db.exec("INSERT INTO users (name, age) values ($1, $2)", .{body.name, body.age}) catch |err| {
            log.err("{!}", .{err});
            res.status = 409;
        };
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
