#finding out target
#strings
str="nishazareentaj"
for i in str:
   if i=="a":
     print(i)

'''finding out a fixed target '''
def find():
  str="nisha"
  target="a"
  for i in str:
    if i==target:
      print(i)
find()
'''finding out a index of a target'''
def index():
  str="nisha"
  target="a"
  for i,j in enumerate(str):
    if j==target:
      print(i)
index()
'''find all indexes of target'''
def allindex(text,target):
  empty=[]
  for i in range(len(text)):
    if text[i]==target:
      empty.append(i)
  print(empty)
str="nishazareentaj"
target="a"
allindex(str,target)
print(f'all indexes of target {target} is',allindex(str,target))
'''finding out a substring'''
def substr(str,sub):
  m=len(str)
  n=len(sub)
  for i in range(m-n+1):
    if str[i:i+n]==sub:
      print(i)
      print(f"substring {sub} found at index {i}")
str="nishataj"
sub="taj"
substr(str,sub)
# print(f"substring {sub} found at index ",substr(str,sub))
''' finding out indexes of substring
find start to end index'''
def sei(str,sub):
  india=str.find(sub)
  if india==-1:
    print("substring not found")
  print(f"substring found at index {india} to- {india+len(sub)-1}")
sei("nishataj","taj")

  
