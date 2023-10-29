const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { exec } = require("child_process")

function shell_exec(cmd) {
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      throw new Error(`error: ${error.message}`)
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

  const env_image = `gitea.arcturuscollective.com/arcturus-collective/linux-${build_compiler}-${build_arch}:latest`

  const version = fs.readFileSync('VERSION', 'utf8').trim()

  console.log(`Building dependencies for ${package_name} Version ${version} with compiler ${build_compiler} on ${build_arch}.`);

  const build_script = `.ac_build/scripts/dependencies-linux-${build_arch}.sh`;
  const gitea_username = core.getInput('username')
  const gitea_password = core.getInput('password')

  if (gitea_username && gitea_password)
  {
    shell_exec(`git -C .ac_build pull || git clone https://${gitea_username}:${gitea_password}@gitea.arcturuscollective.com/arcturus-collective/drone-templates.git .ac_build`)
  } else {
    shell_exec('git -C .ac_build pull || git clone https://gitea.arcturuscollective.com/arcturus-collective/drone-templates.git .ac_build')
  }

  shell_exec(`docker pull ${env_image}`)
  shell_exec(`docker run --rm -v $(pwd):/opt/src/${package_name} --env PACKAGE_NAME=${package_name} --env PACKAGE_VERSION=${version} -w /opt/src/${package_name} ${env_image} bash ${build_script}`)

} catch (error) {
  core.setFailed(error.message);
}
