# **Real-time obstacle avoidance for fast mobile robots in cluttered environments**

```
From 1990 IEEE International Conference on Robotics and Automation, Proceedings pp. 572-577, 13 May 1990.
By Johann Borenstein (IEEE Member; Assistant Research Scientist), and Yoram Koren (IEEE Senior Member; Paul G. Goebel Professor of Engineering) 
```

## Abstract

* ### Method feature:

  **VFH** ( Vector Field Histogram ): **real-time obstacle avoidance** method, permits the detection of unknown obstacles and avoids collisions while simultaneouslysteering the mobile robot toward the target.

  maneuvers **quickly** and **without stopping** among **densely cluttered** obstacles.

* ### Method brief explained:

  uses a two-dimensional **Cartesian** Histogram Grid as a world model which updated  in **real-time** with range data **sampled by the onboard ultrasonic range sensors**.

  computes a one-dimensional **Polar** Histogram around the robot's momentary location. Each sector in the Polar Histogram holds the polar obstacle density in that direction.

  selects the most suitable sector from Polar Histogram sectors with **low obstacle density,** and steering to it.

  

## **Introduction**

### previous research: 

**VFF( Virtual Force Field)** 

* virtual repulsive forces v.s. virtual attractive force -> not for real-time navigation

**Brooks (1986) and Arkin (1989)'s implementation (with ultrasonic sensors)** 

* more prone to sensor errors, real-time but not fast: traverse an obstacle course at 0.12 cm/sec

**limitations**

* can't pass narrow passages
* instability of motion when traveling within narrow corridors

#### This paper:

**introduce Vector Field Histogram (VFH) method**:

* real-time & **fast-running**
* **smooth motion** of the controlled vehicle among densely cluttered and unexpected obstacles
* **easily enter narrow passages** at high speeds and without oscillations

## The Histogram Grid for Sensor-based World Mockling

**VFH** uses a **two-dimensional Cartesian Histogram Grid** for the representation of obstacles

* from the concept of "certainty grid", but updated in real-time
* each cell represents the **confidence** of the algorithm in the existence of an obstacle **at that location**
* computaional **easy** compared to CMU's certainty grid method

**How to achieve computational easy?**

Only **ONE** cell is updated each time, and when it is moving, the same cell and its neighboring cells are repeatedly incremented.



![Screen Shot 2022-10-25 at 09.32.10](file:///Users/kounarushi/mycode/web-blog/public/.pic/Application.jpg)

## The Vector Field Histogram Method

 **two-stage data reduction** + **3 levels of data representation** 

a. 上帝视角，直方格（C）不动，但是小sample grid: "active region" (denoted C*) 实时更新。

b.  中间层 : 绕机器人的瞬时中心构建了一个极坐标直方图，

c. 数据表示的最低级别是 VFH 算法的输出：车辆驱动和转向控制器的参考值。

### First Data Reduction: Creation of the Polar Histogram

The first data reduction stage maps the **active region** of the **Histogram** **Grid** **C\*** into the **Polar Histogram** H.

the direction of which is determined by the direction $\beta_{i,j}$ from the cell to the Vehicle Center Point (VCP).

$$\beta_{i,j} = tg^{-1}\frac{y_j-y_0}{x_i-x_0}$$

and the magnitude is given by:

$$m_{i,j} = (c^*_{i,j})^2[a-b\ d_i,j]$$

![dkjaslkdasj](file:///Users/kounarushi/mycode/web-blog/public/.pic/dkjaslkdasj.jpg)

因此重复的信号代表了真实的障碍而不是错误信号。并且使用了一个平滑函数来保证转向不会 ragged and cause errors:

$$ h_{k}^{'}=\frac{h_{k-l}+2h_{k-l}+\dots+lh_{k}+\dots+2h_{k+l-1}+h_{k+l}}{2l+1}$$



### Second Data Reduction: Computation of Steering Control

* Polar Histogram typically has **peaks** (sectors with high obstacle density), and **valleys** (sectors with low obstacle density)
* Any valley with obstacle densities **below threshold** is a candidate for travel
* selects the one that most closely matches the direction to the target 

在较为窄的valley 中选择谷的中心，以便在机器人的每一侧保持相等的间隙。如果选择的山谷非常宽（例如，当只有一个障碍物靠近机器人时），算法选择几个扇区“深入”山谷，但不一定在其中心。

![ksjfhsdkjfhsdfsd](file:///Users/kounarushi/mycode/web-blog/public/.pic/ksjfhsdkjfhsdfsd.jpg)

### Speed Control

* set max speed $S_{\max}$ at the beginning of a run.

* VFH try to maintained that unless forced by the VFH algorithm to a lower instantaneous speed S:
  When turning into new directions: $S^{'} = S_{\max}(1-h^{"}_c/h_m)$, where $h^{"}_c = \min(h^{'}_{c}, h_m)$

* speed *can* be further reduced proportionally to the actual steering rate $\Omega: S = S'(1-\Omega/\Omega_{\max})$

## Experimental Results

商用移动平台（Cybermation，1987）,三轮同步驱动，可全向转向，24 个超声波传感器

在大多数实验中，车辆以最大速度（0.78 m/sec）运行。仅当正面接近障碍物或出于动态原因需要时，此速度才会降低。

## Conclusions

VFH 的优势在于对存在障碍物的高可能性集合做出响应，同时忽略单个（错误的）数据点。 此外，由于在中间数据级别（free valleys）仍然可以获得有关狭窄通道的信息，因此车辆能够通过狭窄通道或通过狭窄走廊而不会出现振荡。