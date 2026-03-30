# Heterogeneous Platoon Characteristics

## 实验变量设计

freeway density x CACC MPRs x  platoon max size x vehicle arrangement 

## Ask ChatGPT

异质车队是指在同一车队中，车辆类型、性能和行驶特性不尽相同的车辆。这种车队可能会存在以下特点：

1. 车辆性能差异大：在异质车队中，车辆的性能可能存在很大的差异，比如载重量、速度、**加速度**等。这会导致车队行驶的效率不高，因为车辆之间可能会产生拖累或者碰撞的风险。
2. 协调性差：由于车辆之间存在性能差异，在异质车队中很难实现车辆之间的协调配合。这会导致车队的效率低下，并且会增加交通事故的风险。
3. 调度困难：异质车队中的车辆类型众多，很难统一调度。这会使得车队的运营管理变得复杂，增加经营成本。
4. 可靠性差：由于车辆类型不同，车辆的可靠性也可能存在差异。这会导致车队的整体可靠性降低。

总的来说，异质车队的特点是车辆性能差异大、协调性差、调度困难、可靠性差。



## Data-driven optimal cooperative adaptive cruise control of heterogeneous vehicle platoons with unknown dynamics

```shell
Song X, Ding F, Xiao F, et al. Data-driven optimal cooperative adaptive cruise control of heterogeneous vehicle platoons with unknown dynamics[J]. Science China Information Sciences, 2020, 63(9): 1-12.
```

### Abstract

提出了一种数据驱动的CACC 方法，使用自适应动态规划设计了一个在线迭代策略来优化编队的未知（异质）参数。

CACC 控制器使用 间距误差、相对速度和车辆加速度来计算，并给出了闭环CACC系统的稳定性和迭代算法。

### Intro

车辆是由刚体和弹性阻尼元件组成的综合运动系统，对于具有未知或不确定参数的系统的控制问题，自适应动态规划 adaptive dynamic programming (ADP) 为具有未知动态的CACC 系统提供了一种有效的控制方法。

(1) 提出了一种基于迭代 ADP 的 CACC 方法，用于未知动力学的异构车辆队列系统的串稳定性，该方法使用车队的真实状态和输入评估迭代求解 CACC 系统的代数 Riccati 方程；

(2) 所设计的CACC 控制器独立于车辆加速度的导数，并且在不考虑CACC 系统未知参数的情况下获得了队列稳定的条件。 

### 问题建模

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/03B6DC85-7759-4634-9B2D-5E5247F19E2A.jpg" alt="Screen Shot 2023-01-03 at 09.40.49" style="zoom:33%;" />

#### 纵向运动建模：

$p_{i}, v_{i}$ and $a_{i}$ 位置，速度，加速度。
$$
\dot{p}_{i}(t)=v_{i}(t), \quad \dot{v}_{i}(t)=a_{i}(t), \quad \dot{a}_{i}(t)=f_{i}\left(v_{i}(t), a_{i}(t)\right)+g_{i}\left(v_{i}(t)\right) \partial_{i}(t), \quad \forall t \geqslant 0,
$$

$\partial_{i}(t)$ 是引擎输出，  $f_{i}$ and $g$ are given by

$$
\begin{aligned}
& f_{i}\left(v_{i}, a_{i}\right)=-\frac{1}{\tau_{i}}\left(a_{i}+\frac{\sigma Y_{i} f_{d i}}{2 m_{i}} v_{i}^{2}+\frac{p_{m i}}{m_{i}}\right)-\frac{\sigma Y_{i} f_{d i} v_{i} a_{i}}{m_{i}}, \\
& g_{i}\left(v_{i}\right)=\frac{1}{\tau_{i} m_{i}},
\end{aligned}
$$

 $\tau_{i}$ is the unknown time constant of **the lag in tracking any desired acceleration command**

 $\sigma$ is the air density, and $Y_{i}, f_{d i}, p_{m i}$ and $m_{i}$ are the **cross-sectional area(横截面积), drag coefficient, mechanical drag and mass of the vehicle**, respectively. 

In order to linearize the acceleration equation in (1), the following equation is used [35]:
$$
\partial_{i}=u_{i} m_{i}+\sigma Y_{i} f_{d i} v_{i}^{2} / 2+p_{m i}+\zeta_{i} \sigma Y_{i} f_{d i} v_{i} a_{i},
$$

where the new control input $u_{i}$ is the **desired acceleratio**n of vehicle $i$. Substituting (3) into the third equation in (1), it is obtained that

$$
\dot{a}_{i}(t)=-a_{i}(t) / \tau_{i}+u_{i}(t) / \tau_{i} .
$$

Then the unknown time constant $\tau_{i}$ represents the **inertial lag** of longitudinal dynamics of each vehicle $i=1, \ldots, n$. It is assumed that the inertial lag of longitudinal dynamics of vehicles in the platoon is bounded by $\zeta_{i}>0$. **Note that as the unknown parameters are not identical for each vehicle, the platoon is called a heterogeneous one.**

#### 车距：

$$
d_{i}^{*}(t)=d_{0}+h_{i} v_{i}(t),
$$

 $d_{0}$  是静止时的车距， $h_{i}$ 是车头时距。

Moreover, at time $t \geqslant 0$ we compute the actual inter-vehicle distance for vehicle $i$ as
$$
d_{i}(t)=p_{i-1}(t)-p_{i}(t)-l_{i-1},
$$

