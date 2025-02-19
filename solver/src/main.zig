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

const PermSet               = std.StringArrayHashMap(bool);
const String                = ArrayList(u8);
const StringUnmanaged       = std.ArrayListUnmanaged(u8);
const StringVec             = ArrayList([]const u8);

fn orderU8(context: u8, item: u8) std.math.Order {
    return (std.math.order(context, item));
}

fn lessThanMatch(context: void, a: Match, b: Match) bool {
    _ = context;
    return (a.score < b.score);
}

pub fn insertSorted(string: *String, ch: u8) !void {
    const idx = std.sort.lowerBound(u8, string.items[0..], ch, orderU8);
    try string.insert(idx, ch);
}

pub fn insertSortedAssumeCapacity(string: *StringUnmanaged, ch: u8) void {
    const idx = std.sort.lowerBound(u8, string.items[0..], ch, orderU8);
    string.insertAssumeCapacity(idx, ch);
}

fn popSorted(string: *String, ch: u8) !void {
    const idx = std.sort.binarySearch(u8, string.items[0..], ch, orderU8) orelse return error.NoWordCanBeginHere;
    _ = string.orderedRemove(idx);
}

pub fn permutationsSort(alloc: Allocator, perms: *PermSet, pattern: *String, buffer: *String, patternI: usize, minLen: usize, maxLen: usize) !void {
    if (buffer.items.len != 0) {
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen and !perms.contains(buffer.items)) {
            try perms.put(try alloc.dupe(u8, buffer.items), true);
        }
    }
    if (patternI >= pattern.items.len)
        return;

    try insertSorted(buffer, pattern.items[patternI]);
    try permutationsSort(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);

    try popSorted(buffer, pattern.items[patternI]);
    try permutationsSort(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);
}

fn getFilteredWordList(ctx: *const Context, perms: *const PermSet, cellPlacement: *const Placement, cellRange: *const Range) !StringVec {
    var vec = StringVec.init(ctx.alloc);

    for (perms.keys()) |*permutation| {
        const permWords = ctx.orderedMap.data.get(permutation.*) orelse continue;
        outer: for (permWords.keys()) |word| {
            if (word.len < cellRange[0] or word.len > cellRange[1]) continue;
            for (0..cellPlacement.c.len) |it| {
                if (cellPlacement.c[it] == 0) break;
                if (word[cellPlacement.pos[it] - 1] != cellPlacement.c[it]) continue :outer;
            }
            try vec.append(word);
        }
    }
    return vec;
}

fn getBaseFilteredWordList(ctx: *const Context, perms: *const PermSet, range: *const Range) !StringVec {
    var vec = StringVec.init(ctx.alloc);

    for (perms.keys()) |*permutation| {
        const permWords = ctx.orderedMap.data.get(permutation.*) orelse continue;
        for (permWords.keys()) |*word| {
            if (word.*.len < range[0] or word.*.len > range[1]) continue;
            try vec.append(word.*);
        }
    }
    return vec;
}

pub const Match = struct {
    word: [GRID_SIZE:0]u8,
    dir: Direction,
    range: Range,
    saveCoord: u4,
    score: u32,
    validate: bool = false,

    pub fn init(currWord: []const u8, cell: *const Point, ctxState: Direction) Match {
        var word: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
        std.mem.copyForwards(u8, word[0..], currWord);
        return .{
            .dir = ctxState,
            .word = word,
            .range = Range{
                cell[0],
                cell[0] + (@as(u4, @intCast(currWord.len)) - 1),
            },
            .saveCoord = cell[1], //FIX: should be based on direction
            .score = 0,
        };
    }
};

const MatchVec  = ArrayList(Match);
const Point     = @Vector(2, u4);
const Range     = @Vector(2, u4);

const Placement = struct {
    c:   [GRID_SIZE:0]u8   = .{0} ** GRID_SIZE,
    pos: [GRID_SIZE:0]u4   = .{0} ** GRID_SIZE,
};

