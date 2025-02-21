const std           = @import("std");
const mainModule    = @import("main.zig");
const ctxModule     = @import("Context.zig");

const Context       = ctxModule.Context;
const Match         = mainModule.Match;
const Point         = @Vector(2, u4);
const GRID_SIZE     = 15;

pub const Scrabble  = 50;

pub const LetterScore = [26]u8 {
    1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 10, 1, 2, 1, 1, 3, 8, 1, 1, 1, 1, 4, 10, 10, 10, 10
};

pub fn computeScorePerp(ctx: *Context, currPoint: Point, currCh: u8) !u32 {
    //FIX: A lot of cash misses happen here. Can be fixed by storing a transposed version of the grid
 
    var start: u4 = currPoint[1];
    while (start > 0 and ctx.grid.isAlpha(.{currPoint[0], start - 1})) : (start -= 1) {}

    var end: u4 = currPoint[1];
    while (end < 14 and ctx.grid.isAlpha(.{currPoint[0], end + 1})) : (end += 1) {}

    var score: u32 = 0;
    var buffer: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
    var wordMultiplier: u32 = 1;

    if (start >= end) return 0;

    std.log.info("Start at: {d}\n", .{currPoint[1]});
    std.log.info("R: {d}-{d}\n", .{start, end});


    for (start..end + 1) |y| {
        if (y == currPoint[1]) {
            buffer[y - start] = currCh;
            score += LetterScore[currCh - 'A'] * ctx.grid.getLetterModifier(&currPoint).asU32();
            wordMultiplier = ctx.grid.getWordModifier(&currPoint).asU32();
        } else {
            // print("pos: {d}, ch: {c}\n", .{currPoint, try getChar(ctx.grid, currPoint)});
            buffer[y - start] = try ctx.grid.getChar(.{currPoint[0], @intCast(y)});
            score += LetterScore[try ctx.grid.getChar(.{currPoint[0], @intCast(y)}) - 'A'];
        }
    }
    const endOfWord = std.mem.indexOfSentinel(u8, 0, buffer[0..]);
    // std.debug.print("DICT CHECK: {s}\n", .{buffer});
    ctx.mutex.lock();
    defer ctx.mutex.unlock();

    if (!ctx.dict.contains(buffer[0..endOfWord])) {
        return error.UnknownWord;
    }
    return score * wordMultiplier;
}

pub fn computeScorePar(ctx: *const Context, currMatch: *const Match, ghostedPos: ?u4) u32 {
    var wordScore: u32 = 0;
    var wordMultiplier: u32 = 1;
    for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
        const currPoint = Point{@intCast(x), currMatch.saveCoord};
        const letterScore = LetterScore[currMatch.word[x - currMatch.range[0]] - 'A'];

        if (ctx.grid.grid[currPoint[1]][currPoint[0]] == '.') {
            wordMultiplier *= ctx.grid.getWordModifier(&currPoint).asU32();
            if (ghostedPos == null or ((x - currMatch.range[0]) != ghostedPos.?)) {
                wordScore += (letterScore * ctx.grid.getLetterModifier(&currPoint).asU32());
            }
        } else {
            wordScore += letterScore;
        }
    }
    return (wordScore * wordMultiplier);
}

// W: ??ILOTRE
// --> PIETRE
// --> PI?TRE
// --> PIETR?
