/**
 * Seed script: populates Users, TrackedCompanies, TrackedPeople, and call-diet
 * junction records from the firm's call-diet spreadsheet.
 *
 * Idempotent — safe to re-run on every deploy.
 *
 * Local:  npx tsx src/scripts/seed-call-diets.ts
 * Docker: node dist/src/scripts/seed-call-diets.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEmail(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const firstInitial = parts[0].charAt(0).toLowerCase();
  const lastName = parts[parts.length - 1].toLowerCase();
  return `${firstInitial}${lastName}@ssaandco.com`;
}

// ---------------------------------------------------------------------------
// Raw call-diet data  —  [companyName, personFullName | '']
// An empty person string means track the company only (no person contact).
// ---------------------------------------------------------------------------

interface TeammateDiet {
  name: string;
  entries: [company: string, person: string][];
}

const CALL_DIETS: TeammateDiet[] = [
  {
    name: 'Andrew Jones',
    entries: [
      ['State Street', 'Lee Webb'],
      ['Colliers', 'Davoud Amel-Azizpour'],
      ['JLL', 'Russell McMillan'],
      ['AIG', 'Christophe Zaniewski'],
      ['AIG', 'Darren McCluskey'],
      ['AIG', 'Igor Viera'],
      ['AIG', 'Joel Barker'],
      ['AIG', 'Lucas Scortecci'],
      ['AIG', 'Paul Altmoos'],
      ['AIG', 'Richard Smith'],
      ['AIG', 'Tom McCloskey'],
      ['AIG', 'Dan Park'],
      ['Cushman and Wakefield', 'Adrian Forth'],
      ['Cushman and Wakefield', 'Ian Thomas'],
      ['Cushman and Wakefield', 'Richard Pickering'],
      ['Cushman and Wakefield', 'Ross Hodges'],
      ['Colliers', 'Jean Howley'],
      ['JLL', 'Nick Turner'],
      ['JLL', 'Paul Chapman'],
      ['JLL', 'Peter Downie'],
      ['JLL', 'Tracey Byer'],
      ['JLL', 'Regina Ellis'],
    ],
  },
  {
    name: 'Andrew Solar',
    entries: [
      ['Pavion', 'John Hudson'],
      ['Rotunda Capital', 'Ellen Kim'],
      ['Providence Equity Partners', 'Rush Baker'],
      ['Brown Brothers Harriman', 'Rich Yeh'],
      ['Marmic', 'Russell Chance'],
      ['Flinn Scientific', 'Jonathan Dailey'],
      ['CAC Specialty', 'Travis Naftzger'],
      ['BMO Capital Markets', 'Penn Egbert'],
      ['Wells Fargo', 'Dice Nakamura'],
      ['Griffith Foods', 'Henry Artalejo'],
      ['Pavion', 'Michael DiPaolo'],
      ['Pavion', 'Susan Post'],
      ['Marmic', 'Jason Adessa'],
      ['PPG', 'Kevin Braun'],
      ['PPG', 'Rob Massy'],
      ['SKUx', 'Bobby Tinsley'],
      ['HGGC', 'Vic Rudo'],
      ['HGGC', 'Pat Dugoni'],
      ['HGGC', 'Matthew Cox'],
      ['KKR', 'Johnny Kim'],
      ['KKR', 'Chresten Knaff'],
      ['KKR', 'Javier Justiniano'],
      ['Wind Point', 'Nathan Brown'],
      ['Wind Point', 'Clayton Finley'],
      ['Marmic', 'Greg Bochicchio'],
      ['Affinity', 'Lauren Key'],
    ],
  },
  {
    name: 'Brian Nordyke',
    entries: [
      ['Guy Carpenter', 'Yogesh Sheth'],
      ['AIG', 'Ashwin Abraham'],
      ['AIG', 'Christopher Flatt'],
      ['AIG', 'Sean McEneaney'],
      ['AIG', 'Andy Rehring'],
      ['American Modern', 'Kathleen Zortman'],
      ['Everest', 'Anthony Vidovich'],
      ['AIG', 'Alan Flynn'],
      ['PCS', 'Jenny Halim'],
      ['PCS', 'Stu Tainsky'],
      ['PCS', 'Chris Donahue'],
      ['AIG', 'Priya Gopinath'],
      ['AIG', 'Dean Bin Matt'],
      ['AIG', 'Bill Curcio'],
      ['AIG', 'Clara Feldman'],
      ['AIG', 'John Gembarski'],
      ['AIG', 'Carmine Gragnaniello'],
      ['AIG', 'Patrick Henry'],
      ['AIG', 'Stephen Kolagani'],
      ['AIG', 'Charlotte Lach'],
      ['AIG', 'Kym McCleerey'],
      ['AIG', 'Raj Preety'],
      ['AIG', 'Matt Zerilli'],
      ['AIG', 'Liz Cropper'],
      ['AIG', 'Ron Shelton'],
      ['AIG', 'Bill Rabl'],
      ['AIG', 'Gordon Brown'],
      ['AIG', 'David Miller'],
      ['Beckway', 'Sachin Sachdeva'],
      ['AIG', 'Jonathan Seigel'],
      ['AIG', 'Thomas Harris'],
      ['AIG', 'Nicole Parker'],
      ['AIG', 'Mia Tarpey'],
      ['AIG', 'Patrick Mahon'],
      ['AIG', 'Susan Clarke'],
      ['AIG', 'Joy Foo'],
      ['AIG', 'Victoria Kim'],
      ['AIG', 'Chris Bevacqua'],
      ['AIG', 'Chris Holcombe'],
      ['AIG', 'Liv Thran'],
      ['AIG', 'Vikash Nangalia'],
      ['AIG', 'Galina Ruotolo'],
      ['AIG', 'Shakshi Kamath'],
      ['Guy Carpenter', 'Joe Puleo'],
      ['Guy Carpenter', 'Neil Mayer'],
      ['Guy Carpenter', 'Tom Lucas'],
      ['PCS', 'Ross Bowie'],
      ['PCS', 'Guy Huntley'],
      ['PCS', 'Nicole Johnson'],
      ['PCS', 'Bill McDuffie'],
      ['PCS', 'Michael Garamoni'],
      ['PCS', 'Eileen Duffy'],
      ['PCS', 'Adam Tuerack'],
      ['PCS', 'Julie Wahlborg'],
      ['PCS', 'Kevin Kennedy'],
      ['PCS', 'Brian Milnamow'],
      ['PCS', 'Paul Kardosh'],
      ['PCS', 'James Meyer'],
      ['Gallagher Re', 'John Crichton'],
      ['Gallagher Re', 'Julie Navawongse'],
      ['Gallagher Re', 'Gina Butterworth'],
      ['Aon', 'Kim Muhota'],
      ['Stone Point Capital', ''],
    ],
  },
  {
    name: 'David Brink',
    entries: [
      ['ACON Investments', 'Suma Kulkarni'],
      ['Astra Capital Management', 'Brian Kirschbaum'],
      ['LNC Partners', 'Matt Kelty'],
      ['ICF', 'Shaq Dastur'],
      ['ACON Investments', 'Mo Bawa'],
      ['ACON Investments', 'Melissa Myers'],
      ['GTCR', 'Don McDonough'],
      ['Platinum Equity', 'Brandon Crawley'],
      ['Apollo Global Management', 'Brian Chu'],
      ['Juggernaut Capital Partners', 'Alex Deegan'],
      ['Arlington Capital Partners', 'Michael Lustbader'],
      ['Audax Group', 'Asheesh Gupta'],
      ['Rotunda Capital', 'Dan Lipson'],
      ['Harvest Partners', 'Nick Romano'],
      ['LLR Partners', 'Michael Levenberg'],
      ['Kohlberg & Company', 'Ahmed Wahla'],
      ['Halifax Group', 'Chris Cathcart'],
      ['Graycliff Partners', 'Brandon Martindale'],
      ['Northlane Capital Partners', 'Justin Dufour'],
      ['Sealed Air', 'Dustin Semach'],
      ['McCormick', 'Chris Wirth'],
      ['Diamond Baseball Holdings', 'Josh Burke'],
      ['Morgan Advanced Materials', 'Doug Hopek'],
      ['Procentrix', 'Ed Applegate'],
    ],
  },
  {
    name: 'Faisal Haque',
    entries: [
      ['Carrier Commercial Refrigeration', 'Jeetu Kumar'],
      ['Gemspring Capital', 'Charlie Fraas'],
      ['Vance Street Capital', 'Mike Janish'],
      ['Comvest Private Equity', 'Pete Deegan'],
      ['Odyssey Investment Partners', 'Dan Tiemann'],
      ['A-CAP', 'Kyle Peters'],
      ['Morgan Stanley', 'Max Waterous'],
      ['New State Capital Partners', 'Will Swayne'],
      ['Bertram Capital', 'Mitch Vashon'],
      ['Ardian Buyout', 'Will VandenBerg'],
      ['Capstreet', 'Kevin Johnson'],
      ['Incline Equity Partners', 'Andrei Morin-Kougoucheff'],
      ['Flinn Scientific', 'Jonathan Dailey'],
      ['SiteOne Landscape Supply', 'Dan Laughlin'],
      ['Micronics', 'Chris Cummins'],
      ['Gemspring Capital', 'Martin Mumford'],
      ['Gemspring Capital', 'Jay Reynolds'],
      ['Gemspring Capital', 'Chirag Hirawat'],
      ['Gemspring Capital', 'Adriana Scala'],
      ['OCI', 'Tim Lautermilch'],
      ['OCI', 'Tom Kauble'],
      ['OCI', 'Mike Puleo'],
      ['CID Capital', 'Chase Williams'],
      ['CID Capital', 'Cory Heck'],
      ['Odyssey Investment Partners', 'Jake Gillman'],
      ['Odyssey Investment Partners', 'Paul Ampofo'],
      ['ORIX Capital Partners', 'Scott Phillips'],
      ['Encore Consumer Capital', 'Paul Rivenburgh'],
      ['Brass Ring Capital', 'Ben Ikeda'],
      ['Brass Ring Capital', 'Will Grindell'],
      ['Valeas Capital Partners', 'Jake Montoya'],
      ['Enceladus Partners', 'Russ Spieler'],
      ['Arbor Investments', 'Carl Allegretti'],
      ['UPS', 'Brian Raab'],
      ['Mars', 'Tim Wilson'],
      ['Verizon', 'Mano Mannoochahr'],
      ['Boyd', 'Eric Struik'],
      ['Toro Company', 'Jason Baab'],
      ['Amwins Group', 'Kaitlyn Nassab'],
      ['Vantor', 'Will Cocos'],
      ['Waterloo Sparkling Water', 'Brandon Rice'],
      ['BioCryst Pharmaceuticals', 'Anurag Mehta'],
      ['Valudor Products Specialty Chemicals', 'Alberto Machado'],
      ['Wesco', 'Jerry Will'],
      ['The Massman Companies', 'Jeff Hohn'],
      ['Amsty', 'Venki Chandrashekar'],
      ['Goldman Sachs', 'Michael Tarulli'],
      ['OGE Energy', 'John Laws'],
      ["IMO's Holdings", 'Matt Pudlowski'],
      ['Renovo Home Partners', 'John Dupuy'],
      ['Edulog', 'Robert Madorsky'],
      ['Ex-Eurazeo', 'Jordan Falkoff'],
    ],
  },
  {
    name: 'Fred Asbeck',
    entries: [
      ['Bain Capital', 'Emily Ashworth'],
      ['Macquarie', 'Gerry Demas'],
      ['Evident', 'Karen Smith'],
      ['PartsSource', 'Alex Gedeon'],
      ['Bain Capital', 'Chris Kastner'],
      ['Bain Capital', 'Laura Gram'],
      ['ATW', 'Jim Predergrast'],
      ['Wabtec', 'Tim Waldee'],
      ['Wabtec', 'Lee Banks'],
      ['Bain Capital', 'Cecilia Chao'],
      ['Bain Capital', 'Liraz Evenor'],
      ['Bain Capital', 'Kevin Kerby'],
      ['Bain Capital', 'Amy Wang'],
      ['ATW', 'Eric Blackwell'],
      ['ATW', 'Matt Riter'],
      ['ATW', 'Jason Bertinetti'],
      ['PartsSource', 'DJ Conrad'],
      ['Macquarie', 'Raul Narciso'],
      ['Riverside', 'Stewart Kohl'],
    ],
  },
  {
    name: 'Jason Pereira',
    entries: [
      ['JLL', 'Jason Allalouf'],
      ['M&T Bank', 'Justin Kidwell'],
      ['Citi', 'Alberto Silva'],
      ['Protective Life', 'Ann Klobucher'],
      ['HSS', 'Mary Cassai'],
      ['Farmers', 'Ivan Lavazza'],
      ['Citi', 'Michael Yannell'],
      ['M&T Bank', 'Nick Batyko'],
      ['Lee Equity', 'Tommy Macleod'],
      ['Morgan Stanley', 'John Galante'],
      ['Avante Capital Partners', 'Chaz Cocuzza'],
      ['Protective Life', 'Matt Marino'],
      ['Morgan Stanley', 'Rich Jordan'],
      ['Morgan Stanley', 'Jim Grech'],
      ['Morgan Stanley', 'Sue Maher'],
      ['Storis', 'Don Surdoval'],
      ['Morgan Stanley', 'Blake Browne'],
      ['Morgan Stanley', 'John Coolahan'],
      ['Morgan Stanley', 'Jessica Desjardins'],
      ['Morgan Stanley', 'Pamela Everett'],
      ['Morgan Stanley', 'Robin Joines'],
      ['Morgan Stanley', 'Tracy Kennedy'],
      ['Morgan Stanley', 'Daniel Kober'],
      ['Morgan Stanley', 'Terry Mullan'],
      ['Morgan Stanley', 'Charlene Rizzo'],
      ['Morgan Stanley', 'Sara Sass'],
      ['Morgan Stanley', 'Jesse Schade'],
      ['Morgan Stanley', 'Anna Shakaryants'],
      ['Morgan Stanley', 'Jennifer Strafford'],
      ['Morgan Stanley', 'Jacob Underwood'],
      ['Morgan Stanley', 'Michael Bennett'],
      ['Morgan Stanley', 'Steve Santoro'],
      ['Citi', 'Tish-ann Johnson'],
      ['Citi', 'Laura Morris-Micioni'],
      ['Citi', 'Emily Shelton'],
      ['JPMC', 'Antonella Esposito'],
      ['JPMC', 'Jenny Mak'],
      ['JPMC', 'Michael Bennett'],
      ['Wells Fargo', 'Blaise Pierre-Louis'],
      ['State Farm', 'Sarah Bruner'],
      ['State Farm', 'Liza Hawkins'],
      ['State Farm', 'Brandon Korpella'],
      ['State Farm', 'Stephanie Mitchell'],
      ['State Farm', 'Sam Yeargin'],
      ['State Farm', 'Vijayasri Yerraguntla'],
      ['MetLife', 'Michael Roberts'],
      ['MetLife', 'Loi Stoddard-Graham'],
      ['MetLife', 'Salil Soman'],
      ['Stepstone', 'Joseph Cambareri'],
    ],
  },
  {
    name: 'Jeff Krajacic',
    entries: [
      ['Platinum Equity', 'Paul Fichiera'],
      ['Topspin Consumer Partners', 'Ojas Vahia'],
      ['Platinum Equity', 'Jared Hutchins'],
      ['Platinum Equity', 'Martin DeZell'],
      ['Radial Equity', 'David Knoch'],
      ['Platinum Equity', 'Bob Glied'],
      ['Radial Equity', 'Blake Austin'],
      ['Platinum Equity', 'Geza Garai'],
      ['Platinum Equity', 'Dan Martin'],
      ['Novipax', 'Tim Keneally'],
      ['Platinum Equity', 'Randy Fike'],
      ['Platinum Equity', 'Nick Colagiovanni'],
      ['Mason Wells', 'Tom Smith'],
      ['BlueCrest', 'Richard Smith'],
      ['Morgan Stanley', 'Eric Kanter'],
      ['Platinum Equity', 'Bill Nowicke'],
      ['Platinum Equity', 'Brandon Crawley'],
      ['Platinum Equity', 'Renee Koontz'],
      ['Platinum Equity', 'Duncan Murdock'],
      ['Topspin Consumer Partners', 'Stephen Parks'],
      ['Topspin Consumer Partners', 'Ekta Sharma'],
      ['Mason Wells', 'Brady Walsh'],
      ['Mason Wells', 'Jay Radtke'],
      ['Littlejohn', ''],
    ],
  },
  {
    name: 'Jill Jones',
    entries: [
      ['Bank of America', 'Yetunde Ekunwe'],
      ['Citadel', 'Sean Carroll'],
      ['Morgan Stanley', 'Cindy Dishmey'],
      ['Jefferies', 'Michael Aiello'],
      ['Morgan Stanley', 'Soo-Mi Lee'],
      ['State Street', 'Kwaku Adu-Gyamfi'],
      ['US Bank', 'Darren Hodges'],
      ['US Bank', 'Chrystel Pierre'],
      ['Morgan Stanley', 'Wesley McDade'],
      ['JPMC', 'Henry Soo Hoo'],
      ['TransUnion', 'Tiffani Chambers'],
      ['HSBC', 'Sophie Taylor'],
      ['Citi', 'Nicola Kane'],
      ['Deutsche Bank', 'Bob Werner'],
      ['State Street', 'Richard Flom'],
      ['Bank of America', 'Rosanne Reneo'],
      ['Citadel', 'Nancy Licul'],
      ['Federal Reserve Bank of NY', 'Dan DeLuca'],
      ['JPMC', 'Julie Harris'],
      ['Morgan Stanley', 'Tracy Torres'],
      ['Morgan Stanley', 'Michael Boublik'],
      ['TIAA', 'Reggie Chambers'],
      ['Wells Fargo', 'Ekene Ezulike'],
      ['Wells Fargo', 'Baris Senoglu'],
      ['Wells Fargo', 'Kalima Mayo-Perez'],
      ['Marsh', ''],
    ],
  },
  {
    name: 'Jim Quallen',
    entries: [
      ['TPG Capital', 'Dave Dvorin'],
      ['TPG Capital', 'Drew Conrad'],
      ['XR Extreme Reach', 'Jeff Hawkins'],
      ['New Mountain Capital', 'Mike Rotondo'],
      ['TPG Capital', 'Kimberly Simms'],
      ['ST6', 'David Jaggard'],
      ['Skillsoft', 'John Frederick'],
      ['Vista Equity Partners', 'Kiran Rao'],
      ['American Pacific Group', 'John Starr'],
      ['SiteCore', 'Eric Stine'],
      ['USALCO', 'Ken Gayer'],
      ['HIG Capital', 'Jon Fox'],
      ['TPG Capital', 'Bill Schwidder'],
      ['TPG Capital', 'Jeff Arvin'],
      ['TPG Capital', 'Caroline Ritter'],
      ['TPG Capital', 'Subhi Sherwell'],
      ['TPG Capital', "Steven O'Keefe"],
      ['TPG Capital', 'John Lin'],
      ['TPG Capital', 'Andy Doyle'],
      ['TPG Capital', 'John Schilling'],
      ['TPG Capital', 'Dan Allen'],
      ['TPG Capital', 'Rob Roley'],
      ['TPG Capital', 'Dan Frankfort'],
      ['HIG Capital', 'Chris Kozak'],
      ['XR Extreme Reach', 'Chandler Bigelow'],
      ['XR Extreme Reach', 'Ginger Bushell'],
    ],
  },
  {
    name: 'John Rodgers',
    entries: [
      ['Gallagher Re', 'John Crichton'],
    ],
  },
  {
    name: 'Kathy Pangier',
    entries: [
      ['AIG', 'Angie Kennard'],
      ['Wells Fargo', 'Karen Almendinger'],
      ['T Rowe Price', 'Nelmaris Alvarez'],
      ['Nike', 'Corrina Poland'],
      ['Plymouth Rock Assurance', 'Bret Gordon'],
      ['Comerica', 'Kathryn Torigian'],
      ['AIG', 'Dean Bin-Matt'],
      ['Coca-Cola', 'Brian Hong'],
      ['Panasonic', 'Tom Korte'],
    ],
  },
  {
    name: 'Matt Katz',
    entries: [
      ['Goldman Sachs', 'Prerak Vohra'],
    ],
  },
  {
    name: 'Matt Wilson',
    entries: [
      ['Parker Hannifin', 'Matt Jacobson'],
      ['Bain Capital', 'Laura Gram'],
      ['Johnson Controls', 'Ian Reynell'],
      ['Inspire Brands', 'Dave Graves'],
      ['GE Healthcare', 'Larry Boyd'],
      ['Topspin Consumer Partners', 'Ojas Vahia'],
      ['Topspin Consumer Partners', 'Ekta Sharma'],
      ['Topspin Consumer Partners', 'Stephen Parks'],
      ['Rehlko', 'Ashley Basom'],
      ['Rehlko', 'Steve Colbert'],
      ['1440 Foods', 'Anthony Ruiz'],
      ['1440 Foods', 'Leslie Calhoun'],
      ['Three Dog Brands', 'Brian Winter'],
      ['Three Dog Brands', 'Tracy Walker'],
      ['Evident', 'Karen Smith'],
      ['Wabtec', 'Christine Flahive'],
      ['Evident', 'Martin Scheunemass'],
      ['Evident', 'Andreas Matzke'],
      ['E2G Food', 'Pete Henderson'],
      ['E2G Food', 'Bertie Turner'],
      ['FirstKey', 'Rob Burkart'],
      ['Newell Brands', 'Andrew Maze'],
      ['Johnson Controls', 'Patrick Forror'],
      ['Johnson Controls', 'Jill Roberson'],
      ['Trek Partners', 'Tim Trostle'],
    ],
  },
  {
    name: 'Nick Kramer',
    entries: [
      ['DataRobot', 'Brandon Peters'],
      ['Caseware', 'Chris Nagy'],
      ['Fannie Mae', 'Peter Ghavami'],
      ['Foot Locker', 'Matt Giunipero'],
      ['Disney', 'Wendy Lee'],
      ['PayPal', 'Alex Rosenthal'],
      ['eBay', 'Brita Turner'],
      ['DataRobot', 'Nathan Katch'],
      ['CapGemini', 'Frederic Marimot'],
      ['CapGemini', 'James Webster'],
      ['Fannie Mae', 'Michael Lee'],
      ['Fannie Mae', 'Tarik Elharaoui'],
      ['Guy Carpenter', 'Alan Anders'],
      ['Johnson Outdoors', 'Pat Penman'],
      ['SiriusPoint', 'Jim McKinney'],
    ],
  },
  {
    name: 'Paul Ashcroft',
    entries: [
      ['Exxon', 'Bill Chase'],
      ['Exxon', 'Andrew Wright'],
    ],
  },
  {
    name: 'Pierre Buhler',
    entries: [
      ['CapGemini', 'Steve Hilton'],
      ['Fannie Mae', 'Tarik Elharaoui'],
      ['CapGemini', 'Nick Hartman'],
      ['Broadridge', 'Anjali Kampschulte'],
      ['CapGemini', 'James Webster'],
      ['Fannie Mae', 'Courtney Goodrich'],
      ['MetLife', 'Michael Roberts'],
      ['JPMC', 'Jonathan Teplitz'],
      ['Federal Reserve Bank of NY', 'Patrick Coster'],
      ['JPMC', 'Rosario Vaina'],
      ['JPMC', 'William Harris'],
      ['MetLife', 'Danny Garver'],
      ['JLL', 'Tom McAdam'],
      ['Jefferies', 'Manuel Barbero'],
      ['Fannie Mae', 'Peter Akwaboah'],
      ['Google', 'Jonathan Baum'],
      ['CapGemini', 'Frederic Marimot'],
      ['Fannie Mae', 'Bradley Bolivar'],
      ['Fannie Mae', 'Chryssa Halley'],
      ['Fannie Mae', 'Michael Lee'],
      ['JPMC', 'Darrin Alves'],
      ['JPMC', 'Jose Sousa'],
      ['JPMC', 'Arvind Joshi'],
      ['JPMC', 'Ranjit Samra'],
      ['JPMC', 'Lia Correa'],
      ['JPMC', 'Gavin Hau'],
      ['JPMC', 'Stephen DiGianno'],
      ['MetLife', 'Ramy Tadros'],
      ['MetLife', 'Angelo Mitsopoulos'],
      ['Morgan Stanley', 'Mike Sztejnberg'],
      ['Morgan Stanley', 'Phil Davies'],
      ['Morgan Stanley', 'Michael Poser'],
      ['Morgan Stanley', 'Andy Cadel'],
      ['Morgan Stanley', 'Brenda Sirena'],
      ['Morgan Stanley', 'Jeff Brodsky'],
      ['JLL', 'David Kollmorgen'],
      ['Barclays', 'Vicki Harris'],
      ['Barclays', 'Greg Passeri'],
      ['Jefferies', 'Jeffrey Zhou'],
      ['Kyndryl', 'Javor Pishev'],
      ['Kyndryl', 'Joe Capalbo'],
      ['S&P', 'Martina Cheung'],
    ],
  },
  {
    name: 'Rajeev Aggarwal',
    entries: [
      ['Huws Gray (Blackstone)', 'Daksh Gupta'],
      ['AIG', 'David Miller'],
      ['TransUnion', 'Sam Welch'],
      ['AIG', 'Dean Bin-Matt'],
      ['Hampshire Trust Bank', 'Yogesh Patel'],
      ['Arch', 'Miriam Reid'],
      ['AIG', 'Melissa Twinning Davis'],
      ['AIG', 'Kelly Nobles'],
      ['AIG', 'Dan Park'],
      ['AIG', 'Charlotte Lach'],
      ['AIG', 'Geraud Vergille'],
      ['AIG', 'Patrick Mahon'],
      ['AIG', 'Darren McCluskey'],
      ['AIG', 'Mariusz Mlynaczyk'],
      ['AIG', 'Sila Bendowski'],
      ['AIG', 'Richard Smith'],
      ['AIG', 'Crista DeStefano'],
      ['Nationwide Bank', 'Richard Francis'],
      ['Frasers', 'Hetal Trivedi'],
      ['AIG', 'Joel Barker'],
      ['AIG', 'Mitesh Patel'],
      ['AIG', 'Laura Hunt'],
      ['AIG', 'Ian Davies'],
      ['AIG', 'Ray Storan'],
      ['AIG', 'Igor Viera'],
      ['AIG', 'Huned Ujjainwala'],
      ['AIG', 'Barry Stoneham'],
      ['AIG', 'Jean McInnes'],
      ['AIG', 'Stephen Kolagani'],
      ['AIG', 'Lucas Scortecci'],
      ['AIG', 'Dennis Fronenberg'],
      ['AIG', 'Preety Raj'],
      ['AIG', 'Rongling You'],
      ['Allianz', 'Thomas Lillelund'],
      ['Allianz', 'Jeremy Sharpe'],
      ['Allianz', 'Olivia Culyer'],
      ['AXA', ''],
      ['Zurich', ''],
      ['TransUnion', 'Mike Davies'],
      ['TransUnion', 'Neil Hart'],
      ['Natwest', 'George Toumbev'],
    ],
  },
  {
    name: 'Wayne Dix',
    entries: [
      ['McGraw Hill Education', 'Dave Cortese'],
      ['Protective Life', 'Matthew Kohler'],
      ['Protective Life', 'Wade Harrison'],
      ['Protective Life', 'D Scott Adams'],
      ['Protective Life', 'Brandy McNalis'],
      ['Protective Life', 'Matthew Marino'],
      ['Protective Life', 'Joe Nuszkowski'],
      ['Protective Life', 'Aaron Seurkamp'],
      ['Protective Life', 'Paul Wells'],
      ['Corebridge', 'Jeff Ferguson'],
      ['Corebridge', 'Chris Smith'],
      ['Corebridge', 'AJ Singh'],
      ['Everest', 'Elias Hadayeb'],
      ['Covetrus', 'Kelly Gottfried'],
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Seeding call diets ===');

  // ------ 1. Collect unique companies and people ------
  const companyNames = new Set<string>();
  // key = "personName|||companyName" to de-dup across teammates
  const personKeys = new Map<string, { name: string; company: string }>();

  for (const td of CALL_DIETS) {
    for (const [company, person] of td.entries) {
      companyNames.add(company);
      if (person) {
        const key = `${person}|||${company}`;
        if (!personKeys.has(key)) {
          personKeys.set(key, { name: person, company });
        }
      }
    }
  }

  console.log(`  ${CALL_DIETS.length} teammates, ${companyNames.size} companies, ${personKeys.size} people`);

  // ------ 2. Upsert tracked companies ------
  const companyMap = new Map<string, string>(); // name → id
  for (const name of companyNames) {
    let co = await prisma.trackedCompany.findFirst({ where: { name } });
    if (!co) {
      co = await prisma.trackedCompany.create({ data: { name } });
      console.log(`  + Company: ${name}`);
    }
    companyMap.set(name, co.id);
  }

  // ------ 3. Upsert tracked people ------
  const personMap = new Map<string, string>(); // "name|||company" → id
  for (const [key, { name, company }] of personKeys) {
    const companyId = companyMap.get(company)!;
    let person = await prisma.trackedPerson.findFirst({
      where: { name, companyId },
    });
    if (!person) {
      person = await prisma.trackedPerson.create({
        data: { name, companyAffiliation: company, companyId },
      });
    }
    personMap.set(key, person.id);
  }
  console.log(`  Tracked people synced`);

  // ------ 4. Upsert users and wire call-diet links ------
  for (const td of CALL_DIETS) {
    const email = toEmail(td.name);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: td.name, role: 'MEMBER', status: 'ACTIVE' },
      update: { name: td.name }, // keep existing role/status if already present
    });

    // Deduplicate companies and people for this user
    const userCompanyIds = new Set<string>();
    const userPersonIds = new Set<string>();

    for (const [company, person] of td.entries) {
      const companyId = companyMap.get(company)!;
      userCompanyIds.add(companyId);

      if (person) {
        const personId = personMap.get(`${person}|||${company}`)!;
        userPersonIds.add(personId);
      }
    }

    // Upsert company links
    for (const companyId of userCompanyIds) {
      await prisma.userCallDietCompany.upsert({
        where: { userId_companyId: { userId: user.id, companyId } },
        create: { userId: user.id, companyId },
        update: {},
      });
    }

    // Upsert person links
    for (const personId of userPersonIds) {
      await prisma.userCallDietPerson.upsert({
        where: { userId_personId: { userId: user.id, personId } },
        create: { userId: user.id, personId },
        update: {},
      });
    }

    console.log(
      `  ${td.name} (${email}): ${userCompanyIds.size} companies, ${userPersonIds.size} people`,
    );
  }

  console.log('=== Call diet seeding complete ===');
}

main()
  .catch((e) => {
    console.error('Error seeding call diets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
