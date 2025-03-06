const std = @import("std");
const httpz = @import("httpz");
const pg = @import("pg");
const jwt = @import("jwt");

const mainModule = @import("main.zig");
const App = mainModule.App;

const print         = std.debug.print;
const log           = std.log;

pub const Definition = @This();

const DefinitionFields = struct {
    name: []const u8,
    definition: []const u8,
};

pub const Error = struct {
    err: []const u8,
};

pub fn get(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const wordRequested = req.params.get("word").?;

    var dbRow = app.dict.rowOpts(
        \\SELECT * FROM fr
        \\WHERE name = LOWER($1)
    , .{wordRequested}, .{ .column_names = true }) catch |e| {
        log.err("login: PG: {!}", .{e});
        res.status = 500;
        res.body = "Internal server error";
        return ;
    };

    if (dbRow) |*row| {
        defer row.deinit() catch {};
        res.body = row.getCol([]const u8, "definition");
        res.status = 200;
        return ;
    }
}

