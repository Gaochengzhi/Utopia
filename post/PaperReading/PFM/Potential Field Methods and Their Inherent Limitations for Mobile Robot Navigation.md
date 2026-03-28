# Potential Field Methods and Their Inherent Limitations for Mobile Robot Navigation

From *Proceedings of the IEEE Conference on Robotics and Automation*, Sacramento, California, April 7-12, 1991, pp. 1398-1404

by **Y. Koren**, Senior Member, IEEE and **J. Borenstein**, Member, IEEE The University of Michigan, Ann Arbor

## ABSTRACT

* PFM being popular **obstacle avoidance applications**
  * because of its **elegance** and **simplicity**
  * shortcomings are inherent issues
* This paper presents a **systematic criticism** of the **inherent problems**
  * The identified problems are discussed in **qualitative** and **theoretical terms**
  * documented with **experimental results** from **actual** mobile robot runs

## Introduction

* PFM is for obstacle **avoidance** （obstacles exert repulsive forces while the target applies an attractive force to the robot）
* initial design is slow 
* we developed a PFM: virtual force field (VFF) 

## The Virtual Force Field (VFF) Method

* designed for **real-time** obstacle avoidance with **fast** mobile robots

  * **feature**: fast, continuous, and smooth motion

  * **method**: two-dimensional Cartesian grid( *histogram grid* **C** )

    * Each **cell** *(i,j*) in the histogram grid holds a certainty value (CV) :

      represents **the confidence of the algorithm in the existence of an obstacle** at that location

    * dynamic active region $C^*$ (33x33)

    * Each active cell exerts a virtual repulsive force $F_{i,j}$ toward the robot.

    * The magnitude of this force is proportional to $c^*_{i,j}$ and inversely proportional to $d^n$ (distence between cell and object)

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/dashjdaksja.jpg" alt="dashjdaksja" style="zoom:33%;" />

## Robot-Environment Mathematical Analysis

引入一个微分方程，描述机器人受环境影响的运动， 该方程基于将转向系统（ steering system ）模型与环境参数相结合。

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/dkjahsjkd.jpg" alt="dkjahsjkd" style="zoom:33%;" />

可能会引起机器人来回震荡，停滞不前。

## The Experimental System

real world experiement: CARMEL (Computer-Aided Robotics for Maintenance, Emergency, and Life support)

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/qqqqqwertyuiovbn.jpg" alt="qqqqqwertyuiovbn" style="zoom:33%;" />

## Problems with Potential Field Methods

**4 significant problems** that are inherent to PFMs and independent of the particular implementation:

1. Trap situations due to local minima (cyclic behavior).

   * a dead end (e.g., inside a U-shaped obstacle)
   * Remedies: heuristic recovery rules -> non-optimal path & local path planner (LPP) + integrated global path planner (GPP)
     * detail:  https://zhuanlan.zhihu.com/p/104048823

2. No passage between **closely spaced obstacles**.

3. Oscillations in the presence of obstacles.

4. Oscillations in narrow passages ( pass by unstable motions ).

   <img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/adhas.jpg" alt="adhas" style="zoom:50%;" />

## Conclusion

基于严格的数学分析，我们对势场方法 (PFM) 的固有问题进行了系统概述和批判性讨论。

具体来说，我们已经确定了四个明显的缺点。这些缺点中的两个与振荡的可能性有关，只有当 PFM 在高速实时系统中实现时才会变得明显。大多数研究人员将精力集中在潜在场的模拟程序上；他们似乎没有意识到一旦尝试在实验系统中实际实施，必然会出现的实质性的、可能无法解决的问题。其他研究人员使用实际的移动机器人工作，但速度较慢，这掩盖了 PFM 的缺点。
由于这些原因，我们完全放弃了势场方法，并开发了一种快速避障的新方法。这种方法称为矢量场直方图 (VFH) 方法，可产生平滑的非振荡运动，而采样时间和硬件与 VFF 方法中使用的相同。 VFH方法在下一篇论文中被介绍。

## 附录

https://zhuanlan.zhihu.com/p/104048823

### Motion Planning

Motion Planning是在遵循道路交通规则的前提下，将自动驾驶车辆从当前位置导航到目的地的一种方法。

#### **约束条件(constraints)：**

* 车辆运动学约束
* 静态障碍物(Static Obstacle)约束
* 动态障碍物约束
* 道路交通规则约束

#### **Motion Planning的优化目标**

1）关注路径长度(Path Length)，寻求到达目的地的最短路径。

$s_f = \int^{s_f}_{s_i}{\sqrt{1+ (\frac{dy}{dx})^2}dx}$

2）关注通行时间(Travel Time)，寻求到达目的地的最短时间。

$T_f = \int^{s_f}_{0} {\frac{1}{v(s)}ds}$

3）惩罚偏离参考轨迹和参考速度的行为。

$\int^{s_f}_{0} {||x(s) - x_{ref}(s)||ds}$

$\int^{s_f}_{0} {||v(s) - v_{ref}(s)||ds}$

4）考虑轨迹平滑性(Smoothness)

$\int^{s_f}_{0} {||\dddot{x}(s)||^2ds}$

5）考虑曲率约束(Curvature)

$\int^{s_f}_{0} {||k(s)||^2ds}$

通过组合设计自己的目标优化函数，从而获得较好的Planning效果。

#### **分级运动规划器(Hierarchical Motion Planning)**

Motion Planning是一个异常复杂的问题，所以通常我们把它切分为一系列的子问题。

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/v2-fd834965fabf083bea8b47728929de88_b.jpg" alt="img" style="zoom:33%;" />

* Mission Planner 关注High-Level的**地图级别的规划**；通过Graph Based的图搜索算法实现自动驾驶路径的规划。

* Behavior Planner 主要关注**交通规则**、其它道路交通参与者(自行车、行人、社会车辆)等等，决定在在当前场景下应该采取何种操作(如停车让行、加速通过、避让行人等等)。

* Local Planner 关注如何生成舒适的、碰撞避免的行驶路径和舒适的运动速度，所以Local Planner 又可以拆分为两个子问题：Path Planner和Velocity Profile Generation。Path Planner又分为 Sampling-Based Planner、Variational Planner 和 Lattice Planner。

  * 最经典的Sampling-Based Planner算法是Rapidly Exploring Random Tree，RRT算法。

  <img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/v2-db53ba131b1de75c379b1eb9d7a181e5_b.jpg" alt="img" style="zoom:33%;" />

  * Variational Planner根据Cost Function进行优化调整，从而避开障碍物，生成安全的轨迹。

  <img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/v2-37976c44ad3dd15fd999baa7c9b20a52_b.jpg" alt="img" style="zoom:33%;" />

	* Lattice Planner将空间搜索限制在对车辆可行的Action Space。 

	<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/v2-d4a2d263c6d13ca7e354fcdcdc24e58a_b.jpg" alt="img" style="zoom: 50%;" />

	* Velocity Profile Generation要考虑到限速、速度的平滑性等。
