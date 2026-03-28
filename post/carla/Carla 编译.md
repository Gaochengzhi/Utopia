Carla 编译



wget https://cdn.unrealengine.com/Toolchain_Linux/native-linux-v17_clang-10.0.1-centos7.tar.gz

/Engine/Extras/ThirdPartyNotUE/SDKs/HostLinux/Linux_x64/ 

./GenerateProjectFiles.sh



ujs@ujs:~$ git clone https://github.com/carla-simulator/carla --depth 1
Cloning into 'carla'...
remote: Enumerating objects: 2380, done.
remote: Counting objects: 100% (2380/2380), done.
remote: Compressing objects: 100% (2045/2045), done.
fatal: the remote end hung up unexpectedly MiB | 584.00 KiB/s
fatal: early EOF
fatal: index-pack failed





vim LibCarla/cmake/test/CMakeLists.txt

set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)



