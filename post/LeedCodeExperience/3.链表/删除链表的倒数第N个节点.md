---
title: 删除链表的倒数第N个节点
toc: 删除链表的倒数第N个节点
date: 2020-12-19 10:08:20
tags: algorithm
---
# 删除链表的倒数第N个节点

## Finally get what the ListNode is about

Given a linked list, remove the *n*-th node from the end of list and return its head.

**Example:**

```java
Given linked list: 1->2->3->4->5, and n = 2.

After removing the second node from the end, 
the linked list becomes 1->2->3->5.
```

**Note:**

Given *n* will always be valid.

**Follow up:**

Could you do this in one pass?

## Mine ( 2 ms  \_(:з」∠)\_ )

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) { val = x; }
 * }
 */
class Solution {
    public int len(ListNode head){
        int length = 1;
        while (head.next != null) {
            head = head.next;
            length++;
        }
        return length;
    }
    
    
    public ListNode removeNthFromEnd(ListNode head, int n) {
        int length = this.len(head);
        ListNode temp = head;
        int currentPos = 0;
        
        lable_a:
        while (temp != null) {
            if (length==n){
                    head=head.next;
                    break lable_a;
            }
            
            //找到上一个节点的位置了
            if ((length-n-1) == currentPos) {
                
                //temp表示的是上一个节点
                
                //temp.next表示的是想要删除的节点

                //将想要删除的节点存储一下
                ListNode deleteNode = temp.next;

                //想要删除节点的下一个节点交由上一个节点来控制
                temp.next = deleteNode.next;

            }
            currentPos++;
            temp = temp.next;
        }
        
        return head;
    }
}
```



## Standard Answer ( 0ms ) 

```java
/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) { val = x; }
 * }
 */
class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode fast = head, slow = head;
        for (int i = 0; i < n; i ++) {
            if (fast != null) {
                fast = fast.next;
                continue;
            }
            throw new IllegalArgumentException("n is invalid");
        }
        if (fast == null) {
            return slow.next;
        }
        while (fast.next != null) {
            fast = fast.next;
            slow = slow.next;
        }
       
        slow.next = slow.next.next;
        
        return head;
    }
}
```

> 这个乍一看很反常，但是实验一下确实是对的，但是我不明白 slow 是怎么影响 head？
>
> 后来一想 class 天生就是引用值嘛。。
