const std               = @import("std");
const dictContent       = @embedFile("generate/Data.txt");
const print             = std.debug.print;
const AutoArrayHashMap  = std.AutoArrayHashMap;
const AutoHashMap       = std.AutoHashMap;
const ArrayList         = std.ArrayList;
const Allocator         = std.mem.Allocator;

const gridFile          = @import("Grid.zig");
const Grid              = gridFile.Grid;
const GRID_SIZE         = 15;

const generator             = @import("generate/generate.zig");
const OrderedMap            = generator.OrderedMap;
const asciiOrderedMapPath   = generator.asciiOrderedMapPath;
const Map                   = generator.Map;

const PermSet              = std.StringArrayHashMap(bool);
const String               = ArrayList(u8);
const StringUnmanaged      = std.ArrayListUnmanaged(u8);
const StringVec            = ArrayList([]const u8);

pub fn permutations(alloc: Allocator, perms: *PermSet, pattern: *String, buffer: *String, patternI: usize, minLen: usize, maxLen: usize) !void {
    if (buffer.items.len != 0) {
        // if (buffer.items.len >= minLen and buffer.items.len <= maxLen and
        //     !perms.contains(buffer.items) and ctx.orderedMap.data.contains(buffer.items)) 
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen and
            !perms.contains(buffer.items)) 
        {
            try perms.put(try alloc.dupe(u8, buffer.items), true);
        }
    }
    if (patternI >= pattern.items.len)
        return;

    try buffer.append(pattern.items[patternI]);
    try permutations(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);

    _ = buffer.pop();
    try permutations(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);
}

fn orderU8(context: u8, item: u8) std.math.Order {
    return (std.math.order(context, item));
}

fn insertSorted(string: *String, ch: u8) !void {
    const idx = std.sort.lowerBound(u8, string.items[0..], ch, orderU8);
    try string.insert(idx, ch);
}

fn insertSortedAssumeCapacity(string: *StringUnmanaged, ch: u8) void {
    const idx = std.sort.lowerBound(u8, string.items[0..], ch, orderU8);
    string.insertAssumeCapacity(idx, ch);
}

fn popSorted(string: *String, ch: u8) !void {
    const idx = std.sort.binarySearch(u8, string.items[0..], ch, orderU8) orelse return error.NoWordCanBeginHere;
    _ = string.orderedRemove(idx);
}

pub fn permutationsSortTest(alloc: Allocator, perms: *PermSet, pattern: *String, buffer: *String, patternI: usize, minLen: usize, maxLen: usize) !void {
    if (buffer.items.len != 0) {
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen and !perms.contains(buffer.items)) {
            try perms.put(try alloc.dupe(u8, buffer.items), true);
        }
    }
    if (patternI >= pattern.items.len)
        return;

    try insertSorted(buffer, pattern.items[patternI]);
    // try buffer.append(pattern.items[patternI]);
    try permutationsSortTest(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);

    try popSorted(buffer, pattern.items[patternI]);
    // _ = buffer.pop();
    try permutationsSortTest(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);
}

pub fn permutationsSort(alloc: Allocator, perms: *PermSet, pattern: *String, buffer: *String, patternI: usize, minLen: usize, maxLen: usize) !void {
    if (buffer.items.len != 0) {
        if (buffer.items.len >= minLen and buffer.items.len <= maxLen and !perms.contains(buffer.items)) {
            try perms.put(try alloc.dupe(u8, buffer.items), true);
        }
    }
    if (patternI >= pattern.items.len)
        return;

    try insertSorted(buffer, pattern.items[patternI]);
    // try buffer.append(pattern.items[patternI]);
    try permutationsSort(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);

    try popSorted(buffer, pattern.items[patternI]);
    // _ = buffer.pop();
    try permutationsSort(alloc, perms, pattern, buffer, patternI + 1, minLen, maxLen);
}

