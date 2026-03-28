# Cooperative Control of Heterogeneous Connected Vehicle Platoons: An Adaptive Leader-Following Approach

```txt
from IEEE ROBOTICS AND AUTOMATION LETTERS, VOL. 5, NO. 2, APRIL 2020
by Junyan Hu , Student Member, IEEE, Parijat Bhowmick , Member, IEEE, Farshad Arvin , Member, IEEE,
Alexander Lanzon , Senior Member, IEEE, and Barry Lennox , Senior Member, IEEE
```

## Abstract

* ### Background

  车队优势：减少交通拥堵问题、提高交通吞吐量和增强高速公路交通安全

* ### Our contribution

  提出了一种双层分布式控制方案，假设前车速度恒定，以定距策略保持异构车辆的串稳定性。

* ### How

  1. 非线性车辆动力学 - ( 使用一个反馈线性化工具，转换) -> 线性异构状态空间模型

     transform the nonlinear vehicle dynamics - ( A feedback linearization tool )-> linear heterogeneous state-space model 

  2. 设计了一个分布式适应控制协议（distributed adaptive control protocol）保持车距和车速。

  3. 仅利用相邻状态信息（即相对距离、速度和加速度），由于车队的交互拓扑被设计为以头车为根的生成树（spanning tree），因此头车无需直接每一辆车通信。

## Intro 

根本问题是头车的突然扰动（加速或减速）不会随着向后传播而放大。

提出了一种使用耦合滑模控制技术（coupled sliding-mode control）的自适应双向（bidirectional）队列控制方案。

并且通过通信机器人对可能的链路故障进行了评价分析。

希望异质车队即使在受到外源扰动的情况下的string 稳定性。

### *A. Communication Topology*

最少要有一个车连接到头车，其余车辆依次联机。

### *B. Modelling of Heterogeneous Vehicles*

没有超车，排队穿过密集的交通流。

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/sscmofo1247198u9387HOHhkh24.jpg" alt="sscmofo1247198u9387HOHhkh24" style="zoom: 33%;" />

许多论文中对于车辆的双积分动力学简化方式不足以处理异质车辆编队的真实情况，在本文中，针对车辆的完整非线性模型设计了一个控制器。一个feedback linearizing control law 将非线性模型转化为线性模型

### *C. Problem Formulation*

目标是编号0 的头车带着编号1~N 的followers，保持与头车相同的速度，同时保持恒定的车间距，从而潜在地提高道路吞吐量。

是一个闭环地层跟踪误差动力学ε̇的渐近稳定性问题（an asymptotic stability problem of the closed-loop formation tracking error dynamics ε ̇）。通过李雅普诺夫方法来处理这个问题

## 非线性仿真结果+ 机器人

Matlab/Simulink，6 车编队，速度和间距曲线如下：

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/skdjfhsdkljc.jpg" alt="skdjfhsdkljc" style="zoom:33%;" />

还设计了6 机器人的“实车实验”：

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/isdghfcdksYUKBHKJHi8789.jpg" alt="isdghfcdksYUKBHKJHi8789" style="zoom:33%;" />

实验准备：

1. 车辆平台：

   autonomous mobile robots, Mona 

   AVR microcontroller（main processor）：16MHz frequency

   NRF24l01 wireless transceiver: 机器人内部交流

   Arduino Mini/Pro microcontroller 

2. 实验平台：

   跟踪系统：相机连接host PC 

   定位、识别：unique circular tags

   主机将定位通过ROS 通信框架转给机器人控制器，开源的俯视视觉定位系统：

   ```txt
   T. Krajník et al., “A practical multirobot localization system,” J. Intell. Robot. Syst., vol. 76, no. 3/4, pp. 539–562, 2014.
   ```


3. 变量设置：

   六个机器人中的四个在轮子之间附加了不相等的外部重量，除此之外，还有两组具有不同齿轮比（150：1 和 210： 1）

   向头车发送前进信号，车队之间的信息流如图7 a 所示。

   