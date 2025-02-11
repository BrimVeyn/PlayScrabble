pub const Grid = struct {

    const Modifiers = enum(u8) {
        TWORD,
        DWORD,
        DLETTER,
        TLETTER,
        NONE,
    };
    
    modifiers: [15][15]Modifiers,
    grid: [15][15]u8,


    pub fn loadGridState(self: *Grid, path: []const u8) void {
        _ = self;
        _ = path;
        return ;
    }

    pub fn init() Grid {
        const modifiers = [15][15]Modifiers {
            [_]Modifiers{.TWORD, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .TWORD},
            [_]Modifiers{.NONE, .DWORD, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE},
            [_]Modifiers{.NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .TWORD, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE},
            [_]Modifiers{.TWORD, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .DLETTER},
            [_]Modifiers{.NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE},
            [_]Modifiers{.NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE},
            [_]Modifiers{.NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE},
            [_]Modifiers{.TWORD, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .TWORD},
            [_]Modifiers{.NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE},
            [_]Modifiers{.NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE},
            [_]Modifiers{.NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .NONE},
            [_]Modifiers{.TWORD, .NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE, .DLETTER},
            [_]Modifiers{.NONE, .NONE, .DWORD, .NONE, .NONE, .NONE, .TWORD, .NONE, .DLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE, .NONE},
            [_]Modifiers{.NONE, .DWORD, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .TLETTER, .NONE, .NONE, .NONE, .DWORD, .NONE},
            [_]Modifiers{.TWORD, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .TWORD, .NONE, .NONE, .NONE, .DLETTER, .NONE, .NONE, .TWORD}
        };

        const grid = [15][15]u8 {
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            [_]u8{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
        };

        return .{
            .grid = grid,
            .modifiers = modifiers,
        };
    }
};
