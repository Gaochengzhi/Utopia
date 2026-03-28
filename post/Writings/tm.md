# 如何设计一个量化交易时间管理器?

很多交易系统的故事，都是从这样几行代码开始的：

```python
while True:
    await do_something()
    await asyncio.sleep(60)
```

第一天，这段代码看起来干净利落。

第二天，我们开始往里面塞逻辑：拉行情、算指标、下单、写日志。

第三天，我们想做回测，于是复制一份差不多的循环，把 `sleep(60)` 换成“快一点”的版本，注入一个过去的时间。再往后，实盘要跑、多策略要跑、风控要跑、监控要跑，每个模块都觉得自己有资格写一段这样的循环。

最后的结果是：**系统里有十几个不同的“时间观”**，有的按真实时间走，有的按回测进度走，有的 sleep 60 秒，有的 sleep 59.8 秒，还很难说清楚，到底是谁在驱动谁。

我们用自研量化系统中真实存在的 `core/time_manager.py` 为标本，一起把这个问题拆开看：为什么最终会走到“需要一个 TimeManager”的地步，它到底解决了什么问题，又是怎么一步步长成一个像样的“时间内核”的。

---

## 一、为什么光有 `sleep()` 不够

从工程的角度看，`sleep(n)` 最大的问题不是“不准确”，而是它默认了一种我们没有认真想清楚的模型：

> “时间是连续的，我们只是偶尔醒来做点事，然后再睡回去。”

这种模型在脚本层面是足够的，但一旦放到交易系统里，很快就会露出破绽。

一个简单的例子：我们想每分钟在整点处理一次数据。于是写出：

```python
while True:
    await handle()
    await asyncio.sleep(60)
```

假设 `handle()` 平均花 100ms，间歇性会因为网络慢掉到 500ms。理论上我们期望的 tick 序列是：

```python
00:00:00
00:01:00
00:02:00
...
```

而实际发生的是：

```python
00:00:00.100
00:01:00.200
00:02:00.300
...
```

这里只是一个线性的漂移。真正麻烦的是，当我们开始做回测时，这个循环彻底失效：**回测里，时间不是“向前自然流动”的，时间是我们自己推进的。**`sleep()` 在回测中根本没有语义。

于是我们开始在各个地方出现这样的分叉：

```python
if mode == "live":
    await asyncio.sleep(60)
else:
    # 回测模式下，直接推进虚拟时间
    backtest_time += timedelta(minutes=1)
```

一旦这种分叉出现了，就意味着系统里存在两套时间机制：一套是回测的 `backtest_time`，一套是实盘的 `datetime.now()`。某些地方用这个，某些地方用那个，偶尔还混在一起算统计。

我们不难想象往下的路线：越来越多的 `if live / if backtest`，越来越多的“特殊情况”。当这种 if/else 的数量超过某个阈值，系统就不再是“时间驱动”的，而是“条件驱动”的，我们只能不停补漏洞。

这个时候，问题已经不是如何写一个更聪明的 `sleep()` 了，而是要彻底换一个视角：

> “时间不是一个被动等待的背景，而是一个主动推进的对象。”

这就是 `TimeSource` 出现的原因。

---

## 二、先回答“时间是谁的”：TimeSource 的诞生

如果把整个系统想象成一个操作系统，那“谁来管理时间”就成了一个架构级的选择。

在 `core/time_manager.py` 里，这个角色被抽象成了一个极简的接口：

```python
class TimeSource(ABC):
    @abstractmethod
    async def now(self) -> datetime: ...

    @abstractmethod
    async def sleep_until(self, target: datetime) -> bool: ...

    @abstractmethod
    def is_finished(self) -> bool: ...

    @abstractmethod
    def needs_barrier(self) -> bool: ...
```

如果只看函数名，会觉得这不过是把 `datetime.now()` 和 `sleep()` 包了一层。但如果从“为什么要这么写”的角度看，每个方法背后都对应一个非常具体的设计决策。

### `now()`：统一时间源，切断“野生时间”

