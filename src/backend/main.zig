const std = @import("std");
const httpz = @import("httpz");
const Data = @import("data");
const Allocator = std.mem.Allocator;
const print = std.debug.print;
const log = std.log;

const PORT = 8809;

var server_instance: ?*httpz.Server(void) = null;

pub fn main() !void {
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

    var server = try httpz.Server(void).init(allocator, .{ .port = PORT }, {});
    defer server.deinit();

    var router = server.router(.{});
    router.get("/", index, .{});

    log.info("listening http://localhost:{d}/", .{PORT});
    log.info("process id (pid): {d}", .{std.c.getpid()});

    server_instance = &server;
    try server.listen();
}

fn shutdown(_: c_int) callconv(.C) void {
    if (server_instance) |server| {
        log.info("Server shutting down...", .{});
        server_instance = null;
        server.stop();
    }
}

fn index(_: *httpz.Request, res: *httpz.Response) !void {
    const writer = res.writer();
    return std.fmt.format(writer, "To shutdown, run:\nkill -s int {d}", .{std.c.getpid()});
}
