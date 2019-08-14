"""Test suite for eDAP library"""
import sys
from timeit import default_timer as timer
import edap

def to_ms(seconds: int) -> str:
	"""Convert seconds to miliseconds"""
	return str(round(seconds * 1000)) + ' ms'

def main():
	"""Main function"""
	full_start = timer()
	print("= 1/10 => edap.__init__() => ", end='')
	try:
		start = timer()
		student = edap.edap(
			user=sys.argv[1],
			pasw=sys.argv[2],
			return_processing_time=True)
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
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 3/10 => student.getSubjects() => ", end='')
	try:
		start = timer()
		_, x = student.getSubjects(0)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 4/10 => student.getTests() => ", end='')
	try:
		start = timer()
		_, x = student.getTests(0, alltests=True)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 5/10 => student.getInfoForUser() => ", end='')
	try:
		start = timer()
		_, x = student.getInfoForUser(0)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 6/10 => student.getGradesForSubject() => ", end='')
	try:
		start = timer()
		_, x = student.getGradesForSubject(0, 0)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 7/10 => student.getNotesForSubject() => ", end='')
	try:
		start = timer()
		_, x = student.getNotesForSubject(0, 0)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 8/10 => student.getAbsentOverviewForClass() => ", end='')
	try:
		start = timer()
		_, x = student.getAbsentOverviewForClass(0)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 9/10 => student.getAbsentFullListForClass() => ", end='')
	try:
		start = timer()
		_, x = student.getAbsentFullListForClass(0)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	print("= 10/10 => student.getConcludedGradeForSubject() => ", end='')
	try:
		start = timer()
		_, _, x = student.getConcludedGradeForSubject(0, 0)
		end = timer()
		print("SUCCEEDED [%s] [ex: %s]" % (to_ms(end - start), to_ms(x)))
	except edap.FatalLogExit as e:
		end = timer()
		print("FAILED (%s) [%s]" % (e, to_ms(end - start)))
		sys.exit(1)
	full_end = timer()
	print("=======> FINISHED TESTS IN %s" % to_ms(full_end - full_start))

if __name__ == "__main__":
	main()
