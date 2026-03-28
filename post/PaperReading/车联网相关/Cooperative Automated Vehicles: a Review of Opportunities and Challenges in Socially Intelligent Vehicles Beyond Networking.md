# Cooperative Automated Vehicles: a Review of Opportunities and Challenges in Socially Intelligent Vehicles Beyond Networking

```shell
by Loke S W. 
from IEEE Transactions on Intelligent Vehicles, 2019, 4(4): 509-518.
```

## Abstract

~~我们研究了自动驾驶车辆合作的必要性（在社会-网络-物理环境中互动），包括合作将解决的问题，以及议题和挑战。~~

本文旨在概述 CAV 中的合作层，突出合作 CAV 的潜在应用和问题，借鉴相关工作。 我们首先描述了可以进行合作的一系列场景以及潜在的好处，然后概述了启用 CAV 社交大脑 (social brain)的挑战。

## Intro

Connected automated vehicles (**CAVs**)，forming the so called **Internet of Vehicles** 

**Cooperative Intelligent Transport Systems** (e.g., cooperative driving) is an active area of research

over Dedicated **Short Range Networking (DSRC) or 5G-V2X networking**

* The Society of Automotive Engineers (**SAE**) released a **message set dictionary** for **standardizing messages exchanged** in DSRC communications, such as intersection collision warnings, emergency vehicle alerts and vehicle status
  information can be shared.
* The European Telecommunication Standard Institute (**ETSI**) provided the EN 302 637-2 standard which defined Cooperative Awareness Messages (CAMs).

Riener 和 Ferscha [7] 提出了车辆具有可以协商、合作和协作的社交能力的概念 (social brain)

* 社交大脑可以针对不同的道路情况实施多种合作协议，例如，交叉路口碰撞警告协议、环形交叉路口移动协议、合并交通协议、在道路上编队行驶协议 高速公路、超车协议、汽车在十字路口让路的协议等等。

## types of cooperation

We consider below two types of cooperation: 1. vehicle-to-vehicle 2.vehicle-to-pedestrian.

### *A. Vehicle-to-Vehicle Cooperation and Reasoning*

* Parking：the use of inter-vehicle cooperation in finding parking spaces

  * ```txt
    Evangelia Kokolaki, Merkouris Karaliopoulos, and Ioannis Stavrakakis. 
    Opportunistically assisted parking service discovery: Now it helps, now it does not. Pervasive Mob. Comput., 8(2):210–227, April 2012.
    ```

    分析车辆通过收集和共享停车信息 v.s 集中管理 寻找停车位的性能：

    1. there is no optimal solution for all situations 
    2. the benefit of sharing information can overweight the increased vehicle competition that it may cause

  * ```txt
    G. Tasseron, K. Martens, and R. van der Heijden. 
    The potential impact of vehicle-to-vehicle communication on on-street parking under
    heterogeneous conditions. IEEE Intelligent Transportation Systems
    Magazine, 8(2):33–42, Summer 2016.
    ```

    在车辆之间传播停车信息几乎不会减少搜索时间，甚至偶尔会增加搜索时间

  * ```txt
    A. Aliedani, S. W. Loke, A. Desai, and P. Desai. 
    Investigating vehicleto-vehicle communication for cooperative car parking: The copark
    approach. In 2016 IEEE International Smart Cities Conference (ISC2), pages 1–8, Sept 2016.
    ```

    a **decentralised** car parking allocation mechanism：

    1. 在停车场门口提供有关可用停车位的初始信息支持车辆

    2. 使用车辆合作共享停车位置的意图并协商解决竞争

