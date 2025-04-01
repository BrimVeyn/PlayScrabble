const std           = @import("std");
const httpz         = @import("httpz");
const pg            = @import("pg");
const jwt           = @import("jwt");

//---------------- Models ----------------//
const User          = @import("User.zig");
const Game          = @import("Game.zig");
const Solver        = @import("Solver.zig");
const Definition    = @import("Definitions.zig");
//----------------------------------------//

const Allocator     = std.mem.Allocator;
const print         = std.debug.print;
const log           = std.log;

const PORT          = 8080;
const SERVER_ADDR   = "0.0.0.0"; // -> docker network

var server_instance: ?*httpz.Server(*App) = null;

pub const App = struct {
    db: *pg.Pool,
    dict: *pg.Pool,
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

    const dictUrl = std.process.getEnvVarOwned(allocator, "DICT_URL") catch {
        log.err("Encountered Fatal Error missing 'DICT_URL'", .{});
        return 1;
    }; 

    const dbUri = std.Uri.parse(dbUrl) catch |err| {
        log.err("Fatal error: {!}", .{err});
        return 1;
    };

    const dictUri = std.Uri.parse(dictUrl) catch |err| {
        log.err("Fatal error: {!}", .{err});
        return 1;
    };

    var db = pg.Pool.initUri(allocator, dbUri, 1, 10_000) catch |err| {
        log.err("Fatal error connecting to main db: {!}", .{err});
        return 1;
    };
    defer db.deinit();

    var dict = pg.Pool.initUri(allocator, dictUri, 1, 10_000) catch |err| {
        log.err("uri: {any}", .{dictUri});
        log.err("Fatal error connecting to dict: {!}", .{err});
        return 1;
    };
    defer dict.deinit();

    var app = App {
        .db = db,
        .dict = dict,
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

    _ = app.db.exec(
        \\DROP TABLE IF EXISTS "game";
        \\DROP TABLE IF EXISTS "user";
        \\
        \\CREATE TABLE "user" (
        \\  id SERIAL PRIMARY KEY,
        \\  username VARCHAR(32) UNIQUE,
        \\  email VARCHAR(255) NOT NULL UNIQUE,
        \\  password TEXT NOT NULL,
        \\  refresh TEXT
        \\);
        \\
        \\INSERT INTO "user" (username, email, password) VALUES ('bot', 'bot@playscrabble.dev', '9q4O6E4NJr91');
        \\INSERT INTO "user" (username, email, password) VALUES ('bryan', 'bryan@gmail.com', 'pass');
        \\INSERT INTO "user" (username, email, password) VALUES ('robin', 'robin@gmail.com', 'pass');
        \\INSERT INTO "user" (username, email, password) VALUES ('nathan', 'nathan@gmail.com', 'pass');
        \\
        \\CREATE TABLE "game" (
        \\  id SERIAL PRIMARY KEY,
        \\  creation_time TIMESTAMP NOT NULL,
        \\  difficulty VARCHAR(32),
        \\  dict VARCHAR(8),
        \\  status VARCHAR(16),
        \\  states JSONB,
        \\  player_one_id INTEGER NOT NULL,
        \\  player_two_id INTEGER,
        \\  player_one_score INTEGER,
        \\  player_two_score INTEGER,
        \\  FOREIGN KEY (player_one_id) REFERENCES "user"(id),
        \\  FOREIGN KEY (player_two_id) REFERENCES "user"(id)
        \\);
    , .{}) catch |e| {
        log.err("Error initializing DB: {!}", .{e});
        return 1;
    };

    var router = server.router(.{.middlewares = &.{cors}});
    //-------------------------------GET--------------------------------
    router.get("/api/getUser", User.getUser, .{});
    router.get("/api/getUsers", User.getUsers, .{});
    router.get("/api/me", User.me, .{});
    router.get("/api/refresh", User.refresh, .{});
    router.get("/api/getDefinition/:word", Definition.get, .{});
    router.get("/api/user/getSoloGames", User.getSoloGames, .{});
    //------------------------------------------------------------------

    //-------------------------------POST-------------------------------
    router.post("/api/register", User.register, .{});
    router.post("/api/login", User.login, .{});
    router.post("/api/loginGoogle", User.loginGoogle, .{});
    router.post("/api/checkEmail", User.checkEmail, .{});
    router.post("/api/checkUsername", User.checkUsername, .{});
    router.post("/api/game/solo/createGame", Game.createGame, .{});
    router.post("/api/game/solo/updateGame/:gameId", Game.updateGame, .{});
    //------------------------------------------------------------------

    router.delete("/api/logout", User.logout, .{});

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
