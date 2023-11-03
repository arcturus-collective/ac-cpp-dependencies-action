# Andromeda Collective C++ Actions


## FAQ

Why do I get `System.ComponentModel.Win32Exception: The directory name is invalid` when building on Windows?
: This error can be ignored, the process just tries to run git pull on the build scripts repo, but the directory may not exist. If git pull fails, it will try to clone.

I get a CMake error on Windows that `Generator Visual Studio 17 2022 given toolset and version specification x,version=y does not seem to be installed at <path>`
: The `compiler.update` key in the conan profile for CI should be updated to the correct one.
