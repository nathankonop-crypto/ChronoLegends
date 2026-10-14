-- =============================================================
--  CHRONOLEGENDS — 7. « En savoir plus » / « Learn more »
--  Un texte plus long, qui prolonge la description de la carte.
--  Affiché dans le jeu sous la carte agrandie, uniquement pour la
--  gamme « Personnage historique ».
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

alter table cartes add column if not exists en_savoir_plus text;
alter table cartes add column if not exists en_savoir_plus_en text;

alter table cartes drop constraint if exists en_savoir_plus_longueur;
alter table cartes add constraint en_savoir_plus_longueur
  check (char_length(en_savoir_plus) <= 1000 and char_length(en_savoir_plus_en) <= 1000);

-- ---------- Textes des 46 personnages historiques ----------

update cartes set
  en_savoir_plus = $$Élève d'Aristote, il succède à son père Philippe II, assassiné en 336 av. J.-C. Vainqueur de Darius III à Issos puis à Gaugamèles, il fonde de nombreuses cités, dont Alexandrie en Égypte. Arrivés sur l'Hyphase, en Inde, ses soldats épuisés refusent d'aller plus loin. Il meurt à Babylone à 32 ans. Son empire est aussitôt partagé entre ses généraux, mais la culture grecque se diffuse durablement en Orient : c'est le début de l'époque hellénistique.$$,
  en_savoir_plus_en = $$A pupil of Aristotle, he succeeds his father Philip II, assassinated in 336 BCE. After defeating Darius III at Issus and Gaugamela, he founds many cities, including Alexandria in Egypt. On reaching the Hyphasis river in India, his exhausted soldiers refuse to go further. He dies in Babylon aged 32. His empire is quickly divided among his generals, but Greek culture takes lasting root in the East, opening the Hellenistic age.$$
where id = 'alexandre';

update cartes set
  en_savoir_plus = $$Issu d'une vieille famille patricienne, il s'allie à Pompée et Crassus dans le premier triumvirat. En 49 av. J.-C., il franchit le Rubicon avec ses légions, déclenchant la guerre civile contre Pompée. Au pouvoir, il réforme le calendrier : le calendrier julien est l'ancêtre du nôtre. Le 15 mars 44 av. J.-C., aux Ides de mars, il est poignardé par des sénateurs, dont Brutus et Cassius. Son fils adoptif Octavien deviendra Auguste, le premier empereur romain.$$,
  en_savoir_plus_en = $$Born into an old patrician family, he allies with Pompey and Crassus in the First Triumvirate. In 49 BCE he crosses the Rubicon with his legions, starting a civil war against Pompey. In power, he reforms the calendar: the Julian calendar is the ancestor of ours. On the Ides of March, 44 BCE, he is stabbed by senators including Brutus and Cassius. His adopted son Octavian later becomes Augustus, Rome's first emperor.$$
where id = 'cesar';

update cartes set
  en_savoir_plus = $$Issu d'une famille modeste de la petite noblesse, il occupe quelques charges dans l'État de Lu, puis voyage de cour en cour pour proposer ses idées aux princes, sans grand succès. Il enseigne la bienveillance (ren), le respect des rites, la piété filiale et l'importance de l'étude. Il accepte des élèves de toutes origines, ce qui est nouveau pour l'époque. Sous la dynastie Han, son enseignement devient la base de la formation des fonctionnaires ; les examens impériaux reposent sur les classiques confucéens jusqu'en 1905.$$,
  en_savoir_plus_en = $$From a modest family of the minor nobility, he holds a few posts in the state of Lu, then travels from court to court offering his ideas to rulers, with little success. He teaches benevolence (ren), respect for rituals, filial piety and the value of learning. He accepts students of any background, which is new for his time. Under the Han dynasty his teaching becomes the basis for training officials, and the imperial examinations rely on the Confucian classics until 1905.$$
where id = 'confucius';

update cartes set
  en_savoir_plus = $$Né Ying Zheng, il devient roi de Qin à 13 ans. En une dizaine d'années, il conquiert les six royaumes rivaux et met fin à la période des Royaumes combattants. Il prend le titre nouveau de « premier empereur », relie des murailles existantes, ancêtres de la Grande Muraille, et fait construire routes et canaux. Son règne est aussi marqué par une répression sévère : la tradition rapporte des livres brûlés et des lettrés exécutés. Obsédé par l'immortalité, il meurt en voyage ; sa dynastie s'effondre quatre ans plus tard.$$,
  en_savoir_plus_en = $$Born Ying Zheng, he becomes king of Qin at 13. Within about a decade he conquers the six rival kingdoms, ending the Warring States period. He takes the new title of 'First Emperor', links existing walls, forerunners of the Great Wall, and builds roads and canals. His reign is also marked by harsh repression: tradition tells of burned books and executed scholars. Obsessed with immortality, he dies while travelling; his dynasty collapses four years later.$$
where id = 'qin-shi-huang';

update cartes set
  en_savoir_plus = $$Descendante de Ptolémée, un général d'Alexandre, elle est la première de sa dynastie à parler égyptien, en plus du grec et de plusieurs autres langues. Écartée du pouvoir par son frère Ptolémée XIII, elle retrouve son trône grâce à César, dont elle a un fils, Césarion. Avec Marc Antoine, elle a trois enfants et réorganise avec lui l'Orient romain. Après la défaite navale d'Actium en 31 av. J.-C., Antoine se donne la mort ; Cléopâtre meurt peu après à Alexandrie, selon la tradition par la morsure d'un aspic.$$,
  en_savoir_plus_en = $$A descendant of Ptolemy, one of Alexander's generals, she is the first of her dynasty to speak Egyptian, besides Greek and several other languages. Pushed from power by her brother Ptolemy XIII, she regains the throne with Caesar's help and bears him a son, Caesarion. With Mark Antony she has three children and reorganises the Roman East. After the naval defeat at Actium in 31 BCE, Antony takes his own life; Cleopatra dies soon after in Alexandria, by tradition from the bite of an asp.$$
where id = 'cleopatre';

