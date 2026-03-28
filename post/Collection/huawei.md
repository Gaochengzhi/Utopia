

# 华为面试题解析



## 第一题：二叉树最长严格交替路径

### 问题描述

> 给定一棵二叉树的根节点 `root` 和一个整数 `k`。
>
> **定义一条严格交替路径如下：**
> 1.  **方向**：只能从父节点向子节点方向延伸（路径必须自上而下）。
> 2.  **严格交替**：路径中相邻节点的值必须交替递增和递减。例如，路径可以是 `3-7-5-9`（即 3 < 7 > 5 < 9）。“先减小后增加”和“先增加后减少”都算交替。
> 3.  **差值限制**：每一步的绝对差值必须严格大于等于 `k`。例如，若 `k=2`，则 `3-7` 是合法的（差值为 4 >= 2），但 `3-4` 不合法（差值为 1 < 2）。
>
> 请编写一个函数，返回这棵二叉树中最长严格交替路径的长度。路径长度定义为路径中节点的数量。

**输入格式**
*   第一行包含两个整数 `N` 和 `K`。
    *   `N` 是树的节点数量, 范围为 `[1, 10000]`。
    *   `K` 是差值阈值, 范围为 `[1, 100]`。
*   第 2 到第 `N+1` 行，每行格式为 `x y z`，表示一个二叉树节点关系。
    *   `x` 为父节点，`y` 为左子节点，`z` 为右子节点。
    *   缺失的子节点用 `-1` 表示。
    *   节点值 `x, y, z` 的取值范围为 `[1, 100000]`，且值不重复。
    *   输入顺序按树的先序遍历方式排列。

**样例输入**
```
6 10
20 10 -1
10 21 -1
21 -1 11
11 -1 22
22 12 -1
12 -1 -1
```

**样例输出**
```
6
```

### 解决方案与代码

```python
import sys
# 增加递归深度限制以防栈溢出
sys.setrecursionlimit(20000)

def solve_tree_path():
    """
    计算二叉树中最长严格交替路径
    """
    it = iter(sys.stdin.read().split())
    try:
        N, k = int(next(it)), int(next(it))
    except StopIteration:
        print(0)
        return

    if N == 0:
        print(0)
        return
        
    # 构建邻接关系
    edges = [(int(next(it)), int(next(it)), int(next(it))) for _ in range(N)]
    children_map = {x: (None if y == -1 else y, None if z == -1 else z) for x, y, z in edges}
    
    # 收集所有出现过的节点值
    all_nodes = set(children_map.keys())
    for l, r in children_map.values():
        if l is not None: all_nodes.add(l)
        if r is not None: all_nodes.add(r)

    memo = {} # 记忆化缓存

    def find_longest_path(u):
        """
        递归函数，返回从节点u出发，下一步递增和递减的最长路径
        返回: (up_len, down_len)
        """
        if u in memo:
            return memo[u]

        left, right = children_map.get(u, (None, None))
        
        # 筛选满足“增”和“减”条件的子节点
        inc_children = [c for c in (left, right) if c is not None and c - u >= k]
        dec_children = [c for c in (left, right) if c is not None and u - c >= k]

        # 计算从u出发，下一步“递增”的最长路径
        # 如果选择递增，则子路径必须以“递减”开始
        up_len = 1 + max([find_longest_path(c)[1] for c in inc_children] or [0])
        
        # 计算从u出发，下一步“递减”的最长路径
        # 如果选择递减，则子路径必须以“递增”开始
        down_len = 1 + max([find_longest_path(c)[0] for c in dec_children] or [0])

        memo[u] = (up_len, down_len)
        return memo[u]

    # 路径可以从任何节点开始，因此需要遍历所有节点并找到最大值
    max_len = 0
    for node in all_nodes:
        up, down = find_longest_path(node)
        max_len = max(max_len, up, down)
        
    print(max_len)

if __name__ == "__main__":
    solve_tree_path()
```

### 逻辑解析

#### 1. 问题回顾与建模
*   **输入**：一棵由父子关系描述的二叉树，节点值唯一。
*   **规则**：寻找一条自上而下的路径，要求相邻节点值严格交替增减，且差值绝对值不小于 `k`。
*   **目标**：求满足条件的最长路径所包含的节点数。
*   **抽象**：对于每个节点 `u`，我们需要知道从它出发，下一步必须“递增”或“递减”时，能走出的最长交替路径长度。