一旦我们决定所有人都必须通过 `TimeSource.now()` 获取当前时间，就等于宣布：系统里再也没有“野生的 `datetime.now()`”。这一刀切的副作用是明显的——旧代码要改、新模块不能偷懒——但换来的是一件非常重要的事情：回测和实盘可以共用一套策略代码，而不需要靠一堆 if/else 去区分。

在这个项目里，这个约定已经渗透进了很多地方：

- `LocalBackend` 模拟成交时，用 `await self._tm.now()` 记录订单时间和持仓更新时间。
- `CCXTBackend` 在和交易所交互时，也用同一个时间源补充本地状态。
- `TradeService` 做风险校验时，会调用 `get_time_manager().now()` 获取当前价格的查询时间。
- Web API `/api/time/now` 返回的时间，也是 TimeManager 的时间，而不是系统时间。

这样做的直接结果是：当我们把系统切到回测模式时，不需要修改这些业务逻辑，它们自然就会落在虚拟时间线上。

### `sleep_until(target)`：离散时间，而不是“睡多少秒”

第二个重要决策是，不再暴露“睡多久”的 API，而是改成“睡到什么时候”。

这一点在回测模式下尤其关键。回测不是“等 60 秒”，而是“把时间推进到下一根 K 线的开头”。在 `BacktestTimeSource` 里，这个语义被写得非常直接：

```python
async def sleep_until(self, target: datetime) -> bool:
    if target <= self.current:
        return True
    if target > self.end:
        self.current = self.end
        return False
    if self.wait_interval > 0:
        await asyncio.sleep(self.wait_interval)
    self.current = target
    return True
```

这里我们看到的不是“等待”，而是“推进”：只要 `target` 在时间窗口内，就把 `self.current` 直接赋值为 target。这意味着：

> 在回测中，“时间前进”这个行为，不再是操作系统负责，而是 TimeSource 主动完成。

从这个角度看，`sleep_until` 更像是一个“时间指针更新”操作，只是在实盘模式下，顺便走了一次真实世界里的 `sleep`。

### `is_finished()` 和 `needs_barrier()`：时间语义的元信息

`is_finished()` 很直观：回测有明确的终点，实盘没有。TimeManager 的主循环就靠这个条件决定是否退出。

`needs_barrier()` 则是一个更微妙的选择。它本质上在回答这样一个问题：

> “在这条时间线上，我们愿不愿意为了等待所有 handler 完成而停下来？”

回测模式下，答案是“必须愿意”。因为我们希望在 `T1` 时刻做出的决策，只依赖 `T1` 及之前的数据，而不掺杂任何未来的东西。所以 `BacktestTimeSource.needs_barrier()` 返回 True，TimeManager 会用一个严格的 `await asyncio.gather(...)` 等完所有订阅者，再推进到下一个 tick。

实盘模式下，答案刚好相反：真实时间绝不会为了某个 handler 卡住而停下来。于是 `LiveTimeSource.needs_barrier()` 返回 False，TimeManager 会让 SafeExecutor 来做保护，而时间本身继续向前走。

这两个布尔函数，看起来只是多了一点“配置”，实际是在把回测和实盘两个完全不同的世界观折叠进同一个接口里。

---

## 三、把连续时间切成离散事件：Tick、Schedule 和最小堆

有了统一的时间源之后，接下来要解决的问题是：

> “在什么时刻触发什么逻辑？”

在 `TimeManager` 的世界里，这个问题被拆解成两个具体的数据结构：一个叫 `Tick`，一个叫 `Schedule`。

### Tick：我们关心的其实只是“事件”，不是“时间轴上的每一秒”

在代码里，Tick 的定义是这样的：

```python
@dataclass
class Tick:
    timestamp: datetime
    interval: str
    sequence: int
    global_sequence: int
```

它背后的想法很朴素：我们真正关心的不是时间轴上的每一刻，而是那些“应该做事”的时刻。Tick 就是把连续的时间轴切成一系列离散的事件。

在时间管理器之外的世界里，我们看到的都是 Tick：

