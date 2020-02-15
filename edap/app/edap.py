"""A library for parsing CARNet's eDnevnik using BeautifulSoup."""
from datetime import datetime
import inspect, re, requests
from typing import List
try:
	from bs4 import BeautifulSoup
except ModuleNotFoundError as e:
	print("ERROR: BeautifulSoup isn't installed -- check the instructions and try again.")
	raise e

class eDAPError(Exception):
	"""Generic eDAP error."""

class WrongCredentials(eDAPError):
	"""Incorrect credentials"""

class ServerInMaintenance(eDAPError):
	"""Host (e-Dnevnik) is in maintenance mode"""

class NetworkError(eDAPError):
	"""Failed to connect to server"""

class InvalidResponse(eDAPError):
	"""Invalid response from server, e.g. no CSRF"""

class ParseError(eDAPError):
	"""Failed to parse HTML"""

class InvalidClassID(eDAPError):
	"""Non-existent class ID"""

class InvalidSubjectID(eDAPError):
	"""Non-existent subject ID"""

EDAP_VERSION = "H1"
__version__ = EDAP_VERSION

def _format_to_date(preformat_string: str, date_format: str = "%d.%m.%Y.") -> int:
	"""
		Formats a string into a UNIX timestamp.

		:param str preformat_string: Formatted date string
		:param str date_format: The format in which preFStr is provided
		:return: UNIX timestamp
		:rtype: int
	"""
	return int(datetime.strptime(preformat_string, date_format).timestamp())

