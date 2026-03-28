# Using traffic flow characteristics to predict real-time conflict risk: A novel method for trajectory data analysis

## Abstraction

* 使用**交通流特征**的**实时冲突**预测模型（之间的关系）
* 使用HighD 数据集（经验数据），使用虚拟检测器方法进行 1. 交通特征提取 2. 两步框架 -> 轨迹数据分析的新方法。
  * 对具有均值和方差异质性的随机参数 logit 模型的探索性研究
  * 几种机器学习方法（eXtreme Gradient Boosting (Boosting)、Random Forest (Bagging)、Support Vector Machine (Single-classifier)和多层感知器）的比较研究

* 结论：
  * 交通流特征对冲突发生概率有显着影响。
  * 考虑**[平均异质性](# 异质性 Heterogeneity )**的统计模型优于对应变量，车道[差异变量](https://www.jianshu.com/p/67be9b3806cd)对【车道变量+车道差异变量】的随机参数均值有显着影响。
  * 在欠采样数据集上训练的 [eXtreme Gradient Boosting](https://github.com/dmlc/xgboost) 是[最佳模型]()：[AUC](https://zhuanlan.zhihu.com/p/58587448) 0.871，精度 0.867
    * 模型对冲突阈值敏感 -> 冲突风险预测应同时考虑主体车道特征和车道差异特征
