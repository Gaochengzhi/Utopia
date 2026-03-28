# Lane Change and Merge Maneuvers for Connected and Automated Vehicles: A Survey

```txt
by David Bevly, Xiaolong Cao, Mikhail Gordon, Guchan Ozbilgin, Student Member, IEEE, David Kari, Brently Nelson, Jonathan Woodruff, Matthew Barth, Fellow, IEEE, Chase Murray,
Arda Kurt, Member, IEEE, Keith Redmill, Senior Member, IEEE, and Umit Ozguner, Fellow, IEEE

from IEEE TRANSACTIONS ON INTELLIGENT VEHICLES, VOL. 1, NO. 1, MARCH 2016
```

## Abstract

* ### background

  Most paper focus on the **longitudinal** control, few on the **lateral** control, e.g **lane changes and merging**

* ### Contribution

  Survey on the key topics: control systems, positioning systems, communication systems, simulation modeling, field tests, surroundings vehicles, and human factors. 

* ### Conclusion

  Strong need for standardization and comprehensive field testing

## Intro

* High/Freeways are the primary focus
* Control: automated lane change and merge
* Passenger vehicle
* 将变道系统添加到现有自动化架构所需的主要技术是能够判断车辆相对于当前车道和预定车道的位置/速度的技术

## 车辆定位系统

视觉、雷达、GPS

## 通信系统

ETSI CAM (Cooperative Awareness Messages) and DENM (Decentralized Environmental Notification Messages)……协议的丢失率约为 5%，在模拟中平均约为 4%，但发生网络碎片的极低密度情况除外。密度为 10 辆车/公里/车道时，传播距离平均为 650 米，车辆在接收到合并信息之前行驶了大约 100 米 [38]。另一种有效的方法，用于车辆间通信的多跳广播协议 (UMB) 旨在在高交通密度区域非常有效地利用信道 [39]。

## 控制系统

1. 舒适地变道 2. 协作merging

### 纵向控制

两个层级，上层（supervisory controller ）切换自动驾驶状态保持串稳定性。下层控制器控制油门刹车。

为了保持稳定性，spacing error 必须在中间车辆递减。

需要高采样频率才能在车辆间距离相对较短的情况下实现串稳定性，同时容忍较大的通信延迟。但是，增加采样频率会限制字符串中的车辆数量。

MPC & PID 控制方法

固定 PID 控制器最简单，但在加速时出现振荡，低速时乘坐舒适性变差，自适应控制器响应最快，但计算量更大。

### 横向控制

1. 策略层2. 控制层。

   策略级别通过考虑碰撞避免来确定何时以及如何进行变道或合并。在控制层面，转动方向盘或踩下油门或刹车决定了如何实施变道或合并。

（trapezoidal acceleration）梯形加速度轨迹是变道机动的虚拟期望轨迹的最理想候选者。