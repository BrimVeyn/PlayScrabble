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

pub const JwtClaims = struct {
    sub: []const u8,
    exp: i32,
};

pub fn getClaimsFromToken(app: *App, res: *httpz.Response, token: []const u8) !JWT(JwtClaims) {
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
