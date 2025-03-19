const std           = @import("std");
const mainModule    = @import("main.zig");
const ctxModule     = @import("Context.zig");
const gridModule    = @import("Grid.zig");

const Context       = ctxModule.Context;
const Match         = mainModule.Match;
const Grid          = gridModule.Grid;
const Point         = @Vector(2, u4);
const GRID_SIZE     = 15;

pub const Scrabble  = 50;

pub const LetterScore = [26]u8 {
    1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 10, 1, 2, 1, 1, 3, 8, 1, 1, 1, 1, 4, 10, 10, 10, 10
};

pub fn computeScorePar(ctx: *const Context, currMatch: *const Match, ghostedPos: [2]?u4) u32 {
    var wordScore: u32 = 0;
    var wordMultiplier: u32 = 1;
    for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
        const currPoint = Point{@intCast(x), currMatch.perpCoord};
        const letterScore = LetterScore[currMatch.word[x - currMatch.range[0]] - 'A'];

        if (!ctx.grid.isEmpty(currPoint)) {
            wordScore += letterScore;
            continue;
        }

        wordMultiplier *= ctx.grid.getWordModifier(&currPoint);
        const isJoker = (ghostedPos[0] != null and x - currMatch.range[0] == ghostedPos[0].? or
                         ghostedPos[1] != null and x - currMatch.range[0] == ghostedPos[1].?);
        if (!isJoker) 
            wordScore += (letterScore * ctx.grid.getLetterModifier(&currPoint));
    }
    return (wordScore * wordMultiplier);
}

//NOTE: Modified version for getScore API
pub fn computeScoreParBis(grid: Grid, currMatch: *const Match, ghostedPos: [2]?u4) u32 {
    var wordScore: u32 = 0;
    var wordMultiplier: u32 = 1;
    for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
        const currPoint = Point{@intCast(x), currMatch.perpCoord};
        const letterScore = LetterScore[currMatch.word[x - currMatch.range[0]] - 'A'];

        if (!grid.isEmpty(currPoint)) {
            wordScore += letterScore;
            continue;
        }

        wordMultiplier *= grid.getWordModifier(&currPoint);
        const isJoker = (ghostedPos[0] != null and x - currMatch.range[0] == ghostedPos[0].? or
                         ghostedPos[1] != null and x - currMatch.range[0] == ghostedPos[1].?);
        if (!isJoker) 
            wordScore += (letterScore * grid.getLetterModifier(&currPoint));
    }
    return (wordScore * wordMultiplier);
}


//NOTE: Unused in solver, only usefull for getScore API
pub fn computeScorePerp(grid: Grid, currPoint: Point, currCh: u8) u32 {
    var start: u4 = currPoint[1];
    while (start > 0 and grid.isAlpha(.{currPoint[0], start - 1})) : (start -= 1) {}

    var end: u4 = currPoint[1];
    while (end < 14 and grid.isAlpha(.{currPoint[0], end + 1})) : (end += 1) {}

    var score: u32 = 0;
    var buffer: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
    var wordMultiplier: u32 = 1;

    std.log.info("s-e: {d}:{d} on row {d}", .{start, end, currPoint[0]});

    for (start..end + 1) |y| {
        if (y == currPoint[1]) {
            buffer[y - start] = currCh;
            const idx: u8 = currCh - '@';
            score += LetterScore[idx] * grid.getLetterModifier(&currPoint);
            wordMultiplier = grid.getWordModifier(&currPoint);
            std.log.info("U:Letter: ({c},{d}):{d}", .{@as(u8, idx) + '@', idx, LetterScore[idx]});
        } else {
            const ch = grid.getChar(.{currPoint[0], @intCast(y)});
            buffer[y - start] = @as(u8, ch) + '@';
            score += LetterScore[ch - 1];
            std.log.info("B:Letter: ({c},{d}):{d}", .{@as(u8, ch) + '@', ch, LetterScore[ch - 1]});
        }
    }
    std.log.info("word: {s}", .{buffer});
    std.log.info("WordScore, Mult: {d}, {d}", .{score, wordMultiplier});
    return score * wordMultiplier;
}
