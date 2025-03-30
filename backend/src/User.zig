const std = @import("std");
const httpz = @import("httpz");
const pg = @import("pg");
const jwt = @import("jwt");
const JWT = jwt.JWT;
const http = std.http;

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

pub const LoginGoogleRequest = struct {
    token: []const u8,   
};

pub const GoogleResponse = struct {
    iss: []const u8,
    azp: []const u8,
    aud: []const u8,
    sub: []const u8,
    email: []const u8,
    email_verified: []const u8,
    nbf: []const u8,
    name: []const u8,
    picture: []const u8,
    given_name: []const u8,
    family_name: []const u8,
    iat: []const u8,
    exp: []const u8,
    jti: []const u8,
    alg: []const u8,
    kid: []const u8,
    typ: []const u8
};

pub fn refresh(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const maybeRefresh = req.cookies().get("Refresh-Token");

    if (maybeRefresh) |refreshToken| {
        var maybeRow = app.db.rowOpts(
            \\SELECT *
            \\FROM "user"
            \\WHERE refresh = $1
        , .{refreshToken}, .{.column_names = true}) catch |e| {
            log.err("/refresh: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        if (maybeRow) |*row| {
            defer row.deinit() catch {};
            const userInfo = try row.to(UserFields, .{});

            const idStr = try std.fmt.allocPrint(res.arena, "{d}", .{userInfo.id});
            defer res.arena.free(idStr);

            var claims = getClaimsFromToken(app, res, refreshToken) catch |e| switch(e) {
                error.TokenExpired => { 
                    log.info("/refresh: Token expired", .{});
                    res.status = 401; 
                    res.body = "Refesh token expired";
                    return ; 
                },
                else => { 
                    res.status = 500; 
                    res.body = "Internal server error";
                    return ;
                }
            };
            defer claims.deinit();

            const newAccessToken = try generateJWT(app, res.arena, @intFromEnum(JWTDuration.@"30_seconds"), idStr);
            try res.setCookie("Access-Token", newAccessToken, .{
                .http_only = true,
                .secure = true,
                .same_site = .strict,
                .max_age = @intFromEnum(JWTDuration.@"30_seconds"),
            });

            log.info("/refresh: Successfully generated a new refresh token for user: {s}", .{userInfo.username});
            res.status = 200;

        } else {
            res.status = 404;
            res.body = "Not logged in";
        }
    } else {
        res.status = 401;
        res.body = "No refresh token";
    }
}

pub fn loginGoogle(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.json(LoginGoogleRequest)) |reqBody| {
        const url = try std.fmt.allocPrint(res.arena, "https://oauth2.googleapis.com/tokeninfo?id_token={s}", .{reqBody.?.token});
        var client = http.Client{
            .allocator = res.arena,
        };
        defer client.deinit();

        var buffer = try std.ArrayList(u8).initCapacity(res.arena, 10_000);

        const status = try client.fetch(.{
            .method = .GET,
            .location = .{ .url = url, },
            .response_storage = .{ .dynamic = &buffer }
        });

        if (status.status != .ok) {
            res.status = 498;
            res.body = "Invalid token";
            log.err("loginGoogle: Invalid Token", .{});
            return ;
        }
        const responseBody = try std.json.parseFromSliceLeaky(GoogleResponse, res.arena, buffer.items, .{});
        log.info("✅ Token valide\n", .{});
        log.info("Email: {s}\n", .{responseBody.email});

        var maybeUser = app.db.rowOpts(
            \\SELECT id as id FROM "user" WHERE email = $1
        , .{responseBody.email}, .{ .column_names = true }) catch |e| {
            log.err("login: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };

        var id: i32 = undefined;
        if (maybeUser == null) {
            log.err("loginGoogle: User with email: {s} not found", .{responseBody.email});
            res.status = 400;
            try res.json(Error{.err = "User not found"}, .{});
            return ;
        } else {
            id = maybeUser.?.getCol(i32, "id");
            maybeUser.?.deinit() catch {};
        }

        const idStr = try std.fmt.allocPrint(res.arena, "{d}", .{id});
        defer res.arena.free(idStr);

        const accessToken = try generateJWT(app, res.arena, @intFromEnum(JWTDuration.@"30_seconds"), idStr);
        try res.setCookie("Access-Token", accessToken, .{
            .http_only = true,
            .secure = true,
            .same_site = .strict,
            .max_age = @intFromEnum(JWTDuration.@"30_seconds"),
        });

        const refreshToken = try generateJWT(app, res.arena, @intFromEnum(JWTDuration.@"7_days"), idStr);
        try res.setCookie("Refresh-Token", refreshToken, .{
            .http_only = true,
            .secure = true,
            .same_site = .strict,
            .max_age = @intFromEnum(JWTDuration.@"7_days"),
        });

        log.info("AccessToken generated: {s}", .{accessToken});
        log.info("RefreshToken generated: {s}", .{refreshToken});

        _ = app.db.exec(
            \\UPDATE "user"
            \\SET refresh = $1
            \\WHERE id = $2
        , .{refreshToken, idStr}) catch |e| {
            log.err("login: Updating refresh token failed: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };

        log.info("Successfully logged in as {s}", .{responseBody.email});
        res.status = 200;

    } else |e| {
        log.err("emailCheck: req.json failed: {!}", .{e});
        res.status = 400;
        res.json(Error{.err = "Missing fields"}, .{}) catch {};
        return ;
    }
}

pub const EmailCheckReq = struct {
    email: []const u8,
};

pub fn checkEmail(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.json(EmailCheckReq)) |body| {
        log.info("/checkEmail: email: {s}", .{body.?.email});
        //NOTE: Check if a user with same email already exist
        var maybeUser = app.db.row(
            \\SELECT email FROM "user" WHERE email = $1
        , .{body.?.email}) catch |e| {
            log.err("register: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        if (maybeUser) |_| {
            defer maybeUser.?.deinit() catch {};
            res.status = 409;
            const message = try std.fmt.allocPrint(res.arena, "User with email {s} already exist", .{body.?.email});
            defer res.arena.free(message);
            try res.json(Error{.err = message}, .{});
            return ;
        }
    } else |e| {
        log.err("emailCheck: req.json failed: {!}", .{e});
        res.status = 400;
        try res.json(Error{.err = "Missing fields"}, .{});
    }
}

pub const UsernameCheckReq = struct {
    username: []const u8,
};

pub fn checkUsername(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.json(UsernameCheckReq)) |body| {
        log.info("/checkUsername: username: {s}", .{body.?.username});
        //NOTE: Check if a user with same username already exist
        var maybeUser = app.db.row(
            \\SELECT username FROM "user" WHERE username = $1
        , .{body.?.username}) catch |e| {
            log.err("/checkUsername: PG: {!}", .{e});
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
    } else |e| {
        log.err("/checkUsername: req.json failed: {!}", .{e});
        res.status = 400;
        try res.json(Error{.err = "Missing fields"}, .{});
    }
}



pub fn me(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const maybeRefresh = req.cookies().get("Refresh-Token");
    if (maybeRefresh) |refreshToken| {
        const maybeAccess = req.cookies().get("Access-Token");

        if (maybeAccess) |accessToken| {
            log.info("/me: checking access token expiration...", .{});
            var token = getClaimsFromToken(app, res, accessToken) catch |e| switch (e) {
                error.TokenExpired => { 
                    log.info("/me: Token expired", .{});
                    res.status = 401; 
                    res.body = "Access token expired";
                    return ; 
                },
                else => { 
                    res.status = 500; 
                    res.body = "Internal server error";
                    return ;
                }
            };
            defer token.deinit();
        } else {
            log.info("/me: Token expired", .{});
            res.status = 401;
            res.body = "Acces token not found or expired";
            return ;
        }

        var maybeRow = app.db.rowOpts(
            \\SELECT *
            \\FROM "user"
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
            log.info("me: Acces and Refresh ok", .{});
            try res.json(userInfo, .{});
        } else {
            res.status = 401;
            res.body = "Not logged in";
        }
    } else {
        res.status = 401;
        res.body = "Not logged in";
    }
}

pub fn getUsers(app: *App, _: *httpz.Request, res: *httpz.Response) !void {
    errdefer |e| {
        res.status = 500;
        log.err("getUsers: {!}", .{e});
    }

    const queryRes = try app.db.query("SELECT * FROM 'user';", .{});
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

        //NOTE: Check if a user with same username already exist
        var maybeUser = app.db.row(
            \\SELECT username FROM "user" WHERE username = $1
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

        //NOTE: Check if a user with same email already exist
        maybeUser = app.db.row(
            \\SELECT email FROM "user" WHERE email = $1
        , .{body.?.email}) catch |e| {
            log.err("register: PG: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
        if (maybeUser) |_| {
            defer maybeUser.?.deinit() catch {};
            res.status = 409;
            const message = try std.fmt.allocPrint(res.arena, "User with email {s} already exist", .{body.?.email});
            defer res.arena.free(message);
            try res.json(Error{.err = message}, .{});
            return ;
        }

        _ = app.db.exec(
            \\INSERT INTO "user" (username, email, password)
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
    @"30_seconds" = 30,
    @"30_days" = 2592000,
};

pub fn login(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    if (req.json(LoginRequest)) |body| {

        var maybeUser = app.db.rowOpts(
            \\SELECT id as id FROM "user" WHERE password = $1
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

        const accessToken = try generateJWT(app, res.arena, @intFromEnum(JWTDuration.@"30_seconds"), idStr);
        try res.setCookie("Access-Token", accessToken, .{
            .http_only = true,
            .secure = true,
            .same_site = .strict,
            .max_age = @intFromEnum(JWTDuration.@"30_seconds"),
        });

        const refreshToken = try generateJWT(app, res.arena, @intFromEnum(JWTDuration.@"7_days"), idStr);
        try res.setCookie("Refresh-Token", refreshToken, .{
            .http_only = true,
            .secure = true,
            .same_site = .strict,
            .max_age = @intFromEnum(JWTDuration.@"7_days"),
        });

        log.info("AccessToken generated: {s}", .{accessToken});
        log.info("RefreshToken generated: {s}", .{refreshToken});

        _ = app.db.exec(
            \\UPDATE "user"
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

pub fn logout(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    //NOTE: Delete refresh from database
    if (req.cookies().get("Refresh-Token")) |refreshToken| {
        var token = try getClaimsFromToken(app, res, refreshToken);
        defer token.deinit();

        _ = app.db.exec(
            \\UPDATE "user"
            \\SET refresh = NULL
            \\WHERE id = $1
        , .{token.claims.sub}) catch |e| {
            log.err("logout: Unable to retreive Refresh-Token: {!}", .{e});
            res.status = 500;
            res.body = "Internal server error";
            return ;
        };
    }
    try deleteCookie(res, "Access-Token");
    try deleteCookie(res, "Refresh-Token");

    log.info("logout: Successfully logged out", .{});
    res.status = 200;
}

pub const JwtClaims = struct {
    sub: []const u8,
    exp: i32,
};

fn getClaimsFromToken(app: *App, res: *httpz.Response, token: []const u8) !JWT(JwtClaims) {
    const claims = jwt.decode(res.arena, JwtClaims, token,
    .{ .secret = app.jwt_secret }, 
    .{}) catch |e| switch (e) {
        error.TokenExpired => {
            log.err("Token expired !", .{});
            res.status = 401;
            return e;
        },
        else => {
            log.err("Error: {!}", .{e});
            return error.JWT;
        },
    };
    return claims;
}

fn deleteCookie(res: *httpz.Response, identifier: []const u8) !void {
    try res.setCookie(identifier, "", .{
        .http_only = true,
        .secure = true,
        .same_site = .strict,
        .max_age = 0,
    });
}


pub fn getSoloGames(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    _ = app;
    _ = req;
    _ = res;
}
