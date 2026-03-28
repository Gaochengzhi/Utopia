# A Novel Path Planning Algorithm for Truck Platooning Using V2V Communication

```shell
Lee Y, Ahn T, Lee C, et al. A novel path planning algorithm for truck platooning using V2V communication[J]. Sensors, 2020, 20(24): 7022.
```



## Abstract

* ### background

  卡车编队（articulated cargo trucks）行驶中，前车（leading vehicle）由人工驾驶，后车（following vehicles）由自主驾驶行驶，卡车之间的车距较短。每辆卡车都必须保持动态稳定性，此外，整个系统必须保持**串稳定性**（string stability）。

* ### challenge

  1. 后车的前视范围（front-view range）较短，路径规划能力受损，容易在**弯道跑偏**（off-tracking phenomenon）
  2. 在不了解全局坐标系的情况下, 很难关联每个车的局部坐标系 it is difficult to correlate the **local coordinate systems** ( that each truck relies on for sensing environment and dynamic signals )

* ### solution

  开发了一种用于铰接式货车列队行驶的路径规划算法：

  使用卡尔曼滤波器、V2V（车对车）通信和一种新颖的更新和转换方法，每个跟随车辆都可以**计算出领先车辆前部的轨迹**，并将其用作目标路径。

## intro 

![Sensors 20 07022 g001 550](file:///Users/kounarushi/mycode/web-blog/public/.pic/sensors-20-07022-g001-550.jpg)

后车使用雷达、摄像头等环境传感器感知前方车辆和车道，通过车辆纵向和横向控制进行自动驾驶。

不用GPS：稳定性，隧道遮挡。

大型车队长度可达100m，但是一个编队限定在3~4 辆车保证灵活性和安全性。

#### 后车纵向（longitudinal）控制：

使用较为成熟的ACC 算法，保持纵向控制较短的距离（空气动力学考量，节油）

* 摄像机的**前视范围**受到前面卡车的严重限制

#### 后车横向（lateral）控制：

使用摄像头，旨在跟随前车的行驶路径，同时保持在自己的车道上。

* 直接跟车（direct vehicle-following）：

  后车用与前车相对纵向和横向距离进行操作，基于几何原理计算转向角。主车（subject vehicle）重心（CG）和前车后部中心（rear center）之间的相对位置和相对角度，可以用来计算其到前车后部的**虚拟弯曲路径**。

  缺陷：

  * 用的是**前车后方**的相对位置信息，而不是前车方向盘的轨迹，所以在转弯时可能会出现在前车实际轨迹内行驶（inside the actual trajectory of the preceding vehicle）的问题。
  * 在小曲率高速公路行驶时，由于与前车的相对横摆角（yaw angle）很小，如果感知精度低/测量分辨率小，则无法保证跟随前车虚拟弯曲路径的可靠性。

* 车辆路径跟随（path-following）：

  前车的轨迹：**本车的运动参数**+**存储前车后部位置坐标**。 

  缺陷：

  * 由于编队行驶时车辆间距离较短，因此存在无法在高速获得足够前视距离的问题。 
  * 如果是半挂卡车（semi-trailer truck），在转向过程中，**跑偏（Off-tracking）现象**，即牵引车的转向轴和拖车后部保险杠之间的路径不同，会导致在跟随前车时出现跟踪错误。

![Sensors 20 07022 g003 550](file:///Users/kounarushi/mycode/web-blog/public/.pic/sensors-20-07022-g003-550.jpg)

克服跑偏问题：后车需要用**前车的牵引车**而不是拖车的轨迹来确定自己的目标路径。 

使用摄像头/雷达融合数据、IVN（车载网络）底盘信号和 V2V 通信，计算出 LV 拖车头（tractor）位置的轨迹，用作自己的目标路径。

## System Architecture

车的各种参数：

……

**Overall architecture of truck platooning lateral controller.**

![Sensors 20 07022 g006 550](file:///Users/kounarushi/mycode/web-blog/public/.pic/sensors-20-07022-g006-550.jpg)

All vehicles participating in the fleet perform V2V communication among each other using DSRC/802.11p WAVE (Wireless Access in Vehicular Environment) protocol

前车创建其驱动轨迹，通过V2V 通信传给后车，后车执行路径规划。

需要估计无法测量的横向速度（卡尔曼滤波器）+ 本地坐标系转换 （点匹配，point matching）

## Vehicle State Estimation by Kalman Filter

在以往的研究中，由于无法测量车辆的横向速度，因此仅考虑横向速度较小的一般高速公路行驶场景，并假设横向速度为零。

运动学方程……

卡尔曼滤波器，设计为每 10 ms 估计一次状态.

路径规划算法中，前车必须生成自己的驾驶轨迹，使后车可以创建其目标路径。该轨迹分别由前后两个部分组成，各自保存300样本在FIFO 的pipline 缓存中。

![Sensors 20 07022 g010 550](file:///Users/kounarushi/mycode/web-blog/public/.pic/sensors-20-07022-g010-550.jpg)

## Proposed Path Planning Algorithm

后车路径规划框架：

![Sensors 20 07022 g011 550](file:///Users/kounarushi/mycode/web-blog/public/.pic/sensors-20-07022-g011-550.jpg)

挑战在于没有全局坐标概念的情况下将LV viewpoint 的坐标系统转换成 FV 的。

两个数据集P和Q之间的点匹配方法：

首先，分别从P和Q中选择一个参考点。 它们必须代表相同二维形状中的相同点。 根据它们位置的不同，可以找到一个平移向量，并相应地平移 Q 中的所有点。 最后找到使P和Q重合的旋转矩阵。

![Sensors 20 07022 g014 550](file:///Users/kounarushi/mycode/web-blog/public/.pic/sensors-20-07022-g014-550.jpg)

![Sensors 20 07022 g015 550](file:///Users/kounarushi/mycode/web-blog/public/.pic/sensors-20-07022-g015-550.jpg)

后车能看到后保险杠，前车发送tractor 中心坐标，由此计算（Kabsch算法）转移坐标。

## Results of Simulation and Road Test Experiments

整个实验包括仿真和实际测试两部分，其中仿真基于TruckSim和Matlab/Simulink，实际部分在高速进行，长度7.7公里。

模拟的结果是越往后的车辆由于卡尔曼滤波器的误差，其规划值逐渐偏离真值。

真实路测的结果显示，卡车对小坡度非常敏感，会导致横向位移偏差。本框架对于前车的随机扰动也有良好的修正能力。