#### 2. 核心状态与转移
*   **状态定义**：`dfs(u)` 返回一个二元组 `(up, down)`。
    *   `up`：从 `u` 出发，第一步必须走向值**更大**的子节点（差值 ≥ k），之后交替进行。此路径长度包含节点 `u`。
    *   `down`：从 `u` 出发，第一步必须走向值**更小**的子节点（差值 ≥ k），之后交替进行。此路径长度也包含节点 `u`。
    *   若无合法子节点，路径长度为 1（即节点 `u` 本身）。

*   **状态转移**：
    1.  找出所有值比 `u` 大且差值足够的子节点集合 `inc_children`。
    2.  找出所有值比 `u` 小且差值足够的子节点集合 `dec_children`。
    3.  计算 `up`：
        *   对于 `inc_children` 中的每个子节点 `c`，我们走过去后，下一步方向必须切换为“减”。因此，后续路径长度为 `dfs(c)[1]`（即 `down` 状态）。
        *   `up = 1 + max([dfs(c)[1] for c in inc_children])`。如果 `inc_children` 为空，则为 `1`。
    4.  计算 `down`：
        *   同理，对于 `dec_children` 中的每个子节点 `c`，后续路径长度为 `dfs(c)[0]`（即 `up` 状态）。
        *   `down = 1 + max([dfs(c)[0] for c in dec_children])`。如果 `dec_children` 为空，则为 `1`。

*   **最终答案**：由于路径可以从任意节点开始，最终答案是所有节点 `u` 的 `max(dfs(u))` 的最大值。

#### 3. 复杂度与边界
*   **时间复杂度**: `O(N)`，因为每个节点的 `(up, down)` 状态只通过记忆化计算一次。
*   **空间复杂度**: `O(N)`，主要用于存储邻接关系、记忆化字典和递归栈。
*   **边界情况**:
    *   空树或 `N=0`：输出 0。
    *   单节点树：`up=1`, `down=1`，答案为 1。
    *   无满足差值条件的边：候选子节点集为空，路径长度退化为 1。

---

## 第二题：新能源汽车最高总续航里程

### 问题描述
> 有从 1 到 `n` 按序编号的 `n` 辆纯电新能源汽车。给定一个总的电池容量 `k`，请根据每辆车的电池容量和续航里程，选出一个汽车组合，使得：
> 1.  组合内所有汽车的**电池容量总和不超过 `k`**。
> 2.  组合内所有汽车的**总续航里程最高**。

**输出要求**
*   按照编号从小到大输出所选组合中的汽车编号，以空格隔开。

**多解抉择规则**
1.  如果没有满足要求的组合，输出 `-1`。
2.  如果存在多个组合续航里程都达到最高，则选择**总电量最少**的组合。
3.  如果在满足前两点的前提下仍有多个组合，则选择**汽车数量最少**的组合。
4.  题目保证在上述所有前提下，最终仅有一组唯一解。

**输入格式**
*   第一行：整数 `n` (1-50)，表示汽车数量。
*   第二行：整数 `k` (1-1000)，表示总电池容量上限。
*   接下来 `n` 行：每行表示一辆车的信息，可能是两种格式之一：
    1.  `n` 行，每行是对应编号汽车的电池容量和续航里程，以空格分隔。
    2.  两行，第一行是 `n` 个电池容量，第二行是 `n` 个续航里程。

**样例 1**
```
5
80
30 400
45 470
15 200
15 200
80 870
```
**样例 2 (另一种输入格式)**
```
5
80
30 45 15 15 80
400 470 200 200 870
```
**样例输出**
```
1 2
```
**解释**:
最高续航里程为 870，可以通过组合 `(5)`、`(1,2)`、`(2,3,4)` 达到。
*   组合 `(5)`: 总电量 80, 数量 1
*   组合 `(1,2)`: 总电量 75, 数量 2
*   组合 `(2,3,4)`: 总电量 75, 数量 3
在续航里程相同的情况下，` (1,2)` 和 `(2,3,4)` 的总电量（75）最小。在这两个中，`(1,2)` 的汽车数量（2）更少。因此最终选择 `1 2`。

### 解决方案与代码

这是一个带有多重优化目标的 **0/1 背包问题**。
*   **背包容量**: 总电池容量 `k`
*   **物品**: `n` 辆车
*   **物品重量**: 每辆车的电池容量
*   **物品价值**: 每辆车的续航里程
*   **优化目标**:
    1.  `max(总续航)`
    2.  `min(总容量)`
    3.  `min(车辆数)`

