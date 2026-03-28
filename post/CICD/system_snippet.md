# System snippet

## 为你的Windows 安装Linux

参考教程：https://zhuanlan.zhihu.com/p/101307629

小技巧：使用你熟悉的机器来远程配置工作站：

```shell
sudo apt update
sudo apt-get -y install  net-tools openssh-server curl git 
tldr -u
sudo sed -i "32i PermitRootLogin yes" /etc/ssh/sshd_config

echo -e "ClientAliveInterval 30\nClientAliveCountMax 6" | sudo tee -a /etc/ssh/sshd_config
echo -e "ServerAliveInterval 20\nServerAliveCountMax 999" | sudo tee -a /etc/ssh/ssh_config
sudo ufw allow ssh
```

开启ssh 服务，查看ip、用户名小技巧

```shell
sudo service ssh start
ifconfig -a
whoami
```



```
ssh-copy-id ubuntu@1.13.17.245
```



### 配置你的vps 机场

## btop

```
sudo snap install btop
```



## Git 镜像

```
curl -L https://github.com/ineo6/hosts/releases/download/v1.0.1/hosts-server-pkg-linuxstatic-x64.tar.gz | tar xzvf -
./hosts-server-pkg-linuxstatic-x64/hosts-server --port=8888
```



## conda 镜像

```
conda config --add channels http://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
conda config --add channels http://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
conda config --add channels http://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
conda config --add channels http://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/pro
conda config --add channels http://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/msys2
conda config --set show_channel_urls yes
```

## clash

```shell
git clone --depth 1 https://github.com/Elegycloud/clash-for-linux-backup

```



## 先有zsh

### Zsh & on-my-zsh & tmux

```shell
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
# plugins=( [plugins...] zsh-syntax-highlighting)
# !! add plugins=( zsh-syntax-highlighting) into plugin
source ~/.oh-my-zsh/zshrc
chsh -s $(which zsh)
```





## Sumo

```
sudo add-apt-repository ppa:sumo/stable 
sudo apt-get update
sudo apt-get install sumo sumo-tools
pip install traci
git clone https://github.com/michele-segata/plexe-pyapi.git --depth 1
cd plexe-pyapi
pip install .
```

## Sys_back

```
git clone https://github.com/Gaochengzhi/sys_backup.git --depth 1
echo "source ~/sys_backup/.zshrcback" >> ~/.zshrc
echo "source ~/sys_backup/.tmux.confback" >> ~/.tmux.conf
cp -r  ~/sys_backup/.config/nvim ~/.config/

mk mycode
```



## brew

```shell
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```



### 先有鸡还是先有蛋？

```shell
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy https://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7890
npm config set proxy=http://127.0.0.1:7890

cd 
git clone https://github.com/Gaochengzhi/sys_backup.git
sh sys_backup/sysload.sh


```



```txt
brew install neofetch tmux neovim fzf zsh tldr ncdu btop nodejs npm python3 clang ranger 
npm install -g neovim
pip3 install neovim
```





### termial enmulator

```shell
sudo add-apt-repository ppa:aslatter/ppa
sudo apt update
sudo apt install alacritty
sudo update-alternatives --config x-terminal-emulator
```



### nerdFont

```txt
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v2.1.0/DroidSansMono.zip
unzip DroidSansMono.zip -d ~/.fonts
fc-cache -fv
```




### neovim

```shell
# 软链接
sudo add-apt-repository ppa:neovim-ppa/unstable
sudo apt-get  update
sudo apt-get -y install neovim
pip3 install neovim
sudo ln -sf `which nvim` `which vim`
# packer
git clone --depth 1 https://github.com/wbthomason/packer.nvim\
 ~/.local/share/nvim/site/pack/packer/start/packer.nvim
brew install lua-language-server

# copilot
git clone https://github.com/github/copilot.vim.git \
  ~/.config/nvim/pack/github/start/copilot.vim
```

## Vscode

```vscode
sudo apt-get install apt-transport-https
sudo apt-get update
sudo apt-get install code
```



## docker

```shell
curl https://get.docker.com | sh
sudo systemctl start docker && sudo systemctl enable docker
sudo systemctl restart docker
```

## 下载源码& 编译

```shell
# --depth 1 浅拷贝一层git
git clone https://github.com/ApolloAuto/apollo.git --depth 1
cd apollo
# 拉取镜像
sudo ./docker/scripts/dev_start.sh

# 进入容器
sudo ./docker/scripts/dev_into.sh

# 编译
./apollo.sh build

# demo
source cyber/setup.bash
cyber_recorder play -f ./docs/demo_guide/demo_3.5.record
```

### 编译失败：扩大 swap

https://www.jianshu.com/p/30cd53ed056c



## Frp 内网穿透

```shell
## vps 端
wget --no-check-certificate http://github.com/fatedier/frp/releases/download/v0.48.0/frp_0.48.0_linux_amd64.tar.gz
tar -zxvf frp_0.33.0_linux_amd64.tar.gz && mv frp_0.33.0_linux_amd64 frp

echo "bind_port = 7000
# 授权码，请改成更复杂的
token = 1111

# frp管理后台端口，请按自己需求更改
dashboard_port = 7500
# frp管理后台用户名和密码，请改成自己的
dashboard_user = ujs
dashboard_pwd = 1111
enable_prometheus = true



## 服务端
[common]
server_addr = x.x.x.x
server_port = 7000
token = won517574356
[rdp]
type = tcp
local_ip = 127.0.0.1           
local_port = 3389
remote_port = 7001  
[smb]
type = tcp
local_ip = 127.0.0.1
local_port = 445
remote_port = 7002
[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = 22
remote_port = 6000

```



```shell
cd /usr/bin/frp
nohup ./frpc -c frpc.ini >/dev/null 2>&1 &
nohup clash >/dev/null 2>&1 &
cd
```

自启动

```shell
crontab -e
update-rc.d cron defaults
```

## Anaconda

```
wget https://mirrors.bfsu.edu.cn/anaconda/archive/Anaconda3-2022.10-Linux-x86_64.sh --no-check-certificate

```



## 添加用户



```shell
sudo adduser username
# another user
sudo usermod -aG sudo lvjt
```

## SSH forwarding

```
ssh -L 5901:localhost:5901 -p 6000 ujs@124.220.179.145
```

## 端口转发

```shell
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8888
sudo iptables-save
```