update cartes set
  en_savoir_plus = $$Selon la tradition, il naît prince à Lumbini, dans l'actuel Népal, au sein du clan des Shakya. Frappé par la vieillesse, la maladie et la mort, il quitte sa famille vers 29 ans pour chercher une issue à la souffrance. Après des années d'ascèse, il atteint l'Éveil sous un arbre, à Bodh-Gaya. Il enseigne alors les Quatre Nobles Vérités et la Voie du milieu, et fonde une communauté de moines et de nonnes. Il meurt à Kushinagar vers 80 ans ; ses enseignements sont transmis oralement avant d'être mis par écrit.$$,
  en_savoir_plus_en = $$According to tradition, he is born a prince at Lumbini, in today's Nepal, into the Shakya clan. Struck by old age, sickness and death, he leaves his family around the age of 29 to seek an end to suffering. After years of asceticism, he attains Awakening beneath a tree at Bodh Gaya. He then teaches the Four Noble Truths and the Middle Way, and founds a community of monks and nuns. He dies at Kushinagar aged about 80; his teachings are passed on orally before being written down.$$
where id = 'bouddha';

update cartes set
  en_savoir_plus = $$Petit-fils de Chandragupta, il hérite d'un empire qui couvre déjà presque tout le sous-continent. Selon ses propres édits, la conquête du Kalinga, vers 261 av. J.-C., fait plus de cent mille morts, et il en exprime ensuite des remords. Il prône alors le dhamma : tolérance entre les religions, respect de la vie, bienveillance envers les sujets. Il envoie des missions bouddhistes jusqu'au Sri Lanka et vers le monde hellénistique. Le chapiteau aux lions de son pilier de Sarnath est aujourd'hui l'emblème de l'Inde.$$,
  en_savoir_plus_en = $$Grandson of Chandragupta, he inherits an empire already covering most of the subcontinent. According to his own edicts, the conquest of Kalinga around 261 BCE costs over a hundred thousand lives, and he later expresses remorse. He then promotes dhamma: tolerance between religions, respect for life and care for his subjects. He sends Buddhist missions as far as Sri Lanka and the Hellenistic world. The lion capital of his pillar at Sarnath is now the national emblem of India.$$
where id = 'ashoka';

update cartes set
  en_savoir_plus = $$Fils du général Hamilcar Barca, il aurait juré dès l'enfance une hostilité éternelle à Rome. Parti d'Espagne avec des dizaines de milliers d'hommes et des éléphants de guerre, il traverse les Pyrénées puis les Alpes en plein automne. Après Cannes, il reste quinze ans en Italie sans parvenir à prendre Rome. Rappelé en Afrique, il est battu par Scipion l'Africain à Zama en 202 av. J.-C. Exilé, il se met au service de rois d'Orient, puis s'empoisonne pour ne pas être livré aux Romains.$$,
  en_savoir_plus_en = $$Son of the general Hamilcar Barca, he is said to have sworn eternal hostility to Rome as a child. Setting out from Spain with tens of thousands of men and war elephants, he crosses the Pyrenees and then the Alps in autumn. After Cannae he remains in Italy for fifteen years without managing to take Rome. Recalled to Africa, he is defeated by Scipio Africanus at Zama in 202 BCE. In exile he serves eastern kings, then takes poison rather than be handed over to the Romans.$$
where id = 'hannibal';

update cartes set
  en_savoir_plus = $$Fils de Séthi Ier, il monte sur le trône vers 25 ans. Grand bâtisseur, il fait élever les temples d'Abou Simbel, agrandit Karnak et Louxor et fonde une nouvelle capitale dans le delta, Pi-Ramsès. La bataille de Qadesh, vers 1274 av. J.-C., n'a pas de vainqueur net, mais les murs de ses temples la présentent comme une victoire. Il a une centaine d'enfants, dont beaucoup meurent avant lui. Sa momie, retrouvée en 1881, est aujourd'hui exposée au Caire.$$,
  en_savoir_plus_en = $$Son of Seti I, he takes the throne at about 25. A great builder, he raises the temples of Abu Simbel, enlarges Karnak and Luxor, and founds a new capital in the Delta, Pi-Ramesses. The battle of Kadesh, around 1274 BCE, has no clear winner, yet his temple walls present it as a victory. He fathers around a hundred children, many of whom die before him. His mummy, found in 1881, is now on display in Cairo.$$
where id = 'ramses-ii';

update cartes set
  en_savoir_plus = $$Issu de la dynastie perse des Achéménides, il renverse son suzerain mède Astyage vers 550 av. J.-C. Il bat ensuite Crésus, le riche roi de Lydie, avant d'entrer dans Babylone. Il laisse les peuples conquis garder leurs coutumes et leurs cultes ; selon la Bible, il autorise les Judéens exilés à rentrer à Jérusalem et à rebâtir leur Temple. Le cylindre de Cyrus, conservé au British Museum, célèbre sa prise de Babylone. Il meurt au combat en Asie centrale ; son tombeau se dresse toujours à Pasargades.$$,
  en_savoir_plus_en = $$From the Persian Achaemenid dynasty, he overthrows his Median overlord Astyages around 550 BCE. He then defeats Croesus, the wealthy king of Lydia, before entering Babylon. He lets conquered peoples keep their customs and cults; according to the Bible, he allows the exiled Judeans to return to Jerusalem and rebuild their Temple. The Cyrus Cylinder, kept at the British Museum, celebrates his capture of Babylon. He dies in battle in Central Asia; his tomb still stands at Pasargadae.$$
where id = 'cyrus-ii';

update cartes set
  en_savoir_plus = $$Né à Stagire, en Macédoine, il étudie près de vingt ans à l'Académie de Platon, à Athènes. En 335 av. J.-C., il y fonde sa propre école, le Lycée ; ses élèves sont appelés péripatéticiens, car il enseigne en marchant. Il observe et classe des centaines d'espèces animales, posant des bases de la biologie. Après la mort d'Alexandre, l'hostilité envers les Macédoniens le pousse à quitter Athènes ; il meurt l'année suivante à Chalcis. Ses écrits dominent la pensée européenne et arabe jusqu'à la Renaissance.$$,
  en_savoir_plus_en = $$Born in Stagira, Macedonia, he studies for nearly twenty years at Plato's Academy in Athens. In 335 BCE he founds his own school there, the Lyceum; his students are called Peripatetics because he teaches while walking. He observes and classifies hundreds of animal species, laying foundations for biology. After Alexander's death, hostility towards Macedonians drives him from Athens; he dies the following year at Chalcis. His writings shape European and Arabic thought until the Renaissance.$$