pub fn populateMap(alloc: Allocator) !Map {
    var mapFile = try std.fs.cwd().openFile(asciiOrderedMapPath, .{});
    defer mapFile.close();

    const rawContent = try mapFile.readToEndAlloc(alloc, 10_000_000_000);

    const map = try Map.fromJson(alloc, rawContent);
    return map;
}

fn lessThan(context: void, a: u8, b: u8) bool {
    _ = context;
    return (a < b);
}

fn getWordListTest(alloc: Allocator, perms: *PermSet, orderedMap: Map) !StringVec {
    var vec = StringVec.init(alloc);

    for (perms.keys()) |permutation| {
        const permWords = orderedMap.data.get(permutation) orelse continue;
        // try vec.appendSlice(permWords.keys()); //<-- slower
        for (permWords.keys()) |word| {
            try vec.append(word);
        }
    }
    return vec;
}
fn getFilteredWordList(ctx: *const Context, perms: *const PermSet, cellPlacement: *const Placement) !StringVec {
    var vec = StringVec.init(ctx.alloc);

    for (perms.keys()) |*permutation| {
        const permWords = ctx.orderedMap.data.get(permutation.*) orelse continue;
        outer: for (permWords.keys()) |*word| {
            for (0..cellPlacement.c.len) |it| {
                if (cellPlacement.c[it] == 0) break;
                if (word.*[cellPlacement.pos[it] - 1] != cellPlacement.c[it]) continue :outer;
            }
            try vec.append(word.*);
        }
    }
    return vec;
}

fn getBaseFilteredWordList(ctx: *const Context, perms: *const PermSet, range: *const Range) !StringVec {
    var vec = StringVec.init(ctx.alloc);

    for (perms.keys()) |*permutation| {
        const permWords = ctx.orderedMap.data.get(permutation.*) orelse continue;
        for (permWords.keys()) |*word| {
            if (word.*.len < range[0] or word.*.len > range[1]) continue;
            try vec.append(word.*);
        }
    }
    return vec;
}

const Direction = enum {
    Vertical,
    Horizontal,
};

const Match = struct {
    word: [GRID_SIZE:0]u8,
    dir: Direction,
    range: Range,
    saveCoord: u4,
    score: u32,
    validate: bool = false,

    pub fn init(currWord: []const u8, cell: *const Point) Match {
        var word: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
        std.mem.copyForwards(u8, word[0..], currWord);
        return .{
            .dir = .Vertical,
            .word = word,
            .range = Range{
                cell[0],
                cell[0] + (@as(u4, @intCast(currWord.len)) - 1),
            },
            .saveCoord = cell[1],
            .score = 0,
        };
    }
};

const MatchVec  = ArrayList(Match);
const Point     = @Vector(2, u4);
const Range     = @Vector(2, u4);

const Placement = struct {
    c:   [GRID_SIZE:0]u8   = .{0} ** GRID_SIZE,
    pos: [GRID_SIZE:0]u4   = .{0} ** GRID_SIZE,
};

