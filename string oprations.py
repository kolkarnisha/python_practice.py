str="nishazareentaj"
print(str)
def strfind():
    for i in str:
        if i=="z":
            print(i)
            # print(i)
    # str.split()
    # for i in range(str):
    #     if i=="j":
    #         print(i)

strfind()


def reverse_string(s):
    rev = ""
    for char in s:
        rev = char + rev # add char to front
    return rev

text = input("Enter string: ")
print("Reversed:", reverse_string(text))



def reverse_string(s):
    return "".join(reversed(s))

text = input("Enter string: ")
print("Reversed:", reverse_string(text))



def is_palindrome(s):
    s = s.lower().replace(" ", "") # ignore case and spaces
    return s == s[::-1]

text = input("Enter string: ")
if is_palindrome(text):
    print("Palindrome")
else:
    print("Not Palindrome")





def is_palindrome(s):
    s = s.lower().replace(" ", "") # clean the string
    left, right = 0, len(s) - 1

    while left < right:
        if s[left]!= s[right]:
            return False
        left += 1
        right -= 1
    return True

text = input("Enter string: ")
print("Palindrome" if is_palindrome(text) else "Not Palindrome")




def find_index(text, target):
    for index, char in enumerate(text):
        if char == target:
            return index # returns first match
    return -1 # if not found

s = "nishazareentaj"
target = 'j'
result = find_index(s, target)
print(f"First '{target}' found at index: {result}")





def find_all_indexes(text, target):
    indexes = []
    for i in range(len(text)):
        if text[i] == target:
            indexes.append(i)
    return indexes

s = "zareentaj"
target = 'a'
result = find_all_indexes(s, target)
print(f"All indexes of '{target}': {result}")




def find_substring(text, sub):
    n = len(text)
    m = len(sub)
    for i in range(n - m + 1):
        if text[i : i + m] == sub: # check slice
            return i
    return -1

s = "python programming"
sub = "gram"
print(f"'{sub}' found at index:", find_substring(s, sub))
