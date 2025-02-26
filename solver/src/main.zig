const std                   = @import("std");
const print                 = std.debug.print;
const AutoArrayHashMap      = std.AutoArrayHashMap;
const AutoHashMap           = std.AutoHashMap;
const ArrayList             = std.ArrayList;
const Allocator             = std.mem.Allocator;

const gridFile              = @import("Grid.zig");
const Grid                  = gridFile.Grid;
const GRID_SIZE             = 15;

const generator             = @import("generate/generate.zig");
const OrderedMap            = generator.OrderedMap;
const asciiOrderedMapPath   = generator.asciiOrderedMapPath;
const Map                   = generator.Map;

const scoreModule           = @import("Score.zig");
const Scrabble              = scoreModule.Scrabble;
const LetterScore           = scoreModule.LetterScore;
const computeScorePar       = scoreModule.computeScorePar;

const ctxModule             = @import("Context.zig");
const Context               = ctxModule.Context;
const Direction             = ctxModule.Direction;

const constraintModule      = @import("Constraints.zig");
const Placement             = constraintModule.Placement;
const Constraints           = constraintModule.Constraints;

const PermSet               = std.StringArrayHashMap([2]u8);
const String                = ArrayList(u8);
const StringUnmanaged       = std.ArrayListUnmanaged(u8);
const StringVec             = ArrayList(struct {[]const u8, [2]u8});
const Point                 = @Vector(2, u4);
const Range                 = @Vector(2, u4);

pub inline fn insertSortedAssumeCapacity(string: *String, ch: u8) void {
    var i: usize = 0;
    while (i < string.items.len and string.items[i] <= ch) : (i += 1) {}
    string.insertAssumeCapacity(i, ch);
}

fn getFilteredWordList(ctx: *Context, perms: *const PermSet, cellPlacement: *const Placement, cellRange: *const Range) !StringVec {
    var vec = StringVec.init(ctx.alloc);

    var permIt = perms.iterator();
    while (permIt.next()) |kv| {
        ctx.mutex.lock();
        const permWords = ctx.permInfos.orderedMap.data.get(kv.key_ptr.*) orelse {
            ctx.mutex.unlock();
            continue;
        };
        ctx.mutex.unlock();
        outer: for (permWords.keys()) |word| {
            if (word.len < cellRange[0] or word.len > cellRange[1]) continue;
            for (0..cellPlacement.c.len) |it| {
                if (cellPlacement.c[it] == 0) break;
                if (word[cellPlacement.pos[it] - 1] != cellPlacement.c[it]) continue :outer;
            }
            try vec.append(.{ word, kv.value_ptr.* });
        }
    }
    return vec;
}

fn getBaseFilteredWordList(ctx: *Context, perms: *const PermSet, range: *const Range) !StringVec {
    var vec = StringVec.init(ctx.alloc);

    var it = perms.iterator();
    while (it.next()) |kv| {
        ctx.mutex.lock();
        const permWords = ctx.permInfos.orderedMap.data.get(kv.key_ptr.*) orelse {
            ctx.mutex.unlock();
            continue;
        };
        ctx.mutex.unlock();

        for (permWords.keys()) |word| {
            if (word.len < range[0] or word.len > range[1]) continue;

            try vec.append(.{ word, kv.value_ptr.*});
        }
    }
    return vec;
}

pub const Match = struct {
    word: [GRID_SIZE:0]u8,
    dir: Direction,
    range: Range,
    perpCoord: u4,
    score: u32,
    jokers: [2]u8 = .{0, 0},
    jokerPoses: [2]?u4 = .{null, null},

    pub fn init(currWord: []const u8, jokers: [2]u8, cell: *const Point, ctxState: Direction) Match {
        var word: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
        std.mem.copyForwards(u8, word[0..], currWord);
        return .{
            .jokers = jokers,
            .dir = ctxState,
            .word = word,
            .range = Range{
                cell[0],
                cell[0] + (@as(u4, @intCast(currWord.len)) - 1),
            },
            .perpCoord = cell[1],
            .score = 0,
        };
    }

    pub fn jsonStringify(self: @This(), jws: anytype) !void {
        try jws.beginArray();

        const len = std.mem.indexOfSentinel(u8, 0, self.word[0..]);
        try jws.write(self.word[0..len]);
        try jws.write(self.score);
        try jws.write(@intFromEnum(self.dir));

        try jws.write(self.range);
        try jws.write(self.perpCoord);

        if (self.jokers[0] != 0) {
            try jws.write(.{@as(u64, self.jokers[0]), @as(u64, self.jokers[1])});
            try jws.write(.{
                @as(i5, if (self.jokerPoses[0] == null) -1 else self.jokerPoses[0].?),
                @as(i5, if (self.jokerPoses[1] == null) -1 else self.jokerPoses[1].?),
            });
        }
        try jws.endArray();
    }
};