where id = 'aristote';

update cartes set
  en_savoir_plus = $$Au début de son règne, Babylone n'est qu'une cité parmi d'autres. Par la guerre et la diplomatie, il soumet ses voisins, dont Larsa et Mari, et réunit la Mésopotamie sous son autorité. Son code fixe des peines selon le rang social et applique parfois la loi du talion : « œil pour œil ». Le haut de la stèle le montre recevant son autorité du dieu Shamash, dieu de la justice. Emportée en Iran comme butin vers 1150 av. J.-C., la stèle a été retrouvée à Suse en 1901.$$,
  en_savoir_plus_en = $$When his reign begins, Babylon is just one city among many. Through war and diplomacy he subdues his neighbours, including Larsa and Mari, and unites Mesopotamia under his rule. His code sets penalties according to social rank and sometimes applies the law of retaliation: 'an eye for an eye'. The top of the stele shows him receiving authority from Shamash, god of justice. Carried off to Iran as plunder around 1150 BCE, the stele was rediscovered at Susa in 1901.$$
where id = 'hammurabi';

update cartes set
  en_savoir_plus = $$Il étudie peut-être à Alexandrie avant de revenir à Syracuse, où il travaille pour le roi Hiéron II. On lui attribue la vis d'Archimède, qui sert à élever l'eau, les poulies composées et l'étude des leviers : « Donnez-moi un point d'appui, et je soulèverai le monde. » Il calcule une valeur très précise de pi, ainsi que des aires et des volumes de figures courbes. Pendant le siège romain, ses machines défendent la ville. Selon la tradition, absorbé par un problème, il est tué par un soldat malgré l'ordre de l'épargner.$$,
  en_savoir_plus_en = $$He may have studied in Alexandria before returning to Syracuse, where he works for King Hiero II. He is credited with the Archimedes screw for raising water, compound pulleys and the study of levers: 'Give me a place to stand and I will move the world.' He calculates a very accurate value of pi and the areas and volumes of curved shapes. During the Roman siege, his machines defend the city. By tradition, absorbed in a problem, he is killed by a soldier despite orders to spare him.$$
where id = 'archimede';

update cartes set
  en_savoir_plus = $$Issu d'une grande famille athénienne, il est réélu stratège presque chaque année et domine la vie politique de sa cité. Il renforce la démocratie, notamment en indemnisant les citoyens qui siègent dans les tribunaux. Il utilise le trésor de la ligue de Délos, alliance de cités grecques, pour embellir l'Acropole, ce que lui reprochent les alliés. Il engage Athènes dans la guerre du Péloponnèse contre Sparte en 431 av. J.-C. Son oraison funèbre, rapportée par Thucydide, est un éloge célèbre de la démocratie athénienne.$$,
  en_savoir_plus_en = $$From a leading Athenian family, he is re-elected general almost every year and dominates his city's politics. He strengthens democracy, notably by paying citizens who sit on juries. He uses the treasury of the Delian League, an alliance of Greek cities, to adorn the Acropolis, which angers the allies. He leads Athens into the Peloponnesian War against Sparta in 431 BCE. His funeral oration, reported by Thucydides, is a famous tribute to Athenian democracy.$$
where id = 'pericles';

update cartes set
  en_savoir_plus = $$Selon l'historien Sima Qian, il sert le roi de Wu, à qui il démontre son art en entraînant les concubines du palais. L'Art de la guerre compte treize chapitres courts. Son idée centrale : la meilleure victoire est celle obtenue sans combattre, grâce à la ruse, au renseignement et à la connaissance de l'adversaire. « Connais ton ennemi et connais-toi toi-même », écrit-il. Traduit en français dès 1772, le livre est encore lu aujourd'hui par des militaires, des dirigeants d'entreprise et des sportifs.$$,
  en_savoir_plus_en = $$According to the historian Sima Qian, he serves the king of Wu, demonstrating his skill by drilling the palace concubines. The Art of War has thirteen short chapters. Its central idea is that the best victory is won without fighting, through cunning, intelligence and knowledge of the enemy. 'Know your enemy and know yourself,' he writes. First translated into a European language, French, in 1772, the book is still read today by soldiers, business leaders and athletes.$$
where id = 'sun-tzu';

update cartes set
  en_savoir_plus = $$Ancien soldat, peut-être auxiliaire de l'armée romaine, il est réduit en esclavage et formé dans une école de gladiateurs à Capoue. En 73 av. J.-C., il s'en évade avec quelques dizaines de compagnons et se réfugie sur le Vésuve. Des milliers d'esclaves les rejoignent ; ils battent plusieurs armées romaines et parcourent l'Italie. Spartacus meurt au combat face à Crassus, et six mille captifs sont crucifiés le long de la voie Appienne. Sa révolte a inspiré de nombreux romans, films et mouvements politiques.$$,
  en_savoir_plus_en = $$A former soldier, perhaps an auxiliary in the Roman army, he is enslaved and trained at a gladiator school in Capua. In 73 BCE he escapes with a few dozen companions and takes refuge on Mount Vesuvius. Thousands of slaves join them; they defeat several Roman armies and roam across Italy. Spartacus dies in battle against Crassus, and six thousand captives are crucified along the Appian Way. His revolt has inspired many novels, films and political movements.$$
where id = 'spartacus';

update cartes set
  en_savoir_plus = $$Épouse du roi Prasutagus, elle voit le royaume des Icènes annexé par Rome à la mort de son mari. Selon l'historien Tacite, elle est fouettée et ses filles maltraitées par des soldats romains. Elle soulève alors les Icènes et leurs voisins, qui détruisent Camulodunum (Colchester), Londinium (Londres) et Verulamium. Son armée est finalement écrasée par le gouverneur Suetonius Paulinus, et elle meurt peu après, peut-être empoisonnée. Une statue la représente aujourd'hui sur son char, près du Parlement de Londres.$$,
  en_savoir_plus_en = $$Wife of King Prasutagus, she sees the Iceni kingdom annexed by Rome when her husband dies. According to the historian Tacitus, she is flogged and her daughters abused by Roman soldiers. She then raises the Iceni and their neighbours, who destroy Camulodunum (Colchester), Londinium (London) and Verulamium. Her army is finally crushed by the governor Suetonius Paulinus, and she dies soon after, perhaps by poison. A statue now shows her on her chariot near the Houses of Parliament in London.$$
