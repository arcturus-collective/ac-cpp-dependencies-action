const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { execSync } = require("child_process")

function shell_exec(cmd, env = {}) {
  console.log(`Running command ${cmd}`)
  runenv = { ...process.env, ...env };
  execSync(cmd, { env: runenv }, function(error, stdout, stderr) {
    if (error) {
      throw new Error(error.message)
    }
    if (stderr) {
        console.log(`${stderr}`);
    }
    console.log(`${stdout}`);
    console.log("Command completed successfully");
  });
}

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

  try {
    shell_exec(`git -C .ac_build pull`);
  } catch (error) {
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
  }

  shell_exec(`ls -la .ac_build`)
  shell_exec(`ls -la .ac_build/scripts`)

  // Now actually execute the script
  shell_exec(`${entrypoint}${script_exec} ${build_script}`, {PACKAGE_NAME: package_name, PACKAGE_VERSION: version, COMPILER: build_compiler, ARTIFACTORY_TOKEN: artifactory_token});

} catch (error) {
  core.setFailed(error.message);
}
