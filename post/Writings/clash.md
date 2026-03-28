# 在Mac mini 上用Tailscale + sing-box上搭建 Shadowsocks 代理的一次记录

有些技术问题，表面上看起来只是"配一下就好了"，但当你真正动手的时候，才发现每一步都有要注意的细节，为了方便后来人的工作，我决定写下这篇文章。

## First

我在日本有一台 Mac Mini 通过 Tailscale 组网接入我的私有网络。我想在上面跑一个 Shadowsocks 服务端，这样我在国内的设备就可以通过 Tailscale 隧道连到它。

思路非常清晰：Tailscale 负责打洞和加密隧道，Shadowsocks 负责代理协议，两者各司其职。Tailscale 的 IP 是 `100.x.x.x` 段的内网地址，天然不会被墙，而且 WireGuard 协议本身就很难被识别。这比直接把 Shadowsocks 暴露在公网上要优雅得多。

##  sing-box 

Shadowsocks 的实现有很多，但如果你要用 2022 年引入的新协议 `2022-blake3-aes-128-gcm`，选择就不多了。这个协议基于 AEAD 2022 设计，引入了基于时间的防重放机制和更强的密钥派生方式，是目前 Shadowsocks 协议族里最现代的一个。

sing-box 是支持这个协议的主流实现之一，而且它是一个 Go 写的单二进制文件，配置是 JSON，部署起来很干净。在 macOS 上用 Homebrew 装就行：

```
brew install sing-box
```

## 配置

sing-box 的服务端配置确实很简单。一个 JSON 文件，声明一个 Shadowsocks inbound，监听在 Tailscale 的接口地址上：

```json
{
  "inbounds": [
    {
      "type": "shadowsocks",
      "listen": "0.0.0.0",
      "listen_port": 8443,
      "method": "2022-blake3-aes-128-gcm",
      "password": "<base64-encoded-16-byte-key>"
    }
  ],
  "outbounds": [
    {
      "type": "direct"
    }
  ]
}
```

密钥需要是 16 字节的随机数据再 Base64 编码。我最开始用了自己的密码，结果两端都直接崩溃而没有任何的错误！

用 `openssl rand -base64 16` 生成一个就好，别自己编。

然后用 launchd 把它注册成系统服务，让它开机自启。写一个 plist 文件丢到 `~/Library/LaunchAgents/` 下面，`launchctl load` 一下，服务就跑起来了。

到这里为止，一切都很顺利。`ss-server` 在监听，端口在开着，从本机 `nc -zv` 测试连接也是通的。

## 第一个问题：Clash 里节点超时

我在本地的 Clash Verge（基于 Clash Meta 内核）里配了这个节点。配置很直白：

```yaml
name: JP-MacMini
type: ss
server: 100.x.x.x
port: 8443
cipher: 2022-blake3-aes-128-gcm
password: <key>
udp: true
```

测速，超时。

我的第一反应是网络不通。于是打开终端：

```
nc -zv 100.x.x.x 8443
```

连接成功。TCP 握手没有任何问题。

这就奇怪了。网络是通的，但 Clash 连不上。我把 Clash 的日志级别调到 debug，发现日志里只有一行超时信息：

```
dial tcp 100.x.x.x:8443: i/o timeout
```

没有更多信息。不是握手失败，不是认证错误，就是单纯的超时。就好像这个 IP 根本不可达一样。

但我刚刚明明 `nc` 通了。

## TUN 模式下的回环

TUN 模式的工作原理是创建一个虚拟网卡（在 macOS 上是 `utun` 设备），然后通过修改路由表，把所有流量都导向这个虚拟网卡。Clash 从这个网卡上读取数据包，按规则处理后再从物理网卡发出去。

问题来了：当 Clash 试图连接 `100.x.x.x:8443` 这个代理节点时，**这个连接本身也是一个"出站流量"**。在 TUN 模式下，这个流量会被路由到 Clash 自己的虚拟网卡上——然后 Clash 又试图处理这个连接——然后又路由回来——死循环，直到超时。

这就是为什么 `nc` 能通但 Clash 不行。`nc` 测试的时候，我是在终端里直接跑的，那时候 TUN 可能没有劫持这个连接（或者 Tailscale 的路由优先级更高）。但 Clash 自己发起的连接，一定会被自己的 TUN 捕获。

关掉 TUN 模式验证了这个猜想：节点立刻就通了。

## 解法：interface-name

但我需要 TUN 模式。没有 TUN，很多应用的流量就没法接管。

解决思路是：告诉 Clash，连接这个特定节点的时候，不要走 TUN 虚拟网卡，直接走 Tailscale 的网卡。

先看一下系统上有哪些网络接口。`ifconfig` 的输出很长，但关键的就三个：

- `en0`：物理网卡（Wi-Fi），承载真实的网络连接
- `utun4`：Tailscale 的虚拟网卡，IP 是 `100.x.x.x` 段
- `utun1024`：Clash TUN 的虚拟网卡，IP 是 `198.18.0.1`

Clash Meta 的节点配置支持一个 `interface-name` 字段，可以指定这个节点的出站连接走哪个网络接口。把它设成 Tailscale 的网卡名：

```yaml
name: JP-MacMini
type: ss
server: 100.x.x.x
port: 8443
cipher: 2022-blake3-aes-128-gcm
password: <key>
udp: true
interface-name: utun4
```

这样 Clash 连接这个节点时，数据包直接从 `utun4` 出去，进入 Tailscale 隧道，到达日本的 Mac Mini。不经过 Clash 自己的 TUN，不会回环。

改完之后，测速立刻成功。

## 用脚本自动化配置注入

我的 Clash 配置是从订阅链接拉取的，每次更新都会覆盖手动修改。所以我写了一个 JavaScript 脚本，在 Clash Verge 的"脚本"功能里运行，每次配置更新时自动注入自定义节点和规则。

这个脚本做了几件事：过滤掉我不需要的节点，注入 JP-MacMini 节点到配置和策略组里，以及添加一些直连规则让 GitHub、B 站、微信等服务不走代理。

有一个细节值得一提：脚本里还加了 Tailscale IP 段的直连规则：

```
IP-CIDR,100.64.0.0/10,DIRECT,no-resolve
```

这条规则是给经过代理的用户流量用的——如果你访问的目标 IP 在 Tailscale 网段内，就直连，不走代理。这和前面说的 TUN 回环是两个层面的问题：规则处理的是"已经被 Clash 接管的流量应该怎么转发"，而 TUN 回环发生在"Clash 自己的出站连接被自己劫持"这个更底层的地方。`interface-name` 解决的是后者。

## look back

整个过程其实就解决了一个问题：在 TUN 模式下，代理客户端连接代理服务器的流量不能被自己劫持。但要理解这个问题，你需要理解 TUN 的工作原理、操作系统的路由表、虚拟网卡的层次关系，以及 Clash 内核处理出站连接的方式。

哦，谢天谢地，现在有了Claude Code，虽然这些工作还需要你手动的复制粘贴，但是总比10年前我们自己在谷歌上搜索在内核你看 debug日志要好多了。以前一两天解决不了的工作，现在半个小时就能搞定。