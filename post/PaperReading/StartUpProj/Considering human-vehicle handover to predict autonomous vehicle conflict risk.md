# Considering human-vehicle handover to predict autonomous vehicle conflict risk: A deep learning method for radar-video integrated data

## **Abstract**

* 使用**交通流特征**的**实时冲突**预测模型（之间的关系）
* 使用HighD 数据集（经验数据），使用虚拟检测器方法进行 1. 交通特征提取 2. 两步框架 -> 轨迹数据分析的新方法。
  * 对具有均值和方差异质性的随机参数 logit 模型的探索性研究
  * 几种机器学习方法（eXtreme Gradient Boosting (Boosting)、Random Forest (Bagging)、Support Vector Machine (Single-classifier)和多层感知器）的比较研究

* 结论：
  * 交通流特征对冲突发生概率有显着影响。
  * 考虑**[平均异质性](# 异质性 Heterogeneity )**的统计模型优于对应变量，车道[差异变量](https://www.jianshu.com/p/67be9b3806cd)对【车道变量+车道差异变量】的随机参数均值有显着影响。
  * 在欠采样数据集上训练的 [eXtreme Gradient Boosting](https://github.com/dmlc/xgboost) 是[最佳模型]()：[AUC](https://zhuanlan.zhihu.com/p/58587448) 0.871，精度 0.867
    * 模型对冲突阈值敏感 -> 冲突风险预测应同时考虑主体车道特征和车道差异特征

## Introduction

### conflict-prone modols are preferred

* ~~previews studies: based on **crash data**, aiming at **estimating crash risk**~~

* ~~**real-time traffic flow characteristics** - ( **effective** ) -> in real-time crash risk prediction~~

* ~~limitations in real-time crash risk prediction:~~ 

  * ~~crash data **error** ( inaccurate time, long collection time, temporal or spatial instability of accident data -> limited transferability)~~
  * ~~**not enough** historical crashes alongwith traffic flow data~~

* ~~more general objective: **crash-prone and conflict-prone**~~
* ~~Conflict modelingis are more **proactive**: don't need crash data and requires shorter data collecting time~~

### real-time conflict-based study been neglected and need to be paid attention

* use microscopic kinematics reaction instead of **traffic flow features** 
* known little about the **conflict mechanism and inherent heterogeneity** from a traffic flow perspective

### aim:

1. #### conflicts - ( bridge ) - dynamic traffic flow characteristics  

2. #### traditional crash risk prediction - ( extend ) -> conflict-based

### objectives: 从宏观交通特征的角度理解冲突机制，以及开发具有高预测性能 和 现实就业适用性的冲突风险模型

### 贡献：

1. 提出了一种利用虚拟检测器方法提取交通 流数据的新方法，并提出了一种用于轨迹数据分析的两步框架; 
2. 通过探索它们之间的关联，将交通流 和微观冲突联系起来，同时考虑未观察到的异质性; 
3. 总结了机器学习方法、不平衡学习技术以及冲突阈 值和交通特征选择的敏感性分析的经验教训，以供未来研究。

## Literature review

### Real-time crash risk prediction

* resl-time risk studies is very diffrent from traditional crash prediction analysis
  * real-timecrash risk study is a **[disaggregate](# disaggregate and aggregate data) safety stud**y, which **considers each crash as an observation** and **focuses on conditions where a crash is more likely to occur.** (安全关键事件附近的空间和时间上的动态交通特征)
  * Traditional crash frequency analysis, **typical aggregate study**, which aims at **identifying a specific region where more crashes are likely to occur**( 通过泊松、负二项式、泊松-正态等变量数据模型来估计碰撞频率 )

### Common analytic framework in real-time crash analysis

#### five critical steps:

1. 基于现有知识提出交通参数的描述性统计，定义**交通特征聚合**（traffic feature aggregation）的时间窗口
2. 基于历史碰撞数据和交通数据，构建包含**碰撞观测**和**正常观测**的初步数据集
3. 按照指定的碰撞案例和正常案例的比例对初步数据集进行重新采样
4. 考虑二元分类问题并开发模型（分类器）以识别具有高碰撞可能性的交通状况
5. 结合实际应用，通过多指标评估模型性能

#### two methods: machine learning models are better than statistical models  

* need of the consideration of heterogeneity
* ML are superior in **capturing the high-dimensional and non-linear relationship** between input features and outcomes
* ML - ( black-box issue ) -> ,**weak inferential ability** and cannot obtain a thorough understanding of the mechanism of crashes or conflicts 

#### 两步走的框架工作:

1. 统计模型来确认交通流量和冲突发生的关联，并了解相应的冲突机制
2. 机器学习方法来实时预测冲突风险

### Real-time conflict-based studies





## terminology

* ### 异质性 Heterogeneity

  * 一个变量X对另一个变量Y的影响可能因个体而异: 多上一年学让张三的收入增加了1000元，让李四的收入增加了1200元，那么教育年限对收入的影响就存在异质性；

* ### 异方差：Heteroskedasticity

  * 在变量X的不同水平上，变量Y取值的波动大小可能不同。例：所有小学毕业的人，有的做了老板年入百万，有的成为工薪阶层年入几万——在六年教育水平上，收入取值的波动很大。所有大学毕业的人，都能找到不错的工作，收入多的年赚百万，收入低的也有几十万——在十六年的教育水平上，收入取值的波动较小。

* ### disaggregate and aggregate data

  ![Aggregated-data-vs.disaggregated-data-toladata-1024x1024](file:///Users/kounarushi/mycode/web-blog/public/.pic/untitled.jpg)