我们可以使用动态规划解决。定义 `dp[c]` 为电池总容量**恰好**为 `c` 时的最优解信息。为了方便比较，我们将优化目标存储在一个元组中。

```python
import sys

def solve_ev_knapsack():
    """
    解决带多重约束的0/1背包问题
    """
    tokens = list(map(int, sys.stdin.read().split()))
    if not tokens:
        print(-1)
        return

    n, k = tokens[0], tokens[1]
    rest = tokens[2:]

    # 自动检测并解析两种不同的输入格式
    if len(rest) == 2 * n:
        # 格式1: n 行，每行 [容量, 续航]
        capacities = rest[0::2]
        distances = rest[1::2]
    else:
        # 格式2: 2 行，分别为 n 个容量和 n 个续航
        capacities = rest[:n]
        distances = rest[n:]

    # dp[c] 存储 (总续航, 总容量, 车辆数, 回溯前驱容量, 当前车辆编号)
    # 不可达状态的续航设为极小值
    UNREACHABLE = -1
    dp = [(UNREACHABLE, float('inf'), float('inf'), -1, -1)] * (k + 1)
    dp[0] = (0, 0, 0, -1, -1)  # 容量为0的初始状态

    # 遍历每辆车
    for i, (cap, dist) in enumerate(zip(capacities, distances), 1):
        # 从大到小遍历容量，确保每辆车只用一次
        for c in range(k, cap - 1, -1):
            prev_dist, prev_cap, prev_cnt, _, _ = dp[c - cap]

            # 如果前一个状态不可达，则无法转移
            if prev_dist == UNREACHABLE:
                continue

            # 候选新状态
            new_state = (prev_dist + dist, prev_cap + cap, prev_cnt + 1)
            
            # 当前状态
            current_state = (dp[c][0], dp[c][1], dp[c][2])

            # 比较规则：1. 续航越大越好 2. 容量越小越好 3. 数量越少越好
            # 通过将容量和数量取负，可以将三个比较统一为元组的字典序比较
            if (new_state[0], -new_state[1], -new_state[2]) > \
               (current_state[0], -current_state[1], -current_state[2]):
                dp[c] = (new_state[0], new_state[1], new_state[2], c - cap, i)

    # 在所有容量 <= k 的结果中找到最优解
    best_state = (UNREACHABLE, float('inf'), float('inf'))
    best_c = -1

    for c in range(k + 1):
        current_state = (dp[c][0], dp[c][1], dp[c][2])
        if (current_state[0], -current_state[1], -current_state[2]) > \
           (best_state[0], -best_state[1], -best_state[2]):
            best_state = current_state
            best_c = c

    # 如果最优解仍是初始不可达状态，则无解
    if best_state[0] == UNREACHABLE:
        print("-1")
        return

    # 从最优容量点开始回溯，找出选择的车辆
    selected_cars = []
    c = best_c
    while c > 0 and dp[c][4] != -1:
        _, _, _, prev_c, car_id = dp[c]
        selected_cars.append(car_id)
        c = prev_c

    # 按编号升序输出
    print(' '.join(map(str, sorted(selected_cars))))

if __name__ == "__main__":
    solve_ev_knapsack()
```

---

## 第三题：按位与图的最短环

### 问题描述
> 给你一个包含 `n` 个整数 `a_1, a_2, ..., a_n` 的序列。基于这些整数构建一个无向图：
> *   图中有 `n` 个节点，每个节点对应一个整数。
> *   当且仅当 `a_i & a_j ≠ 0` 时，节点 `i` 和节点 `j` (`i ≠ j`) 之间存在一条边。`&` 是按位与操作。
>
> 请找出该图中最短环的长度。环的最小长度为 3。如果图中没有环，输出 -1。

**输入格式**
*   第一行：一个整数 `n` (1 <= n <= 10^6)，表示数字个数。
*   第二行：`n` 个整数 `a_i` (0 <= a_i <= 10^18)，可能重复。

**样例 1**
```
10
448 0 112 0 0 0 28 260 3 0
```
**样例输出**
```
4
```
**解释**:
非零数为 `448, 112, 28, 260, 3`。
`448 & 112 ≠ 0`, `112 & 28 ≠ 0`, `28 & 260 ≠ 0`, `260 & 448 ≠ 0`。
这四个节点构成一个长度为 4 的环 `448-112-28-260-448`。