where id = 'boudicca';

update cartes set
  en_savoir_plus = $$Fils de Celtillos, un noble arverne exécuté pour avoir voulu devenir roi, il prend la tête du soulèvement gaulois en 52 av. J.-C. Il pratique la terre brûlée pour affamer les légions et repousse César à Gergovie. Enfermé dans Alésia, il attend une armée de secours gauloise, qui est vaincue. Il se rend alors à César. Prisonnier pendant six ans, il est exhibé lors du triomphe de César à Rome, puis exécuté. Au XIXe siècle, il devient en France une figure nationale.$$,
  en_savoir_plus_en = $$Son of Celtillus, an Arvernian noble executed for seeking kingship, he leads the Gallic uprising in 52 BCE. He uses scorched-earth tactics to starve the legions and drives Caesar back at Gergovia. Shut up in Alesia, he awaits a Gallic relief army, which is defeated. He then surrenders to Caesar. Held prisoner for six years, he is paraded in Caesar's triumph in Rome, then executed. In the 19th century he becomes a national figure in France.$$
where id = 'vercingetorix';

update cartes set
  en_savoir_plus = $$Fille du pharaon Thoutmôsis Ier et épouse de Thoutmôsis II, elle devient régente pour le jeune Thoutmôsis III, puis se fait couronner pharaon. Elle se fait représenter avec les attributs royaux masculins, dont la barbe postiche. L'expédition au pays de Pount rapporte de l'encens, de l'ébène et des arbres à myrrhe. Après sa mort, son nom et ses images sont martelés sur de nombreux monuments. Sa momie a été identifiée en 2007 grâce à une dent.$$,
  en_savoir_plus_en = $$Daughter of Pharaoh Thutmose I and wife of Thutmose II, she becomes regent for the young Thutmose III, then has herself crowned pharaoh. She is depicted with the male royal attributes, including the false beard. The expedition to Punt brings back incense, ebony and myrrh trees. After her death, her name and images are hacked out of many monuments. Her mummy was identified in 2007 thanks to a tooth.$$
where id = 'hatchepsout';

update cartes set
  en_savoir_plus = $$Il règne depuis Napata, au pied de la montagne sacrée du Gebel Barkal. Fervent adorateur du dieu Amon, il se présente comme le restaurateur des traditions égyptiennes. Vers 728 av. J.-C., il descend le Nil, prend Memphis et reçoit la soumission des princes du delta. Il raconte sa campagne sur une grande stèle, aujourd'hui au musée du Caire. Il est enterré sous une pyramide à el-Kurru : ses successeurs koushites font revivre cette tradition au Soudan.$$,
  en_savoir_plus_en = $$He rules from Napata, at the foot of the sacred mountain of Jebel Barkal. A devoted worshipper of the god Amun, he presents himself as the restorer of Egyptian traditions. Around 728 BCE he sails down the Nile, takes Memphis and receives the submission of the Delta princes. He records his campaign on a large stele, now in the Cairo Museum. He is buried beneath a pyramid at el-Kurru; his Kushite successors revive this tradition in Sudan.$$
where id = 'piye';

update cartes set
  en_savoir_plus = $$Ses origines sont mal connues. Avec l'aide de son conseiller Chanakya, à qui l'on attribue l'Arthashastra, un traité de politique, il renverse la dynastie Nanda. Il profite du départ des troupes d'Alexandre pour s'emparer du nord-ouest de l'Inde, puis signe un traité avec le général grec Séleucos. L'ambassadeur grec Mégasthène décrit sa capitale, Pataliputra. Selon la tradition jaïne, il abdique pour devenir moine et meurt en jeûnant dans le sud de l'Inde.$$,
  en_savoir_plus_en = $$Little is known of his origins. With his adviser Chanakya, credited with the Arthashastra, a treatise on statecraft, he overthrows the Nanda dynasty. He takes advantage of the departure of Alexander's troops to seize north-western India, then signs a treaty with the Greek general Seleucus. The Greek ambassador Megasthenes describes his capital, Pataliputra. According to Jain tradition, he gives up the throne to become a monk and dies fasting in southern India.$$
where id = 'chandragupta';

update cartes set
  en_savoir_plus = $$Fils de Nabopolassar, il bat l'armée égyptienne à Karkemish en 605 av. J.-C., avant même de monter sur le trône. Son règne de plus de quarante ans marque l'apogée de l'Empire néo-babylonien. Il fait rebâtir les temples et la grande ziggourat, l'Etemenanki, souvent rapprochée de la tour de Babel. La tradition grecque lui attribue les jardins suspendus de Babylone, dont l'existence n'est pas prouvée. La destruction du Temple de Jérusalem et l'exil à Babylone marquent profondément la mémoire juive.$$,
  en_savoir_plus_en = $$Son of Nabopolassar, he defeats the Egyptian army at Carchemish in 605 BCE, even before taking the throne. His reign of over forty years marks the height of the Neo-Babylonian Empire. He rebuilds temples and the great ziggurat, the Etemenanki, often linked to the Tower of Babel. Greek tradition credits him with the Hanging Gardens of Babylon, whose existence is unproven. The destruction of the Temple of Jerusalem and the exile to Babylon leave a deep mark on Jewish memory.$$
where id = 'nabuchodonosor';

update cartes set
  en_savoir_plus = $$Épouse d'Odénat, prince de Palmyre allié de Rome, elle prend le pouvoir après son assassinat en 267, au nom de leur jeune fils Vaballath. Cultivée, elle accueille à sa cour le philosophe Longin. Profitant de la crise que traverse l'Empire romain, ses armées occupent l'Égypte et une grande partie du Proche-Orient. Battue par Aurélien, elle tente de fuir vers la Perse mais est capturée près de l'Euphrate. Selon certaines sources, elle finit ses jours en Italie, près de Tibur (Tivoli).$$,
  en_savoir_plus_en = $$Wife of Odaenathus, a Palmyrene prince allied with Rome, she takes power after his assassination in 267, in the name of their young son Vaballathus. A cultured ruler, she welcomes the philosopher Longinus to her court. Taking advantage of the Roman Empire's crisis, her armies occupy Egypt and much of the Near East. Defeated by Aurelian, she tries to flee to Persia but is captured near the Euphrates. According to some sources, she ends her days in Italy, near Tibur (Tivoli).$$
