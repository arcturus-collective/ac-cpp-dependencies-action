const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
  const package_name = core.getInput('package_name')
  const build_arch = core.getInput('arch');
  const build_compiler = core.getInput('compiler');

  const env_image = 'gitea.arcturuscollective.com/arcturus-collective/linux-' + build_compiler + '-' + build_arch + ':latest'

  const version = fs.readFileSync('VERSION', 'utf8')

  console.log(`Building ${package_name} Version ${version} with compiler ${build_compiler} on ${build_arch}.`);
} catch (error) {
  core.setFailed(error.message);
}
