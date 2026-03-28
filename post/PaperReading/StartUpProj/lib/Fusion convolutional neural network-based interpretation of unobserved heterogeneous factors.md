# Fusion convolutional neural network-based interpretation of unobserved heterogeneous factors in driver injury severity outcomes in single-vehicle crashes

## abstract

* ###  Model:

  * a **fusion convolutional neural network** with random term (FCNN-R) model is proposed for **driver injury severity** analysis

  * sub-NNs ( for categorical variables ) + multi-layer convolutional neural network, CNN ( captures the potential nonlinear relationship between impact factors and driver injury severity outcomes )


## Introduction

Huge loss caused by traffic accident -> need understanding relations between **driver injury severity and the impact factors**

* **Problem :unobserved heterogeneity**: 
  * multinomial logit models are associated with the constraint of the independence of irrelevant alternatives (IIA) property, which assumes that unobserved factors are independent across individual crashes.
* **Statistical techniques**: 
  * **nested logit models**: hierarchically capture the correlation of unobserved factors among severity levels
  * **random parameter logit models**: uncover unobserved heterogeneity by allowing parameters varying across observations
  * **ordered logit/probit model with random parameters**: handle the ordered nature of crash injury severity and unobserved heterogeneities simultaneously
  * **latent class models**: address the unobserved heterogeneity by classifying crash data into homogeneous groups
* **Machine  learning techniques **:
  * **only one-hidden layer**( shallow feature learning ). better or comparable **predictive performance**, depend on the data characteristics used in the training process and may be **prone to overfitting data**.
  * limited studies have been conducted to **apply DNN approaches in driver injury severity analysis** 
    * limitations:
      1. black box, do not provide the **interpretable parameters** we get when using **statistical models**
      2. randomly initialized weights and local optimized training algorithm - (caused) -> training results of multiple runs are usually different (e.g. some variables may be essential in one run but not in the other run)
      3. overfitting
* **primary objective**:
  * apply the fusion convolutional neural networks to investigate the relationships between the impact factors and driver injury severity
    * The unobserved heterogeneity across different crash records is illustrated using a random error term with zero means
    * Marginal effect analysis is applied to uncover the essentiality of each variable for driver injury severity

## Data description

still Washington State Department of Transportation (WDOT) , single-vehicle crashes

See [A latent class approach for <u>driver injury severity analysis</u> in <u>highway single vehicle crash</u> considering unobserved heterogeneity and temporal influence](./A latent class approach for driver injury severity analysis in highway single vehicle crash.md)

* remove incorrect information
* examined and combine existing variables into classes

## Methodology

### general description

*  <u>fusion</u> convolutional neural network for analyzing and predicting the driver injury severity in <u>highway single-vehicle crashes</u>
*  FCNN-R model includes two components:
   1. sub-neural networks dealing with the input issue of various categorical variables
   2. deep convolutional neural network capturing the potential nonlinear relationship among the impact factors and driver injury severity outcomes

### Input structure for crash characteristics

* most ML crash analysis, the information is imported using a single data input layer or using separated sub-models based on their spatiotemporal patterns

* one-hot variables -> zero inputs do make interactions with other variables -> each categorical variable has a sub-NN to deal with relationships among the alternatives within a variable ->  only affect the value of the sub-NN’s output

  ![fasa](/Users/kounarushi/mycode/web-blog/public/.pic/fasa.png)

* random generator : captured unobserved heterogeneity for each record

23 sub-NNs + randomly generated parameter 24-element vector represents the crash features 

![img](file:///Users/kounarushi/mycode/web-blog/public/.pic/v2-3c906624089f59e671515ac18ab0761a_b.jpg)

### Multiple hidden layers

* convolutional layer ( learnable filters ) + pooling ( max-pooling ) layer

  ![dasdadasda](file:///Users/kounarushi/mycode/web-blog/public/.pic/dasdadasda.jpg)

* output layer contains three cells associated with the three injury severity levels, respectively, and the driver injury severity for the input crash record is the injury severity level with the most substantial output value.

### Objective function

minimize the **cross-entropy loss** ( between the model outputs and the real driver injury severity in each crash record )

$$min-\displaystyle\sum_{s}y^*_slog(y_s)+\lambda||W||^2_2$$

* where $y^*_s$ is the label value for sth driver injury severity obtained from the original crash record, and $y_s$ is the model prediction result for sth driver injury severity
* dropout method with a probability of 0.5 at the second dense layer and the L2-norm regularization approaches
  * W indicates all the weights in the proposed FCNN-R model, and k indicates the regularization parameter, which bal- ances the bias-variance tradeoff
* two measurements, i.e., the prediction accuracy rate (PAR) and false positive rate (FPR)

### Marginal effect analysis

……

## Results of data analysis

compared these 4 models below

-   I: simple FCNN-R model
-   II: FCNN-R model with a dropout layer
-   III: FCNN-R model with L2-norm regularization term in the objective function
-   IV: FCNN-R model with dropout layer and L2-norm regularization term in the objective function

then compared with 2statistical methods:

* the multinomial logit (MNL) model 

* the mixed multinomial logit (MMNL) model

and three neural network-related approaches: NN CNN FCNN

选择的数据集分为三个部分，包括训练集、验证集和测试集。更具体地说，从 7 年的数据集中随机选择了总共 9000 条崩溃记录（约占整个数据集的 30%）并作为测试集保留。在此之后，我们随机选择其余的崩溃记录中的 80% 作为训练集，而剩下的 20% 作为验证集。验证集和测试集的区别在于验证集用于为调整模型超参数（模型布局的参数）提供无偏评估，而测试集用于评估最终模型。

it is noted that the regularization and dropout techniques do improve the stability of the proposed model. However, they do not improve the predictive performance of the proposed model

## terminology 

### **hyperparameter**

is a parameter whose value is used to control the learning process. By contrast, the values of other parameters (typically node weights) are derived via training.
