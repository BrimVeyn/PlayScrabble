const std = @import("std");
const httpz = @import("httpz");
const pg = @import("pg");
const jwt = @import("jwt");
const JWTUtils = @import("JWT_utils.zig");
const JWT = jwt.JWT;
const http = std.http;

const mainModule = @import("main.zig");
const App = mainModule.App;

const print         = std.debug.print;
const log           = std.log;

pub const Game = @This();

const CreateGameSchema = struct {
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
    if (req.json(CreateGameSchema)) |reqBody| {
        // Prepare SQL query with placeholders
        const query = \\INSERT INTO "game" (dict, difficulty, status, states, player_one_id, player_two_id, player_one_score, player_two_score)
                      \\VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                      \\RETURNING ID;
        ;

        // Execute query with the appropriate data from reqBody
        var maybeRow = app.db.rowOpts(query, .{
            reqBody.?.dict,
            reqBody.?.difficulty,
            reqBody.?.status,
            reqBody.?.states,
            reqBody.?.player_one_id,
            reqBody.?.player_two_id,
            reqBody.?.player_one_score,
            reqBody.?.player_two_score
        }, .{.column_names = true}) catch |e| {
            log.err("/createGame: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return;
        };

        //Retrieve the game that was created and send the gameId back to the client for further updates
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

const PlayedWord = struct {
    word: []const u8,
    score: i32,
};

const UpdateGameType = struct {
    id: i32,
    status: []const u8,
    states: []const u8,
    player_one_score: i32,
    player_two_score: i32,
    last_played_word: ?PlayedWord,
};

const UserStatsFields = struct {
    average_score_per_word: f64,
    average_score_per_game: f64,
    most_score_word: i32,
    best_word: ?[]const u8,
    longest_word: ?[]const u8,
    turns_played: i32,
    total_score: i32,
};

pub fn updateGame(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const gameIdStr = req.params.get("gameId") orelse return ;
    const gameId = try std.fmt.parseInt(i32, gameIdStr, 10);

    if (req.json(UpdateGameType)) |reqBody| {

        if (gameId != reqBody.?.id) {
            log.err("/solo/updateGame: gameId mismatch", .{});
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
            log.err("/solo/updateGame: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };

        if (reqBody.?.last_played_word == null) {
            res.status = 200;
            log.info("/solo/updateGame: No word played, success", .{});
            return ;
        }

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
            log.info("/solo/updateGame: userId: {d}", .{token.claims.sub});

            const playerInfoQuery =
                \\SELECT average_score_per_word, average_score_per_game,
                \\most_score_word, best_word, longest_word, turns_played, total_score
                \\FROM "user" WHERE id = $1
            ;
            
            var maybeUserInfo = app.db.rowOpts(playerInfoQuery, .{userId}, .{ .column_names = true}) catch |e| {
                log.err("/solo/updateGame: PG: {!}", .{e});
                res.status = 500;
                res.body = "Internal server error";
                return ;
            };
            if (maybeUserInfo) |*userInfo| {

                const playedWord: PlayedWord = reqBody.?.last_played_word.?;
                const userStats: UserStatsFields = try userInfo.to(UserStatsFields, .{.allocator = res.arena});
                userInfo.deinit() catch {};

                var userStatsUpdated: UserStatsFields = userStats;

                if (playedWord.score > userStats.most_score_word) {
                    userStatsUpdated.most_score_word = playedWord.score;
                    userStatsUpdated.best_word = playedWord.word;
                }
                if (userStats.longest_word == null or playedWord.word.len > userStats.longest_word.?.len) {
                    userStatsUpdated.longest_word = playedWord.word;
                }
                userStatsUpdated.total_score += playedWord.score;
                userStatsUpdated.turns_played += 1;
                userStatsUpdated.average_score_per_word = @as(f64, @floatFromInt(userStatsUpdated.total_score)) / @as(f64, @floatFromInt(userStatsUpdated.turns_played));
                log.info("Updated stats: {any}", .{userStatsUpdated});

                const updateQuery =
                    \\UPDATE "user"
                    \\SET average_score_per_word = $2, average_score_per_game = $3,
                    \\most_score_word = $4, best_word = $5, longest_word = $6, turns_played = $7, total_score = $8
                    \\WHERE id = $1
                ;
                _ = app.db.exec(updateQuery, .{
                    userId,
                    userStatsUpdated.average_score_per_word,
                    userStatsUpdated.average_score_per_game,
                    userStatsUpdated.most_score_word,
                    userStatsUpdated.best_word,
                    userStatsUpdated.longest_word,
                    userStatsUpdated.turns_played,
                    userStatsUpdated.total_score,
                }) catch |e| {
                    log.err("/solo/updateGame: Error updating player stats: {!}", .{e});
                    res.status = 500;
                    res.body = "Unable to update player stats";
                    return ;
                };

            } else {
                log.err("/solo/updateGame: User not found", .{});
                res.status = 401;
                res.body = "Unable to retrieve user data";
                return ;
            }
        } else {
            log.err("/solo/updateGame: Access-token not found, not logged in", .{});
            res.status = 401;
            res.body = "Not logged in";
            return ;
        }
        res.status = 200;
        log.info("/solo/updateGame: Success", .{});
    } else |e| {
        log.err("/solo/updateGame: malformed body: {!}", .{e});
        res.status = 400;
        res.body = "Missing fields";
    }
}
