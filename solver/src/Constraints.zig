const std       = @import("std");
const ArrayList = std.ArrayList;
const Allocator = std.mem.Allocator;

const root      = @import("root");
const Match     = root.Match;

const ctxModule = @import("Context.zig");
const Context   = ctxModule.Context;

const MatchVec  = ArrayList(Match);
const Point     = @Vector(2, u4);
const Range     = @Vector(2, u4);

const GRID_SIZE = 15;

fn rGetConstraints(
    ctx: *Context,
    cellConst: *Constraints, //Constraints of the current cell
    cell: Point,
    cBuff: *[GRID_SIZE:0]u8, //Buffer to hold mandatory letters
    posBuff: *[GRID_SIZE:0]u4 //Buffer to hold their positions
) !void {
    //Iterator on buffers
    var constIt: usize = 0;
    //Number of letters from the rack needed to form the constraint
    var placed:u4 = 0;
    //Virtual cursor for the function
    var cursor: Point = cell;
    const wordStart: u4 = cell[0];
    //Our loop breaker
    var hasPushed = true;
    var loopIterator: usize = 0;

    while (hasPushed) {
        defer loopIterator += 1;
        hasPushed = false;

        if (cursor[0] < GRID_SIZE and ctx.grid.isAlpha(cursor) and loopIterator == 0) {
            while (cursor[0] < GRID_SIZE and ctx.grid.isAlpha(cursor) and placed < ctx.rack.items.len) {
                cBuff[constIt] = try ctx.grid.getChar(cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
        }

        if (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and loopIterator == 0) {
            var rangeS: ?u4 = null;
            while (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and placed < ctx.rack.items.len) {
                //If we have a letter above or bellow, we set the rangeStart to that distance
                if (ctx.grid.isAlphaPerp(cursor)) {
                    if (rangeS == null)
                        rangeS = cursor[0] - wordStart + 1;
                }
                cursor[0] += 1;
                placed += 1;
            }
            //If we already had letters in posBuff and we sat rangeS > lastLetterFound + 1, then we reset it to <-
            if (constIt != 0 and (rangeS == null or rangeS.? > posBuff[constIt - 1] + 1)) {
                rangeS = posBuff[constIt - 1] + 1;
            }

            //Backtrack if we hit a letter till we have a space to our right
            while (ctx.grid.isInBounds(cursor) and placed > 0 and 
                  (ctx.grid.isAlpha(cursor) or ctx.grid.isAlphaRight(cursor)))
            {
                cursor[0] -= 1;
                placed -= 1;
            }
            if (placed == 0 and ctx.grid.isAlpha(cursor)) {
                hasPushed = true;
                continue;
            }
            var rangeEnd = cursor[0] - wordStart;
            if (rangeS != null and rangeEnd < rangeS.? and ctx.grid.isAlphaRight(cursor)) {
                hasPushed = true;
                continue;
            }
            rangeEnd += if (placed == ctx.rack.items.len or cursor[0] == GRID_SIZE) 0 else 1;

            //Fix range at min 2 as a word can't be a single letter
            rangeS = if (rangeS != null and rangeS.? < 2) 2 else rangeS;

            if (cursor[0] < GRID_SIZE and !ctx.grid.isAlphaRight(cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }

            if (rangeS != null and rangeEnd >= 2 and rangeEnd >= rangeS.?) {
                try cellConst.ranges.append(.{rangeS.?, rangeEnd});
                try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
            }
            if (rangeS == null and cursor[0] == GRID_SIZE and constIt != 0)
                cursor[0] -= 1;
            //If we didn't find any perpAlpha and we're at the end of our frame 
            //and we didn't find any letter along the way, we know for sure no word is possible here
            if ((rangeS == null and cursor[0] == 14 and constIt == 0) or 
               ((rangeS != null and cursor[0] == 14))) 
                    break;

            hasPushed = true;
            continue;
        }

        if (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and loopIterator != 0 and placed < ctx.rack.items.len) {
            while (cursor[0] < GRID_SIZE and !ctx.grid.isAlpha(cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }
            while (cursor[0] < GRID_SIZE and ctx.grid.isAlpha(cursor)) {
                cBuff[constIt] = try ctx.grid.getChar(cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
            var rangeS = (cursor[0] - wordStart);
            var rangeEnd = (cursor[0] - wordStart);

            //Fix for words beginning with an already placed letter that has holes right after it
            const posBuffLen = std.mem.indexOfSentinel(u4, 0, posBuff);
            if (posBuffLen > 0 and rangeS < GRID_SIZE) {
                rangeS = posBuff[posBuffLen - 1];
                if (ctx.grid.isAlpha(.{posBuff[posBuffLen - 1], cursor[1]})) {
                    rangeS += 1;
                }
                rangeS = if (rangeS < 2) 2 else rangeS;
                rangeS = if (rangeS > rangeEnd) rangeEnd else rangeS;
            }

            while (cursor[0] < GRID_SIZE and !ctx.grid.isAlphaRight(cursor) and placed < ctx.rack.items.len) {
                rangeEnd += 1;
                placed += 1;
                cursor[0] += 1;
            }
            if (cursor[0] <= GRID_SIZE and placed <= ctx.rack.items.len and rangeEnd >= 2) {
                try cellConst.ranges.append(.{rangeS, rangeEnd});
                try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
                if (placed < ctx.rack.items.len)
                    hasPushed = true;
            }
        }
    }
} 

pub const Placement = struct {
    c:   [GRID_SIZE:0]u8   = .{0} ** GRID_SIZE,
    pos: [GRID_SIZE:0]u4   = .{0} ** GRID_SIZE,
};

pub const Constraints = struct {
    ranges: ArrayList(Range),
    places: ArrayList(Placement),

    pub fn init(alloc: Allocator) Constraints {
        return .{
            .ranges = ArrayList(Range).init(alloc),
            .places = ArrayList(Placement).init(alloc),
        };
    }

    pub fn getCellConstraints(ctx: *Context, cell: Point) !Constraints {
        if (cell[0] > 0 and ctx.grid.isAlphaLeft(cell))
        return error.NoWordCanBeginHere;

        var cellConst = Constraints.init(ctx.alloc);

        var c:[GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
        var pos:[GRID_SIZE:0]u4 = .{0} ** GRID_SIZE;

        try rGetConstraints(ctx, &cellConst, cell, &c, &pos);

        return cellConst;
    }

    pub fn format(self: *const Constraints, comptime fmt: []const u8, _: std.fmt.FormatOptions, writer: anytype) !void {
        _ = fmt;
        _ = try writer.write("---Constraint---\n");
        for (0..self.ranges.items.len) |i| {
            const range = self.ranges.items[i];
            const place = self.places.items[i];
            try writer.print("R: {d}-{d}\n", .{range[0], range[1]});
            for (0..place.pos.len) |j| {
                if (place.pos[j] == 0) 
                    break;
                try writer.print("P[{d}]: {c} {d}\n", .{j, place.c[j], place.pos[j] - 1});
            }
            _ = try writer.write("~~~~~~~~~~~~~~~~\n");
        }
        _ = try writer.write("----------------\n");
    }
};