* Routing：vehicles coordinating their routes, can distribute themselves along faster, even if longer, routes

  * ```txt
    Prajakta Desai, Seng Wai Loke, Aniruddha Desai, and Jugdutt Singh.
    CARAVAN: congestion avoidance and route allocation using virtual
    agent negotiation. IEEE Trans. Intelligent Transportation Systems,
    14(3):1197–1207, 2013
    ```

    车辆 opportunistically cooperating, DSRC v2v 通信，在不同的十字路口，可以缓解大面积的交通拥堵；

    与所有只走最短距离的路线相比，车辆可以更快地到达目的地 30%。

  #### Swarm Behaviours for Dynamic Traffic Flows

  ![kfhdskjhc](file:///Users/kounarushi/mycode/web-blog/public/.pic/kfhdskjhc.jpg)

  * 无信号路口导航

  * 形成灵活的集体车辆行为

    * ```txt
      Andreas Riener and Alois Ferscha. Enhancing Future Mass ICT with
      Social Capabilities, pages 141–184. Springer Berlin Heidelberg, Berlin,
      Heidelberg, 2013
      ```

      "traffic shaping" 

    * ```
      Emergency vehicle lane pre-clearing: From microscopic cooperation to routing decision making
      ```

      emergency vehicle (**EV**) passing through: 紧急车辆让路，描述为混合整数非线性规划 (MINP) 问题，旨在

       (i) 保证 EV 的所需速度，以及 (ii) 最小化对connected vehicles, CV 的干扰。

  #### Platooning, Intersections and Safety

  Vehicles can **opportunistically platoon** to improve travel times, road usage, and safely

  当车辆在信号交叉口一起移动时，车辆之间通过车对车通信进行合作，减少车辆间距，可以产生更好的结果——减少不必要的速度波动和不必要的停车。

  

  ```
  A. Aliedani and S. W. Loke. Cooperative autonomous vehicles: An
  investigation of the drop-off problem. IEEE Transactions on Intelligent
  Vehicles, 3(3):310–316, Sept 2018.
  ```

  对于自动驾驶汽车，不仅仅是停车，其行为的一个主要方面是让乘客下车。自动驾驶车辆也可以形成队列并调整彼此的相对速度，以便有效地让乘客下车。

  

  #### Cooperative Awareness

  在自动驾驶上的增强态势感知，提高每辆车的环境意识。

  

  #### Long Term Cooperation - Social Networks and Social Memory

  例如，汽车在不同时间轮流让路或推迟停车位，社交记忆为未来的 v2v 通信提供了上下文，从而提高了表达意图的效率。

  

  #### Cooperation with Different Types of Vehicles

  无人机与车辆的结合使用，救灾，死角。

  轮椅与自动驾驶车辆集成，从而可以构建门到门运输的集成系统（协调在何处下车和接送）

#### 总结

![1623747329fghsdjjvc](file:///Users/kounarushi/mycode/web-blog/public/.pic/1623747329fghsdjjvc.jpg)

### *B. Vehicle-to-Pedestrian Cooperation*

专用短程通信（Dedicated Short Range Communications）手机的智能手机提供了车辆到行人框架

## Challenges

#### *A. Scales of Cooperation* (怎样处理异质交通对象/没有联网的车)

Cooperation among vehicles has been formulated as a constrained optimal control problem. 受约束的最优控制问题

exact knowledge of requirements might be difficult to obtain in real-time

```txt
J. Rios-Torres and A. A. Malikopoulos. A survey on the coordination
of connected and automated vehicles at intersections and merging at
highway on-ramps. IEEE Transactions on Intelligent Transportation
Systems, 18(5):1066–1077, May 2017.
```

: 一个问题是，为了“开始实现潜在收益”，联网车辆的**最低数量**是多少？如何与其他未配备车辆共存？

#### B. Trusted Communications and Deception-Proofing

车辆可以形成联盟，从而阻止非联盟车辆利用车辆合作，还需要对恶意联盟行为具有稳健性。

可以从不同位置的不同基础设施 (RSU) 接收信息。

#### *C. Standards: Cooperation Protocols and Behaviour*

消息传输的标准化？是否应该标准化 CAV 的响应方式，而不仅仅是消息？

#### *D. How Should Vehicles Talk to Each Other and with the Infrastructure?*

when and why? is there a standard?

#### *E. Context-Aware Decision-Making and Regulations*

识别特定区域

#### *F Lawful Interactions*

