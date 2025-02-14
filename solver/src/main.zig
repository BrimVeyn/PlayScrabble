const std               = @import("std");
const dict              = @embedFile("generate/Data.txt");
const print             = std.debug.print;
const AutoArrayHashMap  = std.AutoArrayHashMap;
const AutoHashMap       = std.AutoHashMap;
const ArrayList         = std.ArrayList;
const Allocator         = std.mem.Allocator;

const gridFile          = @import("Grid.zig");
const Grid              = gridFile.Grid;
const GRID_SIZE         = 15;

const generator             = @import("generate/generate.zig");
const OrderedMap            = generator.OrderedMap;
const asciiOrderedMapPath   = generator.asciiOrderedMapPath;
const Map                   = generator.Map;

const PermSet     = std.StringArrayHashMap(bool);
const String      = ArrayList(u8);
const StringVec   = ArrayList([]const u8);

pub fn permutations(alloc: Allocator, perms: *PermSet, pattern: *String, buffer: *String, patternI: usize, minLen: usize, maxLen: usize) !void {
    if (buffer.items.len != 0) {
        // if (buffer.items.len >= minLen and buffer.items.len <= maxLen and
        //     !perms.contains(buffer.items) and ctx.orderedMap.data.contains(buffer.items)) 
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen and
            !perms.contains(buffer.items)) 
        {
            try perms.put(try alloc.dupe(u8, buffer.items), true);
        }
    }
    if (patternI >= pattern.items.len)
        return;

    try buffer.append(pattern.items[patternI]);
    try permutations(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);

    _ = buffer.pop();
    try permutations(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);
}

fn orderU8(context: u8, item: u8) std.math.Order {
    return (std.math.order(context, item));
}

fn insertSorted(string: *String, ch: u8) !void {
    const idx = std.sort.lowerBound(u8, string.items[0..], ch, orderU8);
    try string.insert(idx, ch);
}

fn popSorted(string: *String, ch: u8) !void {
    const idx = std.sort.binarySearch(u8, string.items[0..], ch, orderU8) orelse return error.NoWordCanBeginHere;
    _ = string.orderedRemove(idx);
}

pub fn permutationsSortTest(alloc: Allocator, perms: *PermSet, pattern: *String, buffer: *String, patternI: usize, minLen: usize, maxLen: usize) !void {
    if (buffer.items.len != 0) {
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen and !perms.contains(buffer.items)) {
            try perms.put(try alloc.dupe(u8, buffer.items), true);
        }
    }
    if (patternI >= pattern.items.len)
        return;

    try insertSorted(buffer, pattern.items[patternI]);
    // try buffer.append(pattern.items[patternI]);
    try permutationsSortTest(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);

    try popSorted(buffer, pattern.items[patternI]);
    // _ = buffer.pop();
    try permutationsSortTest(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);
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
    // try buffer.append(pattern.items[patternI]);
    try permutationsSort(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);

    try popSorted(buffer, pattern.items[patternI]);
    // _ = buffer.pop();
    try permutationsSort(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);
}

pub fn populateMap(alloc: Allocator) !Map {
    var mapFile = try std.fs.cwd().openFile(asciiOrderedMapPath, .{});
    defer mapFile.close();

    const rawContent = try mapFile.readToEndAlloc(alloc, 10_000_000_000);

    const map = try Map.fromJson(alloc, rawContent);
    return map;
}

fn lessThan(context: void, a: u8, b: u8) bool {
    _ = context;
    return (a < b);
}

fn getWordList(alloc: Allocator, perms: *PermSet, orderedMap: Map) !StringVec {
    var vec = StringVec.init(alloc);

    for (perms.keys()) |permutation| {
        const permWords = orderedMap.data.get(permutation) orelse continue;
        for (permWords.keys()) |word| {
            try vec.append(word);
        }
    }
    return vec;
}

const Match = struct {
    word: [15]u8,
};

const MatchVec  = ArrayList(Match);
const Point     = @Vector(2, u4);
const Range     = @Vector(2, u4);

const Placement = struct {
    c:   [15:0]u8   = .{0} ** 15,
    pos: [15:0]u4   = .{0} ** 15,
};