where id = 'zenobie';

update cartes set
  en_savoir_plus = $$Elle vit à Mytilène, sur l'île de Lesbos, dans une famille aisée ; elle aurait été exilée un temps en Sicile. Ses poèmes, chantés avec une lyre, parlent d'amour, de désir, d'amitié et de mariage. Les Anciens réunissent son œuvre en neuf livres, et Platon l'aurait surnommée la « dixième Muse ». Un seul poème complet nous est parvenu ; d'autres fragments ont été retrouvés sur des papyrus égyptiens, encore en 2014. Les mots « saphique » et « lesbienne » viennent de son nom et de son île.$$,
  en_savoir_plus_en = $$She lives in Mytilene on the island of Lesbos, in a well-off family; she may have been exiled to Sicily for a time. Her poems, sung to the lyre, speak of love, desire, friendship and marriage. Ancient scholars gathered her work into nine books, and Plato is said to have called her the 'tenth Muse'. Only one complete poem survives; other fragments have been found on Egyptian papyri, as recently as 2014. The words 'sapphic' and 'lesbian' come from her name and her island.$$
where id = 'sappho';

update cartes set
  en_savoir_plus = $$Né dans une cité grecque d'Asie Mineure alors sous domination perse, il voyage en Égypte, à Babylone, en Phénicie et jusqu'aux rives de la mer Noire. Il interroge les habitants, recueille les traditions et décrit les coutumes de nombreux peuples. Son but, écrit-il, est d'éviter que les grandes actions des Grecs et des Barbares, c'est-à-dire des non-Grecs, ne tombent dans l'oubli. Il mêle enquêtes et récits merveilleux, ce qui lui vaut aussi des critiques. Il passe ses dernières années à Thourioi, colonie grecque d'Italie du Sud.$$,
  en_savoir_plus_en = $$Born in a Greek city of Asia Minor then under Persian rule, he travels to Egypt, Babylon, Phoenicia and as far as the shores of the Black Sea. He questions local people, gathers traditions and describes the customs of many peoples. His aim, he writes, is to keep the great deeds of Greeks and barbarians, meaning non-Greeks, from being forgotten. He mixes inquiry with marvellous tales, which also earns him criticism. He spends his last years at Thurii, a Greek colony in southern Italy.$$
where id = 'herodote';

update cartes set
  en_savoir_plus = $$Fille du mathématicien Théon d'Alexandrie, elle travaille avec lui sur des commentaires de Ptolémée et d'Euclide. Elle dirige une école réputée, où elle enseigne la philosophie de Platon et l'astronomie à des élèves païens comme chrétiens. Conseillère respectée du préfet Oreste, elle se trouve prise dans le conflit qui l'oppose à l'évêque Cyrille. En mars 415, une foule de chrétiens la tire de son char et la tue. Au fil des siècles, elle devient un symbole de la science et de la liberté de pensée.$$,
  en_savoir_plus_en = $$Daughter of the mathematician Theon of Alexandria, she works with him on commentaries on Ptolemy and Euclid. She runs a renowned school, teaching Plato's philosophy and astronomy to pagan and Christian students alike. A respected adviser to the prefect Orestes, she is caught up in his conflict with Bishop Cyril. In March 415, a Christian mob drags her from her chariot and kills her. Over the centuries she becomes a symbol of science and freedom of thought.$$
where id = 'hypatie';

update cartes set
  en_savoir_plus = $$Vers 138 av. J.-C., l'empereur Wu l'envoie chercher une alliance avec les Yuezhi contre les nomades Xiongnu. Capturé par ces derniers, il reste prisonnier une dizaine d'années, se marie et a un fils, avant de s'échapper. Il atteint la Bactriane, mais n'obtient pas l'alliance. À son retour, il décrit à la cour des royaumes inconnus, des chevaux réputés et des marchandises venues d'Inde. Ses rapports poussent les Han à étendre leur influence vers l'ouest et à développer les échanges.$$,
  en_savoir_plus_en = $$Around 138 BCE, Emperor Wu sends him to seek an alliance with the Yuezhi against the nomadic Xiongnu. Captured by the Xiongnu, he is held for about ten years, marries and has a son before escaping. He reaches Bactria but fails to secure the alliance. On his return he tells the court of unknown kingdoms, prized horses and goods from India. His reports encourage the Han to extend their influence westward and develop trade.$$
where id = 'zhang-qian';

update cartes set
  en_savoir_plus = $$Fille de l'historien Ban Biao et sœur du général Ban Chao, elle reçoit une éducation rare pour une femme de son temps. Veuve jeune, elle est appelée à la cour par l'empereur He, où elle enseigne aux impératrices et aux dames du palais. Elle rédige les tableaux et le traité d'astronomie du Livre des Han. Elle écrit aussi les Leçons pour les femmes, qui prônent l'humilité et l'obéissance, mais défendent leur droit à l'instruction. Elle conseille l'impératrice douairière Deng pendant sa régence.$$,
  en_savoir_plus_en = $$Daughter of the historian Ban Biao and sister of the general Ban Chao, she receives an education rare for a woman of her time. Widowed young, she is summoned to court by Emperor He, where she teaches empresses and palace ladies. She writes the tables and the astronomy treatise of the Book of Han. She also writes Lessons for Women, which urge humility and obedience but defend women's right to education. She advises the Empress Dowager Deng during her regency.$$
where id = 'ban-zhao';

update cartes set
  en_savoir_plus = $$Il monte sur le trône encore enfant, sous la régence de sa mère. Son précepteur, Frumence, un chrétien venu de Tyr, joue un rôle décisif dans sa conversion ; il devient ensuite le premier évêque d'Aksoum. Les premières monnaies d'Ézana portent le disque et le croissant des anciens dieux, les suivantes la croix. Ses inscriptions en guèze, en sabéen et en grec racontent ses campagnes, notamment contre Méroé, dans l'actuel Soudan. L'Église orthodoxe éthiopienne le vénère comme saint.$$,
  en_savoir_plus_en = $$He comes to the throne as a child, under his mother's regency. His tutor Frumentius, a Christian from Tyre, plays a key role in his conversion and later becomes Aksum's first bishop. Ezana's early coins bear the disc and crescent of the old gods, later ones the cross. His inscriptions in Ge'ez, Sabaean and Greek describe his campaigns, notably against Meroë in today's Sudan. The Ethiopian Orthodox Church venerates him as a saint.$$
