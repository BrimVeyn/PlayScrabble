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

pub fn orderU8(context: u8, item: u8) std.math.Order {
    return (std.math.order(context, item));
}

pub fn insertSortedAssumeCapacity(string: *String, ch: u8) void {
    var i: usize = 0;
    while (i < string.items.len and string.items[i] <= ch) : (i += 1) {}
    string.insertAssumeCapacity(i, ch);
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
        if (word[i] == jokers[0] and !isMandatory(word[i], @as(u4, @intCast(i)) + 1, cellPlaces)) {
            try posFirst.append(@intCast(i));
        }
        if (word[i] == jokers[1] and !isMandatory(word[i], @as(u4, @intCast(i)) + 1, cellPlaces)) {
            try posSecond.append(@intCast(i));
        }
    }

    var posFinal = ArrayList([2]?u4).init(ctx.alloc);

    for (posFirst.items) |pos1| {
        if (posSecond.items.len == 0) {
            try posFinal.append(.{pos1, null});
            continue;
        }
        //NOTE: Not optimal as if the two jokers are identical on this try it'll duplicate possibilities
        //ex: .{3, 6}, .{6, 3}
        for (posSecond.items) |pos2| {
            if (pos1 != pos2) try posFinal.append(.{pos1, pos2});
        }
    }
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

        if (jokers[0] != 0) {
            // std.log.info("--------------------------", .{});
            // std.log.info("TRYING WORD: {s}", .{word});
            const jokerArrangement = try getJokerPoses(ctx, word, jokers, cellPlaces);
            var highestScore: usize = 0;

            for (jokerArrangement.items) |jokerPoses| {
                currMatch.score = 0;

                for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
                    const currPoint = Point{@intCast(x), currMatch.perpCoord};
                    //Not yet a letter and has perpendicular neighbor.s
                    const isJoker = (x - currMatch.range[0] == jokerPoses[0].? or
                                    jokerPoses[1] != null and x - currMatch.range[0] == jokerPoses[1].?);

                    if (ctx.grid.isEmpty(currPoint) and ctx.grid.isAlphaPerp(currPoint)) {
                        if (!ctx.crossChecks[currPoint[1]][currPoint[0]].isSet(currMatch.word[x - currMatch.range[0]] - 'A')) {
                            continue:outer;
                        }
                        currMatch.score += 
                            if (isJoker) 
                                ctx.crossChecksScore[currPoint[1]][currPoint[0]][26] 
                            else 
                                ctx.crossChecksScore[currPoint[1]][currPoint[0]][currMatch.word[x - currMatch.range[0]] - 'A'];
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
            for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
                const currPoint = Point{@intCast(x), currMatch.perpCoord};
                if (ctx.grid.isEmpty(currPoint) and ctx.grid.isAlphaPerp(currPoint)) {
                    if (!ctx.crossChecks[currPoint[1]][currPoint[0]].isSet(currMatch.word[x - currMatch.range[0]] - 'A')) {
                        continue:outer;
                    }
                    currMatch.score += ctx.crossChecksScore[currPoint[1]][currPoint[0]][currMatch.word[x - currMatch.range[0]] - 'A'];
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

var totalRecord: i64 = 0;

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

        // const st = std.time.microTimestamp();
        for (cellPerms.keys()) |*permutation| {
            var newPermutation = try String.initCapacity(ctx.alloc, (mandatoryLen + permutation.len) - mandatoryIt);
            newPermutation.appendSliceAssumeCapacity(permutation.*);

            for (mandatoryIt..mandatoryLen) |i| {
                insertSortedAssumeCapacity(&newPermutation, cellConst.places.items[it].c[i]);
            }
            permutation.* = newPermutation.items[0..];
        }
        // const et = std.time.microTimestamp();
        // totalRecord += (et - st);

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
                // std.log.info("Y:{d},X:{d}\n", .{y, x});
                // std.log.info("{}", .{cellConst});
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
            // print("pos: {d}, ch: {c}\n", .{currPoint, try getChar(ctx.grid, currPoint)});
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

            for ('A'..'[' + 1) |ch| {
                if (ch == '[') {
                    ctx.crossChecks[y][x].set(ch - 'A');
                    ctx.crossChecksScore[y][x][ch - 'A'] = (dummyScore * ctx.grid.getWordModifier(&currPoint));
                    break;
                }
                buffer[dotPos] = @as(u8, @intCast(ch));
                if (ctx.dict.contains(buffer[0..wordLen])) {
                    ctx.crossChecks[y][x].set(ch - 'A');
                    ctx.crossChecksScore[y][x][ch - 'A'] = (dummyScore + (LetterScore[ch - 'A'] * ctx.grid.getLetterModifier(&currPoint))) * ctx.grid.getWordModifier(&currPoint);
                }
            }
        }
    }
}

fn solveSingleThread(ctx: *Context) !void {
    const startTime = std.time.microTimestamp();

    try fillCrossCheck(ctx);
    try evaluateGrid(ctx);

    ctx.transposeGrid();

    try fillCrossCheck(ctx);
    try evaluateGrid(ctx);

    sortMatchVec(ctx.matchVec);

    // std.debug.print("Total recorded: {d}us | {d}ms\n", .{totalRecord, @as(f64, @floatFromInt(totalRecord)) / @as(f64, 1000)});

    // const format = 
    //     \\[{d}] = [
    //     \\  .word: {s},
    //     \\  .range: {d},
    //     \\  .perpCoord: {d},
    //     \\  .dir: {s},
    //     \\  .score: {d},
    //     \\  .jokers: {s},
    //     \\  .jokerPose: {any},
    //     \\]
    //     \\
    // ;
    //
    // for (ctx.matchVec.items, 0..) |match, i| {
    //     print(format, .{i, match.word, match.range, match.perpCoord, @tagName(match.dir), match.score, 
    //         match.jokers, match.jokerPoses});
    // }
    for (ctx.matchVec.items, 0..) |match, i| {
        std.log.info("[{d}]: {s} -> {d} | WC: {s}", .{i, match.word, match.score, match.jokers});
    }

    const endTime = std.time.microTimestamp();
    const elapsedMicro: i64 = endTime - startTime;
    const elapsedMilli: f64 = @as(f64, @floatFromInt(elapsedMicro)) / @as(f64, 1000);
    print("Elapsed: {d}µs | {d}ms\n", .{elapsedMicro, elapsedMilli});
}

const gpaConfig = std.heap.GeneralPurposeAllocatorConfig{
    .thread_safe = true,
    .safety = true,
    // .retain_metadata = true,
    // .stack_trace_frames = 50,
};

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(gpaConfig) = .init;
    const gpaAlloc = gpa.allocator();
    defer _ = gpa.deinit();

    var arena: std.heap.ArenaAllocator = .init(gpaAlloc);
    const arenaAlloc = arena.allocator();
    defer arena.deinit();

    var ctx = try Context.init(arenaAlloc, "grid04.txt", "SALOP??");
    try solveSingleThread(&ctx);
}

test "simple test" {}
