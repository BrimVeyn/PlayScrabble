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
    dict: []const u8,
    difficulty: []const u8,
    status: []const u8,
    states: []const u8,
    player_one_id: i32,
    player_two_id: ?i32,
    player_one_score: i32,
    player_two_score: i32,

    pub fn jsonStringify(self: @This(), jws: anytype) !void {
        try jws.beginObject();

        // Serialize each field
        try jws.objectField("id");
        try jws.print("{d}", .{self.id});

        try jws.objectField("creation_date");
        try jws.print("{d}", .{self.creation_date});

        try jws.objectField("dict");
        try jws.print("\"{s}\"", .{self.dict});

        try jws.objectField("difficulty");
        try jws.print("\"{s}\"", .{self.difficulty});

        try jws.objectField("status");
        try jws.print("\"{s}\"", .{self.status});

        try jws.objectField("states");
        try jws.print("\"{s}\"", .{self.states});

        try jws.objectField("player_one_id");
        try jws.print("{d}", .{self.player_one_id});

        try jws.objectField("player_two_id");
        if (self.player_two_id) |id| {
            try jws.print("{d}", .{id});
        } else {
            try jws.print("null", .{});
        }

        try jws.objectField("player_one_score");
        try jws.print("{d}", .{self.player_one_score});

        try jws.objectField("player_two_score");
        try jws.print("{d}", .{self.player_two_score});

        try jws.endObject();
    }
};


pub fn getSoloGames(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.cookies().get("Access-Token")) |accessToken| { 
        var token = JWTUtils.getClaimsFromToken(app, res, accessToken) catch |e| switch(e) {
            error.TokenExpired => { 
                log.info("/refresh: Token expired", .{});
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
            log.err("/refresh: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        defer queryRes.deinit();

        var games = std.ArrayList(GameType).init(res.arena);
        while (try queryRes.next()) |row| {
            const game = try row.to(GameType, .{});
            try games.append(game);
            log.info("Appended game: {any}\n\n\n\n", .{game});
        }

        try res.json(games.items[0..], .{ .whitespace = .indent_2 });
        res.status = 200;
        log.info("getUsers: OK", .{});

    } else {
        log.err("/getSoloGames: Access-token not found, not logged in", .{});
        res.status = 400;
        res.body = "Not logged in";
    }
}
