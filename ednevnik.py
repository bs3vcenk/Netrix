#!/usr/bin/python3
import edap, sys
from tabulate import tabulate
from getpass import getpass

sver = "0.3"

def help():
	print("-debug\t\t\tEnable debug in EDAP module\n-alltests\t\tShow all tests instead of just from current date\n-loglevel 0/1/2/3\tSet log level (verbose/info/warning/error)\n-noanonrep\t\tDon't send anonymous error reports\n")
	sys.exit(0)

print("eDnevnikAndroid %s\n" % sver)
debug = "-debug" in sys.argv
alltests = "-alltests" in sys.argv
loglevel = int(sys.argv[sys.argv.index("-loglevel")+1]) if "-loglevel" in sys.argv else 1
help() if "-h" in sys.argv or "-help" in sys.argv else None
print("Please enter your credentials.\nDISCLAIMER: Your credentials are sent only to \"ocjene.skole.hr\"\nand are kept in memory only for the duration of the login process.\n")
user = input("Username: ")
pasw = getpass("Password: ")
dnevnik = edap.edap(user=user, pasw=pasw, debug=debug, loglevel=loglevel)
del pasw
del user
classes = dnevnik.getClasses()
cnum = 0
for x in classes:
	print("ID %s: class: %s, year: %s, school: %s, city: %s, classmaster: %s" % (cnum, x["class"], x["year"], x["school_name"], x["school_city"], x["classmaster"]))
	cnum += 1
sel = int(input("\nSelection (0 to %s): " % (cnum-1)))
print("\nSubjects:")
subs = dnevnik.getSubjects(sel)
for x in range(len(subs)):
	if subs[x]["professors"][0] != None:
		y = ', '.join(subs[x]["professors"])
	else:
		y = "None"
	print("ID: %s, subject: %s, professors: %s" % (x, subs[x]["subject"], y))
sel_2 = int(input("\nSelection (0 to %s): " % (len(subs)-1)))
dates = []
ocjene = []
status = []
for x in dnevnik.getGradesForSubject(sel,sel_2):
	dates.append(x[0])
	ocjene.append(int(x[2]))
	status.append(x[1])
print("")
print(tabulate({"Date":dates, "Subject":status, "Grade":ocjene}, headers="keys"))
avg1 = round(sum(ocjene)/len(ocjene), 2)
avg2 = round(avg1, 0)
print("\nAVERAGE FOR SUBJECT ID %s: %s (%s)" % (sel_2, str(avg2)[:1], avg1))
print("\nTests:\n")
subjnames = []
testsubjs = []
testdates = []
for x in dnevnik.getTests(sel, alltests=alltests):
	subjnames.append(x[0])
	testsubjs.append(x[1])
	testdates.append(x[2])
#print(subjnames)
print(tabulate({"Subject":subjnames,"Test subject":testsubjs,"Date":testdates}, headers="keys"))