- 策略的 `@on_interval("1m")` handler 收到的是一个 Tick，而不是 `datetime`。
- `time.tick.1m` 这种消息总线事件的 payload 里，包含的也是 Tick 的序列号和时间戳。
- 统计信息里，`global_sequence` 用来描述“整个系统到目前为止总共执行了多少个 tick”。

Tick 这个数据结构本身没有什么“算法上的高明之处”，它的价值在于把上下游的语义收紧了：从此我们讨论的是“在第 123 个 1 分钟 tick 上做了什么”，而不是“在某个大概是 12:03:01 左右的时间做了什么”。

### Schedule：时间管理器真正操作的对象

如果说 Tick 是“已经发生的历史事件”，那么 Schedule 就是“未来事件表”：

```python
@dataclass
class Schedule:
    next_time: datetime
    interval: str
    sequence: int
    interval_td: timedelta

    def __lt__(self, other: "Schedule") -> bool:
        return self.next_time < other.next_time
```

TimeManager 内部维护了一个 `_schedule: List[Schedule]`，通过 `heapq` 把它变成一个最小堆。直观一点的画法大概是这样：

```python
       ┌──────────────────────────────────┐
       │          TimeManager            │
       │                                  │
       │  _schedule (min-heap)            │
       │                                  │
       │      [next_time, "1m",  seq]     │  ← top: 最近要发生的事件
       │      [next_time, "5m",  seq]     │
       │      [next_time, "1h",  seq]     │
       │      [next_time, "4h",  seq]     │
       │      ...                         │
       └──────────────────────────────────┘
```

主循环做的事，其实就是不断从这个堆里取出堆顶，推进时间到那一刻，然后把这个 interval 的下一次触发时间重新塞回堆里。

如果我们拿纸笔写，会是这样的伪代码：

```python
while not finished:
    s = heappop(schedule_heap)
    sleep_until(s.next_time)
    execute_handlers_for(s.interval)
    s_next = schedule_next(s)
    heappush(schedule_heap, s_next)
```

在这个模型里，复杂度几乎全被隐藏在 heap 的 `heappop`/`heappush` 两个操作里，都是 `O(log N)`。N 是订阅的 interval 个数，而不是 handler 数量。也就是说，我们可以在同一个 interval 下面挂非常多的 handler，而不担心时间调度的复杂度指数膨胀。

### 决定 tick 落在什么时间点：对齐规则的意义

主循环如果只写成“从当前时间加一个 interval”，又会回到最初的漂移问题。这个 TimeManager 选择了另外一种方式：始终把时间对齐到“网格点”上。

在 `utils/time_utils.py` 里，对齐逻辑被抽成了两个函数：

```python
def align_datetime_to_next_interval(dt: datetime, interval_td: timedelta) -> datetime:
    interval_seconds = int(interval_td.total_seconds())
    timestamp = int(dt.timestamp())
    next_timestamp = ((timestamp // interval_seconds) + 1) * interval_seconds
    return datetime.fromtimestamp(next_timestamp, tz=dt.tzinfo)

def align_datetime_to_current_interval(dt: datetime, interval_td: timedelta) -> datetime:
    interval_seconds = int(interval_td.total_seconds())
    timestamp = int(dt.timestamp())
    aligned_timestamp = (timestamp // interval_seconds) * interval_seconds
    return datetime.fromtimestamp(aligned_timestamp, tz=dt.tzinfo)
```

在 TimeManager 里，这两个函数被进一步封装进 `_align_first_fire`：

```python
def _align_first_fire(self, now, interval_td, start):
    if start == "next":
        return align_datetime_to_next_interval(now, interval_td)
    elif start == "current":
        t = align_datetime_to_current_interval(now, interval_td)
        return t if t >= now else now
    elif isinstance(start, datetime):
        t = align_datetime_to_next_interval(start, interval_td)
        return t if t >= now else align_datetime_to_next_interval(now, interval_td)
    return align_datetime_to_next_interval(now, interval_td)
```

从接口上看，`start` 支持三种写法：

- `"next"`：严格从下一个对齐边界开始。
- `"current"`：对齐当前边界，如果已经落后，就视为“现在就触发一次”。
- 具体的 `datetime`：从某个锚点开始对齐，但不会回到过去。

