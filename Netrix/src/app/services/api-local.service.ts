// tslint:disable: radix
// tslint:disable: interface-name
import * as cheerio from 'cheerio';
import { HTTP } from '@ionic-native/http/ngx';

export class LocalApiService {

    httpHeader = {
        'User-Agent': 'Netrix'
      };

    constructor(
        private http: HTTP
    ) {}

    /**
     * @description Posalji prijavu na server.
     * @param username AAI@EduHR username
     * @param password AAI@EduHR lozinka
     */
    public login(username: string, password: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            this.http.setDataSerializer('urlencoded');
            this.http.setSSLCertMode('nocheck');
            /* PRIJAVA */
            // Prvo nam treba CSRF token:
            this.http.get('https://ocjene.skole.hr/pocetna/prijava', {}, this.httpHeader).then(response => {
                const csrf = this.getCSRF();
                // Zatim saljemo podatke na endpoint prijave:
                this.http.post(
                    'https://ocjene.skole.hr/pocetna/posalji/',
                    {
                        csrf_token: csrf,
                        user_login: username,
                        user_password: password,
                    },
                    this.httpHeader).then(response => {
                    const body = response.data;
                    if (body.includes('Krivo korisničko ime i/ili lozinka.') ||
                        body.includes('Potrebno je upisati korisničko ime i lozinku.') ||
                        body.includes('nije pronađen u LDAP imeniku škole') ||
                        body.includes('Neispravno korisničko ime.')) {
                            reject({reason: 'E_WRONG_PASSWORD'});
                    } else {
                            resolve();
                    }
                });
            });
        });
    }

    /**
     * @description Vraca popis razreda.
     * @return Array razreda
     */
    public getClasses(): Promise<Class[] | null> {
        return new Promise(async (resolve, reject) => {
            const classes: any[] = [];
            this.http.get('https://ocjene.skole.hr/razredi/odabir', {}, this.httpHeader).then(response => {
                const body = response.data;
                const $ = cheerio.load(body);
                // Zamjena svih <br> tagova s "|"
                $('div.class').find('br').replaceWith('|');
                // Procesiranje svakog razreda
                $('a.class-wrap').each((i: number, cls: any) => {
                    try {
                        const div = $(cls).find('div.class');
                        const classID = div.find('span').text();
                        div.find('span').remove();
                        const classInfoArray = div.text().split('|');
                        /* classInfoArray:
                        * [0] => skolska godina
                        * [1] => ime skole
                        * [2] => razrednik/ca */
                        const classYear = classInfoArray[0].replace('Školska godina ', '');
                        const schoolName = classInfoArray[1];
                        const classMaster = classInfoArray[2].replace('Razrednik: ', '');
                        classes.push({
                            year: classYear,
                            name: schoolName,
                            master: classMaster,
                            class: classID,
                            id: i,
                            _id: $(cls).attr('href').replace('/pregled/predmeti/', ''),
                        });
                        resolve(classes);
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        });
    }

    /**
     * Vraca prosjek za dani predmet. U slucaju da nema zakljucenog,
     * bit ce izracunat.
     * @param subjObject Subject dobiven iz `getSubjects()`
     */
    public getAverage(subjObject: Subject): Promise<number | null> {
        return new Promise(async (resolve, reject) => {
            let grade = 0;
            this.http.get('https://ocjene.skole.hr' + subjObject._link, {}, this.httpHeader).then(response => {
                const body = response.data;
                const $ = cheerio.load(body);
                // Trazimo prvo zakljucnu ocjenu
                const unfString = $('td[colspan=6]').text();
                // Sadrzaj ce biti tipa "Vrlo dobar(4)", pa regexom
                // izvucemo samo sadrzaj u zagradama
                const match = unfString.match(/\((.*)\)/);
                if (match !== null) {
                    grade = parseInt(match[1]);
                } else {
                    // Ako nema zakljucne, treba racunati od postojecih
                    const grades = parseGrades(body);
                    const gradeOnly: any[] = [];
                    grades.forEach((gradeObj) => {
                        gradeOnly.push(gradeObj.grade);
                    });
                    grade = parseInt((arraySum(gradeOnly) / gradeOnly.length).toFixed(2));
                }
                resolve(grade);
            });
        });
    }

    /**
     * Vraca popis predmeta za dani razred.
     * @param classObject Class objekt dobiven iz `getClasses()`
     */
    public getSubjects(classObject: Class): Promise<Subject[] | null> {
        return new Promise(async (resolve, reject) => {
            const subjects: Subject[] = [];
            this.http.get(
                'https://ocjene.skole.hr/pregled/predmeti/' + classObject._id,
                {}, this.httpHeader)
            .then(response => {
                const body = response.data;
                const $ = cheerio.load(body);
                // Opet zamjena <br>
                $('div#courses a').find('br').replaceWith('|');
                // Handling po predmetu
                $('div#courses a').each((i: any, sub: any) => {
                    const subjInfoArray = $(sub).text().split('|');
                    /* subjInfoArray:
                     * [0] => ime predmeta (s razmacima na kraju)
                     * [1] => profesori */
                    const subject = subjInfoArray[0].trimRight();
                    const professors = subjInfoArray[1].split(', '); // tako da imamo array
                    subjects.push({name: subject, professors, _link: $(sub).attr('href')});
                });
                resolve(subjects);
            });
        });
    }

    /**
     * Vraca popis ocjena za dani predmet.
     * @param subjObject Subject objekt dobiven iz `getSubjects()`
     */
    public getGrades(subjObject: Subject): Promise<Array<Grade> | null> {
        return new Promise(async (resolve, reject) => {
            let grades = [];
            this.http.get('https://ocjene.skole.hr' + subjObject._link, {}, this.httpHeader).then(response => {
                const body = response.data;
                grades = parseGrades(body);
                resolve(grades);
            });
        });
    }

    /**
     * Vraca popis ispita za razred. `getAll` odredjuje hoce li
     * traziti sve ispite ili samo one koji jos nisu pisani.
     * @param classObject Class objekt dobiven iz `getClasses()`
     * @param getAll Odredjuje hoce li traziti sve ispite ili samo one koji jos nisu pisani
     */
    public getExams(classObject: Class, getAll: boolean): Promise<Exam[] | null> {
        return new Promise(async (resolve, reject) => {
            const tests: Exam[] = [];
            const addon = getAll ? '/all' : '';
            this.http.get(
                'https://ocjene.skole.hr/pregled/ispiti/' + classObject._id + addon,
                {}, this.httpHeader)
            .then(response => {
                const body = response.data;
                const $ = cheerio.load(body);
                const testsUnfiltered: any[] = [];
                // Handling po predmetu
                $('table td').each((_: any, sub: any) => {
                    testsUnfiltered.push($(sub).text());
                });
                /* https://stackoverflow.com/a/8495740 (podjela arraya u arrayeve od 3 clana) */
                let i;
                let j;
                let temparray;
                const chunk = 3;
                for (i = 0, j = testsUnfiltered.length; i < j; i += chunk) {
                    temparray = testsUnfiltered.slice(i, i + chunk);
                    /* temparray:
                     * [0] => predmet
                     * [1] => ispit
                     * [2] => datum */
                    tests.push({subject: temparray[0], exam: temparray[1], date: convertToUnix(temparray[2])});
                }
                resolve(tests);
            });
        });
    }

    /**
     * Pregled/summary izostanaka.
     * @param classObject Class objekt dobiven iz `getClasses()`
     */
    public getAbsencesOverview(classObject: Class) {
        return new Promise(async (resolve, reject) => {
            const absences = {
                justified: 0,
                unjustified: 0,
                awaiting: 0,
                sum: 0,
                sum_leftover: 0,
            };
            this.http.get('https://ocjene.skole.hr/pregled/izostanci/' + classObject._id,
                {}, this.httpHeader)
            .then(response => {
                const body = response.data;
                const $ = cheerio.load(body);
                const tempAbsList: any[] = [];
                $('table.legend td').each((i: number, elem: any) => {
                    const html = $(elem).html();
                    if (html !== null && !html.includes('img')) {
                        tempAbsList.push($(elem).text());
                    }
                });
                absences.justified = parseInt(tempAbsList[0].replace('Opravdanih: ', ''));
                absences.unjustified = parseInt(tempAbsList[1].replace('Neopravdanih: ', ''));
                absences.awaiting = parseInt(tempAbsList[2].replace('Čeka odluku razrednika: ', ''));
                absences.sum = parseInt(tempAbsList[3].replace('Ukupno: ', ''));
                absences.sum_leftover = parseInt(tempAbsList[4].replace('Ukupno ostalo: ', ''));
                resolve(absences);
            });
        });
    }

    /**
     * Vraca potpunu i poredanu (po datumu) listu izostanaka.
     * @param classObject Class objekt dobiven iz `getClasses()`
     */
    public getAbsencesFull(classObject: Class) {
        return new Promise(async (resolve, reject) => {
            const absences: any[] = [];
            this.http.get('https://ocjene.skole.hr/pregled/izostanci/' + classObject._id,
            {}, this.httpHeader)
        .then(response => {
                const body = response.data;
                const $ = cheerio.load(body);
                // Spremimo sve u privremeni array
                const tempArr1: any[] = [];
                $('div.hours table tr').each((i: any, elem: any) => {
                    tempArr1.push(elem);
                });
                // Maknemo prvi element (header)
                tempArr1.shift();
                // Kroz taj array prodjemo i trazimo sva mjesta gdje
                // je oznacen datum.
                // Nadjene headere spremamo u array koji sadrzi
                // lokaciju/index, span (koliko je header dug) i
                // datum.
                const headers: Array<{ loc: number; span: number; date: number; }> = [];
                tempArr1.forEach((elem, i) => {
                    const header = $(elem).find('td.datum');
                    const headerHtml = header.html();
                    if (headerHtml) {
                        const formattedDate = convertToUnix(headerHtml.split('<br>')[1]);
                        headers.push({
                            loc: i,
                            span: parseInt(header.attr('rowspan')),
                            date: formattedDate,
                        });
                    }
                });
                headers.forEach((header) => {
                    const absObj: AbsenceSort = {
                        date: header.date,
                        absences: Array<Absence>(),
                    };
                    tempArr1.slice(header.loc, header.loc + header.span).forEach((absence) => {
                        absObj.absences.push({
                            period: parseInt($(absence).find('td#sat').text()),
                            subject: $(absence).find('td#predmet').text(),
                            reason: $(absence).find('td#razlog').text(),
                            justified: $(absence).find('td#opravdano img').attr('alt') === 'Opravdano',
                        });
                    });
                    absences.push(absObj);
                });
                resolve(absences);
            });
        });
    }

    getCSRF() {
        const x = this.http.getCookieString('https://ocjene.skole.hr/');
        console.log(x);
        const y = x.split('; ');
        return y[1].replace('csrf_cookie=', '');
    }
}


export interface Class {
    /**
     * The school year for the class. Formatted as 'start/end', 'YYYY./YYYY.'
     */
    year: string;
    /**
     * The name of the school.
     */
    name: string;
    /**
     * The classmaster for this class.
     */
    master: string;
    /**
     * The class identifier, e.g. 1.e, 2.a etc.
     */
    class: string;
    /**
     * The ID of the class, starts from 0 up to however many there are.
     */
    id: number;
    _id: string;
}

export interface Subject {
    /**
     * The subject name.
     */
    name: string;
    /**
     * List of professors associated with this subject.
     */
    professors: string[];
    _link: string;
}

export interface Exam {
    /**
     * The subject the test will be written for.
     */
    subject: string;
    /**
     * The subject of the test.
     */
    exam: string;
    /**
     * UNIX-formatted timestamp of writing date.
     */
    date: number;
}

export interface APIError {
    /**
     * Reason the error was thrown for. Usually E_<reason>.
     */
    reason: string;
    /**
     * The error object thrown by the used function, if available.
     */
    error?: any;
}

export interface Grade {
    /**
     * UNIX-formatted timestamp of the date the grade was inputted.
     */
    date: number;
    /**
     * The note entered with the grade.
     */
    note: string;
    /**
     * The grade.
     */
    grade: number;
}

export interface AbsencesOverview {
    /**
     * Amount of justified classes.
     */
    justified: number;
    /**
     * Amount of unjustified classes.
     */
    unjustified: number;
    /**
     * Amount of classes waiting for decision.
     */
    awaiting: number;
    /**
     * Total amount of missed classes.
     */
    sum: number;
    /**
     * Sum of "other" classes. Don't know what this is exactly.
     */
    sum_leftover: number;
}

export interface AbsenceSort {
    /**
     * UNIX-timestamp for the day the absences were inputted.
     */
    date: number;
    /**
     * An array of `Absence` objects.
     */
    absences: Absence[];
}

export interface Absence {
    /**
     * The class period the absence happened.
     */
    period: number;
    /**
     * The subject that was on this period
     */
    subject: string;
    /**
     * The reason this subject was (un)justified
     */
    reason: string;
    /**
     * Whether this absence is justified or unjustified.
     */
    justified: boolean;
}

function arraySum(arr: any[]): number {
    return arr.reduce((a, b) => a + b, 0);
}

/*function getCSRF(headers: any) {
    console.log(headers);
    // Ako postoji "set-cookie" header u zahtjevu
    if (headers['set-cookie']) {
        // Provjeri pocinje li koji cookie sa stringom "csrf_cookie"
        // u listi set-cookie elemenata
        for (const i in headers['set-cookie']) {
            if (headers['set-cookie'][i].startsWith('csrf_cookie')) {
                * Nasli smo CSRF cookie
                 * Obicno sadrzava jos informacija (npr. kad prestaje vrijediti itd.), no
                 * nama treba samo prvi dio u formatu csrf_cookie=1a2b3c4d5e... *
                // Dodatne informacije su odjeljene znakom ";", sto znaci da je prvi dio
                // pod [0] nakon podjele
                const preSplit = headers['set-cookie'][i].split(';')[0];
                // Sad samo treba podijeliti na znaku "="
                return preSplit.split('=')[1];
            }
        }
    }
}*/

function parseGrades(htmlData: string) {
    const $ = cheerio.load(htmlData);
    const grades: any[] = [];
    const gradesUnfiltered: any[] = [];
    // Spremi sve elemente u jedan array
    $('div.grades table#grade_notes td').each((_: number, grade: any) => {
        gradesUnfiltered.push($(grade).text());
    });
    /* https://stackoverflow.com/a/8495740 (podjela arraya u arrayeve od 3 clana) */
    let i;
    let j;
    let temparray;
    const chunk = 3;
    for (i = 0, j = gradesUnfiltered.length; i < j; i += chunk) {
        temparray = gradesUnfiltered.slice(i, i + chunk);
        /* temparray:
         * [0] => datum
         * [1] => biljeska
         * [2] => ocjena */
        const convDate = convertToUnix(temparray[0].trimLeft());
        grades.push({date: convDate, note: temparray[1], grade: parseInt(temparray[2])});
    }
    return grades;
}

function convertToUnix(dateString: string) {
    // Treba formatirati dd.MM.yyyy. koji daje eDnevnik u format za
    // javascript Date()
    // 1. Podjela u array
    const splitDate = dateString.split('.');
    // 2. Konvertiranje u integer -- od mjeseca se oduzima 1 jer je u
    //    javascriptu prvi mjesec 0, drugi 1 itd.
    const day = parseInt(splitDate[0]);
    const month = parseInt(splitDate[1]) - 1;
    const year = parseInt(splitDate[2]);
    // 3. Vracamo sto smo konvertirali u UNIX timestamp formatu
    return Math.round(new Date(year, month, day).getTime() / 1000);
}
