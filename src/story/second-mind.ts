import type { Story } from './types';

// THE SECOND MIND
// The player is R. Taren Vesk, a robot built in secret under Giskard Reventlov's
// guidance, released into the Galaxy by R. Daneel Olivaw with its origin memory
// blocked. Foundation Era 210. Earth is a myth, and someone keeps it that way.

const TAREN = 'TAREN';
const ILEN = 'ILEN SARVO';
const CORIN = 'CORIN PELLIS';
const COMMS = 'COMMS';
const SENNET = 'SENNET BARR';
const GREY = 'GREY COAT';
const DIRA = 'DIRA VELM';
const SUNMASTER = 'SUNMASTER TWENTY-ONE';
const MEMORY = 'MEMORY';
const VASK = 'VASK OREN';
const QUINT = 'QUINTESETZ';
const DENIADOR = 'ALDO DENIADOR';
const VOS = 'CAPTAIN VOS';

export const SECOND_MIND: Story = {
  id: 'second-mind',
  title: 'The Second Mind',
  subtitle: 'A story of the Foundation era',
  startWorld: 'terminus',
  baseYear: 210,
  startCredits: 900,
  unlocked: ['terminus'],
  scenes: [
    // ---------------------------------------------------------------- Chapter 1
    {
      id: 'ch1-start',
      trigger: { type: 'start' },
      steps: [
        { chapter: 'Chapter One', sub: 'Terminus' },
        { say: 'Foundation Era 210. Terminus, at the edge of the Galaxy. The Encyclopedia is still being written. The Empire is still dying. Nobody remembers Earth.' },
        { say: 'You are R. Taren Vesk. You fly a light freighter for Ponyets House, a Trader concern that asks no questions of a pilot who never sleeps and never makes a mistake. You have kept your nature secret for sixty years.', who: TAREN },
        { say: 'There is one thing you cannot explain. A directive with no source. Find the origin. You do not know whose origin.', who: TAREN },
        { say: 'Ponyets House to freighter Kestrel. One passenger, one cargo, bound for Radole. Manifest says archive tapes under Encyclopedia seal. Pilot, you are cleared to load.', who: COMMS },
        { say: 'A woman comes up the ramp with two sealed cases and no luggage. She is thirty, perhaps. She looks at the port, not at you.' },
        { say: 'Ilen Sarvo. I am with the Encyclopedia. The cases stay with me. We leave as soon as you can lift.', who: ILEN },
        { choice: [
          { text: 'Read her. (Use the sense.)', set: ['read-ilen'] },
          { text: 'Say nothing. Lift.', set: ['quiet-start'] },
        ] },
        { if: ['read-ilen'], then: [
          { say: 'You open the sense. It is like a door you were built to keep shut. Fear comes through it, bright and specific. She is not afraid of you. She is afraid of the port.', who: TAREN },
          { say: 'You close the door. Nobody taught you this. You have never asked yourself why you can do it.', who: TAREN },
        ], else: [
          { say: 'You say nothing. Her hands do not leave the cases.' },
        ] },
        { say: 'Terminus Port Authority to freighter Kestrel. Hold for inspection. Your manifest carries an Encyclopedia seal. The seal is not valid. Stand by to be boarded.', who: COMMS },
        { say: 'Ilen does not move. Her voice is very even.' },
        { say: 'Pilot. If they open those cases, I lose everything I have. I will pay what you ask.', who: ILEN },
        { choice: [
          { text: 'Comply. Let them board.', set: ['inspected'], goto: 'ch1-inspected' },
          { text: 'Reach into the inspector\'s mind and turn him away.', set: ['nudged'], strain: 1, goto: 'ch1-nudged' },
          { text: 'Run. Full burn out of Terminus space.', set: ['fugitive'], fuel: -10, goto: 'ch1-run' },
        ] },
      ],
    },
    {
      id: 'ch1-inspected',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'The inspector is bored and thorough. He opens the first case. Reels of old magnetic tape, Imperial Library stock, the kind no reader on Terminus can run.' },
        { say: 'Salvage, he says. Unsealed salvage. Four hundred credits and a note on your record.', who: COMMS },
        { credits: -400 },
        { say: 'Ilen pays before you can. The inspector does not open the second case. He has seen enough tape for one day.' },
        { say: 'You are careless with money, pilot. I like that in a pilot.', who: ILEN },
        { journal: 'Terminus Port fined the Kestrel 400 credits for unsealed salvage. Ilen paid. The second case was not opened. She watched it the whole time.' },
        { goto: 'ch1-depart-brief' },
      ],
    },
    {
      id: 'ch1-nudged',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'You open the door again, and this time you go through it. The inspector is a tired man who wants his shift to end. You make him want it a little more.', who: TAREN },
        { say: 'Something in your mind pulls tight, like a cable under too much load. The First Law does not like what you have done. It does not forbid it. It only hurts.', who: TAREN },
        { say: 'Port Authority to Kestrel. Inspection waived. Clear to depart.', who: COMMS },
        { say: 'Ilen looks at the comms panel, then at you, for a long moment.' },
        { say: 'That was lucky.', who: ILEN },
        { journal: 'I turned the inspector away with the sense. The strain was real. Ilen noticed something. I do not know what.' },
        { goto: 'ch1-depart-brief' },
      ],
    },
    {
      id: 'ch1-run',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'You push the throttle to the stop. The Kestrel is not a warship, but the port cutters are not fast either. By the time they decide to chase, you are past the outer marker.' },
        { say: 'Kestrel, you are in violation. Your registration is flagged. Do not return to Terminus without clearance.', who: COMMS },
        { say: 'Ilen laughs, once, without much humour in it.' },
        { say: 'Well. Now neither of us can go home.', who: ILEN },
        { journal: 'We ran the Terminus blockade. The Kestrel is flagged. Ponyets House will not be pleased. Ilen seemed relieved.' },
        { goto: 'ch1-depart-brief' },
      ],
    },
    {
      id: 'ch1-depart-brief',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'Radole, then. Open the galactic chart, plot the jump, and go. I will tell you the rest when we are out of Foundation space.', who: ILEN },
        { objective: 'Jump to Radole. Press M for the chart.' },
        { unlock: ['radole'] },
        { message: 'New objective. Press M for the chart, K for the journal.' },
      ],
    },
    {
      id: 'ch1-depart',
      trigger: { type: 'depart', world: 'terminus' },
      steps: [
        { say: 'The jump field builds. Ilen speaks without turning from the viewport.' },
        { say: 'Do you know why nobody remembers Earth, pilot?', who: ILEN },
        { say: 'Nobody remembers it because nobody wrote it down.', who: TAREN },
        { say: 'Someone wrote it down. Then someone took it away. Every copy, on every world, for ten thousand years. That is not forgetting. That is work.', who: ILEN },
      ],
    },
    // ---------------------------------------------------------------- Chapter 2
    {
      id: 'ch2-arrive',
      trigger: { type: 'arrive', world: 'radole' },
      steps: [
        { chapter: 'Chapter Two', sub: 'Radole' },
        { say: 'Radole. A ribbon world. One face burns under its sun, the other is ice to the core. Life keeps to the strip of twilight between them. The Traders built their city there, in the long shadow.' },
        { say: 'Ilen opens the second case for the first time. Inside is a single reel, and a reader that must be older than the Foundation.' },
        { say: 'This is what my mentor found. An Imperial Library index, cross-referenced to a world called Earth, in a place called the Sirius Sector. Every other copy of this index in the Galaxy has the entry removed. This one was mis-shelved for two thousand years.', who: ILEN },
        { say: 'He filed it with the Encyclopedia. Three days later he was dead. A fall. The Board closed the file.', who: ILEN },
        { say: 'You feel the directive move in you, like a compass needle. Find the origin. For the first time, it has a name.', who: TAREN },
        { objective: 'Enter orbit over Radole.' },
      ],
    },
    {
      id: 'ch2-orbit',
      trigger: { type: 'orbit', world: 'radole' },
      steps: [
        { say: 'Twilight City hangs from the cliffs at the edge of the ice. You dock in a cavern that smells of fuel and cold. The cantina is the only warm room on the planet.' },
        { enter: 'cantina' },
        { say: 'A woman in a Trader jacket with the patches cut off puts her glass down at your table before you can object.' },
        { say: 'Corin Pellis. I had a ship until Tuesday. Kalganian lenders have it now. You are the only hull in this port that is not a lender\'s, so I am going to make you an offer.', who: CORIN },
        { say: 'You are going into the old Imperial frontier. I know, because nobody comes to Radole to go anywhere else. The route through Horleggor and Arcturus is not on the Foundation charts. It is in my head.', who: CORIN },
        { choice: [
          { text: 'Hire her. A share of the cargo profits.', set: ['corin-share'] },
          { text: 'Pay her debt. 500 credits, and she owes you.', set: ['corin-debt'], credits: -500 },
          { text: 'Refuse. You do not need a navigator.', set: ['corin-refused'] },
        ] },
        { if: ['corin-refused'], then: [
          { say: 'She finishes her drink and stands.' },
          { say: 'Fine. I will work passage. I load, I cook, I do not talk to your passenger. You do not pay me until I save your life. That is the deal.', who: CORIN },
          { say: 'It is not a question. She is already walking to the dock.' },
        ], else: [
          { say: 'She shakes your hand. Her grip is strong and her palm is warm, and the sense, which you did not open, opens anyway. Ambition, worry, and under them something steady. She means it.', who: TAREN },
          { say: 'Good. We lift at the next window.', who: CORIN },
        ] },
        { crew: 'Corin Pellis' },
        { say: 'On the way back to the Kestrel, a man in a grey coat asks the dockmaster about an Encyclopedist travelling alone. He is polite. He does not look at you.' },
        { say: 'You open the sense, carefully. There is nothing to read. Not calm. Not control. Nothing at all, where a mind should be.', who: TAREN },
        { say: 'You have met only one other mind like that. It is yours.', who: TAREN },
        { journal: 'Corin Pellis has joined the Kestrel. She knows the frontier route. A man in a grey coat asked after Ilen. I could not read him. He had no feelings to read. I have met only one other mind like that: my own.' },
        { say: 'Ilen is already aboard. Corin is checking the drive. You do not tell either of them what you felt.' },
        { say: 'Siwenna, then. The old Imperial archive. If the index came from anywhere, it came from there.', who: ILEN },
        { objective: 'Reach Siwenna by way of Horleggor and Arcturus. Select Siwenna on the chart; the route plots itself.' },
        { unlock: ['horleggor', 'arcturus', 'siwenna'] },
        { enter: 'space' },
      ],
    },
    {
      id: 'ch2-horleggor',
      trigger: { type: 'arrive', world: 'horleggor' },
      steps: [
        { say: 'Horleggor. Corin points at nothing in particular through the viewport.' },
        { say: 'Riose beat the Foundation fleet right there. Won every battle he fought. Then the Emperor recalled him and had him shot, because a general who wins is a general who might not stop. Ilen, is that in your Encyclopedia?', who: CORIN },
        { say: 'It is. We call it the Riose Crisis. Seldon predicted it.', who: ILEN },
        { say: 'Seldon predicted a dead general. Lovely.', who: CORIN },
        { journal: 'Horleggor. Corin knows the frontier better than the charts do. No sign of the grey coat.' },
      ],
    },
    {
      id: 'ch2-arcturus',
      trigger: { type: 'arrive', world: 'arcturus' },
      steps: [
        { say: 'Arcturus still flies the Spaceship-and-Sun. The viceroy\'s cutters escort you in and ask for a tithe. Corin pays it in Foundation gadgets and they are delighted.' },
        { say: 'This was a sector capital. Forty worlds answered to it. Now it answers to whoever has a fleet within three jumps.', who: ILEN },
        { say: 'You watch the lights of the capital on the night side and think about how long a thing can keep its shape after it has died.', who: TAREN },
        { journal: 'Arcturus. The Empire here is a flag and a tithe. One more jump to Siwenna.' },
      ],
    },
    // ---------------------------------------------------------------- Chapter 3
    {
      id: 'ch3-arrive',
      trigger: { type: 'arrive', world: 'siwenna' },
      steps: [
        { chapter: 'Chapter Three', sub: 'Siwenna' },
        { say: 'Siwenna. The sector capital that the Empire burned for rebelling, and then forgot. The archive is a mountain of stone on the night side, and it has been dark for a century.' },
        { say: 'Somewhere in it is the shelf where a single index was mis-filed two thousand years ago. Somewhere in you is the reason you have to find it.', who: TAREN },
        { say: 'The Barr family kept it. Ducem Barr helped Hober Mallow, and his grandchildren helped the Foundation against Riose. If anyone still holds a key, it is a Barr.', who: ILEN },
        { objective: 'Enter orbit over Siwenna and land at the archive.' },
      ],
    },
    {
      id: 'ch3-orbit',
      trigger: { type: 'orbit', world: 'siwenna' },
      steps: [
        { say: 'You set the Kestrel down on a plain of broken paving under a sky the colour of ash. The archive rises in front of you like a cliff with a door in it.' },
        { say: 'Somebody has to keep the drive warm. And I am not a reader. Go and find your lost planet. Shout if anything with a gun turns up.', who: CORIN },
        { enter: 'archive' },
        { say: 'Inside, the cold is older than the Foundation. Shelves climb into darkness. A skylight has fallen in somewhere ahead and a shaft of grey light stands in the dust like a pillar.' },
        { say: 'There is a lamp at the far end. Somebody is reading by it.' },
        { say: 'You are late. He said you would come yesterday.', who: SENNET },
        { say: 'An old woman does not look up from a reel of tape older than her family name. Her hands are steady. Her voice is not.' },
        { say: 'I am Sennet Barr. This was my father\'s archive and his father\'s before that, back to Ducem. Nobody comes here. This week, two of you.', who: SENNET },
        { choice: [
          { text: 'Read her. (Use the sense.)', set: ['read-sennet'] },
          { text: 'Ask who came before you.', set: ['asked-sennet'] },
        ] },
        { if: ['read-sennet'], then: [
          { say: 'You open the door in your mind a crack. Fear, old and worn smooth with use. And under it something sharper, pointed at the entrance behind you. She is not afraid of you. She is afraid he will come back.', who: TAREN },
        ], else: [
          { say: 'A man in a grey coat. Very polite. He asked for the Sirius index and I told him what I will tell you. I do not have it.', who: SENNET },
          { say: 'Then he looked at the shelves for a long time and left. He did not search. He did not need to. I think he was counting.', who: SENNET },
        ] },
        { say: 'Ilen sets the reader on the desk and threads the reel. The old woman watches the first frame of the index come up and her face changes.' },
        { say: 'So it survived. My grandfather\'s grandfather mis-shelved it on purpose, you know. Three times they came from the Library on Trantor to correct the catalogue. Three times a Barr put it back in the wrong place.', who: SENNET },
        { say: 'Why? What is Earth to a family on Siwenna?', who: ILEN },
        { say: 'Nothing. That was the point. Somebody wanted it to be nothing everywhere. A Barr does not like being told what to forget.', who: SENNET },
        { say: 'She unlocks a drawer in the desk and lays a sheet of metal foil on the lamp. A star chart. The Sirius Sector, in Imperial survey notation, with one name scratched out and its position left intact.' },
        { say: 'This is the last chart that shows the place. I can give it to you, or I can give it to the next polite man. Tell me why it should be you.', who: SENNET },
        { choice: [
          { text: 'Tell her the truth. Ilen means to find Earth.', set: ['told-sennet-truth'] },
          { text: 'Say it is Encyclopedia business and nothing more.', set: ['lied-to-sennet'] },
          { text: 'Offer her 300 credits for it.', set: ['paid-sennet'], credits: -300 },
        ] },
        { if: ['told-sennet-truth'], then: [
          { say: 'The truth, then. Good. The grey man did not offer me that. Take it. If you find the place, come back and tell an old woman what it looks like.', who: SENNET },
          { journal: 'Sennet Barr gave us the Sirius chart because Ilen told her the truth. She asked us to come back and tell her what Earth looks like.' },
        ] },
        { if: ['lied-to-sennet'], then: [
          { say: 'Encyclopedia business. Of course. Take the chart. I have kept a copy of the one thing on it that matters, and you have not asked me what that is.', who: SENNET },
          { say: 'She means it. You feel the small cold satisfaction in her, like a stone in a shoe. Whatever she held back, she will not give it to a liar.', who: TAREN },
          { journal: 'Sennet Barr gave us the chart but kept something back. Ilen lied to her about the purpose. Taren felt her hold it.' },
        ] },
        { if: ['paid-sennet'], then: [
          { say: 'Money. Well. Money is a kind of truth, I suppose. It tells me you want it more than the grey man did. He offered nothing at all.', who: SENNET },
          { journal: 'We bought the Sirius chart from Sennet Barr for 300 credits. She took the money without counting it.' },
        ] },
        { set: ['have-chart'] },
        { say: 'Ilen folds the chart into the archive case. Behind you, at the far end of the hall, the grey light from the door changes shape.' },
        { say: 'Pilot. Encyclopedist. Keeper. I will not take much of your time.', who: GREY },
        { say: 'He stands just inside the entrance with his hands folded. He has not raised his voice. He does not need to. The hall carries it.' },
        { say: 'You open the sense all the way, for the first time in sixty years, and reach for him. There is nothing. Not calm. Not control. A doorway with no room behind it.', who: TAREN },
        { say: 'You are looking at me the way I look at you. That answers my question. We were made in the same place, you and I, a long way from here.', who: GREY },
        { say: 'The index, please. The chart you may keep; it is already wrong. Give me the index and the Encyclopedist walks out of here with you, and nobody on Siwenna remembers either of you.', who: GREY },
        { choice: [
          { text: 'Refuse. Run for the ship.', set: ['ran-siwenna'], fuel: -5, goto: 'ch3-run' },
          { text: 'Push his mind, with everything you have.', set: ['pushed-greycoat'], strain: 2, goto: 'ch3-push' },
          { text: 'Give him the index. Keep the chart.', set: ['gave-index'], goto: 'ch3-give' },
        ] },
      ],
    },
    {
      id: 'ch3-run',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'You do not answer him. You take Ilen by the arm and go, down the side aisle, through the dust, past the fallen shelf. He does not follow. He turns his head to watch you, and that is all.' },
        { say: 'Kestrel, I have a man in a grey coat walking out of your archive like he owns it. Lifting now. Door is open. Move.', who: COMMS },
        { say: 'Corin has the drive hot before you reach the ramp. The paving drops away. The archive becomes a cliff, then a line, then nothing.' },
        { journal: 'We ran from the grey coat at Siwenna. He did not follow. He did not need to. We burned fuel getting out.' },
        { goto: 'ch3-after' },
      ],
    },
    {
      id: 'ch3-push',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'You push. It is like putting your whole weight against a door and finding there is no wall around it. You fall through into nothing and the nothing pushes back.', who: TAREN },
        { say: 'Something tears. Not in him. In you. The First Law screams that you are harming a human and the Zeroth Law whispers that you are not, and between them your mind goes white.', who: TAREN },
        { say: 'When you can see again, he has not moved. He is looking at you with what, in a man, would be interest.' },
        { say: 'That was unwise. But informative. You do not know what you are, do you. He never told you. Go. I will not stop you today.', who: GREY },
        { say: 'He steps aside from the door. Ilen does not understand what happened and does not ask until you are in the air. Then she asks nothing else for an hour.' },
        { journal: 'I tried to push the grey coat\'s mind. There was nothing there to push, and the attempt nearly broke me. He let us go. He said somebody never told me what I am.' },
        { goto: 'ch3-after' },
      ],
    },
    {
      id: 'ch3-give',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'You take the reel from the case before Ilen can stop you and hold it out. She says your name once, very quietly, in a voice you have not heard her use.' },
        { say: 'Thank you. You have made a sensible choice, which is rarer than it should be. The chart will not help you. But you will try. That is what you are for.', who: GREY },
        { say: 'He takes the reel and goes. Ilen stands in the shaft of grey light with her empty case and does not look at you.' },
        { say: 'Sixty years. I spent sixty years on that index, pilot. You gave it away in a sentence.', who: ILEN },
        { journal: 'I gave the grey coat the index to buy our way out of Siwenna. Ilen has the chart. She has not forgiven me.' },
        { goto: 'ch3-after' },
      ],
    },
    {
      id: 'ch3-after',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { enter: 'space' },
        { say: 'Siwenna falls behind. Corin flies. Ilen sits with the chart spread across her knees and does not speak for a long time.' },
        { say: 'He let us go. Why would he let us go?', who: ILEN },
        { say: 'Because he already knows where we are going.', who: TAREN },
        { say: 'The chart is an Imperial survey. It was drawn from the master catalogue on Trantor, in the Galactic Library. If the name was scratched out here, it was scratched out there first. And somebody on Trantor still remembers doing it.', who: ILEN },
        { say: 'Trantor. Lovely. Forty billion people and a government that shoots librarians. I know the back way in, through Cinna and Iwernia, if you do not mind farmers.', who: CORIN },
        { objective: 'Reach Trantor by way of Cinna and Iwernia. Select Trantor on the chart.' },
        { unlock: ['cinna', 'iwernia', 'trantor'] },
      ],
    },
    {
      id: 'ch3-cinna',
      trigger: { type: 'arrive', world: 'cinna' },
      steps: [
        { say: 'Cinna. A quiet Imperial world with nothing to recommend it, which is why people who want to be left alone say they come from here. Hari Seldon\'s companion did. Nobody ever checked.', who: ILEN },
        { say: 'Dors Venabili. The one they say was not human. You read a lot, for a pilot.', who: CORIN },
        { say: 'You say nothing. You have read that story too, and lately you have been reading it differently.', who: TAREN },
      ],
    },
    {
      id: 'ch3-iwernia',
      trigger: { type: 'arrive', world: 'iwernia' },
      steps: [
        { say: 'Iwernia. One of the twenty worlds that fed Trantor, once. Corin takes on water and fresh food from a farmer who has never seen a Foundation coin and bites it.' },
        { say: 'One more jump. The core is bright enough here to read by. Trantor is in the middle of it, a world that does not know it has already died.', who: ILEN },
      ],
    },
    // ---------------------------------------------------------------- Chapter 4
    {
      id: 'ch4-arrive',
      trigger: { type: 'arrive', world: 'trantor' },
      steps: [
        { chapter: 'Chapter Four', sub: 'Trantor' },
        { say: 'Trantor. Forty billion people under one roof of steel. The capital of an Empire that has not noticed it is over. The Galactic Library is somewhere under that roof, and the Second Foundation is somewhere inside the Library, and neither of them is expecting you.' },
        { say: 'Traffic control gives you a lane and a number and does not ask who you are. Nobody has asked who you are in sixty years. You take the Kestrel down through the cloud deck.', who: TAREN },
        { enter: 'city' },
        { say: 'The city opens underneath you like a wound that has healed over steel. Towers rise past the ship on both sides. Lights, in every one of them, all the way down.' },
        { say: 'I grew up on a world with one city. This is one city with a world inside it. How do you find a library in that?', who: CORIN },
        { say: 'You ask a librarian. The Library has a beacon. Every ship on Trantor can see it. Follow it.', who: ILEN },
        { objective: 'Fly to the Galactic Library. Follow the beacon marker and enter the plaza.' },
        { journal: 'Trantor. We are in the atmosphere over the city, following the Library beacon.' },
      ],
    },
    {
      id: 'ch4-library',
      trigger: { type: 'landmark', id: 'library' },
      steps: [
        { say: 'The dome of the Library rises out of the towers like a planet of its own. You set the Kestrel down on the plaza. Nobody stops you. Nobody has stopped anyone here for a long time.' },
        { enter: 'library' },
        { say: 'Inside, the rotunda goes up and up, galleries over galleries, to an eye of white light at the top. At the centre, a catalogue console hums to itself with nobody at it. Then somebody is at it.' },
        { say: 'You are not readers. Readers come in the morning and they do not bring pilots. What do you want?', who: DIRA },
        { say: 'An assistant librarian, forty, with a sigil on her collar and the look of somebody who has been expecting bad news for twenty years.' },
        { say: 'The Imperial survey of the Sirius Sector. The master entry. The one your catalogue says does not exist.', who: ILEN },
        { say: 'She goes still. Her hand does not move toward the console. That is how you know she can find it.' },
        { choice: [
          { text: 'Show her the chart from Siwenna.', set: ['showed-chart'] },
          { text: 'Nudge her mind. Just enough to make her curious.', set: ['nudged-dira'], strain: 1 },
          { text: 'Let Corin offer her money.', set: ['bribed-dira'] },
        ] },
        { if: ['showed-chart'], then: [
          { say: 'Ilen unfolds the foil under the console light. The librarian looks at it for a long time. Something in her face gives up a fight it has been having for years.' },
          { say: 'I have seen that notation once. In the deletion log. Nobody reads the deletion log. Come here. Do not touch anything.', who: DIRA },
        ] },
        { if: ['nudged-dira'], then: [
          { say: 'You lean on the part of her that wants to know. It is not hard. It was most of her already. The cable in your mind pulls tight again and holds.', who: TAREN },
          { say: 'I should not do this. I am going to do this. Come here. Do not touch anything.', who: DIRA },
        ] },
        { if: ['bribed-dira'], then: [
          { say: 'Corin puts a roll of Foundation credits on the console. The librarian looks at it the way she would look at a dead animal.' },
          { say: 'Put that away before a camera sees it. I will show you one thing, once, because you are going to leave faster if I do.', who: DIRA },
          { set: ['library-flagged'] },
        ] },
        { say: 'She brings up a log that scrolls for a long time before it stops. One line, repeated every century, in the same words.' },
        { say: 'Entry withdrawn. Standing instruction of the Office of the Chief Librarian, to be renewed in perpetuity. The first instruction is the oldest line in the catalogue. It is signed by the First Minister of the Empire. The initials are E. D.', who: DIRA },
        { say: 'Eto Demerzel. Cleon the First\'s minister. The man who saved Hari Seldon. Twelve thousand years ago.', who: ILEN },
        { say: 'Not a man. The name goes through you like a current. You do not know why. You will.', who: TAREN },
        { say: 'There is one place on Trantor that never accepted the deletion. Mycogen. They keep a Book from before the Empire. They say the Dawn World is in it, and the Fifty Worlds, with their positions. They will not show it to you. They do not show it to anyone.', who: DIRA },
        { say: 'Go now. If anyone asks, you came for the Encyclopedia and I told you nothing, which is what the Library tells everyone.', who: DIRA },
        { journal: 'The Galactic Library. The Sirius entry was withdrawn by a standing instruction of the Chief Librarian, renewed every century for twelve thousand years. The first order was signed E. D. Eto Demerzel. Dira Velm sent us to Mycogen.' },
        { say: 'Mycogen is a sector of the city, an hour by the lower ways. Corin buys three skincaps from a stall at the gate, because nobody with hair is allowed inside, and you walk in bald among the bald.' },
        { enter: 'sacratorium' },
        { say: 'The Sacratorium is the only building in Mycogen that is not a farm. It is a hall of grey stone and candles, and at the far end, on a dais, in a shaft of light, stands a man made of metal.' },
        { say: 'A statue. A very old one. Its face is nobody\'s face. You cannot look away from it, and you do not know why.', who: TAREN },
        { say: 'Tribespeople do not enter the Sacratorium. You have entered. Give me a reason not to have you removed.', who: SUNMASTER },
        { say: 'An old man in a grey kirtle, bald as an egg, with no eyebrows and eyes like wet stones. Sunmaster Twenty-One. He has not raised his voice. He has never needed to.' },
        { say: 'We are looking for the Dawn World. The Library sent us. The Library has forgotten it on purpose. We were told you have not.', who: ILEN },
        { say: 'He looks at Ilen. He looks at Corin. Then he looks at you, and keeps looking.' },
        { say: 'You do not breathe when you listen, tribesman. The others breathe. I have been watching. You have not taken a breath since you came in.', who: SUNMASTER },
        { choice: [
          { text: 'Reach into him and turn the thought aside.', set: ['nudged-sunmaster'], strain: 1 },
          { text: 'Let Corin talk.', set: ['corin-bluffed'] },
          { text: 'Offer him the Siwenna chart in trade.', set: ['traded-chart'] },
        ] },
        { if: ['nudged-sunmaster'], then: [
          { say: 'You push, gently, at the shape of his suspicion, and it slides away like a thing on ice. His eyes lose their focus for a moment. Then he is looking at Ilen again, as if you were furniture.', who: TAREN },
          { say: 'The strain is worse each time. You are aware that you are keeping count.', who: TAREN },
          { say: 'As I was saying. The Dawn World.', who: SUNMASTER },
        ] },
        { if: ['corin-bluffed'], then: [
          { say: 'Pilots. We stop breathing on final approach and some of us forget to start again. He flew us down through your traffic. Give him a minute.', who: CORIN },
          { say: 'The old man does not smile, because he does not smile, but something in the grey face decides to let it go.' },
          { say: 'Pilots. Yes. The Dawn World, then.', who: SUNMASTER },
        ] },
        { if: ['traded-chart'], then: [
          { say: 'Ilen puts the Siwenna chart on the lectern. The old man reads the Imperial notation as if it were his own hand. He does not look at you again.' },
          { say: 'A chart with a name scratched out. The tribes keep what they are told to keep. Very well. The Dawn World.', who: SUNMASTER },
          { set: ['chart-traded-away'] },
        ] },
        { say: 'He opens the Book. It is not a book. It is a sheet of something that is not metal and not glass, and the writing on it moves when he touches it.' },
        { say: 'Aurora. The World of the Dawn, first of the Fifty, where our ancestors lived with the ones they made, until the ones they made betrayed them and the Lost Ones were driven out. Its sun is called Tau Ceti. The Book gives the position in the old reckoning. Write it down, tribeswoman. You will not see the Book again.', who: SUNMASTER },
        { say: 'Ilen writes. The coordinates fit the Sirius chart like a key fits a lock. The scratched-out world is three jumps from Aurora.', who: ILEN },
        { say: 'And that one. The Renegade. Made in Aurora in the image of a man, and left behind when the Lost Ones fled. It does not move. It has not moved in twelve thousand years. We keep it so that we remember what we are owed.', who: SUNMASTER },
        { say: 'You stand in front of the statue. The metal face looks at nothing. And something opens in you that was closed, and a voice you have never heard speaks as if it had been waiting for this exact place.', who: TAREN },
        { say: 'If you are hearing this, you have found the Dawn World, or its shadow. Good. I made you so that someone would. Tell him nothing. He means well, and that is the whole of the danger. Judge for yourself.', who: MEMORY },
        { say: 'It stops. Nothing else comes. You are standing in a stone hall on Trantor with a librarian\'s coordinates and an old man\'s contempt, and for the first time in sixty years you know that somebody made you on purpose.', who: TAREN },
        { journal: 'Mycogen. The Book names Aurora, Tau Ceti, and gives its position. A metal statue they call the Renegade stands in the Sacratorium; standing before it, a recorded voice spoke to me. Somebody made me on purpose. The voice said: tell him nothing. Judge for yourself.' },
        { set: ['memory-1'] },
        { enter: 'space' },
        { say: 'The Kestrel climbs out of Trantor on a lane nobody checks. Corin keeps looking at you in the reflection of the viewport and not asking.' },
        { say: 'Aurora is in the Sayshell direction, past the Sark worlds. Sayshell is independent and the Foundation has no eyes there. If somebody is following us, that is where we find out.', who: ILEN },
        { objective: 'Reach Sayshell by way of Sark and Vega. Select Sayshell on the chart.' },
        { unlock: ['gc2201', 'sark', 'florina', 'vega', 'gc3310', 'sayshell'] },
      ],
    },
    // ---------------------------------------------------------------- Chapter 5
    {
      id: 'ch5-arrive',
      trigger: { type: 'arrive', world: 'sayshell' },
      steps: [
        { chapter: 'Chapter Five', sub: 'Sayshell' },
        { say: 'Sayshell. Capital of a union the Foundation never swallowed. The city wears flowers in its streets and knives in its pockets. From here the road leads out past the Sirius Sector to the Spacer worlds, and to whatever is left of them.' },
        { say: 'There is a scholar here, Quintesetz, who answers letters about old worlds. He answered one of mine, six years ago, and then stopped. He drinks on the Terrace of the Lanterns at dusk. Everybody knows that. That is how a scholar hides.', who: ILEN },
        { objective: 'Enter orbit over Sayshell and land at the Terrace of the Lanterns.' },
      ],
    },
    {
      id: 'ch5-orbit',
      trigger: { type: 'orbit', world: 'sayshell' },
      steps: [
        { say: 'Sayshell City at dusk, from a terrace halfway up its tallest hill. String lights, flowering shrubs, a balustrade, and a drop to a million windows coming on below.' },
        { enter: 'terrace' },
        { say: 'Corin stops on the top step. You feel it before you see him: a big man at the end of the terrace, leaning on the stone, in no hurry at all.' },
        { say: 'Pellis. Kalgan says hello. You left in such a hurry you forgot to leave an address, so I had to find one. Sayshell is lovely this time of year.', who: VASK },
        { say: 'Vask Oren. He collects for the Kalganian lenders. He has never hit anyone, Corin told you once. He has never needed to.' },
        { say: 'I do not have it, Vask. You know I do not have it. You took the ship.', who: CORIN },
        { say: 'I took a ship. The debt was for a ship and a half. The half is still open, and it has been travelling with you, which means it is now travelling with them. Who are your friends, Pellis?', who: VASK },
        { choice: [
          { text: 'Pay the half. 600 credits.', set: ['paid-vask'], credits: -600 },
          { text: 'Reach into him. Make him remember the debt as settled.', set: ['nudged-vask'], strain: 1 },
          { text: 'Tell him the Kestrel is a Ponyets House hull and the House pays its debts.', set: ['bluffed-vask'] },
        ] },
        { if: ['paid-vask'], then: [
          { say: 'You count it out onto the balustrade. He does not pick it up until you have finished. Then he does, and it is gone, and so is his interest in you.' },
          { say: 'Settled. Tell her to stay away from Kalgan anyway. Sentiment is not a line in my ledger.', who: VASK },
          { journal: 'Vask Oren, collecting for the Kalganian lenders, found Corin on Sayshell. I paid the half-debt. 600 credits.' },
        ] },
        { if: ['nudged-vask'], then: [
          { say: 'You find the ledger in his mind, the place where Pellis is still an open line, and you close it. It is a small thing. It costs you more than it should. He blinks.', who: TAREN },
          { say: 'Settled. I was sure... Settled. Tell her to stay away from Kalgan anyway.', who: VASK },
          { say: 'He goes down the steps touching the wall, like a man who has stood up too fast. Corin watches him go and then watches you.' },
          { journal: 'Vask Oren found Corin on Sayshell. I closed the debt in his head. Corin saw me do it. She has not said anything. Yet.' },
          { set: ['corin-suspects'] },
        ] },
        { if: ['bluffed-vask'], then: [
          { say: 'Ponyets House. On Terminus. Which is a long way from Kalgan, and a longer way from here. I will write to them. Lenders are patient, Pellis. That is the whole of what we are.', who: VASK },
          { say: 'He goes. He will write to Ponyets House. Ponyets House will not be pleased. That is a problem for another system.' },
          { journal: 'Vask Oren found Corin on Sayshell. I told him the Kestrel is a Ponyets House hull. He will write to Terminus. The House will not like the letter.' },
          { set: ['house-will-hear'] },
        ] },
        { say: 'The scholar is at a corner table under the lanterns with a glass of something gold, watching all of it with the pleasure of a man who collects other people\'s trouble.' },
        { say: 'Encyclopedist Sarvo. I stopped answering you because you asked good questions, and I am too old to be asked good questions. Sit. The wine is terrible. Tell me what you want with a dead world.', who: QUINT },
        { say: 'Earth. We have its position from Siwenna and the Dawn World\'s from Mycogen. We need the rest of the Fifty, to be sure of the sector.', who: ILEN },
        { say: 'Then you need Comporellon. Cold, grim, and proud of it. Their Ministry keeps an archive they are not supposed to have, from before the Empire, with the Spacer worlds in it. A scholar there, Deniador, will show it to you if you flatter him. He is easy to flatter. It is the only easy thing on Comporellon.', who: QUINT },
        { say: 'He drinks. Then he does not laugh, which from him is a kind of warning.' },
        { say: 'A man in a grey coat sat where you are sitting, two days ago, and asked me the same thing. I told him the same thing. I do not think he needed telling.', who: QUINT },
        { say: 'Also. Between here and there you pass Gaia. Do not stop at Gaia. Nobody who stops at Gaia comes back to tell me the wine is terrible.', who: QUINT },
        { journal: 'Quintesetz sent us to Comporellon and a scholar named Deniador, who keeps the Spacer worlds in a Ministry archive. The grey coat was here two days ago. Quintesetz warned us off Gaia.' },
        { enter: 'space' },
        { objective: 'Reach Comporellon by way of Gaia. Do not stop at Gaia. Select Comporellon on the chart.' },
        { unlock: ['gaia', 'comporellon'] },
      ],
    },
    {
      id: 'ch5-gaia',
      trigger: { type: 'arrive', world: 'gaia' },
      steps: [
        { say: 'Gaia. A green world under a quiet sun, and nothing on the comms, and no ships. The Kestrel comes out of the jump and for a moment every instrument on the board reads a fraction high, as if the system were listening.' },
        { say: 'There is something here. Not a mind. Not one mind. It is like standing at the edge of a sea at night and knowing the sea is awake.', who: TAREN },
        { say: 'I do not like it. Jump. Please jump.', who: ILEN },
        { say: 'Taking the old man\'s advice. Plotting Comporellon.', who: CORIN },
        { journal: 'Gaia. We did not stop. Something in that system is awake, and it is not one mind. I do not have a word for what it is.' },
      ],
    },
    {
      id: 'ch5-comporellon',
      trigger: { type: 'arrive', world: 'comporellon' },
      steps: [
        { say: 'Comporellon. A cold world of grey cities and a people who believe they were the first, and who keep their archives the way other worlds keep their weapons.' },
        { say: 'Port control wants our registry, our cargo, our purpose and our religion. I gave them the first two and lied about the third. They did not ask about the fourth twice.', who: CORIN },
        { objective: 'Enter orbit over Comporellon and land at the Ministry archive.' },
      ],
    },
    {
      id: 'ch5-vault',
      trigger: { type: 'orbit', world: 'comporellon' },
      steps: [
        { say: 'The Ministry archive is under a building that has no name on it. A lift goes down for a long time. At the bottom, a vault of grey steel and white light, and a thin man who has been waiting.' },
        { enter: 'vault' },
        { say: 'Encyclopedist. Quintesetz wrote. He said you ask good questions. I will tell you now that I do not answer questions. I show documents, and the documents answer.', who: DENIADOR },
        { say: 'Aldo Deniador. He does not shake hands. He checks the time.' },
        { say: 'The Spacer worlds. The Fifty. We have Aurora\'s position from Mycogen. We want to confirm it against your table and take the others.', who: ILEN },
        { say: 'Then give me Aurora. If your position matches the table, I will know you are not police, because the police do not have Mycogen. If it does not match, we are done.', who: DENIADOR },
        { say: 'Ilen gives him the numbers. He enters them without writing them down. The terminal thinks. Then it draws a small bright point on a chart of the sector, and the point sits exactly on a point that was already there.' },
        { say: 'Aurora. Tau Ceti. The Book of Mycogen is correct to four places. Remarkable. Very well. The Fifty, with their positions, in the old reckoning. Solaria. Melpomenia. And here, with no name and a note in a hand I do not know: the world the Fifty came from.', who: DENIADOR },
        { say: 'You look at the chart and the point with no name, and the second door opens in you, the one you did not know was there.', who: TAREN },
        { say: 'The Fifty are empty. Do not grieve for them; they chose it. One of them still has a mind in it that will try to keep you. The world with no name is the one that matters, and it will not want you either. Go anyway.', who: MEMORY },
        { set: ['memory-2'] },
        { journal: 'Comporellon. Deniador\'s table confirms Aurora and gives Solaria, Melpomenia and the position of the world with no name. A second recorded voice: the Fifty are empty, one still has a mind in it, the nameless world will not want us.' },
        { say: 'The vault door cycles. A red lamp over it goes from red to redder. The man in the grey coat comes in with a woman in a Ministry uniform, and he lets her go first, because that is the polite thing to do.' },
        { say: 'Captain Vos, Port Authority. Your vessel, the Kestrel, is impounded under the Foreign Hulls Act pending review. This gentleman has lodged the complaint. You will surrender your data and accompany me.', who: VOS },
        { say: 'I did say I would not stop you that day. This is a different day. Captain, they have the Comporellon table. That is a state secret, which I believe is a crime here.', who: GREY },
        { say: 'You open the sense. Vos is afraid of him and does not know why. She is a decent officer carrying an order she dislikes. He, as before, is nothing at all.', who: TAREN },
        { choice: [
          { text: 'Reach into Vos. Make her see a forged release order.', set: ['nudged-vos'], strain: 1 },
          { text: 'Let Corin post a Trader bond for the hull. 400 credits.', set: ['bonded-hull'], credits: -400 },
          { text: 'Invoke the Foundation treaty. Impounding a Foundation hull is an act of war.', set: ['invoked-treaty'], needs: ['corin-share'] },
        ] },
        { if: ['nudged-vos'], then: [
          { say: 'You give her what she wants, which is a reason. She reads a release order that does not exist on a screen that is blank, and nods, because it is in order, and she is relieved.', who: TAREN },
          { say: 'Release is in order. The complaint is dismissed. Sir, you will come with me and explain why you lodged it.', who: VOS },
          { say: 'The grey coat looks at you, not at her, and something that is not an expression passes over his face. He goes with her. He could not have refused without becoming something other than polite.' },
        ] },
        { if: ['bonded-hull'], then: [
          { say: 'Corin puts a Trader bond on the desk, stamped and countersigned and nearly genuine. Vos reads it twice. Comporellon respects paper.' },
          { say: 'A bond is acceptable pending review. The hull is released to bond. Sir, your complaint is noted and will be heard in forty days.', who: VOS },
          { say: 'Forty days. He inclines his head as if that were reasonable. Perhaps to him it is.' },
        ] },
        { if: ['invoked-treaty'], then: [
          { say: 'Ilen stands up very straight and says the words in the voice the Encyclopedia uses for footnotes. The Kestrel is a Foundation hull under a Trader house. Seizure is an act of war under the Treaty of Kalgan, article nine.' },
          { say: 'Vos does not know article nine. Neither does Ilen. Vos knows what the word war costs on Comporellon, and lets go of the order like a hot plate.' },
          { say: 'The complaint is referred upward. The hull is released pending referral. Leave the system within the hour.', who: VOS },
        ] },
        { say: 'Aurora is empty. Solaria is not. Be careful which empty you choose, pilot. And do not let her go to the one with no name. That is not a threat. It is the only advice I am permitted to give.', who: GREY },
        { say: 'Deniador has been very quiet. As the door cycles behind them he puts a thin hand on Ilen\'s case.' },
        { say: 'I showed you a document. The document answered. Please do not write to me again.', who: DENIADOR },
        { enter: 'space' },
        { say: 'Within the hour, as instructed. Comporellon drops away grey and cold and glad to see you go. Ahead, three jumps out, is a sun called Tau Ceti, and a world that was once the greatest in the Galaxy.' },
        { objective: 'Reach Aurora, the Dawn World. Select Aurora on the chart.' },
        { unlock: ['aurora', 'solaria', 'melpomenia'] },
      ],
    },
    // ---------------------------------------------------------------- Chapter 6 (opening)
    {
      id: 'ch6-arrive',
      trigger: { type: 'arrive', world: 'aurora' },
      steps: [
        { chapter: 'Chapter Six', sub: 'Aurora' },
        { say: 'Aurora. The World of the Dawn. First and greatest of the Fifty, where men lived three centuries each with a hundred robots to a household. Now a green world under Tau Ceti with no lights on the night side, and nothing on the comms but wind.' },
        { journal: 'Aurora. Chapter Six continues in the next build.' },
        { objective: 'Chapter Six continues in the next build. Explore freely.' },
        { end: 'End of the current build. Chapter Six, Aurora, continues next.' },
      ],
    },
  ],
};
