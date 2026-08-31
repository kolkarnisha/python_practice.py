#finding out a letter in a string
def find():
    str="nishazareentaj"
    target="i"
    for i in str:
        if i==target:
            return i
find()
#finding out index
def index():
    str="nishazareentaj"
    target="z"
    for i,j in enumerate(str):
        if j==target:
            return i
index()
#fiinding out all indexes of a target
def allindex():
    emptylist=[]
    str="nishazareentaj"
    target="a"
    for i in str:
        if i==target:
            emptylist.append(i)
    return emptylist
allindex()
def all(text,target):
    emptylist=[]
    for i in range(len(text)):
        if text[i]==target:
            emptylist.append(i)
    return emptylist
str="nishaaaaa"
target="a"
result=all(str,target)
print(f"all indexex of {target} is {result}")
# finding out substring starts at index
def substring(text,sub):
    m=len(text)
    n=len(sub)
    for i in range(m-n+1):
        if text[i:i+n]==sub:
            return i
    return -1
str="nishazareentaj"
sub="taj"
result=substring(str,sub)
print("substring",result)
def allindex(string,substring):
    india=string.find(substring)
    if india==-1:
        return "substring not found"
    return f"substring found at index {india}-{india+len(substring)-1}"
print(allindex("nishataj","taj"))
def loop(string,substring):
    m=len(string)
    n=len(substring)
    f=len(substring)-1
    for i in range(m-n+1):
        if string[i:i+n]==substring:
            endindex=i+f
            return f"substring found at index {i}--{endindex}"
    return "substring not found"
loop("nisha","ha")
def dict(string,substring):
    output={}
    m=len(string)
    n=len(substring)
    for i in range(m-n+1):
        if string[i:i+n]==substring:
            for j in range(n):
                output[substring[j]]=i+j
            return output
dict("nishataj","taj")
        
    


