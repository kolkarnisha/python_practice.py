def reverse_string(s):
    return "".join(reversed(s))

text = input("Enter string: ")
print("Reversed:", reverse_string(text))



def reverse_string(s):
    rev = ""
    for char in s:
        rev = char + rev # add char to front
    return rev

text = input("Enter string: ")
print("Reversed:", reverse_string(text))


def reverse():
    str="nisha"
    reversed_str=" "
    for i in str:
        reversed_str=i+reversed_str
    print(f"reversed string is {reversed_str}")
reverse()


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
