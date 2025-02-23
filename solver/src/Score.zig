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

pub fn computeScorePerp(ctx: *Context, currPoint: Point, currCh: u8, joker: bool) !u32 {
    //FIX: A lot of cash misses happen here. Can be fixed by storing a transposed version of the grid
 
    var start: u4 = currPoint[1];
    while (start > 0 and ctx.grid.isAlpha(.{currPoint[0], start - 1})) : (start -= 1) {}

    var end: u4 = currPoint[1];
    while (end < 14 and ctx.grid.isAlpha(.{currPoint[0], end + 1})) : (end += 1) {}

    var score: u32 = 0;
    var buffer: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
    var wordMultiplier: u32 = 1;

    if (start >= end) return 0;

    // std.log.info("Start at: {d}", .{currPoint[1]});
    // std.log.info("R: {d}-{d}", .{start, end});

    for (start..end + 1) |y| {
        if (y == currPoint[1]) {
            buffer[y - start] = currCh;
            score += if (!joker) LetterScore[currCh - 'A'] * ctx.grid.getLetterModifier(&currPoint) else 0;
            wordMultiplier = ctx.grid.getWordModifier(&currPoint);
        } else {
            // print("pos: {d}, ch: {c}\n", .{currPoint, try getChar(ctx.grid, currPoint)});
            buffer[y - start] = '@' + @as(u8, ctx.grid.getChar(.{currPoint[0], @intCast(y)}));
            score += LetterScore[ctx.grid.getChar(.{currPoint[0], @intCast(y)}) - 1];
        }
    }
    const endOfWord = std.mem.indexOfSentinel(u8, 0, buffer[0..]);

    ctx.mutex.lock();
    defer ctx.mutex.unlock();

    if (!ctx.dict.contains(buffer[0..endOfWord])) {
        // std.debug.print("NOT OK: {s}\n", .{buffer});
        return error.UnknownWord;
    }
    // std.debug.print("OK: {s}\n", .{buffer});
    return score * wordMultiplier;
}

pub fn computeScorePar(ctx: *const Context, currMatch: *const Match, ghostedPos: [2]?u4) u32 {
    var wordScore: u32 = 0;
    var wordMultiplier: u32 = 1;
    for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
        const currPoint = Point{@intCast(x), currMatch.perpCoord};
        const letterScore = LetterScore[currMatch.word[x - currMatch.range[0]] - 'A'];

        if (ctx.grid.isEmpty(currPoint)) {
            wordMultiplier *= ctx.grid.getWordModifier(&currPoint);
            const isJoker = (ghostedPos[0] != null and x - currMatch.range[0] == ghostedPos[0].? or
                             ghostedPos[1] != null and x - currMatch.range[0] == ghostedPos[1].?);
            if (!isJoker)
                wordScore += (letterScore * ctx.grid.getLetterModifier(&currPoint));
        } else {
            wordScore += letterScore;
        }
    }
    return (wordScore * wordMultiplier);
}