class edap:
	"""
		eDnevnik scraping library.
	"""
	def __init__(self,
	             user: str,
	             pasw: str,
	             parser: str = "lxml",
	             edurl: str = "https://ocjene.skole.hr",
	             ua: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0 (https://netrix.io)",
	             debug: bool = False,
	             loglevel: int = 1,
	             hidepriv: bool = True,
	             hide_confidential: bool = True,
	             headers: dict = None):
		"""
			Authenticates the user to eDnevnik.

			== ARGUMENTS
			user - Username for eDnevnik
			pasw - Password for eDnevnik
			parser - The parser that will be used for BeautifulSoup (default: lxml)
			edurl - eDnevnik URL (default: https://ocjene.skole.hr)
			ua - User-Agent header (default: Firefox 72.0)
			debug - Enables/disables debug logging
			loglevel - Logging verbosity, can be 0-4
			hidepriv - Hide private info in logs
			hide_confidential - Enables hiding confidential information, such as OIB or address
			headers - HTTP headers to append to all requests
		"""
		self.parser = parser
		self.edurl = edurl
		self.user = user
		self.useragent = ua
		self.debug = debug
		self.loglevel = loglevel
		self.hidepriv = hidepriv
		self.hide_confidential = hide_confidential
		self.class_ids = []
		self.subject_ids = []
		self.subject_cache = {}
		self.absence_cache = {}
		self.session = requests.Session()
		self.session.headers.update({"User-Agent":self.useragent})
		if headers:
			self.__edlog(1, "Additional headers '%s' will be added to all requests" % ', '.join(headers))
			self.session.headers.update(headers)
		self.__edlog(0, "Sending initial request to obtain CSRF")
		try:
			r = self.session.get("%s/pocetna/prijava" % self.edurl)
			r.raise_for_status()
			self.csrf = self.session.cookies["csrf_cookie"]
		except (requests.exceptions.HTTPError, requests.exceptions.Timeout):
			raise NetworkError("%s/pocetna/prijava" % self.edurl)
		except KeyError:
			if "u nadogradnji" in r.text:
				raise ServerInMaintenance
			raise InvalidResponse("Can't get CSRF from initial request")
		self.__edlog(1, "Got CSRF: [{%s}]" % self.csrf)
		self.__edlog(1, "Trying to authenticate %s" % self.user)
		try:
			r = self.session.post("%s/pocetna/posalji/" % self.edurl,
			                      data={"csrf_token": self.csrf, "user_login": user, "user_password": pasw})
			r.raise_for_status()
			if ("Krivo korisničko ime i/ili lozinka." in r.text or
			    "Potrebno je upisati korisničko ime i lozinku." in r.text or
			    "nije pronađen u LDAP imeniku škole" in r.text or
			    "Neispravno korisničko ime." in r.text):
				raise WrongCredentials
		except (requests.exceptions.HTTPError, requests.exceptions.Timeout):
			raise NetworkError("%s/pocetna/posalji" % self.edurl)
		self.__edlog(1, "Authentication successful!")

	def __edlog(self, loglevel: int, logs: str):
		"""
			Logging function, logs to stdout.

			Log levels: 0/Verbose, 1/Info, 2/Warning, 3/Error, 4/FATAL.

			== ARGUMENTS
			loglevel - Level which is logged, can be 0-4
			logs - Log message
		"""
		if self.debug:
			if loglevel > 4:
				print("EDAP/Error: Unknown loglevel %s" % loglevel)
			# Map numerical levels to strings
			logl = ["Verbose", "Info", "Warning", "Error", "FATAL"]
			# Substitute text in "[{}]" with "PRIVATE" (only if hidepriv is True)
			if "[{" and "}]" in logs and self.hidepriv:
				logs = re.sub(r'\[\{.+?\}\]', '[PRIVATE]', logs)
			# Put the log string together
			log_string = "EDAP/%s/%s: %s" % (logl[loglevel], inspect.stack()[1].function, logs)
			# Print string if:
			# 	Debug mode is enabled (debug=True) AND
			# 	Log level is higher than or equal to minimum loglevel specified in __init__
			# 	OR Log level is Fatal (numerical: 4)
			if self.debug and loglevel >= self.loglevel or loglevel == 4:
				print(log_string)

	def __fetch(self, url: str) -> str:
		"""
			Simple internal function to fetch URL using stored session object
			and also raise an exception for non 2xx codes.

			== ARGUMENTS
			url - URL to fetch using self.session object
		"""
		try:
			o = self.session.get(url)
			o.raise_for_status()
			data = o.content.decode('utf-8')
			return data
		except (requests.exceptions.HTTPError, requests.exceptions.Timeout):
			raise NetworkError(url)

	def __verify(self, class_id: int, subject_id: int = None):
		"""
			Check if given `class_id` (and `subject_id`, if provided) exist.

			== ARGUMENTS
			class_id - Class ID to verify
			subject_id - Subject ID to verify
		"""
		self.__edlog(0, 'Verifying class_id:%s, subject_id:%s' % (class_id, subject_id))
		try:
			self.class_ids[class_id]
		except IndexError:
			self.__edlog(3, 'Class ID %s invalid' % class_id)
			raise InvalidClassID("Class ID %s not found; did you forget to run getClasses()?" % class_id)
		if subject_id:
			try:
				self.subject_ids[subject_id]
			except IndexError:
				self.__edlog(3, 'Subject ID %s invalid' % subject_id)
				raise InvalidSubjectID("Subject ID %s not found for class ID %s; did you forget to run getSubjects(%s)?" % (subject_id, class_id, class_id))

	def getClasses(self) -> List[dict]:
		"""
			Returns all classes offered by the post-login screen

			self.class_ids is populated and the IDs correspond to the indexes in the returned class list

			RETURNS: list of classes, formatted {class, year, school_name, school_city, classmaster}
		"""
		self.__edlog(1, "Listing classes for [{%s}]" % self.user)
		self.__edlog(0, "Getting class selection HTML")
		response = self.__fetch("%s/razredi/odabir" % self.edurl)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		classlist_preformat = soup.find_all("a", class_="class-wrap")
		self.__edlog(0, "Populating class list")
		classlist = []
		for i in classlist_preformat:
			try:
				x = i.find("div", class_="class").get_text("\n").split("\n")
			except AttributeError as e:
				raise ParseError(e)
			# x[0] -> class number and letter
			# x[1] -> school year
			# x[2] -> institution name, city
			# x[3] -> classmaster
			y = x[2].split(", ")
			# y[0] -> institution name
			# y[1] -> institution city
			classlist.append({
				"class":x[0],
				"year":x[1].replace("Školska godina ", ""),
				"school_name":y[0],
				"school_city":y[1],
				"classmaster":x[3].replace("Razrednik: ", "")
			})
			self.class_ids.append(i["href"].replace("/pregled/predmeti/", ""))
		self.__edlog(1, "Completed with %s classes found" % len(classlist))
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return classlist

	def getSubjects(self, class_id: int) -> List[dict]:
		"""
			Return list of subjects and professors for class ID "class_id"

			== ARGUMENTS
			class_id - Class ID to get subjects for

			RETURNS: list of subjects
		"""
		self.__verify(class_id)
		self.__edlog(1, "Getting subject list for class id %s (remote ID [{%s}])" % (class_id, self.class_ids[class_id]))
		response = self.__fetch("%s/pregled/predmeti/%s" % (self.edurl, self.class_ids[class_id]))
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		subjectlist_preformat = soup.find("div", id="courses").find_all("a")
		self.__edlog(0, "Populating subject list")
		subjinfo = []
		for i in subjectlist_preformat:
			if not i.has_attr('name'):
				self.__edlog(1, 'Object has no name attribute, skipping')
				continue
			try:
				x = i.find("div", class_="course").get_text("\n").split("\n")
			except AttributeError as e:
				self.__edlog(3, "HTML parsing error! [%s]" % (e))
			prof = ''.join(x[1:]).split(", ")
			if "/" in prof:
				self.__edlog(0, "Found empty professor string, replacing")
				prof[prof.index("/")] = None
			subjinfo.append({'subject':x[0].strip(), 'professors':prof})
			self.subject_ids.append(i["href"])
		self.__edlog(1, "Completed with %s subjects found" % len(subjinfo))
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return subjinfo

	def getTests(self, class_id: int, alltests: bool = False) -> List[dict]:
		"""
			Return list of tests

			== ARGUMENTS
			class_id - Class ID to get tests for
			alltests - Enable getting all tests instead of just ones from the current date

			RETURNS: list of tests, formatted as {subject, test name, date (Unix timestamp)}
		"""
		self.__verify(class_id)
		self.__edlog(1, "Getting test list for class id %s (corresponding to actual ID [{%s}])" % (class_id, self.class_ids[class_id]))
		if alltests:
			self.__edlog(1, "Full test list requested")
			addon = "/all"
		else:
			addon = ""
		response = self.__fetch("%s/pregled/ispiti/%s" % (self.edurl, str(self.class_ids[class_id]) + addon))
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			x = soup.find('table').find_all('td')
		except AttributeError:
			self.__edlog(1, "No tests remaining found")
			return []
		self.__edlog(1, "Formatting table into list")
		for i, item in enumerate(x):
			x[i] = item.getText()
		# First for loop (x[i:i+3] in ...) splits list into chunks containing 3 elements,
		# 	[0] or x in 2nd for loop => subject that the test is for
		# 	[1] or y in 2nd for loop => the subject of the test
		# 	[2] or z in 2nd for loop => the date of the test, formatted in dd.mm.yyyy., converted to UNIX timestamp
		final_returnable = [{"subject": x, "test": y, "date": _format_to_date(z)} for x, y, z in [x[i:i+3] for i in range(0, len(x), 3)]]
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return final_returnable

	def getGrades(self, class_id: int, subject_id: int) -> List[dict]:
		"""
			Return grade list (dict, values "date", "note" and "grade") for a subject_id

			== ARGUMENTS
			class_id - Class ID to narrow down subject selection
			subject_id - Subject ID to get grades for

			RETURNS: list of grades, formatted {date, note, grade}
		"""
		self.__verify(class_id, subject_id)
		self.__edlog(0, "Getting grade list for subject id %s, class id %s (remote IDs subject:[{%s}] and class:[{%s}])" % (subject_id, class_id, self.subject_ids[subject_id], self.class_ids[class_id]))
		if not self.subject_ids[subject_id] in self.subject_cache:
			self.__edlog(1, "Fetching subject %s from server" % subject_id)
			response = self.__fetch("%s%s" % (self.edurl, self.subject_ids[subject_id]))
			self.subject_cache[self.subject_ids[subject_id]] = response
		else:
			self.__edlog(1, "Fetching subject %s from cache" % subject_id)
			response = self.subject_cache[self.subject_ids[subject_id]]
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		grade_table = soup.find("table", id="grade_notes")
		if not grade_table:
			self.__edlog(1, "No grades found for this subject")
			return []
		# Find all table elements
		x = grade_table.find_all("td")
		# Get text from all elements and reassign the original element
		for i, item in enumerate(x):
			x[i] = item.getText().strip()
		# We have three elements that describe a grade: date, note and numerical grade
		# These elements should be in the same position:
		# 	1 => date DD.MM.YYYY.
		# 	2 => note
		# 	3 => num. grade
		# So what we need to do is turn it into a usable format -
		# First split the full list of elements into "chunks" of 3 elements
		grades_unfiltered = [x[i:i+3] for i in range(0, len(x), 3)] # Every three items get grouped into a list
		# Then assign elements to a dict (still assuming the above order is correct) (date
		# needs to be converted to UNIX)
		# Then add that dict to a list (we can do this in one line)
		final_returnable = [{"date": _format_to_date(y[0]), "note":y[1], "grade":int(y[2])} for y in grades_unfiltered]
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return final_returnable

	def getNotes(self, class_id: int, subject_id: int) -> List[dict]:
		"""
			Return note list (dict, values "date", "note") for a subject_id

			== ARGUMENTS
			class_id - Class ID to narrow down subject selection
			subject_id - Subject ID to get notes for

			RETURNS: list of grades, formatted {date, note}
		"""
		self.__verify(class_id, subject_id)
		self.__edlog(0, "Getting note list for subject id %s, class id %s (remote IDs subject:[{%s}] and class:[{%s}])" % (subject_id, class_id, self.subject_ids[subject_id], self.class_ids[class_id]))
		if not self.subject_ids[subject_id] in self.subject_cache:
			self.__edlog(1, "Fetching subject %s from server" % subject_id)
			response = self.__fetch("%s%s" % (self.edurl, self.subject_ids[subject_id]))
			self.subject_cache[self.subject_ids[subject_id]] = response
		else:
			self.__edlog(1, "Fetching subject %s from cache" % subject_id)
			response = self.subject_cache[self.subject_ids[subject_id]]
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		note_table = soup.find("table", id="notes")
		# This might not be needed since the note table might be shown
		# for every subject (unlike the grade table)
		if not note_table:
			self.__edlog(1, "No notes found for this subject")
			return []
		# Find all table elements
		x = note_table.find_all("td")
		# Get text from all elements and reassign the original element
		for i, item in enumerate(x):
			x[i] = item.getText().strip()
		# Instead of three, notes have only two elements that describe them:
		# date and note content
		# So we just group them into chunks of two, assuming this order:
		# 	1 => date DD.MM.YYYY.
		# 	2 => note content
		notes_unfiltered = [x[i:i+2] for i in range(0, len(x), 2)] # Every two items get grouped into a list
		# This is the more likely "notes empty"-check to occur
		if notes_unfiltered[0][0] == "Nema ostalih bilježaka":
			self.__edlog(1, "No notes found for this subject")
			return []
		# Do the dict assignment and date conversion in one line
		final_returnable = [{"date": _format_to_date(y[0]), "note":y[1]} for y in notes_unfiltered]
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return final_returnable

	def getConcludedGrade(self, class_id: int, subject_id: int):
		"""
			Return whether there is a concluded grade, and if there is one, return it.

			== ARGUMENTS
			class_id - Class ID to narrow down subject selection
			subject_id - Subject ID to get concluded grade for

			RETURNS: boolean indicating if there is a concluded grade for this subject, and concluded grade if it exists, formatted (bool, int)
		"""
		self.__verify(class_id, subject_id)
		self.__edlog(0, "Getting concluded grade for subject id %s, class id %s (corresponding to actual IDs subject:[{%s}] and class:[{%s}])" % (subject_id, class_id, self.subject_ids[subject_id], self.class_ids[class_id]))
		if not self.subject_ids[subject_id] in self.subject_cache:
			self.__edlog(1, "Fetching subject %s from server" % subject_id)
			response = self.__fetch("%s%s" % (self.edurl, self.subject_ids[subject_id]))
			self.subject_cache[self.subject_ids[subject_id]] = response
		else:
			self.__edlog(1, "Fetching subject %s from cache" % subject_id)
			response = self.subject_cache[self.subject_ids[subject_id]]
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			# Search the grade table for the concluded grade
			# TODO: Refactor this; use new table#grade_notes identifier like in getGrades
			x = soup.find("div", class_="grades").find("table").find_all("td", class_="t-center bold")[1].getText().strip()
		except AttributeError as e:
			raise ParseError(e)
		if x: # If not empty/NoneType, means there's text in that table element
			self.__edlog(0, "Got unformatted string: [{%s}]" % x)
			# Use some regex to extract the numerical grade between the parentheses
			result = re.search(r'\((.*)\)', x)
			if not result:
				raise ParseError('Regex failed to match %s' % x)
			self.__edlog(0, "Formatted string: [{%s}]" % result.group(1))
			self.__edlog(0, "Found concluded grade for this subject")
			return True, int(result.group(1))
		# Otherwise we have no concluded grade
		self.__edlog(0, "No concluded grade found for this subject")
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return False, None

	def getInfo(self, class_id: int) -> dict:
		"""
			Return the info on a eDnevnik user.

			== ARGUMENTS
			class_id - Class ID to get info for

			RETURNS: dict containing user info, formatted {number, name, oib, birthdate, birthplace, matbroj, address, program}
			WARNING: if `hide_confidential` is enabled (default), fields `oib`, `address` and `matbroj` will be ommitted from the returned object
		"""
		self.__verify(class_id)
		self.__edlog(0, "Getting info for class id %s" % class_id)
		response = self.__fetch("%s/pregled/osobni_podaci/%s" % (self.edurl, self.class_ids[class_id]))
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			# Get all elements in the info page
			x = soup.find("div", class_="student-details").find("table").find_all("td")
		except AttributeError as e:
			raise ParseError(e)
		# Create an object using the data we have
		user_data = {
			"number":int(x[0].getText()),
			"name":x[1].getText(),
			"oib":x[2].getText(),
			"birthdate":x[3].getText(),
			"birthplace":x[4].getText(),
			"matbroj":x[5].getText(),
			"address":x[6].getText(),
			"program":x[7].getText()
		}
		# If hiding confidential data (default), delete 'oib', 'address' & 'matbroj'
		if self.hide_confidential:
			del user_data['oib']
			del user_data['address']
			del user_data['matbroj']
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return user_data

	def getStudentNotes(self, class_id: int) -> dict:
		"""
			Return "Classmaster's notes"
		"""
		self.__verify(class_id)
		self.__edlog(0, "Getting CM notes for class id %s" % class_id)
		response = self.__fetch("%s/pregled/biljeske/%s" % (self.edurl, self.class_ids[class_id]))
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			# Get all content elements
			x = soup.find_all("div", class_="sectionText")
		except AttributeError as e:
			raise ParseError(e)
		# x[0] => informacije
		# x[1] => biljeske razrednika
		# x[2] => izvannastavne skolske aktivnosti
		# x[3] => izvanskolske aktivnosti
		# x[4] => vladanje
		# x[5] => pedagoske mjere
		data_object = {
			'measures': []
		}
		measure_table = x[5].find('table')
		if measure_table:
			self.__edlog(1, "Found pedagogic measures table, processing")
			measures_unproc = [x.getText() for x in measure_table.find_all('td')]
			measures_chunks = [measures_unproc[i:i+3] for i in range(0, len(measures_unproc), 3)] # Every three items get grouped into a list
			self.__edlog(1, "Processed %i measures" % len(measures_chunks))
			measures = []
			for chunk in measures_chunks:
				# chunk[0] => type of measure taken
				# chunk[1] => description or reason
				# chunk[2] => date in format YYYY-MM-DD
				measures.append({
					'type': chunk[0],
					'description': chunk[1],
					'date': _format_to_date(chunk[2], "%Y-%m-%d")
				})
			data_object['measures'] = measures
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return data_object

	def getAbsenceOverview(self, class_id: int) -> dict:
		"""
			Return an overview of classes marked absent for a given class ID. An absence overview
			contains only numbers of absent classes.

			== ARGUMENTS
			class_id - Class ID to get absence overview for

			RETURNS: dict containing an overview of absences, formatted {justified, unjustified, awaiting, sum, sum_leftover}
		"""
		self.__verify(class_id)
		self.__edlog(0, "Getting absent overview for class id %s" % class_id)
		if not self.class_ids[class_id] in self.absence_cache:
			self.__edlog(1, "Fetching absences from server")
			response = self.__fetch("%s/pregled/izostanci/%s" % (self.edurl, self.class_ids[class_id]))
			self.absence_cache[self.class_ids[class_id]] = response
		else:
			self.__edlog(1, "Fetching absences from cache")
			response = self.absence_cache[self.class_ids[class_id]]
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			x = soup.find("table", class_="legend").find_all("td")
		except AttributeError as e:
			raise ParseError(e)
		x_fix = []
		for x in x:
			if not x.find("img"): # Ignore all <img> tags
				x_fix.append(x.getText())
		final_returnable = {
			'justified': int(x_fix[0].replace("Opravdanih: ", "")),
			'unjustified': int(x_fix[1].replace("Neopravdanih: ", "")),
			'awaiting': int(x_fix[2].replace("Čeka odluku razrednika: ", "")),
			'sum': int(x_fix[3].replace("Ukupno: ", "")),
			'sum_leftover': int(x_fix[4].replace("Ukupno ostalo: ", ""))
		}
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return final_returnable

	def getAbsenceList(self, class_id: int) -> List[dict]:
		"""
			Return a full list of all marked absences for a given class ID.

			== ARGUMENTS
			class_id - Class ID to get absence list for

			RETURNS: list of dictionaries (sorted by day), dicts formatted {period, subject, reason, justified, absences}
		"""
		self.__verify(class_id)
		self.__edlog(0, "Getting absent list for class id %s" % class_id)
		if not self.class_ids[class_id] in self.absence_cache:
			self.__edlog(1, "Fetching absences from server")
			response = self.__fetch("%s/pregled/izostanci/%s" % (self.edurl, self.class_ids[class_id]))
			self.absence_cache[self.class_ids[class_id]] = response
		else:
			self.__edlog(1, "Fetching absences from cache")
			response = self.absence_cache[self.class_ids[class_id]]
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			x = soup.find_all("table")[1]
		except AttributeError as e:
			raise ParseError(e)
		except IndexError:
			self.__edlog(1, "No absences for this class")
			return []
		o = x.find_all("tr")[1:]
		abslist = []
		last_searched = 0
		for x in o:
			y = x.find_all("td", class_="datum")
			if y:
				spanning = int(y[0].get("rowspan"))
				abslist.append({
					'span': spanning,
					'loc': last_searched,
					'date': _format_to_date(y[0].getText("\n").split()[1])
				})
			last_searched += 1
		abslist2 = []
		for x in abslist:
			absLst = {'date':x['date'], 'absences':[]}
			for absence in o[x['loc']:x['loc']+x['span']]:
				absObj = {}
				absObj["period"] = absence.find("td", class_="sat").getText()
				absObj["subject"] = absence.find("td", class_="predmet").getText()
				absObj["reason"] = absence.find("td", class_="razlog").getText()
				absObj["justified"] = absence.find("td", class_="opravdano").find("img").get("alt") == "Opravdano"
				absLst['absences'].append(absObj)
			abslist2.append(absLst)
		self.__edlog(0, "Decomposing tree")
		soup.decompose()
		return abslist2
