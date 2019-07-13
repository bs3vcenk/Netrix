# eDnevnikAndroidProject - main library
import sys, inspect, re, requests
try:
	from bs4 import BeautifulSoup
except ModuleNotFoundError:
	print("ERROR: BeautifulSoup isn't installed -- check the instructions and try again.")
	sys.exit(1)

if sys.version[0] == "2":
	print("ERROR: eDAP does not support Python 2! Upgrade to Python 3 to use eDAP.")
	sys.exit(1)

class FatalLogExit(Exception):
	pass

class WrongCredentials(Exception):
	pass

edap_version = "B2"

class edap:
	def __init__(self, user, pasw, parser="html.parser", edurl="https://ocjene.skole.hr", useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0", debug=False, loglevel=1, anon_err_report=True, hidepriv=True, log_func_name=True, redirect_log_to_file=False, hideConfidential=True):
		"""
			Initialization function

			Authenticates user for further actions.

			ARGS: user [str/required], pasw [str/required], parser [str/optional],
			      edurl [str/optional], useragent [str/optional], debug [bool/optional],
			      loglevel [int/optional], hidepriv [bool/optional], log_func_name [bool/optional],
			      redirect_log_to_file [str|bool/optional], hideConfidential [bool/optional]
		"""
		self.anon_err_report = anon_err_report
		self.parser = parser
		self.edurl = edurl
		self.user = user
		self.useragent = useragent
		self.debug = debug
		self.loglevel = loglevel
		self.hidepriv = hidepriv
		self.log_func_name = log_func_name
		self.hideConfidential = hideConfidential
		if redirect_log_to_file != False:
			save_std = sys.stdout
			sys.stdout = open(redirect_log_to_file, "w")
		print("=> EDAP (eDnevnikAndroidProject) %s" % edap_version)
		self.__edlog(1, "Init variables: anon_err_report=%s, parser=%s, edurl=%s, user=[{%s}], useragent=%s, debug=%s, loglevel=%s, hidepriv=%s, log_func_name=%s" %
			(self.anon_err_report, self.parser, self.edurl, self.user, self.useragent, self.debug, self.loglevel, self.hidepriv, self.log_func_name))
		self.__edlog(1, "Initializing requests.Session() object")
		try:
			self.session = requests.Session()
			self.session.headers.update({"User-Agent":self.useragent})
		except Exception as e:
			self.__edlog(4, "For some reason, session object init failed. (%s)" % e)
		self.__edlog(1, "Getting CSRF")
		try:
			r = self.session.get("%s/pocetna/prijava" % self.edurl)
			r.raise_for_status()
			self.csrf = self.session.cookies["csrf_cookie"]
		except Exception as e:
			self.__edlog(4, "Failed to connect to eDnevnik (%s)" % e)
		self.__edlog(1, "Got CSRF: [{%s}]" % self.csrf)
		self.__edlog(1, "Trying to authenticate %s" % self.user)
		try:
			t = self.session.post("%s/pocetna/posalji/" % self.edurl, data={"csrf_token":self.csrf, "user_login":user, "user_password":pasw})
			t.raise_for_status()
			if "Krivo korisničko ime i/ili lozinka." in t.text or "Potrebno je upisati korisničko ime i lozinku." in t.text:
				raise WrongCredentials
		except requests.HTTPError as e:
			self.__edlog(4, "Failed to connect to eDnevnik (%s)" % e)
		self.__edlog(1, "Authentication successful!")

	def __edlog(self, loglevel, logs):
		"""
			Logging function

			Log levels: 0/Verbose, 1/Info, 2/Warning, 3/Error, 4/FATAL.
			Level 4 exits the script.

			ARGS: loglevel [int/required], logs [str/required]
		"""
		if self.debug and loglevel >= self.loglevel or loglevel == 4:
			if loglevel > 4:
				print("EDAP/Error: Unknown loglevel %s" % loglevel)
			logl = ["Verbose", "Info", "Warning", "Error", "FATAL"]
			if "[{" and "}]" in logs and self.hidepriv:
				logs = re.sub(r'\[\{.+?\}\]', '[PRIVATE]', logs)
			print("EDAP/%s/%s: %s" % (logl[loglevel], inspect.stack()[1].function, logs))
			if loglevel == 4:
				raise FatalLogExit

	def __fetchUrl(self, url):
		o = self.session.get(url)
		o.raise_for_status()
		return o.text

	def getClasses(self):
		"""
			Returns all classes offered by the post-login screen

			self.class_ids is populated and the IDs correspond exactly to the indexes in the returned class list

			output: [{"subject":name, "professors":[name, name, name...]}]

			ARGS: none
		"""
		self.__edlog(1, "Listing classes for [{%s}]" % self.user)
		self.__edlog(0, "Getting class selection HTML")
		try:
			response = self.__fetchUrl("%s/razredi/odabir" % self.edurl)
		except Exception as e:
			self.__edlog(4, "Failed getting class selection HTML (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		classlist_preformat = soup.find_all("a", class_="class-wrap")
		self.__edlog(0, "Populating class list")
		classlist = []
		self.class_ids = []
		for i in classlist_preformat:
			# Shitty parsing time!
			x = i.find("div", class_="class").get_text("\n").split("\n")
			# x[0] -> class number and letter
			# x[1] -> school year
			# x[2] -> institution name, city
			# x[3] -> classmaster
			y = x[2].split(", ")
			# y[0] -> institution name
			# y[1] -> institution city
			classlist.append({"class":x[0], "year":x[1].replace("Školska godina ", ""), "school_name":y[0], "school_city":y[1], "classmaster":x[3].replace("Razrednik: ", "")})
			self.class_ids.append(i["href"].replace("/pregled/predmeti/", ""))
		self.__edlog(1, "Completed with %s classes found" % len(classlist))
		return classlist

	def getSubjects(self, class_id):
		"""
			Return list of subjects and professors for class ID "class_id"

			ARGS: class_id [int/required]
		"""
		self.__edlog(1, "Getting subject list for class id %s (remote ID [{%s}])" % (class_id, self.class_ids[class_id]))
		try:
			response = self.__fetchUrl("%s/pregled/predmeti/%s" % (self.edurl, self.class_ids[class_id]))
		except Exception as e:
			self.__edlog(4, "Failed getting subject list (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		subjectlist_preformat = soup.find_all("div", id="courses")
		#print(subjectlist_preformat)
		sl2 = subjectlist_preformat[0].find_all("a")
		self.__edlog(0, "Populating subject list")
		self.subject_ids = []
		subjinfo = []
		for i in sl2:
			try:
				h = i.find("div", class_="course").get_text("\n").split("\n")
			except Exception as e:
				self.__edlog(3, "HTML parsing error! [%s] Probably new grade notification, attempting workaround..." % (e,i))
				h = i.find_all("div", class_="course")[1].get_text("\n").split("\n")
			prof = ''.join(h[1:]).split(", ")
			try:
				t = prof.index("/")
				self.__edlog(0, "Found empty professor string, replacing")
				prof[t] = None
			except ValueError:
				self.__edlog(0, "No empty professor string found, continuing normally")
			subjinfo.append({'subject':h[0].strip(), 'professors':prof})
			self.subject_ids.append(i["href"])
		self.__edlog(1, "Completed with %s subjects found" % len(subjinfo))
		return subjinfo

	def getTests(self, class_id, alltests=False):
		"""
			Return list of tests

			format: [subject, test name, date (DD.MM.YYYY)]

			ARGS: class_id [int/required], alltests [bool/optional]
		"""
		self.__edlog(1, "Getting test list for class id %s (corresponding to actual ID [{%s}])" % (class_id, self.class_ids[class_id]))
		if alltests:
			self.__edlog(1, "Full test list requested")
			addon = "/all"
		else:
			addon = ""
		try:
			response = self.__fetchUrl("%s/pregled/ispiti/%s" % (self.edurl, str(self.class_ids[class_id]) + addon))
		except Exception as e:
			self.__edlog(4, "Failed getting test list (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			table = soup.find('table')
		except Exception as e:
			self.__edlog(4, "HTML parsing error! [%s] Target data follows:\n\n%s" % (e,soup))
		try:
			xtab = table.find_all('td')
		except AttributeError:
			self.__edlog(1, "No tests remaining found")
			return []
		self.__edlog(1, "Formatting table into list")
		for i in range(len(xtab)):
			xtab[i] = xtab[i].getText()
		af = [xtab[x:x+3] for x in range(0, len(xtab), 3)] # Every three items get grouped into a list
		afx = [{"subject": x, "test":y, "date":z} for x, y, z in af]
		self.__edlog(1, "Completed with %s tests processed" % len(afx))
		return afx

	def getGradesForSubject(self, class_id, subject_id):
		"""
			Return grade list (dict, values "date", "note" and "grade") for a subject_id

			ARGS: class_id [int/required], subject_id [int/required]
		"""
		self.__edlog(0, "Getting grade list for subject id %s, class id %s (remote IDs subject:[{%s}] and class:[{%s}])" % (subject_id, class_id, self.subject_ids[subject_id], self.class_ids[class_id]))
		try:
			response = self.__fetchUrl("%s%s" % (self.edurl, self.subject_ids[subject_id]))
		except Exception as e:
			self.__edlog(4, "Failed getting grades for subject (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		xtab = soup.find("div", class_="grades").find_all("table")[1].find_all("td")
		for x in range(len(xtab)):
			xtab[x] = xtab[x].getText().strip()
		af = [xtab[x:x+3] for x in range(0, len(xtab), 3)] # Every three items get grouped into a list
		fg_list = []
		if af[0][0] == "Nema ostalih bilježaka":
			self.__edlog(1, "No grades found for this subject")
			return []
		for y in af:
			fg_list.append({"date":y[0], "note":y[1], "grade":int(y[2])})
		return fg_list

	def getNotesForSubject(self, class_id, subject_id):
		"""
			Return list of notes for subject

			ARGS: class_id [int/required], subject_id [int/required]
		"""
		self.__edlog(0, "Getting note list for subject id %s, class id %s (remote IDs subject:[{%s}] and class:[{%s}])" % (subject_id, class_id, self.subject_ids[subject_id], self.class_ids[class_id]))
		try:
			response = self.__fetchUrl("%s%s" % (self.edurl, self.subject_ids[subject_id]))
		except Exception as e:
			self.__edlog(4, "Failed getting notes for subject (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		xtab = soup.find("div", class_="grades").find_all("table")[2].find_all("td")
		for x in range(len(xtab)):
			xtab[x] = xtab[x].getText().strip()
		af = [xtab[x:x+2] for x in range(0, len(xtab), 2)] # Every two items get grouped into a list
		fn_list = []
		if af[0][0] == "Nema ostalih bilježaka":
			self.__edlog(1, "No notes found for this subject")
			return []
		for y in af:
			fn_list.append({"date":y[0], "note":y[1]})
		return fn_list

	def getConcludedGradeForSubject(self, class_id, subject_id):
		"""
			Return true/false if there is a concluded grade or not, and if there is return the grade.

			ARGS: class_id [int/required], subject_id [int/required]
		"""
		self.__edlog(0, "Getting concluded grade for subject id %s, class id %s (corresponding to actual IDs subject:[{%s}] and class:[{%s}])" % (subject_id, class_id, self.subject_ids[subject_id], self.class_ids[class_id]))
		try:
			response = self.__fetchUrl("%s%s" % (self.edurl, self.subject_ids[subject_id]))
		except Exception as e:
			self.__edlog(4, "Failed getting grades for subject (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			xtab = soup.find("div", class_="grades").find("table").find_all("td", class_="t-center bold")[1].getText().strip()
		except Exception as e:
			self.__edlog(4, "HTML parsing error! [%s] Target data follows:\n\n%s" % (e,soup))
		if len(xtab) > 0:
			self.__edlog(0, "Got unformatted string: [{%s}]" % xtab)
			result = re.search('\((.*)\)', xtab).group(1)
			self.__edlog(0, "Formatted string: [{%s}]" % result)
			self.__edlog(0, "Found concluded grade for this subject")
			return True, int(result)
		else:
			self.__edlog(0, "No concluded grade found for this subject")
			return False, None

	def getInfoForUser(self, class_id):
		"""
			Return the info on a eDnevnik user.

			ARGS: class_id [int/required]
		"""
		self.__edlog(0, "Getting info for class id %s" % class_id)
		try:
			response = self.__fetchUrl("%s/pregled/osobni_podaci/%s" % (self.edurl, self.class_ids[class_id]))
		except Exception as e:
			self.__edlog(4, "Failed to get info for class (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			xtab = soup.find("div", class_="student-details").find("table").find_all("td")
		except Exception as e:
			self.__edlog(4, "HTML parsing error! [%s] Target data follows:\n\n%s" % (e,soup))
		oData = {"number":int(xtab[0].getText()), "name":xtab[1].getText(), "oib":xtab[2].getText(), "birthdate":xtab[3].getText(), "birthplace":xtab[4].getText(), "matbroj":xtab[5].getText(), "address":xtab[6].getText(), "program":xtab[7].getText()}
		if self.hideConfidential:
			del oData['oib']
			del oData['matbroj']
		return oData

	def getAbsentOverviewForClass(self, class_id):
		"""
			Return an overview of classes marked absent for a given class
			ID.

			ARGS: class_id [int/required]
		"""
		self.__edlog(0, "Getting absent overview for class id %s" % class_id)
		try:
			response = self.__fetchUrl("%s/pregled/izostanci/%s" % (self.edurl, self.class_ids[class_id]))
		except Exception as e:
			self.__edlog(4, "Failed to get absent overview for class (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			xtab = soup.find("table", class_="legend").find_all("td")
		except Exception as e:
			self.__edlog(4, "HTML parsing error! [%s] Target data follows:\n\n%s" % (e,soup))
		xtab_fix = []
		for x in xtab:
			if not x.find("img"): # Ignore all <img> tags
				xtab_fix.append(x.getText())
		return {
			'justified': int(xtab_fix[0].replace("Opravdanih: ", "")),
			'unjustified': int(xtab_fix[1].replace("Neopravdanih: ", "")),
			'awaiting': int(xtab_fix[2].replace("Čeka odluku razrednika: ", "")),
			'sum': int(xtab_fix[3].replace("Ukupno: ", "")),
			'sum_leftover': int(xtab_fix[4].replace("Ukupno ostalo: ", ""))
		}

	def getAbsentFullListForClass(self, class_id):
		"""
			Return a full list of all marked absences for a given class ID.

			ARGS: class_id [int/required]
		"""
		self.__edlog(0, "Getting absent list for class id %s" % class_id)
		try:
			response = self.__fetchUrl("%s/pregled/izostanci/%s" % (self.edurl, self.class_ids[class_id]))
		except Exception as e:
			self.__edlog(4, "Failed to get absent list for class (%s)" % e)
		self.__edlog(0, "Initializing BeautifulSoup with response")
		soup = BeautifulSoup(response, self.parser)
		try:
			xtab = soup.find_all("table")[1]
		except:
			self.__edlog(4, "HTML parsing error! [%s] Target data follows:\n\n%s" % (e,soup))
		## BLACK FUCKING MAGIC AHEAD ##
		##    You have been warned   ##
		o = xtab.find_all("tr")
		o = o[1:]
		abslist = []
		lastSearched = 0
		for x in o:
			y = x.find_all("td", class_="datum")
			if len(y)>0:
				spanning = int(y[0].get("rowspan"))
				abslist.append({
					'span': spanning,
					'loc': lastSearched,
					'date': y[0].getText("\n").split()[1]
				})
			lastSearched += 1
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
		return abslist2
