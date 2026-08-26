# 📘 Conceptual Questions
# What is the difference between a list and a tuple in Python?
#
# How does Python internally store lists?
#
# What is the time complexity of:
#
# Indexing a list element
#
# Appending an element
#
# Inserting at the beginning
#
# Removing an element
#
# How do shallow and deep copies of lists differ?
#
# How do lists compare with arrays in terms of performance and flexibility?
#
# What are list comprehensions, and why are they useful?
# 💻 Coding Challenges
# 1. Reverse a List
# python
def reverse_list(lst):
    return lst[::-1]

print(reverse_list([1, 2, 3, 4]))
# 2. Find the Largest Element
# python
def largest_element(lst):
    return max(lst)

print(largest_element([10, 25, 3, 7]))
# 3. Remove Duplicates
# python
def remove_duplicates(lst):
    return list(set(lst))

print(remove_duplicates([1, 2, 2, 3, 4, 4]))
# 4. Rotate a List
# python
def rotate_list(lst, k):
    k %= len(lst)
    return lst[-k:] + lst[:-k]

print(rotate_list([1, 2, 3, 4, 5], 2))
# 5. Find Pair with Given Sum
# python
def pair_sum(lst, target):
    seen = set()
    for num in lst:
        if target - num in seen:
            return (num, target - num)
        seen.add(num)
    return None

print(pair_sum([2, 7, 11, 15], 9))
# 6. Flatten a Nested List
# python
def flatten_list(nested):
    flat = []
    for sub in nested:
        flat.extend(sub)
    return flat

print(flatten_list([[1, 2], [3, 4], [5]]))
# 7. Find Missing Number in Sequence
# python
def missing_number(lst):
    n = len(lst) + 1
    total = n * (n + 1) // 2
    return total - sum(lst)

print(missing_number([1, 2, 4, 5]))
# 8. Find Second Largest Element
# python
def second_largest(lst):
    unique = list(set(lst))
    unique.sort()
    return unique[-2] if len(unique) >= 2 else None

print(second_largest([10, 20, 4, 45, 99]))
# 9. Check if List is Palindrome
# python
def is_palindrome(lst):
    return lst == lst[::-1]

print(is_palindrome([1, 2, 3, 2, 1]))
# 10. Merge Two Sorted Lists
# python
def merge_sorted_lists(a, b):
    i = j = 0
    merged = []
    while i < len(a) and j < len(b):
        if a[i] < b[j]:
            merged.append(a[i])
            i += 1
        else:
            merged.append(b[j])
            j += 1
    merged.extend(a[i:])
    merged.extend(b[j:])
    return merged

print(merge_sorted_lists([1, 3, 5], [2, 4, 6]))
# /11. Find Frequency of Each Element
python
def frequency_count(lst):
    freq = {}
    for item in lst:
        freq[item] = freq.get(item, 0) + 1
    return freq

print(frequency_count([1, 2, 2, 3, 3, 3]))
# 12. Find Intersection of Two Lists
# python
def intersection(a, b):
    return list(set(a) & set(b))

print(intersection([1, 2, 3, 4], [3, 4, 5, 6]))
# 13. Find Subarray with Maximum Sum (Kadane’s Algorithm)
# python
def max_subarray_sum(lst):
    max_sum = curr_sum = lst[0]
    for num in lst[1:]:
        curr_sum = max(num, curr_sum + num)
        max_sum = max(max_sum, curr_sum)
    return max_sum

print(max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]))
# 14. Find All Permutations of a List
# python
from itertools import permutations

def all_permutations(lst):
    return list(permutations(lst))

print(all_permutations([1, 2, 3]))
# 15. Find Common Elements in All Sublists
# python
def common_elements(lists):
    return list(set(lists[0]).intersection(*lists[1:]))

print(common_elements([[1, 2, 3], [2, 3, 4], [2, 3]]))
# 16. Find Majority Element (appears > n/2 times)
# python
def majority_element(lst):
    count = {}
    for num in lst:
        count[num] = count.get(num, 0) + 1
        if count[num] > len(lst)//2:
            return num
    return None

print(majority_element([3, 3, 4, 2, 3, 3, 5]))
# 17. Find All Subarrays
# python
def all_subarrays(lst):
    subs = []
    for i in range(len(lst)):
        for j in range(i+1, len(lst)+1):
            subs.append(lst[i:j])
    return subs

print(all_subarrays([1, 2, 3]))
# 18. Find Triplet with Given Sum
# python
def triplet_sum(lst, target):
    lst.sort()
    for i in range(len(lst)-2):
        l, r = i+1, len(lst)-1
        while l < r:
            s = lst[i] + lst[l] + lst[r]
            if s == target:
                return (lst[i], lst[l], lst[r])
            elif s < target:
                l += 1
            else:
                r -= 1
    return None

print(triplet_sum([1, 4, 45, 6, 10, 8], 22))
# 19. Find Longest Increasing Subsequence
# python
def lis(lst):
    dp = [1]*len(lst)
    for i in range(len(lst)):
        for j in range(i):
            if lst[i] > lst[j]:
                dp[i] = max(dp[i], dp[j]+1)
    return max(dp)

print(lis([10, 22, 9, 33, 21, 50, 41, 60]))
# 20. Find Equilibrium Index (sum left = sum right)
# python
def equilibrium_index(lst):
    total = sum(lst)
    left_sum = 0
    for i, num in enumerate(lst):
        total -= num
        if left_sum == total:
            return i
        left_sum += num
    return -1

