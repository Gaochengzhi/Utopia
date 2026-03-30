克鲁齐先生最为感伤的章节之一是关于爱的问题的。事情似乎是，维多利亚时代的人对爱情评价很高，而我们这些具有现代复杂意识的人则已经看穿了它。“对疑心重重的维多利亚时代的人来说，爱情执行着一种功能，这种功能只有被抛弃了的上帝才会具有。面对爱情，许多甚至最为顽固不化的人，时间也变得神秘莫测了。





a=1.3 s=3.7 t=2.1 d=4.0





truck

a=1.2 s=4 t=2.1 d=4.0

a 1.2 2 1.0 1.4

b 1, 3,6 4.4

2.1 1 1.6 2,6

car

a=2 s=3 t=1.5 d=5 python3 f_value.py

a 2 2 1.5 2.5

d 5, 



count    681.000000
mean       8.115762
std        5.492928
min        0.480534
25%        3.963169
50%        6.904416
75%       11.080934
max       28.273712
dtype: float64



count    681.000000
mean       8.053827
std        5.421229
min        0.358611
25%        3.770567
50%        6.625646
75%       11.126781
max       26.922240
dtype: float64





810 慢 car

124 块 





```
  File "/home/linuxbrew/.linuxbrew/Cellar/python@3.11/3.11.2_1/lib/python3.11/site-packages/plexe/plexe.py", line 104, in step
    self.plexe.step(step)
  File "/home/linuxbrew/.linuxbrew/Cellar/python@3.11/3.11.2_1/lib/python3.11/site-packages/plexe/plexe_imp/plexe_sumo_eclipse.py", line 126, in step
    self._change_lane(vid, current, direction, safe)
  File "/home/linuxbrew/.linuxbrew/Cellar/python@3.11/3.11.2_1/lib/python3.11/site-packages/plexe/plexe_imp/plexe_sumo_eclipse.py", line 103, in _change_lane
    traci.vehicle.changeLane(vid, current + direction, 0)
  File "/home/linuxbrew/.linuxbrew/Cellar/python@3.11/3.11.2_1/lib/python3.11/site-packages/traci/_vehicle.py", line 1002, in changeLane
    self._setCmd(tc.CMD_CHANGELANE, vehID, "tbd", 2, laneIndex, duration)
  File "/home/linuxbrew/.linuxbrew/Cellar/python@3.11/3.11.2_1/lib/python3.11/site-packages/traci/domain.py", line 164, in _setCmd
    self._connection._sendCmd(self._cmdSetID, varID, objectID, format, *values)
  File "/home/linuxbrew/.linuxbrew/Cellar/python@3.11/3.11.2_1/lib/python3.11/site-packages/traci/connection.py", line 171, in _sendCmd
    packed = self._pack(format, *values)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/linuxbrew/.linuxbrew/Cellar/python@3.11/3.11.2_1/lib/python3.11/site-packages/traci/connection.py", line 128, in _pack
    packed += struct.pack("!Bb", tc.TYPE_BYTE, int(v))
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
struct.error: byte format requires -128 <= number <= 127
Error: tcpip::Socket::recvAndCheck @ recv: peer shutdownCT 3 BUF 1)
Quitting (on error).
malloc_consolidate(): unaligned fastbin chunk detected
```



