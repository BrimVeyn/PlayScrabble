const std = @import("std");
const httpz = @import("httpz");
const pg = @import("pg");
const jwt = @import("jwt");
const JWT = jwt.JWT;
const http = std.http;

const mainModule = @import("main.zig");
const JWTUtils = @import("JWT_utils.zig");
const App = mainModule.App;

const print         = std.debug.print;
const log           = std.log;

pub fn getUser(app: *App, _: *httpz.Request, res: *httpz.Response) !void {
    _ = app;
    log.info("/getUser: Hello", .{});
    res.status = 200;
}

const GameType = struct {
    id: i32,
    creation_date: i64,
    difficulty: []const u8,
    dict: []const u8,
    status: []const u8,
    states: []const u8,
    player_one_id: i32,
    player_two_id: ?i32,
    player_one_score: i32,
    player_two_score: i32,

    pub fn format(self: *const @This(), comptime fmt: []const u8, _: std.fmt.FormatOptions, writer: anytype) !void {
        if (fmt.len != 0) {
            std.fmt.invalidFmtError(fmt, self);
        }
        return std.json.stringify(self, .{.whitespace = .indent_2}, writer);
    }
};

pub fn getPendingSoloGames(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.cookies().get("Access-Token")) |accessToken| { 
        var token = JWTUtils.getClaimsFromToken(app, res, accessToken) catch |e| switch(e) {
            error.TokenExpired => { 
                log.info("/getSoloGames: Token expired", .{});
                res.status = 401; 
                res.body = "Refresh token expired";
                return ; 
            },
            else => { 
                res.status = 500; 
                res.body = "Internal server error";
                return ;
            }
        };
        defer token.deinit();
        const userId = token.claims.sub;
        log.info("/getSoloGames: userId: {d}", .{token.claims.sub});

        const query = 
            \\SELECT * FROM game 
            \\WHERE (player_one_id = $1 OR player_two_id = $1);
        ;

        var queryRes = app.db.query(query, .{userId}) catch |e| {
            log.err("/getSoloGames: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        defer queryRes.deinit();

        var games = std.ArrayList(GameType).init(res.arena);
        while (try queryRes.next()) |row| {
            const game = try row.to(GameType, .{ .allocator = res.arena });
            try games.append(game);
        }

        log.info("/getSoloGames: OK", .{});
        res.status = 200;
        try res.json(games.items[0..], .{});

    } else {
        log.err("/getSoloGames: Access-token not found, not logged in", .{});
        res.status = 400;
        res.body = "Not logged in";
    }
}

pub fn getGameHistory(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.cookies().get("Access-Token")) |accessToken| { 
        var token = JWTUtils.getClaimsFromToken(app, res, accessToken) catch |e| switch(e) {
            error.TokenExpired => { 
                log.info("/getSoloGames: Token expired", .{});
                res.status = 401; 
                res.body = "Refresh token expired";
                return ; 
            },
            else => { 
                res.status = 500; 
                res.body = "Internal server error";
                return ;
            }
        };
        defer token.deinit();
        const userId = token.claims.sub;
        log.info("/getSoloGames: userId: {d}", .{token.claims.sub});

        const query = 
            \\SELECT * FROM game 
            \\WHERE (player_one_id = $1 OR player_two_id = $1) AND status = 'done';
        ;

        var queryRes = app.db.query(query, .{userId}) catch |e| {
            log.err("/getSoloGames: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        defer queryRes.deinit();

        var games = std.ArrayList(GameType).init(res.arena);
        while (try queryRes.next()) |row| {
            const game = try row.to(GameType, .{ .allocator = res.arena });
            try games.append(game);
        }

        log.info("/getSoloGames: OK", .{});
        res.status = 200;
        try res.json(games.items[0..], .{});

    } else {
        log.err("/getSoloGames: Access-token not found, not logged in", .{});
        res.status = 400;
        res.body = "Not logged in";
    }
}