const Constraints = struct {
    ranges: ArrayList(Range),
    places: ArrayList(Placement),

    pub fn init(alloc: Allocator) !Constraints {
        return .{
            .ranges = try ArrayList(Range).initCapacity(alloc, 10),
            .places = try ArrayList(Placement).initCapacity(alloc, 10),
        };
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

const ScrabbleDict = std.StringHashMap(bool);

const Context = struct {

    alloc: Allocator,
    grid: Grid,
    rack: String,
    basePerm: PermSet,
    orderedMap: Map,
    dict: ScrabbleDict,
    matchVec: MatchVec,

    pub fn init(alloc: Allocator, gridState: []const u8, rackValue: []const u8) !Context {
        var grid = Grid.init();
        try grid.loadGridState(gridState);

        var rack = String.init(alloc);
        try rack.appendSlice(rackValue);
        std.mem.sort(u8, rack.items[0..], {}, lessThan);

        var buffer = String.init(alloc);
        defer buffer.deinit();

        var perms = PermSet.init(alloc);
        try permutations(alloc, &perms, &rack, &buffer, 0, 1, rack.items.len);

        var dict = ScrabbleDict.init(alloc);
        var lineIt = std.mem.tokenizeScalar(u8, dictContent, '\n');
        while (lineIt.next()) |word| {
            try dict.put(word, true);
        }

        return .{
            .alloc = alloc,
            .grid = grid,
            .rack = rack,
            .basePerm = perms,
            .orderedMap = try populateMap(alloc),
            .dict = dict,
            .matchVec = MatchVec.init(alloc),
        };
    }

    pub fn loadGrid(self: *Context, gridState: []const u8) !void {
        // print("~~~~~~~~~LOADING: {s}~~~~~~~~~~~\n", .{gridState});
        try self.grid.loadGridState(gridState);
    }
};

fn isAlpha(grid: Grid, cell: Point) bool {
    return (grid.grid[cell[1]][cell[0]] >= 'A' and grid.grid[cell[1]][cell[0]] <= 'Z');
}

fn isAlphaLeft(grid: Grid, cell:Point) bool {
    if (cell[0] > 0) {
        const left = Point{cell[0] - 1, cell[1]};
        if (isAlpha(grid, left)) return true;
    }
    return false;
}

fn isAlphaRight(grid: Grid, cell:Point) bool {
    if (cell[0] < (GRID_SIZE - 1)) {
        const right = Point{cell[0] + 1, cell[1]};
        if (isAlpha(grid, right)) return true;
    }
    return false;
}

fn isEmpty(grid: Grid, cell: Point) bool {
    return !isAlpha(grid, cell);
}

fn isAlphaPerp(grid: Grid, cell: Point) bool {
    if (cell[1] > 0) {
        const up = Point{cell[0], cell[1] - 1};
        if (isAlpha(grid, up)) return true;
    }
    if (cell[1] < (GRID_SIZE - 1)) {
        const down = Point{cell[0], cell[1] + 1};
        if (isAlpha(grid, down)) return true;
    }
    return false;
}

fn isAlphaPar(grid: Grid, cell: Point) bool {
    if (cell[0] > 0) {
        const left = Point{cell[0] - 1, cell[1]};
        if (isAlpha(grid, left)) return true;
    }
    if (cell[0] < (GRID_SIZE - 1)) {
        const right = Point{cell[0] + 1, cell[1]};
        if (isAlpha(grid, right)) return true;
    }
    return false;
}

fn isInBounds(cell: Point) bool {
    return (cell[0] >= 0 and cell[0] < GRID_SIZE);
}

fn getChar(grid: Grid, cell: Point) !u8 { 
    if (isInBounds(cell)) {
        return grid.grid[@intCast(cell[1])][@intCast(cell[0])];
    } else return error.OutOfBounds;
}

const GridError = error {
    NoWordCanBeginHere,
    OutOfBounds,
    UnknownWord,
};

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

        if (cursor[0] < GRID_SIZE and isAlpha(ctx.grid, cursor) and loopIterator == 0) {
            while (cursor[0] < GRID_SIZE and isAlpha(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                cBuff[constIt] = try getChar(ctx.grid, cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
        }
        // print("[-1]Placed: {d}\n", .{placed});
        // print("[-1]Cursor: {d}\n", .{cursor});

        if (cursor[0] < GRID_SIZE and !isAlpha(ctx.grid, cursor) and loopIterator == 0) {
            var rangeS: ?u4 = null;
            while (cursor[0] < GRID_SIZE and !isAlpha(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                //If we have a letter above or bellow, we set the rangeStart to that distance
                if (isAlphaPerp(ctx.grid, cursor)) {
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
            // print("[1]RS: {any}\n", .{rangeS});
            // print("[2]PUSHED\n", .{});
            // print("[2]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[2]Cursor: {d}\n", .{cursor});
            // print("[2]Char: {c}\n", .{getChar(ctx.grid, cursor)});
            while (isInBounds(cursor) and placed > 0 and 
                  (isAlpha(ctx.grid, cursor) or isAlphaRight(ctx.grid, cursor)))
            {
                cursor[0] -= 1;
                placed -= 1;
            }
            if (placed == 0 and isAlpha(ctx.grid, cursor)) {
                hasPushed = true;
                continue;
            }
            // print("[1]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[1]Cursor: {d}\n", .{cursor});
            // print("[1]Char: {c}\n", .{getChar(ctx.grid, cursor)});
            // if (cursor[0] < wordStart) 
            //     break;
            var rangeEnd = cursor[0] - wordStart;
            if (rangeS != null and rangeEnd < rangeS.? and isAlphaRight(ctx.grid, cursor)) {
                hasPushed = true;
                continue;
            }
            rangeEnd += if (placed == ctx.rack.items.len or cursor[0] == GRID_SIZE) 0 else 1;
            // print("[1]RS: {any}\n", .{rangeS});
            // print("[1]RE: {d}\n", .{rangeEnd});

            //Fix range at min 2 as a word can't be a single letter
            rangeS = if (rangeS != null and rangeS.? < 2) 2 else rangeS;

            if (cursor[0] < GRID_SIZE and !isAlphaRight(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }

            if (rangeS != null and rangeEnd >= 2 and rangeEnd >= rangeS.?) {
                // print("[1]PUSHED\n", .{});
                // print("[1]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
                // print("[1]Cursor: {d}\n", .{cursor});
                // print("[1]Char: {c}\n", .{getChar(ctx.grid, cursor)});
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

        // print("[2]Placed: {d}\n", .{placed});
        // print("[2]Cursor: {d}\n", .{cursor});
        if (cursor[0] < GRID_SIZE and !isAlpha(ctx.grid, cursor) and loopIterator != 0 and placed < ctx.rack.items.len) {
            while (cursor[0] < GRID_SIZE and !isAlpha(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                cursor[0] += 1;
                placed += 1;
            }
            while (cursor[0] < GRID_SIZE and isAlpha(ctx.grid, cursor)) {
                cBuff[constIt] = try getChar(ctx.grid, cursor);
                posBuff[constIt] = (cursor[0] - wordStart) + 1;
                constIt += 1;
                cursor[0] += 1;
            }
            var rangeS = (cursor[0] - wordStart);
            var rangeEnd = (cursor[0] - wordStart);

            // placed += if (cursor[0] < GRID_SIZE and !isAlpha(ctx.grid, cursor)) 1 else 0;
            //Fix for words beginning with an already placed letter that has holes right after it
            const posBuffLen = std.mem.indexOfSentinel(u4, 0, posBuff);
            if (posBuffLen > 0 and rangeS < GRID_SIZE) {
                // print("[1]RS: {d}\n", .{rangeS});
                rangeS = posBuff[posBuffLen - 1];
                if (isAlpha(ctx.grid, .{posBuff[posBuffLen - 1], cursor[1]})) {
                    rangeS += 1;
                }
                // print("[2]RS: {d}\n", .{rangeS});
                rangeS = if (rangeS < 2) 2 else rangeS;
                rangeS = if (rangeS > rangeEnd) rangeEnd else rangeS;
            }

            // print("[2]RS: {d}\n", .{rangeS});
            // print("[2]RE: {d}\n", .{rangeEnd});
            // print("[2]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[2]Cursor: {d}\n", .{cursor});
            // print("[2]Dist: {d}\n", .{cursor[0] - wordStart});
            // print("----------------------\n", .{});
            while (cursor[0] < GRID_SIZE and !isAlphaRight(ctx.grid, cursor) and placed < ctx.rack.items.len) {
                rangeEnd += 1;
                placed += 1;
                cursor[0] += 1;
            }
            // print("[3]RS: {d}\n", .{rangeS});
            // print("[3]RE: {d}\n", .{rangeEnd});
            // print("[3]Placed: {d} / {d}\n", .{placed, ctx.rack.items.len});
            // print("[3]Cursor: {d}\n", .{cursor});
            // print("[3]Dist: {d}\n", .{cursor[0] - wordStart});
            // if (cursor[0] < GRID_SIZE and isAlphaRight(ctx.grid, cursor) and placed == ctx.rack.items.len) {
            //     rangeEnd -= 1;
            // }
            if (cursor[0] <= GRID_SIZE and placed <= ctx.rack.items.len and rangeEnd >= 2) {
                // print("[2]Pushed\n", .{});
                try cellConst.ranges.append(.{rangeS, rangeEnd});
                try cellConst.places.append(.{.c = cBuff.*, .pos = posBuff.*});
                if (placed < ctx.rack.items.len)
                    hasPushed = true;
            }
        }
    }
    // print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n", .{});

} 

fn getConstraints(ctx: *Context, cell: Point) !Constraints {
    if (cell[0] > 0 and isAlphaLeft(ctx.grid, cell))
        return GridError.NoWordCanBeginHere;

    var cellConst = try Constraints.init(ctx.alloc);

    var c:[GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
    var pos:[GRID_SIZE:0]u4 = .{0} ** GRID_SIZE;

    try rGetConstraints(ctx, &cellConst, cell, &c, &pos);

    return cellConst;
}

const Scrabble = @import("Score.zig").Scrabble;
const LetterScore = @import("Score.zig").LetterScore;

fn computeScorePerp(ctx: *const Context, currPoint: Point, currCh: u8) !u32 {
    var start: u4 = currPoint[1];
    while (start > 0 and isAlpha(ctx.grid, .{currPoint[0], start - 1})) : (start -= 1) {}

    var end: u4 = currPoint[1];
    while (end < 14 and isAlpha(ctx.grid, .{currPoint[0], end + 1})) : (end += 1) {}

    var score: u32 = 0;
    var buffer: [GRID_SIZE:0]u8 = .{0} ** GRID_SIZE;
    var wordMultiplier: u32 = 1;

    for (start..end + 1) |y| {
        if (y == currPoint[1]) {
            buffer[y - start] = currCh;
            score += LetterScore[currCh - 'A'] * ctx.grid.getLetterModifier(&currPoint).asU32();
            wordMultiplier = ctx.grid.getWordModifier(&currPoint).asU32();
        } else {
            // print("pos: {d}, ch: {c}\n", .{currPoint, try getChar(ctx.grid, currPoint)});
            buffer[y - start] = try getChar(ctx.grid, .{currPoint[0], @intCast(y)});
            score += LetterScore[try getChar(ctx.grid, .{currPoint[0], @intCast(y)}) - 'A'];
        }
    }
    const endOfWord = std.mem.indexOfSentinel(u8, 0, buffer[0..]);
    if (!ctx.dict.contains(buffer[0..endOfWord])) {
        return error.UnknownWord;
    }
    return score * wordMultiplier;
}

fn computeScorePar(ctx: *const Context, currMatch: *const Match) u32 {
    var wordScore: u32 = 0;
    var wordMultiplier: u32 = 1;
    for (currMatch.range[0]..currMatch.range[1] + 1) |x| {
        const currPoint = Point{@intCast(x), currMatch.saveCoord};
        const letterScore = LetterScore[currMatch.word[x - currMatch.range[0]] - 'A'];

        // if (std.mem.eql(u8, currMatch.word[0..std.mem.indexOfSentinel(u8, 0, currMatch.word[0..])], "POELASSE")) {
        //     print("at: {d}, Wmul: {d}\n", .{currPoint, ctx.grid.getWordModifier(&currPoint).asU32()});
        //     print("at: {d}, Lmul: {d}\n", .{currPoint, ctx.grid.getLetterModifier(&currPoint).asU32()});
        //     print("CH: {c}\n", .{ctx.grid.grid[currPoint[1]][currPoint[0]]});
        // }
        if (ctx.grid.grid[currPoint[1]][currPoint[0]] == '.') {
            wordMultiplier *= ctx.grid.getWordModifier(&currPoint).asU32();
            wordScore += (letterScore * ctx.grid.getLetterModifier(&currPoint).asU32());
        } else {
            wordScore += letterScore;
        }
    }
    // if (std.mem.eql(u8, currMatch.word[0..std.mem.indexOfSentinel(u8, 0, currMatch.word[0..])], "POELASSE")) {
    //     print("Finale WM: {d}\n", .{wordMultiplier});
    // }
    return (wordScore * wordMultiplier);
}

fn tryMatch(ctx: *const Context, currMatch: *Match) !void {
    var tmpScore: u32 = 0;
    for (currMatch.range[0]..currMatch.range[1]) |x| {
        const currPoint = Point{@intCast(x), currMatch.saveCoord};
        if (ctx.grid.grid[currMatch.saveCoord][x] == '.' and isAlphaPerp(ctx.grid, currPoint)) {
            tmpScore = computeScorePerp(ctx, currPoint, currMatch.word[x - currMatch.range[0]]) catch {
                continue;
            };
            currMatch.score += tmpScore;
        }
    }
    // print("W: {s}, S: {d}\n", .{currMatch.word, currMatch.score});
    currMatch.score += computeScorePar(ctx, currMatch);
    // print("W: {s}, S: {d}\n", .{currMatch.word, currMatch.score});
}

fn computeMatchs(ctx: *Context, cell: *const Point, wordVec: *const StringVec, mandatoryLen: usize) !void {
    for (wordVec.items) |word| {
        var currMatch = Match.init(word, cell);
        tryMatch(ctx, &currMatch) catch continue;

        if ((std.mem.indexOfSentinel(u8, 0, currMatch.word[0..]) - mandatoryLen) == 7) {
            currMatch.score += Scrabble;
        }
        try ctx.matchVec.append(currMatch);
    }
}

fn lessThanMatch(context: void, a: Match, b: Match) bool {
    _ = context;
    return (a.score < b.score);
}

fn evaluateCell(ctx: *Context, cellConst: *Constraints, cell: *Point) !void {
    var cellPerms = ctx.basePerm;
    var mandatoryIt: usize = 0;

    for (0..cellConst.ranges.items.len) |it| {
        if (cellConst.places.items[it].c[0] == 0) {
            const cellWords = try getBaseFilteredWordList(ctx, &cellPerms, &cellConst.ranges.items[it]);
            computeMatchs(ctx, cell, &cellWords, 0) catch continue;
            continue;
        }

        var mandatoryLen: usize = 0;
        for (cellConst.places.items[it].c) |ch| {
            if (ch == 0) break;
            mandatoryLen += 1;
        }

        var tmpPerms = PermSet.init(ctx.alloc);
        for (cellPerms.keys()) |permutation| {
            if ((mandatoryLen + permutation.len) - mandatoryIt < cellConst.ranges.items[it][0] or 
                (mandatoryLen + permutation.len) - mandatoryIt > cellConst.ranges.items[it][1])
            {
                continue;
            }
            var newPermutation = try StringUnmanaged.initCapacity(ctx.alloc, (mandatoryLen + permutation.len) - mandatoryIt);
            newPermutation.appendSliceAssumeCapacity(permutation);
            for (mandatoryIt..mandatoryLen) |i| {
                insertSortedAssumeCapacity(&newPermutation, cellConst.places.items[it].c[i]);
            }
            try tmpPerms.put(newPermutation.items[0..], true);
        }

        // for (tmpPerms.keys(), 0..) |perm, i| {
        //     print("[{d}]P[{d}]: {s}\n", .{it, i, perm});
        // }

        const cellWords = try getFilteredWordList(ctx, &tmpPerms, &cellConst.places.items[it]);
        // for (cellWords.items, 0..) |word, i| {
        //     print("[{d}]vect[{d}] = {s}\n", .{it, i, word});
        // }
        try computeMatchs(ctx, cell, &cellWords, mandatoryLen);
        // _ =matchVec;
        // std.mem.sort(Match, matchVec.items[0..], {}, lessThanMatch);
        // for (matchVec.items, 0..) |match, i| {
        //     print("[{d}]: {s} -> {d}\n", .{i, match.word, match.score});
        // }
        cellPerms = tmpPerms;
        mandatoryIt = mandatoryLen - 1;
    }
}

fn evaluateGrid(ctx: *Context) !void {
    for (0..GRID_SIZE) |y| {
        for (0..GRID_SIZE) |x| {
            // if ((y == 0 and x == 2) or (y == 12 and x == 0)) {
            // if (y == 14 and x == 5) {
                var cell = Point{@intCast(x), @intCast(y)};
                var cellConst = getConstraints(ctx, cell) catch continue;
                if (cellConst.places.items.len == 0)
                    continue;
                // print("Y:{d},X:{d}\n", .{y, x});
                // print("{}", .{cellConst});
                evaluateCell(ctx, &cellConst, &cell) catch continue;
            // }
        }
    }
}

fn solveGrid(ctx: *Context) !i64 {
    const startTime = std.time.microTimestamp();

    // for (wordVec.items, 0..) |word, i| {
    //     print("vect[{d}] = {s}\n", .{i, word});
    // }

    try evaluateGrid(ctx);
    std.mem.sort(Match, ctx.matchVec.items[0..], {}, lessThanMatch);
    // for (ctx.matchVec.items, 0..) |match, i| {
    //     print("[{d}]: {s} -> {d}\n", .{i, match.word, match.score});
    // }
    // for (ctx.matchVec.items, 0..) |match, i| {
    //     print(
    //     \\ word[{}] = {
    //     \\  .range: {},
    //     \\  .saveCoord: {},
    //     \\  .dir: {},
    //     \\  .score: {},
    //     \\ }
    //     , .{i, match.range, match.saveCoord, @tagName(match.dir), match.score});
    // }



    const endTime = std.time.microTimestamp();
    const elapsedMicro: i64 = endTime - startTime;
    const elapsedMilli: f64 = @as(f64, @floatFromInt(elapsedMicro)) / @as(f64, 1000);
    _ = elapsedMilli;

    // print("Elapsed: {d}µs | {d}ms\n", .{elapsedMicro, elapsedMilli});
    return elapsedMicro;
}

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(.{}) = .init;
    const GpaAlloc = gpa.allocator();
    defer _ = gpa.deinit();

    var arena = std.heap.ArenaAllocator.init(GpaAlloc);
    const ArenaAlloc = arena.allocator();
    defer arena.deinit();

    var ctx = try Context.init(ArenaAlloc, "grid00.txt", "SALOPES");
    // for (ctx.basePerm.keys()) |key| {
    //     print("KEY: {s}\n", .{key});
    // }
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid01.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid02.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid03.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid04.txt");
    // try solveGrid(&ctx);
    // try ctx.loadGrid("grid05.txt");
    // try solveGrid(&ctx); 

    var argIt = std.process.args();
    _ = argIt.skip(); //Skps program name
    const loopCountStr = argIt.next() orelse "1";
    const loopCountInt = std.fmt.parseInt(usize, loopCountStr, 10) catch {
        print("Argument must be an integer\n", .{});
        return;
    };

    var times = ArrayList(i64).init(ctx.alloc);
    for (0..loopCountInt) |_| {
        try ctx.loadGrid("grid06.txt");
        try times.append(try solveGrid(&ctx));
    }

    var totalTime: i64 = 0;
    for (times.items) |timeMicro| {
        totalTime += timeMicro;
    }
    const averageTimeMicro: f64 = @as(f64, @floatFromInt(totalTime)) / @as(f64, @floatFromInt(loopCountInt));
    const averageTimeMilli :f64 = @as(f64, @floatFromInt(totalTime)) / @as(f64, (1000 * @as(f64, @floatFromInt(loopCountInt)))); 
    print("Average: {d}µs | {d}ms\n", .{averageTimeMicro, averageTimeMilli});

}

test "simple test" {}
