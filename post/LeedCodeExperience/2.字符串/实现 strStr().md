---
title: 实现 strStr()
toc: 实现 strStr()
date: 2020-12-19 10:08:20
tags: algorithm
---

#  实现 strStr()
## It's so weird for language like Java to do this problem
Implement strStr().

Return the index of the first occurrence of needle in haystack, or -1 if needle is not part of haystack.


> Example

``` java
Input: haystack = "hello", needle = "ll"
Output: 2
```
```java
Input: haystack = "aaaaa", needle = "bba"
Output: -1           
```
> What should we return when needle is an empty string? This is a great question to ask during an interview.

> For the purpose of this problem, we will return 0 when needle is an empty string. This is consistent to C's strstr() and Java's indexOf().

## 俺的（0 ms）


```java
class Solution {
   public int strStr(String haystack, String needle) {
		if ( needle == "" ) {
			return 0;
		}
       
		return haystack.indexOf(needle);
    }
}
```
好奇怪啊，题目所要求的功能java已经被内置在string类里面了，那当然是用官方的快了。

## 1 ms

```java
class Solution {
    public int strStr(String haystack, String needle) {
        if (haystack != null && needle != null) {

            if (needle.equals(haystack)) {
                return 0;
            }
            
            int l1 = haystack.length();
            int l2 = needle.length();
            if (l1 >= l2) {
                for (int i = 0; i < l1; i++) {
                    if ((l1 - i) >= l2 && haystack.substring(i, i + l2).equals(needle)) {
                        return i;
                    }
                }
            }
        }

        return -1;
    }
}
```

### Java substring() 方法
substring() 方法返回字符串的子字符串。

#### 语法
```java
public String substring(int beginIndex)

或

public String substring(int beginIndex, int endIndex)
```

#### 参数

```java
beginIndex -- 起始索引（包括）, 索引从 0 开始。

endIndex -- 结束索引（不包括）。
```
#### 例子
```java
public class Test {
    public static void main(String args[]) {
        String Str = new String("www.runoob.com");
 
        System.out.print("返回值 :" );
        System.out.println(Str.substring(4) );
 
        System.out.print("返回值 :" );
        System.out.println(Str.substring(4, 10) );
    }
}

返回值 :runoob.com
返回值 :runoob
```