如果我们画成时间线，大致是这样：

```python
       ... |----|----|----|----|----|---->
          12:00 12:01 12:02 12:03 12:04

now = 12:01:34

start="next"    → first = 12:02:00
start="current" → first = 12:01:34 (因为已经错过 12:01:00)
start=12:00:10  → first = 12:01:00 （从锚点对齐，但不早于 now）
```

这个对齐规则看起来很“讲道理”，但真正重要的是它吸收了大量潜在的“特殊情况”。很多我们习惯用 if/else 写在外围的判断（是不是第一次 tick？是不是刚刚启动？是不是错过了当前周期？）都被压进了这个函数里面。

这就是“先把数据结构设计好，再讨论业务逻辑”的典型例子：一旦对齐规则足够清晰，上层就不需要到处写“如果是第一次，就怎么样”的代码。

---

## 四、异步世界里的时间：为什么需要 SafeExecutor 和 barrier

时间管理器的主循环只有几行：

```python
async def run(self):
    await self._initialize_schedule()
    self._started = True

    while not self.time_source.is_finished() and not self._stopping:
        if not self._schedule:
            await asyncio.sleep(0.1)
            continue

        next_schedule = heapq.heappop(self._schedule)
        arrived = await self.time_source.sleep_until(next_schedule.next_time)
        if not arrived or self._stopping:
            break

        self._current_time = next_schedule.next_time
        await self._execute_interval(next_schedule)

        if next_schedule.interval in self._subscribers and self._subscribers[next_schedule.interval]:
            self._schedule_next(next_schedule)
```

这几行背后的假设是：我们可以在“推进时间”和“执行 handler 逻辑”之间画出一条清晰的边界。

现实里真正棘手的是后面这一部分：

> “当我们在某个 tick 上执行一堆异步 handler 时，要不要等它们全部结束？如果有的超时了，要不要 cancel？如果某个 handler 一直在失败，要不要暂时让它冷静一下？”

这些问题如果直接由业务代码处理，会导致策略里布满 try/except 和手写的超时控制。TimeManager 在这里做了一个选择：用一个专门的模块来吸收这部分复杂度，这就是 `core/async_utils.py` 里的 `SafeExecutor`。

### SafeExecutor：把“怎么执行任务”从业务逻辑中剥离出来

SafeExecutor 做的事情可以用一张小图来概括：

```python
          ┌────────────────────────────┐
          │        TimeManager         │
          │                            │
          │  factories: [handler_i()]  │
          └────────────┬───────────────┘
                       │
                       ▼
          ┌────────────────────────────┐
          │        SafeExecutor        │
          │                            │
          │  超时 / 重试 / 熔断 / 统计   │
          └────────────┬───────────────┘
                       │
                       ▼
                 实际 handler 执行
```

在 TimeManager 的 `_execute_interval` 里，实盘模式的分支是这样写的：

```python
task_results = await self._executor.execute_batch(
    factories, names=names, return_exceptions=True
)
```

也就是说，TimeManager 只关心“在这个 tick 上我要执行哪些任务”，至于这些任务具体怎么被调度、有没有超时、要不要重试，这些细节全部交给 SafeExecutor。

在 `SafeExecutor.execute` 里，超时控制用的是一个分两段的策略：先用 `asyncio.wait_for` 控制主超时，再给任务一个小的 grace period 让它自己收尾，如果还不结束，就强制 cancel。与此同时，它还在维护一份简洁的状态统计：

```python
self.stats = {
    "total_tasks": 0,
    "successful": 0,
    "failed": 0,
    "timeout": 0,
    "retried": 0,
    "circuit_open": 0,
}
```

为什么要把这些东西抽到一个独立模块里？原因很简单：这些机制和业务逻辑无关，却很容易污染业务代码。把它们抽出来之后，时间管理器就可以坚定地做一件事：在正确的时间点，触发一次“任务执行”的请求，而不是卷入“任务怎么执行”的细节。

### 回测 vs 实盘：同一段代码，不同的时间哲学