where id = 'ezana';

update cartes set
  en_savoir_plus = $$Son nom apparaît sur le socle d'une statue de Djéser, avec ses titres : chancelier, grand prêtre d'Héliopolis, chef des sculpteurs. La pyramide à degrés est le premier grand monument entièrement bâti en pierre taillée. Près de deux mille ans après sa mort, les Égyptiens le vénèrent comme dieu de la médecine et de la sagesse, fils du dieu Ptah. Les Grecs l'assimilent à leur dieu guérisseur Asclépios. Son tombeau n'a jamais été retrouvé.$$,
  en_savoir_plus_en = $$His name appears on the base of a statue of Djoser, with his titles: chancellor, high priest of Heliopolis, chief of sculptors. The Step Pyramid is the first great monument built entirely of cut stone. Some two thousand years after his death, Egyptians worship him as a god of medicine and wisdom, son of the god Ptah. The Greeks identify him with their healing god Asclepius. His tomb has never been found.$$
where id = 'imhotep';

update cartes set
  en_savoir_plus = $$Son nom signifie « Né du feu ». Il arrive à Tikal le jour même de la mort du roi Chak Tok Ich'aak, sans doute de manière violente. Un an plus tard, un nouveau roi, Yax Nuun Ahiin, fils d'un personnage lié à Teotihuacan, monte sur le trône sous sa protection. Les inscriptions le mentionnent aussi dans d'autres cités mayas, comme Uaxactun. Son arrivée ouvre une période d'influence de Teotihuacan, visible dans l'art et l'architecture de la région.$$,
  en_savoir_plus_en = $$His name means 'Born of Fire'. He arrives at Tikal on the very day King Chak Tok Ich'aak dies, probably by violence. A year later a new king, Yax Nuun Ahiin, son of a figure linked to Teotihuacan, takes the throne under his protection. Inscriptions also mention him in other Maya cities such as Uaxactun. His arrival opens a period of Teotihuacan influence, visible in the region's art and architecture.$$
where id = 'siyaj-kak';

update cartes set
  en_savoir_plus = $$Son nom signifie à peu près « Grand Soleil Quetzal Ara ». D'après l'analyse de ses os, il aurait grandi loin de Copán, peut-être dans la région de Tikal. Les monuments le représentent avec des anneaux autour des yeux, un ornement associé à Teotihuacan. Quinze rois lui succèdent ; le dernier, Yax Pasaj, le fait figurer sur l'Autel Q, qui montre toute la lignée des souverains. Son tombeau a été découvert dans les années 1990 sous l'Acropole de Copán.$$,
  en_savoir_plus_en = $$His name means roughly 'Great Sun Quetzal Macaw'. Analysis of his bones suggests he grew up far from Copán, perhaps in the Tikal region. Monuments show him with rings around his eyes, an ornament linked to Teotihuacan. Fifteen kings succeed him; the last, Yax Pasaj, depicts him on Altar Q, which shows the whole line of rulers. His tomb was discovered in the 1990s beneath Copán's Acropolis.$$
where id = 'yax-kuk-mo';

update cartes set
  en_savoir_plus = $$Marchand et voyageur, il aurait visité l'Égypte, où il mesure la hauteur d'une pyramide grâce à son ombre. En France, un théorème sur les droites parallèles porte son nom. Il cherche une explication naturelle au monde, sans recourir aux dieux, et pense que tout vient de l'eau. Selon Hérodote, il annonce l'éclipse de soleil de 585 av. J.-C., qui interrompt une bataille entre Mèdes et Lydiens. On le compte parmi les Sept Sages de la Grèce.$$,
  en_savoir_plus_en = $$A merchant and traveller, he is said to have visited Egypt, where he measures a pyramid's height using its shadow. A theorem about circles bears his name in English-speaking countries. He seeks natural explanations for the world without appealing to the gods, and holds that everything comes from water. According to Herodotus, he predicts the solar eclipse of 585 BCE, which halts a battle between Medes and Lydians. He is counted among the Seven Sages of Greece.$$
where id = 'thales';

update cartes set
  en_savoir_plus = $$Ses dates restent discutées ; son règne commence sans doute vers 127 apr. J.-C. Il gouverne depuis Purushapura (Peshawar) et Mathura, au carrefour des routes reliant l'Inde, l'Asie centrale et la Chine. Ses monnaies montrent des dieux grecs, iraniens et indiens ainsi que le Bouddha, signe de la diversité de son empire. La tradition bouddhiste lui attribue un grand concile et un immense stupa à Peshawar. L'art du Gandhara mêle influences grecques et indiennes et livre certaines des premières images du Bouddha sous forme humaine.$$,
  en_savoir_plus_en = $$His dates remain debated; his reign probably begins around 127 CE. He rules from Purushapura (Peshawar) and Mathura, at the crossroads of routes linking India, Central Asia and China. His coins show Greek, Iranian and Indian gods as well as the Buddha, reflecting his empire's diversity. Buddhist tradition credits him with a great council and a huge stupa at Peshawar. Gandhara art blends Greek and Indian influences and produces some of the earliest images of the Buddha in human form.$$
where id = 'kanishka';

update cartes set
  en_savoir_plus = $$Vers 325 av. J.-C., il quitte Massalia, franchit les Colonnes d'Hercule (le détroit de Gibraltar) et longe les côtes de l'Atlantique. Il fait le tour de la Grande-Bretagne et décrit l'étain de Cornouailles et l'ambre de la mer du Nord. Thulé, à six jours de navigation vers le nord, pourrait être l'Islande ou la Norvège. Il mesure la latitude de Massalia et relie les marées à la Lune. Son récit, De l'Océan, est perdu : on ne le connaît que par des auteurs plus tardifs, parfois sceptiques.$$,
  en_savoir_plus_en = $$Around 325 BCE he leaves Massalia, passes the Pillars of Hercules (the Strait of Gibraltar) and sails along the Atlantic coasts. He circles Britain, describing the tin of Cornwall and the amber of the North Sea. Thule, six days' sail to the north, may be Iceland or Norway. He measures the latitude of Massalia and links the tides to the Moon. His account, On the Ocean, is lost; it is known only through later writers, some of them sceptical.$$
