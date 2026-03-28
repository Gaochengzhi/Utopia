# Plexe: A platooning extension for Veins

```txt
Segata M, Joerer S, Bloessl B, et al. Plexe: A platooning extension for Veins[C]//2014 IEEE Vehicular Networking Conference (VNC). IEEE, 2014: 53-60.
```



## *Abstract*

CACC 或 platooning，特别是需要混合控制理论，通信和网络，以及力学和物理学。

这项工作提供了一个对Veins 的开源扩展 Plexe，为研究人员提供了一个考虑到车辆的物理和力学，通信和网络障碍，以及车辆间通信( IVC )的协议栈，能够在现实场景中运行实验的模拟环境。

我们描述了模拟器的结构和实现的控制算法，并提供了两个用例，这两个用例显示了我们的框架作为合作驾驶系统的强大研究工具的潜力。

## Intro

* 基于雷达的自动车距保持系统CAC 并没有improve road traffic efficiency 因为间距太大了。
* CACC 加入了低延时的车车通信Dedicated Short Range Communications (DSRC) or LTE/LTE-A for IVC
* 挑战还在于 all the procedures and maneuvers that will enable the so called *platooning* application
* 本文介绍了Plexe，它是基于Veins 通信和网络机动能力的。

![img](file:///Users/kounarushi/mycode/web-blog/public/.pic/veins-arch.png)

## Background and related work

……

## Simulation Structure

Veins 基于IEEE 802.11p 和定制信道模型的完整车辆通信栈，在 OMNeT++ 中为在 SUMO 中行驶的每辆车创建一个网络节点来耦合网络和移动模拟器。

Each time a vehicle moves, Veins replicates the movement in the corresponding OMNeT++ node by updating the mobility model.

PLEXE 通过 TraCI 接口进一步扩展，以便从 SUMO 获取车辆数据以发送到其他车辆，并供队列协议和应用程序使用。 

Data received by vehicles in Veins can be fed to the CACCs in SUMO 

**队列协议和应用程序逻辑在 OMNeT++ 框架中实现**，而应用程序决策的驱动以及部分应用程序逻辑在 SUMO 中实现。

实现正确的队列模型的努力有两个方向:

1. 车辆的队列能力和基本机动的实现，主要需要在SUMO 中进行扩展。
2. 协议的实现以支持应用程序和程序逻辑在OMNeT++/Veins 加一些小变化，以增强双向耦合能力。

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/UGIUSHBi987098.jpg" alt="UGIUSHBi987098" style="zoom:33%;" />

### *A. Implementing Platooning Capabilities in SUMO*

主要是一种新的跟车框架，既可以实现基于加速度开环或闭环控制的纵向控制，也可以实现简化的横向控制（即转向）以适当地变道并服从队列动态。

在SUMO 中实现了Cruise Control (CC) ，使用 Krauss 模型，用户可以修改模型以实现其他 CC 或 CACC 模型。

### *B. Platooning Protocols and Applications in Veins*

BaseProtocol class 提供了logging of statistics, primitives for sending and receiving packets, and loading of simulation parameters 等功能的接口，子类负责实现。

BaseApp 类负责loading simulation parameters, or passing data to the CACC via TraCI

## 控制模型

纵向控制模型通常使用理想加速度$\ddot{x}_{\text {des }}$ 来表示，但是由于现实中的lag，实现中 modelled by a first order low-pass filter：
$$
\begin{aligned}
\ddot{x}[n] & =\beta \cdot \ddot{x}_{\operatorname{des}}[n]+(1-\beta) \cdot \ddot{x}[n-1] \\
\beta & =\frac{\Delta_{t}}{\tau+\Delta_{t}}
\end{aligned}
$$
$\tau$ 默认0.5，$\Delta t$ 是SUMO 中的更新时隙。

CC control law:
$$
\ddot{x}_{\mathrm{des}}=-k_{p}\left(\dot{x}-\dot{x}_{\mathrm{des}}\right)+\eta
$$
where $\dot{x}$ is the current speed, $\dot{x}_{\mathrm{des}}$ is the desired speed. $k_{p}$ is the gain of the proportional controller (default set to 1 ); $\eta$ is a random disturbance taking into account imprecisions of the actuator and of the speed measure (default set to 0 ).

这个系统中输入仅有理想和现实速度，为了防止碰撞，需要加入雷达至此 的ACC：
$$
\begin{aligned}
\ddot{x}_{i_{-} d e s} & =-\frac{1}{T}\left(\dot{\varepsilon}_{i}+\lambda \delta_{i}\right) \\
\delta_{i} & =x_{i}-x_{i-1}+l_{i-1}+T \dot{x}_{i} \\
\dot{\varepsilon}_{i} & =\dot{x}_{i}-\dot{x}_{i-1}
\end{aligned}
$$
i 是自车， i-1 是前车, $ T$ 是以秒为单位的时距，l 是距离，$\dot{\varepsilon}_{i}$ 是前车和自车的相对速度，$\delta_{i}$ 是distance error。

但要考虑串稳定性，需要CACC，Plexe 实现了两种CACC，第一种是基于经典控制理论的：
$$
\begin{aligned}
\ddot{x}_{i_{-} d e s} & =\alpha_{1} \ddot{x}_{i-1}+\alpha_{2} \ddot{x}_{0}+\alpha_{3} \dot{\varepsilon}_{i}+\alpha_{4}\left(\dot{x}_{i}-\dot{x}_{0}\right)+\alpha_{5} \varepsilon_{i} \\
\varepsilon_{i} & =x_{i}-x_{i-1}+l_{i-1}+\operatorname{gap}_{\mathrm{des}} \\
\dot{\varepsilon}_{i} & =\dot{x}_{i}-\dot{x}_{i-1}
\end{aligned}
$$
$\ddot{x}_{0}$ and $\dot{x}_{0}$ are the acceleration and speed of the leader, while $\ddot{x}_{i-1}$ is the acceleration of the preceding vehicle
$$
\begin{aligned}
& \alpha_{1}=1-C_{1} ; \quad \alpha_{2}=C_{1} ; \quad \alpha_{5}=-\omega_{n}^{2} \\
& \alpha_{3}=-\left(2 \xi-C_{1}\left(\xi+\sqrt{\xi^{2}-1}\right)\right) \omega_{n} \\
& \alpha_{4}=-C_{1}\left(\xi+\sqrt{\xi^{2}-1}\right) \omega_{n} .
\end{aligned}
$$
$C_{1}$ is a weighting factor between the accelerations of the leader and the preceding vehicle (default set to $0.5$ ), $\xi$ is the damping ratio (default set to 1), and $\omega_{n}$ is the bandwidth of the controller (default set to $0.2 \mathrm{~Hz}$ ); defaults are taken from [25].

另一种正在开发的基于共识的模型，但截至本文截稿还没测试完。

## 队列机动

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/iasucyfiuas.jpg" alt="iasucyfiuas" style="zoom:33%;" />

join 的协议发送过程……
