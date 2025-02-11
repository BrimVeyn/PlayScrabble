const std = @import("std");
const dict = @embedFile("generate/Data.txt");
const print = std.debug.print;
const AutoArrayHashMap = std.AutoArrayHashMap;
const AutoHashMap = std.AutoHashMap;
const ArrayList = std.ArrayList;
const Allocator = std.mem.Allocator;

const gridFile = @import("Grid.zig");
const Grid = gridFile.Grid;

const generator = @import("generate/generate.zig");
const OrderedMap = generator.OrderedMap;
const asciiOrderedMapPath = generator.asciiOrderedMapPath;
const Map = generator.Map;

const PermSet = std.StringArrayHashMap(bool);
const String = ArrayList(u8);
const StringVec = ArrayList([]const u8);

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
const MatchVec = ArrayList(Match);

fn evaluateGrid(alloc: Allocator, grid: *Grid, orderedMap: Map) !MatchVec {
    const result = MatchVec.init(alloc);
    _ = grid;
    _ = orderedMap;

    return result;
}

fn solveGrid(alloc: Allocator, grid: *Grid, rack: *String, orderedMap: Map) !void {
    const startTime = std.time.microTimestamp();

    var buffer = String.init(alloc);
    defer buffer.deinit();

    var perms = PermSet.init(alloc);
    defer {
        for (perms.keys()) |key| alloc.free(key);
        perms.deinit();
    }

    try permutations(alloc, &perms, rack, &buffer, 0, 2, rack.items.len);
    // for (perms.keys(), 0..) |word, i| {
    //     print("vect[{d}] = {s}\n", .{i, word});
    // }
    // print("Count: {d}\n", .{perms.keys().len});
    const wordVec = try getWordList(alloc, &perms, orderedMap);
    defer wordVec.deinit();

    const resultFirstHalf = try evaluateGrid(alloc, grid, orderedMap);
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

    //Representation of the game state
    var grid = Grid.init();
    try grid.loadGridState("grid00.txt");

    //Representation of the players'rack
    var rack = String.init(ArenaAlloc);
    try rack.appendSlice("EVENTUELLEMENTE");
    std.mem.sort(u8, rack.items[0..], {}, lessThan);

    //Dictionnairies with sorted ascii keys to array of possible words
    var map: Map = try populateMap(ArenaAlloc);
    defer map.deinit(ArenaAlloc);

    try solveGrid(ArenaAlloc, &grid, &rack, map);
}

test "simple test" {}