const Constraints = struct {
    ranges: ArrayList(Range),
    places: ArrayList(Placement),

    pub fn init(alloc: Allocator) Constraints {
        return .{
            .ranges = ArrayList(Range).init(alloc),
            .places = ArrayList(Placement).init(alloc),
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

const Context = struct {
    grid: Grid,
    rack: String,
    basePerm: PermSet,
    orderedMap: Map,
    alloc: Allocator,

    pub fn init(alloc: Allocator, gridState: []const u8, rackValue: []const u8) !Context {
        var grid = Grid.init();
        try grid.loadGridState(gridState);

        var rack = String.init(alloc);
        try rack.appendSlice(rackValue);
        std.mem.sort(u8, rack.items[0..], {}, lessThan);

        var buffer = String.init(alloc);
        defer buffer.deinit();

        var perms = PermSet.init(alloc);
        try permutations(alloc, &perms, &rack, &buffer, 0, 2, rack.items.len);
        // for (perms.keys(), 0..) |word, i| {
        //     print("vect[{d}] = {s}\n", .{i, word});
        // }
        return .{
            .grid = grid,
            .rack = rack,
            .orderedMap = try populateMap(alloc),
            .alloc = alloc,
            .basePerm = perms,
        };
    }

    pub fn loadGrid(self: *Context, gridState: []const u8) !void {
        // print("~~~~~~~~~LOADING: {s}~~~~~~~~~~~\n", .{gridState});
        try self.grid.loadGridState(gridState);
    }
};

fn isAlpha(grid: Grid, cell: Point) bool {
    return (grid.grid[cell[1]][cell[0]] >= 'A' and grid.grid[cell[1]][cell[0]] <= 'Z');
}

fn isAlphaLeft(grid: Grid, cell:Point) bool {
    if (cell[0] > 0) {
        const left = Point{cell[0] - 1, cell[1]};
        if (isAlpha(grid, left)) return true;
    }
    return false;
}

fn isAlphaRight(grid: Grid, cell:Point) bool {
    if (cell[0] < (GRID_SIZE - 1)) {
        const right = Point{cell[0] + 1, cell[1]};
        if (isAlpha(grid, right)) return true;
    }
    return false;
}

fn isEmpty(grid: Grid, cell: Point) bool {
    return !isAlpha(grid, cell);
}

fn isAlphaPerp(grid: Grid, cell: Point) bool {
    if (cell[1] > 0) {
        const up = Point{cell[0], cell[1] - 1};
        if (isAlpha(grid, up)) return true;
    }
    if (cell[1] < (GRID_SIZE - 1)) {
        const down = Point{cell[0], cell[1] + 1};
        if (isAlpha(grid, down)) return true;
    }
    return false;
}

fn isAlphaPar(grid: Grid, cell: Point) bool {
    if (cell[0] > 0) {
        const left = Point{cell[0] - 1, cell[1]};
        if (isAlpha(grid, left)) return true;
    }
    if (cell[0] < (GRID_SIZE - 1)) {
        const right = Point{cell[0] + 1, cell[1]};
        if (isAlpha(grid, right)) return true;
    }
    return false;
}

fn getChar(grid: Grid, cell: Point) u8 { 
    if (cell[0] >= 0 and cell[0] < 15) {
        return grid.grid[@intCast(cell[1])][@intCast(cell[0])];
    } else return '~';
}

const GridError = error {
    NoWordCanBeginHere,
};

fn rGetConstraints(ctx: *Context, cellConst: *Constraints, cell: Point, cBuff: *[15:0]u8, posBuff: *[15:0]u4) !void {
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
        //Reset it to false everytime
        hasPushed = false;

        if (cursor[0] < 15 and isAlpha(ctx.grid, cursor) and loopIterator == 0) {
            while (cursor[0] < 15 and isAlpha(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                cBuff[constIt] = getChar(ctx.grid, cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
        }
        // print("[-1]Placed: {d}\n", .{placed});
        // print("[-1]Cursor: {d}\n", .{cursor});

        if (cursor[0] < 15 and !isAlpha(ctx.grid, cursor) and loopIterator == 0) {
            var rangeS: ?u4 = null;
            while (cursor[0] < 15 and !isAlpha(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                //If we have a letter above or bellow, we set the rangeStart to that distance
                if (isAlphaPerp(ctx.grid, cursor)) {
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
            // print("[1]RS: {any}\n", .{rangeS});
            // print("[2]PUSHED\n", .{});
            // print("[2]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[2]Cursor: {d}\n", .{cursor});
            // print("[2]Char: {c}\n", .{getChar(ctx.grid, cursor)});
            while (cursor[0] > 0 and cursor[0] < 15 and placed > 0 and (isAlpha(ctx.grid, cursor) or isAlphaRight(ctx.grid, cursor))) {
                cursor[0] -= 1;
                placed -= 1;
            }
            if (placed == 0 and isAlpha(ctx.grid, cursor)) {
                hasPushed = true;
                continue;
            }
            // print("[1]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[1]Cursor: {d}\n", .{cursor});
            // print("[1]Char: {c}\n", .{getChar(ctx.grid, cursor)});
            // if (cursor[0] < wordStart) 
            //     break;
            var rangeEnd = cursor[0] - wordStart;
            if (rangeS != null and rangeEnd < rangeS.? and isAlphaRight(ctx.grid, cursor)) {
                hasPushed = true;
                continue;
            }
            rangeEnd += if (placed == ctx.rack.items.len or cursor[0] == 15) 0 else 1;
            // print("[1]RS: {any}\n", .{rangeS});
            // print("[1]RE: {d}\n", .{rangeEnd});

            //Fix range at min 2 as a word can't be a single letter
            rangeS = if (rangeS != null and rangeS.? < 2) 2 else rangeS;

            if (cursor[0] < 15 and !isAlphaRight(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }

            if (rangeS != null and rangeEnd >= 2 and rangeEnd >= rangeS.?) {
                // print("[1]PUSHED\n", .{});
                // print("[1]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
                // print("[1]Cursor: {d}\n", .{cursor});
                // print("[1]Char: {c}\n", .{getChar(ctx.grid, cursor)});
                try cellConst.ranges.append(.{rangeS.?, rangeEnd});
                try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
            }
            if (rangeS == null and cursor[0] == 15 and constIt != 0)
                cursor[0] -= 1;
            //If we didn't find any perpAlpha and we're at the end of our frame 
            //and we didn't find any letter along the way, we know for sure no word is possible here
            if (rangeS == null and cursor[0] == 14 and constIt == 0)
                break;
            if (rangeS != null and cursor[0] == 14)
                break;
            hasPushed = true;
            continue;
        }

        // print("[2]Placed: {d}\n", .{placed});
        // print("[2]Cursor: {d}\n", .{cursor});
        if (cursor[0] < 15 and !isAlpha(ctx.grid, cursor) and loopIterator != 0 and placed < ctx.rack.items.len) {
            while (cursor[0] < 15 and !isAlpha(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }
            while (cursor[0] < 15 and isAlpha(ctx.grid, cursor)) {
                cBuff[constIt] = getChar(ctx.grid, cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
            var rangeS = (cursor[0] - wordStart);
            var rangeEnd = (cursor[0] - wordStart);

            // placed += if (cursor[0] < 15 and !isAlpha(ctx.grid, cursor)) 1 else 0;
            //Fix for words beginning with an already placed letter that has holes right after it
            const posBuffLen = std.mem.indexOfSentinel(u4, 0, posBuff);
            if (posBuffLen > 0 and rangeS < 15) {
                // print("[1]RS: {d}\n", .{rangeS});
                rangeS = posBuff[posBuffLen - 1];
                if (isAlpha(ctx.grid, .{posBuff[posBuffLen - 1], cursor[1]})) {
                    rangeS += 1;
                }
                // print("[2]RS: {d}\n", .{rangeS});
                rangeS = if (rangeS < 2) 2 else rangeS;
                rangeS = if (rangeS > rangeEnd) rangeEnd else rangeS;
            }

            // print("[2]RS: {d}\n", .{rangeS});
            // print("[2]RE: {d}\n", .{rangeEnd});
            // print("[2]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[2]Cursor: {d}\n", .{cursor});
            // print("[2]Dist: {d}\n", .{cursor[0] - wordStart});
            // print("----------------------\n", .{});
            while (cursor[0] < 15 and !isAlphaRight(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                rangeEnd += 1;
                placed += 1;
                cursor[0] += 1;
            }
            // print("[3]RS: {d}\n", .{rangeS});
            // print("[3]RE: {d}\n", .{rangeEnd});
            // print("[3]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[3]Cursor: {d}\n", .{cursor});
            // print("[3]Dist: {d}\n", .{cursor[0] - wordStart});
            // if (cursor[0] < 15 and isAlphaRight(ctx.grid, cursor) and placed == ctx.rack.items.len) {
            //     rangeEnd -= 1;
            // }
            if (cursor[0] <= 15 and placed <= ctx.rack.items.len and rangeEnd >= 2) {
                // print("[2]Pushed\n", .{});
                try cellConst.ranges.append(.{rangeS, rangeEnd});
                try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
                if (placed < ctx.rack.items.len)
                    hasPushed = true;
            }
        }
    }
    // print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n", .{});

} 

fn getConstraints(ctx: *Context, cell: Point) !Constraints {
    if (cell[0] > 0 and isAlphaLeft(ctx.grid, cell))
        return GridError.NoWordCanBeginHere;

    var cellConst = Constraints.init(ctx.alloc);

    var c:[15:0]u8 = .{0} ** 15;
    var pos:[15:0]u4 = .{0} ** 15;

    try rGetConstraints(ctx, &cellConst, cell, &c, &pos);

    return cellConst;
}

fn tryWords(ctx: *Context, cell: *Point, wordVect: *StringVec) !MatchVec {
    _ = ctx; _ =wordVect; _ = cell;
    return error.NoWordCanBeginHere;
}



fn getCellWords(ctx: *Context, cellConst: *Constraints, cell: *Point, wordVec: *StringVec) !MatchVec {
    for (0..cellConst.ranges.items.len) |it| {
        if (cellConst.places.items[it].c[0] == 0) {
            _ = tryWords(ctx, cell, wordVec) catch continue;
            continue;
        }

        var cellPerms = PermSet.init(ctx.alloc);
        var mandatory = String.init(ctx.alloc);
        for (cellConst.places.items[it].c) |ch| {
            if (ch == 0) break;
            try mandatory.append(ch);
        }
        std.mem.sort(u8, mandatory.items[0..], {}, lessThan);

        // print("MANDATORY: {s}\n", .{mandatory.items});
        // print("RACK: {s}\n", .{ctx.rack.items});
        // insertSorted(&mandatory, ctx.rack.items[2]);
        // try permutationsSort(ctx.alloc, &cellPerms, &ctx.rack, &mandatory, 0, cellConst.ranges.items[it][0], cellConst.ranges.items[it][1]);
        try permutationsSortTest(ctx.alloc, &cellPerms, &ctx.rack, &mandatory, 0, cellConst.ranges.items[it][0], cellConst.ranges.items[it][1]);
        // for (cellPerms.keys(), 0..) |key, i| {
        //     print("cellPerm[{d}] = {s}\n", .{i, key});
        // }
        const cellWords = try getWordList(ctx.alloc, &cellPerms, ctx.orderedMap);
        _ = cellWords;
        // for (cellWords.items, 0..) |word, i| {
        //     print("vect[{d}] = {s}\n", .{i, word});
        // }
    }
    return error.NoWordCanBeginHere;
}

fn evaluateGrid(ctx: *Context, wordVec: *StringVec) !MatchVec {
    const result = MatchVec.init(ctx.alloc);

    for (0..GRID_SIZE) |y| {
        for (0..GRID_SIZE) |x| {
            // if ((y == 0 and x == 2) or (y == 12 and x == 0)) {
            // if (y == 12 and x == 5) {
                var cell = Point{@intCast(x), @intCast(y)};
                var cellConst = getConstraints(ctx, cell) catch continue;
                if (cellConst.places.items.len == 0)
                    continue;
                // print("Y:{d},X:{d}\n", .{y, x});
                // print("{}", .{cellConst});
                _ = getCellWords(ctx, &cellConst, &cell, wordVec) catch continue;
            // }
        }
    }

    return result;
}

fn solveGrid(ctx: *Context) !void {
    const startTime = std.time.microTimestamp();

    var wordVec = try getWordList(ctx.alloc, &ctx.basePerm, ctx.orderedMap);
    // for (wordVec.items, 0..) |word, i| {
    //     print("vect[{d}] = {s}\n", .{i, word});
    // }

    const resultFirstHalf = try evaluateGrid(ctx, &wordVec);
    _ = resultFirstHalf;

    const endTime = std.time.microTimestamp();
    const elapsedMicro: i64 = endTime - startTime;
    const elapsedMili: f64 = @as(f64, @floatFromInt(elapsedMicro)) / @as(f64, 1000);

    print("Elapsed: {d}µs | {d}ms\n", .{elapsedMicro, elapsedMili});
}

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(.{}) = .init;
    const GpaAlloc = gpa.allocator();
    defer _ = gpa.deinit();

    var arena = std.heap.ArenaAllocator.init(GpaAlloc);
    const ArenaAlloc = arena.allocator();
    defer arena.deinit();

    var ctx = try Context.init(ArenaAlloc, "grid00.txt", "SALOPES");
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
    try ctx.loadGrid("grid06.txt");
    try solveGrid(&ctx);
}

test "simple test" {}