where $p_{i-1}, l_{i-1}$, and $p_{i}$ are the **position and length** of vehicle $i-1$, and the position of vehicle $i$, respectively. 

The spacing error $\delta_{i}$ of the vehicle between the actual and desired inter-vehicle distances is computed for all vehicles in the platoon and times $t \geqslant 0$ as:
$$
\delta_{i}(t)=d_{i}(t)-d_{i}^{*}(t)=p_{i-1}(t)-p_{i}(t)-l_{i-1}-d_{0}-h_{i} v_{i}(t) .
$$

The goal of this paper is to design an optimal CACC controller $u_{i}=k_{i}\left(\delta_{i}, \dot{\delta}_{i}, a_{i}\right)$ for each vehicle $i$ such that the spacing error $\delta_{i}$ can be regulated to zero in the context of unknown parameter $\tau_{i}$ of the vehicle in (4). Here we use ADP-based iterative computation to develop the optimal data-driven CACC controller.

### 实验

一组6辆车， time constant $\tau_{i}$ represents the inertial lag 从混合动力的0.1 到0.5 的燃油动力，重量参数Q1~Q6

运动时的时距为0.8s，静止间距为1m



## Adaptive Optimal Control of Heterogeneous CACC System With Uncertain Dynamics

### Abstract

提出了一种新的控制结构，利用动态参数的估计，将异质 CACC问题转化为队列中每辆车的误差动力学调节问题。

提出了一种基于在线数据学习最优反馈的自适应最优控制。在频域（frequency domain）进一步分析了相邻车辆之间的位置传递函数。通过平方和规划，求出保证车队列稳定性的最小车头时距。

different vehicles may have different dynamic parameters and their exact values are unknown/uncertain to designers.

### Intro

现有的CACC很少考虑最优性。它们的控制器是手动选择的，在控制效果或成本标准方面可能不是最优的。

如果系统具有线性动力学，而其代价 selects a quadratic form，则问题化解为求解的代数Riccati方程(ARE)

在实践中，车辆动力学大多是未知或不确定的，因此不可能定义ARE 方程。为此，需要无模型或基于数据的最优控制方法。

基于平方和(SOS)理论，数值求解了保证队列稳定性的最小车头时距。

### 异质CACC 以及其控制结构

$$
\begin{aligned}
\dot{p}_{i} & =v_{i} \\
\dot{v}_{i} & =a_{i} \\
\dot{a}_{i} & =-\frac{1}{\tau_{i}} a_{i}+\frac{1}{\tau_{i}} u_{i}
\end{aligned}
$$

 $\tau_{i}$ represents the low-level control dynamics, for different vehicles, values of $\tau_{i}$ may be different. I**n that case, the platoon is heterogeneous.**

采用固定时距，r 是静止时的间距，理想间距是
$$
d_{i}^{*}=r_{i}+h_{i} v_{i}
$$
实际间距是：
$$
d_{i}=p_{i-1}-p_{i}-l_{i-1}
$$
控制目标是误差降到0：
$$
\begin{aligned}
e_{i} & =d_{i}-d_{i}^{*} \\
& =p_{i-1}-p_{i}-h_{i} v_{i}-r_{i}-l_{i-1} .
\end{aligned}
$$
消项求解error 最小值，构建代价函数……



## 

> In addition, platoons are normally assumed to have unified system parameters, such as the same inter-vehicle distance within the platoon and the same **model parameters** (acceleration, actuator parasitic delay, etc.) for all vehicles. The further work is expected to pay attention to the heterogeneous platoon-based cooperative driving, which is more closing to the practice.



> Traffic flow in these studies, however, was not truly a heterogeneous but a multi-class flow. Within each class, vehicle model parameters were the same for all vehicles, and were fixed at specific values which were deemed to be ‘representative’ of all vehicles in that class.





## SUMO vehicle class 可用的参数

