# 长波红外显微/微距成像系统：已知微位移多帧高分辨率重建

**核心发现与文献摘要笔记（修订版）**

版本：2026-04-29｜用途：在原技术决策文档基础上，整理核心发现、相似工作、文献解读与可执行研究路线。

## 文档定位

这份文档不是新的“是否做/不做”的决策文档，而是把原文中的关键判断转化为可检索、可复用、可写入开题/论文综述的“核心发现文档”。原文已有的物理边界、重建模型优先级、采集规范、反 hallucination 验收和文献地图均被保留为基线；本版重点补充近年红外微扫描、热像超分、RAW/burst SR、物理一致性反演、主动热/光热重建和 RGB/visible-guided thermal SR 文献，并给出更细的专业判断。

核心问题重新表述：给定 LWIR 显微/微距系统、约 20 µm 校准空间分辨率、相邻帧约 2 µm 已知微位移，是否能通过多帧重建获得更高分辨率的热/辐射场？如果可以，应当声明到什么层级，采用什么模型，如何证明不是视觉锐化或生成式幻觉？

**表 0-1  一页结论：本项目的专业判断**

| 问题 | 专业判断 | 原因 | 可落地动作 |
| --- | --- | --- | --- |
| 20 µm → 10 µm 是否值得做 | 值得。应作为主线目标。 | 若 50 lp/mm 附近 MTF 非零，2D dither 可改善采样相位、aliasing 和噪声。10 µm 更接近多帧 SR 的可验证区间。 | 先做 PSF/MTF；用 Drizzle/MAP/POCS 建立 baseline；用 10/10 µm line-space 热靶验收。 |
| 20 µm → 5 µm 是否能称为“真实热空间分辨率” | 高风险，不应直接承诺。 | LWIR 8–14 µm 下 5 µm 已逼近或低于远场衍射尺度；多帧位移不能恢复 MTF 已归零的空间频率。 | 只在 100 lp/mm MTF 非零且线靶、温度、重投影、重复性全通过时声明。 |
| 5 µm 是否完全不能做 | 可以做“检测/定位/结构存在性”探索，不等同于分辨率。 | 小热源位置可在高 SNR 和已知模型下被亚像素估计；但两个 5 µm 热结构能否分开是另一问题。 | 把 5 µm 成果拆成：存在检测、位置定位、line-space 分辨、温度计量四类。 |
| 深度学习能否作为主方案 | 可以作为第二阶段，不可替代物理基线。 | 热像 SR 新文献多用 PSNR/SSIM/视觉指标，少有 raw radiometry、MTF 和温度闭环。 | 做 differentiable forward model + self-supervised/plug-and-play/neural prior；必须输出重投影残差和不确定度。 |
| 最有研究价值的方向 | “计量级物理一致多帧热重建”而非普通超分。 | 相似工作多在微扫描图像质量或目标检测；量化热场文献强调 PSF/STF 校正，但较少结合已知微位移。 | 形成贡献：校准数据集 + forward model + MAP/深度物理一致 SR + 反 hallucination 验收。 |

## 目录

- 0. 文档定位
- 1. 核心发现：从“能否做”转为“能声明什么”
- 2. 重建问题的数学与物理定义
- 3. 文献地图：保留原文献并补充新代表作
- 4. 相似工作深读：我们和它们像在哪里、差在哪里
- 5. 技术路线：我们真正能做什么
- 6. 验证与验收：如何证明不是锐化幻觉
- 7. 最小实验设计与向实验室要的数据
- 8. 可写成论文/项目成果的创新点
- 9. 文献摘要笔记：按优先级精读
- 10. 参考文献与推荐阅读清单
- 11. 立即可执行清单

## 1. 核心发现：从“能否做”转为“能声明什么”

原文最重要的判断是正确的：若 20 µm 是实测/校准的系统空间分辨率，而不是单纯像素采样间隔，那么已知 2 µm 位移并不能自动把系统变成 5 µm 分辨率系统。新增文献阅读后，这一判断不仅没有被推翻，反而更加清晰：近年的红外微扫描和深度热像 SR 工作确实能显著改善图像质量、边缘和 PSNR，但大多没有证明“5 µm 计量级热空间分辨率”；而量化热场重建文献反复强调 PSF/STF、辐射标定和重投影一致性。

**表 1-1  不是“能不能 5 µm”，而是要拆成五个可验收层级**

| 声明层级 | 含义 | 技术难度 | 推荐口径 | 必须验证 |
| --- | --- | --- | --- | --- |
| S0：插值显示 | 输出 5 µm 网格图像，但只是更密的像素网格。 | 低 | 只能称为可视化增强或网格重采样。 | 无需作为成果主张；不能称为空间分辨率。 |
| S1：采样相位改善 | 多帧 dither 抑制 aliasing，重建 10 µm 或 5 µm 网格上的更稳定图像。 | 中 | 可称为多帧微扫描重建。 | raw 重投影、子集重复、错位移对照。 |
| S2：10 µm 计量级热重建 | 10/10 µm line-space 或 50 lp/mm 热结构能稳定分辨，并保持温度幅值。 | 中高 | 建议作为主线成果。 | MTF10、温度误差、SNR、黑体/灰体标定。 |
| S3：5 µm 热源检测/定位 | 能发现或定位单个 5 µm 热扰动，但不保证分辨两个相邻结构。 | 高 | 可作为探索性成果。 | 重复检出率、定位标准差、假阳性、均匀靶对照。 |
| S4：5 µm 真实空间分辨率 | 5/5 µm line-space 或 100 lp/mm 热结构可被分辨，温度幅值可信。 | 极高 | 除非 MTF 和热靶全通过，否则不建议声明。 | 100 lp/mm MTF、line-space、温度、重投影、盲测、重复性。 |

### 1.1 三条硬边界

- 光学边界：LWIR 8–14 µm 波长本身与 5 µm 目标尺度同量级。若目标频率在系统 MTF 中已接近零，多帧算法没有可恢复的信息，只能依赖先验猜测。

- 采样边界：微位移多帧 SR 主要解决欠采样、像元相位和混叠；它不是“突破衍射”的通用机制。2 µm 位移的价值取决于 20 µm 的来源：采样限制、光学 blur、热扩散还是噪声。

- 计量边界：热成像不是普通灰度图像。重建图更锐并不等于温度更准；每个高分辨结果都必须能退化回每一帧 raw radiance/counts。

## 2. 重建问题的数学与物理定义

建议把问题定义为“辐射/温度场的物理一致反演”，而不是普通图像超分。高分辨未知量最好先定义在辐射或线性 raw 空间，最后再转温度；直接在 AGC 后灰度图上做 SR 不具备温度计量意义。

观测模型：

$$
y_k = G_k\{D_k A_k[(H_{\mathrm{opt}} * H_{\mathrm{th}}) * x]\} + b_k + n_k
$$

其中 $x$ 为高分辨辐射/温度场；$H_{\mathrm{opt}}$ 为光学 PSF/MTF；$H_{\mathrm{th}}$ 为热扩散或样品热传播等效核；$A_k$ 为像元积分/填充因子/响应；$D_k$ 为位移与采样；$G_k$ 为相机增益、NUC、辐射标定或非线性响应；$n_k$ 为 NETD、读出噪声、坏点和漂移。

