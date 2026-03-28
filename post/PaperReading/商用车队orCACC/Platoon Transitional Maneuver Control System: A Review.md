# Platoon Transitional Maneuver Control System: A Review

```txt
by Badnava S, Meskin N, Gastli A, et al. 
from IEEE Access, 2021, 9: 88327-88347.
```

## Abstract

本文综述了现有的与队列机动相关的不同控制技术，如合并/分割（merge/split）和变道。

* 回顾了用于过渡排机动的纵向和横向控制最常用的控制算法，并讨论了每种控制策略的优点和局限性。

* 本文还讨论了横向运动控制中使用的不同轨迹规划技术，

* 最后，本文探讨了未来研究的开放问题和方向。

## Introduction

**transitional** maneuvers：lane change and splitting from and joining the platoon

design the control system of the platoon based on five control layers:

![iihkjfHKHUHK8762487](file:///Users/kounarushi/mycode/web-blog/public/.pic/iihkjfHKHUHK8762487.jpg)

- *Network Layer:* 控制进入的流量和路由流量。它负责优化道路容量和每辆车的平均行驶时间，减少瞬态拥堵。
- *Link Layer:* 控制链路的交通流量，使其达到最大容量，并最大限度地减少车辆的行驶时间和交通拥堵。
- *Coordination and Planning Layer*: 控制机动动作，例如汇入和变道。 
- *Regulation Layer:* 横纵向控制，将上层指令转化为对物理组件的操纵，连续时间反馈控制，速度和间距。
- *Physical Layer:* 控制物理组件

```txt
Lane change and merge maneuvers for connected and automated vehi- cles: A survey,
```

## 队列机动概述

### A. 队列机动控制目标

需要 coordination module, perception module, and autopilot module

```txt
Combined Longitudinal and Lateral Control of a Platoon of Vehicles
```

maneuvering control tasks: two parts

1. *Maneuver Logic:* 决定机动区域内的机动顺序。它定义了机动车辆在机动车道上的实际速度和位置，以及车队中哪些车辆必须参与机动过程。机动逻辑指定“哪个”车辆将以“什么”顺序和“去哪里”执行机动，而不是“如何”执行，这是由车辆控制系统执行的。

2. *Vehicle Control:* 该部分控制队列中的车辆如何实现所需的机动。机动的约束，有关车辆的能力或空间和时间的限制，必须考虑在控制设计。

控制目标是变道、加入、脱离队列。

## 车辆建模

最常用 mass point models, kinematic models（不考虑力学影响）, and dynamic models

常用的线性车辆动力学模型：single integrator model, double integrator model, third-order model, and single-input-single-output (SISO) model

## 车队机动控制技术

### A. 纵向控制

1. PID：它只需要调整三个参数，即比例增益、微分增益和积分增益。该控制器的工作原理是考虑设定点（期望的车距）和受控变量（测量的车距）之间的差异。

2. 滑膜控制 SMC：changed through a high-frequency switching control

   * 对于特定类别的不确定性，闭环系统的响应变得对干扰不敏感。

   * 该控制器可以直接指定性能。

   * ```txt
     M. Yan, J. Song, L. Zuo, and P. Yang, ‘‘Neural adaptive sliding-mode control of a vehicle platoon using output feedback,’’ Energies, vol. 10, no. 11, p. 1906, Nov. 2017.
     ```

     一种使用新型输出反馈的神经自适应滑模控制策略，通过双向通信策略和恒定时距（CTH）策略纵向控制车队车辆。 设计了一种基于集成滑模 (ISM) 技术的神经自适应滑模控制算法，以基于 CTH 策略保证队列中的所需车辆间距。

3. MPC：同时满足车辆队列应用的约束满足（安全和物理）和串稳定性。

   车队更适合分布式MPC，DMPC。

4. 一致性控制

   分布式计算中的共识问题，单积分策略是最常用的连续共识策略。

   ```txt
   P. Yang, Y. Tang, M. Yan, and X. Zhu, ‘‘Consensus based control algo- rithm for nonlinear vehicle platoons in the presence of time delay,’’ Int. J. Control, Autom. Syst., vol. 17, no. 3, pp. 752–764, 2019.
   ```

   基于共识的非线性车辆跟随应用的控制模式，其中使用精确反馈线性化技术来推导车辆的线性化三阶动态模型。

5. 神经网络控制器

6. $H_{\infty}$ 控制器：鲁棒控制器，可以处理系统模型中最大程度的不确定性和不准确性。

### B. 横向控制

用于执行过渡机动，例如变道、加入和脱离队列。 变道机动是两层程序，即策略层和控制层。 通过考虑碰撞避免，策略级别决定如何以及何时执行变道操作或加入/离开机动。 控制级别决定如何通过转动方向盘、制动或节流来执行换道操作或加入/离开机动。

```txt
Y. Luo, G. Yang, M. Xu, Z. Qin, and K. Li, ‘‘Cooperative lane-change maneuver for multiple automated vehicles on a highway,’’ Automot. Innov., vol. 2, no. 3, pp. 157–168, Sep. 2019.
```

在控制层面，需要横向引导算法和跟踪控制问题。

……

### C. 机动控制

合作自适应巡航控制（CACC）用于分析外部干扰的影响，例如在执行联合机动时由非自动车辆引起的干扰。 此外，还研究了丢包对编队加入机动的影响。

```txt
Amoozadeh M, Deng H, Chuah C N, et al. Platoon management with cooperative adaptive cruise control enabled by VANET[J]. Vehicular communications, 2015, 2(2): 110-123.
```

Ad Hoc 网络 (VANET) 用于开发用于基本队列机动的排管理系统：排合并、排拆分和换道。

```txt
L. Banjanović-Mehmedović, I. Butigan, M. Kantardžić, and S. Kasapović, ‘‘Prediction of cooperative platooning maneuvers using NARX neural network,’’ in Proc. Int. Conf. Smart Syst. Technol. (SST), Osijek, Croatia, Oct. 2016, pp. 287–292.
```

PID 控制器和 NARX 神经网络来研究灵活 Platoon 的几种场景中的加入、合并和分离机动。

MPC\LQR\ $H_{\infty}$ 

### D. 轨迹规划

生成轨迹的问题通常被表述为约束优化问题。

需要考虑几个约束， 一些与车辆性能和乘客舒适度有关。通常对最大加速度变化和最大加加速度施加限制。 另一个考虑的约束是机动的最长时间。

很少有文章研究了同时使用自动驾驶和非自动驾驶车辆的情况。

* #### 基于图的规划

  Dijkstra 以及A* 的各种变体。

* #### 基于抽样的规划器

  快速地解决问题，各种快速探索随机树 (RRT) 的变体

* #### 插值曲线规划器

  使用一组预定义的路点通过插值生成平滑轨迹

* #### 数值优化方法

  通过最小化/最大化受多个约束的成本函数来生成所需的轨迹。

### 为什么四足控制器基本都是MPC，轮足机器人控制器LQR居多，两者差别是什么，为什么会造成这种现象？

https://www.zhihu.com/question/553411411/answer/2747465823

* 四足的腿模型是非线性的，四足机器人的动态是连续与离散混合的（当触地的时候或者悬空的时候模型是连续的，但是悬空到触地是有突变的）

* 因为MPC用来预测的被控系统模型在每一个采样时刻都可以不同，所以MPC可以处理被控模型非线性以及模型动态混了离散和连续状态的情况（但LQR是针对线性系统的）。

* 如果存在一个硬约束，那么PID控制器的参考位置就必须设得远离这个硬约束（上半部分图），因为考虑到过冲恐怕会碰到硬约束（毕竟PID对这个硬约束比如墙壁，地面一无所知）。但是MPC是知道这个硬约束存在的（这个硬约束可直接写进MPC优化问题中）![img](file:///Users/kounarushi/mycode/web-blog/public/.pic/v2-6e529603e53ae040a9a70db994abdd8b_1440w.jpeg)

* 其实LQR也是一种MPC，对于所有的MPC来说系统要想绝对稳定就必须要有李雅普诺夫函数存在，但只有时域无穷大的时候才会有李雅普诺夫函数，而时域无穷大的时候常规MPC是解不出来的。但是LQR是一种特殊的情况，他可以保证你的时域无穷大（系统绝对稳定）时依然可以解出解析解来。

* MPC算法以前叫做APC（advanced process control，先进过程控制），因为他以前基本都用在采样时间分钟级别的，且几乎拥有完美线性动态的多变量大型过程系统中（比如化工和精炼）。但是近几年随着算法研究的进步（主要是算法研究的进步）MPC开始在毫秒级的汽车控制领域乃至微秒级的电力系统控制领域应用了

  