const std           = @import("std");
const mainModule    = @import("main.zig");

const Allocator     = std.mem.Allocator;
const httpz         = @import("httpz");
const PORT          = 8081;
const log           = std.log;

const rootModule        = @import("root");
const solveMultiThread  = rootModule.solveMultiThread;
const solveEmptyGrid    = rootModule.solveEmptyGrid;
const Match             = rootModule.Match;
const Range             = @Vector(2, u4);
const Point             = @Vector(2, u4);

const ctxModule         = @import("Context.zig");
const Context           = ctxModule.Context;
const Direction         = ctxModule.Direction;

pub const App = struct {
    permInfos: *Context.CtxPerm,
    gpa: *Allocator,
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
const GRID_SIZE = 15;

const Grid = @import("Grid.zig").Grid;
const scorePar = @import("Score.zig").computeScoreParBis;
const scorePerp = @import("Score.zig").computeScorePerp;

const GetScoreRequest = struct {
    lang: []const u8 = "FR",
    wordList: std.ArrayList([]const u8),
    grid: Grid,
    match: Match,

    pub fn fromJson(alloc: Allocator, json: []const u8) !GetScoreRequest {
        const parsed = try std.json.parseFromSliceLeaky(std.json.Value, alloc, json, .{});

        const langKey = parsed.object.get("lang") orelse return error.MissingField;
        const lang = langKey.string;
        
        const wordListKey = parsed.object.get("wordList") orelse return error.MissingField;
        const wordListArray = wordListKey.array;

        var wordList: std.ArrayList([]const u8) = .init(alloc);
        for (wordListArray.items) |word| {
            try wordList.append(word.string);
        }

        const gridKey = parsed.object.get("grid") orelse return error.MissingField;
        const gridArray = gridKey.array;
        if (gridArray.items.len != GRID_SIZE) {
            return error.InvalidGridSize;
        }

        var gridSlice: [GRID_SIZE][GRID_SIZE]u8 = undefined;
        for (0..GRID_SIZE) |i| {
            const row = gridArray.items[i].array;
            if (row.items.len != GRID_SIZE) {
                return error.InvalidRowSize;
            }
            for (0..GRID_SIZE) |j| {
                gridSlice[i][j] = @as(u8, @intCast(row.items[j].integer));
            }
        }

        var grid = Grid.init();
        try grid.loadGridStateFromSlice(gridSlice);

        const matchKey = parsed.object.get("match") orelse return error.MissingField;
        const matchObject = matchKey.object;

        const matchWordKey = matchObject.get("word") orelse return error.MissingMatchField;
        const matchDirKey = matchObject.get("dir") orelse return error.MissingMatchField;
        const matchRangeKey = matchObject.get("range") orelse return error.MissingMatchField;
        const matchPerpCoordKey = matchObject.get("perpCoord") orelse return error.MissingMatchField;

        var matchWord:[GRID_SIZE:0]u8 = .{0} ** 15;
        std.mem.copyForwards(u8, matchWord[0..], matchWordKey.string[0..]);
        const matchDir = if (matchDirKey.integer == 0) Direction.Horizontal else Direction.Vertical;
        const matchRange = Range{@as(u4, @intCast(matchRangeKey.array.items[0].integer)), @as(u4, @intCast(matchRangeKey.array.items[1].integer))};
        const matchPerpCoord = @as(u4, @intCast(matchPerpCoordKey.integer));

        log.info("RANGE: {d}", .{matchRange});
        log.info("Dir: {any}", .{matchDir});
        log.info("Perp: {d}", .{matchPerpCoord});
        log.info("WORd: {s}", .{matchWord});

        const match: Match = .{
            .word = matchWord,
            .dir = matchDir,
            .range = matchRange,
            .perpCoord = matchPerpCoord,
        };

        return GetScoreRequest{
            .lang = lang,
            .wordList = wordList,
            .grid = grid,
            .match = match,
        };
    }

};

const ScoreResponse = struct {
    err: []const u8,
    score: u32 = 0,
};

fn getScore(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const b: []const u8 = req.body() orelse return ;
    var scoreReq = GetScoreRequest.fromJson(res.arena, b) catch |e| {
        log.err("solver: /solver/getScore: {!}", .{e});
        res.status = 500;
        res.body = "Internal server error";
        return ;
    };

    for (scoreReq.wordList.items) |word| {
        if (!app.permInfos.dict.contains(word)) {
            log.info("Unknown word in dict: {s}: {s}", .{scoreReq.lang, word});
            try res.json(ScoreResponse{.err = "Unknown word"}, .{});
            res.status = 200;
            return ;
        }
    }

    log.info("{}", .{scoreReq.grid});

    log.info("BEFORE: {}", .{scoreReq.match});

    if (scoreReq.match.dir == .Vertical) {
        scoreReq.grid.transpose();
    }

    log.info("{}", .{scoreReq.grid});

    for (scoreReq.match.range[0]..scoreReq.match.range[1] + 1) |x| {
        const currPoint = Point{@intCast(x), scoreReq.match.perpCoord};
        if (scoreReq.grid.isEmpty(currPoint) and scoreReq.grid.isAlphaPerp(currPoint)) {
            const sPerp = scorePerp(scoreReq.grid, currPoint, scoreReq.match.word[x - scoreReq.match.range[0]]);
            scoreReq.match.score += sPerp;
            log.info("Score: {d}", .{sPerp});
        }
    }

    scoreReq.match.score += scorePar(scoreReq.grid, &scoreReq.match, .{null, null});
    // log.info("AFTER: {}", .{scoreReq.match});
    log.info("Score: {d}", .{scoreReq.match.score});
    try res.json(ScoreResponse{.err = "", .score = scoreReq.match.score}, .{});
    res.status = 200;
    return ;
}

fn solve(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const maybeConfig = req.json(Context.CtxConfig) catch |e| {
        log.err("solver: /solver: {!}", .{e});
        res.status = 500;
        res.body = "Internal server error";
        return ;
    };

    if (maybeConfig) |config| {
        if (config.rack.len == 0) {
            log.err("solver: /solver/solve: Empty rack", .{});
            res.status = 400;
            res.body = "Malformed request";
            return ;
        }
        std.log.info("Solving with as rack: {s}", .{config.rack});
        var ctx = try app.permInfos.loadConfig(res.arena, config);
        if (ctx.grid.isGridEmpty()) {
            try solveEmptyGrid(&ctx, res.arena);
        } else {
            try solveMultiThread(&ctx, app.gpa.*, 8); //NOTE: 8 threads by default, only use a multiple of 2
        }
        try res.json(ctx.matchVec.items[0..], .{});
        std.log.info("Matches found: {d}", .{ctx.matchVec.items.len});
    } else {
        log.err("solver: /solver: No config found", .{});
        res.status = 500;
        res.body = "Internal server error";
    }
}

const gpaConfig = std.heap.GeneralPurposeAllocatorConfig{
    .thread_safe = true,
    .safety = true,
    .retain_metadata = true,
    .stack_trace_frames = 10,
};

pub const std_options = std.Options {
    .log_level = .info,
};

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
    router.post("/solver/solve", Server.solve, .{});
    router.post("/solver/getScore", Server.getScore, .{});

    log.info("Solver listening http://{s}:{d}/", .{"0.0.0.0", PORT});

    server_instance = &server;
    try server.listen();
}
