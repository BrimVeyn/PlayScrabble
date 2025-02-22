const std               = @import("std");
const print             = std.debug.print;
const AutoArrayHashMap  = std.AutoArrayHashMap;
const AutoHashMap       = std.AutoHashMap;
const ArrayList         = std.ArrayList;
const Allocator         = std.mem.Allocator;

const dict                      = @embedFile("ODS8.txt");
pub const asciiOrderedMapPath   = "zig-out/asciiHash.json";
pub const OrderedMap            = std.StringArrayHashMap(std.StringArrayHashMap(bool));

pub const Map = struct {
    data: OrderedMap,

    pub fn fromJson(alloc: Allocator, json: []const u8) !Map {
        var parsed = try std.json.parseFromSlice(std.json.Value, alloc, json, .{});
        defer parsed.deinit();

        var map = Map{ .data = OrderedMap.init(alloc) };

        var obj = parsed.value.object;
        var it = obj.iterator();
        while (it.next()) |entry| {
            const key = entry.key_ptr.*;
            const values = entry.value_ptr.*.array.items;

            const sorted_key = try alloc.dupe(u8, key);
            var value_map = std.StringArrayHashMap(bool).init(alloc);

            for (values) |word_val| {
                const word = try alloc.dupe(u8, word_val.string);
                try value_map.put(word, true);
            }

            try map.data.put(sorted_key, value_map);
        }

        return map;
    }

    pub fn jsonStringify(self: @This(), jws: anytype) !void {
        try jws.beginObject();

        var mapIt = self.data.iterator();
        while (mapIt.next()) |entry| {
            try jws.objectField(entry.key_ptr.*); // Print the sorted word as key
            try jws.beginArray();
            var setIt = entry.value_ptr.iterator();
            while (setIt.next()) |setEntry| {
                try jws.print("\"{s}\"", .{setEntry.key_ptr.*}); // Quote strings properly
            }
            try jws.endArray();
        }
        try jws.endObject();
    }


    pub fn format(self: *const Map, comptime fmt: []const u8, _: std.fmt.FormatOptions, writer: anytype) !void {
        if (fmt.len != 0) {
            std.fmt.invalidFmtError(fmt, self);
        }
        return std.json.stringify(self, .{.whitespace = .indent_2}, writer);
    }

    pub fn deinit(self: *Map, alloc: Allocator) void {
        var mapIt = self.data.iterator();
        while(mapIt.next()) |entry| {
            var setIt = entry.value_ptr.iterator();
            while(setIt.next()) |setEntry| {
                alloc.free(setEntry.key_ptr.*);
            }
            alloc.free(entry.key_ptr.*);
            entry.value_ptr.deinit();
        }
        self.data.deinit();
    }
};

pub fn lessThan(_ : void, a: u8, b: u8) bool {
    return (a < b);
}

pub fn generateHashMap(alloc: Allocator) !Map {
    var map = Map { .data =  OrderedMap.init(alloc), };

    var it = std.mem.tokenizeScalar(u8, dict, '\n');
    var count: usize = 0;
    while (it.next()) |word| : (count += 1) {
        if (count % 100 == 0) print("Count: {d}\n", .{count});

        const copy = try alloc.dupe(u8, word);
        std.mem.sort(u8, copy, {}, lessThan);

        const match = try map.data.getOrPutValue(copy, std.StringArrayHashMap(bool).init(alloc));
        if (!match.value_ptr.contains(word)) {
            try match.value_ptr.put(try alloc.dupe(u8, word), true);
        }
        if (match.found_existing)
            alloc.free(copy);
    }
    return map;
}

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(.{}) = .init;
    const alloc = gpa.allocator();
    defer {
        const leaks = gpa.deinit();
        _ = leaks;
    }

    var map: Map = try generateHashMap(alloc);
    defer map.deinit(alloc);

    const outFile = try std.fs.cwd().createFile(asciiOrderedMapPath, .{});
    defer outFile.close();

    const outFileWriter = outFile.writer();
    try outFileWriter.print("{}\n", .{map});

}