fn isMandatory(ch: u8, pos: u4, cellPlaces: *const Placement) bool {
    for (cellPlaces.pos, cellPlaces.c) |letterPos, letterValue| {
        if (letterPos == 0 or letterPos > pos) return false;
        if (letterPos == pos and ch == letterValue) return true;
    }
    return false;
}

fn getJokerPoses(ctx: *Context, word: []const u8, jokers: [2]u8, cellPlaces: *const Placement) !ArrayList([2]?u4) {
    var posFirst = ArrayList(u4).init(ctx.alloc);
    var posSecond = ArrayList(u4).init(ctx.alloc);

    for (0..word.len) |i| {
        const mandatory = isMandatory(word[i], @as(u4, @intCast(i)) + 1, cellPlaces);
        if (word[i] == jokers[0] and !mandatory) {
            try posFirst.append(@intCast(i));
        }
        if (word[i] == jokers[1] and !mandatory) {
            try posSecond.append(@intCast(i));
        }
    }

    var posFinal = ArrayList([2]?u4).init(ctx.alloc);

    for (posFirst.items) |pos1| {
        if (posSecond.items.len == 0) {
            try posFinal.append(.{pos1, null});
            continue;
        }
        for (posSecond.items) |pos2| {
            if (pos1 != pos2) {
                try posFinal.append(.{ @min(pos1, pos2), @max(pos1, pos2) });
            }
        }
    }

    // if (jokers[0] == jokers[1]) print("{any}\n", .{posFinal.items});
    return posFinal;
}

fn computeMatchs(
    ctx: *Context, 
    cell: *const Point, 
    wordVec: *const StringVec, 
    cellPlaces: *const Placement,
    mandatoryLen: usize
) !void {
    outer: for (wordVec.items) |kv| {
        const word = kv[0];
        const jokers = kv[1];
        var currMatch = Match.init(word, jokers, cell, ctx.state);
        const wordRange = (currMatch.range[1] - currMatch.range[0]) + 1;

        if (jokers[0] != 0) {
            const jokerArrangement = try getJokerPoses(ctx, word, jokers, cellPlaces);
            var highestScore: usize = 0;

            for (jokerArrangement.items) |jokerPoses| {
                currMatch.score = 0;

                for (0..wordRange) |idx| {
                    const currPoint = Point{@intCast(idx + currMatch.range[0]), currMatch.perpCoord};
                    //Not yet a letter and has perpendicular neighbor.s
                    const isJoker = (idx == jokerPoses[0].? or
                                    (jokerPoses[1] != null and idx == jokerPoses[1].?));

                    if (ctx.grid.isEmpty(currPoint) and ctx.grid.isAlphaPerp(currPoint)) {
                        if (!ctx.crossChecks[currPoint[1]][currPoint[0]].isSet(currMatch.word[idx] - 'A')) {
                            continue:outer;
                        }
                        currMatch.score += 
                            if (isJoker) 
                                ctx.crossChecksScore[currPoint[1]][currPoint[0]][26] 
                            else 
                                ctx.crossChecksScore[currPoint[1]][currPoint[0]][currMatch.word[idx] - 'A'];
                    }
                }
                currMatch.score += computeScorePar(ctx, &currMatch, jokerPoses);

                if ((std.mem.indexOfSentinel(u8, 0, currMatch.word[0..]) - mandatoryLen) == 7) {
                    currMatch.score += Scrabble;
                }
                if (currMatch.score > highestScore) {
                    highestScore = currMatch.score;
                    currMatch.jokerPoses = jokerPoses;
                }
            }
        } else {
            for (0..wordRange) |idx| {
                const currPoint = Point{@intCast(idx + currMatch.range[0]), currMatch.perpCoord};
                if (ctx.grid.isEmpty(currPoint) and ctx.grid.isAlphaPerp(currPoint)) {
                    if (!ctx.crossChecks[currPoint[1]][currPoint[0]].isSet(currMatch.word[idx] - 'A')) {
                        continue:outer;
                    }
                    currMatch.score += ctx.crossChecksScore[currPoint[1]][currPoint[0]][currMatch.word[idx] - 'A'];
                }
            }
            currMatch.score += computeScorePar(ctx, &currMatch, .{null, null});

            if ((std.mem.indexOfSentinel(u8, 0, currMatch.word[0..]) - mandatoryLen) == 7) {
                currMatch.score += Scrabble;
            }
        }
        try ctx.matchVec.append(currMatch);
    }
}

