#!/usr/bin/python3
import edap, sys, edn_localization
from tabulate import tabulate
from getpass import getpass

sver = "0.6"
default_lang = "hr"

sel_lang = str(sys.argv[sys.argv.index("-lang")+1]) if "-lang" in sys.argv else default_lang

strings = edn_localization.Strings(lang=sel_lang)

def help():
	print(strings.Help)
	sys.exit(0)

print("eDnevnikAndroid %s\n" % sver)

## ARG CHECKING
debug = "-debug" in sys.argv
alltests = "-alltests" in sys.argv
loglevel = int(sys.argv[sys.argv.index("-loglevel")+1]) if "-loglevel" in sys.argv else 1
avgonly = "-fullavg" in sys.argv
hidepriv = not "-nohidepriv" in sys.argv
report = "-report" in sys.argv
help() if "-h" in sys.argv or "-help" in sys.argv else None # If -help

if report:
	reptext = ""

# Ask for creds
print(strings.CredentialPrompt)
user = input(strings.UsernamePrompt)
pasw = getpass(strings.PasswordPrompt)
# Init the module
try:
	dnevnik = edap.edap(user=user, pasw=pasw, debug=debug, loglevel=loglevel, hidepriv=hidepriv)
except edap.WrongCredentials:
	print(strings.WrongCredentials)
	sys.exit(1)
if report:
	reptext += "eDnevnikAndroid %s (EDAP %s)\n\n" % (sver, dnevnik.edap_version)
# Get list of all classes user has on profile
classes = dnevnik.getClasses()
cnum = 0
# Print out class selection, store it to sel variable
for x in classes:
	print(strings.ClassSelDisplay % (cnum, x["class"], x["year"], x["school_name"], x["school_city"], x["classmaster"]))
	cnum += 1
sel = int(input(strings.SelectionTemplate % (cnum-1)))
if report:
	reptext += strings.RepTextHeader % (classes[sel]["class"], classes[sel]["year"], classes[sel]["school_name"], x["school_city"], classes[sel]["classmaster"])
# If user requested only average
if avgonly and not report:
	subs = dnevnik.getSubjects(sel)
	fullgr = []
	for x in range(len(subs)):
		hasConcludedGrade, concludedGrade = dnevnik.getConcludedGradeForSubject(sel, x)
		if hasConcludedGrade:
			print("%s: %s (%s)" % (subs[x]["subject"], concludedGrade, strings.ConcludedGradeMinified))
			fullgr.append(concludedGrade)
		else:
			ocj = []
			for y in dnevnik.getGradesForSubject(sel, x):
				try:
					ocj.append(int(y[2]))
				except:
					pass
			if len(ocj) == 0:
				continue
			else:
				z = int(round(sum(ocj)/len(ocj), 0))
				print("%s: %s" % (subs[x]["subject"], z))
				fullgr.append(z)
	print(strings.AverageGradeMinified % round(sum(fullgr)/len(fullgr), 2))
	exit()
# Else ask for subject selection
if not report:
	print(strings.SubjectsHeader)
	subs = dnevnik.getSubjects(sel)
	for x in range(len(subs)):
		if subs[x]["professors"][0] != None:
			y = ', '.join(subs[x]["professors"])
		else:
			y = strings.NoProfessorsForSubject
		print(strings.SubjectSelDisplay % (x, subs[x]["subject"], y))
	sel_2 = int(input(strings.SelectionTemplate % (len(subs)-1)))
	dates = []
	ocjene = []
	status = []
	# Print out grades for selected subject (including reason/subject and date)
	xgrades = dnevnik.getGradesForSubject(sel,sel_2)
	if len(xgrades) > 0:
		for x in xgrades:
			dates.append(x[0])
			ocjene.append(int(x[2]))
			status.append(x[1])
		print("\n" + tabulate({strings.GradeDate:dates, strings.GradeSubject:status, strings.GradeNumber:ocjene}, headers="keys"))
		# Calculate avg for subject, round to 2 decimals and 0 decimals
		avg1 = round(sum(ocjene)/len(ocjene), 2)
		avg2 = round(avg1, 0)
		print(strings.AverageGrade % (str(avg2)[:1], avg1))
		hasConcludedGrade, concludedGrade = dnevnik.getConcludedGradeForSubject(sel, sel_2)
		if hasConcludedGrade:
			print(strings.ConcludedGrade % concludedGrade)
	else:
		print("\n" + strings.NoGradesForSubject)
	print(strings.TestsHeader)
	subjnames = []
	testsubjs = []
	testdates = []
	# Print out remaining or all tests
	for x in dnevnik.getTests(sel, alltests=alltests):
		subjnames.append(x[0])
		testsubjs.append(x[1])
		testdates.append(x[2])
	print(tabulate({strings.TestSchoolSubject:subjnames,strings.TestSubject:testsubjs,strings.TestDate:testdates}, headers="keys"))
else:
	# Get subjects
	subs = dnevnik.getSubjects(sel)
	concl = 0
	fullgr = []
	for x in range(len(subs)):
		if subs[x]["professors"][0] != None:
			y = ', '.join(subs[x]["professors"])
		else:
			y = strings.NoProfessorsForSubject
		print(strings.SubjectSelDisplay % (x, subs[x]["subject"], y))
		dates = []
		ocjene = []
		status = []
		reptext += "%s\n%s\n\n" % (subs[x]["subject"], y)
		# Print out grades for selected subject (including reason/subject and date)
		xgrades = dnevnik.getGradesForSubject(sel,x)
		if len(xgrades) > 0:
			for z in xgrades:
				dates.append(z[0])
				ocjene.append(int(z[2]))
				status.append(z[1])
			reptext += tabulate({strings.GradeDate:dates, strings.GradeSubject:status, strings.GradeNumber:ocjene}, headers="keys")
			# Calculate avg for subject, round to 2 decimals and 0 decimals
			avg1 = round(sum(ocjene)/len(ocjene), 2)
			avg2 = round(avg1, 0)
			reptext += "\n" + strings.AverageGrade % (str(avg2)[:1], avg1) + "\n"
			hasConcludedGrade, concludedGrade = dnevnik.getConcludedGradeForSubject(sel, x)
			if hasConcludedGrade:
				reptext += strings.ConcludedGrade % concludedGrade + "\n"
				fullgr.append(concludedGrade)
				concl += 1
			else:
				fullgr.append(int(str(avg2)[:1]))
			reptext += "\n\n\n"
		else:
			reptext += strings.NoGradesForSubject + "\n\n\n"
	reptext = reptext.replace("AVG_GRADE_PLACEHOLDER", strings.CurrentCompleteAverage % (str(round(sum(fullgr)/len(fullgr), 2)) + strings.CurrentCompleteAverageIncomplete if concl != len(fullgr) else "") )
	subjnames = []
	testsubjs = []
	testdates = []
	for x in dnevnik.getTests(sel, alltests=alltests):
		subjnames.append(x[0])
		testsubjs.append(x[1])
		testdates.append(x[2])
	reptext += tabulate({strings.TestSchoolSubject:subjnames,strings.TestSubject:testsubjs,strings.TestDate:testdates}, headers="keys")
	with open("report.txt", "wb") as f:
		f.write(reptext.encode("utf-8"))