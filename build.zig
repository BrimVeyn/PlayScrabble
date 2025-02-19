const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // GRID_PATH
    const grid_path = b.option([]const u8, "grid_path", "path to data") orelse b.path("src/data/").src_path.sub_path;
    const options = b.addOptions();
    options.addOption([]const u8, "grid_path", grid_path);

    // DOCKET
    const docker_compose_up = b.addSystemCommand(&.{
        "docker-compose",
        "up",
    });

    const docker_compose_down = b.addSystemCommand(&.{
        "docker-compose",
        "down",
    });

    const docker_compose_build = b.addSystemCommand(&.{
        "docker-compose",
        "build",
    });

    const project_up = b.step("up", "compiles and run everything");
    project_up.dependOn(&docker_compose_up.step);

    const project_down = b.step("down", "shutdown project");
    project_down.dependOn(&docker_compose_down.step);

    const project_build = b.step("build", "build everything");
    project_build.dependOn(&docker_compose_build.step);

    //DATA
    const data_mod = b.addModule("data", .{
        .root_source_file = b.path("src/data/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    // BACKEND
    const httpz_package = b.dependency("httpz", .{
        .target = target,
        .optimize = optimize,
    });

    const backend_mod = b.createModule(.{
        .root_source_file = b.path("src/backend/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    backend_mod.addImport("httpz", httpz_package.module("httpz"));
    backend_mod.addImport("data", data_mod);

    const backend_exe = b.addExecutable(.{
        .name = "backend",
        .link_libc = true,
        .root_module = backend_mod,
    });
    backend_exe.linkLibC();
    b.installArtifact(backend_exe);

    // GENERATOR
    const generator_mod = b.createModule(.{
        .root_source_file = b.path("src/generator/generate.zig"),
        .target = target,
        .optimize = optimize,
    });
    generator_mod.addOptions("opts", options);
    generator_mod.addImport("data", data_mod);

    const generator_exe = b.addExecutable(.{
        .name = "generator",
        .root_module = generator_mod,
    });
    b.installArtifact(generator_exe);

    const solver_mod = b.createModule(.{
        .root_source_file = b.path("src/solver/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    solver_mod.addOptions("opts", options);
    solver_mod.addImport("data", data_mod);
    solver_mod.addImport("generator", generator_mod);

    // SOLVER
    const solver_exe = b.addExecutable(.{
        .name = "solver",
        .root_module = solver_mod,
    });
    b.installArtifact(solver_exe);

    // GEN JSON
    const generator_run = b.addRunArtifact(generator_exe);
    const generate = b.step("gen", "genereate the json file");
    generate.dependOn(&generator_run.step);
}
