const std = @import("std");
const data = @embedFile("data/Data.txt");
const print = std.debug.print;
const AutoArrayHashMap = std.AutoArrayHashMap;
const AutoHashMap = std.AutoHashMap;

pub fn permutations(pattern: []u8) Auto {}

pub fn main() !void {
    print("{s}\n", .{data});
}

test "simple test" {
    var list = std.ArrayList(i32).init(std.testing.allocator);
    defer list.deinit(); // Try commenting this out and see if zig detects the memory leak!
    try list.append(42);
    try std.testing.expectEqual(@as(i32, 42), list.pop());
}