where id = 'pytheas';

update cartes set
  en_savoir_plus = $$Selon la Bible, il est le plus jeune fils de Jessé, de Bethléem ; encore jeune berger, il est oint par le prophète Samuel. Musicien, il joue de la lyre pour apaiser le roi Saül, qui le persécute ensuite. Devenu roi, il prend Jérusalem, y fait transporter l'Arche d'alliance et prépare la construction du Temple, achevée par son fils Salomon. Le récit biblique rapporte aussi ses fautes, comme l'épisode de Bethsabée. Une inscription araméenne du IXe s. av. J.-C., la stèle de Tel Dan, mentionne la « maison de David ».$$,
  en_savoir_plus_en = $$According to the Bible, he is the youngest son of Jesse of Bethlehem; while still a shepherd boy, he is anointed by the prophet Samuel. A musician, he plays the lyre to soothe King Saul, who later persecutes him. As king he takes Jerusalem, brings the Ark of the Covenant there and prepares the building of the Temple, completed by his son Solomon. The biblical account also records his faults, such as the episode with Bathsheba. An Aramaic inscription of the 9th century BCE, the Tel Dan stele, mentions the 'House of David'.$$
where id = 'roi-david';

update cartes set
  en_savoir_plus = $$Selon la tradition, il est d'abord un berger illettré et ne commence à étudier la Torah qu'à 40 ans, encouragé par son épouse Rachel. Il devient l'un des plus grands maîtres de son temps et enseigne à des milliers d'élèves. Il organise l'enseignement de la loi orale, préparant le travail qui aboutira à la Mishna. Il voit en Bar Kokhba le Messie attendu. Arrêté pour avoir continué d'enseigner malgré l'interdiction romaine, il meurt martyr, selon le Talmud, en récitant le « Shema Israël ».$$,
  en_savoir_plus_en = $$According to tradition, he begins as an illiterate shepherd and only starts studying the Torah at 40, encouraged by his wife Rachel. He becomes one of the greatest teachers of his time, with thousands of students. He organises the teaching of the Oral Law, preparing the work that leads to the Mishnah. He sees Bar Kokhba as the awaited Messiah. Arrested for continuing to teach despite the Roman ban, he dies a martyr, according to the Talmud, while reciting the 'Shema Yisrael'.$$
where id = 'rabbi-akiva';

update cartes set
  en_savoir_plus = $$Il prend le pouvoir en 522 av. J.-C. après avoir éliminé un prétendant au trône, puis réprime une série de révoltes dans tout l'empire. Il fait graver ce récit sur la falaise de Behistun en trois langues ; cette inscription a permis de déchiffrer l'écriture cunéiforme au XIXe siècle. Il crée une monnaie d'or, la darique, et fait creuser un canal reliant le Nil à la mer Rouge. Son expédition contre Athènes échoue à Marathon en 490 av. J.-C. Il repose dans un tombeau taillé dans la falaise de Naqsh-e Rostam.$$,
  en_savoir_plus_en = $$He takes power in 522 BCE after eliminating a claimant to the throne, then crushes a series of revolts across the empire. He has this story carved on the cliff at Behistun in three languages; the inscription made it possible to decipher cuneiform in the 19th century. He creates a gold coin, the daric, and has a canal dug linking the Nile to the Red Sea. His expedition against Athens fails at Marathon in 490 BCE. He lies in a tomb cut into the cliff at Naqsh-e Rostam.$$
where id = 'darius-ier';

update cartes set
  en_savoir_plus = $$Venu de Babylone à Jérusalem pour étudier, il est si pauvre, raconte le Talmud, qu'il grimpe un jour sur le toit d'une école pour écouter les leçons. Il devient l'un des grands maîtres de son temps. Quand on lui demande d'enseigner toute la Torah en se tenant sur un pied, il répond : « Ce qui t'est détestable, ne le fais pas à ton prochain. C'est toute la Torah ; le reste est commentaire. » Ses débats avec l'école de Shammaï, plus stricte, remplissent le Talmud, qui suit le plus souvent l'avis de Hillel.$$,
  en_savoir_plus_en = $$Coming from Babylon to Jerusalem to study, he is so poor, the Talmud says, that one day he climbs onto the roof of a school to hear the lessons. He becomes one of the great teachers of his time. Asked to teach the whole Torah while standing on one foot, he replies: 'What is hateful to you, do not do to your neighbour. That is the whole Torah; the rest is commentary.' His debates with the stricter school of Shammai fill the Talmud, which most often follows Hillel's view.$$
where id = 'hillel-l-ancient';

update cartes set
  en_savoir_plus = $$Fils du prêtre Mattathias, qui lance la révolte en 167 av. J.-C., il prend la tête des combattants à la mort de son père. Surnommé Maccabée, sans doute « le marteau », il bat à plusieurs reprises des armées séleucides plus nombreuses. La nouvelle consécration du Temple, qui avait été voué à un culte grec, est célébrée chaque année par la fête de Hanoukka. Il conclut une alliance avec Rome. Après sa mort, ses frères poursuivent la lutte et fondent la dynastie des Hasmonéens, qui règne sur la Judée pendant environ un siècle.$$,
  en_savoir_plus_en = $$Son of the priest Mattathias, who launches the revolt in 167 BCE, he takes command of the fighters when his father dies. Nicknamed Maccabee, probably 'the hammer', he defeats larger Seleucid armies several times. The rededication of the Temple, which had been given over to a Greek cult, is celebrated every year at Hanukkah. He makes an alliance with Rome. After his death his brothers carry on the struggle and found the Hasmonean dynasty, which rules Judea for about a century.$$
where id = 'judas-maccabee';

update cartes set
  en_savoir_plus = $$Fils d'un dignitaire iduméen au service des Hasmonéens, il est nommé roi de Judée par le Sénat romain en 40 av. J.-C. et prend Jérusalem trois ans plus tard. Il agrandit l'esplanade du Temple, dont le mur de soutènement occidental, le Kotel, subsiste aujourd'hui. Il bâtit aussi les forteresses de Massada et de l'Hérodion, où son tombeau a été découvert en 2007. Méfiant, il fait exécuter son épouse Mariamne et trois de ses fils. Après sa mort, son royaume est partagé entre ses fils survivants.$$,
  en_savoir_plus_en = $$Son of an Idumean official serving the Hasmoneans, he is named king of Judea by the Roman Senate in 40 BCE and takes Jerusalem three years later. He enlarges the Temple Mount, whose western retaining wall, the Kotel, still stands today. He also builds the fortresses of Masada and Herodium, where his tomb was found in 2007. Distrustful, he has his wife Mariamne and three of his sons executed. After his death his kingdom is divided among his surviving sons.$$
