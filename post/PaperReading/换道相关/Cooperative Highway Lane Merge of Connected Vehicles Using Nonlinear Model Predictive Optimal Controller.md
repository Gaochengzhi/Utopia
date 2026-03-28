# Cooperative Highway Lane Merge of Connected Vehicles Using Nonlinear Model Predictive Optimal Controller

```
by Syed A. Hussain 1 , Babak Shahian Jahromi 2 and Sabri Cetin 2,*
from vehicles 2020
```

## Abstract

从 direct multiple shooting method 得来的cooperative Nonlinear Model Predictive Control (NMPC)-based optimization method 被用于两辆相连车的高速公路换道。

只有模拟结果。

## Intro

纵向控制主要控制加速度和前车距离，视觉、雷达、V2V但是要处理信号延迟、故障相关的问题。

横向主要针对方向盘转向角，不仅要考虑当前车道，还要考虑变道对象的车道。

最小化整体制动诱导车道（Minimizing Overall Braking Induced，MOBIL）是一种更高级别的横向战略控制，可评估强制和可选车道变更期间变更车道所需的规则，in :

```
Kesting, A.; Treiber, M.; Helbing, D. General Lane-Changing Model MOBIL for Car-Following Models.
Transp. Res. Rec. J. Transp. Res. Board 2007, 1999, 86–94. [CrossRef]
```

加速度最好符合梯形曲线，需要留足变道过渡时间& 保持驾驶员的舒适度。

针对多车道高速公路探索了最优公式和贝叶斯网络中的遗传算法，以增加高速公路的吞吐量in

```txt
Kim, K.; Cho, D.i.; Medanic, J.V. Lane assignment using a genetic algorithm in the automated highway
systems. In Proceedings of the 2005 IEEE Intelligent Transportation Systems, Vienna, Austria, 16 September
2005; pp. 540–545.
```

## **Highway Merge Problem**

美国三种类型的高速公路车道合并配置:1）平行加速车道，2）锥形加速车道，3）辅助三叶草车道

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/1254673891098hsjagdbgjhasdb.jpg" alt="1254673891098hsjagdbgjhasdb" style="zoom: 33%;" />



| Rios-Torres, J.; Malikopoulos, A.A. A Survey on the Coordination of Connected and Automated Vehicles at Intersections and Merging at Highway On-Ramps. IEEE Trans. Intell. Transp. Syst. 2016, 1066–1077.[CrossRef] | 介绍了通过V2I 来提高变道安全性和效率的研究。                |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| Rios-Torres, J.; Malikopoulos, A.A. A Survey on the Coordination of Connected and Automated Vehiclesat Intersections and Merging at Highway On-Ramps. *IEEE Trans. Intell. Transp. Syst.* **2016**, 1066–1077. | 建议的基于 MPC 的合并优化搜索高速公路主车道上一个车队的空隙 |
| Kachroo, P.; Li, Z. Vehicle merging control design for an automated highway system. In Proceedings ofthe IEEE Conference on Intelligent Transportation System, ITSC’97. Boston, MA, USA, 12 November 1997;pp. 224–229. | 在优化程序中使用了合作行为                                  |
| Cao, W.; Mukai, M.; Kawabe, T.; Nishira, H.; Fujiki, N. Gap Selection and Path Generation during MergingManeuver of Automobile Using Real-Time Optimization. *SICE J. Control. Meas. Syst. Integr.* **2014**, *7*, 227–23 | 同上                                                        |



### 双车协同变道

#### 车道动力学模型

只有两个车，leading(h)和 merge (m)，假设：

1. 使用融合传感器确定自车以及其他车辆的位置
2. 在MPC 优化期间使用动力学模型来预测未来车辆系统
3. 做出转向、加速和制动的控制决策，以使控制目标最小化并满足约束条

h:$(x_h,y_h,\psi_h,v_h)$ ,位置，转向角，速度，m:$(a_m,\delta_f,m)$,加速度和转向角
$$
[\dot{z}]=\left[\begin{array}{c}
\dot{x}_m \\
\dot{y}_m \\
\dot{\psi}_m \\
\dot{v}_m \\
\dot{x_h} \\
\dot{v}_h
\end{array}\right]=\left[\begin{array}{c}
v_m \cdot \cos (\psi+\beta) \\
v_m \cdot \sin (\psi+\beta) \\
\frac{v_m}{l_r} \cdot \sin (\beta) \\
a_m \\
v_h \\
a_h
\end{array}\right]
$$
$\beta=\tan ^{-1}\left(\frac{l_r}{l_f+l_r} \tan \left(\delta_{f, m}\right)\right)$

#### 非线性MPC

#### Direct Multiple Shooting Method

👉看这个【三种最优控制Single/Multiple shooting, collocation method总结】https://zhuanlan.zhihu.com/p/396056002

**Comparison between direct and indirect method**

|                 | Indirect method                                              | Direct method                                                |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Solution Scheme | First optimize, then discretize (e.g. Pontryagin (PMP))      | First discretize, then optimize (transfer the infinite problem into finite- dimensional Nonlinear Programming problem (NLP), and solve NLP) |
| Pros            | 1. Boundary value problem with only 2n_x ODE 2. can treat large scale systems | 1. can use state-of-the-art methods for NLP solution 2. can treat inequality constraints and multipoint constraints much easier |
| Cons            | 1. only necessary conditions for local optimality 2. Need explicit expression for control u*(t), singular arcs difficult to treat 3. ODE(常微分方程，Ordinary differential equation ) is strongly nonlinear and unstable 4. inequalities lead to ODE with state-dependent switches | 1. obtain only suboptimal/approximate solution               |
| Applications    | optimal control e.g. in satellite orbit planning at CNES(法國國家太空研究中心) | most commonly used nowadays due to their easy applicability and robustness |

The **shooting method** (single/multiple) 就是将 **boundary value problem** 变化为 **a series of initial value problems** (BVP --> IVP)