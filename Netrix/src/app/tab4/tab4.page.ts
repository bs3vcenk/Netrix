import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';
import { ApiService } from '../services/api.service';

/* School year starts in September */
const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {

  // This will be used as a reference to how the data will look like when fetched from
  // the server.
  exampleGraphResponse: Array<any> = JSON.parse(
    '[{"average":3.87,"month":1},{"average":3.8,"month":2},{"average":3.8,"month":3},{"average":3.73,"month":4},{"average":3.87,"month":5},{"average":4.0,"month":6},{"average":4.2,"month":9},{"average":3.6,"month":10},{"average":3.87,"month":11}]'
  );
  exampleGradeHistoryResponse: Array<any> = JSON.parse(
    '[{"date":1560376800,"grade":4,"note":"Klima  - manje greske","subject_id":7},{"date":1560376800,"grade":5,"note":"Povezivanje gradiva","subject_id":7},{"date":1560290400,"grade":1,"note":"voc/ nema rje\u010dnik","subject_id":3},{"date":1560290400,"grade":5,"note":"U\u010denik ponekad sudjeluje prilikom obrade postavljaju\u0107i proaktivna pitanja. Ima razvijeno matemati\u010dko i logi\u010dko razmi\u0161ljanje ali zbog manjka samostalnog rada ostvaruje rezultate ispod svojih mogu\u0107nosti. Uz sistemati\u010dni i kontinuirani samostalni rad, sl. nastavne godine bi mogao bez problema ostvariti puno bolji uspjeh.","subject_id":8},{"date":1560204000,"grade":5,"note":"Zu Hause","subject_id":2},{"date":1560204000,"grade":4,"note":"Servi dominique/ odre\u0111uje strukt re\u010d,pogre\u0161ke u nekim tvorb.","subject_id":3},{"date":1560204000,"grade":4,"note":"komparac pridjeva,acrior dolor, habeo 2- pregled glag oblika/ usvojio gram kateg,pogre\u0161ke u nekim slu\u017eb.","subject_id":3},{"date":1560204000,"grade":5,"note":"Koncerti 2. polugodi\u0161te","subject_id":4},{"date":1560117600,"grade":5,"note":"Objektsatz","subject_id":2},{"date":1559858400,"grade":5,"note":"Osvrt","subject_id":5},{"date":1559772000,"grade":5,"note":"Projektni zadatak \"Ban Josip Jela\u010di\u0107\"  HTML, CSS, Trello - timski rad i kreativno rje\u0161avanje problema","subject_id":12},{"date":1559599200,"grade":3,"note":"Klima - povrsno","subject_id":7},{"date":1559599200,"grade":4,"note":"Povezivanje gradiva","subject_id":7},{"date":1559512800,"grade":5,"note":"- prosudbene vje\u0161tine","subject_id":14},{"date":1559512800,"grade":5,"note":"- eti\u010dki kriteriji \u010dovjekova pona\u0161anja","subject_id":14},{"date":1559253600,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1559080800,"grade":5,"note":"Karta","subject_id":7},{"date":1559080800,"grade":4,"note":"7. pisana provjera znanja\r\n16/20\r\n80.00%","subject_id":8},{"date":1558994400,"grade":5,"note":"4. Pisana provjera znanja 20/20","subject_id":2},{"date":1558994400,"grade":5,"note":"4. Pisana provjera znanja 28/29","subject_id":2},{"date":1558994400,"grade":4,"note":"prov. dz. razvoj cvijeta, malo nesiguran","subject_id":11},{"date":1558908000,"grade":5,"note":"Test 5 grammar","subject_id":1},{"date":1558908000,"grade":5,"note":"Test 5 vocabulary","subject_id":1},{"date":1558648800,"grade":5,"note":"Pisana provjera znanja 18/20","subject_id":12},{"date":1558648800,"grade":4,"note":"Finalno provjeravanje kinantropolo\u0161kih obilje\u017eja","subject_id":13},{"date":1558562400,"grade":4,"note":"4. pismena provjera znanja 13/16","subject_id":9},{"date":1558476000,"grade":5,"note":"Terenska nastava u Zadru - izrada plakata","subject_id":4},{"date":1558303200,"grade":5,"note":"- primjena jezi\u010dnih komunikacijskih vje\u0161tina na/u razli\u010dim sadr\u017eajima/situacijama","subject_id":0},{"date":1558303200,"grade":5,"note":"Modalverben sollen und wollen","subject_id":2},{"date":1558303200,"grade":2,"note":"2.Kontrolna zada\u0107a          12/20","subject_id":3},{"date":1558303200,"grade":3,"note":"2.Kontrolna  zada\u0107a        3/5","subject_id":3},{"date":1558044000,"grade":5,"note":"Ra\u010dunalne mre\u017ee, MS Excel - povezuje usvojeno znanje s drugim sli\u010dnim sadr\u017eajima","subject_id":12},{"date":1557784800,"grade":3,"note":"Ispravak negativne ocjene testa: u\u010denik nije to\u010dno odgovorio skladatelja i naziv skladbe, dok je ostale parametre to\u010dno odgovorio","subject_id":4},{"date":1557784800,"grade":5,"note":"Rad na satu","subject_id":9},{"date":1557698400,"grade":3,"note":"- teorija i povijest knji\u017eevnosti (sadr\u017eaji 1. razreda)","subject_id":0},{"date":1557698400,"grade":4,"note":"- jezi\u010dni sadr\u017eaji 1. razreda","subject_id":0},{"date":1557439200,"grade":3,"note":"3. pisana provjera znanja\r\n 34 /46","subject_id":11},{"date":1557352800,"grade":4,"note":"Druga pisana provjera znanja    8,5/12","subject_id":6},{"date":1557352800,"grade":3,"note":"Druga pisana provjera znanja   17/26","subject_id":6},{"date":1557180000,"grade":4,"note":"Vje\u017eba: odre\u0111ivanje gusto\u0107e \u010dvrstog tijela; zaklju\u010dak","subject_id":9},{"date":1557180000,"grade":2,"note":"\u010cetvrta pisana provjera znanja    22,5 /37","subject_id":10},{"date":1556575200,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1556488800,"grade":5,"note":"Test 4 grammar","subject_id":1},{"date":1556488800,"grade":5,"note":"Test 4 vocabulary","subject_id":1},{"date":1555020000,"grade":5,"note":"My most treasured possession","subject_id":1},{"date":1555020000,"grade":5,"note":"Pismena provjera 19/21","subject_id":5},{"date":1554933600,"grade":5,"note":"MS Excel zadatci- kreativno primjenjuje vje\u0161tine u novim situacijama","subject_id":12},{"date":1554847200,"grade":2,"note":"2. \u0161kolska zada\u0107a - razumijevanje (12/20)","subject_id":3},{"date":1554847200,"grade":1,"note":"2. \u0161kolska zada\u0107a - vokabular (6/14)","subject_id":3},{"date":1554847200,"grade":3,"note":"Reljef - treba potpitanja, ali niti uz njih ne dolazi uvijek do to\u010dnog odgovora","subject_id":7},{"date":1554847200,"grade":4,"note":"Povezivanje gradiva","subject_id":7},{"date":1554674400,"grade":3,"note":"Druga pisana provjera znanja - teorija 18/26","subject_id":4},{"date":1554674400,"grade":1,"note":"Druga pisana provjera znanja - slu\u0161no 6/15","subject_id":4},{"date":1554415200,"grade":4,"note":"- tre\u0107a \u0161kolska zada\u0107a - interpretativni esej","subject_id":0},{"date":1554242400,"grade":2,"note":"6. pisana provjera znanja\r\n13/22\r\n59.09%","subject_id":8},{"date":1554242400,"grade":5,"note":"Vje\u017eba: ZOE","subject_id":9},{"date":1554156000,"grade":3,"note":"Promjenjivi stavci mise, putuju\u0107i svira\u010di, gr\u010d. tragedija, Seikilov skolion, ljestvi\u010dni sistemi starih Grka, renesansa - u\u010denik je nesiguran i na pojedina pitanja nije znao odgovor","subject_id":4},{"date":1553814000,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1553727600,"grade":5,"note":"Prezentacija \"Rootkit i keylogger\" - samostalno izra\u0111uje digitalne sadr\u017eaje","subject_id":12},{"date":1553554800,"grade":3,"note":"3. pismena provjera znanja, 10/16","subject_id":9},{"date":1553122800,"grade":3,"note":"Kovalentna veza,uz pomo\u0107","subject_id":10},{"date":1553122800,"grade":3,"note":"2. pisana provjera znanja\r\n 34,5 /52","subject_id":11},{"date":1552950000,"grade":4,"note":"Victorian society PPT","subject_id":1},{"date":1552950000,"grade":5,"note":"Victorian society vokabular","subject_id":1},{"date":1552863600,"grade":3,"note":"- sinteza teorije knji\u017eevnosti i uvod u povijest knji\u017eevnosti (temeljna civilizacijska djela)","subject_id":0},{"date":1552863600,"grade":4,"note":"- glasovne promjene","subject_id":0},{"date":1552604400,"grade":5,"note":"Kids who have it all, Victorian childhood - prepri\u010davanje lekcija","subject_id":1},{"date":1552604400,"grade":5,"note":"Kids who have it all - obja\u0161njavanje vokabulara","subject_id":1},{"date":1552431600,"grade":2,"note":"Druga pisana provjera znanja 15/32","subject_id":7},{"date":1552345200,"grade":3,"note":"Anja ist krank","subject_id":2},{"date":1552345200,"grade":2,"note":"Anja ist krank, Wortschatz","subject_id":2},{"date":1552345200,"grade":3,"note":"2. pisana provjera znanja( ponavljanje); 13/19; Dobar (3)","subject_id":9},{"date":1552258800,"grade":5,"note":"Test 3 grammar","subject_id":1},{"date":1552258800,"grade":4,"note":"Test 3 vocabulary","subject_id":1},{"date":1551999600,"grade":5,"note":"Bacanje i hvatanje lopte (K)","subject_id":13},{"date":1551826800,"grade":4,"note":"5. pisana provjera znanja\r\n16/20\r\n80.00%","subject_id":8},{"date":1551826800,"grade":2,"note":"virusi, jezgra, prijenos tvari, uz pomo\u0107","subject_id":11},{"date":1551654000,"grade":5,"note":"Wir spielen Theater: In der Arztpraxis","subject_id":2},{"date":1551654000,"grade":5,"note":"- primjena eti\u010dke teorije na konkretne \u017eivotne sitacije","subject_id":14},{"date":1551308400,"grade":2,"note":"Peloponeski rat, Aleksandar Veliki, Gr\u010dko- perzijski ratovi.- U\u010denik se prisje\u0107a, nastavnik \u010desto poma\u017ee.","subject_id":6},{"date":1551308400,"grade":3,"note":"U\u010denik samo prepoznaje zna\u010daj povijesnih izvora, slabije kriti\u010dki promi\u0161lja.","subject_id":6},{"date":1551308400,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1551222000,"grade":5,"note":"Pisana provjera znanja  19,5/22","subject_id":12},{"date":1551135600,"grade":3,"note":"Tre\u0107a pisana provjera znanja   10,5/18","subject_id":10},{"date":1551135600,"grade":4,"note":"Bacanje i hvatanje lopte (R)- test","subject_id":13},{"date":1550617200,"grade":3,"note":"voc","subject_id":3},{"date":1550617200,"grade":4,"note":"Pismena provjera 24/28","subject_id":5},{"date":1550530800,"grade":5,"note":"Test 2 vocabulary ispravak","subject_id":1},{"date":1550530800,"grade":5,"note":"Test 2 grammar ispravak","subject_id":1},{"date":1550444400,"grade":5,"note":"- raspodjela naglasaka u hrvatskom standardnom jeziku; zna\u010dajke standardnoga jezika","subject_id":0},{"date":1550444400,"grade":5,"note":"- epika, drama, diskurzivni knji\u017eevni rod","subject_id":0},{"date":1550098800,"grade":1,"note":"2. pisana provjera znanja, 5/19","subject_id":9},{"date":1550098800,"grade":5,"note":"Python algoritmi s znamenkama - kreativno primjenjuje vje\u0161tine u novim situacijama","subject_id":12},{"date":1549926000,"grade":5,"note":"3.pisana provjera znanja 39/41","subject_id":2},{"date":1549839600,"grade":5,"note":"Engleski valcer","subject_id":13},{"date":1549234800,"grade":4,"note":"- druga \u0161kolska zada\u0107a - rasprava","subject_id":0},{"date":1549234800,"grade":3,"note":"Karte, reljef - povr\u0161no","subject_id":7},{"date":1549234800,"grade":3,"note":"Povezivanje gradiva","subject_id":7},{"date":1548802800,"grade":5,"note":"Aedificia R./ s razumijevanjem odre\u0111uje strukt re\u010d,primjenjuje usvojene gram kateg.","subject_id":3},{"date":1548802800,"grade":4,"note":"pridjevi 1,2.dekl,misera domus,habeo 2-pregled obl./usvojio gram kateg,pogre\u0161ke u nekim obl.","subject_id":3},{"date":1548802800,"grade":3,"note":"4. pisana provjera znanja\r\n14/22\r\n63.64%","subject_id":8},{"date":1548630000,"grade":2,"note":"Test 2 grammar","subject_id":1},{"date":1548630000,"grade":3,"note":"Test 2 vocabulary","subject_id":1},{"date":1547766000,"grade":5,"note":"Preskakivanje vija\u010de- test","subject_id":13},{"date":1545346800,"grade":5,"note":"Koncerti 1. polugodi\u0161te","subject_id":4},{"date":1545346800,"grade":5,"note":"Python kornja\u010dina grafika -kreativno primjenjuje vje\u0161tine u novim situacijama","subject_id":12},{"date":1545087600,"grade":5,"note":"Die Schulbank dr\u00fccken","subject_id":2},{"date":1545087600,"grade":3,"note":"Die Schulbank dr\u00fccken, Wortschatz","subject_id":2},{"date":1545001200,"grade":4,"note":"3. pisana provjera znanja (ispravak)\r\n15/20\r\n75.00%","subject_id":8},{"date":1544655600,"grade":5,"note":"- funkcija glasova u jeziku, pismo i pravopis","subject_id":0},{"date":1544655600,"grade":3,"note":"- roman","subject_id":0},{"date":1544569200,"grade":5,"note":"Usmeno: arhitektura- vje\u0161to i samostalno","subject_id":5},{"date":1544569200,"grade":1,"note":"3. pisana provjera znanja\r\n8/20\r\n40.00%","subject_id":8},{"date":1544482800,"grade":4,"note":"1.Kontrolna zada\u0107a       3,5/5","subject_id":3},{"date":1544482800,"grade":3,"note":"1.Kontrolna zada\u0107a      15/20","subject_id":3},{"date":1544050800,"grade":2,"note":"osobine \u017e. svijeta, ugljikohidrati, NK, dio nepotpuno ili nepovezano, dio niti uz pomo\u0107","subject_id":11},{"date":1543878000,"grade":4,"note":"2.pisana provjera znanja 23/26","subject_id":2},{"date":1543878000,"grade":5,"note":"2.pisana provjera znanja 16/16","subject_id":2},{"date":1543878000,"grade":4,"note":"Elektronska konfiguracija, s razumijevanjem, malo nesigurno","subject_id":10},{"date":1543878000,"grade":5,"note":"Tranzitivno provjeravanje motori\u010dkih sposobnosti- sklekovi","subject_id":13},{"date":1543791600,"grade":3,"note":"Prva pisana provjera znanja - teorija 26/15","subject_id":4},{"date":1543791600,"grade":4,"note":"Prva pisana provjera znanja - slu\u0161no 9/6","subject_id":4},{"date":1543791600,"grade":3,"note":"1. Newtonov zakon, 2. Newtonov zakon, pokus s kolicima, sila te\u017ea i te\u017eina, slobodni pad","subject_id":9},{"date":1543532400,"grade":4,"note":"Pisana provjera znanja   22,5/26","subject_id":6},{"date":1543532400,"grade":4,"note":"Pisana provjera znanja   9/12","subject_id":6},{"date":1543532400,"grade":4,"note":"dosad dva puta me\u0111u prvima samostalno rije\u0161io zadatak, danas nije imao zada\u0107u","subject_id":9},{"date":1543532400,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1543446000,"grade":3,"note":"Druga pisana provjera znanja  20/29","subject_id":10},{"date":1543273200,"grade":3,"note":"1. PISANA PROVJERA ZNANJA\r\n 36 / 56","subject_id":11},{"date":1543186800,"grade":4,"note":"Vje\u017eba 2.1. Ubrzanje, sila i masa","subject_id":9},{"date":1542754800,"grade":5,"note":"Dictation","subject_id":1},{"date":1542754800,"grade":5,"note":"Reading comprehension: \r\nFood for a community","subject_id":1},{"date":1542322800,"grade":5,"note":"Vr\u0161no odbijanje lopte (O)","subject_id":13},{"date":1542322800,"grade":5,"note":"Vr\u0161no odbijanje lopte (O)-test","subject_id":13},{"date":1542236400,"grade":5,"note":"1. \u0161kolska zada\u0107a - raspravlja\u010dki esej","subject_id":0},{"date":1542150000,"grade":2,"note":"2. pisana provjera znanja\r\n11/20\r\n55.00%","subject_id":8},{"date":1541977200,"grade":4,"note":"Vje\u017eba 1.4. Jednoliko ubrzano gibanje","subject_id":9},{"date":1541631600,"grade":4,"note":"- uvod u jezikoslovlje, fonologija - glasovi (ispravak)","subject_id":0},{"date":1541458800,"grade":4,"note":"1. pisana provjera (15/20)","subject_id":9},{"date":1540940400,"grade":3,"note":"izlaganje DNA, jako nesiguran","subject_id":11},{"date":1540940400,"grade":5,"note":"OPV","subject_id":13},{"date":1540940400,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1540854000,"grade":2,"note":"1.\u0160kolska zada\u0107a     12/20","subject_id":3},{"date":1540854000,"grade":3,"note":"1.\u0160kolska zada\u0107a    8/12","subject_id":3},{"date":1540854000,"grade":3,"note":"\u0160to je glazba, parametri tona, visina, melodija, tempo, harmonija - u\u010denik je nesiguran i na pojedina pitanja nije znao odgovor","subject_id":4},{"date":1540767600,"grade":5,"note":"Welcome to our world","subject_id":1},{"date":1540767600,"grade":4,"note":"1. pisana provjera znanja 20/22","subject_id":2},{"date":1540767600,"grade":5,"note":"1. pisana provjera znanja 25/27","subject_id":2},{"date":1540767600,"grade":2,"note":"vje\u017eba 1.3. jednoliko pravocrtno gibanje: samostalno izvodi najjednostavnija mjerenja i primjenjuje najjednostavnije metode obrade izmjerenih podataka na temelju upute","subject_id":9},{"date":1540504800,"grade":5,"note":"Gornji Grad","subject_id":5},{"date":1540504800,"grade":4,"note":"Svemir - treba potpitanja","subject_id":7},{"date":1540504800,"grade":4,"note":"Povezivanje gradiva","subject_id":7},{"date":1540504800,"grade":5,"note":"Pisana provjera znanja 19/20","subject_id":12},{"date":1540418400,"grade":2,"note":"Paleolitik, 18. dinastija, Mezopotamija.- U\u010denik nepovezano govori i prisje\u0107a se o najva\u017enijim pojmovima, doga\u0111ajima i osobama. Mo\u017ee puno bolje.","subject_id":6},{"date":1540418400,"grade":2,"note":"U\u010denik te\u017ee zaklju\u010duje uzro\u010dno- posljedi\u010dne odnose, mije\u0161a gradivo, brojni propusti prilikom argumentiranja. Mo\u017ee puno bolje.","subject_id":6},{"date":1540159200,"grade":2,"note":"1. pisana provjera znanja 16/32","subject_id":7},{"date":1539813600,"grade":1,"note":"- uvod u jezikoslovlje, fonologija - glasovi","subject_id":0},{"date":1539813600,"grade":1,"note":"- uvod u umjetnost i knji\u017eevnost, pristup knji\u017eevnosti - lirika\r\n8. 11. 2018. ispravak, nedovoljan (1)","subject_id":0},{"date":1539727200,"grade":3,"note":"1. pisana provjera znanja\r\n15/21\r\n71.43%","subject_id":8},{"date":1539554400,"grade":5,"note":"- vje\u0161tina eti\u010dke argumentacije (etika i moral, moralni izazovi dana\u0161njega svijeta)","subject_id":14},{"date":1539122400,"grade":5,"note":"Unit 1 grammar test: tenses (53/55)","subject_id":1},{"date":1539036000,"grade":4,"note":"Prva pisana provjera znanja  20/26","subject_id":10},{"date":1538085600,"grade":5,"note":"Ra\u010dunalna oprema i osnovni informati\u010dki pojmovi","subject_id":12},{"date":1538085600,"grade":5,"note":"Izrada mentalne mape \"Ra\u010dunalna oprema\"","subject_id":12},{"date":1538085600,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1537999200,"grade":1,"note":"prov. dz. carstva, niti uz pomo\u0107","subject_id":11},{"date":1537826400,"grade":4,"note":"Ein Sommer in Dubrovnik","subject_id":2},{"date":1537826400,"grade":5,"note":"Ein Sommer in Dubrovnik, Wortschatz","subject_id":2},{"date":1537308000,"grade":5,"note":"U\u010denik samostalno rje\u0161ava problemske zadatke","subject_id":8}]'
  );

  // Chart configuration
  @ViewChild('gradeHistoryGraph', {static: true}) gradeHistoryGraph: ElementRef;
  private gradehistChart: Chart;
  // -- Chart data
  chartLabels: Array<string> = [];
  chartDataset: Array<number> = [];

  // Other data
  fullAverage: number;
  recentTests: Array<any>;

  constructor(
    private api: ApiService
  ) { }

  ngOnInit() {
    this.createGradeHistoryChart();
    this.api.loadingFinishedSubj.subscribe(() => {
      this.formatGraphResponse();
      this.setupAverage();
    });
  }

  /* Format server graph response into separate labels and dataset arrays */
  private formatGraphResponse() {
    // Sorting from https://stackoverflow.com/a/16221350
    const orderedList = this.exampleGraphResponse.sort((a, b) => {
      return SCHOOL_MONTH_ORDER.indexOf(a.month) - SCHOOL_MONTH_ORDER.indexOf(b.month);
    });
    orderedList.forEach((gObject) => {
      this.chartLabels.push(gObject.month.toString());
      this.chartDataset.push(gObject.average);
    });
  }

  /* Show current grade average in UI */
  private setupAverage() {
    this.fullAverage = this.api.fullAvg;
  }

  private createGradeHistoryChart() {
    // Create blue gradient (from https://blog.vanila.io/chart-js-tutorial-how-to-make-gradient-line-chart-af145e5c92f9)
    const gradientStroke = this.gradeHistoryGraph.nativeElement.getContext('2d').createLinearGradient(500, 0, 100, 0);
    gradientStroke.addColorStop(0, '#00d2ff');
    gradientStroke.addColorStop(1, '#3a47d5');
    // Initialize the grade history chart
    this.gradehistChart = new Chart(this.gradeHistoryGraph.nativeElement, {
      type: 'line', // We want this to be a line chart
      data: {
        labels: this.chartLabels,
        datasets: [ // Only one dataset -- grade average over time
          {
            fill: true,
            data: this.chartDataset,
            borderColor: gradientStroke,
            pointBorderColor: gradientStroke,
            pointBackgroundColor: gradientStroke,
            pointHoverBackgroundColor: gradientStroke,
            pointHoverBorderColor: gradientStroke,
            backgroundColor: gradientStroke,
            pointRadius: 0
          }
        ]
      },
      options: {
        legend: {
          display: false, // Disable the legend
        },
        tooltips: {
          enabled: false, // Disable tooltips on tap
        },
        scales: {
          xAxes: [{
            gridLines: {
              display: false, // Disable grid lines
            }
          }],
          yAxes: [{
            display: false, // Disable entire y axis for now
            gridLines: {
              display: false, // Disable grid lines
            },
            ticks: {
              suggestedMin: 3,
              maxTicksLimit: 6
            },
          }]
        }
      }
    });
  }

}
