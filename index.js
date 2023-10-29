const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { exec } = require("child_process")

async function shell_exec_passthrough(cmd, env) {
  return new Promise((resolve, reject) => {
    console.log(`Running command ${cmd}`)
    runenv = { ...process.env, ...env };
    const child = exec(cmd, { env: runenv });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', data => console.log(data));
    child.stderr.on('data', data => console.log(data));
    child.on('error', function(error) {
      throw new Error(error)
    });
    child.on('close', exitCode => {
      if (exitCode == 0)
      {
        resolve(exitCode);
      } else {
        throw new Error(`Process exited with code ${exitCode}`)
      }
    });
  });
}

async function shell_exec(cmd, env = {}) {
  const exit_code = await shell_exec_passthrough(cmd, env);
  console.log(`Command completed with exit code ${exit_code}`);
}

async function run() {
  try {
    const package_name = core.getInput('package_name')
    const build_arch = core.getInput('arch');
    const build_compiler = core.getInput('compiler');
    const artifactory_token = core.getInput('artifactory_token');

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
      default:
        throw new Error(`unsupported platform ${process.platform}`)
    }

    const env_image = `gitea.arcturuscollective.com/arcturus-collective/${build_os}-${build_compiler}-${build_arch}:latest`

    const version = fs.readFileSync('VERSION', 'utf8').trim()

    console.log(`Building dependencies for ${package_name} Version ${version} with compiler ${build_compiler} on ${build_os} ${build_arch}.`);

    const build_script = `.ac_build/scripts/dependencies-${build_os}-${build_arch}.${script_ext}`;
    const gitea_username = core.getInput('username');
    const gitea_password = core.getInput('password');
    const cwd = process.cwd();

    const res = await shell_exec(`git -C .ac_build pull`);
    res.catch((error) => {
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
      shell_exec(`git clone https://${login}gitea.arcturuscollective.com/arcturus-collective/drone-templates.git .ac_build`)
    });

    await shell_exec(`ls -la .ac_build`)
    await shell_exec(`ls -la .ac_build/scripts`)

    // Now actually execute the script
    await shell_exec(`${entrypoint}${script_exec} ${build_script}`, {PACKAGE_NAME: package_name, PACKAGE_VERSION: version, COMPILER: build_compiler, ARTIFACTORY_TOKEN: artifactory_token});

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
