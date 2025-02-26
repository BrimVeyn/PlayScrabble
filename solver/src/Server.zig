const std           = @import("std");
const mainModule    = @import("main.zig");

const Allocator     = std.mem.Allocator;
const httpz         = @import("httpz");
const PORT          = 8081;
const log           = std.log;

const rootModule        = @import("root");
const solveMultiThread  = rootModule.solveMultiThread;

const ctxModule         = @import("Context.zig");
const Context           = ctxModule.Context;

pub const App = struct {
    permInfos: *Context.CtxPerm,
    gpa: *Allocator,
};

const gpaConfig = std.heap.GeneralPurposeAllocatorConfig{
    .thread_safe = true,
    .safety = true,
    .retain_metadata = true,
};

var server_instance: ?*httpz.Server(*App) = null;

fn shutdown(_: c_int) callconv(.C) void {
    if (server_instance) |server| {
        log.info("Server shutting down...", .{});
        server_instance = null;
        server.stop();
    }
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

pub const Server = @This();

fn solve(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const maybeConfig = req.json(Context.CtxConfig) catch |e| {
        log.err("solver: /solver: {!}", .{e});
        res.status = 500;
        res.body = "Internal server error";
        return ;
    };

    if (maybeConfig) |config| {
        var ctx = try app.permInfos.loadConfig(res.arena, config);
        try solveMultiThread(&ctx, app.gpa.*);
        try res.json(ctx.matchVec.items[0..], .{});
        std.log.info("Matches found: {d}", .{ctx.matchVec.items.len});
    } else {
        log.err("solver: /solver: No config found", .{});
        res.status = 500;
        res.body = "Internal server error";
    }
}


pub fn start() !void {
    var gpa: std.heap.GeneralPurposeAllocator(gpaConfig) = .init;
    var gpaAlloc = gpa.allocator();
    defer _ = gpa.deinit();

    var arena: std.heap.ArenaAllocator = .init(gpaAlloc);
    const arenaAlloc = arena.allocator();
    defer arena.deinit();

    //NOTE: Initialize what will live as long as the server is alive
    var permInfos = try Context.CtxPerm.init(arenaAlloc);
    var app: App = .{.permInfos = &permInfos, .gpa = &gpaAlloc};

    //INFO: Catching SIGINT and SIGTERM
    initSignals();

    var server = try httpz.Server(*App).init(gpaAlloc, .{
        .port = PORT,
        .address = "0.0.0.0",
    }, &app);
    defer server.deinit();

    const cors = try server.middleware(httpz.middleware.Cors, .{
        .origin = "*",
        .methods = "*",
        .headers = "*",
    });

    var router = server.router(.{.middlewares = &.{cors}});
    router.post("/solve", solve, .{});

    log.info("Solver listening http://{s}:{d}/", .{"0.0.0.0", PORT});

    server_instance = &server;
    try server.listen();
}