var totalRecord: u64 = 0;

fn evaluateCell(ctx: *Context, cellConst: *Constraints, cell: *Point) !void {
    var cellPerms = try ctx.basePerm.clone();

    var mandatoryIt: usize = 0;
    for (0..cellConst.ranges.items.len) |it| {
        if (cellConst.places.items[it].c[0] == 0) {
            const cellWords = try getBaseFilteredWordList(ctx, &cellPerms, &cellConst.ranges.items[it]);
            computeMatchs(ctx, cell, &cellWords, &cellConst.places.items[it], 0) catch continue;
            continue;
        }

        var mandatoryLen: usize = 0;
        for (cellConst.places.items[it].c) |ch| {
            if (ch == 0) break;
            mandatoryLen += 1;
        }

        for (cellPerms.keys()) |*permutation| {
            var newPermutation = try StringUnmanaged.initCapacity(ctx.alloc, (mandatoryLen + permutation.len) - mandatoryIt);
            newPermutation.appendSliceAssumeCapacity(permutation.*);

            for (cellConst.places.items[it].c[mandatoryIt..mandatoryLen]) |ch| {
                var i: usize = 0;
                while (i < newPermutation.items.len and newPermutation.items[i] <= ch) : (i += 1) {}
                newPermutation.insertAssumeCapacity(i, ch);
            }

            permutation.* = newPermutation.items[0..];
        }

        const cellWords = try getFilteredWordList(ctx, &cellPerms, &cellConst.places.items[it], &cellConst.ranges.items[it]);
        try computeMatchs(ctx, cell, &cellWords, &cellConst.places.items[it], mandatoryLen);
        mandatoryIt = mandatoryLen;
    }
}

const MatchVec              = ArrayList(Match);

fn lessThanMatch(_: void, a: Match, b: Match) bool {
    return (a.score < b.score);
}

fn sortMatchVec(matchVec: MatchVec) void {
    std.mem.sort(Match, matchVec.items[0..], {}, lessThanMatch);
}

pub fn getDummy(ctx: *Context, currPoint: Point, buffer: *[GRID_SIZE:0]u8) struct {u4, u8} {
    var start: u4 = currPoint[1];
    var end: u4 = currPoint[1];

    // Expand start and end positions in one loop for cache efficiency
    var moved = true;
    while (moved) {
        moved = false;
        if (start > 0 and ctx.grid.isAlpha(.{currPoint[0], start - 1})) {
            start -= 1;
            moved = true;
        }
        if (end < GRID_SIZE - 1 and ctx.grid.isAlpha(.{currPoint[0], end + 1})) {
            end += 1;
            moved = true;
        }
    }

    var score: u8 = 0;
    for (start..end + 1) |y| {
        if (y == currPoint[1]) {
            buffer[y - start] = '.';
        } else {
            buffer[y - start] = '@' + @as(u8, ctx.grid.getChar(.{currPoint[0], @intCast(y)}));
            score += LetterScore[ctx.grid.getChar(.{currPoint[0], @intCast(y)}) - 1];
        }
    }
    return .{currPoint[1] - start, score};
}

fn fillCrossCheck(ctx: *Context) !void {
    var buffer: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;

    for (0..GRID_SIZE) |y| {
        for (0..GRID_SIZE) |x| {
            const currPoint = Point{@intCast(x), @intCast(y)};
            ctx.crossChecks[y][x] = std.StaticBitSet(27).initEmpty();
            @memset(ctx.crossChecksScore[y][x][0..], 0);

            if (!ctx.grid.isEmpty(currPoint) or !ctx.grid.isAlphaPerp(currPoint)) continue;

            @memset(buffer[0..], 0);
            const dotPos, const dummyScore = getDummy(ctx, currPoint, &buffer);
            const wordLen = std.mem.indexOfSentinel(u8, 0, buffer[0..]);
            const letterModifier = ctx.grid.getLetterModifier(&currPoint);
            const wordModifier = ctx.grid.getWordModifier(&currPoint);

            for ('A'..'[' + 1) |ch| {
                const idx: usize = (ch - 'A');
                if (ch == '[') {
                    ctx.crossChecks[y][x].set(idx);
                    ctx.crossChecksScore[y][x][idx] = (dummyScore * wordModifier);
                    break;
                }
                buffer[dotPos] = @as(u8, @intCast(ch));
                ctx.mutex.lock();
                if (ctx.permInfos.dict.contains(buffer[0..wordLen])) {
                    ctx.crossChecks[y][x].set(idx);
                    ctx.crossChecksScore[y][x][idx] = (dummyScore + (LetterScore[idx] * letterModifier)) * wordModifier;
                }
                ctx.mutex.unlock();
            }
        }
    }
}

