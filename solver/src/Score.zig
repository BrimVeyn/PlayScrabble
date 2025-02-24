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