真正体现回测/实盘差异的，是 `_execute_interval` 中的这个分支：

```python
if self.time_source.needs_barrier():
    coros = [factory() for factory in factories]
    results = await asyncio.gather(*coros, return_exceptions=True)
    ...
else:
    task_results = await self._executor.execute_batch(
        factories, names=names, return_exceptions=True
    )
    ...
```

我们可以把两种模式的时间哲学画成两条时间线：

```text
回测：

   T0 ---- handlers(1m) 完成 ---- T1 ---- handlers(1m) 完成 ---- T2 ---- ...
        ↑                                   ↑
        所有逻辑必须落在 T0..T1              所有逻辑必须落在 T1..T2

实盘：

   T0 ---- handlers 提交 ---- T1 ---- handlers 提交 ---- T2 ---- ...
        │                     │
        └── 有超时、有失败，但时间不回头
```

在回测中，“时间前进”和“任务完成”必须绑在一起，否则我们就会得到一个奇怪的世界：策略在处理 1 月 1 日数据时，已经偷偷看到了 1 月 2 日的行情。

在实盘中，时间是外部世界给我们的时钟，我们无权暂停它。我们能做的，只是在 handler 级别上尽可能做出隔离和保护。

同一段 `_execute_interval`，在两个模式下表现完全不同，关键就是 `needs_barrier()` 这个布尔函数。它本身没有逻辑，只是把“时间哲学”的选择从业务代码里抽离出来，交给了 TimeSource。

---

## 五、时间内核如何被其他模块“消费”

到目前为止，TimeManager 看起来还是一个“底层工具”。真正让它变成“时间内核”的，是它被其他模块使用的方式。

可以把整个系统的大致结构画成这样：

```text
                      ┌─────────────────────┐
                      │     TimeSource      │
                      │  (Live / Backtest)  │
                      └─────────┬───────────┘
                                │ now()/sleep_until()
                                ▼
                      ┌─────────────────────┐
                      │     TimeManager     │
                      │   heap + Tick +    │
                      │   SafeExecutor     │
                      └─────────┬──────────┘
             register()/tick    │    broadcast()
                                ▼
       ┌───────────────┬────────┴─────────┬──────────────────────┐
       ▼               ▼                  ▼                      ▼
  Strategy           TradeService      Backends              WebService
  (@on_interval)     (风控、下单)      (local/ccxt)          (/api/time/now)
```

每个模块和 TimeManager 的交互，都体现了同一个约束：**不要自己搞时间，直接认一个单一的时间内核。**

### 策略层：声明式订阅，而不是手写循环

在 `core/strategy.py` 里，策略不再直接写循环，而是用装饰器声明自己对时间的兴趣：

```python
@on_interval("1m", start="current")
async def on_1m(self, tick, ctx):
    ...
```

框架在 `Strategy.run()` 里，通过 `_ensure_registered()` 把这些方法注册进 TimeManager：

```python
tm = get_time_manager()
tm.register(
    interval=sub.interval,
    name=sub.name,
    handler=handler,
    start=sub.start,
)
```

这样，策略作者不用思考“循环怎么写”“对齐怎么做”，他们只需要接受一个 Tick 和一个上下文 dict，专注于“在这个 tick 上该做什么”。时间轴和调度被挪到了另一层。

更有趣的是运行期动态调度。策略可以在运行时调用：

```python
await self.schedule_runtime("5m", "my.runtime.task", handler, start="next")
```

内部实际做的事情只是：

```python
from core.time_manager import schedule_interval
schedule_interval(interval, name, handler, start)
```

`schedule_interval` 又会跳回全局的 `get_time_manager()`。这一圈，看似兜了一圈，实质上保证了一个事实：即便是运行期动态任务，也回到了同一套时间调度系统里，而不是“偷开一个新的循环”。

### 交易后端：本地模拟与真实交易所共用同一时间概念

`services/trade_service/backends/local.py` 是一个完全本地的撮合引擎，它在构造函数里做了两件事：