| accel           | float                                                        | 2.6                                                          | The acceleration ability of vehicles of this type (in m/s^2) |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| decel           | float                                                        | 4.5                                                          | The deceleration ability of vehicles of this type (in m/s^2) |
| apparentDecel   | float                                                        | `==decel`                                                    | The apparent deceleration of the vehicle as used by the standard model (in m/s^2). The follower uses this value as expected maximal deceleration of the leader. |
| emergencyDecel  | float                                                        | 9.0                                                          | The maximal physically possible deceleration for the vehicle (in m/s^2). |
| startupDelay    | float >= 0                                                   | 0                                                            | The extra delay time before starting to drive after having had to stop |
| sigma           | float                                                        | 0.5                                                          | [Car-following model](https://sumo.dlr.de/docs/Definition_of_Vehicles%2C_Vehicle_Types%2C_and_Routes.html#car-following_models) parameter, see below |
| tau             | float                                                        | 1.0                                                          | [Car-following model](https://sumo.dlr.de/docs/Definition_of_Vehicles%2C_Vehicle_Types%2C_and_Routes.html#car-following_models) parameter, see below |
| length          | float                                                        | 5.0                                                          | The vehicle's **netto**-length (净长度) (in m)               |
| minGap          | float                                                        | 2.5                                                          | Empty space after leader [m]                                 |
| maxSpeed        | float                                                        | 55.55 (200 km/h) for most vehicles, see [vClass-specific defaults](https://sumo.dlr.de/docs/Vehicle_Type_Parameter_Defaults.html) | The vehicle's (technical) maximum velocity (in m/s)          |
| desiredMaxSpeed | float                                                        | 2778 (1e4 km/h), 5.56 (20km/h) for bikes, 1.39 (5 km/h) for pedestrians, see [model details](https://sumo.dlr.de/docs/Simulation/VehicleSpeed.html#desiredmaxspeed) | The vehicle desired maximum velocity (in m/s) is computed as `desiredMaxSpeed * individual_speedFactor`. |
| speedFactor     | float or [distribution spec](https://sumo.dlr.de/docs/Definition_of_Vehicles%2C_Vehicle_Types%2C_and_Routes.html#defining_a_normal_distribution_for_vehicle_speeds) | 1.0                                                          | The vehicles expected multiplier for lane speed limits and desiredMaxSpeed |
| speedDev        | float                                                        | 0.1                                                          | The deviation of the speedFactor; see below for details (some vClasses use a different default) |
|                 |                                                              |                                                              |                                                              |
| vClass          | class (enum)                                                 | "passenger"                                                  | An abstract [vehicle class (see below)](https://sumo.dlr.de/docs/Definition_of_Vehicles%2C_Vehicle_Types%2C_and_Routes.html#abstract_vehicle_class). By default vehicles represent regular passenger cars. |
| maxSpeedLat     | float                                                        | 1.0                                                          | The maximum lateral speed when using the [sublane-model or continuous lane change model](https://sumo.dlr.de/docs/Simulation/SublaneModel.html) |
| scale           | float >= 0                                                   | scaling factor for traffic. Acts as a multiplier for option **--scale** for all vehicles of this type. Values < 1 cause a proportional reduction in traffic whereas values above 1 increase it by this factor. (default 1) |                                                              |

## Unravelling effects of cooperative adaptive cruise control deactivation on traffic flow characteristics at merging bottlenecks

```
by Lin Xiao, Meng Wang⁎, Wouter Schakel, Bart van Arem
from Department of Transport and Planning, Faculty of Civil Engineering and Geosciences, Delft University of Technology, Stevinweg 1, 2628 CN Delft, the Netherlands
```

### **Experiment design**

![Screen Shot 2023-01-04 at 21.22.00](file:///Users/kounarushi/mycode/web-blog/public/.pic/69ECFEB5-8864-412E-966E-635E3F0F1770.jpg)

Warm-up section: generate CACC flows,

D1, D2, and D3 in Fig. 4 at 8000 m, 8450 m and 10,750 m, all detectors provide 5-min data for flow and speed

The on-ramp demand is set to 400, 800, 1200 and 1600 veh/h

The random seed assigns the vehicle class, desired speed and the arriving interval between two vehicles at the simulation generators.

The simulation lasts for one hour with a 0.1 s time step and the first 10 min is taken as a warm-up period







## Fundamental diagram and stability of mixed traffic flow considering platoon size and intensity of connected automated vehicles

(1) a greater platoon size leads to the increase of traffic capacity while it is harmful to the maintenance of traffic flow stability;

(2) the platoon size is recommended to be set at 4 to 6 to balance the relationship between traffic capacity and stability; 

(3) a more significant platoon intensity can help improve the traffic capacity and stability; 

(4) the penetration rate of CAVs has a positive effect on the traffic flow stability until it increases to a certain degree





## Analytical analysis of the effect of maximum platoon size of connected and automated vehicles

This paper unveils the effect of maximum CAV platoon size in terms of road capacity and traffic flow stability. Specifically, the analytical formulations of the capacity and flow stability are developed considering the maximum platoon size.

1. A larger maximum platoon size can help increase the capacity. However, the increment becomes smaller with the increase of maximum platoon size
2. Smaller maximum platoon size leads to greater traffic flow stabilization
3. Effect became more profound when CAV penetration and platooning intensity are high.

## Oversaturated Freeway Flow Algorithm

在合作自适应巡航控制(cacc)的情况下，tau是时间常数，它定义了车辆加速度对领先车辆速度变化的响应性。它决定了被控制车辆的加速度跟踪领先车辆速度变化的速率。较小的tau值会导致更快的跟踪和更高的响应，而较大的tau值会导致更慢的跟踪和更低的响应。

驾驶员期望的(最小)车头时距。准确的解释因模型而异。对于默认模型krauss，这是基于领导者和追随者之间的净空间)。有关限制，请参阅汽车跟踪模型#tau)。

## visual 

```shell
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py e3_1.xml e3_0.xml e3_2.xml -x   vehicleSum -y meanSpeed  -o plotmeanSpeed.png --legend 
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py e3_1.xml e3_0.xml e3_2.xml -x begin -y  vehicleSum  -o plotVehicleSum1.png --legend 
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py e3_1.xml e3_0.xml e3_2.xml -x begin -y  meanDurationWithin  -o  meanDurationWithin1.png --legend 
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py e3_1.xml e3_0.xml e3_2.xml -x begin -y  vehicleSumWithin  -o  vehicleSumWithin1.png --legend 
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py e3_1.xml e3_0.xml e3_2.xml -x begin -y  meanTimeLossWithin  -o  meanTimeLossWithin1.png --legend 

python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py fd.out.xml -i id -x speed -y density    --scatterplot  -o fd.png --legend 

python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py -x begin -y maxOccupancy -o plot-maxOccupancy.png --legend e2_0.xml e2_1.xml e2_2.xml e2_3.xml  e2_4.xml
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py -x begin -y  meanSpeed -o plot-maxOccupancy1.png --legend e2_0.xml e2_1.xml e2_2.xml e2_3.xml e2_4.xml
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py -x begin -y   meanVehicleNumber -o plot-maxOccupancy2.png --legend e2_0.xml e2_1.xml e2_2.xml e2_3.xml  e2_4.xml
```



```
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py e3_1.xml e3_0.xml e3_2.xml -x begin -y meanSpeed  -o plotmeanSpeed.png --legend -s --scatterplot
```



```
# clean all png
find . -name "*.png" -exec rm -rf {} \;
mkdir fd_plot_by_vsum
find . -name '*.fd.png' -exec mv {} fd_plot_by_vsum \;


```

python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py  --help | less

Dis x 1-cacc = 0.2x 1







```
rsync -r ssh ubuntu@1.13.17.245:/home/ubuntu/mycode/Platoon/data/ ~/mycode/Platoon/data
```

## The Impact of Cooperative Adaptive Cruise Control on Traffic-Flow Characteristics

The number of trucks and vans in this data set is small (vehicles 94%, vans 4%, and trucks 2%).





todoList:

list head

plot peroid



一队不同车辆组成CACC 车队，每辆车有不同的tau, 加速度、减速度，请问如何计算车间距？

## 实验变量设计

```
python3 $SUMO_HOME/tools/visualization/plotXMLAttributes.py  -i id -x begin -y meanSpeed -o fd.png  --legend e3_1.xml --csv-output e3_1Spped.csv
sed -iE '1s/.*/time,meanSpeed/' e3_1Spped.csv
sed -iE 's/ /,/g' e3_1Spped.csv
rm e3_1Spped.csvE
```

find . -name '[0-9]*fd.png' -exec mv {} fd_plot_by_vsum \;

find . -name 'nohup.out' -exec rm {} \;

## 实验记录

### v 0.1

3个实例，~2小时。车队在中间解体后，导致在末尾回收时触发‘p.x’ not found Exception.

* 改进了回收模式，将错误catch 后直接抛出。

### v 0.2

8个实例，3.5 小时。车流量增加后运行速度显著，笔记本长时间全负荷运转散热降频。

实验结果也不理想，CACC 渗透率增加，各项指标反而下降了，而且发现检测器的排布方式是不严谨的。

* 将sumo 改成 none-gui 模式，并将任务转移到远程轻量服务器上。
* 重新设计了路网、对齐了检测器的排布方式（各为500m）

### v 0.3

4组，16个实例，12 小时+。远程轻量服务器（2核4G）无法满足运算要求，中途停止。

* 购买并配置了按小时计费的腾讯云弹性服务器（16核32G）
* 重新设计了自动化运行和数据收集脚本。

### v 0.4

4组，16个实例，8 小时。实验结果还是不对，和预期不一样。

* 经过各种尝试后发现是车流量分配的算法不对：
  * 增加CACC 主干道渗透率挤压了上匝道的车流分配，改成了按比例计算的模式。
  * 不能固定CACC 车队中大车的比例，否则增加CACC 就是增加了车流中大车的比例。
* 重新编写了分配车流、选择车辆、CACC 组队的相关代码。

### v 0.5

4组，54个实例，28小时。咋一眼看数据终于差不多了，但大小车的分配算法不小心写反了。多元回归统计显示偏差较大。

* 重新编写了自动化运行脚本，添加了自动化数据获取和转换的功能（还在开发中，目前一团乱）
* 正在学习得出的统计指标，探索数据可视化方法。
* 扩充了弹性云的cpu 实例，准备进行下一次更大规模的实验。

第五次实验变量：

```shell
LV=0.2 NV=0 VSUM=2000 MPRS=0 nohup  python3 main.py  & 
LV=0.2 NV=0 VSUM=1500 MPRS=0 nohup  python3 main.py  & 
LV=0.2 NV=0 VSUM=1000 MPRS=0 nohup  python3 main.py  &

LV=0.4 NV=0 VSUM=2000 MPRS=0 nohup  python3 main.py  & 
LV=0.4 NV=0 VSUM=1500 MPRS=0 nohup  python3 main.py  & 
LV=0.4 NV=0 VSUM=1000 MPRS=0 nohup  python3 main.py  &

# 1000
LV=0.2 NV=6 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=6 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=5 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=5 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=4 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=4 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=3 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=3 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &


LV=0.4 NV=6 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=6 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &

LV=0.4 NV=5 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=5 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &

LV=0.4 NV=4 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=4 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &

LV=0.4 NV=3 VSUM=1000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=3 VSUM=1000 MPRS=0.6 nohup  python3 main.py  &

# 1500
LV=0.2 NV=6 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=6 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=5 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=5 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=4 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=4 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=3 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=3 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &


LV=0.4 NV=6 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=6 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &

LV=0.4 NV=5 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=5 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &

LV=0.4 NV=4 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=4 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &

LV=0.4 NV=3 VSUM=1500 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=3 VSUM=1500 MPRS=0.6 nohup  python3 main.py  &
# 2000

LV=0.2 NV=6 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=6 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=5 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=5 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=4 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=4 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &

LV=0.2 NV=3 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.2 NV=3 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &


LV=0.4 NV=6 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=6 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &
LV=0.4 NV=5 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=5 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &
LV=0.4 NV=4 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=4 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &
LV=0.4 NV=3 VSUM=2000 MPRS=0.3 nohup  python3 main.py  &
LV=0.4 NV=3 VSUM=2000 MPRS=0.6 nohup  python3 main.py  &
```

### v 0.6

4组，108个实例，32小时，回归分析后数据还是不对，CACC 渗透率增加居然会使交通流capacity 下降？？

gui 重新模拟显示大流量下 laneChangeMode 和plexe 的traci 信号冲突，导致CACC 车流在入口处碰撞堆积。

* 重新配置了laneChangeMode 的各项参数，使CACC 车队左右超车的比例均衡。
* 修改了车流在merge 时的提前变道行为

```
min(maxSpeed, speedFactor * desiredMaxSpeed,  speedFactor * speedLimit)
```



```shell
LV=0.2 NV=0 VSUM=1800 MPRS=0 nohup  python3 main.py  & 
LV=0.2 NV=0 VSUM=1600 MPRS=0 nohup  python3 main.py  & 
LV=0.2 NV=0 VSUM=1400 MPRS=0 nohup  python3 main.py  &

LV=0.4 NV=0 VSUM=1800 MPRS=0 nohup  python3 main.py  & 
LV=0.4 NV=0 VSUM=1600 MPRS=0 nohup  python3 main.py  & 
LV=0.4 NV=0 VSUM=1400 MPRS=0 nohup  python3 main.py  &

LV=0.6 NV=0 VSUM=1800 MPRS=0 nohup  python3 main.py  & 
LV=0.6 NV=0 VSUM=1600 MPRS=0 nohup  python3 main.py  & 
LV=0.6 NV=0 VSUM=1400 MPRS=0 nohup  python3 main.py  &
```

```shell
MPRS=(0.2 0.4 0.6)
VSUM=(1400 1600 1800)

i=0
core_num = 32

for lv in "${LV[@]}"; do
    for nv in "${NV[@]}"; do
        for mprs in "${MPRS[@]}"; do
            for vsum in "${VSUM[@]}"; do
                echo "$lv $nv $mprs $vsum" &
                LV=$lv NV=$nv VSUM=$vsum MPRS=$mprs nohup python3 main.py &
                ((i++))
                if [ "$i" -eq $core_num ]; then
                    sleep 3
                    i=0
                fi
            done
        done
    done
done
wait
```

```

for pid in $(ps aux | grep -E 'python|sumo' | awk '{print $2}'); do
  sudo renice -n -20 -p $pid
done
```

## v 7.0

```shell
VSUM=(1500 1700 1900)
LV=(0.2 0.4 0.6)
for lv in "${LV[@]}"; do
    for vsum in "${VSUM[@]}"; do
        echo "$lv 0 0 $vsum"
        LV=$lv NV=0 VSUM=$vsum MPRS=0 nohup python3 main.py &
    done
done

```



```shell
  LV=(0.2 0.4 0.6)
  NV=(3 4 5 6)
  MPRS=(0.2 0.4 0.6)
  VSUM=(1500 1700 1900)

  i=0
  core_num=8

  for lv in "${LV[@]}"; do
      for nv in "${NV[@]}"; do
          for mprs in "${MPRS[@]}"; do
              for vsum in "${VSUM[@]}"; do
                  echo "$lv $nv $mprs $vsum"
                  LV=$lv NV=$nv VSUM=$vsum MPRS=$mprs nohup python3 main.py &
                  ((i++))
                  if [ "$i" -eq "$core_num" ]; then
                      sleep 2400
                      i=0
                  fi
              done
          done
      done
  done
  wait
```

```shell
VSUM=(900 1100 1300 1500 1700)
LV=(0.2 0.4 0.6)
for lv in "${LV[@]}"; do
    for vsum in "${VSUM[@]}"; do
        echo "$lv 0 0 $vsum"
        LV=$lv NV=0 VSUM=$vsum MPRS=0 nohup python3 main.py &
    done
done
```

```shell
  LV=(0.2 0.4 0.6)
  NV=(3 4 5 6)
  MPRS=(0.2 0.4 0.6)
  VSUM=(900 1100 1300)

  i=0
  core_num=32

  for lv in "${LV[@]}"; do
      for nv in "${NV[@]}"; do
          for mprs in "${MPRS[@]}"; do
              for vsum in "${VSUM[@]}"; do
                  echo "$lv $nv $mprs $vsum"
                  LV=$lv NV=$nv VSUM=$vsum MPRS=$mprs nohup python3 main.py &
                  ((i++))
                  if [ "$i" -eq "$core_num" ]; then
                      sleep 3600
                      i=0
                  fi
              done
          done
      done
  done
  wait
```



$S_e=\sum_{i=1}^{k}\sum_{j=1}^{n_i}(x_{ij}-\bar{x_i})^2$

其中，$k$ 为样本组数，$n_i$ 为第 $i$ 组样本个数，$x_{ij}$ 为第 $i$ 组中的第 $j$ 个样本值，$\bar{x_i}$ 为第 $i$ 组样本的平均值。



```shell
f=in from=900 to=3000 x=step y=idv_speed core=2 python3 tra.py &
f=out from=900 to=3000 x=step y=idv_speed core=2 python3 tra.py &
f=before from=900 to=3000 x=step y=idv_speed core=2 python3 tra.py &


f=in from=900 to=3000 x=idv_lane_pos y=lane_index core=2 python3 tra.py &
f=out from=900 to=3000 x=idv_lane_pos y=lane_index core=2 python3 tra.py &
f=before from=900 to=3000 x=idv_lane_pos y=lane_index core=2 python3 tra.py &

f=in from=900 to=3000 x=step y=lane_index core=2 python3 tra.py &
f=out from=900 to=3000 x=step y=lane_index core=2 python3 tra.py &
f=before from=900 to=3000 x=step y=lane_index core=2 python3 tra.py &

f=in from=2900 to=3100 x=idv_lane_pos y=idv_speed core=2 python3 tra.py &
f=out from=2900 to=3100 x=idv_lane_pos y=idv_speed core=2 python3 tra.py &
f=before from=2900 to=3100 x=idv_lane_pos y=idv_speed core=2 python3 tra.py &

f=in from=2900 to=3000 x=step y=idv_lane_pos core=4 python3 tra.py &
f=out from=2900 to=3000 x=step y=idv_lane_pos core=4 python3 tra.py &
f=before from=2900 to=3000 x=step y=idv_lane_pos core=4 python3 tra.py &

f=in from=900 to=3500 x=idv_lane_pos y=idv_speed core=4 python3 tra2plot.py &
f=out from=900 to=3500 x=idv_lane_pos y=idv_speed core=4 python3 tra2plot.py &
f=before from=900 to=3500 x=idv_lane_pos y=idv_speed core=4 python3 tra2plot.py &

```









```
len=0 cacc=00 python3  tmp.py &
len=3 cacc=02 python3 tmp.py &
len=4 cacc=02 python3 tmp.py &
len=5 cacc=02 python3 tmp.py &
len=6 cacc=02 python3 tmp.py &

len=3 cacc=04 python3 tmp.py &
len=4 cacc=04 python3 tmp.py &
len=5 cacc=04 python3 tmp.py &
len=6 cacc=04 python3 tmp.py &

len=3 cacc=06 python3 tmp.py &
len=4 cacc=06 python3 tmp.py &
len=5 cacc=06 python3 tmp.py &
len=6 cacc=06 python3 tmp.py &
```



```
xy=idv_lane_pos_lane_index vol=4500  py bio.py
xy=idv_lane_pos_lane_index vol=5500  py bio.py
xy=idv_lane_pos_lane_index vol=6500  py bio.py
xy=idv_lane_pos_lane_index vol=7500  py bio.py
xy=idv_lane_pos_lane_index vol=8500  py bio.py
xy=idv_lane_pos_lane_index vol=9500  py bio.py

```

/usr/share/sumo/tools/traci/connection.py

164

## V8

```
LV=0.2 NV=3 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.2 NV=3 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.2 NV=3 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.2 NV=3 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.2 NV=3 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.2 NV=3 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.2 NV=3 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.2 NV=3 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.2 NV=3 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.2 NV=3 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.2 NV=3 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.2 NV=3 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.2 NV=4 VSUM=1100 MPRS=0.2 python3 main.py &

===
LV=0.2 NV=3 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.2 NV=4 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.2 NV=4 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.2 NV=3 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.2 NV=4 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.2 NV=4 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.2 NV=4 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.2 NV=5 VSUM=1300 MPRS=0.2 python3 main.py &
===


LV=0.2 NV=5 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.2 NV=4 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.2 NV=3 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.2 NV=4 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.2 NV=5 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.2 NV=4 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.2 NV=4 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.2 NV=4 VSUM=900 MPRS=0.4 python3 main.py &


LV=0.2 NV=4 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.2 NV=5 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.2 NV=5 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.2 NV=4 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.2 NV=5 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.2 NV=5 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.2 NV=4 VSUM=900 MPRS=0.6 python3 main.py &





LV=0.4 NV=3 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.2 NV=5 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.2 NV=6 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.2 NV=5 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.2 NV=6 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.2 NV=6 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.2 NV=5 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.2 NV=6 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.2 NV=5 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.2 NV=6 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.2 NV=4 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.4 NV=3 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.2 NV=6 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.2 NV=6 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.4 NV=3 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.4 NV=3 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.4 NV=3 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.4 NV=5 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.4 NV=3 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.4 NV=3 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.4 NV=3 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.4 NV=3 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.2 NV=6 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.4 NV=4 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.4 NV=4 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.2 NV=6 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.2 NV=5 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.2 NV=6 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.4 NV=4 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.4 NV=5 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.2 NV=6 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.2 NV=6 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.4 NV=5 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.4 NV=5 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.4 NV=5 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.6 NV=4 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.2 NV=6 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.4 NV=5 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.4 NV=5 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.4 NV=5 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.4 NV=6 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.4 NV=6 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.4 NV=6 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.4 NV=6 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.4 NV=6 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.4 NV=6 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.4 NV=6 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.4 NV=6 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.4 NV=6 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.4 NV=6 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.4 NV=3 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.6 NV=3 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.6 NV=3 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.2 NV=6 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.6 NV=3 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.6 NV=3 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.6 NV=3 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.4 NV=5 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.6 NV=3 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.4 NV=3 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.4 NV=5 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.6 NV=3 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.6 NV=4 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.4 NV=5 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.6 NV=4 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.4 NV=5 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.4 NV=5 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.6 NV=4 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.6 NV=4 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.4 NV=3 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.2 NV=5 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.4 NV=6 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.6 NV=4 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.6 NV=5 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.6 NV=5 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.6 NV=5 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.6 NV=5 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.6 NV=5 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.4 NV=6 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.6 NV=5 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.6 NV=5 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.4 NV=6 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.6 NV=5 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.4 NV=6 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.6 NV=5 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.6 NV=6 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.6 NV=3 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.6 NV=6 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.6 NV=6 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.4 NV=4 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.6 NV=6 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.6 NV=6 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.6 NV=6 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.6 NV=6 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.6 NV=6 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.4 NV=5 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.6 NV=6 VSUM=1700 MPRS=0.6 python3 main.py &
LV=0.6 NV=3 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.6 NV=4 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.6 NV=4 VSUM=1300 MPRS=0.2 python3 main.py &
LV=0.6 NV=4 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.4 NV=5 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.6 NV=4 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.6 NV=4 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.6 NV=4 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.2 NV=6 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.4 NV=4 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.4 NV=3 VSUM=900 MPRS=0.2 python3 main.py &
LV=0.6 NV=5 VSUM=1300 MPRS=0.6 python3 main.py &
LV=0.4 NV=4 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.6 NV=6 VSUM=1500 MPRS=0.2 python3 main.py &
LV=0.6 NV=6 VSUM=900 MPRS=0.4 python3 main.py &
LV=0.6 NV=3 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.6 NV=6 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.6 NV=3 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.6 NV=3 VSUM=1700 MPRS=0.4 python3 main.py &
LV=0.2 NV=5 VSUM=1300 MPRS=0.4 python3 main.py &
LV=0.6 NV=4 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.6 NV=4 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.4 NV=6 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.6 NV=5 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.6 NV=5 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.6 NV=6 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.6 NV=6 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.6 NV=6 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.6 NV=3 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.6 NV=4 VSUM=900 MPRS=0.6 python3 main.py &
LV=0.6 NV=5 VSUM=1700 MPRS=0.2 python3 main.py &
LV=0.6 NV=5 VSUM=1500 MPRS=0.6 python3 main.py &
LV=0.4 NV=3 VSUM=1100 MPRS=0.4 python3 main.py &
LV=0.6 NV=3 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.6 NV=5 VSUM=1500 MPRS=0.4 python3 main.py &
LV=0.4 NV=3 VSUM=1100 MPRS=0.6 python3 main.py &
LV=0.6 NV=3 VSUM=1100 MPRS=0.2 python3 main.py &
LV=0.4 NV=4 VSUM=1100 MPRS=0.2 python3 main.py &

```



## Simulation results

The expectation that a low-penetration rate of CACC ( < 40%) does not have an effect on traffic flow throughput is correct.[1]

然而，我们发现

具体来说，在流量 1300~1500 vehicles/lane/hour 时，







7500 00 

[1] Van Arem B, Van Driel C J G, Visser R. The impact of cooperative adaptive cruise control on traffic-flow characteristics[J]. IEEE Transactions on intelligent transportation systems, 2006, 7(4): 429-436.



## CC model

```cpp
// MSCFModel_CC.cpp
double
MSCFModel_CC::interactionGap(const MSVehicle* const veh, double vL) const {

    CC_VehicleVariables* vars = (CC_VehicleVariables*)veh->getCarFollowVariables();
    if (vars->activeController != Plexe::DRIVER) {
        //maximum radar range is CC is enabled
        return 250;
    } else {
        return myHumanDriver->interactionGap(veh, vL);
    }

}


void
MSAbstractLaneChangeModel::setOrigLeaderGaps(const MSLeaderDistanceInfo& vehicles) {
    int rightmost;
    int leftmost;
    vehicles.getSubLanes(&myVehicle, 0, rightmost, leftmost);
    for (int i = rightmost; i <= leftmost; ++i) {
        CLeaderDist vehDist = vehicles[i];
        if (vehDist.first != 0) {
            const MSVehicle* leader = vehDist.first;
            const MSVehicle* follower = &myVehicle;
            const double netGap = vehDist.second + follower->getVehicleType().getMinGap();
            if (netGap < myLastOrigLeaderGap && netGap >= 0) {
                myLastOrigLeaderGap = netGap;
                myLastOrigLeaderSecureGap = follower->getCarFollowModel().getSecureGap(follower, leader, follower->getSpeed(), leader->getSpeed(), leader->getCarFollowModel().getMaxDecel());
                myLastOrigLeaderSpeed = leader->getSpeed();
            }
        }
    }
}



myLookaheadLeft(v.getVehicleType().getParameter().getLCParam(SUMO_ATTR_LCA_LOOKAHEADLEFT, 2.0)),


// MSCFModel_EIDM.cpp
double
MSCFModel_EIDM::interactionGap(const MSVehicle* const veh, double vL) const {
    const double acc = myAccel * (1. - pow(veh->getSpeed() / veh->getLane()->getVehicleMaxSpeed(veh), myDelta));
    const double vNext = veh->getSpeed() + acc;
    const double gap = (vNext - vL) * (veh->getSpeed() + vL) / (2 * myDecel) + vL;
    return MAX2(gap, SPEED2DIST(vNext));
}


// MSCFModel_CC.cpp
void
MSCFModel_CC::performAutoLaneChange(MSVehicle* const veh) const {
    bool canChange;
    CC_VehicleVariables* vars = (CC_VehicleVariables*) veh->getCarFollowVariables();
    // check for left lane change
    std::pair<int, int> state = libsumo::Vehicle::getLaneChangeState(veh->getID(), +1);
    int traciState = state.first;
    if (traciState & LCA_LEFT && traciState & LCA_SPEEDGAIN) {
        // we can gain by moving left. check that all vehicles can move left
        if (!(state.first & LCA_BLOCKED)) {
            // leader is not blocked. check all the members
            canChange = true;
            for (auto m = vars->members.begin(); m != vars->members.end(); m++) {
                const std::pair<int, int> mState = libsumo::Vehicle::getLaneChangeState(m->second, +1);
                if (mState.first & LCA_BLOCKED) {
                    canChange = false;
                    break;
                }
            }
    ……
```





```
A fundamental diagram represents the relationship between traffic flow (Q), traffic density (K), and traffic speed (V). In heterogeneous traffic flow, there are different types of vehicles with different characteristics, which can affect the fundamental diagram.
```

## NGSIM 

Mean and std of v_Length for each v_Class:

mean        std   max   min

v_Class

2        14.970102   1.913958  26.6   7.0
3        42.089575  16.660762  77.7  21.2



## Highway traffic data: macroscopic, microscopic and criticality analysis for capturing relevant traffic scenarios and traffic modeling based on the highD data set



The two prominent peaks are around v ≈ 90 km/h and v ≈ 120 km/h.



# Highway traffic data: macroscopic, microscopic and criticality analysis for capturing relevant traffic scenarios and traffic modeling based on the highD data set



## Stability Analysis of Mixed Traffic Flow Considering Personal Space under the Connected and Automated Environment

Trucks and cars differ in their vehicle dynamics and driver characteristics, resulting in different car-following characteristics. 

Distinguishing these differences is very important for applications such as the traffic simulation

 Compared with cars, trucks have distinct physical attributes (e.g., size) and operational properties (e.g., maximum acceleration /deceleration) (Pokulwar and Dabhekar , Durrani, Lee et al. 2014), and different drivers’ behavior characteristics (e.g., aggressiveness, perception-reaction time), leading to various traffic performance (Kong, Sun et al. 2021).

Aghabayk concluded that the DHW kept by heavy vehicles is greater than that kept by passenger cars【1】



【1】**Exploring heavy vehicles car-following behaviour**

a comprehensive comparison between heavy vehicles and passenger cars is presented. Freeways are designed to facilitate the flow of traffic including passenger cars and trucks.

average time head way 2m

## Unravelling effects of cooperative adaptive cruise control deactivation on traffic fl

Secondly, the accelerations from ACC/CACC models are limited to a range from −4m/s2 to 2m/s2. This assumption is made according to the internal acceleration limitations posed on production ACC vehicles (Milanes and Shladover, 2014).

## HighD dataset

total number: 80443
Percentage of Car: 85.28%
Percentage of Truck: 14.72%

Width

|       | mean      | std      | min  | max  |
| ----- | --------- | -------- | ---- | ---- |
| Car   | 4.763088  | 0.533723 | 3.54 | 6.97 |
| Truck | 15.413976 | 3.901993 | 5.81 | 19.4 |

minTHW

|       | mean     | std      | min  | max  |
| ----- | -------- | -------- | ---- | ---- |
| Car   | 1.495365 | 1.060139 | 0.1  | 5.6  |
| Truck | 2.129403 | 1.24868  | 0.1  | 5.6  |

meanSpeed

|       | mean      | std      | min  | max   |
| ----- | --------- | -------- | ---- | ----- |
| Car   | 31.195525 | 3.935843 | 21.6 | 38.59 |
| Truck | 24.465623 | 1.802198 | 21.6 | 38.59 |



maxSpeed

|       | mean      | std      | min  | max  |
| ----- | --------- | -------- | ---- | ---- |
| Car   | 32.592209 | 4.039268 | 22.5 | 40.3 |
| Truck | 25.401079 | 1.945883 | 22.5 | 39.6 |

minSpeed

|       | mean      | std      | min  | max   |
| ----- | --------- | -------- | ---- | ----- |
| Car   | 29.958881 | 3.880064 | 20.6 | 37.3  |
| Truck | 23.671613 | 1.767034 | 20.6 | 37.12 |



Number of IDs: 1047
Number of rows with class 'Car': 863

lenth 414 

## 优先值

```
#!/bin/bash

# Set the priority you want for Python and SUMO processes
priority=-10

# Find all Python processes and increase their priority
for pid in $(pgrep -f python3)
do
    echo "Adjusting priority for Python process $pid"
    sudo renice $priority $pid
done

# Find all SUMO processes and increase their priority
for pid in $(pgrep -f sumo)
do
    echo "Adjusting priority for SUMO process $pid"
    sudo renice $priority $pid
done

```





810 man

1049快



## 投稿

Highlights should be submitted in a separate editable file in the online submission system. Please use 'Highlights' in the file name and include 3 to 5 bullet points (maximum 85 characters, including spaces, per bullet point).







## 标题

本文的创新点关键词主要是 Heterogeneous CACC Platoons 



1. 小论文还没改好😔，不过我已经做完了 quantification 的部分了，虽然效果也不是最好，但是不打算再拖下去了。请再给我1.5 天的时间。
2. 科技局项目我已经加到企业负责人微信了，周一和他联系对接。


$$
Oscillation\ level = 
$$

| Coefficient | Standard Error | t-statistic | P>|t| | [0.025 | 0.975] |
|-------------|----------------|-------------|------|-------|--------|
| const | 752.3823 | 8.974 | 0.000 | 587.000 | 917.765 |
| volume | 0.0011 | 23.605 | 0.000 | 0.001 | 0.001 |
| cacc_mpr | 3.0740 | 8.213 | 0.000 | 2.336 | 3.812 |
| cacc_size | 0.0578 | 0.000 | 0.000 | 0.000 | 0.000 |
| truck_ratio | -3.2465 | -8.223 | 0.000 | -4.025 | -2.468 |