fn evaluateGrid(ctx: *Context, rY: Range, rX: Range) !void {
    for (rY[0]..rY[1]) |y| {
        for (rX[0]..rX[1]) |x| {
                var cell = Point{@intCast(x), @intCast(y)};
                var cellConst = Constraints.getCellConstraints(ctx, cell) catch continue;
                if (cellConst.places.items.len == 0)
                    continue;
                evaluateCell(ctx, &cellConst, &cell) catch continue;
        }
    }
}

fn routineSafe(gpa: Allocator, ctx: *Context, rY: Range, rX: Range, rotate: bool) void {
    var arena: std.heap.ArenaAllocator = .init(gpa);
    const arenaAlloc = arena.allocator();
    defer arena.deinit();

    var tmpCtx = ctx.clone(arenaAlloc) catch {return ;};

    if (rotate) tmpCtx.transposeGrid();
    fillCrossCheck(&tmpCtx) catch {};
    evaluateGrid(&tmpCtx, rY, rX) catch {};

    ctx.mutex.lock();
    defer ctx.mutex.unlock();

    tmpCtx.matchVec.allocator = ctx.alloc;
    const tmpRes = tmpCtx.matchVec.clone() catch {return ;};
    ctx.matchVec.appendSlice(tmpRes.items[0..]) catch {};
}

fn solveSingleThread(ctx: *Context, _: Allocator) !void {
    var startTime = try std.time.Timer.start();

    try fillCrossCheck(ctx);
    try evaluateGrid(ctx, .{0, GRID_SIZE}, .{0, GRID_SIZE});

    ctx.transposeGrid();

    try fillCrossCheck(ctx);
    try evaluateGrid(ctx, .{0, GRID_SIZE}, .{0, GRID_SIZE});

    sortMatchVec(ctx.matchVec);

    const elapsed = std.time.Timer.read(&startTime);
    const elapsedFormated = std.fmt.fmtDuration(elapsed);
    print("Elapsed: {}\n", .{elapsedFormated});
}

fn solveMultiThread(ctx: *Context, gpa: Allocator) !void {
    var startTime = try std.time.Timer.start();

    const nbWorker = 8;
    var pool: std.Thread.Pool = undefined;
    try pool.init(.{
        .allocator = gpa,
        .n_jobs = nbWorker,
    });
    defer pool.deinit();

    var waitGroup = std.Thread.WaitGroup{};
    waitGroup.reset();

    for (0..nbWorker) |i| {
        const unit = GRID_SIZE / (nbWorker / 2) + 1;
        const idx = @mod(i, nbWorker / 2);
        const from: u4 = @intCast(unit * idx);
        const to: u4 = if (unit * (idx + 1) > 15) 15 else @intCast(unit * (idx + 1));
        const flag = i >= nbWorker / 2;

        pool.spawnWg(&waitGroup, routineSafe, .{gpa, ctx, .{from, to}, .{0, GRID_SIZE}, flag});
    }

    pool.waitAndWork(&waitGroup);
    sortMatchVec(ctx.matchVec);

    // const recordFormated = std.fmt.fmtDuration(totalRecord);
    // std.debug.print("Total recorded: {}\n", .{recordFormated});

    const elapsed = std.time.Timer.read(&startTime);
    const elapsedFormated = std.fmt.fmtDuration(elapsed);
    std.log.info("Elapsed: {}", .{elapsedFormated});
}

const gpaConfig = std.heap.GeneralPurposeAllocatorConfig{
    .thread_safe = true,
    .safety = true,
    .retain_metadata = true,
};

const httpz = @import("httpz");
const PORT  = 8081;
const log   = std.log;

pub const App = struct {
    permInfos: *Context.CtxPerm,
    gpa: *Allocator,
};

pub const std_options = std.Options {
    .log_level = .info,
};

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
        res.status = 500;
        res.body = "Internal server error";
    }
}

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

pub fn main() !void {
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

    var router = server.router(.{});
    router.get("/solve", solve, .{});

    log.info("Solver listening http://{s}:{d}/", .{"0.0.0.0", PORT});

    server_instance = &server;
    try server.listen();
}
