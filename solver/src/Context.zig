const std                   = @import("std");
const Grid                  = @import("Grid.zig").Grid;

const dictContent           = @embedFile("generate/ODS8.txt");

const generator             = @import("generate/generate.zig");
const OrderedMap            = generator.OrderedMap;
const asciiOrderedMapPath   = generator.asciiOrderedMapPath;
const Map                   = generator.Map;

const Allocator             = std.mem.Allocator;
const ArrayList             = std.ArrayList;
const Thread                = std.Thread;

const PermSet               = std.StringArrayHashMap([2]u8);
const String                = ArrayList(u8);
const StringUnmanaged       = std.ArrayListUnmanaged(u8);
const StringVec             = ArrayList([]const u8);
const ScrabbleDict          = std.StringHashMap(bool);

const mainModule            = @import("main.zig");
const Match                 = mainModule.Match;
const orderU8               = mainModule.orderU8;

const MatchVec              = ArrayList(Match);
const Point                 = @Vector(2, u4);
const Range                 = @Vector(2, u4);

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
        try perms.put(try alloc.dupe(u8, buffer.items), .{0, 0});

    if (patternI >= pattern.items.len)
        return;

    try buffer.append(pattern.items[patternI]);
    try permutations(alloc, perms, pattern, buffer, patternI + 1);

    _ = buffer.pop();
    try permutations(alloc, perms, pattern, buffer, patternI + 1);
}

pub fn insertSorted(string: *String, ch: u8) !void {
    const idx = std.sort.lowerBound(u8, string.items[0..], ch, orderU8);
    try string.insert(idx, ch);
}

fn wildcardOne(alloc: Allocator, perms: *PermSet) !void {
    var copy = try perms.clone();

    for (copy.keys()) |perm| {
        for ('A'..'Z') |ch| {
            const chu8:u8 = @intCast(ch);
            var newPerm = try String.initCapacity(alloc, perm.len + 1);
            newPerm.appendSliceAssumeCapacity(perm);
            try insertSorted(&newPerm, chu8);
            _  = try perms.getOrPutValue(newPerm.items[0..], .{chu8, 0});

            var oneLetter = try alloc.alloc(u8, 1);
            oneLetter[0] = chu8;
            _ = try perms.getOrPutValue(oneLetter, .{chu8, 0});
        }
    }
}

fn wildcardTwo(alloc: Allocator, perms: *PermSet) !void {
    var copy = try perms.clone();

    for (copy.keys()) |perm| {
        for ('A'..'Z') |ch1| {
            const ch1u8: u8 = @intCast(ch1);
            for ('A'..'Z') |ch2| {
                const ch2u8: u8 = @intCast(ch2);
                var newPerm = try String.initCapacity(alloc, perm.len + 2);
                newPerm.appendSliceAssumeCapacity(perm);
                try insertSorted(&newPerm, ch1u8);
                try insertSorted(&newPerm, ch2u8);
                _ = try perms.getOrPutValue(newPerm.items[0..], .{ch1u8, ch2u8});

                var twoLetters = try alloc.alloc(u8, 2);
                twoLetters[0] = ch1u8;
                twoLetters[1] = ch2u8;
                _ = try perms.getOrPutValue(twoLetters, .{ch1u8, ch2u8});
            }
            var oneLetter = try alloc.alloc(u8, 1);
            oneLetter[0] = ch1u8;
            _ = try perms.getOrPutValue(oneLetter, .{ch1u8, 0});
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
    mutex: std.Thread.Mutex = .{}, //INFO: used to lock access to orderedMap and dict


    pub fn init(alloc: Allocator, gridState: []const u8, rackValue: []const u8) !Context {
        var grid = Grid.init();
        try grid.loadGridState(gridState);

        var rack = String.init(alloc);
        try rack.appendSlice(rackValue);
        std.mem.sort(u8, rack.items[0..], {}, lessThanU8);

        //Since ? < [A-Z], if there's a wildcard its at 0 and 1
        var wildcard: u32 = 0;
        wildcard += if (rack.items[0] == '?') 1 else 0;
        wildcard += if (rack.items[1] == '?') 1 else 0;

        var buffer = String.init(alloc);
        var perms = PermSet.init(alloc);
        try permutations(alloc, &perms, &rack, &buffer, wildcard);

        //TODO: Allow word of len 1 <-- enormous mistake

        switch (wildcard) {
            0 => {},
            1 => try wildcardOne(alloc, &perms),
            2 => try wildcardTwo(alloc, &perms),
            else => return error.TooManyWildcards,
        }

        // var permIt = perms.iterator();
        // while (permIt.next()) |kv| {
        //     std.debug.print("KV: {s}: {s}\n", .{kv.key_ptr.*, kv.value_ptr.*});
        // }

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
                const tmp = self.grid.cells[(x * GRID_SIZE) + y];
                self.grid.cells[(x * GRID_SIZE) + y] = self.grid.cells[(y * GRID_SIZE) + x];
                self.grid.cells[(y * GRID_SIZE) + x] = tmp;
            }
        }
        self.state = .Vertical;
    }


    pub fn loadGrid(self: *Context, gridState: []const u8) !void {
        try self.grid.loadGridState(gridState);
    }

    pub fn clone(self: Context, gpa: Allocator) !Context {
        var arena = std.heap.ArenaAllocator.init(gpa);
        const alloc = arena.allocator();

        var rack = String.init(alloc);
        try rack.appendSlice(self.rack.items[0..]);

        return Context{
            .alloc = alloc,
            .orderedMap = self.orderedMap, //NOTE: Needs mutex
            .dict = self.dict, //NOTE: Needs mutex
            .rack = rack,
            .basePerm = try self.basePerm.cloneWithAllocator(alloc),
            .matchVec = MatchVec.init(alloc),
            .state = self.state,
            .wildcard = self.wildcard,
            .grid = self.grid.clone(),
            .mutex = self.mutex,
        };
    }
};
