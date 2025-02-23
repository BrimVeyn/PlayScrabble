const std           = @import("std");
const gridRootPath  = "./src/testGrids/";
const MAX_PATH      = 256;
const GRID_BUF_SIZE = 15 * 16;
const GRID_SIZE     = 15;
const Point         = @Vector(2, u4);

pub const GridError = error {
    NoWordCanBeginHere,
    OutOfBounds,
    UnknownWord,
    TooManyWildcards,
};

//NOTE: modifier Values: 
// 0 None
// 1 Double Word
// 2 Tripple Word
// 3 Double Letter
// 4 Tripple letter

const gridModifiers = [15][15]u3 {
    [_]u3{2, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 2},
    [_]u3{0, 1, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 1, 0},
    [_]u3{0, 0, 1, 0, 0, 0, 3, 0, 3, 0, 0, 0, 1, 0, 0},
    [_]u3{3, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 3},
    [_]u3{0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0},
    [_]u3{0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0},
    [_]u3{0, 0, 3, 0, 0, 0, 3, 0, 3, 0, 0, 0, 3, 0, 0},
    [_]u3{2, 0, 0, 3, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 2},
    [_]u3{0, 0, 3, 0, 0, 0, 3, 0, 3, 0, 0, 0, 3, 0, 0},
    [_]u3{0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0},
    [_]u3{0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0},
    [_]u3{3, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 3},
    [_]u3{0, 0, 1, 0, 0, 0, 3, 0, 3, 0, 0, 0, 1, 0, 0},
    [_]u3{0, 1, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 1, 0},
    [_]u3{2, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 2}
};

pub const Grid = struct {

    const GridCell = packed struct(u8) {
        letter: u5,
        modifier: u3,
    };
    cells: [GRID_SIZE * GRID_SIZE]GridCell,

    pub fn init() Grid {
        var cells: [GRID_SIZE * GRID_SIZE]GridCell = undefined;
        for (0..GRID_SIZE) |y| {
            for (0..GRID_SIZE) |x| {
                cells[(y * GRID_SIZE) + x] = .{
                    .letter = 0,
                    .modifier = gridModifiers[y][x],
                };
            }
        }
        return .{
            .cells = cells,
        };
    }

    pub fn clone(self: Grid) Grid {
        var cells: [GRID_SIZE * GRID_SIZE]GridCell = undefined;
        std.mem.copyForwards(GridCell, cells[0..], self.cells);
        return Grid{
            .cells = cells,
        };
    }

    pub fn loadGridState(self: *Grid, path: []const u8) !void {
        var pathBuffer: [MAX_PATH:0]u8 = .{0} ** MAX_PATH;
        std.mem.copyForwards(u8, pathBuffer[0..], gridRootPath);
        std.mem.copyForwards(u8, pathBuffer[gridRootPath.len..], path);

        const cwd = try std.fs.cwd().openFileZ(pathBuffer[0..], .{});
        defer cwd.close();

        var gridBuffer: [GRID_BUF_SIZE:0]u8 = .{0} ** GRID_BUF_SIZE;
        _ = try cwd.reader().readAll(&gridBuffer);

        var lineIt = std.mem.tokenizeScalar(u8, gridBuffer[0..], '\n');
        var y: usize = 0;
        while (lineIt.next()) |line| : (y += 1) {
            for (0..line.len) |x| {
                if (line[x] < 'A' or line[x] > 'Z') {
                    self.cells[y * GRID_SIZE + x].letter = @as(u5, 0);
                } else {
                    self.cells[y * GRID_SIZE + x].letter = @as(u5, @intCast(line[x] - 'A' + 1));
                }
            }
        }
    }

    pub fn getLetterModifier(self : Grid, cell: *const Point) u3 {
        const idx = @as(usize, @intCast(cell[1])) * GRID_SIZE + cell[0];
        return switch(self.cells[idx].modifier) {
            3 => 2,
            4 => 3,
            else => 1,
        };
    }

    pub fn getWordModifier(self : Grid, cell: *const Point) u3 {
        const idx = @as(usize, @intCast(cell[1])) * GRID_SIZE + cell[0];
        return switch(self.cells[idx].modifier) {
            1 => 2,
            2 => 3,
            else => 1,
        };
    }

    pub fn isAlpha(grid: Grid, cell: Point) bool {
        const idx = @as(usize, @intCast(cell[1])) * GRID_SIZE + cell[0];
        return (grid.cells[idx].letter >= 1 and 
                grid.cells[idx].letter <= 26);
    }

    pub fn isEmpty(grid: Grid, cell: Point) bool {
        return !grid.isAlpha(cell);
    }

    pub fn isInBounds(_: Grid, cell: Point) bool {
        return (cell[0] >= 0 and cell[0] < GRID_SIZE);
    }

    pub fn isAlphaLeft(grid: Grid, cell:Point) bool {
        if (cell[0] > 0) {
            const left = Point{cell[0] - 1, cell[1]};
            if (grid.isAlpha(left)) return true;
        }
        return false;
    }

    pub fn isAlphaRight(grid: Grid, cell:Point) bool {
        if (cell[0] < (GRID_SIZE - 1)) {
            const right = Point{cell[0] + 1, cell[1]};
            if (grid.isAlpha(right)) return true;
        }
        return false;
    }

    pub fn isAlphaPerp(grid: Grid, cell: Point) bool {
        if (cell[1] > 0) {
            const up = Point{cell[0], cell[1] - 1};
            if (grid.isAlpha(up)) return true;
        }
        if (cell[1] < (GRID_SIZE - 1)) {
            const down = Point{cell[0], cell[1] + 1};
            if (grid.isAlpha(down)) return true;
        }
        return false;
    }

    pub fn isAlphaPar(grid: Grid, cell: Point) bool {
        if (cell[0] > 0) {
            const left = Point{cell[0] - 1, cell[1]};
            if (grid.isAlpha(left)) return true;
        }
        if (cell[0] < (GRID_SIZE - 1)) {
            const right = Point{cell[0] + 1, cell[1]};
            if (grid.isAlpha(right)) return true;
        }
        return false;
    }

    pub fn getChar(self: Grid, cell: Point) u5 { 
        if (self.isInBounds(cell)) {
            const idx = @as(usize, @intCast(cell[1])) * GRID_SIZE + cell[0];
            return self.cells[idx].letter;
        } else return 0;
    }
};
