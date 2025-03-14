const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { spawn } = require("child_process")

function shell_exec(cmd, env = {}) {
  return new Promise((resolve, reject) => {
    cmd_string = cmd.join(' ')
    console.log(`Running command ${cmd_string}`)
    runenv = { ...process.env, ...env };
    const child = spawn(cmd[0], cmd.slice(1), { env: runenv });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', data => console.log(data));
    child.stderr.on('data', data => console.log(data));
    child.on('error', function(error) {
      reject(error)
    });
    child.on('close', (exit_code, signal) => {
      if (exit_code === null)
      {
        console.log(`Rejecting promise, process exited with signal ${signal}`)
        console.log(`Process environment: ${runenv}`)
        reject(`Process exited with signal ${signal}`);
      } else if (exit_code == 0) {
        console.log(`Command completed with exit code ${exit_code}`);
        resolve(exit_code);
      } else {
        console.log(`Rejecting promise, process exited with code ${exit_code}`)
        reject(`Process exited with code ${exit_code}`);
        console.log(`Process environment: ${runenv}`)
      }
    });
  });
}

async function run() {
  try {
    const package_name = core.getInput('package_name')
    const build_arch = core.getInput('arch');
    const build_compiler = core.getInput('compiler');
    const mode = core.getInput('mode');

    let subcommand = "";
    switch (mode)
    {
      case "dependencies":
        subcommand = "depends";
        break;
      case "build":
        subcommand =  "build";
        break;
      case "upload":
        subcommand =  "upload";
        break;
      case "deploy":
        subcommand =  "deploy";
        break;
      default:
        throw new Error(`unsupported mode ${mode}`)
    }

    // Get the OS we are running on
    let build_os = "";
    let script_exec = "";
    let script_ext = "";
    let build_dir = "";
    let build_script = "";
    switch (process.platform)
    {
      case "linux":
        build_os = "linux";
        script_exec = "bash";
        script_ext = "sh";
        build_dir = `/opt/builds/${package_name}`
        build_script = `.acpkg/ci/acbuild.${script_ext}`;
        break;
      case "win32":
        build_os = "windows";
        script_exec = "powershell";
        script_ext = "ps1";
        build_dir = `C:\\builds\\${package_name}`
        build_script = `.\\.acpkg\\ci\\acbuild.${script_ext}`;
        break;
      default:
        throw new Error(`unsupported platform ${process.platform}`)
    }

    const env_image = `gitea.arcturuscollective.com/arcturus-collective/${build_os}-${build_compiler}-${build_arch}:latest`

    const version = fs.readFileSync('VERSION', 'utf8').trim()

    if (mode == "dependencies")
    {
      console.log(`Building dependencies for ${package_name} Version ${version} with compiler ${build_compiler} on ${build_os} ${build_arch}.`);
    } else {
      console.log(`Building ${package_name} Version ${version} with compiler ${build_compiler} on ${build_os} ${build_arch}.`);
    }

    const gitea_username = core.getInput('username');
    const gitea_password = core.getInput('password');
    const cwd = process.cwd();

    await shell_exec([`git`, `-C`, `.acpkg`, `pull`]).catch((error) => {
      let login = '';
      if (gitea_username)
      {
        login = login + gitea_username;
      }
      if (gitea_password)
      {
        login = login + ':' + gitea_password;
      }
      if (login)
      {
        login = login + '@';
      }
      return shell_exec([`git`, `clone`,
                        `https://${login}gitea.arcturuscollective.com/arcturus-collective/acpkg.git`,
                        `.acpkg`])
    });

    if (build_os == "linux")
    {
      await shell_exec([`ls`, `-la`, `.acpkg`]);
    }

    const deployer = core.getInput('deployer');
    const artifacts_dir = core.getInput('artifacts_dir');

    // Now actually execute the script
    await shell_exec([script_exec, build_script,
                     `acbuild`, package_name, `${version}`, `--build-dir`,
                     build_dir, subcommand],
                    {PACKAGE_USERNAME: gitea_username, PACKAGE_PASSWORD: gitea_password, COMPILER: build_compiler, PACKAGE_DEPLOYER: deployer, PACKAGE_ARTIFACTS_DIR: artifacts_dir});

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