推荐 MAP 形式：

$$
\hat{x} = \arg\min_x \sum_k \left\|y_k - F_k(x)\right\|_{\Sigma_k^{-1}}^2 + \lambda R(x) + \gamma C(x)
$$

$$
F_k(x) = D_k A_k Hx, \qquad H = H_{\mathrm{opt}} * H_{\mathrm{th}}
$$

$R(x)$ 可为 TV/BTV/Huber/Hessian/热扩散先验；$C(x)$ 可为非负性、温度范围、能量守恒、边界约束或弱光学先验。

**表 2-1  物理 forward model 必须显式包含的项**

| 模型项 | 在本项目中的具体含义 | 若忽略会发生什么 | 建议获取/估计方式 |
| --- | --- | --- | --- |
| H_opt：光学 PSF/MTF | 镜头、衍射、像差、离焦、滤光片与探测器耦合的空间传递函数。 | 把 blur 当成高频缺失后盲目锐化；温度峰值偏差。 | 热 slanted-edge、knife-edge、line-space、微加热器点/线源。 |
| H_th：热传播/热扩散 | 样品中热源到表面温度场的平滑；与材料热扩散率、时间尺度、激励模式相关。 | 误以为几何结构 5 µm 就一定有 5 µm 表面热信号。 | 主动调制频率扫描、有限元/解析热扩散模型、微加热器验证。 |
| A：像元积分 | 单个探测器像元对物面区域积分；含填充因子、采样孔径。 | 把采样点看成 Dirac 点，导致高频估计过乐观。 | 由探测器像元尺寸、放大倍率、标定 MTF 共同确定。 |
| D_k：位移与采样 | 每帧 2 µm 名义/实测位移；最好包含 x/y/z、旋转、尺度漂移。 | 配准误差会被解释为细节或噪声。 | 位移台编码器、图像配准微调、靶标标定、同步时间戳。 |
| G_k：辐射响应 | raw counts 到 radiance/temperature 的链路；含增益、积分时间、NUC、黑体标定。 | 视觉清晰但温度不可信；AGC 后灰度无法计量。 | 关闭 AGC；固定积分/增益；前后黑体；环境反射与发射率记录。 |
| Σ_k：噪声模型 | NETD、读出噪声、坏点、NUC 残差、漂移。 | 过拟合噪声，产生假 5 µm 纹理。 | 均匀靶统计、暗场/黑体重复、坏点图、时间序列漂移。 |

### 2.1 2 µm 位移到底有什么价值

若物面低分辨采样间隔接近 20 µm，2 µm 位移相当于在一个 LR 像元周期内提供 10 个相位点。这对 2× 输出（10 µm 网格）非常有利；对 4× 输出（5 µm 网格）也提供了采样相位，但它只解决采样相位，不解决光学和热扩散已抹掉的频率。若现有运动只有一维，最多能强力支持一维超采样/边缘定位，不能证明二维 5 µm 热分辨率。

**表 2-2  2 µm dither 的信息价值与局限**

| 目标 | 位移信息是否足够 | 真正瓶颈 | 建议做法 |
| --- | --- | --- | --- |
| 2×：20 → 10 µm | 若有 2D 位移或足够多非共线随机位移，通常足够。 | 50 lp/mm MTF、SNR、配准误差。 | 先做 Drizzle/shift-and-add，再做 MAP；每相位重复 5–10 帧。 |
| 4×：20 → 5 µm 网格 | 采样相位可覆盖，但不是分辨率保证。 | 100 lp/mm MTF、PSF 反演稳定性、热扩散、噪声。 | 作为实验输出；仅在物理验收通过时声明 5 µm 分辨。 |
| 5 µm 检测/定位 | 已知结构位置、高 SNR 时有意义。 | 假阳性、模型偏差、位置先验。 | 用单个微热源和两个近邻热源分开测试检测、定位、分辨。 |

## 3. 文献地图：保留原文献并补充新代表作

原文文献地图覆盖了物理约束、经典多帧 SR、红外微扫描、计算成像启发、RAW/burst pipeline、thermal SR challenge 和一致性评价。新增文献主要补上四个缺口：红外微扫描热显微系统的前序/后续工作、近年深度学习热显微 SR、模型驱动光热/主动热重建、2024–2026 热像/红外 SR benchmark。

**表 3-1  扩展后的文献地图**

