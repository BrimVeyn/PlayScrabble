const std                   = @import("std");
const Grid                  = @import("Grid.zig").Grid;

const dictContent           = @embedFile("dict/FR/ODS8.txt");

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
const insertSortedAssumeCapacity = mainModule.insertSortedAssumeCapacity;

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

fn jokerOne(alloc: Allocator, perms: *PermSet) !void {
    var copy = try perms.clone();

    for (copy.keys()) |perm| {
        for ('A'..'Z' + 1) |ch| {
            const chu8:u8 = @intCast(ch);
            var newPerm = try String.initCapacity(alloc, perm.len + 1);
            newPerm.appendSliceAssumeCapacity(perm);
            insertSortedAssumeCapacity(&newPerm, chu8);
            _  = try perms.getOrPutValue(newPerm.items[0..], .{chu8, 0});

            var oneLetter = try alloc.alloc(u8, 1);
            oneLetter[0] = chu8;
            _ = try perms.getOrPutValue(oneLetter, .{chu8, 0});
        }
    }
}

fn jokerTwo(alloc: Allocator, perms: *PermSet) !void {
    var copy = try perms.clone();

    try jokerOne(alloc, perms);

    for (copy.keys()) |perm| {
        for ('A'..'Z' + 1) |ch1| {
            const ch1u8: u8 = @intCast(ch1);

            for ('A'..'Z' + 1) |ch2| {
                const ch2u8: u8 = @intCast(ch2);

                var newPerm = try String.initCapacity(alloc, perm.len + 2);
                newPerm.appendSliceAssumeCapacity(perm);
                insertSortedAssumeCapacity(&newPerm, ch1u8);
                insertSortedAssumeCapacity(&newPerm, ch2u8);

                _ = try perms.getOrPutValue(newPerm.items[0..], .{ch1u8, ch2u8});

                var twoLetters = try String.initCapacity(alloc, 2);
                insertSortedAssumeCapacity(&twoLetters, ch1u8);
                insertSortedAssumeCapacity(&twoLetters, ch2u8);

                _ = try perms.getOrPutValue(twoLetters.items[0..], .{ch1u8, ch2u8});
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
    grid: Grid = undefined,
    rack: String = undefined,
    basePerm: PermSet = undefined,
    permInfos: CtxPerm = undefined,
    matchVec: MatchVec = undefined,
    state: Direction = .Horizontal,
    jokers: u32 = 0,
    crossChecks: [GRID_SIZE][GRID_SIZE]std.StaticBitSet(27) = undefined,
    crossChecksScore: [GRID_SIZE][GRID_SIZE][27]u8 = undefined,
    mutex: std.Thread.Mutex = .{}, //INFO: used to lock access to orderedMap and dict
    lang: []const u8 = undefined, //TODO: multi lang support
    
    pub const CtxConfig = struct {
        lang: []const u8,
        grid: [15][15] u8,
        rack: []const u8,
    };

    pub const CtxPerm = struct {
        dict: ScrabbleDict,
        orderedMap: Map,

        pub fn loadConfig(self: CtxPerm, alloc: Allocator, config: CtxConfig) !Context {
            var grid = Grid.init();
            try grid.loadGridStateFromSlice(config.grid);

            var rack = String.init(alloc);
            try rack.appendSlice(config.rack[0..]);
            std.mem.sort(u8, rack.items[0..], {}, lessThanU8);

            var jokers: u32 = 0;
            jokers += if (rack.items[0] == '?') 1 else 0;
            jokers += if (rack.items[1] == '?') 1 else 0;

            var buffer = String.init(alloc);
            var basePerm = PermSet.init(alloc);
            try permutations(alloc, &basePerm, &rack, &buffer, jokers);

            switch (jokers) {
                0 => {},
                1 => try jokerOne(alloc, &basePerm),
                2 => try jokerTwo(alloc, &basePerm),
                else => {},
            }

            return .{
                .alloc = alloc,
                .permInfos = self,
                .grid = grid,
                .rack = rack,
                .jokers = jokers,
                .basePerm = basePerm,
                .matchVec = MatchVec.init(alloc),
            };
        }
    };

    pub fn init(alloc: Allocator) !CtxPerm {
        var dict = ScrabbleDict.init(alloc);
        var lineIt = std.mem.tokenizeScalar(u8, dictContent, '\n');
        while (lineIt.next()) |word| {
            try dict.put(word, true);
        }
        const orderedMap = try populateMap(alloc);


        return .{
            .dict = dict,
            .orderedMap = orderedMap,
        };
    }

    pub fn initTest(alloc: Allocator, gridState: []const u8, rackValue: []const u8) !Context {
        var grid = Grid.init();
        try grid.loadGridState(gridState);

        var rack = String.init(alloc);
        try rack.appendSlice(rackValue);
        std.mem.sort(u8, rack.items[0..], {}, lessThanU8);

        //NOTE: Since ? < [A-Z], if there's a wildcard its at 0 and 1
        var jokers: u32 = 0;
        jokers += if (rack.items[0] == '?') 1 else 0;
        jokers += if (rack.items[1] == '?') 1 else 0;

        var buffer = String.init(alloc);
        var perms = PermSet.init(alloc);
        try permutations(alloc, &perms, &rack, &buffer, jokers);

        switch (jokers) {
            0 => {},
            1 => try jokerOne(alloc, &perms),
            2 => try jokerTwo(alloc, &perms),
            else => {},
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
            .jokers = jokers,
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

    pub fn clone(self: Context, alloc: Allocator) !Context {
        var rack = String.init(alloc);
        try rack.appendSlice(self.rack.items[0..]);

        return Context{
            .alloc = alloc,
            .permInfos = self.permInfos,
            .rack = rack,
            .basePerm = try self.basePerm.cloneWithAllocator(alloc),
            .matchVec = MatchVec.init(alloc),
            .state = self.state,
            .jokers = self.jokers,
            .grid = self.grid.clone(),
            .mutex = self.mutex,
        };
    }
};