const Constraints = struct {
    ranges: ArrayList(Range),
    places: ArrayList(Placement),

    pub fn init(alloc: Allocator) !Constraints {
        return .{
            .ranges = try ArrayList(Range).initCapacity(alloc, 10),
            .places = try ArrayList(Placement).initCapacity(alloc, 10),
        };
    }

    pub fn format(self: *const Constraints, comptime fmt: []const u8, _: std.fmt.FormatOptions, writer: anytype) !void {
        _ = fmt;
        _ = try writer.write("---Constraint---\n");
        for (0..self.ranges.items.len) |i| {
            const range = self.ranges.items[i];
            const place = self.places.items[i];
            try writer.print("R: {d}-{d}\n", .{range[0], range[1]});
            for (0..place.pos.len) |j| {
                if (place.pos[j] == 0) 
                    break;
                try writer.print("P[{d}]: {c} {d}\n", .{j, place.c[j], place.pos[j] - 1});
            }
            _ = try writer.write("~~~~~~~~~~~~~~~~\n");
        }
        _ = try writer.write("----------------\n");
    }
};

const GridError = error {
    NoWordCanBeginHere,
    OutOfBounds,
    UnknownWord,
};

fn rGetConstraints(
    ctx: *Context,
    cellConst: *Constraints, //Constraints of the current cell
    cell: Point,
    cBuff: *[GRID_SIZE:0]u8, //Buffer to hold mandatory letters
    posBuff: *[GRID_SIZE:0]u4 //Buffer to hold their positions
) !void {
    //Iterator on buffers
    var constIt: usize = 0;
    //Number of letters from the rack needed to form the constraint
    var placed:u4 = 0;
    //Virtual cursor for the function
    var cursor: Point = cell;
    const wordStart: u4 = cell[0];
    //Our loop breaker
    var hasPushed = true;
    var loopIterator: usize = 0;

    while (hasPushed) {
        defer loopIterator += 1;
        hasPushed = false;

        if (cursor[0] < GRID_SIZE and ctx.grid.isAlpha(cursor) and loopIterator == 0) {
            while (cursor[0] < GRID_SIZE and ctx.grid.isAlpha(cursor) and placed < ctx.rack.items.len) {
                cBuff[constIt] = try ctx.grid.getChar(cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
        }

        if (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and loopIterator == 0) {
            var rangeS: ?u4 = null;
            while (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and placed < ctx.rack.items.len) {
                //If we have a letter above or bellow, we set the rangeStart to that distance
                if (ctx.grid.isAlphaPerp(cursor)) {
                    if (rangeS == null)
                        rangeS = cursor[0] - wordStart + 1;
                }
                cursor[0] += 1;
                placed += 1;
            }
            //If we already had letters in posBuff and we sat rangeS > lastLetterFound + 1, then we reset it to <-
            if (constIt != 0 and (rangeS == null or rangeS.? > posBuff[constIt - 1] + 1)) {
                rangeS = posBuff[constIt - 1] + 1;
            }

            //Backtrack if we hit a letter till we have a space to our right
            while (ctx.grid.isInBounds(cursor) and placed > 0 and 
                  (ctx.grid.isAlpha(cursor) or ctx.grid.isAlphaRight(cursor)))
            {
                cursor[0] -= 1;
                placed -= 1;
            }
            if (placed == 0 and ctx.grid.isAlpha(cursor)) {
                hasPushed = true;
                continue;
            }
            var rangeEnd = cursor[0] - wordStart;
            if (rangeS != null and rangeEnd < rangeS.? and ctx.grid.isAlphaRight(cursor)) {
                hasPushed = true;
                continue;
            }
            rangeEnd += if (placed == ctx.rack.items.len or cursor[0] == GRID_SIZE) 0 else 1;

            //Fix range at min 2 as a word can't be a single letter
            rangeS = if (rangeS != null and rangeS.? < 2) 2 else rangeS;

            if (cursor[0] < GRID_SIZE and !ctx.grid.isAlphaRight(cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }

            if (rangeS != null and rangeEnd >= 2 and rangeEnd >= rangeS.?) {
                try cellConst.ranges.append(.{rangeS.?, rangeEnd});
                try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
            }
            if (rangeS == null and cursor[0] == GRID_SIZE and constIt != 0)
                cursor[0] -= 1;
            //If we didn't find any perpAlpha and we're at the end of our frame 
            //and we didn't find any letter along the way, we know for sure no word is possible here
            if ((rangeS == null and cursor[0] == 14 and constIt == 0) or 
               ((rangeS != null and cursor[0] == 14))) 
                    break;

            hasPushed = true;
            continue;
        }

        if (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and loopIterator != 0 and placed < ctx.rack.items.len) {
            while (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }
            while (cursor[0] < GRID_SIZE and ctx.grid.isAlpha(cursor)) {
                cBuff[constIt] = try ctx.grid.getChar(cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
            var rangeS = (cursor[0] - wordStart);
            var rangeEnd = (cursor[0] - wordStart);

            //Fix for words beginning with an already placed letter that has holes right after it
            const posBuffLen = std.mem.indexOfSentinel(u4, 0, posBuff);
            if (posBuffLen > 0 and rangeS < GRID_SIZE) {
                rangeS = posBuff[posBuffLen - 1];
                if (ctx.grid.isAlpha(.{posBuff[posBuffLen - 1], cursor[1]})) {
                    rangeS += 1;
                }
                rangeS = if (rangeS < 2) 2 else rangeS;
                rangeS = if (rangeS > rangeEnd) rangeEnd else rangeS;
            }

            while (cursor[0] < GRID_SIZE and !ctx.grid.isAlphaRight(cursor) and placed < ctx.rack.items.len) {
                rangeEnd += 1;
                placed += 1;
                cursor[0] += 1;
            }
            if (cursor[0] <= GRID_SIZE and placed <= ctx.rack.items.len and rangeEnd >= 2) {
                try cellConst.ranges.append(.{rangeS, rangeEnd});
                try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
                if (placed < ctx.rack.items.len)
                    hasPushed = true;
            }
        }
    }
} 

fn getConstraints(ctx: *Context, cell: Point) !Constraints {
    if (cell[0] > 0 and ctx.grid.isAlphaLeft(cell))
        return GridError.NoWordCanBeginHere;

    var cellConst = try Constraints.init(ctx.alloc);

    var c:[GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
    var pos:[GRID_SIZE:0]u4 = .{0} ** GRID_SIZE;

    try rGetConstraints(ctx, &cellConst, cell, &c, &pos);

    return cellConst;
}

fn computeMatchs(ctx: *Context, cell: *const Point, wordVec: *const StringVec, mandatoryLen: usize) !void {
    outer: for (wordVec.items) |word| {
        var currMatch = Match.init(word, cell, ctx.state);

        for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
            const currPoint = Point{@intCast(x), currMatch.saveCoord};
            if (ctx.grid.grid[currMatch.saveCoord][x] == '.' and ctx.grid.isAlphaPerp(currPoint)) {
                currMatch.score += computeScorePerp(ctx, currPoint, currMatch.word[x - currMatch.range[0]]) catch {
                    continue :outer;
                };
            }
        }
        currMatch.score += computeScorePar(ctx, &currMatch);

        if ((std.mem.indexOfSentinel(u8, 0, currMatch.word[0..]) - mandatoryLen) == 7) {
            currMatch.score += Scrabble;
        }
        try ctx.matchVec.append(currMatch);
    }
}

fn evaluateCell(ctx: *Context, cellConst: *Constraints, cell: *Point) !void {
    var cellPerms = try ctx.basePerm.clone();
    defer cellPerms.deinit();

    var mandatoryIt: usize = 0;
    for (0..cellConst.ranges.items.len) |it| {
        if (cellConst.places.items[it].c[0] == 0) {
            const cellWords = try getBaseFilteredWordList(ctx, &cellPerms, &cellConst.ranges.items[it]);
            computeMatchs(ctx, cell, &cellWords, 0) catch continue;
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
            for (mandatoryIt..mandatoryLen) |i| {
                insertSortedAssumeCapacity(&newPermutation, cellConst.places.items[it].c[i]);
            }
            permutation.* = newPermutation.items[0..];
        }

        const cellWords = try getFilteredWordList(ctx, &cellPerms, &cellConst.places.items[it], &cellConst.ranges.items[it]);
        try computeMatchs(ctx, cell, &cellWords, mandatoryLen);
        mandatoryIt = mandatoryLen;
    }
}

fn evaluateGrid(ctx: *Context) !void {
    for (0..GRID_SIZE) |y| {
        for (0..GRID_SIZE) |x| {
            // if (y == 12 and x == 1) {
                var cell = Point{@intCast(x), @intCast(y)};
                var cellConst = getConstraints(ctx, cell) catch continue;
                if (cellConst.places.items.len == 0)
                    continue;
                // print("Y:{d},X:{d}\n", .{y, x});
                // print("{}", .{cellConst});
                evaluateCell(ctx, &cellConst, &cell) catch continue;
            // }
        }
    }
}

fn solveGrid(ctx: *Context) !i64 {
    const startTime = std.time.microTimestamp();

    // for (wordVec.items, 0..) |word, i| {
    //     print("vect[{d}] = {s}\n", .{i, word});
    // }

    try evaluateGrid(ctx);

    //Transpose the grid and update ctx.state to Vertical
    ctx.transposeGrid();

    try evaluateGrid(ctx);
    std.mem.sort(Match, ctx.matchVec.items[0..], {}, lessThanMatch);
    // const format = 
    //     \\[{d}] = [
    //     \\  .word: {s},
    //     \\  .range: {d},
    //     \\  .saveCoord: {d},
    //     \\  .dir: {s},
    //     \\  .score: {d},
    //     \\]
    //     \\
    // ;
    //
    // for (ctx.matchVec.items, 0..) |match, i| {
    //     // print("word[{d}] = {\n\t.range: {d}\n\t.saveCoord: {d}\n\t.dir: {s}\n\t.score: {d}\n}", .{i, match.range, match.saveCoord, @tagName(match.dir), match.score});
    //     print(format, .{i, match.word, match.range, match.saveCoord, @tagName(match.dir), match.score});
    // }
    // for (ctx.matchVec.items, 0..) |match, i| {
    //     print("[{d}]: {s} -> {d}\n", .{i, match.word, match.score});
    // }
    //
    // for (ctx.grid.grid) |line| {
    //     print("{s}\n", .{line});
    // }

    // for (ctx.grid.modifiers) |line| {
    //     for (line) |mod| {
    //         switch (mod) {
    //             .DLETTER => print("D", .{}),
    //             .TLETTER => print("T", .{}),
    //             .DWORD => print("L", .{}),
    //             .TWORD => print("O", .{}),
    //             .NONE => print(".", .{}),
    //         }
    //     }
    //     print("\n", .{});
    // }

    const endTime = std.time.microTimestamp();
    const elapsedMicro: i64 = endTime - startTime;
    const elapsedMilli: f64 = @as(f64, @floatFromInt(elapsedMicro)) / @as(f64, 1000);
    _ = elapsedMilli;

    // print("Elapsed: {d}µs | {d}ms\n", .{elapsedMicro, elapsedMilli});
    return elapsedMicro;
}

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(.{}) = .init;
    const GpaAlloc = gpa.allocator();
    defer _ = gpa.deinit();

    var arena = std.heap.ArenaAllocator.init(GpaAlloc);
    const ArenaAlloc = arena.allocator();
    defer arena.deinit();

    var ctx = try Context.init(ArenaAlloc, "grid00.txt", "??POTER");
    // for (ctx.basePerm.keys()) |key| {
    //     print("KEY: {s}\n", .{key});
    // }
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid01.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid02.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid03.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid04.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid05.txt");
    // try solveGrid(&ctx); 

    var argIt = std.process.args();
    _ = argIt.skip(); //Skps program name
    const loopCountStr = argIt.next() orelse "1";
    const loopCountInt = std.fmt.parseInt(usize, loopCountStr, 10) catch {
        print("Argument must be an integer\n", .{});
        return;
    };

    var times = ArrayList(i64).init(ctx.alloc);
    try ctx.loadGrid("grid06.txt");
    for (0..loopCountInt) |_| {
        defer {
            ctx.matchVec.deinit();
            ctx.matchVec = MatchVec.init(ctx.alloc);
        }
        try times.append(try solveGrid(&ctx));
    }

    var totalTime: i64 = 0;
    for (times.items) |timeMicro| {
        totalTime += timeMicro;
    }
    const averageTimeMicro: f64 = @as(f64, @floatFromInt(totalTime)) / @as(f64, @floatFromInt(loopCountInt));
    const averageTimeMilli :f64 = @as(f64, @floatFromInt(totalTime)) / @as(f64, (1000 * @as(f64, @floatFromInt(loopCountInt)))); 
    print("Average: {d}µs | {d}ms\n", .{averageTimeMicro, averageTimeMilli});

}

test "simple test" {}
