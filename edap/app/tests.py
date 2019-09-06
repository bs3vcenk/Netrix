"""Test suite for eDAP library"""
import sys
from timeit import default_timer as timer
import edap

def to_ms(seconds: int) -> str:
	"""Convert seconds to miliseconds"""
	return str(round(seconds * 1000)) + ' ms'

def populate_data(obj):
	"""
		Fill in the 'data' part of the user dict. This will contain subjects, grades, etc.

		First, get the class list (this also fills the class ID list for eDAP).

		Second, get the list of tests for the first class, both current and full, and
		compare them, assigning a "current" flag to each which will say if the test
		has already been written or not.

		Third, get the subjects for a class, and get the grades for each one. If there
		is a concluded grade available, use it as the average, otherwise calculate an average.
		Get the list of "additional notes" for each subject.

		Fourth, write this data into the "classes" key in the dict.

		Fifth, get the user's personal info and write it into the "info" key in the dict.

		Finally, return all the collected data.
	"""
	start_full = timer()
	dataDict = {'classes':None, 'info':None}
	try:
		start = timer()
		output = obj.getClasses()
		end = timer()
		print('==> getClasses() => %s' % to_ms(end - start))
	except Exception as e:
		print("Error getting classes: %s" % e)
		sys.exit(1)

	try:
		start_fetch = timer()
		tests_nowonly = obj.getTests(0, alltests=False)
		tests_all = obj.getTests(0, alltests=True)
		end_fetch = timer()
		start_proc = timer()
		testId = 0
		for x in tests_all:
			if x not in tests_nowonly:
				x['current'] = False
			else:
				x['current'] = True
			x['id'] = testId
			testId += 1
		output[0]['tests'] = tests_all
		end_proc = timer()
		print('==> getTests() [fetch only] => %s' % to_ms(end_fetch - start_fetch))
		print('==> getTests() [processing] => %s' % to_ms(end_proc - start_proc))
	except Exception as e:
		print("Error getting tests for class: %s" % e)
		output[0]['tests'] = None

	try:
		start = timer()
		absences_overview = obj.getAbsentOverviewForClass(0)
		absences_full = obj.getAbsentFullListForClass(0)
		output[0]['absences'] = {'overview':absences_overview, 'full':absences_full}
		end = timer()
		print('==> getAbsent*ForClass() => %s' % to_ms(end - start))
	except Exception as e:
		print("Error getting absences for class: %s" % e)
		output[0]['absences'] = None

	try:
		start = timer()
		output[0]['subjects'] = obj.getSubjects(0)
		end = timer()
		print('==> getSubjects() => %s' % to_ms(end - start))
	except Exception as e:
		print("Error getting subjects for class: %s" % e)
		output[0]['subjects'] = None
	start = timer()
	allSubjAverageGrades = []
	for z in range(len(output[0]['subjects'])):
		output[0]['subjects'][z]['id'] = z
		try:
			output[0]['subjects'][z]['grades'] = obj.getGradesForSubject(0, z)
			if len(output[0]['subjects'][z]['grades']) == 0:
				output[0]['subjects'][z]['grades'] = None
			isconcl, concluded = obj.getConcludedGradeForSubject(0, z)
			if isconcl:
				output[0]['subjects'][z]['average'] = concluded
				allSubjAverageGrades.append(concluded)
			else:
				lgrades = []
				for i in output[0]['subjects'][z]['grades']:
					lgrades.append(i['grade'])
				output[0]['subjects'][z]['average'] = round(sum(lgrades)/len(lgrades), 2)
				allSubjAverageGrades.append(round(sum(lgrades)/len(lgrades), 0))
		except Exception as e:
			print("Error getting grades for subject %s: %s" % (z, e))
			output[0]['subjects'][z]['grades'] = None
			continue
		try:
			output[0]['subjects'][z]['notes'] = obj.getNotesForSubject(0, z)
			if len(output[0]['subjects'][z]['notes']) == 0:
				output[0]['subjects'][z]['notes'] = None
		except Exception as e:
			print("Error getting notes for subject %s: %s" % (z, e))
			output[0]['subjects'][z]['notes'] = None
			continue
	output[0]['complete_avg'] = round(sum(allSubjAverageGrades)/len(allSubjAverageGrades), 2)
	end = timer()
	print('==> grade, note & average fetch and processing => %s' % to_ms(end - start))
	dataDict['classes'] = output
	try:
		start = timer()
		dataDict['info'] = obj.getInfoForUser(0)
		end = timer()
		print('==> getInfoForUser() => %s' % to_ms(end - start))
	except Exception as e:
		print("Error getting info: %s" % (str(e)))
	end_full = timer()
	print('=======> populateData() simulation took: %s' % (to_ms(end_full - start_full)))

def main():
	"""Main function"""
	full_start = timer()
	total_processing_time = 0
	print("= 1/10 => edap.__init__() => ", end='')
	try:
		start = timer()
		student = edap.edap(
			user=sys.argv[1],
			pasw=sys.argv[2],
			return_processing_time=True,
			parser=PARSER)
		end = timer()
		print("SUCCEEDED [%s]" % (to_ms(end - start)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 2/10 => student.getClasses() => ", end='')
	try:
		start = timer()
		_, x = student.getClasses()
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 3/10 => student.getSubjects() => ", end='')
	try:
		start = timer()
		_, x = student.getSubjects(ID)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 4/10 => student.getTests() => ", end='')
	try:
		start = timer()
		_, x = student.getTests(ID, alltests=True)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 5/10 => student.getInfoForUser() => ", end='')
	try:
		start = timer()
		_, x = student.getInfoForUser(ID)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 6/10 => student.getGradesForSubject() => ", end='')
	try:
		start = timer()
		_, x = student.getGradesForSubject(ID, 0)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 7/10 => student.getNotesForSubject() => ", end='')
	try:
		start = timer()
		_, x = student.getNotesForSubject(ID, 0)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 8/10 => student.getAbsentOverviewForClass() => ", end='')
	try:
		start = timer()
		_, x = student.getAbsentOverviewForClass(ID)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 9/10 => student.getAbsentFullListForClass() => ", end='')
	try:
		start = timer()
		_, x = student.getAbsentFullListForClass(ID)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 10/10 => student.getConcludedGradeForSubject() => ", end='')
	try:
		start = timer()
		_, _, x = student.getConcludedGradeForSubject(ID, 0)
		end = timer()
		total_processing_time += x
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	full_end = timer()
	print("=======> FINISHED TESTS IN %s" % to_ms(full_end - full_start))
	print("=======> Total time spent processing data: %s" % to_ms(total_processing_time))
	print("=======> student.dump_data() output:")
	student.dump_data()

if __name__ == "__main__":
	ARGS = sys.argv[3:]
	if "--parser" in ARGS:
		PARSER = sys.argv[sys.argv.index('--parser')+1]
		print('= conf => Using %s as parser' % PARSER)
	else:
		PARSER = "lxml"
		print('= conf => Using default parser lxml')
	if "--type" in ARGS:
		TYPE = sys.argv[sys.argv.index('--type')+1]
		print('= conf => Testing with %s method' % TYPE)
	else:
		TYPE = 'bare'
		print('= conf => Testing bare eDAP library')
	if "--id" in ARGS:
		ID = int(sys.argv[sys.argv.index('--id')+1])
		print('= conf => Testing for subject ID %s' % ID)
	else:
		ID = 0
		print('= conf => Testing default subject ID 0')
	if TYPE == 'bare':
		main()
	elif TYPE == 'api':
		populate_data(edap.edap(sys.argv[1], sys.argv[2]))
