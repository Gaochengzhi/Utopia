# Integrated Decision and Control: Toward <u>Interpretable</u> and <u>Computationally Efficient</u> Driving Intelligence

## Abstract

* #### **Backgroud**

	Current mainstream methods suffers **high time complexity** or **poor interpretability and adaptability** on real-world autonomous driving tasks.

* #### **Our contribution**

	**integrated decision and control (IDC)** :a **interpretable and computationally efficient framework**

* #### How: 

	decompose into 2 parts: [ SPP: **static path planning** ] + [ DOT: **dynamic optimal tracking** ]

	* SPP only considers **static traffic elements** -> generates candidate paths (each formulated with a **constrained optimal control problem (OCP)**),  
	
	* DOT track the optimal path while considering the dynamic obstacles (each candidate path is optimize **separately** )
	
	* model-based RL algorithm served as an **approximate-constrained OCP solver** to **ease computation burden**
	  * 具体来说，将所有路径的 OCP 一起考虑以构建一个完整的 RL 问题，然后以价值网络和策略网络的形式离线求解，分别用于实时在线路径选择和跟踪。
	
* ### result

	结果表明，与基线方法相比，IDC 具有一个数量级的在线计算效率，以及更好的驾驶性能，包括交通效率和安全性。此外，它在不同的驾驶场景和任务之间产生了很好的可解释性和适应性。

## Introduction

### 研究技术回顾

two **technical routes** for the **decision and control** of automated vehicles: 

1) decomposed scheme

   **splits** into several serial **submodules**:  

   * scene understanding
   * prediction
     * behavior selection (finite-state machine, decision tree ), 
     * trajectory planning 
       * **optimization-based** -> high computational complexity
       * search-based -> low-resolution & barely consider dynamic obstacles.
     * Xin's  *Enable faster and smoother spatio-temporal trajectory planning for autonomous vehicles in constrained dynamic environ- ment* **combined** them together -> requires a large amount of human design & cannot guarantee real-time performance
   * control

2) end-to-end scheme.

   直接从感知模块给出的输入计算预期指令，不依赖于标记数据。

   有限的安全性能和较差的学习效率，主要用于特定任务，其中需要一组复杂的奖励函数来为策略优化提供指导，例如前往目的地的距离、与其他道路使用者或场景对象的碰撞以及维护舒适性和稳定性，同时避免极端加速、制动或转向。

### This article：

proposes an **integrated decision and control (IDC) framework** for automated vehicles, which has **great interpretability** and **online computing efficiency** and is applicable in different driving scenarios and tasks

3 parts of contributions:

1. ​	**IDC framework**: 
   * 高级静态路径规划：仅考虑静态约束（例如道路拓扑和交通信号灯）生成多条路径。
   * 低级动态最优跟踪：选择最优路径并考虑动态障碍物对其进行跟踪，其中针对每个候选路径构建和优化有限视域约束最优控制问题（OCP）
   * 优势：
     * 高效计算：because it unloads the heavy online optimizations of the constrained OCPs in offline using RL
     * 可解释：because the value and policy NNs **are the approximation for the optimal cost and action** of the constrained OCP
     * One more thing: the formulated OCP in the IDC is **task independent** with tracking objective and safety constraints, making it applicable among a variety of scenarios and tasks.
2. **model-based RL algorithm: generalized exterior point method (GEP)**
   * 它首先构造一个涉及所有候选路径的广泛问题，并将其转换为一个不受约束的问题，并对安全违规进行惩罚。然后，通过交替执行梯度下降和扩大惩罚来获得近似可行的最优控制策略。
   * GEP 可以明确地处理具有大规模状态约束的问题，并在模型的指导下有效地更新 NN。
3. verify in simulations and real-world road: online computing efficiency, safety, task adaptation

## Intergrated and Decision and Control Framwork

* upper layer only consider the static problems: traffic light etc & not include time information, generating serveral candidate path
* considers the candidate paths and the dynamic information, a constrained OCP is formulated and optimized for **each candidate path** to choose the optimal path and find the control command. 我们方法的核心是用 RL 离线训练的两个 NN 的前馈来代替所有昂贵的在线优化。







## terminology

### 什么是离线优化、在线优化、增量优化？

离线常用优化器 https://zhuanlan.zhihu.com/p/360258616

### Interior-point method

https://zhuanlan.zhihu.com/p/34426575

处理带约束优化问题