print(equilibrium_index([1, 3, 5, 2, 2]))
# 21. Find Leaders in List (element greater than all to its right)
# python
def leaders(lst):
    result = []
    max_right = float('-inf')
    for num in reversed(lst):
        if num > max_right:
            result.append(num)
        max_right = max(max_right, num)
    return result[::-1]

print(leaders([16, 17, 4, 3, 5, 2]))
# 22. Find First Missing Positive
# python
def first_missing_positive(lst):
    s = set(lst)
    i = 1
    while i in s:
        i += 1
    return i

print(first_missing_positive([3, 4, -1, 1]))
# 23. Find Duplicate Number (Floyd’s Cycle Detection)
# python
def find_duplicate(lst):
    slow = fast = lst[0]
    while True:
        slow = lst[slow]
        fast = lst[lst[fast]]
        if slow == fast:
            break
    slow = lst[0]
    while slow != fast:
        slow = lst[slow]
        fast = lst[fast]
    return slow

print(find_duplicate([1, 3, 4, 2, 2]))
# 24. Find Maximum Product Subarray
# python
def max_product_subarray(lst):
    max_prod = min_prod = result = lst[0]
    for num in lst[1:]:
        choices = (num, num*max_prod, num*min_prod)
        max_prod, min_prod = max(choices), min(choices)
        result = max(result, max_prod)
    return result

print(max_product_subarray([2, 3, -2, 4]))
# 25. Find Longest Consecutive Sequence
# python
def longest_consecutive(lst):
    s = set(lst)
    longest = 0
    for num in s:
        if num-1 not in s:
            length = 1
            while num+length in s:
                length += 1
            longest = max(longest, length)
    return longest

print(longest_consecutive([100, 4, 200, 1, 3, 2]))
#26. Find All Combinations That Sum to Targe
def combination_sum(lst, target):
    result = []
    def backtrack(start, path, total):
        if total == target:
            result.append(path[:])
            return
        if total > target:
            return
        for i in range(start, len(lst)):
            path.append(lst[i])
            backtrack(i, path, total + lst[i])
            path.pop()
    backtrack(0, [], 0)
    return result

print(combination_sum([2, 3, 6, 7], 7))
# 27. Find Minimum in Rotated Sorted List
# python
def find_min_rotated(lst):
    left, right = 0, len(lst)-1
    while left < right:
        mid = (left+right)//2
        if lst[mid] > lst[right]:
            left = mid+1
        else:
            right = mid
    return lst[left]

print(find_min_rotated([4,5,6,7,0,1,2]))
# 28. Find Peak Element
# python
def find_peak(lst):
    left, right = 0, len(lst)-1
    while left < right:
        mid = (left+right)//2
        if lst[mid] < lst[mid+1]:
            left = mid+1
        else:
            right = mid
    return lst[left]

print(find_peak([1,2,1,3,5,6,4]))
# 29. Find Minimum Number of Jumps to Reach End
# python
def min_jumps(lst):
    jumps = 0
    cur_end = cur_farthest = 0
    for i in range(len(lst)-1):
        cur_farthest = max(cur_farthest, i+lst[i])
        if i == cur_end:
            jumps += 1
            cur_end = cur_farthest
    return jumps

print(min_jumps([2,3,1,1,4]))
# 30. Find Subarray with Given Sum (Sliding Window)
# python
def subarray_sum(lst, target):
    left, total = 0, 0
    for right in range(len(lst)):
        total += lst[right]
        while total > target:
            total -= lst[left]
            left += 1
        if total == target:
            return lst[left:right+1]
    return None

print(subarray_sum([1,4,20,3,10,5], 33))
# 31. Find Median of Two Sorted Lists
# python
def find_median_sorted_arrays(a, b):
    merged = sorted(a+b)
    n = len(merged)
    if n % 2 == 1:
        return merged[n//2]
    else:
        return (merged[n//2-1] + merged[n//2]) / 2

print(find_median_sorted_arrays([1,3], [2]))
# 32. Find Maximum Water Container (Two Pointers)
# python
def max_area(height):
    left, right = 0, len(height)-1
    max_area = 0
    while left < right:
        max_area = max(max_area, min(height[left], height[right])*(right-left))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_area

print(max_area([1,8,6,2,5,4,8,3,7]))
# 33. Find Minimum Window Subarray Covering All Elements
# python
def min_window(lst, target):
    from collections import Counter
    need = Counter(target)
    missing = len(target)
    left = start = end = 0
    for right, val in enumerate(lst, 1):
        if need[val] > 0:
            missing -= 1
        need[val] -= 1
        if missing == 0:
            while left < right and need[lst[left]] < 0:
                need[lst[left]] += 1
                left += 1
            if end == 0 or right-left < end-start:
                start, end = left, right
    return lst[start:end]

print(min_window([1,2,2,3,1,2,4,3], [2,3]))
# 34. Find Maximum Length Subarray with Equal 0s and 1s
# python
def max_equal_subarray(lst):
    count_map = {0: -1}
    count = max_len = 0
    for i, num in enumerate(lst):
        count += 1 if num == 1 else -1
        if count in count_map:
            max_len = max(max_len, i - count_map[count])
        else:
            count_map[count] = i
    return max_len

print(max_equal_subarray([0,1,0,1,1,1,0]))