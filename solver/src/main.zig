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
const computeScorePerp      = scoreModule.computeScorePerp;
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

pub fn orderU8(context: u8, item: u8) std.math.Order {
    return (std.math.order(context, item));
}

pub fn insertSortedAssumeCapacity(string: *String, ch: u8) void {
    const idx = std.sort.lowerBound(u8, string.items[0..], ch, orderU8);
    string.insertAssumeCapacity(idx, ch);
}

fn getFilteredWordList(ctx: *Context, perms: *const PermSet, cellPlacement: *const Placement, cellRange: *const Range) !StringVec {
    var vec = StringVec.init(ctx.alloc);

    var permIt = perms.iterator();
    while (permIt.next()) |kv| {
        ctx.mutex.lock();
        const permWords = ctx.orderedMap.data.get(kv.key_ptr.*) orelse {
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
        const permWords = ctx.orderedMap.data.get(kv.key_ptr.*) orelse {
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
    wildcards: [2]u8 = .{0, 0},

    pub fn init(currWord: []const u8, wildcards: [2]u8, cell: *const Point, ctxState: Direction) Match {
        var word: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
        std.mem.copyForwards(u8, word[0..], currWord);
        return .{
            .wildcards = wildcards,
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
};

fn isMandatory(ch: u8, pos: u4, cellPlaces: *const Placement) bool {
    for (cellPlaces.pos, cellPlaces.c) |letterPos, letterValue| {
        if (letterPos == 0 or letterPos > pos) return false;
        if (letterPos == pos and ch == letterValue) return true;
    }
    return false;
}

fn getWildCardPoses(ctx: *Context, word: []const u8, wildcards: [2]u8, cellPlaces: *const Placement) !ArrayList(u4) {
    var positions = ArrayList(u4).init(ctx.alloc);

    for (0..word.len) |i| {
        if (word[i] == wildcards[0] and !isMandatory(word[i], @as(u4, @intCast(i)) + 1, cellPlaces)) {
            try positions.append(@intCast(i));
        }
    }
    std.log.info("Possible: {any}\n", .{positions.items});
    return positions;
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
        const wildcards = kv[1];
        var currMatch = Match.init(word, wildcards, cell, ctx.state);

        std.log.info("word: {s}\n", .{word});
        if (wildcards[0] != 0) {
            const wildCardArrangments = try getWildCardPoses(ctx, word, wildcards, cellPlaces);
            var highestScore: usize = 0;
            for (wildCardArrangments.items) |ghostedPos| {

                for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
                    const currPoint = Point{@intCast(x), currMatch.perpCoord};
                    //Not yet a letter and has perpendicular neighbor.s
                    if (ctx.grid.grid[currMatch.perpCoord][x] == '.' and ctx.grid.isAlphaPerp(currPoint)) {
                        const currPointScore = computeScorePerp(ctx, currPoint, currMatch.word[x - currMatch.range[0]]) catch {
                            continue :outer;
                        };
                        currMatch.score += if ((x - currMatch.range[0]) == ghostedPos) 0 else currPointScore;
                    }
                }
                currMatch.score += computeScorePar(ctx, &currMatch, ghostedPos);

                if ((std.mem.indexOfSentinel(u8, 0, currMatch.word[0..]) - mandatoryLen) == 7) {
                    currMatch.score += Scrabble;
                }
                highestScore = if (currMatch.score > highestScore) currMatch.score else highestScore;
            }
            std.log.info("Highest Score: {d}\n", .{highestScore});
        }

        for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
            const currPoint = Point{@intCast(x), currMatch.perpCoord};
            if (ctx.grid.grid[currMatch.perpCoord][x] == '.' and ctx.grid.isAlphaPerp(currPoint)) {
                currMatch.score += computeScorePerp(ctx, currPoint, currMatch.word[x - currMatch.range[0]]) catch {
                    continue :outer;
                };
            }
        }
        // print("Word: {s}\n", .{currMatch.word});
        // print("score: {d}\n", .{currMatch.score});
        currMatch.score += computeScorePar(ctx, &currMatch, null);
        // print("score after: {d}\n", .{currMatch.score});

        if ((std.mem.indexOfSentinel(u8, 0, currMatch.word[0..]) - mandatoryLen) == 7) {
            currMatch.score += Scrabble;
        }
        try ctx.matchVec.append(currMatch);
    }
}

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
            var newPermutation = try String.initCapacity(ctx.alloc, (mandatoryLen + permutation.len) - mandatoryIt);
            newPermutation.appendSliceAssumeCapacity(permutation.*);
            for (mandatoryIt..mandatoryLen) |i| {
                insertSortedAssumeCapacity(&newPermutation, cellConst.places.items[it].c[i]);
            }
            permutation.* = newPermutation.items[0..];
        }

        const cellWords = try getFilteredWordList(ctx, &cellPerms, &cellConst.places.items[it], &cellConst.ranges.items[it]);
        try computeMatchs(ctx, cell, &cellWords, &cellConst.places.items[it], mandatoryLen);
        mandatoryIt = mandatoryLen;
    }
}

