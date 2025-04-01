const std = @import("std");
const httpz = @import("httpz");
const pg = @import("pg");
const jwt = @import("jwt");
const JWT = jwt.JWT;
const http = std.http;

const mainModule = @import("main.zig");
const App = mainModule.App;

const print         = std.debug.print;
const log           = std.log;

pub const Game = @This();

const CreateGameStruct = struct {
	creation_time: i64,
        dict: []const u8,
        difficulty: []const u8,
	status: []const u8,
	states: []const u8,
	player_one_id: i32,
	player_two_id: ?i32,
	player_one_score: i32,
	player_two_score: i32,
};

pub fn createGame(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.json(CreateGameStruct)) |reqBody| {
        // Prepare SQL query with placeholders
        const query = \\INSERT INTO "game" (creation_time, dict, difficulty, status, states, player_one_id, player_two_id, player_one_score, player_two_score)
                      \\VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        ;

        // Execute query with the appropriate data from reqBody
        _ = app.db.exec(query, .{
            reqBody.?.creation_time,
            reqBody.?.dict,
            reqBody.?.difficulty,
            reqBody.?.status,
            reqBody.?.states,
            reqBody.?.player_one_id,
            reqBody.?.player_two_id,
            reqBody.?.player_one_score,
            reqBody.?.player_two_score
        }) catch |e| {
            log.err("/createGame: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return;
        };

        //Retrieve the game that was created and send the gameId back to the client for further updates
        var maybeRow = app.db.rowOpts(
            \\SELECT id::integer
            \\FROM "game"
            \\WHERE creation_time = $1
        , .{reqBody.?.creation_time}, .{.column_names = true}) catch |e| {
            log.err("/createGame: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        if (maybeRow) |*row| {
            defer row.deinit() catch {};
            const gameId = row.getCol(i32, "id");
            log.info("/createGame: Success", .{});
            res.status = 201;
            try res.json(.{ .gameId = gameId}, .{});
        } else {
            res.status = 400;
            res.body = "Unable to retrieve the game that was created";
        }
    } else |e| {
        log.err("/createGame: JSON error: {!}", .{e});
        // If the request body is not valid JSON
        res.status = 400;
        res.body = "Invalid request body";
    }
}

const UpdateGameType = struct {
    id: i32,
    status: []const u8,
    states: []const u8,
    player_one_score: i32,
    player_two_score: i32,
};

pub fn updateGame(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const gameIdStr = req.params.get("gameId") orelse return ;
    const gameId = try std.fmt.parseInt(i32, gameIdStr, 10);

    if (req.json(UpdateGameType)) |reqBody| {

        if (gameId != reqBody.?.id) {
            log.err("/updateGame: gameId mismatch", .{});
            res.status = 400;
            res.body = "gameId mismatch";
        }

        const query = 
            \\ UPDATE "game"
            \\ SET status = $2, states = $3, player_one_score = $4, player_two_score = $5
            \\ WHERE id = $1
        ;

        _ = app.db.exec(query, .{
            reqBody.?.id,
            reqBody.?.status,
            reqBody.?.states,
            reqBody.?.player_one_score,
            reqBody.?.player_two_score
        }) catch |e| {
            log.err("/updateGame: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        res.status = 200;
        log.info("/updateGame: Success", .{});

    } else |e| {
        log.err("/updateGame: malformed body: {!}", .{e});
        res.status = 400;
        res.body = "Missing fields";
    }
}
