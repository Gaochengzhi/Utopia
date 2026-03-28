# A Review of Motion Planning Techniques for Automated Vehicles

```
IEEE TRANSACTIONS ON INTELLIGENT TRANSPORTATION SYSTEMS, VOL. 17, NO. 4, APRIL 2016 1135

by David González, Joshué Pérez, Vicente Milanés, and Fawzi Nashashibi
```
## Abstract

### research background:

* main **goal**: <u>safety, comfort, and energy optimization</u>

* research **challenges**: 
  * navigation in **urban dynamic environments** with **obstacle avoidance** capabilities
  * **cooperative** maneuvers among **automated and semi-automated vehicles**

### What this paper did: 

* presents a **review** of **motion planning techniques** in the **intelligent vehicles literature**
  * technique description of research teams
    * contributions in **motion planning** 
    * **comparison** among these techniques 
  * **gaps and challenges** in the next years
  
* **overview of future research** direction and applications

  

## introduction

![大声道撒旦撒撒](/Users/kounarushi/mycode/web-blog/public/.pic/%E5%A4%A7%E5%A3%B0%E9%81%93%E6%92%92%E6%97%A6%E6%92%92%E6%92%92.png)

Fig. 1 shows a **general architecture** for automated vehicles

* perception
* decision 
* control

**This work focus on decision stage (motion planning strategies**, originate from mobile robotics applications)



## MOTION PLANNING STATE-OF-THE-ART

![](file:///Users/kounarushi/mycode/web-blog/public/.pic/ScreenShot2022-10-20at12.06.44.png)

![dashdaskdhbckajdh](/Users/kounarushi/mycode/web-blog/public/.pic/dashdaskdhbckajdh.png)

### A. Graph Search Based Planners

the basic idea is to traverse a state space to get from point A to point B

* Dijkstra Algorithm
* A-Star Algorithm: an extension of above, heuristics ( cost function when doing bfs)
  * Improvemented variations: dynamic A∗ (D∗), Field D∗, Theta∗, Anytime repairing A∗ (ARA∗) and Anytime D∗ (AD∗) ……
* [State Lattice Algorithm](https://zhuanlan.zhihu.com/p/403822524): uses a **discrete** representation of the planning area with a grid of states
  * https://zhuanlan.zhihu.com/p/145466792

### B. Sampling Based Planners

try to solve timing constrains, suboptimal.

https://zhuanlan.zhihu.com/p/349074802： 图搜索的路径规划算法主要用于低维度空间上的路径规划问题，它在这类问题中往往具有较好的完备性，但是需要对环境进行完整的建模工作，在高维度空间中往往会出现维数灾难。

most common methods:

* Probabilistic Roadmap Method (PRM)：随机撒点，然后连接，转换成图搜索问题
* Rapidly-exploring Random Tree (RRT)：随机树拓展，直到相互连接【具有考虑非完整约束（例如车辆的最大转弯半径和动量）的能力】

### C. Interpolating Curve Planners

in benefit of the **trajectory continuity**, vehicle constraints and the dynamic environment the vehicle navigates

* **Clothoid Curves/Euler spiral**

curvature changes linearly with its curve length

车辆运行轨迹的曲率和方向盘基本上成正比，也就是说这种线型出来的结果方向盘会非常顺滑

* **Polynomial Curves**

meet the constraints needed in the points they interpolate, i.e. they are useful in terms of fitting position, angle and curvature constraints e.g. 四次多项式用于纵向约束，五次多项式用于横向约束

* **Bézier Curves**

计算简单 速度快。

### D. Numerical Optimization

These methods aim to minimize or maximize a function subject to different constrained variables, e.g. compute trajectories from **kinematic constraints**

http://www.cs.cmu.edu/~./motionplanning/papers/sbp_papers/integrated1/borenstein_potential_field_limitations.pdf

____

These implementations show that the **first steps** for automated driving have already been set. 

Different architectures implement motion planners in order to have a **safe and continuous path** to follow. To mitigate or **eliminate risky situations** (such as dynamic obstacle avoidance, emergency situations, intersection and merging negotiation, among others) is the **current focus** in the literature.

 The consideration of perception limitations (uncertainty in measurements) and control needs for **safety and comfort** are key aspects in **futures steps**

## MOTION PLANNING DEVELOPMENTS BY ITS GROUPS WORLDWIDE

*  the idea of intelligent vehicles **begun** in 1939 at New York world fair with GM’s Futurama presentation

* The EUREKA-PROMETHEUS project **pioneered in Europe** this research between 1987 and 1994, where different vehicles from **industrial partners such as Volvo and Daimler were automated**

* The PATH program presented **its platooning demonstration** as part of the Demo ’97 at San Diego CA

* Netherlands introduced the first operational service of CTS  (last mile problem providing a **door-to-door and on-demand service**)

* One of the first projects **to test path planning techniques** was the ARGO project from VisLab

* The first Google Car made its entrance in 2009 ( **automated capabilities** of their vehicles )

* ……

* 重要演示和发展的时间表:

  ![dasdasdasdasdas](/Users/kounarushi/Desktop/dasdasdasdasdas.png)

## DISCUSSION

#### 当前的挑战：动态环境的实时规划计算：

​	必须考虑多个施事者（agents）（即行人、骑自行车者、其他车辆）的城市场景需要对确定的轨迹进行持续评估（和重新计算）。生成具有多个动态障碍物的新自由碰撞轨迹的有限时间是一个未解决的挑战。这主要是由**耗时**的感知算法引起的，大大减少了运动规划决策窗口。当前的实现还不能克服这个限制。

#### 规划阶段是感知和控制之间的联系

最近的发展旨在在规划阶段考虑其中一些约束，从而实现平滑和可实现的轨迹，减少控制阶段的约束。接下来的步骤应该集中在开发能够将感知不确定性与控制约束融合的算法。

#### 自动驾驶汽车研究的一个新趋势

在控制回路中增加驾驶员。从路径规划研究的角度来看，使用 HMI 将轨迹传达给驾驶员，充当 ADAS [77]、[107]。在生成安全、平稳和可实现的轨迹时，通过多重融合感知不确定性、控制约束和驾驶员知识，这带来了新的研究挑战。

## terminology

### Cruise Control (CC), Adaptive CC (ACC) , Cooperative ACC (CACC) Advanced Driving Assistance System (ADAS)

* CC: 定速巡航

* ACC: L2 , 自动跟车巡航, 汽车定速巡航控制系统（Cruise Control System，CCS）+ 车辆前向撞击报警系统（Forward Collision Warning System，FCWS）

  * 无法跟车转弯

  * 静态物体识别问题

* CACC：可以通过**实时信息共享**来实现高效自适应的目标检测和精确控制，当能够通过V2X（vehicle to everything）技术传递行驶信息时，网联自动驾驶车辆以协同自适应巡航控制(Cooperative Adaptive Cruise Control, CACC) 模式行驶。

* [ADAS](https://zhuanlan.zhihu.com/p/62199564): L3，（自动泊车系统APA、自动巡航系统ACC、 自动紧急刹车AEB、车道偏离预警系统LDW、车道保持系统LKA、前方碰撞预警FCW、行人碰撞预警PCW、车距监测警告HMW、交通标志识别TSR、远光灯辅助系统HBA等）

### throttle: 油门