fn evaluateGrid(ctx: *Context) !void {
    for (0..GRID_SIZE) |y| {
        for (0..GRID_SIZE) |x| {
            // if (y == 14 and x == 0) {
                var cell = Point{@intCast(x), @intCast(y)};
                var cellConst = Constraints.getCellConstraints(ctx, cell) catch continue;
                if (cellConst.places.items.len == 0)
                    continue;
                std.log.info("Y:{d},X:{d}\n", .{y, x});
                std.log.info("{}", .{cellConst});
                evaluateCell(ctx, &cellConst, &cell) catch continue;
            // }
        }
    }
}

const MatchVec              = ArrayList(Match);

fn lessThanMatch(_: void, a: Match, b: Match) bool {
    return (a.score < b.score);
}

fn sortMatchVec(matchVec: MatchVec) void {
    std.mem.sort(Match, matchVec.items[0..], {}, lessThanMatch);
}

fn solveSingleThread(ctx: *Context) !void {
    const startTime = std.time.microTimestamp();

    try evaluateGrid(ctx);
    ctx.transposeGrid();
    try evaluateGrid(ctx);

    sortMatchVec(ctx.matchVec);

    // const format = 
    //     \\[{d}] = [
    //     \\  .word: {s},
    //     \\  .range: {d},
    //     \\  .perpCoord: {d},
    //     \\  .dir: {s},
    //     \\  .score: {d},
    //     \\  .wildcards: {s},
    //     \\]
    //     \\
    // ;
    //
    // for (ctx.matchVec.items, 0..) |match, i| {
    //     print(format, .{i, match.word, match.range, match.perpCoord, @tagName(match.dir), match.score, 
    //         match.wildcards});
    // }
    // for (ctxCopy.matchVec.items, 0..) |match, i| {
    //     print("[{d}]: {s} -> {d}\n", .{i, match.word, match.score});
    // }

    const endTime = std.time.microTimestamp();
    const elapsedMicro: i64 = endTime - startTime;
    const elapsedMilli: f64 = @as(f64, @floatFromInt(elapsedMicro)) / @as(f64, 1000);
    print("Elapsed: {d}µs | {d}ms\n", .{elapsedMicro, elapsedMilli});
}


//PERF: A grid where every cell is a bitmap of already explored paths of known letters
//  possible, impossible, unexplored --> could speed things up for wildcards

const gpaConfig = std.heap.GeneralPurposeAllocatorConfig{
    .thread_safe = true,
    .safety = true,
    .retain_metadata = true,
    .stack_trace_frames = 50,
};

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(gpaConfig) = .init;
    const gpaAlloc = gpa.allocator();
    defer _ = gpa.deinit();

    var arena: std.heap.ArenaAllocator = .init(gpaAlloc);
    const arenaAlloc = arena.allocator();
    defer arena.deinit();

    var ctx = try Context.init(arenaAlloc, "grid04.txt", "SALOPES");
    try solveSingleThread(&ctx);
}

test "simple test" {}
