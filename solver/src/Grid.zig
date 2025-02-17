const std           = @import("std");
const gridRootPath  = "./src/testGrids/";
const MAX_PATH      = 256;
const GRID_SIZE     = 15 * 16;
const Point         = @Vector(2, u4);

const Modifiers = enum(u8) {
    TWORD,
    DWORD,
    TLETTER,
    DLETTER,
    NONE,

    pub fn asU32(self: Modifiers) u32 {
        return switch (self) {
            .TWORD => 3,
            .DWORD => 2,
            .TLETTER => 3,
            .DLETTER => 2,
            .NONE => 1,
        };
    }
};

const gridModifiers = [15][15]Modifiers {
    [_]Modifiers{.TWORD, .NONE, .NONE, .DLETTER, .NONE, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .TWORD},
    [_]Modifiers{.NONE, .DWORD, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE},
    [_]Modifiers{.NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .TWORD, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE},
    [_]Modifiers{.DLETTER, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .DLETTER},
    [_]Modifiers{.NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE},
    [_]Modifiers{.NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE},
    [_]Modifiers{.NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE},
    [_]Modifiers{.TWORD, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .TWORD},
    [_]Modifiers{.NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE},
    [_]Modifiers{.NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE},
    [_]Modifiers{.NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE},
    [_]Modifiers{.DLETTER, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .DLETTER},
    [_]Modifiers{.NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .TWORD, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE},
    [_]Modifiers{.NONE, .DWORD, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE},
    [_]Modifiers{.TWORD, .NONE, .NONE, .DLETTER, .NONE, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .TWORD}
};

pub const Grid = struct {

    modifiers:  [15][15]Modifiers = gridModifiers,
    grid:       [15][15]u8,

    pub fn loadGridState(self: *Grid, path: []const u8) !void {
        var pathBuffer: [MAX_PATH:0]u8 = .{0} ** MAX_PATH;
        std.mem.copyForwards(u8, pathBuffer[0..], gridRootPath);
        std.mem.copyForwards(u8, pathBuffer[gridRootPath.len..], path);

        const cwd = try std.fs.cwd().openFileZ(pathBuffer[0..], .{});
        defer cwd.close();

        var gridBuffer: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
        _ = try cwd.reader().readAll(&gridBuffer);

        var lineIt = std.mem.tokenizeScalar(u8, gridBuffer[0..], '\n');
        var y: usize = 0;
        while (lineIt.next()) |line| : (y += 1) {
            std.mem.copyForwards(u8, self.grid[y][0..], line);
        }
    }

    pub fn getLetterModifier(_ : Grid, cell: *const Point) Modifiers {
        return switch (gridModifiers[cell[1]][cell[0]]) {
            .DLETTER, .TLETTER => gridModifiers[cell[1]][cell[0]],
            else => .NONE,
        };
    }

    pub fn getWordModifier(_ : Grid, cell: *const Point) Modifiers {
        return switch (gridModifiers[cell[1]][cell[0]]) {
            .DWORD, .TWORD => gridModifiers[cell[1]][cell[0]],
            else => .NONE,
        };
    }

    pub fn init() Grid {
        const grid = [15][15]u8 {
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'},
            [_]u8{'.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'} 
        };
        return .{
            .grid = grid,
        };
    }
};
