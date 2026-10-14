-- =============================================================
--  CHRONOLEGENDS — Contenu des cartes en anglais
--  À coller UNE FOIS dans Supabase : SQL Editor → New query → Run.
--
--  Ajoute 4 colonnes anglaises à la table des cartes (le français
--  reste la langue de référence) et traduit les 43 cartes existantes.
--  Une carte sans traduction s'affiche en français dans le jeu anglais.
--  Dates : BCE / CE (notation neutre), « c. » = vers, « r. » = règne.
-- =============================================================

alter table public.cartes add column if not exists nom_en         text;
alter table public.cartes add column if not exists dates_en       text;
alter table public.cartes add column if not exists lieu_en        text;
alter table public.cartes add column if not exists description_en text;

update public.cartes as c set
  nom_en = t.nom_en, dates_en = t.dates_en, lieu_en = t.lieu_en, description_en = t.description_en
from (values
  ('zeus', 'Zeus', 'Greek mythology', 'Mount Olympus, Greece',
   'King of the Olympian gods in Greek mythology, master of the sky and thunder. Father of many gods and heroes.'),
  ('anubis', 'Anubis', 'Egyptian mythology', 'Ancient Egypt',
   'Funerary god of ancient Egypt, depicted with the head of a jackal. He presides over embalming and the weighing of the hearts of the dead.'),
  ('ishtar', 'Ishtar', 'Mesopotamian mythology', 'Mesopotamia',
   'Mesopotamian goddess of love and war, associated with the planet Venus. She was worshipped in Babylon, notably at the Ishtar Gate.'),
  ('nuwa', 'Nüwa', 'Chinese mythology', 'China',
   'Creator goddess of Chinese mythology. Tradition credits her with creating humankind and repairing the sky after a catastrophe.'),
  ('quetzalcoatl', 'Quetzalcoatl', 'Mesoamerican mythology', 'Mesoamerica',
   'The "Feathered Serpent", a major deity of Mesoamerica. Associated with wind, knowledge and the morning star, he was worshipped by the Aztecs.'),
  ('maui', 'Māui', 'Polynesian mythology', 'Polynesia',
   'Mischievous demigod and hero of Polynesian mythology. Many stories credit him with fishing up islands and capturing the sun.'),
  ('alexandre', 'Alexander the Great', '356 – 323 BCE', 'Macedonia',
   'King of Macedonia at twenty. His campaigns overthrow the Achaemenid Persian Empire and extend his rule from Greece to the Indus Valley.'),
  ('cesar', 'Julius Caesar', '100 – 44 BCE', 'Rome',
   'Roman general and statesman. He conquers Gaul, wins the civil war and becomes dictator. He is assassinated during a session of the Senate.'),
  ('confucius', 'Confucius', '551 – 479 BCE', 'State of Lu, China',
   'Thinker and teacher. His sayings, gathered by his disciples in the Analects, have had a lasting influence on ethics and government in East Asia.'),
  ('qin-shi-huang', 'Qin Shi Huang', '259 – 210 BCE', 'China',
   'First emperor of a unified China in 221 BCE. He standardizes writing, currency and measures. His tomb is guarded by the Terracotta Army.'),
  ('cleopatre', 'Cleopatra VII', '69 – 30 BCE', 'Alexandria, Egypt',
   'Last ruler of the Ptolemaic dynasty. Allied with Caesar, then Mark Antony, she dies after the defeat by Octavian; Egypt becomes a Roman province.'),
  ('bouddha', 'Siddhartha Gautama', '5th c. BCE (dates debated)', 'Ganges Plain',
   'Known as the Buddha. The teachings attributed to him are the origin of Buddhism, which spread across much of Asia.'),
  ('ashoka', 'Ashoka', 'c. 304 – 232 BCE', 'Maurya Empire, India',
   'Mauryan emperor. After the bloody conquest of Kalinga, he supports Buddhism and has his edicts carved on rocks and pillars across the empire.'),
  ('hannibal', 'Hannibal Barca', '247 – 183 BCE', 'Carthage',
   'Carthaginian general of the Second Punic War. He crosses the Alps with his army in 218 BCE and crushes the Romans at Cannae in 216.'),
  ('ramses-ii', 'Ramesses II', 'c. 1303 – 1213 BCE', 'Egypt',
   'Pharaoh of the 19th Dynasty who reigns for over sixty years. He fights the Hittites at Kadesh, then concludes one of the oldest known peace treaties with them.'),
  ('cyrus-ii', 'Cyrus II', 'c. 600 – 530 BCE', 'Persia',
   'Founder of the Achaemenid Persian Empire. He conquers Media, Lydia and then Babylon in 539 BCE, forming the largest empire of his time.'),
  ('aristote', 'Aristotle', '384 – 322 BCE', 'Greece',
   'Philosopher, student of Plato and tutor of Alexander. His works cover logic, physics, biology, ethics and politics.'),
  ('hammurabi', 'Hammurabi', 'r. c. 1792 – 1750 BCE', 'Babylon',
   'King of Babylon who unified Mesopotamia. His collection of nearly 300 laws, carved on a basalt stele, is kept at the Louvre Museum.'),
  ('archimede', 'Archimedes', 'c. 287 – 212 BCE', 'Syracuse, Sicily',
   'Mathematician, physicist and engineer, known for his principle of bodies immersed in a fluid. He dies when Rome captures Syracuse.'),
  ('pericles', 'Pericles', 'c. 495 – 429 BCE', 'Athens',
   'Athenian statesman and general for some thirty years. He has the Parthenon built and dies in the epidemic that strikes Athens in 429 BCE.'),
  ('sun-tzu', 'Sun Tzu', '6th – 5th c. BCE', 'China',
   'Strategist traditionally credited with The Art of War, a military treatise still studied today. His historical existence remains debated.'),
  ('spartacus', 'Spartacus', 'c. 103 – 71 BCE', 'Roman Italy',
   'Gladiator of Thracian origin. He leads the largest slave revolt of the Roman Republic, crushed by Crassus in 71 BCE.'),
  ('boudicca', 'Boudicca', 'died c. 61 CE', 'Roman Britain',
   'Queen of the Iceni, a people of what is now eastern England. She leads an uprising against Roman occupation, which is ultimately defeated.'),
  ('vercingetorix', 'Vercingetorix', 'c. 82 – 46 BCE', 'Gaul',
   'Arverni chieftain who unites Gallic peoples against Caesar. Besieged at Alesia in 52 BCE, he surrenders; he is executed in Rome six years later.'),
  ('hatchepsout', 'Hatshepsut', 'r. c. 1479 – 1458 BCE', 'Egypt',
   'Female pharaoh of the 18th Dynasty. Her reign is marked by great building projects, including the temple of Deir el-Bahari, and an expedition to the Land of Punt.'),
  ('piye', 'Piye', 'r. c. 744 – 714 BCE', 'Kingdom of Kush (Sudan)',
   'King of Kush, a Nile Valley state south of Egypt. He conquers Egypt and founds the 25th, or Kushite, Dynasty.'),
  ('chandragupta', 'Chandragupta Maurya', 'c. 340 – 297 BCE', 'India',
   'Founder of the Maurya Empire, the first state to unify most of the Indian subcontinent. He is the grandfather of Ashoka.'),
  ('nabuchodonosor', 'Nebuchadnezzar II', 'c. 634 – 562 BCE', 'Babylon',
   'King of Babylon. He embellishes his capital, notably with the Ishtar Gate, and takes Jerusalem in 587 BCE, deporting part of its population.'),
  ('zenobie', 'Zenobia', 'c. 240 – after 274 CE', 'Palmyra, Syria',
   'Queen of Palmyra. In her son''s name, she extends her rule over Egypt and part of Anatolia before being defeated by Emperor Aurelian in 272.'),
  ('sappho', 'Sappho', 'c. 630 – 570 BCE', 'Lesbos, Greece',
   'Lyric poet. Her work, greatly admired in Antiquity, has survived only in fragments.'),
  ('herodote', 'Herodotus', 'c. 484 – 425 BCE', 'Halicarnassus, Anatolia',
   'Author of the Histories, an account of the Greco-Persian Wars. Cicero calls him "the father of history".'),
  ('hypatie', 'Hypatia', 'c. 360 – 415 CE', 'Alexandria, Egypt',
   'Mathematician, astronomer and Neoplatonist philosopher. She teaches in Alexandria, where she is killed by a mob in 415.'),
  ('zhang-qian', 'Zhang Qian', 'died 113 BCE', 'China',
   'Diplomat of the Han dynasty. His missions to Central Asia open regular contacts that foreshadow the Silk Roads.'),
  ('ban-zhao', 'Ban Zhao', 'c. 45 – 117 CE', 'China',
   'Historian and scholar. She completes the Book of Han, the official history of the dynasty begun by her father and brother.'),
  ('ezana', 'Ezana', '4th c. CE', 'Aksum (Ethiopia)',
   'King of Aksum, a trading power of the Red Sea. He adopts Christianity around 330, as shown by his inscriptions and coins.'),
  ('imhotep', 'Imhotep', '27th c. BCE', 'Egypt',
   'High official of Pharaoh Djoser, credited with designing the Step Pyramid of Saqqara. He is deified long after his death.'),
  ('siyaj-kak', 'Siyaj K''ak''', 'active c. 378 CE', 'Tikal (Guatemala)',
   'Figure linked to Teotihuacan. According to Maya inscriptions, his arrival at Tikal in 378 coincides with a change of dynasty.'),
  ('yax-kuk-mo', 'K''inich Yax K''uk'' Mo''', '5th c. CE', 'Copán (Honduras)',
   'Founder, in 426, of the dynasty that rules the Maya city of Copán for nearly four centuries.'),
  ('thales', 'Thales of Miletus', 'c. 625 – 547 BCE', 'Miletus, Ionia',
   'Considered one of the first Greek philosophers. Tradition credits him with work in geometry and the prediction of an eclipse.'),
  ('kanishka', 'Kanishka', '2nd c. CE', 'Kushan Empire',
   'Ruler of the Kushan Empire, from Central Asia to northern India. He supports Buddhism and the flourishing of Gandhara art.'),
  ('pytheas', 'Pytheas', '4th c. BCE', 'Massalia (Marseille)',
   'Greek navigator and astronomer. He explores the coasts of the North Atlantic and describes a distant land he calls Thule.'),
  ('roi-david', 'King David', 'c. 1040 – 970 BCE', 'Kingdom of Israel',
   'Second king of Israel. He unites the tribes and conquers Jerusalem. The name of his dynasty appears on the Tel Dan Stele.'),
  ('jeanne-d-arc', 'Joan of Arc', 'c. 1412 – 1431', 'Kingdom of France',
   'During the Hundred Years'' War, this young peasant helps lift the siege of Orléans in 1429 and has Charles VII crowned at Reims. Captured, she is burned at Rouen in 1431.')
) as t(id, nom_en, dates_en, lieu_en, description_en)
where c.id = t.id;

-- Vérification : doit afficher 43 cartes traduites et 0 sans traduction.
select count(*) filter (where nom_en is not null) as cartes_traduites,
       count(*) filter (where nom_en is null)     as sans_traduction
from public.cartes;