| 类别 | 保留原文献 | 新增/强化文献 | 对本项目的意义 | 主要局限 |
| --- | --- | --- | --- | --- |
| 物理与热边界 | Rayleigh/Abbe；Breitenstein lock-in thermography；热扩散长度。 | [Breitenstein et al. 2006](https://doi.org/10.1016/j.microrel.2006.07.027) SIL lock-in；[Presotto et al. 2024](https://doi.org/10.1002/aisy.202300510) model-based photothermal；[Lock-in IR illumination 2025](https://doi.org/10.1364/OL.577649)。 | 明确 5 µm 目标的物理门槛；给出主动热、SIL、MWIR/近场等替代路线。 | 主动/光热/近场改变实验条件，不能直接证明被动 LWIR SR。 |
| 经典多帧 SR | [Irani & Peleg 1991](https://doi.org/10.1016/1049-9652(91)90045-L)；[Drizzle 2002](https://doi.org/10.1086/338393)；[Park et al. 2003](https://doi.org/10.1109/MSP.2003.1203207)；[Farsiu et al. 2004](https://doi.org/10.1109/TIP.2004.834669)；[Baker & Kanade 2002](https://doi.org/10.1109/TPAMI.2002.1033210)；[Wald consistency](https://www.asprs.org/wp-content/uploads/pers/97journal/june/1997_jun_691-699.pdf)。 | 可补 plug-and-play/ADMM/深度先验作为实现工具，但需服从 forward consistency。 | 给出可解释基线和理论极限；防止把生成式高频当测量。 | 多数是可见光或遥感，非热计量。 |
| 红外微扫描/热显微 | [Gao 2018](https://doi.org/10.1016/j.infrared.2018.10.013)；[Zhang 2019](https://doi.org/10.1364/OE.27.007719)；[Zhang 2020](https://doi.org/10.1016/j.infrared.2020.103186)；[Zhang/Gao 2021](https://doi.org/10.3390/app11135897)；[Chen 2025](https://doi.org/10.1038/s41598-025-09834-x)；InfraTec MicroScan。 | [Gao 2017](https://doi.org/10.1016/j.infrared.2017.05.004) error correction；[Chen 2021](https://doi.org/10.1038/s41598-021-82119-1) RPOCS；[Gao et al. 2024](https://doi.org/10.1007/s00371-023-03247-5) SMC-SRGAN-Lightning。 | 最相似：微扫描硬件、热显微、亚像素序列、POCS/深度 SR。 | 大多重图像质量、信息熵、PSNR；缺少 5 µm 计量温度闭环。 |
| 量化热场反演 | [Stanger et al. 2021](https://doi.org/10.3390/s21144859)。 | [Presotto et al. 2024](https://doi.org/10.1002/aisy.202300510)；热成像 STF/PSF 校正相关工作。 | 说明温度幅值和峰值必须做 PSF/STF 校正；本项目应借鉴反演验收。 | 应用场景不同；不一定包含微位移多帧。 |
| 深度热像 SR / RGB 引导 | [PBVS 2025](https://doi.org/10.1109/CVPRW67362.2025.00448)；NTIRE RAW 2025；[Wronski 2019](https://doi.org/10.1145/3306346.3323024)；[Hasinoff 2016](https://doi.org/10.1145/2980179.2980254)。 | [PBVS 2024](https://doi.org/10.1109/CVPRW63382.2024.00317)；[TnTViT-G](https://doi.org/10.1109/ACCESS.2023.3241852) 2023；[Multimodal Deep Unfolding](https://doi.org/10.1109/TIP.2020.3014729) 2020；[IR SR Survey 2025](https://doi.org/10.1109/JSTARS.2025.3614673)；[NTIRE 2026 Infrared SR](https://arxiv.org/abs/2604.21312)；[EGDM-IRSR 2026](https://doi.org/10.3390/rs18060910)。 | 提供网络结构、benchmark、RAW pipeline 灵感。 | 多数以 PSNR/SSIM 或视觉为目标，不适合直接作温度计量证据。 |
| 计算成像启发 | Fourier ptychography 2013。 | limited-size object SR 2026 等“先验突破”讨论可作为理论启发。 | 提醒“多样化观测 + 物理模型 + 冗余约束”才是可解释计算成像。 | 照明/相干/先验条件与被动 LWIR 不同。 |

## 4. 相似工作深读：我们和它们像在哪里、差在哪里

### 4.1 最相近的一组：红外微扫描热显微/热像 SR

**表 4-1  与本项目最相近的红外微扫描/热显微文献深读**

| 文献 | 系统/波段 | 采集机制 | 算法 | 评价 | 与本项目相似点 | 关键差异与不足 | 我们应借鉴什么 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gao et al. 2017，micro-scanning preprocessing error correction | 非制冷热显微系统；光学微扫描。 | 2×2 微扫描，存在机械/环境/对准误差。 | 二阶过采样重建 + NEDI 插值 + 误差校正。 | 模拟与实际热显微图像；强调标准 2×2 oversample 图像。 | 热显微 + 微扫描误差校正，与我们“位移真值/配准”高度相关。 | 不是 5 µm 热计量；侧重图像质量和微扫描预处理。 | 把位移误差作为核心变量；做错位移对照和位置自校准。 |
| Gao et al. 2018，高分辨率 optical micro-scanning thermal microscope | 非制冷 LWIR 热显微，热显微产品化方向。 | 高精度微扫描组件，2×2 oversampling。 | 系统设计 + 微扫描重建。 | 系统成像效果和空间分辨率提升。 | 与“热显微 + 微位移 + 分辨率提升”最像。 | 公开摘要/资料未形成 5 µm 计量热分辨率证明。 | 引用为硬件近邻，但不能作为 5 µm 论证。 |
| [Zhang et al. 2019](https://doi.org/10.1364/OE.27.007719)，Optics Express infrared micro-scanning SR | 红外微扫描系统；640×512、15 µm 像元。 | 微扫描亚像素 LR 序列。 | 频域相位估计 + POCS。 | 仿真与实验图像质量。 | 证明“已知/估计亚像素位移 + POCS”是合理路线。 | 未见温度计量、MTF 极限、5 µm 热靶验证。 | 作为 POCS/MAP baseline 设计依据。 |
| [Zhang et al. 2020](https://doi.org/10.1016/j.infrared.2020.103186)，自适应位置标定 | optical micro-scanning thermal microscope。 | 2×2 微扫描，真实系统实验。 | 图像配准 + 平面坐标系位置标定。 | 信息熵/重建质量。 | 直接指向我们最容易失败的环节：位移不是名义值。 | 主要评估图像质量，不是 radiometric SR。 | 每帧真实位移必须进入 forward model；不能只用名义 2 µm。 |
| [Zhang/Gao et al. 2021](https://doi.org/10.3390/app11135897)，TMIS performance theory | 热显微成像系统，讨论 TMIS 与远距离热像不同。 | 系统设计与理论验证。 | SNR、MRTD、MDTD 性能模型。 | 四杆靶、探测/分辨温差模型。 | 把空间分辨率与温度分辨率权衡纳入系统设计。 | 不是具体 5 µm SR 验证。 | 验收不能只看空间，还要看 MDTD/MRTD/NETD。 |
| [Chen et al. 2021](https://doi.org/10.1038/s41598-021-82119-1)，RPOCS infrared micro-scanning optical model | 反射式红外微扫描模型，冷却红外探测。 | 高速反射镜生成多帧亚像素位移序列。 | 区域选择 POCS，目标区重建以降低计算。 | dim-small target 图像、实时性。 | 多帧微扫描 + POCS + 红外目标，算法框架相似。 | 目标检测/图像恢复导向，不是显微温度计量。 | 可借鉴 ROI 策略，但本项目不能只重建“热目标区”而忽略温度闭环。 |
| [Gao et al. 2024](https://doi.org/10.1007/s00371-023-03247-5)，SMC-SRGAN-Lightning | optical micro-scanning thermal microscope 图像。 | 使用热显微微扫描图像和公共数据。 | SRGAN 改进，SMU/CBAM/SE-MobileNetV2，强调速度与清晰度。 | 与 4 种 SR 算法比较，视觉/图像指标。 | 说明深度生成模型已进入热显微微扫描方向。 | GAN 类输出可能引入纹理和伪细节；不天然计量。 | 可作为 visualization branch 或 neural prior；必须加 data consistency。 |
| [Chen et al. 2025](https://doi.org/10.1038/s41598-025-09834-x)，RIMO + self-supervised SR | MWIR 3.7–4.8 µm，F/2 冷却探测器，640×512，15 µm 像元。 | 反射式微扫描系统，高速振镜，x/y 亚像素。 | 自监督 SR：估计 blur kernel 和潜在 HR，deformable conv 对齐。 | PSNR 与传统 POCS 对比；PSNR 提升。 | 最新近邻：微扫描硬件 + 自监督 SR + 红外多帧。 | MWIR 非 LWIR；目标是小目标图像恢复，不是温度计量；PSNR 不等于热分辨率。 | 可借鉴自监督结构，但 loss 必须改成 raw radiometric forward consistency。 |
| InfraTec MicroScan 工业方案 | 多类红外热像仪，工程产品。 | 4 个半像素偏移图像合成。 | 实时合成，采样率/Nyquist 提升。 | 细节、边缘、aliasing 改善。 | 说明微扫描在红外热像仪中工程可行。 | 工业资料不是物理证明；不突破光学衍射。 | 可作为工程背景，不作为 5 µm 论据。 |

### 4.2 量化热场与主动/光热替代路线

**表 4-2  量化热场与主动替代路线：它们支持“物理反演”，不支持“普通被动 LWIR 算法万能”**

| 文献 | 核心思想 | 关键结论 | 对本项目的启发 | 不能直接迁移的原因 |
| --- | --- | --- | --- | --- |
| [Stanger et al. 2021](https://doi.org/10.3390/s21144859)，oversampled IR thermal fields | 用热像仪空间传递函数/PSF 校正 LPBF 中的显微热场。 | 不考虑 STF/blur 会造成显著信号和有效温度偏差；文中报告约 40% 信号差异和 174 °C 有效温度差。 | 我们的重建必须把 PSF/MTF 放进 forward model；温度峰值和梯度不能从锐化图直接读。 | LPBF 场景、温度范围、仪器不同；不是微位移 SR。 |
| [Presotto et al. 2024](https://doi.org/10.1002/aisy.202300510)，model-based photothermal SR | 用远红外热成像 full-wave forward model + image inversion 重建微尺度光热吸收分布。 | 证明“物理模型 + 反演”可在热成像中获得比直接成像更强的定位/对比。 | 若我们要做 5 µm，必须更像 model-based inverse problem，而不是普通 SR。 | 使用光热激励/主动成像，改变了被动 LWIR 条件。 |
| [Breitenstein et al. 2006](https://doi.org/10.1016/j.microrel.2006.07.027)，SIL lock-in thermal IR | 使用硅固体浸没透镜 + 3–5 µm IR camera + lock-in。 | 文献报告约 1.4 µm thermal IR imaging 空间分辨率。 | 说明若坚持微米级真分辨，MWIR + SIL + lock-in 是物理上更合理的路线。 | 主动调制、MWIR、SIL 接触/近接样品，不是普通被动 LWIR 视频 SR。 |
| Breitenstein 等 lock-in thermography 体系 | 通过周期激励和相位/幅值解调抑制噪声并控制热扩散长度。 | 强调点源定位、line-space 分辨和热扩散长度不是同一指标。 | 帮助定义 5 µm 的“检测/定位/分辨/计量”四个层级。 | 需要主动激励和同步采集。 |
| [Lock-in IR illumination 2025](https://doi.org/10.1364/OL.577649) | 用锁相红外照明增强显微红外成像质量。 | 短波长、高 NA 与锁相机制对高分辨显微红外很关键。 | 为替代路线提供当代参考。 | 不是被动 LWIR 多帧微位移。 |
| Thermoreflectance / TDTR / FDTR | 通过反射率随温度变化测量微/纳米热响应。 | 可达到比红外辐射热像更高的空间尺度。 | 若目标是微结构热源与材料热参数，可能比 LWIR 更合适。 | 测量物理量、光路、样品表面条件完全不同。 |

### 4.3 深度热像 SR、RGB 引导与 RAW/burst：可借鉴但不可替代计量链路

**表 4-3  最新深度热像 SR 文献的可用性边界**

| 文献/方向 | 任务 | 方法趋势 | 适合借鉴 | 本项目风险 |
| --- | --- | --- | --- | --- |
| PBVS Thermal Image SR Challenge 2024/2025 | thermal ×8；RGB-guided ×8/×16；跨光谱 benchmark。 | Transformer、hybrid、RGB guidance、self-ensemble、patch inference。 | 数据集设计、可见光引导对齐、评价流程、baseline。 | 场景级热图像，不是显微温度计量；PSNR/SSIM 不能证明温度。 |
| Infrared Image SR systematic review 2025 | 红外 SR 方法、数据集、评价指标、未来趋势综述。 | 从 sparse/TV 到 CNN/GAN/Transformer/扩散/多模态。 | 用于综述写作和方法定位。 | 综述覆盖面广，但不会替本项目解决 MTF/热扩散。 |
| [TnTViT-G](https://doi.org/10.1109/ACCESS.2023.3241852) 2023 / [Multimodal Deep Unfolding](https://doi.org/10.1109/TIP.2020.3014729) 2020 | 用 visible/RGB 辅助 NIR/thermal/多光谱 SR。 | 双流 Transformer 或深度展开，跨模态特征融合。 | 可把光学图用作弱边缘先验或 ROI/几何先验。 | 光学纹理泄漏为热纹理；跨模态错配会制造假温度结构。 |
| [NTIRE 2025 RAW](https://doi.org/10.1109/CVPRW67362.2025.00110) Restoration & SR | RAW Bayer 去噪、去 blur、2× SR。 | RAW 域恢复、未知噪声/blur、现代 ISP pipeline。 | 提醒本项目要在 raw/radiance 域处理，避免 AGC 后图像。 | 可见光 RAW；没有热辐射标定、发射率、NETD。 |
| Wronski et al. 2019 / Hasinoff et al. 2016 | 手机 burst SR/HDR+ pipeline。 | raw 多帧对齐、robust merge、Wiener/denoise、局部运动处理。 | 工程 pipeline 借鉴：鲁棒配准、权重融合、异常帧剔除。 | RGB 摄影，不是热计量；手持 burst 的运动模型不同。 |
| [NTIRE 2026 Infrared SR](https://arxiv.org/abs/2604.21312) / [EGDM-IRSR 2026](https://doi.org/10.3390/rs18060910) / RPT-SR 2026 | 遥感/红外图像 SR 最新方法。 | Mamba/Transformer/扩散/edge-guided/state-space。 | 可作为“视觉分支”或对比方法，展示领域最新。 | 仍多为图像质量任务；与显微 LWIR 5 µm 热靶不等价。 |

## 5. 技术路线：我们真正能做什么

本项目最强的可做点不是再训练一个通用 SR 网络，而是把“已知微位移 + raw 热数据 + PSF/MTF + 辐射标定 + 重投影一致性”合成一个计量级多帧反演框架。这样既能回应 5 µm 诉求，也能把失败边界讲清楚。

**表 5-1  推荐技术路线：从可解释 baseline 到物理一致深度模型**

| 阶段 | 目标 | 输入 | 方法 | 输出 | 成功标准 |
| --- | --- | --- | --- | --- | --- |
| A0 数据审计 | 确认 raw、位移、温度标定是否可做计量。 | raw counts/radiance、AGC 状态、黑体、位移台、积分时间、NUC、坏点。 | 数据字典、线性检查、漂移/坏点/饱和检测。 | 可用帧集合与元数据表。 | 每帧能映射到固定响应模型；AGC/非线性可控。 |
| A1 物理基线 | 建立无强先验多帧 SR baseline。 | 已配准 LR 序列和位移。 | shift-and-add、Drizzle、POCS、Wiener/deblur。 | 2× 与 4× 网格重建。 | 重投影残差不超过噪声 1–2 倍；错位移对照失败。 |
| A2 PSF/MTF 标定 | 确定 50/100 lp/mm 是否有可测信息。 | 热 slanted-edge、line-space、点/线微热源。 | ESF→LSF→MTF；参数化 PSF 拟合；场依赖 PSF。 | MTF50/MTF10、PSF kernel、uncertainty。 | 50 lp/mm 可测支持 10 µm；100 lp/mm 可测才继续 5 µm 真分辨。 |
| A3 计量级 MAP 反演 | 在 raw/radiance 域估计高分辨热场。 | raw 序列、位移、PSF、像元积分、噪声模型。 | MLE/MAP + TV/BTV/Huber/非负性；FISTA/ADMM/PyTorch 自动微分。 | HR radiance/temperature + uncertainty map。 | 温度靶幅值正确；重投影/子集/均匀靶通过。 |
| A4 半盲联合校准 | 减少 PSF/位移误差对结果的影响。 | 标定靶 + 真实零件序列。 | joint refine shift/PSF；slanted-edge 约束；低维 PSF 参数。 | 修正后的位移和 PSF。 | 比固定模型更稳定，但不能过拟合细节。 |
| A5 深度/自监督增强 | 提升噪声鲁棒性和边缘质量。 | A3 产生的物理模型和真实 raw。 | self-supervised SR、deep image prior、plug-and-play denoiser、diffusion prior。 | measurement-grade 与 visualization 两个分支。 | 视觉分支不得破坏 raw consistency；输出置信度。 |
| A6 光学弱先验 | 利用可见光几何但避免纹理泄漏。 | 高分辨光学图、热图、配准模型。 | 边界 mask、edge confidence、prior dropout、cross-modal consistency。 | 几何辅助的 HR 热图。 | 替换/遮挡光学图时热结构不应凭空改变。 |

### 5.1 推荐实现架构

输入：$\{raw_k, t_k, dx_k, dy_k, dz_k, exposure_k, gain_k, NUC_k, blackbody frames\}$
预处理：坏点/NUC/漂移校正 → radiance 标定 → ROI 统一 → 位移同步
标定：slanted-edge/line-space/微热源 → PSF/MTF + 噪声模型
重建：Drizzle baseline → POCS/MAP-TV/BTV → 半盲 PSF/shift refine → 可选 neural prior
验证：reprojection、wrong-shift、subset repeatability、uniform target、blind line-space、temperature fidelity
输出：HR radiance、HR temperature、uncertainty、MTF/line-space report、failure/claim level

**表 5-2  重建方法选择与定位**

| 方法 | 优点 | 缺点 | 本项目定位 |
| --- | --- | --- | --- |
| Drizzle / shift-and-add | 简单、保光度、无强先验；容易暴露采样信息上限。 | 不做强反卷积，对 noise/blur 提升有限。 | 必须做的第一 baseline。 |
| POCS | 能放入非负性、范围、采样一致性等凸约束；红外微扫描文献常用。 | 对噪声敏感；收敛与约束设计影响大。 | 与 [Zhang 2019](https://doi.org/10.1364/OE.27.007719)/[Chen 2021](https://doi.org/10.1038/s41598-021-82119-1) 对齐的传统对比方法。 |
| MAP-TV/BTV/Huber | 显式 forward model；鲁棒；可输出残差和不确定度。 | 正则过强会抹细节，过弱会放大噪声。 | 主推 measurement-grade 方法。 |
| 半盲 PSF/shift 联合优化 | 适应真实系统误差；提高稳健性。 | 可辨识性差，容易把细节吸收到 PSF 或 shift。 | 仅使用低维参数和标定靶约束。 |
| 深度自监督 SR | 不需要 HR 真值；可从多帧/降采样一致性学习。 | 若 loss 不含物理模型，仍可能 hallucinate。 | 第二阶段：与 forward model 绑定。 |
| GAN/扩散/Transformer | 视觉质量强，能去噪和补边缘。 | 生成式纹理不可作为温度证据。 | 只作为 visualization 或 plug-in prior。 |
| 光学/RGB 引导 | 几何边界清晰，有利于 ROI 和边缘先验。 | 跨模态纹理泄漏、配准误差、发射率/温度错配。 | 弱先验，必须做 dropout 与错配对照。 |

### 5.2 最建议形成的算法贡献

- Radiometric multi-frame SR：在 raw/radiance 域进行多帧 MAP 反演，而不是在 AGC 后图像上做 SR。

- Calibrated PSF/MTF + dither：把实测 PSF、像元积分和真实位移作为 forward operator，解决“微扫描图像质量”和“热计量”之间的缺口。

- Claim-aware output：同一算法输出 10 µm 计量图、5 µm 检测/定位图、5 µm 可视化图，并用不同验收标签约束声明。

- Anti-hallucination protocol：错位移、均匀靶、子集重复、光学先验 dropout、盲测线靶，形成可发表的评价协议。

- Uncertainty map：对每个 HR 像素或 ROI 输出置信度/后验方差/Bootstrap 区间，避免只给一张“清晰图”。

## 6. 验证与验收：如何证明不是锐化幻觉

热像 SR 的核心风险是“看起来更清楚，但测量上更错”。因此验收必须围绕 raw forward consistency、独立热靶和重复性，而不是 PSNR/SSIM 或主观清晰度。

**表 6-1  反 hallucination 验收矩阵**

| 验收项 | 做法 | 通过标准建议 | 它能排除什么伪成果 |
| --- | --- | --- | --- |
| 重投影一致性 | HR 结果经 PSF + 像元积分 + 位移 + 采样退化回每帧 raw。 | 残差 RMS ≤ raw 噪声 1–2 倍；无结构性残差。 | 排除只锐化平均图、不解释原始帧的结果。 |
| 错位移对照 | 打乱位移或加入错误 shift。 | 结果应显著变差，残差上升。 | 若仍清晰，说明算法靠先验/纹理生成。 |
| 子集重复性 | 前半帧、后半帧、随机帧分别重建。 | 10 µm 结构一致；5 µm 检测位置在置信区间内。 | 排除偶然噪声峰、漂移和过拟合。 |
| 均匀靶 | 均匀温度黑体/灰体输入重建。 | 不得生成 5/10 µm 纹理；残差白噪声化。 | 排除网络/正则化 hallucination。 |
| 热 line-space | 20/20、10/10、5/5 µm 热线靶。 | 报告 MTF50/MTF10、对比度、SNR、温度幅值。 | 区分插值、检测、分辨。 |
| 微热源定位 | 单个与双近邻 5 µm 微加热器。 | 重复定位标准差 < 2–3 µm 可称定位；双源分开才称分辨。 | 防止把“看见一个点”当成分辨率。 |
| 温度保真 | 比较 HR ROI 平均/峰值/温差与独立测量或高可信模型。 | 大区温度在相机标称精度；微结构幅值误差按 SNR 设阈值。 | 排除图像变清楚但温度错。 |
| 光学先验 dropout | 遮挡、错配或替换光学引导图。 | 热结构不应被光学纹理支配。 | 排除可见光纹理泄漏。 |

**表 6-2  声明与证据的匹配关系**

| 目标声明 | 最低证据 | 推荐证据 | 不应使用的证据 |
| --- | --- | --- | --- |
| 10 µm 计量级热重建 | 50 lp/mm MTF 非零；10/10 µm 热靶可分辨；重投影通过。 | 多温度黑体、微加热器温度幅值、3–5 次重复扫描。 | 只看边缘锐度、信息熵、PSNR。 |
| 5 µm 热信号检测 | 单个 5 µm 热源重复检出，SNR ≥ 5 或 ROC/检出率可靠。 | 假阳性测试、盲测、均匀靶对照。 | 把单点可见称为空间分辨率。 |
| 5 µm 热源定位 | 已知模型下定位标准差 < 2–3 µm。 | 两个近邻热源距离变化实验；Bootstrap 置信区间。 | 把定位精度当作分辨率。 |
| 5 µm 真实热空间分辨率 | 100 lp/mm MTF 可测；5/5 µm line-space 通过；温度幅值可信。 | 完整 forward consistency、盲测、重复、错位移、热模型交叉验证。 | 深度网络输出、GAN 清晰图、光学图边缘。 |

## 7. 最小实验设计与向实验室要的数据

**表 7-1  最小可行实验包**

| 实验 | 目的 | 数据 | 预期判断 |
| --- | --- | --- | --- |
| E1 当前系统 PSF/MTF | 判断 50/100 lp/mm 是否有信息。 | 热 slanted-edge、20/10/5 µm line-space、点/线微热源。 | 若 100 lp/mm 近噪声底，停止 5 µm 真分辨声明。 |
| E2 2D dither raw 序列 | 验证微位移 SR 基线。 | 2×2、4×4 或随机 2D dither；每相位重复；真实位移。 | 确认 20→10 是否稳定，4× 网格是否只是视觉锐化。 |
| E3 微加热器温度靶 | 验证温度幅值与微结构保真。 | 20/10/5 µm 微加热器、已知功率、黑体/灰体标定。 | 将“可见结构”转为“温度可信”。 |
| E4 均匀靶与错位移 | 排除 hallucination。 | 均匀黑体/灰体、多帧序列、错位移重建。 | 均匀输入不得生成微纹理；错位移必须失败。 |
| E5 真实零件盲测 | 验证工程可用性。 | 真实零件扫描 + 开发者未知结构周期/位置。 | 从标定靶泛化到真实样品。 |

**表 7-2  向老师/实验室必须索取的信息**

| 必须索取的数据 | 为什么重要 | 最低要求 |
| --- | --- | --- |
| 20 µm 校准依据 | 决定 20 µm 是 sampling pitch、MTF50/10、line-space 还是主观看清。 | 原始靶图、靶规格、计算方法、焦距/放大倍率。 |
| 完整光学链路 | 计算衍射、像元物面 pitch、PSF/MTF。 | 波段、F/#、NA、放大倍率、工作距离、镜头/滤光片、探测器像元。 |
| raw 数据与相机状态 | 计量 SR 必须在 raw/radiance 域。 | raw counts/radiance、bit depth、AGC off、积分时间、增益、NUC、坏点表。 |
| 位移真值和同步 | 2 µm 名义位移不足以建模。 | 每帧 x/y/z、时间戳、触发、位移误差、是否二维。 |
| 黑体/灰体标定 | 温度链路闭合。 | 多温度点、前后帧、环境/反射温度、发射率处理。 |
| 老师验收语义 | 避免把检测、定位、分辨、温度计量混为一谈。 | 明确最终要“5 µm 温度值”“5 µm 定位”还是“图像清晰”。 |

## 8. 可写成论文/项目成果的创新点

如果把目标写成“用 AI 把 20 µm 图像超分到 5 µm”，项目会显得物理风险高、创新口径薄弱。更有说服力的写法是：在已知微位移 LWIR 显微/微距系统中，提出计量级物理一致多帧热场重建与验证框架。

**表 8-1  更专业、更可发表的成果口径**

| 可投稿/汇报贡献 | 具体内容 | 为什么有价值 | 验证方式 |
| --- | --- | --- | --- |
| C1 校准化 LWIR 微位移 SR forward model | 把 PSF/MTF、像元积分、位移、辐射标定和噪声模型统一到 raw 反演。 | 填补热显微微扫描图像质量与量化热场之间的缺口。 | 重投影、热靶、温度幅值。 |
| C2 Claim-aware reconstruction | 对 10 µm 计量、5 µm 检测/定位、5 µm 可视化给出不同输出和置信标签。 | 避免过度声明，工程上更可信。 | 分级靶实验与盲测。 |
| C3 半盲 PSF/shift 联合标定 | 结合 slanted-edge、line-space 和真实序列优化低维 PSF/位移参数。 | 解决微位移名义值不准、焦点漂移和系统误差。 | 标定前后 MTF/残差对比。 |
| C4 物理一致自监督热 SR | 深度模型以 F_k(x) 重投影误差、温度先验和不确定度为核心 loss。 | 让深度学习服务计量，而不是生成纹理。 | 和 Drizzle/MAP/POCS、Gao 2024、[Chen 2025](https://doi.org/10.1038/s41598-025-09834-x) 类方法对比。 |
| C5 反 hallucination 验收协议 | 错位移、均匀靶、子集重复、光学 dropout、盲测 line-space。 | 可成为方法学贡献，尤其适合热像 SR。 | 报告失败/通过案例和阈值。 |

### 8.1 建议项目标题/论文题目备选

- Calibrated Multi-frame Radiometric Super-resolution for LWIR Microscopic Thermography with Known Micro-displacements

- Physics-consistent Reconstruction of LWIR Microscopic Thermal Fields from Micro-shifted Raw Frames

- Claim-aware Super-resolution in LWIR Micro-thermography: Separating Detection, Localization and Metric Resolution

- Anti-hallucination Validation for Micro-shift Thermal Super-resolution Using PSF/MTF and Raw Reprojection Consistency

## 9. 文献摘要笔记：按优先级精读

**表 9-1  推荐精读顺序与阅读要点**

| 优先级 | 文献 | 一句话摘要 | 对我们最有用的点 | 阅读时要警惕 |
| --- | --- | --- | --- | --- |
| P0 | [Stanger et al. 2021](https://doi.org/10.3390/s21144859) | 过采样红外热场若不校正空间传递函数，会出现显著温度/信号误差。 | PSF/STF 校正是温度计量的必要条件。 | 不是微扫描；但方法论非常关键。 |
| P0 | [Zhang et al. 2019 Optics Express](https://doi.org/10.1364/OE.27.007719) | 红外微扫描 SR 用频域相位估计和 POCS 实现多帧重建。 | 直接支撑 POCS baseline。 | 评价偏图像质量，缺少温度/MTF 证明。 |
| P0 | [Zhang et al. 2020](https://doi.org/10.1016/j.infrared.2020.103186) | 微扫描热显微系统必须做位置自适应标定。 | 2 µm 位移不能只看名义值。 | 信息熵不是计量指标。 |
| P0 | [Gao et al. 2017](https://doi.org/10.1016/j.infrared.2017.05.004) / [Gao et al. 2018](https://doi.org/10.1016/j.infrared.2018.10.013) | 热显微微扫描系统设计与误差校正的前序工作。 | 说明硬件误差和标准 2×2 模式的重要性。 | 没有证明突破衍射或 5 µm 温度。 |
| P0 | [Baker & Kanade 2002](https://doi.org/10.1109/TPAMI.2002.1033210) | 放大倍率增大时，多帧重建约束提供的信息会递减。 | 解释为什么 4× 比 2× 风险大。 | 其 learning/hallucination 思路不适合温度计量。 |
| P0 | [Farsiu et al. 2004](https://doi.org/10.1109/TIP.2004.834669) | L1 + bilateral regularization 的鲁棒多帧 SR。 | 适合作为 MAP/BTV 算法基线。 | 可见光验证，需要热噪声模型重写。 |
| P1 | [Chen et al. 2025 Scientific Reports](https://doi.org/10.1038/s41598-025-09834-x) | 反射式 MWIR 微扫描 + 自监督 SR。 | 最新红外微扫描深度 SR 代表。 | MWIR、小目标、PSNR，不是 LWIR 计量。 |
| P1 | [Gao et al. 2024 Visual Computer](https://doi.org/10.1007/s00371-023-03247-5) | 热显微微扫描图像的轻量 GAN SR。 | 说明热显微 SR 深度方法现状。 | GAN artifact 风险高。 |
| P1 | [Chen et al. 2021 Scientific Reports](https://doi.org/10.1038/s41598-021-82119-1) | 微扫描模型 + 区域选择 POCS，提升实时小目标恢复。 | ROI 和 POCS 思路。 | 目标检测导向，不是显微热计量。 |
| P1 | [Zhang/Gao et al. 2021 Applied Sciences](https://doi.org/10.3390/app11135897) | 热显微系统 SNR/MRTD/MDTD 性能模型。 | 把空间分辨率和温度分辨率一起评价。 | 不是 SR 验证。 |
| P1 | [Presotto et al. 2024](https://doi.org/10.1002/aisy.202300510) | 模型驱动光热显微 SR，用 forward model 反演吸收体分布。 | 物理反演范式。 | 主动光热，不是被动 LWIR。 |
| P2 | [PBVS 2024/2025 challenge](https://doi.org/10.1109/CVPRW67362.2025.00448) | 热像 SR 和 RGB-guided thermal SR 的 benchmark。 | 最新网络结构与数据集设计。 | 场景图像，不具备温度计量。 |
| P2 | [NTIRE 2025 RAW](https://doi.org/10.1109/CVPRW67362.2025.00110) / [NTIRE 2026 IR SR](https://arxiv.org/abs/2604.21312) | RAW/红外 SR 的最新 benchmark。 | RAW pipeline 和最新方法。 | 指标仍偏图像质量。 |
| P2 | [TnTViT-G](https://doi.org/10.1109/ACCESS.2023.3241852) / [Multimodal Deep Unfolding](https://doi.org/10.1109/TIP.2020.3014729) | 可见光引导其他谱段 SR。 | 光学弱先验实现参考。 | 纹理泄漏风险。 |
| P2 | [Wronski 2019](https://doi.org/10.1145/3306346.3323024) / [Hasinoff 2016](https://doi.org/10.1145/2980179.2980254) | 手机 raw burst SR/HDR 工程 pipeline。 | 鲁棒多帧合成思想。 | 可见光摄影，不是热计量。 |

## 10. 参考文献与推荐阅读清单

说明：本清单保留原文献地图中的核心文献，并补充与本问题更贴近或更新的代表作。链接优先使用 DOI、出版社页面或 arXiv；工程页面只用于了解当前实践，不作为物理可行性证明。

- Rayleigh criterion / Abbe diffraction limit：经典光学衍射极限。用于估算 LWIR 5 µm 分辨所需 NA。概念入口：[Diffraction-limited system](https://en.wikipedia.org/wiki/Diffraction-limited_system)。
- Breitenstein, O.; Warta, W.; Langenkamp, M. *Lock-in Thermography*, 2nd ed. Springer, 2010. [DOI](https://doi.org/10.1007/978-3-642-02417-7)。
- Breitenstein, O.; Altmann, F.; Riediger, T.; Karg, D. Lock-in thermal IR imaging using a solid immersion lens. *Microelectronics Reliability*, 2006. [DOI](https://doi.org/10.1016/j.microrel.2006.07.027)。
- Stanger, L.; Rockett, T.; Lyle, A.; et al. Reconstruction of Microscopic Thermal Fields from Oversampled Infrared Images in Laser-Based Powder Bed Fusion. *Sensors*, 2021, 21(14), 4859. [DOI](https://doi.org/10.3390/s21144859)。
- Presotto, L.; et al. Super-Resolution Photothermal Imaging at the Microscale by Model-Based Image Reconstruction. *Advanced Intelligent Systems*, 2024. [DOI](https://doi.org/10.1002/aisy.202300510)。

### 10.1 经典多帧 SR 与一致性

- Irani, M.; Peleg, S. Improving Resolution by Image Registration. *CVGIP: Graphical Models and Image Processing*, 1991. [DOI](https://doi.org/10.1016/1049-9652(91)90045-L)。
- Fruchter, A. S.; Hook, R. N. Drizzle: A Method for the Linear Reconstruction of Undersampled Images. *PASP*, 2002. [DOI](https://doi.org/10.1086/338393)。
- Park, S. C.; Park, M. K.; Kang, M. G. Super-resolution Image Reconstruction: A Technical Overview. *IEEE Signal Processing Magazine*, 2003. [DOI](https://doi.org/10.1109/MSP.2003.1203207)。
- Farsiu, S.; Robinson, M. D.; Elad, M.; Milanfar, P. Fast and Robust Multi-frame Super-resolution. *IEEE TIP*, 2004. [DOI](https://doi.org/10.1109/TIP.2004.834669)。
- Baker, S.; Kanade, T. Limits on Super-Resolution and How to Break Them. *IEEE TPAMI*, 2002. [DOI](https://doi.org/10.1109/TPAMI.2002.1033210)。
- Wald, L.; Ranchin, T.; Mangolini, M. Fusion of satellite images of different spatial resolutions: Assessing the quality of resulting images. *PE&RS*, 1997. [PDF](https://www.asprs.org/wp-content/uploads/pers/97journal/june/1997_jun_691-699.pdf)。

### 10.2 红外微扫描/热显微/热像 SR

- Gao, M.; Xu, J.; Tan, A.; et al. Error correction based on micro-scanning preprocessing for an optical micro-scanning thermal microscope imaging system. *Infrared Physics & Technology*, 2017, 83:252–258. [DOI](https://doi.org/10.1016/j.infrared.2017.05.004)。
- Gao, M.; Tan, A.; Zhang, B.; et al. Design and realization of high resolution optical micro-scanning thermal microscope imaging system. *Infrared Physics & Technology*, 2018, 95:46–52. [DOI](https://doi.org/10.1016/j.infrared.2018.10.013)。
- Zhang, X.; Huang, W.; Xu, M.; et al. Super-resolution imaging for infrared micro-scanning optical system. *Optics Express*, 2019, 27(5):7719–7737. [DOI](https://doi.org/10.1364/OE.27.007719)。
- Zhang, B.; Gao, M.; Rosin, P. L.; et al. Adaptive position calibration technique for an optical micro-scanning thermal microscope imaging system. *Infrared Physics & Technology*, 2020, 105:103186. [DOI](https://doi.org/10.1016/j.infrared.2020.103186)。
- Chen, J.; Li, Y.; Cao, L. Research on region selection super resolution restoration algorithm based on infrared micro-scanning optical imaging model. *Scientific Reports*, 2021, 11:2852. [DOI](https://doi.org/10.1038/s41598-021-82119-1)。
- Zhang, B.; Gao, M.; Rosin, P. L.; et al. Research on Performance Evaluation and Optimization Theory for Thermal Microscope Imaging Systems. *Applied Sciences*, 2021, 11(13):5897. [DOI](https://doi.org/10.3390/app11135897)。
- Gao, M.; Bai, Y.; Xie, Y.; et al. SMC-SRGAN-Lightning super-resolution algorithm based on optical micro-scanning thermal microscope image. *The Visual Computer*, 2024, 40:8441–8454. [DOI](https://doi.org/10.1007/s00371-023-03247-5)。
- Chen, J.; Wang, Y.; Ye, X.; et al. Research on self-supervised super resolution restoration algorithm based on reflective micro-scanning optical system. *Scientific Reports*, 2025, 15:24736. [DOI](https://doi.org/10.1038/s41598-025-09834-x)。
- InfraTec MicroScan：工程化红外微扫描方案。用于工程背景，不作为突破光学极限证据。 [InfraTec MicroScan](https://www.infratec-infrared.com/thermography/service-support/glossary/microscan/)。

### 10.3 深度热像 SR、RAW/burst 和多模态引导

- Huang, Y.; Miyazaki, T.; Liu, X.; Omachi, S. Infrared Image Super-Resolution: A Systematic Review and Future Trends. *IEEE J-STARS*, 2025. [DOI](https://doi.org/10.1109/JSTARS.2025.3614673)。
- Rivadeneira, R. E.; Sappa, A. D.; et al. Thermal Image Super-Resolution Challenge Results - PBVS 2024. *CVPR Workshops*, 2024. [DOI](https://doi.org/10.1109/CVPRW63382.2024.00317)。
- Rivadeneira, R. E.; Sappa, A. D.; Hammoud, R.; et al. Thermal Image Super-Resolution Challenge Results - PBVS 2025. *CVPR Workshops*, 2025. [DOI](https://doi.org/10.1109/CVPRW67362.2025.00448)。
- Marivani, I.; Tsiligianni, E.; Cornelis, B.; Deligiannis, N. Multimodal Deep Unfolding for Guided Image Super-Resolution. *IEEE TIP*, 2020. [DOI](https://doi.org/10.1109/TIP.2020.3014729)。
- Mehri, A.; Behjati, P.; Sappa, A. D. TnTViT-G: Transformer in Transformer Network for Guidance Super Resolution. *IEEE Access*, 2023. [DOI](https://doi.org/10.1109/ACCESS.2023.3241852)。
- Conde, M. V.; Timofte, R.; et al. NTIRE 2025 Challenge on RAW Image Restoration and Super-Resolution. *CVPR Workshops*, 2025. [DOI](https://doi.org/10.1109/CVPRW67362.2025.00110)。
- Wronski, B.; Garcia-Dorado, I.; et al. Handheld Multi-Frame Super-Resolution. *ACM TOG / SIGGRAPH*, 2019. [DOI](https://doi.org/10.1145/3306346.3323024)。
- Hasinoff, S. W.; Barron, J. T.; et al. Burst Photography for High Dynamic Range and Low-Light Imaging on Mobile Cameras. *SIGGRAPH Asia*, 2016. [DOI](https://doi.org/10.1145/2980179.2980254)。
- Liu, H.; et al. EGDM-IRSR: Edge-Guided Diffusion Model with State-Space UNet for Super-Resolution Infrared Images. *Remote Sensing*, 2026. [DOI](https://doi.org/10.3390/rs18060910)。
- Liu, K.; Yue, H.; Lin, Z.; et al. The First Challenge on Remote Sensing Infrared Image Super-Resolution at NTIRE 2026: Benchmark Results and Method Overview. arXiv, 2026. 当前性强，但与显微热计量距离较远。 [arXiv](https://arxiv.org/abs/2604.21312)。

### 10.4 计算成像与替代测温

- Zheng, G.; Horstmeyer, R.; Yang, C. Wide-field, high-resolution Fourier ptychographic microscopy. *Nature Photonics*, 2013. [DOI](https://doi.org/10.1038/nphoton.2013.187)。
- Bouzin, M.; et al. Photo-activated raster scanning thermal imaging at sub-diffraction resolution. *Nature Communications*, 2019. [DOI](https://doi.org/10.1038/s41467-019-13447-0)。
- Sharma, A. M. R.; Jacobs, K. J. P.; de Wolf, I. Lock-in infrared illumination for high-resolution microscopic thermal imaging. *Optics Letters*, 2025. [DOI](https://doi.org/10.1364/OL.577649)。
- Thermoreflectance / TDTR / FDTR literature：用于高空间分辨热响应测量，适合作为替代路线，不等同于被动 LWIR。代表性入口可从 TDTR/FDTR 综述和方法论文继续扩展。
- Chang, T.; Adamo, G.; Zheludev, N. I. Super-resolution imaging of limited-size objects. *Nature Photonics*, 2026. 可作为先验辅助远场超分辨的理论启发，但必须明确先验和 photon budget 条件。 [DOI](https://doi.org/10.1038/s41566-025-01839-2)。


## 11. 立即可执行清单

**表 11-1  下一步工作清单**

| 优先级 | 事项 | 完成物 | 建议负责人/角色 |
| --- | --- | --- | --- |
| 1 | 确认 20 µm 校准来源并拿到原始靶数据。 | 20 µm 分辨率证据包。 | 实验老师/仪器负责人。 |
| 1 | 关闭 AGC，获取 raw/radiance 帧和黑体标定。 | raw 数据字典 + 标定曲线。 | 采集负责人。 |
| 1 | 做热 slanted-edge 与 20/10/5 µm line-space。 | MTF50/MTF10 + 50/100 lp/mm 判断。 | 实验负责人。 |
| 1 | 实现 Drizzle/POCS/MAP-TV baseline。 | 2×/4× 重建与重投影残差图。 | 算法负责人。 |
| 2 | 做错位移、均匀靶、子集重复。 | 反 hallucination 报告。 | 算法 + 实验。 |
| 2 | 构建微加热器温度靶验证。 | 温度幅值与定位/分辨实验。 | 硬件/工艺协作。 |
| 3 | 加入半盲 PSF/shift refine 和 uncertainty。 | measurement-grade pipeline。 | 算法负责人。 |
| 3 | 设计 self-supervised/深度先验分支。 | 与传统方法对比，不作为唯一结果。 | 算法负责人。 |

最终建议口径：把主线写成“20 µm → 10 µm 计量级热重建 + 5 µm 检测/定位探索”，并把“5 µm 真实热空间分辨率”设为条件性声明：只有在 100 lp/mm MTF、5/5 µm 热线靶、温度幅值、重投影一致性和重复性全部通过时才使用。
