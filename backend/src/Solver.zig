const std = @import("std");
const httpz = @import("httpz");
const pg = @import("pg");
const jwt = @import("jwt");

const mainModule = @import("main.zig");
const App = mainModule.App;

const print         = std.debug.print;
const log           = std.log;

pub const Solver = @This();

pub fn solve(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    _ = app;
    _ = req;
    _ = res;
}
