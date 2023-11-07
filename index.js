const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { exec } = require("child_process")

function shell_exec(cmd, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running command ${cmd}`)
    runenv = { ...process.env, ...env };
    const child = exec(cmd, { env: runenv });
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
        reject(`Process exited with signal ${signal}`);
      } else if (exit_code == 0) {
        console.log(`Command completed with exit code ${exit_code}`);
        resolve(exit_code);
      } else {
        console.log(`Rejecting promise, process exited with code ${exit_code}`)
        reject(`Process exited with code ${exit_code}`);
      }
    });
  });
}

async function run() {
  try {
    const package_name = core.getInput('package_name')
    const build_arch = core.getInput('arch');
    const build_compiler = core.getInput('compiler');
    const artifactory_token = core.getInput('artifactory_token');
    const mode = core.getInput('mode');

    let script_type = "";
    switch (mode)
    {
      case "dependencies":
        script_type = "dependencies";
        break;
      case "build":
        script_type =  "build";
        break;
      case "upload":
        script_type =  "package";
        break;
      default:
        throw new Error(`unsupported mode ${mode}`)
    }

    // Get the OS we are running on
    let build_os = "";
    let script_exec = "";
    let script_ext = "";
    let entrypoint = "";
    switch (process.platform)
    {
      case "linux":
        build_os = "linux";
        script_exec = "bash";
        script_ext = "sh";
        entrypoint = "/opt/entrypoint.sh "
        break;
      case "win32":
        build_os = "windows";
        script_exec = "powershell -File";
        script_ext = "ps1";
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

    const build_script = `.ac_build/scripts/${script_type}-${build_os}-${build_arch}.${script_ext}`;
    const gitea_username = core.getInput('username');
    const gitea_password = core.getInput('password');
    const cwd = process.cwd();

    await shell_exec(`git -C .ac_build pull`).catch((error) => {
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
      return shell_exec(`git clone https://${login}gitea.arcturuscollective.com/arcturus-collective/drone-templates.git .ac_build`)
    });

    if (build_os == "linux")
    {
      await shell_exec(`ls -la .ac_build`)
      await shell_exec(`ls -la .ac_build/scripts`)
    }

    // Now actually execute the script
    await shell_exec(`${entrypoint}${script_exec} ${build_script}`, {PACKAGE_NAME: package_name, PACKAGE_VERSION: version, COMPILER: build_compiler, ARTIFACTORY_TOKEN: artifactory_token});

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
