const std                   = @import("std");
const Grid                  = @import("Grid.zig").Grid;

const dictContent           = @embedFile("generate/Data.txt");

const generator             = @import("generate/generate.zig");
const OrderedMap            = generator.OrderedMap;
const asciiOrderedMapPath   = generator.asciiOrderedMapPath;
const Map                   = generator.Map;

const Allocator             = std.mem.Allocator;
const ArrayList             = std.ArrayList;

const PermSet               = std.StringArrayHashMap(bool);
const String                = ArrayList(u8);
const StringUnmanaged       = std.ArrayListUnmanaged(u8);
const StringVec             = ArrayList([]const u8);
const ScrabbleDict          = std.StringHashMap(bool);

const mainModule            = @import("main.zig");
const Match                 = mainModule.Match;
const MatchVec              = ArrayList(Match);
const Point                 = @Vector(2, u4);
const Range                 = @Vector(2, u4);

const insertSorted               = mainModule.insertSorted;
const insertSortedAssumeCapacity = mainModule.insertSortedAssumeCapacity;

const GRID_SIZE             = 15;

pub const Direction = enum {
    Vertical,
    Horizontal,
};

fn lessThanU8(context: void, a: u8, b: u8) bool {
    _ = context;
    return (a < b);
}

fn permutations(alloc: Allocator, perms: *PermSet, pattern: *String, buffer: *String, patternI: usize) !void {
    if (buffer.items.len != 0 and !perms.contains(buffer.items))
        try perms.put(try alloc.dupe(u8, buffer.items), true);

    if (patternI >= pattern.items.len)
        return;

    try buffer.append(pattern.items[patternI]);
    try permutations(alloc, perms, pattern, buffer, patternI + 1);

    _ = buffer.pop();
    try permutations(alloc, perms, pattern, buffer, patternI + 1);
}

fn wildcardOne(alloc: Allocator, perms: *PermSet) !void {
    var copy = try perms.clone();
    defer copy.deinit();

    for (copy.keys()) |perm| {
        for ('A'..'Z') |ch| {
            var newPerm = try String.initCapacity(alloc, perm.len + 1);
            newPerm.appendSliceAssumeCapacity(perm);
            try insertSorted(&newPerm, @as(u8, @intCast(ch)));
            try perms.put(newPerm.items[0..], true);
        }
    }
}

fn wildcardTwo(alloc: Allocator, perms: *PermSet) !void {
    var copy = try perms.clone();
    defer copy.deinit();

    for (copy.keys()) |perm| {
        for ('A'..'Z') |ch1| {
            for ('A'..'Z') |ch2| {
                var newPerm = try String.initCapacity(alloc, perm.len + 2);
                newPerm.appendSliceAssumeCapacity(perm);
                try insertSorted(&newPerm, @as(u8, @intCast(ch1)));
                try insertSorted(&newPerm, @as(u8, @intCast(ch2)));
                try perms.put(newPerm.items[0..], true);
            }
        }
    }
}


pub fn populateMap(alloc: Allocator) !Map {
    var mapFile = try std.fs.cwd().openFile(asciiOrderedMapPath, .{});
    defer mapFile.close();

    const rawContent = try mapFile.readToEndAlloc(alloc, 10_000_000_000);

    const map = try Map.fromJson(alloc, rawContent);
    return map;
}

pub const Context = struct {

    alloc: Allocator,
    grid: Grid,
    rack: String,
    basePerm: PermSet,
    orderedMap: Map,
    dict: ScrabbleDict,
    matchVec: MatchVec,
    state: Direction = .Horizontal,
    wildcard: u32 = 0,


    pub fn init(alloc: Allocator, gridState: []const u8, rackValue: []const u8) !Context {
        var grid = Grid.init();
        try grid.loadGridState(gridState);

        var rack = String.init(alloc);
        try rack.appendSlice(rackValue);
        std.mem.sort(u8, rack.items[0..], {}, lessThanU8);

        //Since ? < [A-Z], if there's a wildcard its at 0 and 1
        var wildcard: u32 = 0;
        if (rack.items[0] == '?') {
            _ = rack.orderedRemove(0);
            wildcard += 1;
        }
        if (rack.items[0] == '?') {
            _ = rack.orderedRemove(0);
            wildcard += 1;
        }
        var buffer = String.init(alloc);
        defer buffer.deinit();

        var perms = PermSet.init(alloc);
        try permutations(alloc, &perms, &rack, &buffer, 0);
        
        switch (wildcard) {
            1 => try wildcardOne(alloc, &perms),
            2 => try wildcardTwo(alloc, &perms),
            else => @panic("Found more than two wildcard"),
        }

        var dict = ScrabbleDict.init(alloc);
        var lineIt = std.mem.tokenizeScalar(u8, dictContent, '\n');
        while (lineIt.next()) |word| {
            try dict.put(word, true);
        }

        return .{
            .alloc = alloc,
            .grid = grid,
            .rack = rack,
            .wildcard = wildcard,
            .basePerm = perms,
            .orderedMap = try populateMap(alloc),
            .dict = dict,
            .matchVec = MatchVec.init(alloc),
        };
    }

    pub fn transposeGrid(self: *Context) void {
        for (0..GRID_SIZE) |y| {
            for (y + 1..GRID_SIZE) |x| {
                const tmp = self.grid.grid[x][y];
                self.grid.grid[x][y] = self.grid.grid[y][x];
                self.grid.grid[y][x] = tmp;
            }
        }
        self.state = .Vertical;
    }

    pub fn loadGrid(self: *Context, gridState: []const u8) !void {
        try self.grid.loadGridState(gridState);
    }
};
