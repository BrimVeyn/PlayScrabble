const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const solver = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    const httpz = b.dependency("httpz", .{
        .target = target,
        .optimize = optimize,
    });

    const generator = b.createModule(.{
        .root_source_file = b.path("src/generate/generate.zig"),
        .target = target,
        .optimize = optimize,
    });

    const solver_exe = b.addExecutable(.{
        .name = "solver",
        .root_module = solver,
    });


    const generator_exe = b.addExecutable(.{
        .name = "generator",
        .root_module = generator,
    });

    solver_exe.root_module.addImport("httpz", httpz.module("httpz"));
    b.installArtifact(solver_exe);
    b.installArtifact(generator_exe);

    const run_cmd = b.addRunArtifact(solver_exe);

    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    const exe_unit_tests = b.addTest(.{
        .root_module = solver,
    });

    const run_exe_unit_tests = b.addRunArtifact(exe_unit_tests);

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_exe_unit_tests.step);
}
