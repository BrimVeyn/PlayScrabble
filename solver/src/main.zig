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
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen and !perms.contains(buffer.items)) {
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
        for (0..self.ranges.items.len) |i| {
            _ = try writer.write("---------- Constraint -------\n");
            const range = self.ranges.items[i];
            const place = self.places.items[i];
            try writer.print("R: {d}-{d}\n", .{range[0], range[1]});
            try writer.print("S: {s}\n", .{place.c});
            _ = try writer.write("P: ");
            for (0..place.pos.len) |j| {
                if (place.pos[j] == 0) break;
                try writer.print("{d}", .{place.pos[j]});
            }
            _ = try writer.write("\n");
            _ = try writer.write("------------- END -----------\n");
        }
    }
};

const Context = struct {
    grid: Grid,
    rack: String,
    orderedMap: Map,
    alloc: Allocator,

    pub fn init(alloc: Allocator, gridState: []const u8, rackValue: []const u8) !Context {
        var grid = Grid.init();
        try grid.loadGridState(gridState);
        var rack = String.init(alloc);
        try rack.appendSlice(rackValue);
        std.mem.sort(u8, rack.items[0..], {}, lessThan);
        return .{
            .grid = grid,
            .rack = rack,
            .orderedMap = try populateMap(alloc),
            .alloc = alloc,
        };
    }
};

fn isAlpha(grid: Grid, cell: Point) bool {
    return (grid.grid[cell[1]][cell[0]] >= 'A' and grid.grid[cell[1]][cell[0]] <= 'Z');
}

fn isEmpty(grid: Grid, cell: Point) bool {
    return !isAlpha(grid, cell);
}

const GridError = error {
    NoWordCanBeginHere,
};

fn rGetConstraints(ctx: *Context, cellConst: *Constraints, cell: Point, cBuff: *[15:0]u8, posBuff: *[15:0]u4) !void {

    //Virtual cursor for the function
    var cursor = Point{cell[0], cell[1]};
    //Iterator on buffers
    var constIt: usize = 0;
    //Number of letters from the rack needed to form the constraint
    var placed:usize = 0;
    //Used to compute the word start, if the cell is filled already
    var wordStart: u4 = cell[0];

    while (true) {
        while (isAlpha(ctx.grid, cursor) and cursor[0] < 15) {
            cBuff[constIt] = ctx.grid.grid[@intCast(cursor[1])][@intCast(cursor[0])];
            //We avoid zero since we're using a null terminated int array
            posBuff[constIt] = (cursor[0] - cell[0]) + 1;
            wordStart += 1;
            cursor[0] += 1;
            constIt += 1;
        }
        while (isEmpty(ctx.grid, cursor) and placed < ctx.rack.items.len and cursor[0] < 15) {
            placed += 1;
        }

        try cellConst.ranges.append(.{wordStart, cursor[0]});
        try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
        break;
    }

} 

fn getConstraints(ctx: *Context, cell: Point) !Constraints {
    if (cell[0] > 0 and isAlpha(ctx.grid, cell))
        return GridError.NoWordCanBeginHere;

    var cellConst = Constraints.init(ctx.alloc);

    var c:[15:0]u8 = .{0} ** 15;
    var pos:[15:0]u4 = .{0} ** 15;

    try rGetConstraints(ctx, &cellConst, cell, &c, &pos);

    return cellConst;
}

fn evaluateGrid(ctx: *Context) !MatchVec {
    const result = MatchVec.init(ctx.alloc);

    for (0..GRID_SIZE) |y| {
        for (0..GRID_SIZE) |x| {
            const cell = Point{@intCast(x), @intCast(y)};
            const cellConst = getConstraints(ctx, cell) catch continue;
            if (cellConst.places.items.len == 0)
                continue;
            print("{}", .{cellConst});
        }
    }

    return result;
}

fn solveGrid(ctx: *Context) !void {
    const startTime = std.time.microTimestamp();

    var buffer = String.init(ctx.alloc);
    defer buffer.deinit();

    var perms = PermSet.init(ctx.alloc);
    defer {
        for (perms.keys()) |key| ctx.alloc.free(key);
        perms.deinit();
    }

    try permutations(ctx.alloc, &perms, &ctx.rack, &buffer, 0, 2, ctx.rack.items.len);
    // for (perms.keys(), 0..) |word, i| {
    //     print("vect[{d}] = {s}\n", .{i, word});
    // }
    // print("Count: {d}\n", .{perms.keys().len});
    const wordVec = try getWordList(ctx.alloc, &perms, ctx.orderedMap);
    defer wordVec.deinit();

    const resultFirstHalf = try evaluateGrid(ctx);
    _ = resultFirstHalf;
    // for (wordVec.items, 0..) |word, i| {
    //     print("vect[{d}] = {s}\n", .{i, word});
    // }
    // print("Count: {d}\n", .{perms.keys().len});

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

    var ctx = try Context.init(ArenaAlloc, "grid00.txt", "SALUT");
    try solveGrid(&ctx);
}

test "simple test" {}