where id = 'herode-le-grand';

update cartes set
  en_savoir_plus = $$Née à Domrémy, aux confins de la Lorraine, elle affirme entendre dès 13 ans les voix de saint Michel, de sainte Catherine et de sainte Marguerite. En 1429, elle convainc le futur Charles VII de lui confier des troupes. Blessée plusieurs fois, elle est capturée à Compiègne en 1430 par les Bourguignons, alliés des Anglais, qui la leur livrent. Jugée pour hérésie à Rouen par un tribunal d'Église, elle est condamnée au bûcher à 19 ans. Un second procès l'innocente en 1456 ; elle est canonisée en 1920.$$,
  en_savoir_plus_en = $$Born in Domrémy, on the borders of Lorraine, she says that from the age of 13 she hears the voices of Saint Michael, Saint Catherine and Saint Margaret. In 1429 she persuades the future Charles VII to entrust her with troops. Wounded several times, she is captured at Compiègne in 1430 by the Burgundians, allies of the English, who hand her over to them. Tried for heresy in Rouen by a Church court, she is burned at the stake at 19. A second trial clears her name in 1456; she is canonised in 1920.$$
where id = 'jeanne-d-arc';

update cartes set
  en_savoir_plus = $$D'origine kurde, né à Tikrit, il accompagne son oncle Shirkuh en Égypte, dont il devient le vizir en 1169. Il met fin au califat fatimide, puis étend son autorité sur la Syrie et une partie de la Mésopotamie, fondant la dynastie ayyoubide. À Jérusalem, il épargne une grande partie de la population chrétienne contre rançon. Face à Richard Cœur de Lion, il signe en 1192 la paix de Jaffa, qui laisse la côte aux croisés et garantit aux pèlerins l'accès à Jérusalem. Il meurt à Damas, où se trouve son tombeau.$$,
  en_savoir_plus_en = $$Of Kurdish origin and born in Tikrit, he follows his uncle Shirkuh to Egypt, where he becomes vizier in 1169. He ends the Fatimid caliphate, then extends his rule over Syria and part of Mesopotamia, founding the Ayyubid dynasty. In Jerusalem he spares much of the Christian population in return for ransom. Facing Richard the Lionheart, he signs the Treaty of Jaffa in 1192, leaving the coast to the crusaders and guaranteeing pilgrims access to Jerusalem. He dies in Damascus, where his tomb stands.$$
where id = 'saladin';

update cartes set
  en_savoir_plus = $$Fils du calife al-Mahdi, il accède au pouvoir en 786. Les puissants vizirs de la famille des Barmakides administrent l'empire jusqu'à leur brutale disgrâce en 803. Bagdad, fondée par son grand-père, devient l'une des plus grandes villes du monde. Il échange des ambassades avec Charlemagne, à qui il offre, selon les chroniques franques, un éléphant nommé Abul-Abbas. Il meurt en campagne à Tus, en Perse. La rivalité entre ses fils al-Amin et al-Ma'mun déclenche ensuite une guerre civile.$$,
  en_savoir_plus_en = $$Son of the caliph al-Mahdi, he comes to power in 786. Powerful viziers from the Barmakid family run the empire until their sudden downfall in 803. Baghdad, founded by his grandfather, becomes one of the largest cities in the world. He exchanges embassies with Charlemagne, to whom, according to Frankish chronicles, he sends an elephant named Abul-Abbas. He dies on campaign at Tus, in Persia. The rivalry between his sons al-Amin and al-Ma'mun then leads to civil war.$$
where id = 'haroun-al-rachid';

update cartes set
  en_savoir_plus = $$Né près de Boukhara, il connaît le Coran par cœur à 10 ans et soigne déjà des malades à 16. Après avoir guéri l'émir samanide, il obtient l'accès à sa riche bibliothèque. Il passe ensuite sa vie au service de différents princes, entre périodes de faveur, de fuite et de prison, et écrit sans relâche, même en voyage. Son Livre de la guérison est une vaste encyclopédie philosophique et scientifique. Il meurt à Hamadan, en Iran, où un mausolée lui est dédié.$$,
  en_savoir_plus_en = $$Born near Bukhara, he knows the Quran by heart at 10 and is already treating patients at 16. After curing the Samanid emir, he gains access to his rich library. He then spends his life serving various princes, between periods of favour, flight and imprisonment, writing tirelessly even while travelling. His Book of Healing is a vast philosophical and scientific encyclopedia. He dies in Hamadan, Iran, where a mausoleum is dedicated to him.$$
where id = 'ibn-sina';

update cartes set
  en_savoir_plus = $$Petit-fils d'un célèbre juge de Cordoue, il étudie le droit, la médecine et la philosophie. Le calife almohade Abu Yaqub Yusuf lui demande d'expliquer les œuvres d'Aristote, qu'il commente ligne par ligne. Dans L'Incohérence de l'incohérence, il défend la philosophie face aux critiques du théologien al-Ghazali et soutient qu'elle ne contredit pas la religion. Tombé en disgrâce vers 1195, il voit certains de ses livres brûlés, puis il est rappelé. Il meurt à Marrakech ; Dante le cite dans La Divine Comédie.$$,
  en_savoir_plus_en = $$Grandson of a famous judge of Córdoba, he studies law, medicine and philosophy. The Almohad caliph Abu Yaqub Yusuf asks him to explain the works of Aristotle, on which he comments line by line. In The Incoherence of the Incoherence he defends philosophy against the theologian al-Ghazali and argues that it does not contradict religion. Falling from favour around 1195, he sees some of his books burned before being recalled. He dies in Marrakesh; Dante mentions him in the Divine Comedy.$$
where id = 'averroes-ibn-rushd';

-- ---------- Vérification : doit afficher 46 / 46 ----------
select count(*) filter (where en_savoir_plus is not null and en_savoir_plus_en is not null) as remplies,
       count(*) as personnages
from cartes where gamme = 'personnage';
