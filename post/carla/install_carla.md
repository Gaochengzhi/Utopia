# Carla docker

**优先使用最新版 docker container**

## Docker 用法

(不要用这个方法，docker 可能会突然消失out of no reason, 直接安装release)

### give docker sudo group

```shell
sudo groupadd docker
sudo gpasswd -a $USER docker
sudo reboot
```

### 以超级用户身份访问docker

```
docker -it exec --user root bash
```

### 安装 NVIDIA Container Toolkit

```shell
sudo apt-get update \
    && sudo apt-get install -y nvidia-container-toolkit-base
nvidia-ctk --version
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
grep "  name:" /etc/cdi/nvidia.yaml
```

### 关掉所有任务

```shell
docker stop $(docker ps -aq)
```

### 清除所有记录

```shell
docker rm $(docker ps -aq)
```

### 启动GUI 开发

```shell
docker run --privileged --gpus all --net=host -e DISPLAY=$DISPLAY carlasim/carla  /bin/bash ./CarlaUE4.sh -quality-level=Low

## another tmux session

```


### 提交更改

```shell
docker commit -a "runoob.com" -m "my apache" contain_id TAG_NAME
```

### 直接进入开发

```shell
docker run --privileged --gpus all --net=host -e DISPLAY=$DISPLAY -it carlasim/carla /bin/bash
```


## 常见错误

### X11 Display 没有权限

```shel
sh: 1: xdg-user-dir: not found
Authorization required, but no authorization protocol specified
error: XDG_RUNTIME_DIR not set in the environment.
Authorization required, but no authorization protocol specified
error: XDG_RUNTIME_DIR not set in the environment.
Authorization required, but no authorization protocol specified
error: XDG_RUNTIME_DIR not set in the environment.
```

解决：

```shell
mkdir -pv ~/.cache/xdgr
export XDG_RUNTIME_DIR=~/.cache/xdgr
sudo apt-get install xdg-user-dirs

export DISPLAY=:1
xhost +
```





### N 卡 public key missing

```shell
W: GPG error: https://developer.download.nvidia.cn/compute/cuda/repos/ubuntu1804/x86_64  InRelease: The following signatures couldn't be verified because the public key is not available: NO_PUBKEY A4B469963BF863CC
E: The repository 'https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64  InRelease' is no longer signed.
N: Updating from such a repository can't be done securely, and is therefore disabled by default.
N: See apt-secure(8) manpage for repository creation and user configuration details.
```

解决：复制相应的key 安装

```shell
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys A4B469963BF863CC
```

### 字体缺失错误

```shell
mono = default_font if default_font in fonts else fonts[0]
IndexError: list index out of range
```

解决： 

```shell
apt install fontconfig
```

###  没有pip & pip 安装错误

```shell
sudo apt-get install python3-pip

pip3 install -U pip
pip3 install Cython
python3 -m pip install --upgrade pip3
install –upgrade setuptools
```



```
pip3.x install pygame shapely numpy
```