```python
self._tm = get_time_manager()
self.timer_id = f"local_backend.{id(self)}"
schedule_interval("1m", self.timer_id, self._on_1m_tick, start="current")
```

一个是缓存 TimeManager 实例，另一个是注册自己的 1 分钟定时任务。这个定时任务会驱动市价单撮合、限价单成交检查、止盈止损触发。这意味着：

> 本地模拟交易后端，不再自己跑“每分钟一次”的循环，而是挂在 TimeManager 的时间轴上。

`services/trade_service/backends/cctx.py` 里的 CCXT 后端也类似，只是它的定时器负责和真实交易所同步订单状态。

更重要的是，这些后端在所有需要时间戳的地方，都在用 `await self._tm.now()`。因此，无论是在本地回测还是对接真实交易所，订单和持仓的时间线都和 Tick 保持一致。

### Web 层：TimeManager 成为系统时间的对外接口

`services/web_service/routers/system.py` 里有一个小小的接口：

```python
@router.get("/api/time/now", response_model=ApiResponse[TimeResponse])
async def get_now():
    tm = get_time_manager()
    now = await tm.now()
    return ApiResponse(
        success=True,
        data=TimeResponse(timestamp=now.timestamp(), iso=now.isoformat()),
    )
```

表面上这是一个“健康监控”性质的 API，实际上是把 TimeManager 变成了整个系统对外暴露的“单一时间源”。前端无论是在看实盘，还是在看回测，都可以通过这个接口看到“系统认定的当前时间”。

当所有模块都在围绕同一个 TimeManager 组织自己的行为时，“时间”不再是散落在各处的工具函数，而是真正成了系统的一个内核。

---

## 六、收尾：一个“时间内核”的最小形态

站在最后回头看 `core/time_manager.py`，会发现它的实现并不花哨：

- 把“时间是谁的”抽象成 `TimeSource`，解决回测/实盘的根本差异。
- 用 `Tick` 和 `Schedule` 把“时间轴”变成离散事件和未来事件表。
- 用最小堆做调度，让多个 interval 和多个订阅者在同一条时间线上共存。
- 用 `SafeExecutor` 和 `needs_barrier()` 把“任务如何执行”和“时间如何前进”解耦。
- 最后通过消息总线把 Tick 广播出去，让其他服务可以在不依赖策略框架的情况下接入时间轴。

如果把这些元素用一块更简陋的 ASCII 图拼在一起，大概是这样的：

```text
           (Live / Backtest)
           ┌───────────────┐
           │   TimeSource  │
           └──────┬────────┘
                  │ now()/sleep_until()
                  ▼
        ┌─────────────────────┐
        │     TimeManager     │
        │  heap[Schedule...]  │
        │      │              │
        └──────┼──────────────┘
               │ Tick(interval, ts, seq)
      ┌────────┴────────┐
      ▼                 ▼
  Strategies        Services
 (@on_interval)   (Backends/Monitoring/...)
```

这个结构的好处不在于“多高级”，而在于足够简单，可以在脑子里完整地跑一遍，不会因为某个隐藏分支而突然改变语义。

更重要的是，一旦我们有了这样一个“时间内核”，很多看似完全不同的问题就可以用同一种方式解决：策略调度、订单同步、监控任务、系统心跳……它们不再需要各自维护一套时间观，而是都挂在同一个时间框架上。

如果回到文章开头那几行代码，再看一眼：

```python
while True:
    await do_something()
    await asyncio.sleep(60)
```

这段代码当然不是“错”的，只是在一个复杂系统里，它太容易长出一整片 if/else 的森林。我们真正想要的是把“什么时候做什么”这件事抽出来，变成一个可以推理、可以替换、可以回放的内核。

TimeManager 做的事情就是这样简单：它不关心策略赚不赚钱，不关心风控怎么写，只负责一个问题——在这一刻，谁应该被叫醒，Tick 应该长成什么样。

如果说有哪条经验值得记住，大概只有两条：

> 时间要统一到一个地方管理。  
> 调度要用数据结构表达，而不是靠一堆散落的循环和 if/else 支撑。

其它的细节，都可以在代码里慢慢打磨。