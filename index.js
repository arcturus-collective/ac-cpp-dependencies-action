const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { exec } = require("child_process")

function shell_exec(cmd, env = {}) {
  console.log(`Running command ${cmd}`)
  runenv = { ...process.env, ...env };
  exec(cmd, { env: runenv }, (error, stdout, stderr) => {
    if (error) {
      throw new Error(error.message)
    }
    if (stderr) {
        console.log(`${stderr}`);
    }
    console.log(`${stdout}`);
  });
}

try {
  const package_name = core.getInput('package_name')
  const build_arch = core.getInput('arch');
  const build_compiler = core.getInput('compiler');

  // Get the OS we are running on
  let build_os = "";
  let script_exec = "";
  let script_ext = "";
  switch (process.platform)
  {
    case "linux":
      build_os = "linux";
      script_exec = "bash";
      script_ext = "sh";
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

  if (gitea_username && gitea_password)
  {
    shell_exec(`git -C .ac_build pull || git clone https://${gitea_username}:${gitea_password}@gitea.arcturuscollective.com/arcturus-collective/drone-templates.git .ac_build`)
  } else {
    shell_exec('git -C .ac_build pull || git clone https://gitea.arcturuscollective.com/arcturus-collective/drone-templates.git .ac_build')
  }

  shell_exec(`ls -la .ac_build`)
  shell_exec(`ls -la .ac_build/scripts`)

  // Now actually execute the script
  shell_exec(`${script_exec} ${build_script}`, {PACKAGE_NAME: package_name, PACKAGE_VERSION: version});

} catch (error) {
  core.setFailed(error.message);
}
