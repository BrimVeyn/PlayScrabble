const std               = @import("std");
const dict              = @embedFile("generate/Data.txt");
const print             = std.debug.print;
const AutoArrayHashMap  = std.AutoArrayHashMap;
const AutoHashMap       = std.AutoHashMap;
const ArrayList         = std.ArrayList;
const Allocator         = std.mem.Allocator;

const gridFile          = @import("Grid.zig");
const Grid              = gridFile.Grid;

const generator             = @import("generate/generate.zig");
const OrderedMap            = generator.OrderedMap;
const asciiOrderedMapPath   = generator.asciiOrderedMapPath;
const Map                   = generator.Map;

const PermList  = std.StringArrayHashMap(bool);
const String    = ArrayList(u8);

pub fn permutations(alloc: Allocator, perms: *PermList, pattern: []u8, buffer: *String, patternI: usize, minLen: usize, maxLen: usize) !void {
    if (buffer.items.len != 0) {
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen 
            and !perms.contains(buffer.items)) 
        {
            try perms.put(try alloc.dupe(u8, buffer.items), true);
        }
    }
    if (patternI >= pattern.len)
        return;

    try buffer.append(pattern[patternI]);
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

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(.{}) = .init;
    const GpaAlloc = gpa.allocator();
    defer {
        const leaks = gpa.deinit();
        _ = leaks;
    }

    var arena = std.heap.ArenaAllocator.init(GpaAlloc);
    const ArenaAlloc = arena.allocator();
    defer arena.deinit();

    var grid = Grid.init();
    grid.loadGridState("salope");

    var map: Map = try populateMap(ArenaAlloc);
    defer map.deinit(ArenaAlloc);


    // print("{}\n", .{map});

    var pattern = [_]u8 {'A', 'M', 'U', 'S', 'E'};
    std.mem.sort(u8, pattern[0..], {}, lessThan);

    print("Pattern: {s}\n", .{pattern});

    var buffer = String.init(ArenaAlloc);
    defer buffer.deinit();
    
    var perms = PermList.init(ArenaAlloc);
    defer {
        for (perms.keys()) |key| ArenaAlloc.free(key);
        perms.deinit();
    }

    try permutations(ArenaAlloc, &perms, pattern[0..], &buffer, 0, 2, pattern.len);
    for (perms.keys()) |key| {
        print("Key: {s}\n", .{key});
    }
}

test "simple test" {
    var list = std.ArrayList(i32).init(std.testing.allocator);
    defer list.deinit(); // Try commenting this out and see if zig detects the memory leak!
    try list.append(42);
    try std.testing.expectEqual(@as(i32, 42), list.pop());
}