**样例 2**
```
4
1 2 4 8
```
**样例输出**
```
-1
```
**解释**:
`1, 2, 4, 8` 的二进制分别是 `0001, 0010, 0100, 1000`。它们之间两两按位与均为 0，没有边，无法构成环。

### 解决方案与代码

#### 核心观察与策略
1.  **节点连接性**：两个数按位与不为零，意味着它们的二进制表示在至少一位上都是 1。
2.  **鸽巢原理**：一个 64 位整数最多有 64 个置为 1 的位。如果我们将每个非零数看作它所有为 1 的位的集合，那么当非零数的数量足够多时，必然会产生密集的连接。
    *   如果两个数在同一位上都是 1，它们之间就有边。
    *   如果有三个数在同一位上都是 1，这三个数两两之间都有边，直接构成一个长度为 3 的环（三角形）。
    *   一个数最多可以出现在 64 个“位集合”中。如果我们有超过 `2 * 64 = 128` 个不同的非零数，根据图论的结论（一个图的最小度数 `δ` >= 2，则必有环），可以推断环的存在。更强的结论是：如果非零数超过某个较小的阈值（如 `130` 或 `192`），几乎必然存在长度为 3 的环。因此，我们可以设置一个阈值，当节点数超过该阈值时，直接判断最短环为 3。

3.  **算法策略**:
    *   首先，过滤掉所有 0，因为 0 与任何数按位与都是 0，不会形成边。
    *   如果剩余的非零数数量大于一个阈值（例如 192，即 `3 * 64`），则根据鸽巢原理，最短环长度几乎可以肯定是 3，直接输出 3。
    *   如果数量较少，则这是一个标准的图论问题。我们可以构建邻接表，然后对每个节点作为起点运行 **BFS** 来寻找最短环。

#### BFS 找最短环
*   从每个节点 `start` 开始进行 BFS。
*   在 BFS 过程中，维护 `dist` 数组记录起点到各节点的距离，以及 `parent` 防止立即返回。
*   当访问到一个邻居 `neighbor` 时：
    *   如果 `neighbor` 未被访问过 (`dist[neighbor] == -1`)，则正常更新距离并入队。
    *   如果 `neighbor` 已被访问过，并且它不是当前节点的直接父节点 (`parent != neighbor`)，说明我们通过一条新边 `(node, neighbor)` 连接到了两条从 `start` 出发的路径的末端，形成了一个环。
    *   环的长度为 `dist[node] + dist[neighbor] + 1`。
*   遍历所有可能的环，取最小值。

```python
import sys
from collections import deque

def solve_shortest_cycle():
    """
    寻找按位与图中非零数构成的最短环
    """
    try:
        n_str = sys.stdin.readline()
        if not n_str:
            print(-1)
            return
        n = int(n_str)
        
        nums_str = sys.stdin.readline()
        if not nums_str:
            print(-1)
            return
            
        # 过滤掉0，因为0不与任何数形成边
        nums = [x for x in map(int, nums_str.split()) if x > 0]
        n = len(nums)

        if n == 0:
            print(-1)
            return

        # 鸽巢原理优化：64位整数，若非零数过多，极有可能存在3-环
        # 阈值设为 130 已经足够保守
        if n > 130:
            print(3)
            return

        # 构建邻接表
        adj = [[] for _ in range(n)]
        for i in range(n):
            for j in range(i + 1, n):
                if nums[i] & nums[j] != 0:
                    adj[i].append(j)
                    adj[j].append(i)

        min_cycle = float('inf')

        # 对每个节点作为起点，用BFS寻找最短环
        for i in range(n):
            dist = [-1] * n
            parent = [-1] * n
            queue = deque([(i, 0)]) # (node, distance)
            dist[i] = 0

            head = 0
            while head < len(queue):
                u, d = queue[head]
                head += 1

                for v in adj[u]:
                    if v == parent[u]: # 避免立即返回父节点
                        continue
                    if dist[v] == -1:
                        dist[v] = d + 1
                        parent[v] = u
                        queue.append((v, d + 1))
                    else:
                        # 发现环，长度为 u到起点的距离 + v到起点的距离 + 1
                        min_cycle = min(min_cycle, d + dist[v] + 1)
        
        print(min_cycle if min_cycle != float('inf') else -1)

if __name__ == "__main__":
    solve_shortest_cycle()
```