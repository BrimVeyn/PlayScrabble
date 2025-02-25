const std = @import("std");
const httpz = @import("httpz");
const pg = @import("pg");
const jwt = @import("jwt");

const mainModule = @import("main.zig");
const App = mainModule.App;

const print         = std.debug.print;
const log           = std.log;

pub const User = @This();

pub const UserFields = struct {
    id: i32,
    username: []const u8,
    email: []const u8,
    password: []const u8,
    refresh: ?[]const u8,
};

pub const Error = struct {
    err: []const u8,
};

pub fn getUser(app: *App, _: *httpz.Request, res: *httpz.Response) !void {
    _ = res;
    _ = app;
}

pub fn me(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const maybeRefresh = req.cookies().get("Refesh-Token");
    if (maybeRefresh) |refreshToken| {
        var maybeRow = app.db.rowOpts(
            \\SELECT *
            \\FROM USERS
            \\WHERE refresh = $1
        , .{refreshToken}, .{.column_names = true}) catch |e| {
            log.err("me: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        if (maybeRow) |*row| {
            defer row.deinit() catch {};
            const userInfo = try row.to(UserFields, .{});
            log.info("me: OK", .{});
            try res.json(userInfo, .{});
        } else {
            res.status = 404;
            res.body = "Not logged in";
        }
    } else {
        res.status = 404;
        res.body = "Not logged in";
    }
}

pub fn getUsers(app: *App, _: *httpz.Request, res: *httpz.Response) !void {
    errdefer |e| {
        res.status = 500;
        log.err("getUsers: {!}", .{e});
    }

    const queryRes = try app.db.query("SELECT * FROM users;", .{});
    defer queryRes.deinit();

    var users = std.ArrayList(UserFields).init(res.arena);
    while (try queryRes.next()) |row| {
        const user = try row.to(UserFields, .{});
        try users.append(user);
    }
    try res.json(users.items[0..], .{});
    res.status = 200;
    log.info("getUsers: OK", .{});
}

const RegisterRequest = struct {
    email: []u8,
    username: []u8,
    password: []u8,
};

pub fn register(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.json(RegisterRequest)) |body| {

        var maybeUser = app.db.row(
            \\SELECT username FROM users WHERE username = $1
        , .{body.?.username}) catch |e| {
            log.err("register: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        if (maybeUser) |_| {
            defer maybeUser.?.deinit() catch {};
            res.status = 409;
            const message = try std.fmt.allocPrint(res.arena, "User with username {s} already exist", .{body.?.username});
            defer res.arena.free(message);
            try res.json(Error{.err = message}, .{});
            return ;
        }

        _ = app.db.exec(
            \\INSERT INTO users (username, email, password)
            \\values ($1, $2, $3)
        , .{body.?.username, body.?.email, body.?.password}) catch |e| {
            log.err("register: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        log.info("register: OK", .{});
        res.status = 200;
    } else |e| {
        log.err("register: req.json failed: {!}", .{e});
        res.status = 400;
        try res.json(Error{.err = "Missing fields"}, .{});
    }
}

pub fn generateJWT(app: *App, alloc: std.mem.Allocator, exp: i32, sub: []const u8) ![]const u8 {
    const token = try jwt.encode(
        alloc,
        .{ .alg = .HS256 },
        .{
            .sub = sub,
            .exp = std.time.timestamp() + exp,
        },
        .{ .secret = app.jwt_secret },
    );
    return token;
}

const LoginRequest = struct {
    username: []const u8,
    password: []const u8,
};

const JWTDuration = enum(i32) {
    @"7_days" = 604800,
    @"30_days" = 2592000,
};

pub fn login(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.json(LoginRequest)) |body| {

        if (req.cookies().get("Access-Token")) |token| {
            var claims = jwt.decode(
                res.arena, 
                struct {sub: []const u8, exp: i32 }, 
                token,
                .{ .secret = app.jwt_secret }, 
            .{}) catch |e| switch (e) {
                error.TokenExpired => {
                    log.err("Token expired !", .{});
                    res.status = 400;
                    return ;
                },
                else => {
                    log.err("Error: {!}", .{e});
                    return ;
                },
            };
            defer claims.deinit();

            res.status = 406;
            try res.json(Error{.err = "Already logged in"}, .{});
            return ;
        }

        if (req.cookies().get("Refesh-Token")) |token| {
            var dbRow = app.db.rowOpts(
                \\SELECT refresh FROM users
                \\WHERE refresh = $1
            , .{token}, .{ .column_names = true }) catch |e| {
                log.err("login: PG: {!}", .{e});
                res.status = 500;
                res.body = "Internal server error";
                return ;
            };

            if (dbRow) |_| {
                defer dbRow.?.deinit() catch {};
                try res.json(Error{.err = "Already logged in"}, .{});
                res.status = 406;
                return ;
            }
        }


        var maybeUser = app.db.rowOpts(
            \\SELECT id as id FROM users WHERE password = $1
        , .{body.?.password}, .{ .column_names = true }) catch |e| {
            log.err("login: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };

        var id: i32 = undefined;
        if (maybeUser == null) {
            log.err("login: Password missmatch for {s}", .{body.?.username});
            res.status = 400;
            try res.json(Error{.err = "Invalid credentials"}, .{});
            return ;
        } else {
            id = maybeUser.?.getCol(i32, "id");
            maybeUser.?.deinit() catch {};
        }

        const idStr = try std.fmt.allocPrint(res.arena, "{d}", .{id});
        defer res.arena.free(idStr);

        const accessToken = try generateJWT(app, res.arena, @intFromEnum(JWTDuration.@"7_days"), idStr);
        try res.setCookie("Access-Token", accessToken, .{
            .http_only = true,
            .secure = true,
            .same_site = .strict,
            .max_age = @intFromEnum(JWTDuration.@"7_days"),
        });

        const refreshToken = try generateJWT(app, res.arena, @intFromEnum(JWTDuration.@"30_days"), idStr);
        try res.setCookie("Refesh-Token", refreshToken, .{
            .http_only = true,
            .secure = true,
            .same_site = .strict,
            .max_age = @intFromEnum(JWTDuration.@"30_days"),
        });

        log.info("AccessToken generated: {s}", .{accessToken});
        log.info("RefreshToken generated: {s}", .{refreshToken});

        _ = app.db.exec(
            \\UPDATE users
            \\SET refresh = $1
            \\WHERE id = $2
        , .{refreshToken, idStr}) catch |e| {
            log.err("login: Updating refresh token failed: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };

        log.info("Successfully logged in as {s}", .{body.?.username});
        res.status = 200;
    } else |e| {
        log.err("register: req.json failed: {!}", .{e});
        res.body = "Internal server error";
        res.status = 500;
    }
}
