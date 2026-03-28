

# SUMO’s Lane-Changing Model

```txt
by Jakob Erdmann
from SUMO2014. Berlin: Deutsches Zentrum für Luft- und Raumfahrt e.V., 2014
```

## Abstract

多车道道路上的变道行为。本文描述了一种使用4层 motivations 来确定车辆的新模型，改善当前的换道模型。

## Intro

道路车辆的微观驾驶动力学是由以下几个模型的相互作用决定：

- 跟驰模型：根据前车的行为决定自身的速度。
- 交叉口通行模型：从通行权规则、间隙接受、避免路口堵塞等方面确定车辆在不同类型交叉口的行为。
- 换道模型：决定在多车道道路的车道选择和换道时的速度调整。

SUMO 在2013年的大量改进 ->有必要报告模型的当前状态。在一些模拟场景中，这些变化是problems and visibly implausible (不可信) behavior 引发的。

* 高速公路交通需要许多车辆在高速公路分叉处改变车道，引起堵车，与A92 情况相反。

- 高速公路交通因车辆在入口匝道汇合而停止的严重拥堵 (*Braunschweig* scenario).
- 堵塞是因为车辆没有及时改变到各自的转弯车道，从而阻塞了车流 (*Braunschweig* scenario). 
- 由于车辆仅使用双车道环形交叉路口的外侧车道而造成干扰(*ACOSTA* scenario)

新的变道模型 two main purposes: 

1. It computes the change decision of a vehicle for a single simulation step based on the route of the vehicle and the current and historical traffic conditions in the vehicles surroundings. 
2.  it computes changes in the velocity for the vehicle itself and for obstructing vehicles which promote the successful execution of the desired lane change maneuver.

明确了四种 motivations for lane-changing:

1) Strategic change
2) Cooperative change
3) Tactical change
4) Regulatory change

##  **Architecture**

SUMO 中的路网是 in terms of edges 的，从 0 开始从右到左进行索引

车辆的速度主要取决于它前面的下一辆车（leader）

ego vehicle 触发变道的条件：there is enough physical space on the target lane and if it neither comes to too close to the leader on the target lane nor to its immediate follower on the target lane 

如果条件不满足，就是有 blocking leader or a blocking follower.

在每个steps 中，按顺序为每辆车执行以下子步骤：

1) Computation of preferred successor lanes (called bestLanes)
2) Computation of safe velocities under the assumption of staying on the current lane
   and integration with lane-changing related speed requests from the previous
   simulation step
3) Lane-changing model computes change request (left, right, stay)
4) Either execute lane-changing maneuver or compute speed request for the next simulation step (involves planning ahead for multiple steps). 

是否请求变速取决于变道请求的紧急程度。

3 和 4 由 laneChangingModel 处理

## Strategic lanechanging

定义：must change its lane in order to be able to reach the next edge on its route（当前车道与路线的下一个边缘没有连接，dead-end）

例如，从想要直行的车辆，左转车道是dead-end

### **Evaluating subsequent lanes**

在 SUMO 中计算了一个数据结构，允许检索后续计算所需的以下信息：

1. For every lane on the current edge, a sequence of lanes that can be followed without lane changing up to the next dead-end or to a maximum distance (bestLanes).
2. For every lane on the current edge, the traffic density along the bestLanes (occupation)
3. For every lane on the current edge, the offset in lane index to the lane which is strategically advisable (bestLaneOffset) 车道索引到战略上可取的车道的偏移量

![akjhfcaksjdhc](file:///Users/kounarushi/mycode/web-blog/public/.pic/akjhfcaksjdhc.jpg)

### **Determining urgency**

遵循strategic 的紧迫性 (i.e. changing to the left if bestLaneOffset < 0 and changing right if bestLaneOffset > 0) correlates with the following factors:

a) 到死胡同的剩余距离（负相关）
b) 接近死车道尽头时的假定速度 (lookAheadSpeed)
c) bestLaneOffset 的大小
d) 占用最终目标车道（bestLaneOffset = 0 的车道）
e) 占用中间目标车道（下一个目标方向最佳车道偏移量）

### Speed adjustment to support lane-changing

假设车辆以最大安全速度行驶，因此速度只能向下调整，为了计算理想的速度调整，通过比较ego vehicle 的计划速度、阻塞速度、间隙和剩余秒数来区分以下情况层次结构：

**(1) Leader is blocking**

1. **able to overtake leader:** request leader to refrain from speeding up, prevent

   ego dawdling, (prevent overtaking on the right where forbidden by law)

2. **unable to overtake leader
    i.** slow down to stay behind the leader

   **ii.** keep speed since the leader is faster anyway

**(2) Leader is not blocking:** set a maximum speed to ensure that the distance to the

leader remains sufficiently high
 **(3) There is no leader:** drive with the maximum safe speed

超车的必要条件list：

1. The ego vehicle is faster than the blocker (*dv = plannedSpeed - blocker speed > 0*). The plannedSpeed incorporates speed requests by surrounding vehicles.
2. The blocking vehicle is to the left of ego or overtaking on the right is allowed (in urban situations, on congested motorways or if the simulation option *–lanechange.overtake- right* is set)
3. The remaining space to the end of the dead lane is sufficient for overtaking
4. The time remainingSeconds is sufficient to overtake the leader at the current speed

difference *dv*

![376416398739hkh](file:///Users/kounarushi/mycode/web-blog/public/.pic/376416398739hkh.jpg)

### **Preventing deadlock**

![udysgfsdkhflkh](file:///Users/kounarushi/mycode/web-blog/public/.pic/udysgfsdkhflkh.jpg)

SUMO 中的车辆不能倒退！

靠近deadlock 的车称为block leader，另一辆车称为block follwer。

通常，block follwer 在接近死胡同时会减速，以确保block leader 有足够的空间完成变道。

目前，需要向右变道多于一条车道的车辆预留20m的额外空间，为需要向左变道多于一条车道的车辆预留40m的空间。

## **Cooperativelane-changing**

帮助他人变道，以便为被阻挡的车辆腾出空隙。



## **Tacticallane-changing**

避免前车慢的现象，需要平衡变道带来的预期速度增益与变道的努力。

![asdhgsakh](file:///Users/kounarushi/mycode/web-blog/public/.pic/asdhgsakh.jpg)

## Regulatory lane-changing

在右舵区，司机有义务在不使用该车道进行超车操作时清除该车道（超完车还得变回去）。

## **Ahierarchyoflane-changingmotivations**

The four motivations discussed above are considered in a hierarchical fashion as described by the following decision schema：

1. **Urgent strategic change to** **d** **needed:** change (strategic)

2. **Change to** **d** **would create an urgent situation:** stay (strategic)

3. **Vehicle is a blocking follower for another vehicle with urgent strategic change**

   **request:** change (cooperative)

4. **speedGainProbability above threshold and its sign matches** **d****:** change (tactical)

5. **keepRightProbability above threshold and** **d = -1**： change (regulatory)

6. **non-urgent strategic change to** **d** **needed:** change (strategic)

